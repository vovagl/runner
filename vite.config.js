import { defineConfig } from "vite";

export default defineConfig({
  base: "/runner/",
  server: {
    hmr: {
      overlay: false
    }
  }
});
