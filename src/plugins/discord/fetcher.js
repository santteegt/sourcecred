// @flow

import * as Model from "./models";

type FetchEndpoint = (endpoint: string) => Promise<any>;

/**
 * Provide the Guild ID to fetch against, and the 'limit'
 * parameter when fetching GuildMembers, Messages, and Reactions.
 *
 */
type FetchOptions = {|
  guildId: Model.Snowflake,
  membersLimit: number,
  messagesLimit: number,
  reactionsLimit: number,
|};

export type EndCursor = Model.Snowflake;

export type PageInfo = {|
  +hasNextPage: boolean,
  +endCursor: EndCursor | null,
|};

export type ResultPage<T> = {|
  +pageInfo: PageInfo,
  +results: $ReadOnlyArray<T>,
|};

/**
 * Fetcher is responsible for:
 * - Returning the correct endpoint to fetch against for Guilds, Channels,
 *   Members, and Reactions.
 * - Formatting the returned results into the correct Typed objects
 * - Returning pagination info in a PageInfo object, containing hasNextPage
 *   and endCursor properties.
 *   The endCursor property is calculated as the Id of the last object
 *   returned in the response results. We are assuming Discord provides
 *   consistent, ordered results.
 *   The hasNextPage property is a boolean calculated as whether the number of
 *   results recieved is equal to the `limit` property provided in the
 *   fetch request.
 *
 *   Note that Discord doesn't support pagination for Channels, so we're
 *   returning an array of Channel objects in the corresponding method.
 *   See: https://discordapp.com/developers/docs/resources/guild#get-guild-channels
 *
 */
export class Fetcher {
  +_fetch: FetchEndpoint;
  +_options: FetchOptions;

  constructor(fetchEndpoint: FetchEndpoint, options: FetchOptions) {
    this._fetch = fetchEndpoint;
    this._options = options;
  }

  async guild(): Promise<Model.Guild> {
    const {guildId} = this._options;
    const {id, name, permissions} = await this._fetch(`guilds/${guildId}`);
    return {id: id, name: name, permissions: permissions};
  }

  async channels(): Promise<$ReadOnlyArray<Model.Channel>> {
    const {guildId} = this._options;
    const response = await this._fetch(`/guilds/${guildId}/channels`);
    return response.map((x) => ({
      id: x.id,
      name: x.name,
      type: Model.channelTypeFromId(x.type),
    }));
  }

  async members(after: EndCursor): Promise<ResultPage<Model.GuildMember>> {
    const {membersLimit, guildId} = this._options;
    const endpoint = `/guilds/${guildId}/members?after=${after}&limit=${membersLimit}`;
    const response = await this._fetch(endpoint);
    const results = response.map((x) => ({
      user: {
        id: x.user.id,
        username: x.user.username,
        discriminator: x.user.discriminator,
        bot: x.user.bot || x.user.system || false,
      },
      nick: x.nick || null,
      roles: x.roles,
    }));
    const hasNextPage = results.length === membersLimit;
    const endCursor =
      response.length > 0 ? response[response.length - 1].user.id : null;
    const pageInfo = {hasNextPage, endCursor};
    return {results, pageInfo};
  }

  async messages(
    channel: Model.Snowflake,
    after: EndCursor
  ): Promise<ResultPage<Model.Message>> {
    const {messagesLimit} = this._options;
    const endpoint = `/channels/${channel}/messages?after=${after}&limit=${messagesLimit}`;
    const response = await this._fetch(endpoint);
    const results = response.map((x) => ({
      id: x.id,
      channelId: channel,
      authorId: x.author.id,
      timestampMs: Date.parse(x.timestamp),
      content: x.content,
      reactionEmoji: (x.reactions || []).map((r) => r.emoji),
      nonUserAuthor: Model.isAuthoredByNonUser(x),
      mentions: (x.mentions || []).map((user) => user.id),
    }));
    const hasNextPage = results.length === messagesLimit;
    const endCursor =
      response.length > 0 ? response[response.length - 1].id : null;
    const pageInfo = {hasNextPage, endCursor};
    return {results, pageInfo};
  }

  async reactions(
    channel: Model.Snowflake,
    message: Model.Snowflake,
    emoji: Model.Emoji,
    after: EndCursor
  ): Promise<ResultPage<Model.Reaction>> {
    const {reactionsLimit} = this._options;
    const emojiRef = Model.emojiToRef(emoji);
    const endpoint = `/channels/${channel}/messages/${message}/reactions/${emojiRef}?after=${after}&limit=${reactionsLimit}`;
    const response = await this._fetch(endpoint);
    const results = response.map((x) => ({
      emoji: x.emoji,
      channelId: channel,
      messageId: message,
      authorId: x.id,
    }));
    const hasNextPage = results.length === reactionsLimit;
    const endCursor =
      response.length > 0 ? response[response.length - 1].id : null;
    const pageInfo = {hasNextPage, endCursor};
    return {results, pageInfo};
  }
}
