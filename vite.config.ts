import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ưu tiên .tsx trước .ts — tránh 404 khi chỉ còn file .tsx (không còn barrel .ts)
    extensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
})
