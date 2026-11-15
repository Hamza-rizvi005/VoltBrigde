#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* MQTT_SERVER = "broker.hivemq.com";
const char* TELEMETRY_TOPIC = "voltbridge/hamza2026/telemetry";
const char* CONTROL_TOPIC = "voltbridge/hamza2026/control";
constexpr int PIN_BATT_POT = 34;
constexpr int PIN_LOAD_POT = 35;
constexpr int PIN_RELAY = 26;
// Retains your existing active-HIGH relay wiring.
constexpr bool RELAY_ACTIVE_HIGH = true;

WiFiClient network;
PubSubClient mqtt(network);
bool fanRunning = false;
uint32_t lastTick = 0;
uint64_t activeMillis = 0;
uint32_t timerStarted = 0;
uint32_t timerDurationMs = 0;
uint32_t lastReconnect = 0;
uint32_t lastWifiAttempt = 0;
uint32_t lastPublish = 0;
bool publishNow = true;

void updateRuntime() {
  const uint32_t now = millis();
  if (fanRunning) activeMillis += uint32_t(now - lastTick);
  lastTick = now;
}

void setFan(bool on) {
  updateRuntime();
  // A new ON run begins at zero. Updating a running timer preserves run-time.
  if (on && !fanRunning) activeMillis = 0;
  fanRunning = on;
  digitalWrite(PIN_RELAY, on == RELAY_ACTIVE_HIGH ? HIGH : LOW);
  if (!on) timerDurationMs = 0;
  publishNow = true;
  Serial.println(on ? "[RELAY] ON" : "[RELAY] OFF");
}

void checkTimer() {
  updateRuntime();
  if (fanRunning && timerDurationMs > 0 &&
      uint32_t(millis() - timerStarted) >= timerDurationMs) {
    setFan(false);
    Serial.println("[TIMER] Shutdown complete");
  }
}

void onMessage(char* topic, byte* payload, unsigned int length) {
  if (strcmp(topic, CONTROL_TOPIC) != 0) return;
  JsonDocument command;
  if (deserializeJson(command, payload, length) || !command["relay"].is<bool>()) {
    Serial.println("[CONTROL] Invalid JSON or missing boolean relay");
    return;
  }
  if (!command["relay"].as<bool>()) {
    setFan(false);
    return;
  }
  uint32_t seconds = 0;
  if (!command["timer_sec"].isNull()) {
    if (!command["timer_sec"].is<uint32_t>() || command["timer_sec"].as<uint32_t>() > 86400) {
      Serial.println("[CONTROL] timer_sec must be 0..86400 whole seconds");
      return;
    }
    seconds = command["timer_sec"].as<uint32_t>();
  }
  setFan(true);
  timerStarted = millis();
  timerDurationMs = seconds * 1000UL; // Zero also clears an earlier timer.
}

void publishTelemetry() {
  updateRuntime();
  const float soc = analogRead(PIN_BATT_POT) * 100.0f / 4095.0f;
  const float voltage = 3.0f + soc * 0.012f;
  const int currentMa = fanRunning ? map(analogRead(PIN_LOAD_POT), 0, 4095, 120, 480) : 0;
  const float watts = voltage * currentMa / 1000.0f;
  const int scaledWatts = fanRunning ? map(currentMa, 120, 480, 450, 1250) : 0;
  // Preserves your illustrative 1.5 kWh home-equivalent battery model.
  // This is a knob-driven demonstration, not measured cell capacity.
  const float usableWh = 1500.0f * soc / 100.0f;
  JsonDocument data;
  data["hardware_mode"] = "PROTOTYPE_5V_DC";
  data["battery_voltage_v"] = voltage;
  data["battery_soc_pct"] = soc;
  data["current_ma"] = currentMa;
  data["tabletop_power_w"] = watts;
  data["scaled_home_load_w"] = scaledWatts;
  data["fan_running"] = fanRunning;
  data["fan_uptime_seconds"] = activeMillis / 1000;
  if (scaledWatts > 0) data["backup_minutes_remaining"] = usableWh * 60.0f / scaledWatts;
  else data["backup_minutes_remaining"] = nullptr;
  char payload[768];
  const size_t length = serializeJson(data, payload, sizeof(payload));
  const bool sent = mqtt.publish(TELEMETRY_TOPIC, reinterpret_cast<const uint8_t*>(payload), length, false);
  Serial.print(sent ? "[TELEMETRY OK] " : "[TELEMETRY FAILED] ");
  Serial.println(payload);
}

void setup() {
  Serial.begin(115200);
  digitalWrite(PIN_RELAY, RELAY_ACTIVE_HIGH ? LOW : HIGH);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_BATT_POT, INPUT);
  pinMode(PIN_LOAD_POT, INPUT);
  analogReadResolution(12);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  mqtt.setServer(MQTT_SERVER, 1883);
  mqtt.setCallback(onMessage);
  if (!mqtt.setBufferSize(1024)) Serial.println("[ERROR] MQTT buffer allocation failed");
  mqtt.setSocketTimeout(1);
  network.setConnectionTimeout(1000);
  lastTick = millis();
  setFan(true); // Preserves your demo's initial fan-ON behavior.
}

void loop() {
  checkTimer();
  const uint32_t now = millis();
  if (WiFi.status() != WL_CONNECTED) {
    if (uint32_t(now - lastWifiAttempt) >= 10000) {
      lastWifiAttempt = now;
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
    delay(2);
    return;
  }
  if (!mqtt.connected()) {
    // No blocking reconnect loop. Timer checks continue between attempts.
    if (uint32_t(now - lastReconnect) >= 3000) {
      lastReconnect = now;
      const String id = "VB-Wokwi-" + WiFi.macAddress();
      if (mqtt.connect(id.c_str())) {
        const bool subscribed = mqtt.subscribe(CONTROL_TOPIC);
        Serial.println(subscribed ? "[MQTT] Connected and subscribed" : "[MQTT] Subscribe failed");
        publishNow = true;
      } else {
        Serial.print("[MQTT] Connection failed, state=");
        Serial.println(mqtt.state());
      }
    }
  } else {
    mqtt.loop();
    checkTimer();
    if (publishNow || uint32_t(millis() - lastPublish) >= 1000) {
      publishNow = false;
      lastPublish = millis();
      publishTelemetry();
    }
  }
  delay(2);
}
