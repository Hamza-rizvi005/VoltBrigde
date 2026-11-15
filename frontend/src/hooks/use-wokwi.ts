import { useEffect, useRef, useState } from 'react';
import type { MqttClient } from 'mqtt';
import { z } from 'zod';
export const WOKWI_BROKER = 'wss://broker.hivemq.com:8884/mqtt';
export const WOKWI_TELEMETRY = 'voltbridge/hamza2026/telemetry';
export const WOKWI_CONTROL = 'voltbridge/hamza2026/control';
export const wokwiSchema = z.object({
  battery_voltage_v: z.number().finite().min(0).max(100),
  battery_soc_pct: z.number().finite().min(0).max(100),
  current_ma: z.number().finite().nonnegative(),
  tabletop_power_w: z.number().finite().nonnegative(),
  scaled_home_load_w: z.number().finite().nonnegative(),
  fan_running: z.boolean(), fan_uptime_seconds: z.number().finite().nonnegative(),
  backup_minutes_remaining: z.number().finite().nonnegative().nullable(),
});
export function useWokwi() {
  const [data, setData] = useState<z.infer<typeof wokwiSchema> | null>(null);
  const [received, setReceived] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('Connecting to Wokwi MQTT…');
  const client = useRef<MqttClient | null>(null);
  const pending = useRef<{ relay: boolean; sent: number } | null>(null);
  useEffect(() => {
    let disposed = false;
    void import('mqtt').then((mod) => {
      if (disposed) return;
      const connect = mod.connect ?? mod.default?.connect ?? (typeof mod.default === 'function' ? mod.default : null);
      if (typeof connect !== 'function') throw new Error('connect function not found in mqtt module');
      const mqtt = connect(WOKWI_BROKER, { clientId: `voltbridge-web-${crypto.randomUUID()}`, clean: true, reconnectPeriod: 3000, connectTimeout: 10000, resubscribe: false, queueQoSZero: false });
      client.current = mqtt;
      mqtt.on('connect', () => {
        setConnected(true); setReceived(0);
        mqtt.subscribe(WOKWI_TELEMETRY, { qos: 0 }, (error, grants) => {
          if (disposed) return;
          setMessage(error || grants?.some(g => g.qos === 128) ? 'Telemetry subscription failed.' : 'Broker connected. Waiting for fresh Wokwi packets…');
        });
      });
      mqtt.on('message', (topic, payload, packet) => {
        if (disposed || topic !== WOKWI_TELEMETRY || packet.retain || payload.length > 8192) return;
        try {
          const parsed = wokwiSchema.parse(JSON.parse(payload.toString()));
          setData(parsed); setReceived(Date.now());
          if (pending.current && parsed.fan_running === pending.current.relay) { pending.current = null; setMessage('Fan state confirmed by Wokwi telemetry. Timer execution is reported by the device.'); }
          else if (!pending.current) setMessage('Receiving live Wokwi telemetry.');
        } catch { setMessage('Ignored an invalid telemetry packet. Check the Wokwi JSON fields.'); }
      });
      const offline = () => { if (!disposed) { setConnected(false); setReceived(0); pending.current = null; setMessage('MQTT disconnected. Reconnecting…'); } };
      mqtt.on('offline', offline); mqtt.on('close', offline);
      mqtt.on('error', () => { if (!disposed) setMessage('MQTT connection error. Check internet access and the broker.'); });
    }).catch((e) => {
      console.error('MQTT initialization error:', e);
      if (!disposed) setMessage('Unable to load the MQTT client. Refresh to retry.');
    });
    const timer = setInterval(() => {
      setNow(Date.now());
      if (pending.current && Date.now() - pending.current.sent > 6000) { pending.current = null; setMessage('Command sent but fan state was not confirmed. Check Wokwi before retrying.'); }
    }, 1000);
    return () => { disposed = true; clearInterval(timer); client.current?.end(true); client.current = null; };
  }, []);
  const live = connected && received > 0 && now - received < 5000;
  const control = (relay: boolean, timerSeconds: number) => {
    if (!live || !client.current?.connected) { setMessage('Fresh Wokwi telemetry is required to send controls.'); return; }
    if (!Number.isInteger(timerSeconds) || timerSeconds < 0 || timerSeconds > 86400) { setMessage('Enter a whole timer from 0 to 86400 seconds.'); return; }
    pending.current = { relay, sent: Date.now() };
    setMessage('Sending command. Waiting for Wokwi fan state…');
    client.current.publish(WOKWI_CONTROL, JSON.stringify(relay ? { relay: true, timer_sec: timerSeconds } : { relay: false }), { qos: 0, retain: false }, error => {
      if (error) { pending.current = null; setMessage('Command could not be sent.'); }
    });
  };
  return { data, live, message, now, received, control };
}
