import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useWokwi, WOKWI_CONTROL, WOKWI_TELEMETRY } from './use-wokwi';
const mock = vi.hoisted(() => {
  const handlers: Record<string, (...args: any[]) => void> = {};
  return { handlers, client: { connected: true, on: vi.fn((event: string, fn: (...args: any[]) => void) => { handlers[event] = fn; }), subscribe: vi.fn((_topic, _options, cb) => cb(null, [{qos:0}])), publish: vi.fn((_topic, _body, _options, cb) => cb(null)), end: vi.fn() } };
});
vi.mock('mqtt', () => ({connect: () => mock.client}));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });
it('uses fresh telemetry, sends exact commands, and disables stale controls', async () => {
  vi.useFakeTimers();
  const {result} = renderHook(useWokwi);
  await act(async () => { await Promise.resolve(); });
  await act(async () => { mock.handlers['connect']?.(); });
  const packet = {battery_voltage_v:3.92,battery_soc_pct:76,current_ma:215,tabletop_power_w:.84,scaled_home_load_w:840,fan_running:false,fan_uptime_seconds:252,backup_minutes_remaining:17};
  await act(async () => { mock.handlers['message']?.(WOKWI_TELEMETRY, Buffer.from(JSON.stringify(packet)), {retain:true}); });
  expect(result.current.live).toBe(false);
  await act(async () => { mock.handlers['message']?.(WOKWI_TELEMETRY, Buffer.from(JSON.stringify(packet)), {retain:false}); });
  expect(result.current.live).toBe(true); expect(result.current.data?.current_ma).toBe(215);
  act(() => result.current.control(true, 30));
  expect(mock.client.publish).toHaveBeenLastCalledWith(WOKWI_CONTROL, '{"relay":true,"timer_sec":30}', {qos:0,retain:false}, expect.any(Function));
  act(() => result.current.control(false, 0));
  expect(mock.client.publish).toHaveBeenLastCalledWith(WOKWI_CONTROL, '{"relay":false}', {qos:0,retain:false}, expect.any(Function));
  await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
  expect(result.current.live).toBe(false);
  act(() => result.current.control(true, 30));
  expect(mock.client.publish).toHaveBeenCalledTimes(2);
});
