import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PlusCircle, Trash2, Phone, Users, Receipt, FolderOpen, Edit,
  ArrowLeft, MapPin, Calendar, X, Download, FileText, Image, Move3d,
  DollarSign, Briefcase, UserPlus, Info, CheckCircle, AlertCircle
} from 'lucide-react';
import FloorViewer3D from '../components/FloorViewer3D';

const API = '';

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses');

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: '', category: 'مواد', date: new Date().toISOString().split('T')[0], note: '', contractorId: '' });

  const [showContractorModal, setShowContractorModal] = useState(false);
  const [editContractor, setEditContractor] = useState(null); // the object being edited
  const [submittingContractor, setSubmittingContractor] = useState(false);
  const [newContractor, setNewContractor] = useState({ name: '', specialty: '', phone: '', teamSize: 1, totalBudget: 0, advancePaid: 0, suppliesDetails: '' });
  const [viewer3D, setViewer3D] = useState(null); // { url, name }
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm, type }

  useEffect(() => { fetchProject(); }, [id]);

  const fetchProject = async () => {
    try {
      const { data } = await axios.get(`${API}/api/projects/${id}`);
      setProject(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setSubmittingExpense(true);
    try {
      await axios.post(`${API}/api/projects/${id}/expenses`, newExpense);
      setNewExpense({ amount: '', category: 'مواد', date: new Date().toISOString().split('T')[0], note: '', contractorId: '' });
      setShowExpenseModal(false);
      await fetchProject();
    } catch { alert('Erreur'); }
    finally { setSubmittingExpense(false); }
  };

  const handleDeleteExpense = (eid) => {
    setConfirmModal({
      title: t('confirm_delete_expense_title') || 'Supprimer cette dépense ?',
      message: t('confirm_delete_expense'),
      type: 'danger',
      onConfirm: async () => {
        await axios.delete(`${API}/api/projects/${id}/expenses/${eid}`);
        fetchProject();
        setConfirmModal(null);
      }
    });
  };

  const handleAddContractor = async (e) => {
    e.preventDefault();
    setSubmittingContractor(true);
    try {
      if (editContractor) {
        await axios.put(`${API}/api/projects/${id}/contractors/${editContractor.id}`, newContractor);
      } else {
        await axios.post(`${API}/api/projects/${id}/contractors`, newContractor);
      }
      setNewContractor({ name: '', specialty: '', phone: '', teamSize: 1, totalBudget: 0, advancePaid: 0, suppliesDetails: '' });
      setShowContractorModal(false);
      setEditContractor(null);
      await fetchProject();
    } catch { alert('Erreur'); }
    finally { setSubmittingContractor(false); }
  };

  const openEditContractor = (c) => {
    setEditContractor(c);
    setNewContractor({
      name: c.name, specialty: c.specialty, phone: c.phone || '',
      teamSize: c.teamSize || 1, totalBudget: c.totalBudget || 0,
      advancePaid: c.advancePaid || 0, suppliesDetails: c.suppliesDetails || ''
    });
    setShowContractorModal(true);
  };

  const handleDeleteContractor = (cid) => {
    setConfirmModal({
      title: t('confirm_delete_contractor_title') || 'Supprimer ce prestataire ?',
      message: t('confirm_delete_contractor'),
      type: 'danger',
      onConfirm: async () => {
        await axios.delete(`${API}/api/projects/${id}/contractors/${cid}`);
        fetchProject();
        setConfirmModal(null);
      }
    });
  };

  const handleUploadDoc = async (e, contractorId = null) => {
    e.preventDefault();
    const file = e.target.elements.file.files[0];
    const name = e.target.elements.name?.value;
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    if (name) fd.append('name', name);
    if (contractorId) fd.append('contractorId', contractorId);
    try {
      await axios.post(`${API}/api/documents/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      e.target.reset();
      fetchProject();
    } catch { alert('Erreur upload'); }
  };

  const handleDeleteDoc = (docId) => {
    setConfirmModal({
      title: t('confirm_delete_doc_title') || 'Supprimer ce document ?',
      message: t('confirm_delete_doc'),
      type: 'danger',
      onConfirm: async () => {
        try {
          await axios.delete(`${API}/api/documents/${docId}`);
          fetchProject();
          setConfirmModal(null);
        } catch { alert('Erreur suppression'); }
      }
    });
  };

  if (loading || !project) return (
    <div className="loader-container"><div className="spinner" /><p className="text-muted">{t('loading_details')}</p></div>
  );

  const totalSpent  = project.expenses.reduce((s, e) => s + e.amount, 0);
  const remaining   = project.budget - totalSpent;
  const pct         = project.budget > 0 ? Math.min((totalSpent / project.budget) * 100, 100) : 0;
  const isOver      = totalSpent > project.budget;

  // Category breakdown for this project
  const catMap = {};
  project.expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  const Modal = ({ show, onClose, title, children }) => {
    if (!show) return null;
    return (
      <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal">
          <div className="flex justify-between align-center mb-6">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{title}</h2>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="content">
      {/* Back */}
      <button className="btn-ghost flex align-center gap-2 mb-4" style={{ fontSize: '0.85rem', padding: '0.3rem 0' }} onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> {t('back')}
      </button>

      {/* ── Hero Card ── */}
      <div className="card" style={{ background: `linear-gradient(135deg, #059669 0%, #10b981 100%)`, color: 'white', border: 'none', boxShadow: '0 16px 40px -12px rgba(16,185,129,0.5)', marginBottom: '1.5rem' }}>
        <div className="flex justify-between align-center mb-4">
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '0.4rem' }}>{project.name}</h2>
            <div className="flex gap-3 align-center">
              {project.location && <span className="flex align-center gap-1" style={{ fontSize: '0.8rem', opacity: 0.85 }}><MapPin size={13} /> {project.location}</span>}
              {project.startDate && <span className="flex align-center gap-1" style={{ fontSize: '0.8rem', opacity: 0.85 }}><Calendar size={13} /> {new Date(project.startDate).toLocaleDateString()}</span>}
            </div>
          </div>
          {isOver && <span className="badge" style={{ background: 'rgba(239,68,68,0.25)', color: '#fca5a5' }}>{t('over_budget')}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
          {[
            { label: t('budget'), val: project.budget, color: 'white' },
            { label: t('spent'), val: totalSpent, color: isOver ? '#fca5a5' : '#fecaca' },
            { label: t('remaining'), val: remaining, color: remaining < 0 ? '#fca5a5' : '#bbf7d0' },
          ].map(({ label, val, color }) => (
            <div key={label}>
              <div style={{ opacity: 0.75, fontSize: '0.68rem', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontWeight: '800', fontSize: '1.1rem', color }}>{val.toLocaleString()} <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>TND</span></div>
            </div>
          ))}
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%`, background: isOver ? '#fca5a5' : 'white' }} />
        </div>
        <div className="flex justify-between mt-2" style={{ fontSize: '0.72rem', opacity: 0.8 }}>
          <span>{pct.toFixed(0)}% {t('used')}</span>
          <span>{project.expenses.length} {t('expenses')} · {project.contractors.length} {t('contractors')}</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        {['expenses', 'contractors', 'documents'].map(tab => (
          <div key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {t(tab)}
          </div>
        ))}
      </div>

      {/* ── EXPENSES TAB ── */}
      {activeTab === 'expenses' && (
        <div>
          <div className="flex justify-between align-center mb-4">
            <div className="section-title" style={{ margin: 0 }}>{t('expenses')} ({project.expenses.length})</div>
            <button className="btn btn-sm" onClick={() => setShowExpenseModal(true)}>
              <PlusCircle size={15} /> {t('add_expense')}
            </button>
          </div>

          {/* Category mini-chart */}
          {cats.length > 0 && (
            <div className="card" style={{ margin: '0 0 1.25rem', padding: '1rem' }}>
              <div className="section-title mb-4">{t('breakdown_by_category')}</div>
              {cats.map(([cat, amt], i) => {
                const p = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                const colors = ['var(--primary)', 'var(--accent)', 'var(--warning)', 'var(--danger)'];
                return (
                  <div key={cat} style={{ marginBottom: '0.6rem' }}>
                    <div className="flex justify-between mb-2" style={{ fontSize: '0.8rem' }}>
                      <span className="font-semibold">{cat}</span>
                      <span className="text-muted">{amt.toLocaleString()} TND · {p.toFixed(0)}%</span>
                    </div>
                    <div className="progress-track-muted">
                      <div style={{ height: '100%', width: `${p}%`, background: colors[i % 4], borderRadius: '3px', transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {project.expenses.length === 0 ? (
            <div className="empty-state">
              <Receipt size={48} strokeWidth={1} color="var(--primary)" />
              <p>{t('no_expenses')}</p>
              <button className="btn btn-sm mt-4" onClick={() => setShowExpenseModal(true)}><PlusCircle size={15} /> {t('add_expense')}</button>
            </div>
          ) : (
            <div className="grid">
              {project.expenses.map(e => {
                const c = project.contractors.find(x => x.id === e.contractorId);
                return (
                  <div key={e.id} className="card" style={{ margin: 0, padding: '1rem' }}>
                    <div className="flex justify-between align-center mb-2">
                      <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>{e.category}</span>
                      <button className="icon-btn danger" onClick={() => handleDeleteExpense(e.id)}><Trash2 size={14} /></button>
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--danger)', letterSpacing: '-0.02em' }}>
                      -{e.amount.toLocaleString()} <span style={{ fontSize: '0.7rem', fontWeight: '500', color: 'var(--text-muted)' }}>TND</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                      {new Date(e.date).toLocaleDateString()}
                      {c && <span style={{ color: 'var(--primary)', fontWeight: '600' }}> · {c.name}</span>}
                    </div>
                    {e.note && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontStyle: 'italic' }}>{e.note}</div>}
                  </div>
                );
              })}
            </div>
          )}

          <Modal show={showExpenseModal} onClose={() => setShowExpenseModal(false)} title={t('add_expense')}>
            <form onSubmit={handleAddExpense}>
              <div className="input-row">
                <div className="input-group">
                  <label>{t('amount')} (TND) *</label>
                  <input type="number" className="input" required min="0" placeholder="0" value={newExpense.amount}
                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} disabled={submittingExpense} />
                </div>
                <div className="input-group">
                  <label>{t('date')}</label>
                  <input type="date" className="input" value={newExpense.date}
                    onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} disabled={submittingExpense} />
                </div>
              </div>
              <div className="input-group">
                <label>{t('category')}</label>
                <select className="input" value={newExpense.category}
                  onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} disabled={submittingExpense}>
                  <option value="مواد">مواد — Matériaux</option>
                  <option value="يد عاملة">يد عاملة — Main d'œuvre</option>
                  <option value="معدات">معدات — Équipement</option>
                </select>
              </div>
              {project.contractors.length > 0 && (
                <div className="input-group">
                  <label>{t('assign_contractor')}</label>
                  <select className="input" value={newExpense.contractorId}
                    onChange={e => setNewExpense({ ...newExpense, contractorId: e.target.value })} disabled={submittingExpense}>
                    <option value="">{t('none')}</option>
                    {project.contractors.map(c => <option key={c.id} value={c.id}>{c.name} ({c.specialty})</option>)}
                  </select>
                </div>
              )}
              <div className="input-group">
                <label>{t('note')}</label>
                <input type="text" className="input" placeholder="..." value={newExpense.note}
                  onChange={e => setNewExpense({ ...newExpense, note: e.target.value })} disabled={submittingExpense} />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn btn-outline" onClick={() => setShowExpenseModal(false)}>{t('cancel')}</button>
                <button type="submit" className="btn" disabled={submittingExpense}>
                  {submittingExpense ? t('uploading') : <><PlusCircle size={15} /> {t('save_expense')}</>}
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* ── CONTRACTORS TAB ── */}
      {activeTab === 'contractors' && (
        <div>
          <div className="flex justify-between align-center mb-4">
            <div className="section-title" style={{ margin: 0 }}>{t('contractors')} ({project.contractors.length})</div>
            <button className="btn btn-sm" onClick={() => setShowContractorModal(true)}>
              <PlusCircle size={15} /> {t('add_contractor')}
            </button>
          </div>

          {project.contractors.length === 0 ? (
            <div className="empty-state">
              <Users size={48} strokeWidth={1} color="var(--primary)" />
              <p>{t('no_contractors')}</p>
              <button className="btn btn-sm mt-4" onClick={() => setShowContractorModal(true)}><PlusCircle size={15} /> {t('add_contractor')}</button>
            </div>
          ) : (
            <div className="grid">
              {project.contractors.map(c => {
                const paidFromExpenses = (c.expenses || []).reduce((s, e) => s + e.amount, 0);
                const totalPaidTotal = paidFromExpenses + (c.advancePaid || 0);
                const expCount = (c.expenses || []).length;
                return (
                  <div key={c.id} className="card" style={{ margin: 0, padding: '1.25rem', cursor: 'pointer' }} onClick={() => navigate(`/project/${id}/contractor/${c.id}`)}>
                    <div className="flex justify-between align-center mb-3">
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', color: 'var(--primary)' }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex gap-1">
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); openEditContractor(c); }}><Edit size={14} /></button>
                        <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); handleDeleteContractor(c.id); }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="font-semibold" style={{ fontSize: '1rem', marginBottom: '2px' }}>{c.name}</div>
                    <div className="text-muted text-sm mb-3 flex align-center gap-1"><Briefcase size={12}/> {c.specialty}</div>
                    
                    <div className="flex gap-2 mb-3">
                      <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}><Users size={10} /> {c.teamSize || 1} {t('persons') || 'Pers.'}</span>
                      {c.advancePaid > 0 && <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>{t('advance') || 'Avance'}</span>}
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div className="text-xs text-muted">{t('total_paid')}</div>
                        <div className="font-bold text-primary">{totalPaidTotal.toLocaleString()} TND</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="text-xs text-muted">{t('expenses')}</div>
                        <div className="font-bold">{expCount}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Modal show={showContractorModal} onClose={() => { setShowContractorModal(false); setEditContractor(null); }} title={editContractor ? t('edit_contractor') : t('add_contractor')}>
            <form onSubmit={handleAddContractor}>
              <div className="input-group">
                <label>{t('name')} *</label>
                <input required className="input" placeholder="Nom" value={newContractor.name}
                  onChange={e => setNewContractor({ ...newContractor, name: e.target.value })} disabled={submittingContractor} />
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>{t('role')}</label>
                  <input className="input" placeholder="Maçon..." value={newContractor.specialty}
                    onChange={e => setNewContractor({ ...newContractor, specialty: e.target.value })} disabled={submittingContractor} />
                </div>
                <div className="input-group">
                  <label>{t('phone')}</label>
                  <input type="tel" className="input" placeholder="+216..." value={newContractor.phone}
                    onChange={e => setNewContractor({ ...newContractor, phone: e.target.value })} disabled={submittingContractor} />
                </div>
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>{t('team_size') || 'Équipe (Pers.)'}</label>
                  <input type="number" className="input" min="1" value={newContractor.teamSize}
                    onChange={e => setNewContractor({ ...newContractor, teamSize: e.target.value })} disabled={submittingContractor} />
                </div>
                <div className="input-group">
                  <label>{t('total_budget') || 'Budget Accordé'}</label>
                  <input type="number" className="input" min="0" value={newContractor.totalBudget}
                    onChange={e => setNewContractor({ ...newContractor, totalBudget: e.target.value })} disabled={submittingContractor} />
                </div>
              </div>
              <div className="input-group">
                <label>{t('advance_paid') || 'Avance Versée'}</label>
                <input type="number" className="input" min="0" value={newContractor.advancePaid}
                  onChange={e => setNewContractor({ ...newContractor, advancePaid: e.target.value })} disabled={submittingContractor} />
              </div>
              <div className="input-group">
                <label>{t('supplies_details') || 'Matériel / Fournitures à sa charge'}</label>
                <textarea className="input" style={{ minHeight: 60, paddingTop: 10 }} placeholder="..." value={newContractor.suppliesDetails}
                  onChange={e => setNewContractor({ ...newContractor, suppliesDetails: e.target.value })} disabled={submittingContractor} />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn btn-outline" onClick={() => { setShowContractorModal(false); setEditContractor(null); }}>{t('cancel')}</button>
                <button type="submit" className="btn" disabled={submittingContractor}>
                  {submittingContractor ? t('saving') : <><PlusCircle size={15} /> {editContractor ? t('update') : t('save_contractor')}</>}
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* ── DOCUMENTS TAB ── */}
      {activeTab === 'documents' && (
        <div>
          <div className="section-title mb-4">{t('documents')} ({project.documents.length})</div>
          <form className="card" style={{ margin: '0 0 1.5rem', padding: '1.25rem' }} onSubmit={handleUploadDoc}>
            <div className="input-group" style={{ margin: 0 }}>
              <label>{t('upload_doc')}</label>
              <input type="file" name="file" className="input" required accept=".pdf,image/*" style={{ padding: '0.6rem' }} />
            </div>
            <button type="submit" className="btn mt-4"><PlusCircle size={15} /> {t('upload')}</button>
          </form>

          {project.documents.length === 0 ? (
            <div className="empty-state"><FolderOpen size={48} strokeWidth={1} color="var(--primary)" /><p>{t('no_documents')}</p></div>
          ) : (
            <div className="grid">
              {project.documents.map(doc => {
                const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.name);
                return (
                  <div key={doc.id} className="card" style={{ margin: 0, padding: '1rem' }}>
                    <div className="flex justify-between align-center mb-3">
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isImg ? <Image size={20} color="var(--accent)" /> : <FileText size={20} color="var(--accent)" />}
                      </div>
                      <button className="icon-btn danger" onClick={() => handleDeleteDoc(doc.id)}><Trash2 size={14} /></button>
                    </div>
                    <div className="font-semibold truncate text-sm mb-1">{doc.name}</div>
                    <div className="text-xs text-muted mb-3">{new Date(doc.createdAt).toLocaleDateString()}</div>
                    <div className="flex gap-2">
                      <a href={`${API}${doc.url}`} target="_blank" rel="noopener noreferrer"
                        className="flex align-center gap-1" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
                        <Download size={12} /> {isImg ? 'Voir' : 'Télécharger'}
                      </a>
                      {isImg && (
                        <button
                          onClick={() => setViewer3D({ url: `${API}${doc.url}`, name: doc.name })}
                          style={{ background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 6, color: 'white', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', boxShadow: '0 2px 8px rgba(16,185,129,0.35)' }}
                        >
                          <Move3d size={12} /> 3D
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 3D Floor Viewer ── */}
      {viewer3D && (
        <FloorViewer3D
          imageUrl={viewer3D.url}
          name={viewer3D.name}
          onClose={() => setViewer3D(null)}
        />
      )}

      {/* ── Confirmation Modal ── */}
      {confirmModal && (
        <Modal 
          show={true} 
          onClose={() => setConfirmModal(null)} 
          title={confirmModal.title}
        >
          <div style={{ padding: '1rem 0' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn secondary" onClick={() => setConfirmModal(null)}>{t('cancel') || 'Annuler'}</button>
              <button className="btn danger" onClick={confirmModal.onConfirm}>{t('confirm') || 'Confirmer'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
