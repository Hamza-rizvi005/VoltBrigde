import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useWokwi } from '@/hooks/use-wokwi';
import { useStore } from '@/lib/store';
import { nextOutage } from '@/lib/hardware';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Fan } from 'lucide-react';
import type { HardwareSyncData } from './HardwareControlPanel';

const time = (n: number) => new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', hour12: true }).format(n);

export function WokwiPanel({ onSync }: { onSync?: (data: HardwareSyncData | null) => void }) {
  const { state } = useStore();
  const hw = useWokwi();
  const [timer, setTimer] = useState('0');
  const d = hw.data;

  useEffect(() => {
    onSync?.({
      source: 'wokwi',
      soc_pct: d?.battery_soc_pct ?? null,
      battery_voltage: d?.battery_voltage_v ?? null,
      load_w: d?.scaled_home_load_w ?? null,
      live: hw.live,
      relay_on: d?.fan_running ?? false,
      label: hw.live ? 'Live Wokwi ESP32' : 'Wokwi Simulator',
    });
  }, [d?.battery_soc_pct, d?.battery_voltage_v, d?.scaled_home_load_w, d?.fan_running, hw.live, onSync]);
  const outage = nextOutage(state.cuts, hw.now);
  const emptyAt = d?.backup_minutes_remaining != null ? hw.received + d.backup_minutes_remaining * 60000 : null;
  const value = (n: number | undefined, digits = 2) => n === undefined ? '—' : n.toFixed(digits);
  const runtime = d ? `${String(Math.floor(d.fan_uptime_seconds / 60)).padStart(2, '0')}:${String(Math.floor(d.fan_uptime_seconds) % 60).padStart(2, '0')}` : '—';
  return <section className="hardware-panel" aria-label="Wokwi hardware view">
    <div className="hardware-heading"><div><p className="eyebrow">SOLAR MANAGEMENT SYSTEM · HARDWARE VIEW</p><h2>Wokwi solar & fan control</h2></div><span className={`hardware-badge ${hw.live ? 'live' : ''}`}>{hw.live ? 'WOKWI ESP32 LIVE CONNECTED' : d ? 'WOKWI TELEMETRY STALE' : 'WAITING FOR WOKWI'}</span></div>
    <p className="hardware-notice" role="status">{hw.message}{!hw.live && d ? ' Displaying last received values. Controls are disabled until fresh packets arrive.' : ''}</p>
    <div className="hardware-readings"><div><span>Battery</span><strong>{value(d?.battery_soc_pct, 0)}<small>%</small></strong><p>{value(d?.battery_voltage_v)} V</p><div className="hardware-charge"><i style={{width:`${d?.battery_soc_pct ?? 0}%`}} /></div></div><div><span>Live load · scaled home equivalent</span><strong>{value(d?.scaled_home_load_w)}<small> W</small></strong><p>{value(d?.current_ma, 0)} mA · tabletop {value(d?.tabletop_power_w)} W</p></div><div><span>Fan active run-time · mm:ss</span><strong>{runtime}</strong><p>{d ? d.fan_running ? 'Fan running' : 'Fan stopped' : 'Awaiting device state'}</p></div></div>
    <div className="hardware-controls"><div className={`hardware-load ${hw.live && d?.fan_running ? 'running' : ''}`} aria-hidden="true"><Fan size={50} /></div><div className="hardware-switch"><strong>{hw.live ? 'Control your Wokwi relay' : 'Waiting for a live device'}</strong><p>Commands are confirmed by incoming fan-state readings.</p><div className="flex flex-wrap gap-3"><Button disabled={!hw.live || !timer.trim()} onClick={() => hw.control(true, Number(timer))}>Turn Fan ON</Button><Button variant="destructive" disabled={!hw.live} onClick={() => hw.control(false, 0)}>Pause Fridge / Shut Down Fan</Button></div></div><div className="hardware-limits"><label>Auto-shutdown timer (seconds)<Input type="number" min="0" max="86400" step="1" value={timer} onChange={e=>setTimer(e.target.value)} /></label><p>0 = no timer. Apply starts the fan with the selected timer.</p><Button disabled={!hw.live || !timer.trim()} variant="outline" onClick={()=>hw.control(true, Number(timer))}>Apply timer</Button></div></div>
    <div className="hardware-prediction"><div><div><strong>Predicted battery empty time</strong><p>{hw.live && emptyAt !== null ? `${time(emptyAt)} · ${value(d?.backup_minutes_remaining ?? undefined, 1)} minutes remaining` : 'Awaiting a fresh backup estimate'}</p></div></div><div><div><strong>Expected K-Electric return</strong><p>{outage ? time(outage.end) : 'Add an expected power-cut window'}</p>{hw.live && emptyAt !== null && outage && <p>{emptyAt < outage.end ? `${Math.ceil((outage.end - Math.max(outage.start,emptyAt))/60000)} minutes of the outage uncovered` : 'No predicted gap at the current drain'}</p>}<Link to="/app/power-cuts">Edit expected return window</Link></div></div></div>
    <p className="hardware-footnote">Karachi time. Return windows come from your saved schedule. Battery and backup estimates come directly from Wokwi. This public MQTT topic has no authentication and is intended for your simulation.</p>
  </section>;
}
