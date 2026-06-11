exports.getOnlineUsers = (server) => {
  return Array.from(server.userConnections.entries())
    .filter(([, connections]) => connections.size > 0)
    .map(([userId]) => userId);
};

exports.isOnline = (server, userId) => {
  const connections = server.userConnections.get(userId);
  return Boolean(connections && connections.size > 0);
};
