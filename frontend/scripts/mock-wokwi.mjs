import mqtt from 'mqtt';

const BROKER = 'wss://broker.hivemq.com:8884/mqtt';
const TELEMETRY_TOPIC = 'voltbridge/hamza2026/telemetry';
const CONTROL_TOPIC = 'voltbridge/hamza2026/control';

let fanRunning = true;
let uptimeSeconds = 240; // continuing from 4 minutes
let timerSeconds = 0;
let timerStart = 0;

// Dynamic battery SoC: starts at 74% (reflecting ~4 minutes of 850W discharge from 78%)
let batterySoc = 74.0;

const client = mqtt.connect(BROKER, {
  clientId: `mock-wokwi-${Math.random().toString(16).slice(2)}`,
  clean: true,
  reconnectPeriod: 3000,
});

client.on('connect', () => {
  console.log('[Mock Wokwi] Connected to HiveMQ broker. Publishing dynamic discharge telemetry...');
  client.subscribe(CONTROL_TOPIC);
  publishTelemetry();
});

client.on('message', (topic, message) => {
  if (topic === CONTROL_TOPIC) {
    try {
      const data = JSON.parse(message.toString());
      console.log('[Mock Wokwi] Command received:', data);
      fanRunning = !!data.relay;
      if (fanRunning) {
        timerSeconds = data.timer_sec || 0;
        timerStart = Date.now();
        if (uptimeSeconds === 0) uptimeSeconds = 1;
      } else {
        timerSeconds = 0;
      }
      publishTelemetry();
    } catch (e) {
      console.error('[Mock Wokwi] Bad command:', e.message);
    }
  }
});

function publishTelemetry() {
  if (fanRunning && timerSeconds > 0) {
    const elapsed = (Date.now() - timerStart) / 1000;
    if (elapsed >= timerSeconds) {
      console.log('[Mock Wokwi] Timer expired. Fan turned OFF.');
      fanRunning = false;
      timerSeconds = 0;
    }
  }

  if (fanRunning) {
    uptimeSeconds += 1;
    // Drains 1% roughly every 60 seconds (scaled 1.5kWh battery with 850W load)
    batterySoc = Math.max(5.0, batterySoc - (1.0 / 60.0));
  }

  const roundedSoc = Number(batterySoc.toFixed(1));
  const voltage = Number((3.0 + (batterySoc / 100) * 1.2).toFixed(2));
  const currentMa = fanRunning ? 220 : 0;
  const tabletopWatts = fanRunning ? 0.85 : 0;
  const scaledWatts = fanRunning ? 850 : 0;
  const usableWh = 1500 * (batterySoc / 100);
  const backupMinutes = scaledWatts > 0 ? Number(((usableWh / scaledWatts) * 60).toFixed(1)) : null;

  const payload = {
    battery_voltage_v: voltage,
    battery_soc_pct: roundedSoc,
    current_ma: currentMa,
    tabletop_power_w: tabletopWatts,
    scaled_home_load_w: scaledWatts,
    fan_running: fanRunning,
    fan_uptime_seconds: uptimeSeconds,
    backup_minutes_remaining: backupMinutes,
  };

  client.publish(TELEMETRY_TOPIC, JSON.stringify(payload), { qos: 0, retain: false });
}

setInterval(publishTelemetry, 1000);
