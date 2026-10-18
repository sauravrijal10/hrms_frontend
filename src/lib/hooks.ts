"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False during the server render and hydration, true afterwards. Use for locale/time-dependent text. */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
