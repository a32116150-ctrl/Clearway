import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle, FolderOpen, Receipt, Trash2,
  TrendingUp, TrendingDown, Wallet, BarChart2,
  MapPin, Calendar, ArrowRight, X, CheckCircle
} from 'lucide-react';

const API = '';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', location: '', startDate: '', budget: '', description: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const { data } = await axios.get(`${API}/api/projects`);
      if (Array.isArray(data)) {
        setProjects(data);
        setError('');
      } else if (data && data.error) {
        setError(data.error);
        setProjects([]);
      }
    } catch (err) { 
      console.error(err);
      setError(t('error_fetching_data', 'Erreur lors de la récupération des données'));
    }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/projects`, newProject);
      setNewProject({ name: '', location: '', startDate: '', budget: '', description: '' });
      setShowModal(false);
      await fetchProjects();
      setSuccessMsg(t('project_created'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch { alert('Error creating project'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm(t('confirm_delete_project', 'Supprimer ce projet ?'))) {
      await axios.delete(`${API}/api/projects/${id}`);
      fetchProjects();
    }
  };

  // ── Computed Stats ──────────────────────────────────
  const globalBudget   = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const globalSpent    = projects.reduce((s, p) => s + (p.expenses || []).reduce((a, e) => a + (e.amount || 0), 0), 0);
  const globalRemain   = globalBudget - globalSpent;
  const globalPct      = globalBudget > 0 ? Math.min(((globalSpent / globalBudget) * 100), 100) : 0;
  const totalContractors = projects.reduce((s, p) => s + (p.contractors || []).length, 0);

  const allExpenses = projects.flatMap(p => (p.expenses || []).map(e => ({ ...e, projectName: p.name })));
  allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recentExpenses = allExpenses.slice(0, 6);

  // Category breakdown
  const catMap = {};
  allExpenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
  const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  // Most active projects (by expense count)
  const projectsByActivity = [...projects].sort((a, b) => (b.expenses || []).length - (a.expenses || []).length);

  if (loading) return (
    <div className="loader-container">
      <div className="spinner" />
      <p className="text-muted text-sm">{t('loading_details')}</p>
    </div>
  );

  return (
    <div className="content">

      {/* ── Success Toast ── */}
      {successMsg && (
        <div style={{
          position: 'fixed', top: '5rem', right: '1.5rem', zIndex: 300,
          background: 'var(--primary)', color: 'white',
          padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
          animation: 'slideUp 0.3s ease'
        }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* ── Error Message ── */}
      {error && (
        <div className="card mb-6" style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '1rem' }}>
          <p style={{ fontWeight: '700' }}>{t('error')}: {error}</p>
          <p className="text-sm mt-1">Check your DATABASE_URL in Vercel settings and ensure you ran 'npx prisma db push'.</p>
          <button className="btn btn-sm mt-3" onClick={fetchProjects}>{t('retry', 'Réessayer')}</button>
        </div>
      )}

      {/* ── Page Title Row ── */}
      <div className="flex justify-between align-center mb-8">
        <div>
          <h1 className="page-title">{t('dashboard', 'Tableau de bord')}</h1>
          <p className="subtitle mt-2">{projects.length} {t('projects')} • {totalContractors} {t('contractors')}</p>
        </div>
        <button className="btn btn-sm" onClick={() => setShowModal(true)}>
          <PlusCircle size={16} /> {t('add_project')}
        </button>
      </div>

      {/* ── Global KPI Summary ── */}
      {projects.length > 0 && (
        <>
          <div className="summary-hero">
            <div className="flex justify-between align-center mb-6">
              <div>
                <div style={{ opacity: 0.8, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
                  {t('global_summary')}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {globalBudget.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: '500', opacity: 0.8 }}>TND</span>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: '4px' }}>{t('total_budget')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.5rem 1rem', borderRadius: '30px', fontSize: '0.85rem', fontWeight: '700' }}>
                  {globalPct.toFixed(0)}% {t('used')}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ opacity: 0.75, fontSize: '0.68rem', textTransform: 'uppercase', marginBottom: '4px' }}>{t('total_spent')}</div>
                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fecaca' }}>{globalSpent.toLocaleString()} <span style={{ fontSize: '0.65rem' }}>TND</span></div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ opacity: 0.75, fontSize: '0.68rem', textTransform: 'uppercase', marginBottom: '4px' }}>{t('total_remaining')}</div>
                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#bbf7d0' }}>{globalRemain.toLocaleString()} <span style={{ fontSize: '0.65rem' }}>TND</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ opacity: 0.75, fontSize: '0.68rem', textTransform: 'uppercase', marginBottom: '4px' }}>{t('projects')}</div>
                <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{projects.length}</div>
              </div>
            </div>

            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${globalPct}%`, background: globalPct > 90 ? '#fca5a5' : 'white' }} />
            </div>
          </div>

          {/* ── Stat Cards ── */}
          <div className="stat-grid">
            <div className="stat-card" style={{ animationDelay: '0.05s' }}>
              <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>
                <Wallet size={20} color="var(--primary)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--text-main)' }}>{globalBudget.toLocaleString()}</div>
              <div className="stat-label">{t('total_budget')}</div>
            </div>
            <div className="stat-card" style={{ animationDelay: '0.1s' }}>
              <div className="stat-icon" style={{ background: 'var(--danger-light)' }}>
                <TrendingDown size={20} color="var(--danger)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{globalSpent.toLocaleString()}</div>
              <div className="stat-label">{t('total_spent')}</div>
            </div>
            <div className="stat-card" style={{ animationDelay: '0.15s' }}>
              <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>
                <TrendingUp size={20} color="var(--primary)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--primary)' }}>{globalRemain.toLocaleString()}</div>
              <div className="stat-label">{t('total_remaining')}</div>
            </div>
            <div className="stat-card" style={{ animationDelay: '0.2s' }}>
              <div className="stat-icon" style={{ background: 'var(--accent-light)' }}>
                <BarChart2 size={20} color="var(--accent)" />
              </div>
              <div className="stat-value">{allExpenses.length}</div>
              <div className="stat-label">{t('expenses')}</div>
            </div>
          </div>

          {/* ── Category Breakdown ── */}
          {categories.length > 0 && (
            <div className="card mb-6" style={{ margin: '0 0 1.5rem' }}>
              <div className="section-title mb-4">{t('breakdown_by_category', 'Répartition par catégorie')}</div>
              {categories.map(([cat, total], i) => {
                const pct = globalSpent > 0 ? (total / globalSpent) * 100 : 0;
                const colors = ['var(--primary)', 'var(--accent)', 'var(--warning)', 'var(--danger)'];
                return (
                  <div key={cat} style={{ marginBottom: '0.75rem' }}>
                    <div className="flex justify-between mb-2">
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{cat}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {total.toLocaleString()} TND <span style={{ opacity: 0.6 }}>({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="progress-track-muted">
                      <div style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: '3px', transition: 'width 1s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Projects Section ── */}
      <div className="flex justify-between align-center mb-4">
        <div className="section-title" style={{ margin: 0 }}>{t('projects')} ({projects.length})</div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={52} strokeWidth={1} color="var(--primary)" />
          <p style={{ fontWeight: '600' }}>{t('no_projects')}</p>
          <button className="btn btn-sm mt-4" onClick={() => setShowModal(true)}>
            <PlusCircle size={16} /> {t('add_project')}
          </button>
        </div>
      ) : (
        <div className="grid mb-6">
          {projects.map((p, idx) => {
            const spent = p.expenses.reduce((s, e) => s + e.amount, 0);
            const remain = p.budget - spent;
            const pct = p.budget > 0 ? Math.min((spent / p.budget) * 100, 100) : 0;
            const isOverBudget = spent > p.budget;

            return (
              <div
                key={p.id}
                className="project-card"
                style={{ animationDelay: `${idx * 0.06}s` }}
                onClick={() => navigate(`/project/${p.id}`)}
              >
                {/* Header */}
                <div className="flex justify-between align-center">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="title truncate">{p.name}</div>
                    {(p.location || p.startDate) && (
                      <div className="flex align-center gap-2 mt-2">
                        {p.location && (
                          <span className="flex align-center gap-1" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <MapPin size={11} /> {p.location}
                          </span>
                        )}
                        {p.startDate && (
                          <span className="flex align-center gap-1" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <Calendar size={11} /> {new Date(p.startDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex align-center gap-2">
                    {p.budget > 0 && p.expenses?.reduce((s, e) => s + e.amount, 0) > p.budget && <span className="badge badge-red">Dépassé</span>}
                    <button className="icon-btn danger" onClick={e => handleDelete(e, p.id)}><Trash2 size={15} /></button>
                  </div>
                </div>

                {/* Financial Row */}
                <div className="flex justify-between" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.68rem', textTransform: 'uppercase', marginBottom: '2px' }}>{t('budget')}</div>
                    <div className="font-bold">{(p.budget || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="text-muted" style={{ fontSize: '0.68rem', textTransform: 'uppercase', marginBottom: '2px' }}>{t('spent')}</div>
                    <div className="font-bold text-danger">{(p.expenses || []).reduce((s, e) => s + e.amount, 0).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-muted" style={{ fontSize: '0.68rem', textTransform: 'uppercase', marginBottom: '2px' }}>{t('remaining')}</div>
                    <div className="font-bold" style={{ color: ((p.budget || 0) - (p.expenses || []).reduce((s, e) => s + e.amount, 0)) < 0 ? 'var(--danger)' : 'var(--primary)' }}>
                      {((p.budget || 0) - (p.expenses || []).reduce((s, e) => s + e.amount, 0)).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between mb-2" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>{(p.expenses || []).length} {t('expenses')} · {(p.contractors || []).length} {t('contractors')}</span>
                    <span style={{ fontWeight: '700', color: (p.expenses || []).reduce((s, e) => s + e.amount, 0) > p.budget ? 'var(--danger)' : 'var(--text-main)' }}>
                      {p.budget > 0 ? Math.min(((p.expenses || []).reduce((s, e) => s + e.amount, 0) / p.budget) * 100, 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="progress-track-muted">
                    <div style={{
                      height: '100%', width: `${p.budget > 0 ? Math.min(((p.expenses || []).reduce((s, e) => s + e.amount, 0) / p.budget) * 100, 100) : 0}%`,
                      background: (p.expenses || []).reduce((s, e) => s + e.amount, 0) > p.budget ? 'var(--danger)' : 'var(--primary)',
                      borderRadius: '3px', transition: 'width 0.8s ease'
                    }} />
                  </div>
                </div>

                {/* CTA */}
                <div className="flex align-center" style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '600', marginTop: '0.25rem' }}>
                  <span>{t('view_details', 'Voir les détails')}</span>
                  <ArrowRight size={14} style={{ marginInlineStart: '4px' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Recent Expenses ── */}
      {recentExpenses.length > 0 && (
        <div className="card" style={{ margin: '0 0 1.5rem' }}>
          <div className="flex justify-between align-center mb-4">
            <div className="section-title" style={{ margin: 0 }}>
              <Receipt size={14} style={{ display: 'inline', marginInlineEnd: '6px', verticalAlign: 'middle' }} />
              {t('recent_expenses')}
            </div>
            <span className="badge badge-green">{allExpenses.length} {t('total', 'total')}</span>
          </div>
          {recentExpenses.map((e, idx) => (
            <div key={`${e.id}-${idx}`} className="activity-item">
              <div className="activity-dot" style={{ background: 'var(--primary)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{e.category}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{e.projectName}</span>
                  {' · '}{new Date(e.date).toLocaleDateString()}
                </div>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                -{e.amount.toLocaleString()} TND
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Project Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="flex justify-between align-center mb-6">
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{t('add_project')}</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="input-group">
                <label>{t('name')} *</label>
                <input className="input" required placeholder={t('name')} value={newProject.name}
                  onChange={e => setNewProject({ ...newProject, name: e.target.value })} disabled={submitting} />
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>{t('location')}</label>
                  <input className="input" placeholder="Tunis, Sfax..." value={newProject.location}
                    onChange={e => setNewProject({ ...newProject, location: e.target.value })} disabled={submitting} />
                </div>
                <div className="input-group">
                  <label>{t('start_date')}</label>
                  <input type="date" className="input" value={newProject.startDate}
                    onChange={e => setNewProject({ ...newProject, startDate: e.target.value })} disabled={submitting} />
                </div>
              </div>
              <div className="input-group">
                <label>{t('budget')} (TND) *</label>
                <input type="number" className="input" required min="0" placeholder="0"
                  value={newProject.budget}
                  onChange={e => setNewProject({ ...newProject, budget: e.target.value })} disabled={submitting} />
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} disabled={submitting}>
                  {t('cancel', 'Annuler')}
                </button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? t('uploading') : <><PlusCircle size={16} /> {t('add_project')}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
