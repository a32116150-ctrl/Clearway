import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import ContractorProfile from './pages/ContractorProfile';
import { LogOut, Globe, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

function Header() {
  const { user, logout } = useAuth();
  const { i18n, t } = useTranslation();
  const [dark, setDark] = useState(document.documentElement.getAttribute('data-theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggleLang = () => {
    const next = i18n.language === 'fr' ? 'ar' : 'fr';
    i18n.changeLanguage(next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      height: '64px',
      display: 'flex',
      alignItems: 'center'
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px'
      }}>
        <Link to="/" style={{ 
          textDecoration: 'none', 
          fontSize: '22px', 
          fontWeight: '900', 
          color: '#0f172a',
          letterSpacing: '-0.04em',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          CLEAR<span style={{ color: '#10b981' }}>WAY</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button onClick={toggleLang} style={{
              background: 'none', border: 'none', padding: '6px 12px', borderRadius: '6px',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              color: '#64748b'
            }}>
              <Globe size={14} /> {i18n.language.toUpperCase()}
            </button>
            <button onClick={() => setDark(!dark)} style={{
              background: 'white', border: 'none', padding: '6px', borderRadius: '6px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              {dark ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#6366f1" />}
            </button>
          </div>

          {user ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '4px 4px 4px 12px', 
              background: 'white', 
              border: '1px solid #e2e8f0', 
              borderRadius: '99px' 
            }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{user.name}</span>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', background: '#10b981', 
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '14px', fontWeight: '800' 
              }}>
                {user.name.charAt(0)}
              </div>
              <button onClick={logout} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', 
                padding: '8px', display: 'flex', alignItems: 'center'
              }}>
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link to="/login" style={{ 
                fontSize: '14px', fontWeight: '600', color: '#64748b', textDecoration: 'none' 
              }}>{t('login') || 'Login'}</Link>
              <Link to="/register" style={{ 
                fontSize: '14px', fontWeight: '600', color: '#10b981', textDecoration: 'none' 
              }}>{t('register') || 'Register'}</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader-container"><div className="spinner"></div></div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-wrapper">
          <Header />
          <main>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/project/:id" element={<PrivateRoute><ProjectDetails /></PrivateRoute>} />
              <Route path="/project/:id/contractor/:contractorId" element={<PrivateRoute><ContractorProfile /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
