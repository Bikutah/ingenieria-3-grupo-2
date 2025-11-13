import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from . import models, schemas

class FacturaValidator:
    def __init__(self, db: Session):
        self.db = db
        self.comanda_api_url = "http://gestion-comanda:8000"  

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

    def calcular_total_desde_comanda(self, detalles_comanda: list) -> float:
        """Calcula el total de la factura desde los detalles de la comanda"""
        if not detalles_comanda:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede crear factura para una comanda sin detalles"
            )
        return sum(detalle["cantidad"] * detalle["precio_unitario"] for detalle in detalles_comanda)