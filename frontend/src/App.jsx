import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Workspace from './pages/Workspace.jsx';
import Admin from './pages/Admin.jsx';
import AdminEditor from './pages/AdminEditor.jsx';

const NAV_STYLE = {
  background: '#2b6cb0', padding: '12px 32px',
  display: 'flex', alignItems: 'center', gap: '24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
};

export default function App() {
  return (
    <BrowserRouter>
      <nav style={NAV_STYLE}>
        <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none' }}>
          🧩 Blockly Exercise Platform
        </Link>
        <Link to="/admin" style={{ color: '#bee3f8', textDecoration: 'none', fontSize: '0.9rem' }}>
          Admin Panel
        </Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/exercise/:id" element={<Workspace />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/exercise/new" element={<AdminEditor />} />
        <Route path="/admin/exercise/:id/edit" element={<AdminEditor />} />
      </Routes>
    </BrowserRouter>
  );
}
