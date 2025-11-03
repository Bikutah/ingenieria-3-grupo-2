from datetime import date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from . import models


class ComandaValidator:
    def __init__(self, db: Session):
        self.db = db
    
    def validar_mesa_existente(self, id_mesa: int):
        """Valida que la mesa exista"""
        # Nota: Este módulo no tiene acceso directo a los modelos de mesas
        # Por ahora, asumimos que la mesa existe si id_mesa > 0
        # En una implementación completa, se debería hacer una llamada a la API de mesas
        if id_mesa <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ID de mesa inválido: {id_mesa}"
            )
        return None  # No podemos devolver el objeto mesa desde aquí
    
    def validar_mozo_existente(self, id_mozo: int):
        """Valida que el mozo exista"""
        # Nota: Este módulo no tiene acceso directo a los modelos de mozos
        # Por ahora, asumimos que el mozo existe si id_mozo > 0
        # En una implementación completa, se debería hacer una llamada a la API de mozos
        if id_mozo <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ID de mozo inválido: {id_mozo}"
            )
        return None  # No podemos devolver el objeto mozo desde aquí
    
    def validar_creacion_comanda(self, payload):
        """Valida los datos necesarios para crear una comanda"""
        self.validar_mesa_existente(payload.id_mesa)
        self.validar_mozo_existente(payload.id_mozo)
    
    def validar_modificacion_comanda(self, id_comanda: int, payload):
        """Valida los datos necesarios para modificar una comanda"""
        comanda = self.db.get(models.Comanda, id_comanda)
        if comanda is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Comanda con ID {id_comanda} no encontrada"
            )
        self.validar_mesa_existente(payload.id_mesa)
        self.validar_mozo_existente(payload.id_mozo)