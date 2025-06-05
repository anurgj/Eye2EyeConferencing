const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const path = require('path');


const PORT = process.env.PORT || 3000;

let bigRoom;

let userOrder = [];

// Serve /0 or /1 as special cases
app.get('/:param(0|1)', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
  });

// Serve the "public" folder when visiting "/"
app.use(express.static(path.join(__dirname, 'public')));



// Static files first
app.use('/one-camera', express.static(path.join(__dirname, 'one-camera')));

// Wildcard fallback: serve index.html for any unmatched /one-camera/* route
app.get('/one-camera/:delay', (req, res) => {
  res.sendFile(path.join(__dirname, 'one-camera/index.html'));
});

  

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Add the new user to the userOrder array
    userOrder.push(socket.id);


    // Notify all users about the updated user order
    io.emit('update-user-order', userOrder, socket.id);

    // When a user joins a room
    socket.on('join-room', (room) => {
        console.log(`User ${socket.id} joined room ${room}`);
        socket.join(room);
        bigRoom = room;
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

    // When a user switches their cameras
    socket.on('cameras-switched', (position) => {
        socket.broadcast.to(bigRoom).emit('cameras-switched', position);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        userOrder = userOrder.filter(userId => userId !== socket.id);
        io.emit('update-user-order', userOrder, socket.id);
        // Broadcast to all users in the room that a user has disconnected
        socket.broadcast.emit('user-disconnected', socket.id);
    });

    socket.on('simulated-disconnect', () => {
        socket.broadcast.emit('user-disconnected', socket.id);
    });

        // Listen for messages
        socket.on("message", (message, socketId) => {
            // Broadcast message to all users except sender
            socket.broadcast.emit("createMessage", message, socketId);
        });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.get('/clearMeeting', (req, res) => {
    io.emit('redirectHome');
    userOrder = [];
    console.log('Cleared users from meeting');
 })

 app.get('/userCount', (req, res) => {
    res.json({ data: userOrder.length });
 })