import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, ".", "");

  return {
    base: command === "build" ? env.VITE_BASE_PATH || "/" : "/",
    plugins: [react()],
  };
});
