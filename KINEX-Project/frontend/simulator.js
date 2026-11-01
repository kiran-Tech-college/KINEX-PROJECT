const { WebSocketServer } = require('ws');

// Create a WebSocket server on port 81 (same port your ESP32 uses)
const wss = new WebSocketServer({ port: 81 });

console.log('🔋 ESP32 Simulator running on ws://localhost:81');
console.log('Sending fake motion data...');

wss.on('connection', function connection(ws) {
    console.log('🟢 React Dashboard connected!');
});

// Send data every 50ms (20 times a second)
setInterval(() => {
    // Generate random numbers between -10 and 10
    const data = {
        ax: (Math.random() * 20) - 10,
        ay: (Math.random() * 20) - 10,
        az: (Math.random() * 20) - 10,
        gx: (Math.random() * 20) - 10,
        gy: (Math.random() * 20) - 10,
        gz: (Math.random() * 20) - 10
    };

    // Send to all connected clients (your React app)
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // 1 = OPEN
            client.send(message);
        }
    });
}, 50);