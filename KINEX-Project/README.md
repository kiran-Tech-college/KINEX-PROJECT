# KINEX - Wearable Motion Tracking

ESP32 + MPU-6050 IMU -> WebSocket -> React dashboard.

    [MPU-6050] --I2C--> [ESP32] --WebSocket :81--> [Backend relay :8080] --> [React dashboard]
                                         \--------------(direct)--------------> [React dashboard]

## Folders
- frontend/  React + Vite dashboard (what the user sees)
- backend/   Node.js relay server (optional). Simulates data now, relays the ESP32 later
- firmware/  ESP32 Arduino sketch (add when hardware is ready)

## Run the demo (no hardware needed)
1. cd frontend && npm install && npm run dev   -> open http://localhost:5173
2. The dashboard starts in "Demo data" mode.

## Test the backend (still no hardware)
1. cd backend && npm install && npm start      (simulated data on ws://localhost:8080)
2. In the dashboard choose "Backend relay".

## Add the hardware later
1. Flash firmware/kinex_esp32 (set your Wi-Fi name and password). Note the IP it prints.
2. Option A (direct): choose "ESP32 direct" and enter ws://<esp32-ip>:81
3. Option B (relay):  cd backend && ESP_URL=ws://<esp32-ip>:81 npm start, then choose "Backend relay"

Data format (JSON, about 20 times per second), units g and deg/s:
{"ax":0.01,"ay":-0.02,"az":0.98,"gx":1.2,"gy":-0.4,"gz":0.1}
