// infrastructure/repositories/MozoServiceHttp.ts
import { request } from "@/config/http/httpClient";
import { type Sectores } from "@/services/sectores/types/Sectores";

const DEFAULT_BASE = "/gestion-mesas";
const ENTIDAD = "/sectores/"

export type SectoresListParams = {
  q?: string;
  page?: number;
  size?: number;

  id?: number;
  id__neq?: number;
  nombre__ilike?: string;
  numero__ilike?: string;
  baja?: boolean;
  created_at__gte?: string;
  created_at__lte?: string;
  order_by?: string[]; // ej: ["-id","nombre"]
};

export const sectoresService = {

    async list(params: SectoresListParams = {}) {
        const res = await request<{ items: Sectores[]; total: number; pages: number; size: number; page: number }>({
            method: "GET",
            url: ENTIDAD,
            params,
            baseURL: DEFAULT_BASE,
        });
        return { items: res.data.items, total: res.data.total, page: res.data.page, pages: res.data.pages, size: res.data.size };
    },

    async getById(id: number) {
        const res = await request<Sectores>({
            method: "GET",
            url: ENTIDAD + id,
            baseURL: DEFAULT_BASE,
        });
        return res.data;
    },

    async create(data: Omit<Sectores, "id">) {
        const res = await request<Sectores>({
            method: "POST",
            url: ENTIDAD,
            data,
            baseURL: DEFAULT_BASE,
        });
        return res.data;
    },

    async update(id: number, data: Partial<Omit<Sectores, "id">>) {
        const res = await request<Sectores>({
            method: "PUT",
            url: ENTIDAD + id,
            data,
            baseURL: DEFAULT_BASE,
        });
        return res.data;
    },

    async remove(id: number) {
        await request({
            method: "DELETE",
            url: ENTIDAD + id,
            baseURL: DEFAULT_BASE,
        });
    },
} as const;
