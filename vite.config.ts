import type { UserConfig } from "vite";

export default {
  build: {
    rollupOptions: {
      input: ["index.html", "userIframe.html"],
    },
  },
} satisfies UserConfig;
