// Canvas setup
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Set initial canvas size
canvas.width = 0.98 * window.innerWidth;
canvas.height = window.innerHeight;

// Create a BroadcastChannel for refresh communication
const refreshChannel = new BroadcastChannel('tabRefreshChannel');

// Function to handle refresh event
function handleRefresh() {
    // Broadcast refresh event to other tabs
    refreshChannel.postMessage({ type: 'refresh' });
}

// Attach refresh event listener to window
window.addEventListener('beforeunload', handleRefresh);

// Function to handle receiving refresh message
function handleRefreshMessage(event) {
    // Reload the page when a refresh message is received
    if (event.data && event.data.type === 'refresh') {
        console.log(`Tab refreshed`);
        window.location.reload();
    }
}

// Listen for refresh messages from other tabs
refreshChannel.addEventListener('message', handleRefreshMessage);

// Socket.io connection (assuming io is already defined)
var io = io.connect("http://localhost:9090/");

// Function to display logs for user events
function logUserEvent(message) {
    console.log(message);
}

// Log when tab connects
io.on('connect', () => {
    logUserEvent(`User ${io.id} connected`);
});

// Event listeners for drawing and erasing functionality
let isDrawing = false;
let isErasing = false;
let currentX = 0;
let currentY = 0;
let lineWidth = 4; // Initial line width
let strokeColor = '#000'; // Initial stroke color

// Function to start drawing or erasing
function startDrawing(x, y) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing = true;
    currentX = x;
    currentY = y;
}

// Function to continue drawing or erasing
function continueDrawing(x, y) {
    if (isDrawing) {
        ctx.lineWidth = lineWidth; // Set line width
        ctx.strokeStyle = strokeColor; // Set stroke color
        if (isErasing) {
            ctx.globalCompositeOperation = 'destination-out'; // Set eraser mode
            ctx.arc(x, y, lineWidth / 2, 0, Math.PI * 2); // Adjust radius for eraser
            ctx.fill();
        } else {
            ctx.globalCompositeOperation = 'source-over'; // Set drawing mode
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        currentX = x;
        currentY = y;
    }
}

// Function to stop drawing or erasing
function stopDrawing() {
    isDrawing = false;
    ctx.globalCompositeOperation = 'source-over'; // Reset to default drawing mode
}

// Event listener for mouse down on canvas
canvas.addEventListener('mousedown', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    startDrawing(x, y);
    io.emit('draw.start', { x, y, strokeColor }); // Emit stroke color along with coordinates
});

// Event listener for mouse move on canvas
canvas.addEventListener('mousemove', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    if (isDrawing) {
        continueDrawing(x, y);
        io.emit(isErasing ? 'erase' : 'draw.continue', { x, y, strokeColor }); // Emit stroke color
    }
});

// Event listener for mouse up on canvas
canvas.addEventListener('mouseup', () => {
    stopDrawing();
    io.emit('draw.stop');
});

// Toggle eraser functionality
const eraserButton = document.getElementById('eraserButton');
eraserButton.addEventListener('click', () => {
    isErasing = !isErasing;
    eraserButton.textContent = isErasing ? 'Drawing' : 'Erasing';
    io.emit('toggleEraser', isErasing); // Emit event to synchronize eraser state
});

// Color selection functionality
const colorOptions = document.querySelectorAll('.color-option');
colorOptions.forEach(option => {
    option.addEventListener('click', () => {
        strokeColor = option.style.backgroundColor;
        ctx.strokeStyle = strokeColor; // Update stroke color locally
        io.emit('colorChange', strokeColor); // Emit color change event to synchronize
    });
});

// Example logging in client-side Socket.io event listeners
io.on('draw.start', ({ x, y, strokeColor }) => {
    startDrawing(x, y);
    ctx.strokeStyle = strokeColor; // Set stroke color
});

io.on('draw.continue', ({ x, y, strokeColor }) => {
    continueDrawing(x, y);
    ctx.strokeStyle = strokeColor; // Set stroke color
});

io.on('draw.stop', () => {
    stopDrawing();
});

// Handling erasing on receiving 'erase' events
io.on('erase', ({ x, y }) => {
    continueDrawing(x, y);
});

// Synchronize eraser state across tabs
io.on('toggleEraser', (state) => {
    isErasing = state;
    eraserButton.textContent = isErasing ? 'Drawing' : 'Erasing';
});

// Initial state synchronization for eraser and toggle button
io.emit('requestInitialState'); // Request initial state from server

io.on('initialState', ({ isErasing }) => {
    // Set initial eraser state
    isErasing = isErasing;
    eraserButton.textContent = isErasing ? 'Drawing' : 'Erasing';
});

// Function to periodically request and synchronize state
setInterval(() => {
    io.emit('requestInitialState'); // Request initial state periodically
}, 1000); // Adjust interval as needed

// Handle hover effect synchronization
colorOptions.forEach(option => {
    option.addEventListener('mouseenter', () => {
        option.classList.add('hovered');
        io.emit('hoverStart', option.style.backgroundColor);
    });
    option.addEventListener('mouseleave', () => {
        option.classList.remove('hovered');
        io.emit('hoverEnd');
    });
});

// Server-side handling for hover effect
io.on('hoverStart', (color) => {
    colorOptions.forEach(option => {
        if (option.style.backgroundColor === color) {
            option.classList.add('hovered');
        }
    });
});

io.on('hoverEnd', () => {
    colorOptions.forEach(option => {
        option.classList.remove('hovered');
    });
});

// Server-side handling for color change synchronization
io.on('colorChange', (color) => {
    strokeColor = color;
    ctx.strokeStyle = strokeColor; // Update stroke color globally
});
