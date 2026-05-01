import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useContext(AuthContext);
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password) {
      setError('All fields are required');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await register(formData.name, formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register');
    }
  };

  return (
    <div className="content flex" style={{ alignItems: 'center', justifyContent: 'center', background: '#f4f6f9', minHeight: '100vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 50px -12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.04em' }}>
            CLEAR<span style={{ color: '#10b981' }}>WAY</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px', fontWeight: '600' }}>Rejoignez la clarté.</p>
        </div>
        <h2 className="title mb-6 text-center" style={{ fontSize: '20px', fontWeight: '800' }}>{t('register')}</h2>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>{t('name')}</label>
            <input 
              className="input" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
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
          <button type="submit" className="btn mt-4">{t('register')}</button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
            {t('login')}
          </Link>
        </div>
      </div>
    </div>
  );
}
