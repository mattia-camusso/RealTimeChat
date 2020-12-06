const express = require("express");
const http = require("http");

const { addUser, removeUser, getUser, getUserInRoom } = require("./users");

const PORT = process.env.PORT || 5000;

const router = require("./router");

const app = express();
const server = http.createServer(app);

const socketio = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

socketio.on("connection", (socket) => {
  console.log("new connection");

  socket.on("join", ({ name, room }, callback) => {
    console.log(name, room);
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to room ${user.room}`,
    });
    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name}, has joined` });

    socket.join(user.room);

    socketio
      .to(user.room)
      .emit("roomData", { room: user.room, users: getUserInRoom(user.room) });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    socketio.to(user.room).emit("message", { user: user.name, text: message });
    socketio
      .to(user.room)
      .emit("roomData", { room: user.room, users: getUserInRoom(user.room) });

    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      socketio.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} has left the chat`,
      });
    }
  });
});

app.use(router);

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
