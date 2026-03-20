import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Workspace from './pages/Workspace.jsx';
import Admin from './pages/Admin.jsx';
import AdminEditor from './pages/AdminEditor.jsx';

const NAV_STYLE = {
  background: '#2b6cb0', padding: '12px 32px',
  display: 'flex', alignItems: 'center', gap: '24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
};
const LOGO = { color: '#fff', fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none' };
const LINK = { color: '#bee3f8', textDecoration: 'none', fontSize: '0.9rem' };

function Nav() {
  return (
    <nav style={NAV_STYLE}>
      <Link to="/" style={LOGO}>🧩 Blockly 練習平台</Link>
      <Link to="/admin" style={LINK}>管理後台</Link>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
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
