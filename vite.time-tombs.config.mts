import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  build: {
    outDir: "dist/time-tombs",
    emptyOutDir: true,
    sourcemap: true,
    target: "es2022",
    lib: {
      entry: fileURLToPath(new URL("./src/time-tombs/main.ts", import.meta.url)),
      formats: ["iife"],
      name: "TimeTombsRuntime",
      fileName: () => "time-tombs.js"
    },
    rollupOptions: { output: { codeSplitting: false } }
  }
});
