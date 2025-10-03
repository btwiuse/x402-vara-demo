import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const PORT = process.env.PORT || '3001';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL || `http://localhost:${PORT}`,
      },
    },
  },
});
