import { request } from "@/config/http/httpClient";
import { type Carta } from "@/services/carta/types/Carta";

const DEFAULT_BASE = "/gestion-productos";

export const cartaService = {
  
  async list(params: { q?: string; page?: number; size?: number; id?: number, nombre__ilike?: string, baja?: boolean, order_by?: string }) {
    const res = await request<{ items: Carta[]; total: number; pages: number; size: number; page: number }>({
      method: "GET",
      url: "/carta/",
      params,
      baseURL: DEFAULT_BASE,
    });
    console.log("Respuesta_", res.data);
    return { items: res.data.items, total: res.data.total, page: res.data.page, pages: res.data.pages, size: res.data.size };
  },

  async getById(id: number) {
    const res = await request<Carta>({
      method: "GET",
      url: `/carta/${id}`,
      baseURL: DEFAULT_BASE,
    });
    return res.data;
  },

  async create(data: Omit<Carta, "id">) {
    const res = await request<Carta>({
      method: "POST",
      url: "/carta/",
      data,
      baseURL: DEFAULT_BASE,
    });
    return res.data;
  },

  async update(id: number, data: Partial<Omit<Carta, "id">>) {
    const res = await request<Carta>({
      method: "PUT",
      url: `/carta/${id}`,
      data,
      baseURL: DEFAULT_BASE,
    });
    return res.data;
  },

  async remove(id: number) {
    await request({
      method: "DELETE",
      url: `/carta/${id}`,
      baseURL: DEFAULT_BASE,
    });
  },
} as const;

