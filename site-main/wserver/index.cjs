const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let peers = new Set();

wss.on('connection', socket => {
  peers.add(socket);

  socket.on('message', message => {
    for (let peer of peers) {
      if (peer !== socket && peer.readyState === WebSocket.OPEN) {
        peer.send(message);
      }
    }
  });

  socket.on('close', () => {
    peers.delete(socket);
  });
});

console.log('Signaling server running on ws://localhost:8080');
