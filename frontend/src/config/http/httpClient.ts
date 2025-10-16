// config/http/httpClient.ts
import axios, { type AxiosRequestConfig } from "axios";

export function request<T = unknown>(
  config: AxiosRequestConfig
) {
  const { baseURL, timeout = 15000, ...rest } = config;
  return axios.request<T>({ baseURL, timeout, ...rest });
}
