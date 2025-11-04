import { type DetalleComanda } from "@/services/comandas/types/DetalleComanda";

export type Comanda = {
  id?: number
  id_mesa: number
  id_mozo: number
  id_reserva?: number | null
  fecha: string
  baja: boolean
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
