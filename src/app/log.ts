// A timeline the Playwright specs read back: every request start and end, and the
// router events that matter, each with performance.now() in milliseconds.
export interface LogEntry {
  t: number;
  what: string;
}

declare global {
  interface Window {
    __log: LogEntry[];
  }
}

window.__log = [];

export function log(what: string): void {
  window.__log.push({ t: Math.round(performance.now()), what });
}
