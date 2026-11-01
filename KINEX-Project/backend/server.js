// KINEX relay server.
// No ESP_URL set  -> sends simulated IMU data (for testing without hardware).
// ESP_URL set     -> connects to the ESP32 and forwards its data to every dashboard.
import { WebSocketServer, WebSocket } from 'ws'

const PORT = 8080
const ESP_URL = process.env.ESP_URL // example: ws://192.168.43.15:81

const wss = new WebSocketServer({ port: PORT })
console.log(`KINEX relay running on ws://localhost:${PORT}`)

const broadcast = (text) => {
  wss.clients.forEach((c) => c.readyState === WebSocket.OPEN && c.send(text))
}

if (ESP_URL) {
  const connect = () => {
    console.log('Connecting to ESP32 at', ESP_URL)
    const esp = new WebSocket(ESP_URL)
    esp.on('open', () => console.log('ESP32 connected'))
    esp.on('message', (data) => broadcast(data.toString()))
    esp.on('close', () => { console.log('ESP32 lost, retrying in 3 s'); setTimeout(connect, 3000) })
    esp.on('error', () => esp.close())
  }
  connect()
} else {
  console.log('No ESP_URL set: sending simulated data')
  let t = 0
  const r = () => Math.random() - 0.5
  setInterval(() => {
    t += 0.05
    broadcast(JSON.stringify({
      ax: +(0.35 * Math.sin(t * 1.3) + 0.03 * r()).toFixed(3),
      ay: +(0.25 * Math.cos(t * 0.9) + 0.03 * r()).toFixed(3),
      az: +(0.95 + 0.06 * Math.sin(t * 0.5) + 0.03 * r()).toFixed(3),
      gx: +(40 * Math.cos(t * 0.9) + 4 * r()).toFixed(2),
      gy: +(55 * Math.sin(t * 1.3) + 4 * r()).toFixed(2),
      gz: +(18 * Math.sin(t * 0.4) + 3 * r()).toFixed(2),
    }))
  }, 50)
}
