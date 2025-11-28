import { type DetalleComanda } from "@/services/comandas/types/DetalleComanda";

export const ESTADOS_COMANDA = ['pendiente','pagada','cancelada','anulada'] as const;
export type EstadoComanda = typeof ESTADOS_COMANDA[number];

export type Comanda = {
  id: number
  id_mesa: number
  id_mozo: number
  id_reserva?: number | null
  fecha: string
  estado: EstadoComanda
  detalles_comanda: DetalleComanda[]
}

export type ComandasListParams = {
  q?: string;
  page?: number;
  size?: number;

  id?: number;
  id__neq?: number;
  order_by?: string[]; // ej: ["-id","nombre"]
};
