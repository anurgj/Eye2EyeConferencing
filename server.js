const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Serve static files (e.g., HTML, CSS, JavaScript)
app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When a user joins a room
    socket.on('join-room', (room) => {
        console.log(`User ${socket.id} joined room ${room}`);
        socket.join(room);
        // Notify other users in the room about the new user
        socket.broadcast.to(room).emit('new-user', socket.id);
    });

    // When a user sends an offer to another user in the same room
    socket.on('offer', (offer, room, targetSocketId) => {
        socket.to(targetSocketId).emit('offer', offer, socket.id);
    });

    // When a user sends an answer to another user in the same room
    socket.on('answer', (answer, targetSocketId) => {
        socket.to(targetSocketId).emit('answer', answer, socket.id);
    });

    // When a user sends an ICE candidate to another user in the same room
    socket.on('ice-candidate', (candidate, targetSocketId) => {
        socket.to(targetSocketId).emit('ice-candidate', candidate, socket.id);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        // Broadcast to all users in the room that a user has disconnected
        socket.broadcast.emit('user-disconnected', socket.id);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
