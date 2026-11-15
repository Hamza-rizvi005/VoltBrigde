import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoreProvider, useStore } from "./store";
import { api } from "./api";
vi.mock("./api", () => ({ api: vi.fn() }));
const request = vi.mocked(api);
const home = { userName: "Saved home", system: { panelKw: 3, sunHours: 5, batteryKwh: 5, minChargePct: 20, chargePct: 80, inverterKw: 3 }, appliances: [], cuts: [], events: [], setupDone: true };
const envelope = { user: { id: "owner", email: "owner@example.com" }, state: home, revision: 4 };
afterEach(() => { cleanup(); vi.resetAllMocks(); localStorage.clear(); });
describe("household persistence", () => {
  it("restores the signed-in home instead of browser demo data and sends revision on save", async () => {
    localStorage.setItem("voltbridge-demo", JSON.stringify({ userName: "Demo only" }));
    request.mockResolvedValueOnce(envelope);
    const { result } = renderHook(() => useStore(), { wrapper: StoreProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state.userName).toBe("Saved home");
    request.mockResolvedValueOnce({ ...envelope, state: { ...home, userName: "Changed" }, revision: 5 });
    await act(async () => { expect(await result.current.update({ userName: "Changed" })).toBe(true); });
    expect(request).toHaveBeenLastCalledWith("/home", "PATCH", { revision: 4, changes: { userName: "Changed" } });
    expect(result.current.revision).toBe(5);
    expect(localStorage.getItem("voltbridge-demo")).toContain("Demo only");
  });
  it("failed saves retain confirmed data and expose an actionable error", async () => {
    request.mockResolvedValueOnce(envelope);
    const { result } = renderHook(() => useStore(), { wrapper: StoreProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    request.mockRejectedValueOnce(new Error("Your home changed in another tab."));
    await act(async () => { expect(await result.current.update({ userName: "Unsaved" })).toBe(false); });
    expect(result.current.state.userName).toBe("Saved home");
    expect(result.current.error).toContain("another tab");
    expect(result.current.saving).toBe(false);
  });
  it("sign out clears private household state and returns to separate demo mode", async () => {
    request.mockResolvedValueOnce(envelope);
    const { result } = renderHook(() => useStore(), { wrapper: StoreProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    request.mockResolvedValueOnce({ ok: true });
    await act(async () => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(result.current.state.userName).toBe("Demo household");
    expect(result.current.revision).toBe(0);
  });
});
