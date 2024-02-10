const words = require("./words.js")
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Command provided by express that initializes a static website from the files in the public folder, and hosts this on the port
app.use(express.static('public'));

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


const players = {};

var alive = [];
var safe = [];
var word = "";
io.on('connection', (socket) => {
  // Generate a random color for the player
  const color = "hsl(" + Math.random() * 360 + ", 100%, 50%)";


  // Create a new player object
  const player = {
    state: "dead",
    id: socket.id,
    x: Math.floor(Math.random() * 10) * 50,
    y: Math.floor(Math.random() * 10) * 50,
    color,
    name: '',
    message: ''
  };


  // Add the player to the players object
  players[socket.id] = player;

  // Emit the initial game state to the newly connected player
  socket.emit('init', { players, word });


  // Broadcast the new player to all connected clients
  socket.broadcast.emit('newPlayer', player);


  // Handle disconnect
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });


    // Handle player movement
  socket.on('move', (direction) => {
    handlePlayerMovement(socket.id, direction);
  });

  socket.on('chat message', (msg) => {
    var playerId = socket.id;
    players[playerId].message = msg;
    io.emit('messageSent', { playerId, msg });
  });


  socket.on('nameGiven', (name) => {
    const playerId = socket.id;
    players[playerId].name = name;
    io.emit('nameSent', { playerId, name });
  });

});

function handlePlayerMovement(playerId, direction) {
  const player = players[playerId];


  if (direction === 'up') {
    player.y -= 50;
  } else if (direction === 'down') {
    player.y += 50;
  } else if (direction === 'left') {
    player.x -= 50;
  } else if (direction === 'right') {
    player.x += 50;
  }


  io.emit('playerMoved', { playerId, x: player.x, y: player.y });
}
