// Bundle for the Chrome extension: `npm run build:extension` → ../extension/lib/live-core.js
import { DelayedVideo, LiveRelay } from "./relay";

declare global {
  interface Window {
    LCV: { LiveRelay: typeof LiveRelay; DelayedVideo: typeof DelayedVideo };
  }
}

window.LCV = { LiveRelay, DelayedVideo };
