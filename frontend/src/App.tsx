import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MozosPage from './pages/mozo/MozoPage';
import { Layout } from './pages/layout/Layout';
import HomePage from './pages/home/HomePage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Usamos un Layout principal para la estructura común del dashboard */}
        <Route element={<Layout />}>
          {/* La ruta principal "/" se renderizará dentro del Layout */}
          <Route path="/" element={<HomePage />} />
          <Route path="mozos" element={<MozosPage />} />
        </Route>
        
        {/* Aquí puedes agregar rutas que no usen el layout del dashboard (ej: Login) */}
        {/* <Route path="login" element={<LoginPage />} /> */}
        
        {/* Ruta para "Página no encontrada" (404) */}
        <Route path="*" element={<div>404 - Página no encontrada</div>} />
      </Routes>
    </Router>
  );
}

export default App;