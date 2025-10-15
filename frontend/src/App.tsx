import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

interface Mozo {
  id: number;
  legajo: string;
  dni: string;
  nombre: string;
  apellido: string;
  direccion: string | null;
  telefono: string | null;
  baja: boolean;
}

function App() {
  const [mozos, setMozos] = useState<Mozo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMozos = async () => {
      try {
        const response = await axios.get<Mozo[]>('http://localhost:8001/mozo/');
        setMozos(response.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.message);
        } else {
          setError('Error al cargar los mozos');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMozos();
  }, []);

  if (loading) {
    return <div className="container">Cargando mozos...</div>;
  }

  if (error) {
    return <div className="container error">Error: {error}</div>;
  }

  return (
    <div className="container">
      <h1>Lista de Mozitos</h1>
      
      {mozos.length === 0 ? (
        <p>No hay mozos registrados</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Legajo</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>DNI</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {mozos.map(mozo => (
              <tr key={mozo.id}>
                <td>{mozo.id}</td>
                <td>{mozo.legajo}</td>
                <td>{mozo.nombre}</td>
                <td>{mozo.apellido}</td>
                <td>{mozo.dni}</td>
                <td>{mozo.telefono || '-'}</td>
                <td>{mozo.direccion || '-'}</td>
                <td>
                  <span className={mozo.baja ? 'badge-inactive' : 'badge-active'}>
                    {mozo.baja ? 'Inactivo' : 'Activo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;