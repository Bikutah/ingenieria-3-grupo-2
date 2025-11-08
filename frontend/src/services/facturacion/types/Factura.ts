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
  /**
   * TODO: cuando el back deje de esperarlo “vacío”, tipar bien este campo.
   * De momento lo dejamos opcional para no romper create/update.
   */
  detalles_factura?: string | null;
};

export type NuevaFactura = Omit<Factura, 'id'>;
