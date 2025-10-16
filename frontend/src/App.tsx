import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

interface Mozo {
  id: number;
  nombre: string;
}

interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}


function App() {
  const [mozos, setMozos] = useState<Mozo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMozos = async () => {
      try {
        const url = `/mozo-y-cliente/mozo/`;
        const { data } = await axios.get<Page<Mozo>>(url);
        setMozos(data.items);              // 👈 tomar items
      } catch (err) {
        setError(axios.isAxiosError(err) ? err.message : 'Error al cargar los mozos');
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
              <th>Nombre</th>
            </tr>
          </thead>
          <tbody>
            {mozos.map(mozo => (
              <tr key={mozo.id}>
                <td>{mozo.id}</td>
                <td>{mozo.nombre}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;