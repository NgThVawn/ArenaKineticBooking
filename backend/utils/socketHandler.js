module.exports = function initSocket(io) {
  // Map: userId (string) -> Set of socketIds
  var userSockets = new Map();

  io.on('connection', function (socket) {
    console.log('Socket connected:', socket.id);

    // Client đăng ký userId sau khi kết nối
    socket.on('register', function (userId) {
      if (!userId) return;
      var uid = String(userId);
      if (!userSockets.has(uid)) {
        userSockets.set(uid, new Set());
      }
      userSockets.get(uid).add(socket.id);
      console.log('User', uid, 'registered socket', socket.id);
    });

    socket.on('disconnect', function () {
      console.log('Socket disconnected:', socket.id);
      for (var [userId, sockets] of userSockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  // Gửi thông báo đến user (tất cả socket của user đó)
  io.sendToUser = function (userId, payload) {
    var uid = String(userId);
    var sockets = userSockets.get(uid);
    if (sockets && sockets.size > 0) {
      for (var socketId of sockets) {
        io.to(socketId).emit('notification', payload);
      }
    }
  };
};