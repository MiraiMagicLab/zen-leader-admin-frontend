import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import "@/services/http-client" // register interceptors
import App from "./App.tsx"
import { ThemeProvider } from "@/providers/theme-provider.tsx"

import { QueryProvider } from "@/providers/query-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryProvider>
  </StrictMode>
)
