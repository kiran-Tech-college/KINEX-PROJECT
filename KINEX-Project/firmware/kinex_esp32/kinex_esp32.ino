// KINEX ESP32 firmware: reads MPU-6050 over I2C, sends JSON over WebSocket (port 81).
// Library needed: "WebSockets" by Markus Sattler (Arduino Library Manager).
#include <WiFi.h>
#include <Wire.h>
#include <WebSocketsServer.h>

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

const uint8_t MPU_ADDR = 0x68;   // a second sensor with AD0 high would be 0x69
WebSocketsServer ws(81);

int16_t read16() { int16_t hi = Wire.read(); return (hi << 8) | Wire.read(); }

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);                       // SDA = GPIO21, SCL = GPIO22
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); Wire.write(0);          // wake the MPU-6050 from sleep
  Wire.endTransmission();

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(300);
  Serial.println(WiFi.localIP());           // use this IP in the dashboard

  ws.begin();
}

void loop() {
  ws.loop();
  static uint32_t lastSend = 0;
  if (millis() - lastSend < 50) return;     // 20 readings per second
  lastSend = millis();

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);                         // first data register
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, (uint8_t)14);

  int16_t ax = read16(), ay = read16(), az = read16();
  read16();                                 // skip temperature
  int16_t gx = read16(), gy = read16(), gz = read16();

  char buf[120];
  snprintf(buf, sizeof(buf),
    "{\"ax\":%.3f,\"ay\":%.3f,\"az\":%.3f,\"gx\":%.2f,\"gy\":%.2f,\"gz\":%.2f}",
    ax / 16384.0, ay / 16384.0, az / 16384.0,   // default range +-2 g
    gx / 131.0, gy / 131.0, gz / 131.0);        // default range +-250 deg/s
  ws.broadcastTXT(buf);
}
