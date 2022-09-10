const express = require('express');
var cors = require('cors');
const app = express();
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const port = process.env.PORT || 3001;
const io = require("socket.io")(port, {
  cors: {
    origin: ['https://grantguide.herokuapp.com/']
  }
});

require('dotenv').config();
// Connect to db after the dotenv above
require('./config/database');
app.use(logger('dev'));

// Process data in body of request if
// Content-Type: 'application/json'
// and put that data on req.body

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(favicon(path.join(__dirname, 'build', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'build')));
app.use(cors())

// Middleware to verify token and assign user object of payload to req.user.
// Be sure to mount before routes
app.use(require('./config/checkToken'));

// Put all API routes here (before the catch-all)
app.use('/api/users', require('./routes/api/users'));
app.use('/api/grants', require('./routes/api/grants'));
app.use('/api/conversations', require('./routes/api/conversations'));
app.use('/api/messages', require('./routes/api/messages'));
// "catch-all" route that will match all GET requests
// that don't match an API route defined above

app.get('/*', function(req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

let users = [];

const addUser = (userId, socketId) => {
  !users.some(user=> user.userId === userId) && users.push({ userId, socketId })
}
const removeUser = (socketId) => {
  users = users.filter((users) => users.socketId !== socketId)
}

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  //when ceonnect
  //take userId and socketId from user
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    console.log(users)
    io.emit("getUsers", users);
  });

  //send and get message
  socket.on("sendMessage", ({ senderId, receiverId, text }) => {
    //send message when both sender and reciever are connected
    if (users.some((user) => user.userId === receiverId)) {
      const user = getUser(receiverId);
      io.to(user.socketId).emit("getMessage", {
      senderId,
      text,
    });
    } else {
      // send message when only sender is connected to socket
      socket.on("sendMessage", ({ senderId, receiverId, text }) => {
      const user = getUser(senderId);
      io.to(user.socketId).emit("getMessage", {
      senderId,
      text,
    });
  });
    }
  });

  //when disconnect
  socket.on("disconnect", () => {
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});



// app.listen(port, function() {
//   console.log(`Express app running on port ${port}`);
// });