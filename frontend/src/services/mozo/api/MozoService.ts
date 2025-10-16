// infrastructure/repositories/MozoServiceHttp.ts
import { request } from "@/config/http/httpClient";
import { type Mozo } from "@/services/mozo/types/Mozo";

const DEFAULT_BASE = "/mozo-y-cliente";

export const mozoService = {
  async list(params: { q?: string; page?: number; size?: number; activo?: boolean }) {
    const res = await request<{ items: Mozo[]; total?: number }>({
      method: "GET",
      url: "/mozo/",
      params,
      baseURL: DEFAULT_BASE,
    });
    return { items: res.data.items, total: res.data.total ?? res.data.items.length };
  },

  async getById(id: number) {
    const res = await request<Mozo>({
      method: "GET",
      url: `/mozo/${id}`,
      baseURL: DEFAULT_BASE,
    });
    return res.data;
  },

  async create(data: Omit<Mozo, "id">) {
    const res = await request<Mozo>({
      method: "POST",
      url: "/mozo/",
      data,
      baseURL: DEFAULT_BASE,
    });
    return res.data;
  },

  async update(id: number, data: Partial<Omit<Mozo, "id">>) {
    const res = await request<Mozo>({
      method: "PUT",
      url: `/mozo/${id}`,
      data,
      baseURL: DEFAULT_BASE,
    });
    return res.data;
  },

  async remove(id: number) {
    await request({
      method: "DELETE",
      url: `/mozo/${id}`,
      baseURL: DEFAULT_BASE,
    });
  },
} as const;
