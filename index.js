const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);

let isErasing = false; // Initial eraser state

io.on('connect', (socket) => {
    // Send initial state to newly connected client
    socket.emit('initialState', { isErasing });

    // Handle toggleEraser event from clients
    socket.on('toggleEraser', (state) => {
        isErasing = state;
        io.emit('toggleEraser', isErasing); // Broadcast state change to all clients
    });

    // Handle request for initial state from client
    socket.on('requestInitialState', () => {
        socket.emit('initialState', { isErasing });
    });

    // Handle drawing events
    socket.on('draw.start', (data) => {
        socket.broadcast.emit('draw.start', data);
    });

    socket.on('draw.continue', (data) => {
        socket.broadcast.emit('draw.continue', data);
    });

    socket.on('draw.stop', () => {
        socket.broadcast.emit('draw.stop');
    });

    // Handle color change events
    socket.on('colorChange', (color) => {
        socket.broadcast.emit('colorChange', color);
    });

    // Handle erasing events
    socket.on('erase', (data) => {
        socket.broadcast.emit('erase', data);
    });

    // Handle hover effect events
    socket.on('hoverStart', (color) => {
        socket.broadcast.emit('hoverStart', color);
    });

    socket.on('hoverEnd', () => {
        socket.broadcast.emit('hoverEnd');
    });

    // Handle disconnect events
    socket.on('disconnect', () => {
        // Cleanup or handle disconnect logic
    });
});

// Serve static files
app.use(express.static('public'));

const PORT = process.env.PORT || 9090;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
