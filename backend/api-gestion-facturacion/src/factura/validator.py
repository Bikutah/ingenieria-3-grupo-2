import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from . import models, schemas

class FacturaValidator:
    def __init__(self, db: Session):
        self.db = db
        self.comanda_api_url = "http://gestion-comanda:8000"  

    async def validar_comanda_existe(self, id_comanda: int) -> dict:
        """Valida que la comanda existe llamando a la API de gestión-comanda"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.comanda_api_url}/comanda/{id_comanda}")
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 404:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Comanda con ID {id_comanda} no existe"
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Error al validar comanda con el servicio de gestión-comanda"
                    )
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
        # Validar que la comanda existe
        comanda_data = await self.validar_comanda_existe(payload.id_comanda)

        # Validar que no existe factura para esta comanda
        self.validar_no_factura_existente(payload.id_comanda)

        # Validar que los totales coincidan (si vienen calculados)
        total_calculado = self.calcular_totales(payload.detalles_factura)
        if abs(payload.total - total_calculado) > 0.01:  # Tolerancia para errores de redondeo
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El total calculado ({total_calculado}) no coincide con el total proporcionado ({payload.total})"
            )

        return comanda_data  # Retornar datos de la comanda para uso posterior