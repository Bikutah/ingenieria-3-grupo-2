import { request } from "@/config/http/httpClient";
import { type Producto } from "@/services/producto/types/Producto";

const DEFAULT_BASE = "/gestion-productos";

export const productoService = {
  
  async list(params: { q?: string; page?: number; size?: number; id?: number, tipo?: string, nombre__ilike?: string, precio__gte?: number, precio__lte?: number, baja?: boolean, order_by?: string }) {
    const res = await request<{ items: Producto[]; total: number; pages: number; size: number; page: number }>({
      method: "GET",
      url: "/productos/",
      params,
      baseURL: DEFAULT_BASE,
    });
    console.log("Respuesta_", res.data);
    return { items: res.data.items, total: res.data.total, page: res.data.page, pages: res.data.pages, size: res.data.size };
  },

  async getById(id: number) {
    const res = await request<Producto>({
      method: "GET",
      url: `/productos/${id}`,
      baseURL: DEFAULT_BASE,
    });
    return res.data;
  },

  async create(data: Omit<Producto, "id">) {
    const res = await request<Producto>({
      method: "POST",
      url: "/productos/",
      data,
      baseURL: DEFAULT_BASE,
    });
    return res.data;
  },

  async update(id: number, data: Partial<Omit<Producto, "id">>) {
    const res = await request<Producto>({
      method: "PUT",
      url: `/productos/${id}`,
      data,
      baseURL: DEFAULT_BASE,
    });
    return res.data;
  },

  async remove(id: number) {
    await request({
      method: "DELETE",
      url: `/productos/${id}`,
      baseURL: DEFAULT_BASE,
    });
  },
} as const;

