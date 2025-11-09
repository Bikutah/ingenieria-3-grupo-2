// services/facturacion/types/factura.ts
export const MEDIOS_PAGO = ['transferencia','debito','credito','efectivo'] as const;
export type MedioPago = typeof MEDIOS_PAGO[number];

export const ESTADOS_FACTURA = ['pendiente','pagada','cancelada','anulada'] as const;
export type EstadoFactura = typeof ESTADOS_FACTURA[number];

export type Factura = {
  id: number;              
  id_comanda: number;
  total: number;          
  medio_pago: MedioPago;
  estado: EstadoFactura;
  detalles_factura?: string | null;
};

export type NuevaFactura = Omit<Factura, 'id'>;

export type CreateFactura = {
  id_comanda: number;
  medio_pago: MedioPago;
};