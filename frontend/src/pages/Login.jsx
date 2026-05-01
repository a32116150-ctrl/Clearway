import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return;
    }

    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login');
    }
  };

  return (
    <div className="content flex" style={{ alignItems: 'center', justifyContent: 'center', background: '#f4f6f9', minHeight: '100vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 50px -12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.04em' }}>
            CLEAR<span style={{ color: '#10b981' }}>WAY</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px', fontWeight: '600' }}>Votre projet, en toute clarté.</p>
        </div>
        <h2 className="title mb-6 text-center" style={{ fontSize: '20px', fontWeight: '800' }}>{t('login')}</h2>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>{t('email')}</label>
            <input 
              type="email" 
              className="input" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
            />
          </div>
          <div className="input-group">
            <label>{t('password')}</label>
            <input 
              type="password" 
              className="input" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>
          <button type="submit" className="btn mt-4">{t('login')}</button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
          <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
            {t('register')}
          </Link>
        </div>
      </div>
    </div>
  );
}
