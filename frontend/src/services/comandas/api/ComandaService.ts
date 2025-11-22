import { request } from "@/config/http/httpClient";
import { type Comanda } from "@/services/comandas/types/Comanda";
import { type ComandasListParams } from "@/services/comandas/types/Comanda";

const DEFAULT_BASE = "/gestion-comanda";
const ENTIDAD = "/comanda/"
export const comandasService = {

    async list(params: ComandasListParams = {}) {
        const res = await request<{ items: Comanda[]; total: number; pages: number; size: number; page: number }>({
            method: "GET",
            url: ENTIDAD,
            params,
            baseURL: DEFAULT_BASE,
        });
        return { items: res.data.items, total: res.data.total, page: res.data.page, pages: res.data.pages, size: res.data.size };
    },

    async getById(id: number) {
        const res = await request<Comanda>({
            method: "GET",
            url: ENTIDAD + id,
            baseURL: DEFAULT_BASE,
        });
        return res.data;
    },

    async create(data: Omit<Comanda, "id">) {
        const res = await request<Comanda>({
            method: "POST",
            url: ENTIDAD,
            data,
            baseURL: DEFAULT_BASE,
        });
        return res.data;
    },

    async update(id: number, data: Partial<Omit<Comanda, "id">>) {
        const res = await request<Comanda>({
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
