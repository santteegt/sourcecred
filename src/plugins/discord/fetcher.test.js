// @flow

import {Fetcher} from "./fetcher";
import {testMember, testChannel, testChannelObj, testMessage} from "./testUtil";

describe("plugins/discord/fetcher", () => {
  const defaultOptions = () => ({
    guildId: "1",
    membersLimit: 100,
    messagesLimit: 100,
    reactionsLimit: 100,
  });

  describe("fetch guild", () => {
    it("passes correct endpoint", async () => {
      const fetch = jest.fn(() => Promise.resolve([]));
      const fetcher = new Fetcher(fetch, defaultOptions());
      await fetcher.guild();
      expect(fetch.mock.calls[0]).toEqual(["guilds/1"]);
    });

    it("handles response", async () => {
      const expected = {id: 1, name: "guildname", permissions: []};
      const fetch = jest.fn(() => Promise.resolve(expected));
      const fetcher = new Fetcher(fetch, defaultOptions());
      const guild = await fetcher.guild();
      expect(guild).toEqual(expected);
    });
  });

  describe("fetch channels", () => {
    it("passes correct endpoint", async () => {
      const fetch = jest.fn(() => Promise.resolve([]));
      const fetcher = new Fetcher(fetch, defaultOptions());
      await fetcher.channels();
      expect(fetch.mock.calls[0]).toEqual(["/guilds/1/channels"]);
    });

    it("handles response", async () => {
      const response = [testChannel(1)];
      const expected = [testChannelObj(1)];
      const fetch = jest.fn(() => Promise.resolve(response));
      const fetcher = new Fetcher(fetch, defaultOptions());
      const data = await fetcher.channels();
      expect(data).toEqual(expected);
    });
  });

  describe("fetch members", () => {
    const options = () => ({
      guildId: "1",
      membersLimit: 2,
      messagesLimit: 100,
      reactionsLimit: 100,
    });

    it("passes correct endpoint", async () => {
      const fetch = jest.fn(() => Promise.resolve([]));
      const fetcher = new Fetcher(fetch, options());
      await fetcher.members("0");
      expect(fetch.mock.calls[0]).toEqual([
        "/guilds/1/members?after=0&limit=2",
      ]);
    });

    it("handles response", async () => {
      const response = [testMember(1)];
      const fetch = jest.fn(() => Promise.resolve(response));
      const fetcher = new Fetcher(fetch, options());
      const {results} = await fetcher.members("0");
      expect(results).toEqual(response);
    });

    it("returns correct endCursor", async () => {
      const response = [testMember(1), testMember(2)];
      const fetch = jest.fn(() => Promise.resolve(response));
      const fetcher = new Fetcher(fetch, options());
      const {endCursor} = (await fetcher.members("0")).pageInfo;
      expect(endCursor).toEqual(2);
    });

    describe("next page", () => {
      const testHasNextPage = async (nextPage) => {
        const response = [testMember(1)];
        const fetch = jest.fn(() => Promise.resolve(response));
        const fetcher = new Fetcher(fetch, {
          guildId: "2",
          membersLimit: nextPage ? 1 : 2,
          messagesLimit: 100,
          reactionsLimit: 100,
        });
        const {hasNextPage} = (await fetcher.members("0")).pageInfo;
        return hasNextPage;
      };

      it("next page = true", async () => {
        expect(await testHasNextPage(true)).toBe(true);
      });

      it("next page = false", async () => {
        expect(await testHasNextPage(false)).toBe(false);
      });
    });
  });

  describe("fetch reactions", () => {
    const emoji = {id: "1", name: "emojiname"};

    const options = () => ({
      guildId: "2",
      membersLimit: 100,
      messagesLimit: 100,
      reactionsLimit: 2,
    });

    it("passes correct endpoint", async () => {
      const fetch = jest.fn(() => Promise.resolve([]));
      const fetcher = new Fetcher(fetch, options());
      await fetcher.reactions("1", "2", emoji, "0");
      expect(fetch.mock.calls[0]).toEqual([
        `/channels/1/messages/2/reactions/emojiname:1?after=0&limit=2`,
      ]);
    });

    it("handles response", async () => {
      const response = [{id: 123, emoji}];
      const fetch = jest.fn(() => Promise.resolve(response));
      const fetcher = new Fetcher(fetch, options());
      const {results} = await fetcher.reactions("3", "2", emoji, "0");
      const expected = [{emoji, channelId: "3", messageId: "2", authorId: 123}];
      expect(results).toEqual(expected);
    });

    it("returns correct endCursor", async () => {
      const response = [
        {id: 1, emoji},
        {id: 2, emoji},
      ];
      const fetch = jest.fn(() => Promise.resolve(response));
      const fetcher = new Fetcher(fetch, options());
      const {endCursor} = (
        await fetcher.reactions("1", "2", emoji, "0")
      ).pageInfo;
      expect(endCursor).toBe(2);
    });

    describe("next page", () => {
      const testHasNextPage = async (nextPage) => {
        const response = [{id: 1, emoji}];
        const fetch = jest.fn(() => Promise.resolve(response));
        const fetcher = new Fetcher(fetch, {
          guildId: "2",
          membersLimit: 100,
          messagesLimit: 100,
          reactionsLimit: nextPage ? 1 : 2,
        });
        const {hasNextPage} = (
          await fetcher.reactions("1", "2", emoji, "0")
        ).pageInfo;
        return hasNextPage;
      };

      it("next page = true", async () => {
        expect(await testHasNextPage(true)).toBe(true);
      });

      it("next page = false", async () => {
        expect(await testHasNextPage(false)).toBe(false);
      });
    });
  });

  describe("fetch messages", () => {
    const options = () => ({
      guildId: "3",
      membersLimit: 100,
      messagesLimit: 2,
      reactionsLimit: 100,
    });

    it("passes correct endpoint", async () => {
      const fetch = jest.fn(() => Promise.resolve([]));
      const fetcher = new Fetcher(fetch, options());
      await fetcher.messages("1", "0");
      expect(fetch.mock.calls[0]).toEqual([
        "/channels/1/messages?after=0&limit=2",
      ]);
    });

    it("handles response", async () => {
      const response = [testMessage(1)];

      const expected = [
        {
          id: 1,
          channelId: "123",
          authorId: 2,
          timestampMs: Date.parse("2020-03-03T23:35:10.615000+00:00"),
          content: "Just going to drop this here",
          reactionEmoji: [{id: 1, name: "testemoji"}],
          nonUserAuthor: false,
          mentions: [4],
        },
      ];

      const fetch = jest.fn(() => Promise.resolve(response));
      const fetcher = new Fetcher(fetch, options());
      const {results} = await fetcher.messages("123", "0");
      expect(results).toEqual(expected);
    });

    it("returns correct endCursor", async () => {
      const response = [testMessage(1), testMessage(2)];
      const fetch = jest.fn(() => Promise.resolve(response));
      const fetcher = new Fetcher(fetch, options());
      const {endCursor} = (await fetcher.messages("123", "0")).pageInfo;
      expect(endCursor).toBe(2);
    });

    describe("next page", () => {
      const testHasNextPage = async (nextPage) => {
        const response = [testMessage(1)];
        const fetch = jest.fn(() => Promise.resolve(response));
        const fetcher = new Fetcher(fetch, {
          guildId: "3",
          membersLimit: 100,
          messagesLimit: nextPage ? 1 : 2,
          reactionsLimit: 2,
        });
        const {hasNextPage} = (await fetcher.messages("123", "0")).pageInfo;
        return hasNextPage;
      };

      it("next page = true", async () => {
        expect(await testHasNextPage(true)).toBe(true);
      });

      it("next page = false", async () => {
        expect(await testHasNextPage(false)).toBe(false);
      });
    });
  });
});
