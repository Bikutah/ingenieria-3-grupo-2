import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from . import models, schemas

class FacturaValidator:
    def __init__(self, db: Session):
        self.db = db
        self.comanda_api_url = "http://gestion-comanda:8000"
        self.reserva_api_url = "http://gestion-reservas:8000"

    async def obtener_datos_comanda(self, id_comanda: int) -> dict:
        """Obtiene los datos completos de la comanda desde la API de gestión-comanda"""
        try:
            async with httpx.AsyncClient() as client:
                # Obtener datos de la comanda
                response_comanda = await client.get(f"{self.comanda_api_url}/comanda/{id_comanda}")
                if response_comanda.status_code != 200:
                    if response_comanda.status_code == 404:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Comanda con ID {id_comanda} no existe"
                        )
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Error al obtener datos de comanda"
                        )

                # Obtener detalles de la comanda
                response_detalles = await client.get(f"{self.comanda_api_url}/comanda/{id_comanda}/detalles")
                if response_detalles.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Error al obtener detalles de comanda"
                    )

                comanda_data = response_comanda.json()
                detalles_data = response_detalles.json()

                return {
                    "comanda": comanda_data,
                    "detalles": detalles_data["items"]  # Extraer items de la paginación
                }

        except httpx.RequestError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo conectar al servicio de gestión-comanda"
            )

    async def validar_seña_reserva_pagada(self, id_reserva: int):
        """Valida que si la comanda tiene reserva, la seña esté pagada"""
        if not id_reserva:
            return  # No hay reserva, validación pasa

        try:
            async with httpx.AsyncClient() as client:
                # Obtener datos de la reserva
                response = await client.get(f"{self.reserva_api_url}/reserva/{id_reserva}")
                if response.status_code == 404:
                    # Reserva no existe, pero no es error crítico para facturación
                    return
                elif response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Error al consultar reserva"
                    )

                reserva_data = response.json()

                # Verificar si tiene menú reserva con seña pagada
                menu_reserva = reserva_data.get("menu_reserva")
                if menu_reserva and menu_reserva.get("monto_seña"):
                    if not menu_reserva.get("seña_pagada", False):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"La reserva {id_reserva} tiene una seña pendiente de pago. No se puede facturar hasta que la seña sea pagada."
                        )

        except httpx.RequestError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo conectar al servicio de gestión-reservas"
            )

    def validar_no_factura_existente(self, id_comanda: int):
        """Valida que no existe una factura para esta comanda"""
        factura_existente = self.db.query(models.Factura).filter(
            models.Factura.id_comanda == id_comanda,
            models.Factura.estado != models.EstadoFactura.anulada
        ).first()

        if factura_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una factura activa para la comanda {id_comanda}"
            )

    def validar_transicion_estado(self, factura: models.Factura, nuevo_estado: models.EstadoFactura):
        """Valida que la transición de estado sea válida"""
        transiciones_validas = {
            models.EstadoFactura.pendiente: [models.EstadoFactura.pagada, models.EstadoFactura.cancelada, models.EstadoFactura.anulada],
            models.EstadoFactura.pagada: [models.EstadoFactura.anulada],  # Solo se puede anular una pagada
            models.EstadoFactura.cancelada: [models.EstadoFactura.anulada],  # Solo se puede anular una cancelada
            models.EstadoFactura.anulada: []  # No se puede cambiar de anulada
        }

        if nuevo_estado not in transiciones_validas.get(factura.estado, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede cambiar el estado de '{factura.estado.value}' a '{nuevo_estado.value}'"
            )

    def calcular_totales(self, detalles_factura: list[schemas.DetalleFacturaCreate]) -> float:
        """Calcula el total de la factura a partir de los detalles"""
        return sum(detalle.subtotal for detalle in detalles_factura)

    async def validar_creacion_factura(self, payload: schemas.FacturaCreate):
        """Valida todos los requisitos para crear una factura"""
        # Validar que la comanda existe y obtener sus datos
        datos_comanda = await self.obtener_datos_comanda(payload.id_comanda)

        # Validar que no existe factura para esta comanda
        self.validar_no_factura_existente(payload.id_comanda)

        return datos_comanda  # Retornar datos completos de la comanda

    def crear_detalles_factura_desde_comanda(self, detalles_comanda: list) -> list[schemas.DetalleFacturaCreate]:
        """Convierte los detalles de comanda en detalles de factura"""
        detalles_factura = []
        for detalle in detalles_comanda:
            detalles_factura.append(schemas.DetalleFacturaCreate(
                id_producto=detalle["id_producto"],
                cantidad=detalle["cantidad"],
                precio_unitario=detalle["precio_unitario"],
                subtotal=detalle["cantidad"] * detalle["precio_unitario"]
            ))
        return detalles_factura

    async def calcular_total_con_descuento_seña(self, detalles_comanda: list, id_reserva: int = None) -> float:
        """Calcula el total de la factura aplicando descuento por seña pagada si corresponde"""
        if not detalles_comanda:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede crear factura para una comanda sin detalles"
            )

        # Calcular total base de la comanda
        total_base = sum(detalle["cantidad"] * detalle["precio_unitario"] for detalle in detalles_comanda)

        # Si hay reserva, verificar si aplica descuento por seña
        if id_reserva:
            try:
                descuento_seña = await self.obtener_descuento_seña(id_reserva)
                total_base -= descuento_seña
            except Exception:
                # Si hay error obteniendo info de seña, continuar sin descuento
                pass

        return max(0, total_base)  # Asegurar que no sea negativo

    async def obtener_descuento_seña(self, id_reserva: int) -> float:
        """Obtiene el monto de descuento por seña pagada (monto_seña > 0)"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.reserva_api_url}/reserva/{id_reserva}")
                if response.status_code == 200:
                    reserva_data = response.json()
                    menu_reserva = reserva_data.get("menu_reserva")

                    # Si tiene menú reserva con monto_seña > 0, devolver el monto como descuento
                    if menu_reserva and menu_reserva.get("monto_seña") and menu_reserva["monto_seña"] > 0:
                        return float(menu_reserva["monto_seña"])

                # Si no hay seña pagada (monto_seña <= 0) o hay error, no aplicar descuento
                return 0.0

        except Exception:
            # En caso de error de conexión o cualquier otro, no aplicar descuento
            return 0.0