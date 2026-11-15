import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { hardwareStatusSchema, type HardwareConnection, type HardwareControl, type HardwareMode, type HardwareStatus } from '@/lib/hardware-contract';
import { initialSimulation, simulateControl, simulateTick } from '@/lib/hardware';
export function useHardware(mode: HardwareMode) {
  const [status, setStatus] = useState<HardwareStatus>(() => initialSimulation(mode));
  const [connection, setConnection] = useState<HardwareConnection | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('Simulation only. No hardware is connected.');
  const [unknown, setUnknown] = useState(false);
  const [updated, setUpdated] = useState(Date.now());
  const generation = useRef(0);
  const commandBusy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  useEffect(() => {
    generation.current++; setConnection(null); setStatus(initialSimulation(mode));
    setNotice('Simulation only. No hardware is connected.');
  }, [mode]);
  useEffect(() => {
    let cancelled = false, timer: ReturnType<typeof setTimeout>;
    let previous = Date.now();
    const tick = async () => {
      if (cancelled) return;
      if (!commandBusy.current) {
        const version = generation.current;
        if (connection) {
          try {
            const result = hardwareStatusSchema.parse(await api('/hardware/status', 'POST', { connection }));
            if (!cancelled && version === generation.current) {
              if (result.sample_age_ms > 5000) throw new Error('Device telemetry is stale.');
              setStatus(result); setUpdated(Date.now());
            }
          } catch (e) {
            if (!cancelled && version === generation.current) {
              generation.current++; setConnection(null); setStatus(initialSimulation(mode)); setUnknown(true);
              setNotice(`${e instanceof Error ? e.message : 'Connection lost.'} Showing a separate simulation. Real relay state is unknown; firmware is configured to turn it off after 15 seconds without contact.`);
            }
          }
        } else {
          const now = Date.now(); const dt = (now - previous) / 1000;
          setStatus(s => simulateTick(s, dt)); setUpdated(now);
        }
      }
      previous = Date.now();
      if (!cancelled) timer = setTimeout(() => void tick(), connection ? 2000 : 1000);
    };
    timer = setTimeout(() => void tick(), 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [connection, mode]);
  const connect = async (input: HardwareConnection) => {
    if (commandBusy.current) return;
    commandBusy.current = true; setPending(true); const version = ++generation.current;
    try {
      const result = hardwareStatusSchema.parse(await api('/hardware/status', 'POST', { connection: input }));
      if (result.sample_age_ms > 5000) throw new Error('Device telemetry is stale.');
      if (!mounted.current || version !== generation.current) return;
      setConnection(input); setStatus(result); setUpdated(Date.now()); setUnknown(false);
      setNotice('Connected to ESP32. Controls below send real hardware commands.');
    } catch (e) {
      if (!mounted.current || version !== generation.current) return;
      setConnection(null); setStatus(initialSimulation(mode));
      setNotice(`${e instanceof Error ? e.message : 'Unable to connect.'} Interactive simulation is available; no hardware ON command was sent.`);
    } finally { commandBusy.current = false; if (mounted.current) setPending(false); }
  };
  const control = async (command: HardwareControl) => {
    if (commandBusy.current) return;
    commandBusy.current = true; setPending(true); const version = ++generation.current;
    try {
      if (connection) {
        const result = hardwareStatusSchema.parse(await api('/hardware/control', 'POST', { connection, control: command }));
        if (mounted.current && version === generation.current) { setStatus(result); setUpdated(Date.now()); setUnknown(false); setNotice('Device acknowledged the command. Relay output is not independent contactor feedback.'); }
      } else { setStatus(simulateControl(status, command)); setNotice('Simulation updated. No command was sent to hardware.'); }
    } catch (e) {
      if (mounted.current && version === generation.current) {
        if (connection) { setConnection(null); setStatus(initialSimulation(mode)); setUnknown(true); }
        setNotice(`${e instanceof Error ? e.message : 'Command failed.'}${connection ? ' Command outcome is unknown. Showing simulation; reconnect to read actual device status.' : ''}`);
      }
    } finally { commandBusy.current = false; if (mounted.current) setPending(false); }
  };
  return { status, live: !!connection, pending, notice, unknown, updated, connect, control };
}
