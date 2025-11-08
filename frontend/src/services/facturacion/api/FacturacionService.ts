// infrastructure/repositories/facturacionServiceHttp.ts
import { request } from "@/config/http/httpClient";
// Respeta el case real del archivo:
import { type Factura, type NuevaFactura, type MedioPago, type EstadoFactura } from "@/services/facturacion/types/Factura";

const DEFAULT_BASE = "/gestion-facturacion";
const ENTIDAD = "/factura/";

// Parámetros del listado (filtrado/paginación/orden)
export type FacturacionListParams = {
  q?: string;
  page?: number;
  size?: number;

  id?: number;
  id__neq?: number;
  id_comanda?: number;
  id_comanda__neq?: number;

  fecha_emision__gte?: string;
  fecha_emision__lte?: string;

  created_at__gte?: string;
  created_at__lte?: string;

  total__gte?: number;
  total__lte?: number;

  // Filtros múltiples
  medio_pago?: MedioPago[];       // ['debito','efectivo']
  estado?: EstadoFactura[];       // ['pendiente','pagada']

  order_by?: string;              // "-created_at" | "total" | etc.
};

export const facturacionService = {
  async pagar(id: number) {
    const res = await request<Factura>({ method: "PUT", url: `${ENTIDAD}${id}/pagar`, baseURL: DEFAULT_BASE });
    return res.data;
  },

  async cancelar(id: number) {
    const res = await request<Factura>({ method: "PUT", url: `${ENTIDAD}${id}/cancelar`, baseURL: DEFAULT_BASE });
    return res.data;
  },

  async anular(id: number) {
    const res = await request<Factura>({ method: "PUT", url: `${ENTIDAD}${id}/anular`, baseURL: DEFAULT_BASE });
    return res.data;
  },

  async list(params: FacturacionListParams = {}) {
    const res = await request<{
      items: Factura[];
      total: number;
      pages: number;
      size: number;
      page: number;
    }>({
      method: "GET",
      url: ENTIDAD,
      params,
      baseURL: DEFAULT_BASE,
    });

    return {
      items: res.data.items,
      total: res.data.total,
      page: res.data.page,
      pages: res.data.pages,
      size: res.data.size,
    };
  },

  async getById(id: number) {
    const res = await request<Factura>({ method: "GET", url: `${ENTIDAD}${id}`, baseURL: DEFAULT_BASE });
    return res.data;
  },

  async create(data: NuevaFactura) {
    const res = await request<Factura>({ method: "POST", url: ENTIDAD, data, baseURL: DEFAULT_BASE });
    return res.data;
  },

  async update(id: number, data: Partial<NuevaFactura>) {
    const res = await request<Factura>({ method: "PUT", url: `${ENTIDAD}${id}`, data, baseURL: DEFAULT_BASE });
    return res.data;
  },

  async remove(id: number) {
    await request({ method: "DELETE", url: `${ENTIDAD}${id}`, baseURL: DEFAULT_BASE });
  },
} as const;
