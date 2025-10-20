// infrastructure/repositories/MozoServiceHttp.ts
import { request } from "@/config/http/httpClient";
import { type Mesas } from "@/services/mesas/types/Mesas";

const DEFAULT_BASE = "/gestion-mesas";
const ENTIDAD = "/mesas/"

export type MesasListParams = {
  q?: string;
  page?: number;
  size?: number;

  id?: number;
  id__neq?: number;
  numero__ilike?: string;
  tipo__ilike?: string;
  cantidad__gte?: number;
  cantidad__lte?: number;
  id_sector?: number;
  baja?: boolean;
  created_at__gte?: string;
  created_at__lte?: string; 
  order_by?: string[];     
};

export const mesasService = {

    async list(params: MesasListParams = {}) {
        const res = await request<{ items: Mesas[]; total: number; pages: number; size: number; page: number }>({
            method: "GET",
            url: ENTIDAD,
            params,
            baseURL: DEFAULT_BASE,
        });
        return { items: res.data.items, total: res.data.total, page: res.data.page, pages: res.data.pages, size: res.data.size };
    },

    async getById(id: number) {
        const res = await request<Mesas>({
            method: "GET",
            url: ENTIDAD + id,
            baseURL: DEFAULT_BASE,
        });
        return res.data;
    },

    async create(data: Omit<Mesas, "id">) {
        const res = await request<Mesas>({
            method: "POST",
            url: ENTIDAD,
            data,
            baseURL: DEFAULT_BASE,
        });
        return res.data;
    },

    async update(id: number, data: Partial<Omit<Mesas, "id">>) {
        const res = await request<Mesas>({
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
