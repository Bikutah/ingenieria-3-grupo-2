// src/lib/api-error.ts
import type { AxiosError } from "axios"

export function extractApiErrorMessage(err: unknown): string {
  const ax = err as AxiosError<any>
  const data = ax?.response?.data

  if (!data) {
    // sin respuesta del server -> problema de red / CORS / timeout
    const status = ax?.code || ax?.message || "Error de red"
    return typeof status === "string" ? status : "Ocurrió un error inesperado."
  }

  // FastAPI: detail como string
  if (typeof data.detail === "string") return data.detail

  // FastAPI/Pydantic: detail como array
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((d: any) => {
        const loc = Array.isArray(d?.loc) ? d.loc.join(".") : d?.loc
        const msg = d?.msg ?? "Error"
        return loc ? `${loc}: ${msg}` : msg
      })
      .join(" | ")
  }

  // Otros formatos conocidos
  if (typeof data.message === "string") return data.message

  try { return JSON.stringify(data) } catch { return "Error al procesar la respuesta." }
}
