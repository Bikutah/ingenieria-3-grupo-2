from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from .mozo.models import Mozo

def insert_mozos():
    db = SessionLocal()
    
    try:
        mozos_data = [
            {
                "nombre": "Max",
                "apellido": "Verstappen",
                "dni": "33331234",
                "direccion": "Hasselt, Bélgica",
                "telefono": "+32 11 123456"
            },
            {
                "nombre": "Juan Manuel",
                "apellido": "Fangio",
                "dni": "11115678",
                "direccion": "Balcarce, Buenos Aires",
                "telefono": "+54 9 2266 123456"
            },
            {
                "nombre": "Carlos",
                "apellido": "Reutemann",
                "dni": "12129012",
                "direccion": "Santa Fe, Argentina",
                "telefono": "+54 9 342 456789"
            },
            {
                "nombre": "Lewis",
                "apellido": "Hamilton",
                "dni": "44443456",
                "direccion": "Stevenage, Inglaterra",
                "telefono": "+44 20 7123 4567"
            },
            {
                "nombre": "Ayrton",
                "apellido": "Senna",
                "dni": "12127890",
                "direccion": "São Paulo, Brasil",
                "telefono": "+55 11 98765 4321"
            }
        ]
        
        for mozo_data in mozos_data:
            mozo = Mozo(**mozo_data)
            db.add(mozo)
            print(f"✓ Insertando: {mozo_data['nombre']} {mozo_data['apellido']}")
        
        db.commit()
        print("\n✅ Se insertaron 5 mozos correctamente")
        
        print("\n📋 Mozos en la base de datos:")
        mozos = db.query(Mozo).all()
        for mozo in mozos:
            print(f"  - {mozo.nombre} {mozo.apellido} | Legajo: {mozo.legajo} | DNI: {mozo.dni}")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Insertando mozos...\n")
    insert_mozos()