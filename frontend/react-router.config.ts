import type { Config } from "@react-router/dev/config";

export default {
  // The frontend fetches data in the browser; Vercel serves the built SPA.
  ssr: false,
} satisfies Config;
