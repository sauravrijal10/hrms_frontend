"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

let cachedZones: string[] | undefined;
function browserZones(): string[] {
  cachedZones ??= "supportedValuesOf" in Intl ? Intl.supportedValuesOf("timeZone") : ["UTC"];
  return cachedZones;
}
const SERVER_ZONES = ["UTC"];

/**
 * IANA timezones known to the browser, plus the browser's own zone. The server render uses UTC
 * so the first client render matches it, then switches to the real values without a hydration error.
 */
export function useTimezones(): { zones: string[]; detected: string } {
  const zones = useSyncExternalStore(subscribe, browserZones, () => SERVER_ZONES);
  const detected = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    () => "UTC",
  );
  return { zones, detected };
}

/** Ensures the current value is selectable even if the browser doesn't list it (e.g. "UTC"). */
export function withZone(zones: string[], value: string): string[] {
  return value && !zones.includes(value) ? [value, ...zones] : zones;
}
