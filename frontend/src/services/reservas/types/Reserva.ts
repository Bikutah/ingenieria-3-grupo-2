import { type MenuReserva } from "./MenuReserva";

export type Reserva = {
  id: number;
  fecha: string;
  horario: string;
  cantidad_personas: string;
  id_mesa: number;
  id_cliente: number;
  baja: boolean;
  menu_reserva: MenuReserva[]
};

export type ReservasListParams = {
  q?: string;
  page?: number;
  size?: number;

  id?: number;
  id__neq?: number;
  order_by?: string[]; // ej: ["-id","nombre"]
};
