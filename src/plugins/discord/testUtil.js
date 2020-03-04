// @flow

export const testChannel = (id: number) => ({
  id: id,
  name: "testChannelName",
  type: 0,
});

export const testChannelObj = (id: number) => ({
  id: id,
  name: "testChannelName",
  type: "GUILD_TEXT",
});

export const testMessage = (id: number) => ({
  id: id,
  author: {id: 2},
  timestamp: "2020-03-03T23:35:10.615000+00:00",
  content: "Just going to drop this here",
  reactions: [{emoji: {id: 1, name: "testemoji"}}],
  mentions: [{id: 4, username: "testuser"}],
});

export const testMember = (userId: number) => ({
  user: {
    id: userId,
    username: "username",
    discriminator: "disc",
    bot: true,
  },
  nick: "nickname",
  roles: ["test role"],
});
