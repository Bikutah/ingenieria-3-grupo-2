from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import Date
from datetime import datetime
from . import models


class ReservaValidator:
    def __init__(self, db: Session):
        self.db = db
    
    
    def validar_capacidad_mesa(self, id_mesa: int, cantidad_personas: int):
        """Valida que la mesa tenga capacidad para la cantidad de personas"""
        mesa = self.validar_mesa_existente(id_mesa)
        if cantidad_personas > mesa.cantidad:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La mesa {id_mesa} tiene capacidad para {mesa.cantidad} personas, pero se solicitaron {cantidad_personas}"
            )
    
    def validar_disponibilidad_mesa(
        self, 
        id_mesa: int, 
        fecha: datetime, 
        horario: str,
        id_reserva_excluir: int = None
    ):
        """
        Valida que la mesa esté disponible en la fecha y horario especificados
        Excluye la reserva actual en caso de actualización
        """
        # Convertir horario string a tiempo
        try:
            hora_reserva = datetime.strptime(horario, "%H:%M").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de horario inválido. Use HH:MM"
            )
        
        # Obtener la fecha sin la hora
        fecha_reserva = fecha.date()
        
        # Buscar reservas existentes para la misma mesa, misma fecha y horario similar
        query = self.db.query(models.Reserva).filter(
            models.Reserva.id_mesa == id_mesa,
            models.Reserva.fecha.cast(Date) == fecha_reserva,
            models.Reserva.baja == False
        )
        
        # Excluir la reserva actual si estamos actualizando
        if id_reserva_excluir:
            query = query.filter(models.Reserva.id != id_reserva_excluir)
        
        reservas_existentes = query.all()
        
        # Validar superposición de horarios
        for reserva in reservas_existentes:
            try:
                hora_existente = datetime.strptime(reserva.horario, "%H:%M").time()
            except ValueError:
                continue
            
            # Calcular diferencia en minutos entre horarios
            diff_minutos = abs(
                (hora_reserva.hour * 60 + hora_reserva.minute) - 
                (hora_existente.hour * 60 + hora_existente.minute)
            )
            
            # Considerar superposición si la diferencia es menor a 2 horas
            if diff_minutos < 120:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La mesa {id_mesa} ya está reservada para el {fecha_reserva} a las {reserva.horario}"
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
            
            self.validar_disponibilidad_mesa(id_mesa, fecha, horario, id_reserva_excluir=id_reserva)
        
        if 'cantidad_personas' in update_data and 'id_mesa' in update_data:
            self.validar_capacidad_mesa(update_data['id_mesa'], update_data['cantidad_personas'])
        elif 'cantidad_personas' in update_data:
            self.validar_capacidad_mesa(reserva.id_mesa, update_data['cantidad_personas'])
        
        return reserva