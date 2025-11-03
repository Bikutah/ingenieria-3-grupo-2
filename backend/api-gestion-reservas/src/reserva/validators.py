from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from datetime import time, date, datetime
from . import models


class ReservaValidator:
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

    def validar_cliente_existente(self, id_cliente: int):
        """Valida que el cliente exista"""
        # Nota: Este módulo no tiene acceso directo a los modelos de cliente
        # Por ahora, asumimos que el cliente existe si id_cliente > 0
        # En una implementación completa, se debería hacer una llamada a la API de clientes
        if id_cliente <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ID de cliente inválido: {id_cliente}"
            )
        return None  # No podemos devolver el objeto cliente desde aquí

    def validar_capacidad_mesa(self, id_mesa: int, cantidad_personas: int):
        """Valida que la mesa tenga capacidad para la cantidad de personas"""
        # Nota: Sin acceso directo a la base de datos de mesas, asumimos capacidad básica
        # En una implementación completa, se debería consultar la API de mesas
        if cantidad_personas <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cantidad de personas debe ser mayor a 0"
            )
        # Asumimos que las mesas tienen capacidad para al menos 10 personas
        if cantidad_personas > 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La cantidad máxima de personas por mesa es 10, pero se solicitaron {cantidad_personas}"
            )
    
    def validar_disponibilidad_mesa(
        self,
        id_mesa: int,
        fecha: date,
        horario: time,
        id_reserva_excluir: int = None
    ):
        """
        Valida que la mesa esté disponible en la fecha y horario especificados
        Excluye la reserva actual en caso de actualización
        """
        # Buscar reservas existentes para la misma mesa, misma fecha y horario similar
        query = self.db.query(models.Reserva).filter(
            models.Reserva.id_mesa == id_mesa,
            models.Reserva.fecha == fecha,
            models.Reserva.baja == False
        )

        # Excluir la reserva actual si estamos actualizando
        if id_reserva_excluir:
            query = query.filter(models.Reserva.id != id_reserva_excluir)

        reservas_existentes = query.all()

        # Validar superposición de horarios
        for reserva in reservas_existentes:
            # Calcular diferencia en minutos entre horarios
            diff_minutos = abs(
                (horario.hour * 60 + horario.minute) -
                (reserva.horario.hour * 60 + reserva.horario.minute)
            )

            # Considerar superposición si la diferencia es menor a 2 horas
            if diff_minutos < 120:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La mesa {id_mesa} ya está reservada para el {fecha} a las {reserva.horario}"
                )
    
    def validar_reserva_activa(self, id_reserva: int) -> models.Reserva:
        """Valida que la reserva exista y esté activa"""
        reserva = self.db.get(models.Reserva, id_reserva)
        if not reserva:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reserva no encontrada"
            )
        if reserva.baja:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La reserva está dada de baja"
            )
        return reserva
    
    def validar_creacion_reserva(self, payload):
        """Valida todos los aspectos para la creación de una reserva"""
        self.validar_cliente_existente(payload.id_cliente)
        self.validar_capacidad_mesa(payload.id_mesa, payload.cantidad_personas)
        self.validar_disponibilidad_mesa(payload.id_mesa, payload.fecha, payload.horario)
        # Validar que la fecha no sea en el pasado
        if payload.fecha < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pueden crear reservas para fechas pasadas"
            )
    
    def validar_actualizacion_reserva(self, id_reserva: int, payload):
        """Valida todos los aspectos para la actualización de una reserva"""
        reserva = self.validar_reserva_activa(id_reserva)

        update_data = payload.model_dump(exclude_unset=True)

        if 'id_cliente' in update_data:
            self.validar_cliente_existente(update_data['id_cliente'])

        if 'id_mesa' in update_data or 'fecha' in update_data or 'horario' in update_data:
            id_mesa = update_data.get('id_mesa', reserva.id_mesa)
            fecha = update_data.get('fecha', reserva.fecha)
            horario = update_data.get('horario', reserva.horario)

            # Validar que la fecha no sea en el pasado si se está cambiando
            if 'fecha' in update_data and fecha < date.today():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se pueden actualizar reservas para fechas pasadas"
                )

            self.validar_disponibilidad_mesa(id_mesa, fecha, horario, id_reserva_excluir=id_reserva)

        if 'cantidad_personas' in update_data and 'id_mesa' in update_data:
            self.validar_capacidad_mesa(update_data['id_mesa'], update_data['cantidad_personas'])
        elif 'cantidad_personas' in update_data:
            self.validar_capacidad_mesa(reserva.id_mesa, update_data['cantidad_personas'])

        return reserva