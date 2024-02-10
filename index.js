const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const words = require("./words.js")

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

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
    id: socket.id,
    x: Math.floor(Math.random() * 10) * 50,
    y: Math.floor(Math.random() * 10) * 50,
    color,
    name: '',
    message: '',
    state: "dead",
    wins: 0
  };


  // Add the player to the players object
  players[socket.id] = player;

  // Emit the initial game state to the newly connected player
  socket.emit('init', { players, word });

  // Broadcast the new player to all other connected clients
  socket.broadcast.emit('newPlayer', player);

  if (Object.keys(players).length == 1) {
    startGame();
  }   

  // Handle player movement
  socket.on('move', (direction) => {
    handlePlayerMovement(socket.id, direction);
  });

  socket.on('chat message', (msg) => {
    var playerId = socket.id;

    
    if (alive.indexOf(playerId) == -1 || word == "loading") {
      return;
    }
    players[playerId].message = msg;
    var correct = word == msg;
    io.emit('messageSent', {playerId, msg, correct});

    alive.splice(alive.indexOf(playerId), 1);
    players[playerId].state = "dead";
    if (correct) {
      safe.push(playerId)
      players[playerId].state = "safe";
    }

    if (alive.length == 1) {
      playerId = alive[0];
      var msg = "";
      var correct = false;
      io.emit('messageSent', {playerId, msg, correct});
      players[playerId].state = "dead";
      alive.splice(alive.indexOf(playerId), 1);
    }

    if (alive.length == 0) {
      if (safe.length > 1) {
        newWord();
      } else {
        io.emit("newWord", "loading...")
        setTimeout(() => startGame(), 3000);
      }
    }
  });


  socket.on('nameGiven', (name) => {
    const playerId = socket.id;
    players[playerId].name = name;
    io.emit('nameSent', { playerId, name });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (players[socket.id].state == "alive") {
      alive.splice(alive.indexOf(socket.id), 1);
    } else if (players[socket.id].state == "safe") {
      safe.splice(safe.indexOf(socket.id), 1);
    }

    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });

});
function handlePlayerMovement(playerId, direction) {
  const player = players[playerId];

  if (direction === 'up' /*&& player.y > 0*/) {
    player.y -= 50;
  } else if (direction === 'down' /*&& player.y < 450*/) {
    player.y += 50;
  } else if (direction === 'left' /*&& player.x > 0*/) {
    player.x -= 50;
  } else if (direction === 'right' /*&& player.x < 450*/) {
    player.x += 50;
  }

  io.emit('playerMoved', { playerId, x: player.x, y: player.y });
}

async function startGame() {
  alive = []
  for (const playerId of Object.keys(players)) {
    msg = ""
    correct = true;
    io.emit('messageSent', {playerId, msg, correct});
    players[playerId].message = "";

    alive.push(playerId);
    players[playerId].state = "alive"
  }
  safe = [];
  io.emit("reviveAll");
  newWord();
}

function newWord() {
  for (const id of safe) {
    alive.push(id);
    players[id].state = "alive";
  }
  safe = [];

  word = words[Math.floor(Math.random() * 9884)]
  io.emit("newWord", word)
}