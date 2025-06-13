import type { UserConfig } from "vite";

export default {
  base: "/beardeer",
  build: {
    rollupOptions: {
      input: ["index.html", "userIframe.html"],
    },
  },
} satisfies UserConfig;
