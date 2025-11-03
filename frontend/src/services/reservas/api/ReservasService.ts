import { request } from "@/config/http/httpClient";
import { type Reserva } from "@/services/reservas/types/Reserva";
import { type ReservasListParams } from "@/services/reservas/types/Reserva";

const DEFAULT_BASE = "/gestion-reservas";
const ENTIDAD = "/reserva/"
export const reservasService = {

    async list(params: ReservasListParams = {}) {
        const res = await request<{ items: Reserva[]; total: number; pages: number; size: number; page: number }>({
            method: "GET",
            url: ENTIDAD,
            params,
            baseURL: DEFAULT_BASE,
        });
        return { items: res.data.items, total: res.data.total, page: res.data.page, pages: res.data.pages, size: res.data.size };
    },

    async getById(id: number) {
        const res = await request<Reserva>({
            method: "GET",
            url: ENTIDAD + id,
            baseURL: DEFAULT_BASE,
        });
        return res.data;
    },

    async create(data: Omit<Reserva, "id">) {
        const res = await request<Reserva>({
            method: "POST",
            url: ENTIDAD,
            data,
            baseURL: DEFAULT_BASE,
        });
        return res.data;
    },

    async update(id: number, data: Partial<Omit<Reserva, "id">>) {
        const res = await request<Reserva>({
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
