// What the app (src/app/log.ts) and the specs put on window.
interface Window {
  __log: { t: number; what: string }[];
  __shown: number | null;
}
