import { request } from "@/config/http/httpClient";
import { type Cliente } from "@/services/cliente/types/Cliente";

const DEFAULT_BASE = "/mozo-y-cliente";

export const clienteService = {
  
  async list(params: { q?: string; page?: number; size?: number; id?: number, id__neq?: number, nombre__ilike?: string, apellido__ilike?: string, dni__ilike?: string, baja?: boolean, order_by?: string }) {
    const res = await request<{ items: Cliente[]; total: number; pages: number; size: number; page: number }>({
      method: "GET",
      url: "/cliente/",
      params,
      baseURL: DEFAULT_BASE,
    });
    return { items: res.data.items, total: res.data.total, page: res.data.page, pages: res.data.pages, size: res.data.size };
  },

  async getById(id: number) {
    const res = await request<Cliente>({
      method: "GET",
      url: `/cliente/${id}`,
      baseURL: DEFAULT_BASE,
    });
    return res.data;
  },

  async create(data: Omit<Cliente, "id">) {
    const res = await request<Cliente>({
      method: "POST",
      url: "/cliente/",
      data,
      baseURL: DEFAULT_BASE,
    });
    return res.data;
  },

  async update(id: number, data: Partial<Omit<Cliente, "id">>) {
    const res = await request<Cliente>({
      method: "PUT",
      url: `/cliente/${id}`,
      data,
      baseURL: DEFAULT_BASE,
    });
    return res.data;
  },

  async remove(id: number) {
    await request({
      method: "DELETE",
      url: `/cliente/${id}`,
      baseURL: DEFAULT_BASE,
    });
  },
} as const;
