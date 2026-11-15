/* Volt Bridge dual-mode ESP32 HAL. Arduino ESP32 + ArduinoJson 7.
   Default build: prototype. Define MODE_PRODUCTION_PZEM_RS485 for residential.
   See ../README.md before wiring. Never connect mains to ESP32/INA219 pins.
*/
#if !defined(MODE_PROTOTYPE_INA219) && !defined(MODE_PRODUCTION_PZEM_RS485)
#define MODE_PROTOTYPE_INA219
#endif
#if defined(MODE_PROTOTYPE_INA219) && defined(MODE_PRODUCTION_PZEM_RS485)
#error Select exactly one Volt Bridge hardware mode
#endif
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <math.h>
#include "hardware_hal.h"
#if __has_include("config.local.h")
#include "config.local.h"
#else
#include "config.example.h"
#endif
#ifdef MODE_PROTOTYPE_INA219
#include <Adafruit_INA219.h>
#else
#include <PZEM004Tv30.h>
#include <ModbusMaster.h>
#endif

constexpr uint8_t RELAY_PIN = 26;
constexpr uint32_t MAX_SAMPLE_AGE_MS = 5000, CONNECTION_TIMEOUT_MS = 15000;
const char* MODE_NAME =
#ifdef MODE_PROTOTYPE_INA219
  "PROTOTYPE_5V_DC";
#else
  "PRODUCTION_220V_AC";
#endif
#ifdef MODE_PROTOTYPE_INA219
class PrototypeHAL : public HardwareHAL {
  Adafruit_INA219 ina;
  bool ready = false;
  uint32_t lastSample = 0;
public:
  void begin() override { Wire.begin(21, 22); Wire.setTimeOut(50); ready = ina.begin(); if (ready) ina.setCalibration_32V_2A(); }
  void sample(Measurements& d) override {
    Wire.beginTransmission(0x40);
    if (Wire.endTransmission() != 0) { d.batteryValid = d.powerValid = d.loadValid = false; ready = false; return; }
    if (!ready) { ready = ina.begin(); if (ready) ina.setCalibration_32V_2A(); }
    if (!ready) return;
    const float bus = ina.getBusVoltage_V(); const bool busOK = ina.success();
    const float shunt = ina.getShuntVoltage_mV(); const bool shuntOK = ina.success();
    const float amps = ina.getCurrent_mA() / 1000.0f; const bool currentOK = ina.success();
    // VIN+ is the cell-side voltage; VIN- is downstream of the shunt.
    const float battery = bus + shunt / 1000.0f;
    const uint32_t now = millis();
    const bool valid = busOK && shuntOK && currentOK && isfinite(battery) && isfinite(amps) && battery >= 2.5f && battery <= 4.35f && amps >= -0.02f && amps <= 2.0f;
    if (!valid) { d.batteryValid = d.powerValid = d.loadValid = false; return; }
    const float current = amps > .002f ? amps : 0; // Small calibrated zero-noise floor, not forced by relay state.
    if (lastSample && uint32_t(now - lastSample) <= MAX_SAMPLE_AGE_MS) d.energyKwh += max(0.0f, d.loadW) * uint32_t(now - lastSample) / 3600000000.0f;
    lastSample = now;
    d.batteryV = battery; d.soc = constrain((battery - 3.0f) / 1.2f * 100.0f, 0.0f, 100.0f);
    d.loadV = bus; d.loadA = current; d.loadW = bus * current; d.batteryW = battery * current;
    d.batteryAt = d.powerAt = d.loadAt = now;
    d.batteryValid = d.powerValid = d.loadValid = true;
  }
  float capacityWh() const override { return PROTOTYPE_CAPACITY_AH * 3.7f; }
  const char* socMethod() const override { return "voltage_estimate"; }
  bool controlEnabled() const override { return true; }
} hardware;
#else
HardwareSerial inverterPort(1), meterPort(2);
void beforeModbus() { digitalWrite(RS485_DE_RE_PIN, HIGH); }
void afterModbus() { digitalWrite(RS485_DE_RE_PIN, LOW); }
class ProductionHAL : public HardwareHAL {
  ModbusMaster inverter;
  PZEM004Tv30* meter = nullptr;
  bool readBattery = true;
public:
  void begin() override {
    pinMode(RS485_DE_RE_PIN, OUTPUT); digitalWrite(RS485_DE_RE_PIN, LOW);
    inverterPort.begin(GROWATT_BAUD, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);
    inverter.begin(GROWATT_SLAVE_ID, inverterPort);
    inverter.preTransmission(beforeModbus); inverter.postTransmission(afterModbus);
    meter = new PZEM004Tv30(meterPort, PZEM_RX_PIN, PZEM_TX_PIN);
  }
  void sample(Measurements& d) override {
    // One Growatt request per iteration; task waits >=1 s after each request.
    // Input registers (FC04), NOT holding registers. Growatt SPF V0.11, pages 13/15.
    if (GROWATT_PROFILE_CONFIRMED) {
      const uint8_t result = inverter.readInputRegisters(readBattery ? 17 : 77, 2);
      if (readBattery) {
        d.batteryValid = result == inverter.ku8MBSuccess;
        if (d.batteryValid) {
          const float v = inverter.getResponseBuffer(0) * .01f, soc = inverter.getResponseBuffer(1);
          d.batteryValid = v >= 36 && v <= 65 && soc <= 100;
          if (d.batteryValid) { d.batteryV = v; d.soc = soc; d.batteryAt = millis(); }
        }
      } else {
        d.powerValid = result == inverter.ku8MBSuccess;
        if (d.powerValid) {
          const uint32_t bits = (uint32_t(inverter.getResponseBuffer(0)) << 16) | inverter.getResponseBuffer(1);
          const float watts = int32_t(bits) * .1f; // positive discharge, negative charge
          d.powerValid = fabsf(watts) <= 30000;
          if (d.powerValid) { d.batteryW = watts; d.powerAt = millis(); }
        }
      }
      readBattery = !readBattery;
    }
    // Library decodes FC04 0x0000–0x0009, low-word-first for current/power/energy.
    const float v = meter->voltage(), a = meter->current(), w = meter->power(), energy = meter->energy();
    d.loadValid = isfinite(v) && isfinite(a) && isfinite(w) && isfinite(energy) && v >= 0 && v <= 300 && a >= 0 && a <= 100 && w >= 0;
    if (d.loadValid) { d.loadV = v; d.loadA = a; d.loadW = w; d.energyKwh = energy; d.loadAt = millis(); }
  }
  float capacityWh() const override { return PRODUCTION_CAPACITY_AH * PRODUCTION_NOMINAL_VOLTAGE; }
  const char* socMethod() const override { return "inverter_reported"; }
  bool controlEnabled() const override { return PRODUCTION_COMMISSIONED && GROWATT_PROFILE_CONFIRMED; }
} hardware;
#endif

WebServer server(80);
SemaphoreHandle_t measurementsMutex;
SemaphoreHandle_t controlMutex;
Measurements sharedMeasurements;
bool relayOn = false, configurationOK = false;
uint32_t lastContact = 0, previousTick = 0;
uint64_t runMilliseconds = 0, relayMilliseconds = 0;
uint32_t timerLimitMs = 0;
float cutoffPct = 20;
String stopReason = "Boot: relay off", deviceId;
String requestIds[16];
uint8_t requestIndex = 0;
Measurements snapshot() {
  Measurements d;
  if (xSemaphoreTake(measurementsMutex, pdMS_TO_TICKS(10)) == pdTRUE) { d = sharedMeasurements; xSemaphoreGive(measurementsMutex); }
  return d;
}
uint32_t sampleAge(const Measurements& d, uint32_t now) {
  return max(uint32_t(now - d.batteryAt), max(uint32_t(now - d.powerAt), uint32_t(now - d.loadAt)));
}
bool healthy(const Measurements& d, uint32_t now) { return d.batteryValid && d.powerValid && d.loadValid && sampleAge(d, now) <= MAX_SAMPLE_AGE_MS; }
void writeRelay(bool on) { digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? (on ? LOW : HIGH) : (on ? HIGH : LOW)); relayOn = on; }
void stopLoad(const String& reason) { writeRelay(false); timerLimitMs = 0; stopReason = reason; }
void enforceProtection() {
  xSemaphoreTakeRecursive(controlMutex, portMAX_DELAY);
  const uint32_t now = millis(), elapsed = now - previousTick;
  previousTick = now;
  const Measurements d = snapshot();
  if (!relayOn) { xSemaphoreGiveRecursive(controlMutex); return; }
  relayMilliseconds += elapsed;
  // Active run-time counts only intervals with positive measured branch load.
  if (healthy(d, now) && d.loadW > .01f) runMilliseconds += elapsed;
  if (!healthy(d, now)) stopLoad("Sensor invalid or stale");
  else if (WiFi.status() != WL_CONNECTED || uint32_t(now - lastContact) >= CONNECTION_TIMEOUT_MS) stopLoad("Connection timeout");
  else if (d.soc <= cutoffPct) stopLoad("Low-battery cutoff");
#ifdef MODE_PROTOTYPE_INA219
  else if (d.batteryV <= 3.0f || d.batteryV >= 4.25f || d.loadA > PROTOTYPE_MAX_CURRENT_A) stopLoad("Battery voltage or current limit");
#else
  else if (d.loadA > PRODUCTION_MAX_CURRENT_A) stopLoad("AC branch current limit");
#endif
  else if (timerLimitMs && relayMilliseconds >= timerLimitMs) stopLoad("Run-time limit reached");
  xSemaphoreGiveRecursive(controlMutex);
}
void protectionTask(void*) { for (;;) { enforceProtection(); vTaskDelay(pdMS_TO_TICKS(20)); } }
void samplingTask(void*) {
  hardware.begin();
  Measurements local;
  for (;;) {
    hardware.sample(local);
    if (xSemaphoreTake(measurementsMutex, pdMS_TO_TICKS(20)) == pdTRUE) { sharedMeasurements = local; xSemaphoreGive(measurementsMutex); }
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}
bool allowedOrigin() {
  const String origin = server.header("Origin");
  return origin.length() == 0 || origin == "http://127.0.0.1:5173" || origin == "http://localhost:5173";
}
void cors() {
  const String origin = server.header("Origin");
  if (origin.length() && allowedOrigin()) server.sendHeader("Access-Control-Allow-Origin", origin);
  server.sendHeader("Vary", "Origin");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, X-Device-Token");
  server.sendHeader("Cache-Control", "no-store");
}
void errorResponse(int code, const char* message) { cors(); JsonDocument doc; doc["error"] = message; String body; serializeJson(doc, body); server.send(code, "application/json", body); }
bool authorize() {
  if (!allowedOrigin()) { errorResponse(403, "Origin denied"); return false; }
  if (!configurationOK || server.header("X-Device-Token") != DEVICE_TOKEN) { errorResponse(401, "Device token required"); return false; }
  xSemaphoreTakeRecursive(controlMutex, portMAX_DELAY); lastContact = millis(); xSemaphoreGiveRecursive(controlMutex); return true;
}
void setNumber(JsonDocument& doc, const char* name, float value, bool valid) { if (valid && isfinite(value)) doc[name] = value; else doc[name] = nullptr; }
void sendStatus() {
  xSemaphoreTakeRecursive(controlMutex, portMAX_DELAY);
  enforceProtection();
  const Measurements d = snapshot(); const uint32_t now = millis(); const bool valid = healthy(d, now);
  JsonDocument doc;
  doc["schema_version"] = 1; doc["device_id"] = deviceId; doc["mode"] = MODE_NAME;
  doc["sample_age_ms"] = sampleAge(d, now); doc["sensor_ok"] = valid;
  doc["control_enabled"] = hardware.controlEnabled();
  if (!hardware.controlEnabled()) doc["fault"] = "Residential control not commissioned";
  else if (!valid) doc["fault"] = "Sensor unavailable or stale";
  else if (stopReason.length()) doc["fault"] = stopReason;
  else doc["fault"] = nullptr;
  setNumber(doc, "battery_voltage", d.batteryV, d.batteryValid && uint32_t(now - d.batteryAt) <= MAX_SAMPLE_AGE_MS);
  setNumber(doc, "soc_pct", d.soc, d.batteryValid && uint32_t(now - d.batteryAt) <= MAX_SAMPLE_AGE_MS);
  doc["soc_method"] = hardware.socMethod();
  setNumber(doc, "capacity_wh", hardware.capacityWh(), hardware.capacityWh() > 0);
  setNumber(doc, "battery_power_w", d.batteryW, d.powerValid && uint32_t(now - d.powerAt) <= MAX_SAMPLE_AGE_MS);
  const bool loadValid = d.loadValid && uint32_t(now - d.loadAt) <= MAX_SAMPLE_AGE_MS;
  setNumber(doc, "load_voltage", d.loadV, loadValid); setNumber(doc, "load_current_a", d.loadA, loadValid);
  setNumber(doc, "load_power_w", d.loadW, loadValid); setNumber(doc, "energy_kwh", d.energyKwh, loadValid);
  doc["relay_on"] = relayOn; doc["uptime_seconds"] = double(runMilliseconds) / 1000.0;
  if (relayOn && timerLimitMs) doc["timer_remaining_seconds"] = double(timerLimitMs > relayMilliseconds ? timerLimitMs - relayMilliseconds : 0) / 1000.0;
  else doc["timer_remaining_seconds"] = nullptr;
  doc["cutoff_pct"] = cutoffPct;
  xSemaphoreGiveRecursive(controlMutex);
  cors(); String body; serializeJson(doc, body); server.send(200, "application/json", body);
}
bool parseUnsigned(const String& text, uint32_t maximum, uint32_t& value) {
  if (text.length() == 0 || text.length() > 8) return false;
  value = 0;
  for (size_t i = 0; i < text.length(); i++) { if (text[i] < '0' || text[i] > '9') return false; value = value * 10 + text[i] - '0'; if (value > maximum) return false; }
  return true;
}
void handleControl() {
  if (!authorize()) return;
  if (server.hasArg("mode") && server.arg("mode") != MODE_NAME) { errorResponse(409, "Firmware mode mismatch"); return; }
  const String relay = server.arg("relay"), id = server.arg("request_id");
  if (relay != "0" && relay != "1") { errorResponse(422, "relay must be 0 or 1"); return; }
  // OFF remains available even if sensors/commissioning or other arguments are invalid.
  if (relay == "0") { xSemaphoreTakeRecursive(controlMutex, portMAX_DELAY); stopLoad("Manual shutdown"); xSemaphoreGiveRecursive(controlMutex); sendStatus(); return; }
  uint32_t minutes = 0, cutoff = uint32_t(cutoffPct);
  if (!parseUnsigned(server.arg("timer"), 1440, minutes) || (server.hasArg("cutoff") && (!parseUnsigned(server.arg("cutoff"), 95, cutoff) || cutoff < 5))) { errorResponse(422, "timer: 0-1440 whole minutes; cutoff: 5-95 whole percent"); return; }
  if (id.length() && id.length() != 36) { errorResponse(422, "request_id must be a UUID"); return; }
  if (id.length()) for (const String& previous : requestIds) if (previous == id) { sendStatus(); return; }
  xSemaphoreTakeRecursive(controlMutex, portMAX_DELAY);
  enforceProtection(); const Measurements d = snapshot();
  if (!hardware.controlEnabled() || !healthy(d, millis()) || d.soc <= cutoff) { xSemaphoreGiveRecursive(controlMutex); errorResponse(409, "Cannot enable: commissioning, sensor or battery cutoff check failed"); return; }
#ifdef MODE_PROTOTYPE_INA219
  if (d.batteryV <= 3.0f || d.batteryV >= 4.25f) { xSemaphoreGiveRecursive(controlMutex); errorResponse(409, "Unsafe battery voltage"); return; }
#endif
  if (!relayOn) runMilliseconds = 0;
  relayMilliseconds = 0; previousTick = millis(); timerLimitMs = minutes * 60000UL; cutoffPct = cutoff;
  stopReason = ""; writeRelay(true);
  xSemaphoreGiveRecursive(controlMutex);
  if (id.length()) { requestIds[requestIndex] = id; requestIndex = (requestIndex + 1) % 16; }
  sendStatus();
}
void setup() {
  // External pull-up (active low) / pull-down (active high) must hold driver OFF during reset.
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW); pinMode(RELAY_PIN, OUTPUT); writeRelay(false);
  Serial.begin(115200);
  configurationOK = strlen(DEVICE_TOKEN) >= 16 && strlen(DEVICE_TOKEN) <= 128 && strlen(WIFI_SSID) > 0;
  for (const char* c = DEVICE_TOKEN; *c; ++c) if (!isalnum(*c) && *c != '_' && *c != '-') configurationOK = false;
  measurementsMutex = xSemaphoreCreateMutex();
  controlMutex = xSemaphoreCreateRecursiveMutex();
  if (!measurementsMutex || !controlMutex) { Serial.println("HAL mutex allocation failed; relay remains OFF."); while (true) delay(1000); }
  char identifier[24]; snprintf(identifier, sizeof(identifier), "VB-%012llX", (unsigned long long)ESP.getEfuseMac()); deviceId = identifier;
  if (xTaskCreate(samplingTask, "volt-sensors", 6144, nullptr, 1, nullptr) != pdPASS) { Serial.println("Sensor task failed; relay remains OFF."); while (true) delay(1000); }
  previousTick = millis();
  if (xTaskCreate(protectionTask, "volt-protection", 3072, nullptr, 2, nullptr) != pdPASS) { Serial.println("Protection task failed; relay remains OFF."); while (true) delay(1000); }
  if (!configurationOK) { Serial.println("Configure Wi-Fi and a unique device token in config.local.h. Control is disabled."); return; }
  WiFi.mode(WIFI_STA); WiFi.setAutoReconnect(true); WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const char* headers[] = { "Origin", "X-Device-Token" }; server.collectHeaders(headers, 2);
  server.on("/status", HTTP_GET, []() { if (authorize()) sendStatus(); });
  server.on("/control", HTTP_POST, handleControl);
  for (const char* path : { "/status", "/control" }) server.on(path, HTTP_OPTIONS, []() { if (!allowedOrigin()) { errorResponse(403, "Origin denied"); return; } cors(); server.send(204); });
  server.onNotFound([]() { errorResponse(404, "Not found"); });
  server.begin();
}
void loop() {
  if (configurationOK) server.handleClient();
  static bool announced = false;
  if (WiFi.status() == WL_CONNECTED && !announced) { Serial.print("Volt Bridge "); Serial.print(MODE_NAME); Serial.print(" IP: "); Serial.println(WiFi.localIP()); announced = true; }
  if (WiFi.status() != WL_CONNECTED) announced = false;
  delay(2);
}

