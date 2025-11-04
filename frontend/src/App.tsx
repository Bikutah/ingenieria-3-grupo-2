import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MozosPage from './pages/mozo/MozoPage';
import { Layout } from './pages/layout/Layout';
import HomePage from './pages/home/HomePage';
import ClientePage from './pages/cliente/ClientePage';
import ProductoPage from './pages/producto/ProductoPage';
import MesasPage from './pages/mesas/MesasPage';
import SectoresPage from './pages/sectores/SectoresPage';
import ReservasPage from './pages/reservas/ReservasPage';
import { Toaster } from "sonner"
import CartaPage from './pages/carta/CartaPage';
import ComandasPage from './pages/comandas/ComandasPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Usamos un Layout principal para la estructura común del dashboard */}
        <Route element={<Layout />}>
          {/* La ruta principal "/" se renderizará dentro del Layout */}
          <Route path="/" element={<HomePage />} />
          <Route path="mozos" element={<MozosPage />} />
          <Route path="clientes" element={<ClientePage />} />
          <Route path="productos" element={<ProductoPage />} />
          <Route path="mesas" element={<MesasPage />} />
          <Route path="sectores" element={<SectoresPage />} />
          <Route path="reservas" element={<ReservasPage />} />
          <Route path="cartas" element={<CartaPage />} />
          <Route path="comandas" element={<ComandasPage />} />
        </Route>
        
        {/* Ruta para "Página no encontrada" (404) */}
        <Route path="*" element={<div>404 - Página no encontrada</div>} />
      </Routes>
      <Toaster position="bottom-right" richColors closeButton duration={4000} />
    </Router>

    
  );
}

export default App;
