// config/http/httpClient.ts
import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
// Si tenés "esModuleInterop": true en tsconfig:
import qs from "qs";
// Si NO tenés esModuleInterop, usá:
// import * as qs from "qs";

// Limpia null/undefined y arrays vacíos de params (evita mandar basura)
function pruneParams<T extends Record<string, any>>(obj?: T): T | undefined {
  if (!obj) return obj;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;  // no mandes &estado=
      out[k] = v;
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

// Creamos una instancia para centralizar config
const http: AxiosInstance = axios.create({
  timeout: 15000,
  // Si cada request define su baseURL, no seteamos uno global acá
  paramsSerializer: {
    serialize: (params) =>
      qs.stringify(pruneParams(params), {
        arrayFormat: "repeat", // => ?estado=pendiente&estado=pagada
        skipNulls: true,
      }),
  },
});

export function request<T = unknown>(config: AxiosRequestConfig) {
  const { baseURL, timeout = 15000, params, ...rest } = config;
  return http.request<T>({
    baseURL,
    timeout,
    params: pruneParams(params),
    ...rest,
  });
}
