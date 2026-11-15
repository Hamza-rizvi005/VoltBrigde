import { useState, useEffect } from 'react';
import { WokwiPanel } from './WokwiPanel';
import { Link } from '@tanstack/react-router';
import { Fan, Power, Radio, Battery, Timer, ArrowRight } from 'lucide-react';
import { useHardware } from '@/hooks/use-hardware';
import { hardwareConnectionSchema, hardwareControlSchema, type HardwareMode } from '@/lib/hardware-contract';
import { formatRuntime, outageGap, remainingSeconds } from '@/lib/hardware';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
const show = (n: number | null, digits = 2) => n === null ? '—' : n.toFixed(digits);
const clock = (time: number) => new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', hour12: true }).format(time);

export type HardwareSyncData = {
  source: 'wokwi' | 'local';
  soc_pct: number | null;
  battery_voltage: number | null;
  load_w: number | null;
  live: boolean;
  relay_on: boolean;
  label: string;
};

export function HardwareControlPanel({ onSync }: { onSync?: (data: HardwareSyncData | null) => void }) {
  const [source, setSource] = useState<'wokwi' | 'local'>('wokwi');
  return (
    <>
      <div className="assistant-topics" aria-label="Hardware connection source">
        <button aria-pressed={source === 'wokwi'} onClick={() => setSource('wokwi')}>
          Wokwi MQTT
        </button>
        <button aria-pressed={source === 'local'} onClick={() => setSource('local')}>
          Local ESP32 / Demo
        </button>
      </div>
      {source === 'wokwi' ? <WokwiPanel onSync={onSync} /> : <LocalHardwarePanel onSync={onSync} />}
    </>
  );
}

function LocalHardwarePanel({ onSync }: { onSync?: (data: HardwareSyncData | null) => void }) {
  const { state } = useStore();
  const [mode, setMode] = useState<HardwareMode>('PROTOTYPE_5V_DC');
  const [ip, setIp] = useState(''); const [token, setToken] = useState('');
  const [timer, setTimer] = useState('0'); const [cutoff, setCutoff] = useState('20');
  const [scaled, setScaled] = useState(false); const [error, setError] = useState('');
  const hw = useHardware(mode), s = hw.status;
  const prototype = mode === 'PROTOTYPE_5V_DC';
  const scale = prototype && scaled ? 1000 : 1;
  const backup = remainingSeconds(s); const gap = outageGap(s, state.cuts, hw.updated);

  useEffect(() => {
    onSync?.({
      source: 'local',
      soc_pct: s.soc_pct ?? null,
      battery_voltage: s.battery_voltage ?? null,
      load_w: s.load_power_w !== null ? s.load_power_w * scale : null,
      live: hw.live,
      relay_on: s.relay_on,
      label: hw.live ? 'ESP32 Device' : 'ESP32 Simulator',
    });
  }, [s.soc_pct, s.battery_voltage, s.load_power_w, scale, hw.live, s.relay_on, onSync]);

  const command = (relay: boolean) => {
    const parsed = hardwareControlSchema.safeParse({ relay, timer_minutes: relay ? Number(timer) : 0, cutoff_pct: relay ? Number(cutoff) : s.cutoff_pct, request_id: crypto.randomUUID() });
    if (!parsed.success || (relay && (!timer.trim() || !cutoff.trim()))) { setError('Enter a whole timer from 0–1440 minutes and a cutoff from 5–95%.'); return; }
    if (relay && (s.soc_pct ?? 0) <= parsed.data.cutoff_pct) { setError('Battery is at or below this cutoff. Lower the setting within the safe configured range, or recharge first.'); return; }
    setError(''); void hw.control(parsed.data);
  };
  return <section className="hardware-panel" aria-labelledby="hardware-title">
    <div className="hardware-heading"><div><p className="eyebrow">SOLAR MANAGEMENT SYSTEM</p><h2 id="hardware-title">Live load & {prototype ? 'fan' : 'appliance'} control</h2><p>One control panel. Two hardware setups.</p></div><span className={`hardware-badge ${hw.live ? 'live' : ''}`}><Radio size={14} />{hw.live ? 'ESP32 connected' : 'SIMULATION'}</span></div>
    <div className="hardware-connect">
      <label>Hardware deployment<select value={mode} disabled={hw.pending || (hw.live && s.relay_on)} onChange={e => { setMode(e.target.value as HardwareMode); setScaled(false); setError(''); }}><option value="PROTOTYPE_5V_DC">Case 1: 5V Mini-Solar & Fan Prototype (INA219)</option><option value="PRODUCTION_220V_AC">Case 2: 220V Residential Inverter & Smart Meter (RS485 + PZEM-004T)</option></select></label>
      <form onSubmit={e => { e.preventDefault(); const parsed = hardwareConnectionSchema.safeParse({ ip: ip.trim(), token, mode }); if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check connection settings.'); return; } setError(''); void hw.connect(parsed.data); }}>
        <label>ESP32 Wi-Fi IP<Input placeholder="192.168.1.50" value={ip} onChange={e => setIp(e.target.value)} disabled={hw.pending || (hw.live && s.relay_on)} /></label>
        <label>Device token<Input type="password" autoComplete="off" placeholder="From firmware configuration" value={token} onChange={e => setToken(e.target.value)} disabled={hw.pending || (hw.live && s.relay_on)} /></label>
        <Button variant="outline" disabled={hw.pending || (hw.live && s.relay_on)} type="submit">{hw.pending ? 'Please wait…' : hw.live ? 'Reconnect' : 'Connect ESP32'}</Button>
      </form>
    </div>
    <p className={`hardware-notice ${hw.unknown ? 'uncertain' : ''}`} role="status">{hw.notice}</p>
    {hw.unknown && <p role="alert" className="mb-4 text-sm text-warning">Real relay state is unknown. These controls now affect simulation only. Reconnect to verify the device; do not assume the physical load has stopped.</p>}
    <div className="hardware-readings">
      <div><span>Battery {s.soc_method === 'voltage_estimate' ? '· approximate' : s.soc_method === 'simulation' ? '· simulated' : '· inverter-reported'}</span><strong>{show(s.soc_pct, 0)}<small>%</small></strong><p>{show(s.battery_voltage)} V</p><div className="hardware-charge" aria-hidden="true"><i style={{ width: `${s.soc_pct ?? 0}%` }} /></div></div>
      <div><span>{prototype ? 'Battery-side load draw' : 'AC load draw'}</span><strong>{show(s.load_power_w === null ? null : s.load_power_w * scale)}<small> W{scale !== 1 ? ' equivalent' : ''}</small></strong><p>{prototype ? `${show(s.load_current_a === null ? null : s.load_current_a * 1000, 0)} mA` : `${show(s.load_voltage, 1)} V / ${show(s.load_current_a)} A`}{prototype && scale === 1 ? ` / ${show(s.load_power_w === null ? null : s.load_power_w * 1000, 0)} mW` : ''}</p></div>
      <div><span>Active run-time · this run</span><strong className="hardware-runtime">{formatRuntime(s.uptime_seconds)}</strong><p>{s.relay_on ? 'Relay output ON' : 'Relay output OFF'} · {show(s.energy_kwh === null ? null : s.energy_kwh * scale, 4)} kWh{scale !== 1 ? ' equivalent' : ''}</p></div>
    </div>
    <div className="hardware-controls"><div className={`hardware-load ${s.relay_on ? 'running' : ''}`} aria-hidden="true">{prototype ? <Fan size={50} strokeWidth={1.2} /> : <Power size={45} strokeWidth={1.2} />}</div><div className="hardware-switch"><strong>{prototype ? 'Fan' : 'Appliance'} {s.relay_on ? 'is switched on' : 'is switched off'}{!hw.live ? ' in simulation' : ''}</strong><p>{s.fault ?? (hw.live ? 'Device enforces timer and cutoff locally.' : 'Try the timer and watch the readings respond.')}</p><Button disabled={hw.pending || (!s.relay_on && (!s.control_enabled || !s.sensor_ok || s.sample_age_ms > 5000))} onClick={() => command(!s.relay_on)} variant={s.relay_on ? 'destructive' : 'default'}><Power size={16} />{s.relay_on ? `Shut down ${prototype ? 'fan' : 'load'} OFF` : `Turn ${prototype ? 'fan' : 'load'} ON`}{!hw.live ? ' · simulated' : ''}</Button></div>
      <div className="hardware-limits"><label>Auto-shutdown timer (minutes)<Input type="number" min="0" max="1440" step="1" value={timer} disabled={hw.pending} onChange={e => setTimer(e.target.value)} /></label><label>Low-battery cutoff (%)<Input type="number" min="5" max="95" value={cutoff} disabled={hw.pending} onChange={e => setCutoff(e.target.value)} /></label><p>0 minutes = no run-time limit. Settings apply when you turn on or apply limits.</p><Button variant="outline" disabled={hw.pending || !s.relay_on} onClick={() => command(true)}>Apply limits to current run</Button><p>Device cutoff: {s.cutoff_pct}% · Timer: {s.timer_remaining_seconds === null ? 'not set' : formatRuntime(s.timer_remaining_seconds)}</p></div></div>
    {error && <p role="alert" className="text-destructive mb-4">{error}</p>}
    <div className="hardware-prediction"><div><Battery size={20} /><div><strong>Estimated backup above cutoff</strong><p>{backup === null ? 'Needs valid battery capacity and a positive measured drain.' : formatRuntime(backup)}</p></div></div><div><Timer size={20} /><div><strong>Power-cut gap · Karachi time</strong><p>{gap ? `Load stops around ${clock(gap.depletion)}; expected return ${clock(gap.end)}. ${gap.gapSeconds > 0 ? `${Math.ceil(gap.gapSeconds / 60)} min uncovered.` : 'No gap at this constant drain.'}` : 'Add an outage window and run the load to estimate the gap.'}</p><Link to="/app/power-cuts">Edit expected power cuts <ArrowRight size={14} /></Link></div></div></div>
    {prototype && <label className="hardware-scale"><input type="checkbox" checked={scaled} onChange={e => setScaled(e.target.checked)} />Scale prototype to 220V home equivalent · 1,000× illustrative power and energy</label>}
    <p className="hardware-footnote">{scale !== 1 ? `Raw draw: ${show(s.load_power_w)} W. Scaling changes display only; voltage, current, SoC, run-time, estimates and commands stay unscaled. ` : ''}{hw.live ? 'Readings are device-reported; relay position is not independently verified. ' : `Simulation assumptions: ${prototype ? '2 Ah at 3.7 V, 215 mA input draw' : '100 Ah at 51.2 V, 800 W load, 90% conversion efficiency'}. `}Backup assumes constant drain and configured capacity. Power-cut windows are manually entered, not a verified K-Electric feed. Closing this page stops polling; firmware turns the relay off after a 15-second connection timeout. Software cutoff supplements physical battery protection.</p>
  </section>;
}

