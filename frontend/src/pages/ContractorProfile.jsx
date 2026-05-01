import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Phone, Users, DollarSign, Briefcase, FileText,
  PlusCircle, Trash2, Download, Edit, Info, Receipt,
  TrendingUp, Wallet, Package, Clock, CheckCircle, X,
  AlertTriangle, BarChart, Save, Upload, ChevronRight,
  Calendar, Hash, Activity, Shield, Star, Layers, Eye
} from 'lucide-react';

const API = '';

// ── inline style tokens (no external CSS dependency) ────────────────────────
const T = {
  // colours
  bg: '#f4f6f9',
  surface: '#ffffff',
  border: '#e8ecf1',
  primary: '#10b981',
  primaryDk: '#059669',
  accent: '#6366f1',
  danger: '#ef4444',
  warn: '#f59e0b',
  textPri: '#0f172a',
  textSec: '#64748b',
  textMuted: '#94a3b8',
  dark: '#0f172a',
  darkCard: '#1e293b',
  // radii
  r: '10px',
  rL: '16px',
  rXL: '22px',
  // shadow
  sh: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  shM: '0 4px 16px rgba(0,0,0,0.08)',
  shL: '0 8px 32px rgba(0,0,0,0.12)',
};

// ── tiny helpers ─────────────────────────────────────────────────────────────
const fmt = n => (n ?? 0).toLocaleString('fr-TN');
const fmtD = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const KPICard = ({ icon: Icon, label, value, color, sub }) => (
  <div style={{
    background: T.surface, borderRadius: T.rL, padding: '20px 22px',
    border: `1px solid ${T.border}`, boxShadow: T.sh,
    display: 'flex', flexDirection: 'column', gap: 8,
    transition: 'box-shadow .2s',
  }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = T.shM}
    onMouseLeave={e => e.currentTarget.style.boxShadow = T.sh}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: .8, textTransform: 'uppercase', color: T.textMuted }}>{label}</span>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} color={color} />
      </div>
    </div>
    <div style={{ fontSize: 26, fontWeight: 900, color: T.textPri, letterSpacing: '-0.03em', lineHeight: 1 }}>
      {fmt(value)} <span style={{ fontSize: 13, fontWeight: 600, color: T.textMuted }}>TND</span>
    </div>
    {sub && <div style={{ fontSize: 11, color: T.textMuted }}>{sub}</div>}
  </div>
);

const Tag = ({ children, color = T.accent }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 99,
    background: `${color}14`, color, fontSize: 11, fontWeight: 700,
    border: `1px solid ${color}22`,
  }}>{children}</span>
);

const Divider = () => <div style={{ borderBottom: `1px solid ${T.border}`, margin: '0' }} />;

// ── modal shell ──────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: T.surface, borderRadius: T.rXL,
        width: '100%', maxWidth: 520, boxShadow: T.shL,
        overflow: 'hidden', animation: 'slideUp .22s ease',
      }}>
        <div style={{
          padding: '20px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`,
        }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: T.textPri }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
};

// ── field row inside modal ───────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.textSec, marginBottom: 6, letterSpacing: .4 }}>{label}</label>
    {children}
  </div>
);

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: T.r,
  border: `1.5px solid ${T.border}`, fontSize: 14, color: T.textPri,
  background: T.bg, outline: 'none', boxSizing: 'border-box',
  transition: 'border-color .15s',
};

// ── main component ────────────────────────────────────────────────────────────
export default function ContractorProfile() {
  const { id: projectId, contractorId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [contractor, setContractor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [payForm, setPayForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
  const [saving, setSaving] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => { fetchContractor(); }, [contractorId]);

  const fetchContractor = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/projects/${projectId}`);
      const found = data.contractors?.find(c => c.id === parseInt(contractorId));
      if (found) {
        setContractor(found);
        setEditForm({
          name: found.name || '',
          specialty: found.specialty || '',
          phone: found.phone || '',
          teamSize: found.teamSize || 1,
          totalBudget: found.totalBudget || 0,
          advancePaid: found.advancePaid || 0,
          suppliesDetails: found.suppliesDetails || '',
        });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/projects/${projectId}/contractors/${contractorId}`, editForm);
      setEditOpen(false);
      fetchContractor();
    } catch { alert('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const handlePay = async () => {
    if (!payForm.amount) return;
    setSaving(true);
    try {
      await axios.post(`${API}/api/projects/${projectId}/expenses`, {
        amount: parseFloat(payForm.amount),
        date: payForm.date,
        note: payForm.note,
        category: 'Main-d\'œuvre',
        contractorId: parseInt(contractorId),
      });
      setPayOpen(false);
      setPayForm({ amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
      fetchContractor();
    } catch { alert('Erreur lors du paiement'); }
    finally { setSaving(false); }
  };

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    const file = e.target.elements.file?.files[0];
    const name = e.target.elements.docname?.value;
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    if (name) fd.append('name', name);
    fd.append('contractorId', contractorId);
    try {
      await axios.post(`${API}/api/documents/${projectId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      e.target.reset();
      fetchContractor();
    } catch { alert('Erreur upload'); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    try { await axios.delete(`${API}/api/documents/${docId}`); fetchContractor(); }
    catch { alert('Erreur suppression'); }
  };

  // ── derived stats ──────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.primary, animation: 'spin 0.9s linear infinite' }} />
      <p style={{ color: T.textMuted, fontSize: 14 }}>Chargement du profil…</p>
    </div>
  );

  if (!contractor) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
      <AlertTriangle size={40} style={{ margin: '0 auto 16px', display: 'block', color: T.warn }} />
      <p>Entrepreneur introuvable.</p>
      <button onClick={() => navigate(`/project/${projectId}`)} style={{ marginTop: 12, color: T.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
        ← Retour au projet
      </button>
    </div>
  );

  const expenses = contractor.expenses || [];
  const documents = (contractor.documents || []);
  const paidExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const advancePaid = contractor.advancePaid || 0;
  const totalPaid = paidExpenses + advancePaid;
  const budget = contractor.totalBudget || 0;
  const remaining = Math.max(0, budget - totalPaid);
  const overspent = totalPaid > budget && budget > 0;
  const progress = budget > 0 ? Math.min((totalPaid / budget) * 100, 100) : 0;

  // last 3 months activity
  const now = new Date();
  const recentExp = expenses.filter(e => (now - new Date(e.date)) < 90 * 864e5);
  const recentTotal = recentExp.reduce((s, e) => s + e.amount, 0);

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart },
    { id: 'payments', label: 'Paiements', icon: Receipt },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'supplies', label: 'Fournitures', icon: Package },
  ];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin    { to { transform:rotate(360deg) } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        .cp-tab-btn:hover  { background: #f1f5f9 !important; }
        .cp-row-hover:hover { background: #f8fafc !important; }
        .cp-btn-ghost:hover { background: #f1f5f9 !important; color: #0f172a !important; }
        .cp-btn-primary:hover { background: #059669 !important; }
        .cp-btn-outline:hover { background: #f1f5f9 !important; }
        .cp-doc-row:hover { background: #f8fafc !important; }
        * { font-family: 'DM Sans', system-ui, sans-serif; box-sizing:border-box; }
      `}</style>

      <div style={{ background: T.bg, minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* ── Top nav bar ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(244,246,249,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${T.border}`,
          padding: '0 32px', height: 58,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button className="cp-btn-ghost" onClick={() => navigate(`/project/${projectId}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: T.textSec, fontWeight: 600, fontSize: 13, padding: '6px 10px', borderRadius: 8, transition: 'all .15s' }}>
            <ArrowLeft size={16} /> Retour au projet
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="cp-btn-outline" onClick={() => setEditOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: T.r, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: T.surface, border: `1.5px solid ${T.border}`, color: T.textSec, transition: 'all .15s' }}>
              <Edit size={14} /> Modifier
            </button>
            <button className="cp-btn-primary" onClick={() => setPayOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: T.r, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: T.primary, border: 'none', color: '#fff', transition: 'all .15s', boxShadow: `0 2px 8px ${T.primary}44` }}>
              <PlusCircle size={14} /> Ajouter paiement
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px' }}>

          {/* ── Hero banner ── */}
          <div style={{
            background: `linear-gradient(135deg, ${T.dark} 0%, #1a2744 50%, #0f2a1e 100%)`,
            borderRadius: T.rXL, padding: '36px 40px',
            position: 'relative', overflow: 'hidden', marginBottom: 24,
            boxShadow: '0 16px 48px rgba(15,23,42,0.2)',
          }}>
            {/* decorative blobs */}
            <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, right: 80, width: 160, height: 160, borderRadius: '50%', background: 'rgba(99,102,241,0.06)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '30%', right: '12%', width: 1, height: 180, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06), transparent)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* identity row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 28 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 18,
                  background: 'rgba(16,185,129,0.18)',
                  border: '2px solid rgba(16,185,129,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 900, color: '#10b981',
                  flexShrink: 0, letterSpacing: '-0.02em',
                }}>
                  {contractor.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.03em' }}>
                    {contractor.name}
                  </h1>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {contractor.specialty && (
                      <Tag color="#818cf8"><Briefcase size={11} /> {contractor.specialty}</Tag>
                    )}
                    <Tag color="#94a3b8"><Users size={11} /> {contractor.teamSize || 1} pers.</Tag>
                    {contractor.phone && (
                      <a href={`tel:${contractor.phone}`} style={{ textDecoration: 'none' }}>
                        <Tag color="#34d399"><Phone size={11} /> {contractor.phone}</Tag>
                      </a>
                    )}
                    <Tag color={overspent ? '#f87171' : '#10b981'}>
                      {overspent ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
                      {overspent ? 'Dépassement budget' : 'Budget OK'}
                    </Tag>
                  </div>
                </div>
                {/* ID badge */}
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px', textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>ID Prestataire</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: "'DM Mono',monospace", fontWeight: 500 }}>
                    #{String(contractor.id).padStart(4, '0')}
                  </div>
                </div>
              </div>

              {/* KPI strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  { label: 'Budget global', val: budget, icon: Wallet, color: '#e2e8f0' },
                  { label: 'Total payé', val: totalPaid, icon: CheckCircle, color: '#34d399' },
                  { label: 'Avance versée', val: advancePaid, icon: DollarSign, color: '#fbbf24' },
                  { label: 'Reste à payer', val: remaining, icon: Clock, color: overspent ? '#f87171' : '#94a3b8' },
                ].map((k, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <k.icon size={13} color={k.color} />
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>{k.label}</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: k.color, letterSpacing: '-0.02em' }}>
                      {fmt(k.val)}
                      <span style={{ fontSize: 10, fontWeight: 600, marginLeft: 4, opacity: .6 }}>TND</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* progress bar */}
              {budget > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99, transition: 'width .6s ease',
                      width: `${progress}%`,
                      background: overspent
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                        : 'linear-gradient(90deg, #10b981, #34d399)',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                      {progress.toFixed(1)}% consommé
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                      Ajouté le {fmtD(contractor.createdAt)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: T.surface, borderRadius: T.rL, padding: 5, border: `1px solid ${T.border}`, width: 'fit-content' }}>
            {tabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} className={active ? '' : 'cp-tab-btn'}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', border: 'none', transition: 'all .15s',
                    background: active ? T.primary : 'transparent',
                    color: active ? '#fff' : T.textSec,
                    boxShadow: active ? `0 2px 8px ${T.primary}44` : 'none',
                  }}>
                  <tab.icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── TAB: Overview ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, animation: 'fadeIn .2s ease' }}>
              {/* left */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* budget health */}
                <div style={{ background: T.surface, borderRadius: T.rL, padding: '24px', border: `1px solid ${T.border}`, boxShadow: T.sh }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${T.primary}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={16} color={T.primary} />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 15, color: T.textPri }}>Santé du budget</span>
                    </div>
                    <Tag color={overspent ? T.danger : T.primary}>
                      {overspent ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
                      {overspent ? 'Dépassement' : 'En ordre'}
                    </Tag>
                  </div>

                  {budget > 0 ? (
                    <>
                      <div style={{ height: 10, background: T.bg, borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{
                          height: '100%', borderRadius: 99, width: `${progress}%`, transition: 'width .6s ease',
                          background: overspent
                            ? `linear-gradient(90deg, ${T.warn}, ${T.danger})`
                            : `linear-gradient(90deg, ${T.primary}, #34d399)`,
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: overspent ? T.danger : T.primary }}>
                          {progress.toFixed(1)}% utilisé
                        </span>
                        <span style={{ fontSize: 12, color: T.textMuted }}>{fmt(totalPaid)} / {fmt(budget)} TND</span>
                      </div>

                      {/* breakdown bars */}
                      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { label: 'Dépenses enregistrées', val: paidExpenses, total: budget, color: T.accent },
                          { label: 'Avances versées', val: advancePaid, total: budget, color: T.warn },
                        ].map(b => (
                          <div key={b.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontSize: 12, color: T.textSec, fontWeight: 600 }}>{b.label}</span>
                              <span style={{ fontSize: 12, color: T.textPri, fontWeight: 800 }}>{fmt(b.val)} TND</span>
                            </div>
                            <div style={{ height: 5, background: T.bg, borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 99, background: b.color, width: `${Math.min((b.val / b.total) * 100, 100)}%`, transition: 'width .6s ease' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: T.textMuted }}>
                      <Wallet size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: .3 }} />
                      <p style={{ fontSize: 13 }}>Aucun budget défini.<br />Modifiez le profil pour en ajouter un.</p>
                    </div>
                  )}
                </div>

                {/* recent activity */}
                <div style={{ background: T.surface, borderRadius: T.rL, border: `1px solid ${T.border}`, boxShadow: T.sh, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${T.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={16} color={T.accent} />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 15, color: T.textPri }}>Activité récente</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted }}>90 derniers jours · {fmt(recentTotal)} TND</span>
                  </div>
                  {recentExp.length === 0 ? (
                    <div style={{ padding: '36px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
                      <Clock size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: .3 }} />
                      Aucune activité récente
                    </div>
                  ) : (
                    <div>
                      {recentExp.slice(0, 5).map((e, i) => (
                        <div key={e.id} className="cp-row-hover"
                          style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderBottom: i < recentExp.length - 1 ? `1px solid ${T.border}` : 'none', gap: 14, transition: 'background .12s' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Receipt size={14} color={T.accent} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: T.textPri, marginBottom: 2 }}>{e.note || e.category}</div>
                            <div style={{ fontSize: 11, color: T.textMuted }}>{fmtD(e.date)}</div>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: T.textPri, whiteSpace: 'nowrap' }}>{fmt(e.amount)} <span style={{ fontSize: 10, color: T.textMuted }}>TND</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* profile details */}
                <div style={{ background: T.surface, borderRadius: T.rL, padding: '24px', border: `1px solid ${T.border}`, boxShadow: T.sh }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${T.warn}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={16} color={T.warn} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 15, color: T.textPri }}>Profil détaillé</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[
                      { label: 'Statut', val: <Tag color={T.primary}><CheckCircle size={10} /> Actif</Tag> },
                      { label: 'Spécialité', val: contractor.specialty || '—' },
                      { label: 'Équipe', val: `${contractor.teamSize || 1} personne(s)` },
                      { label: 'Téléphone', val: contractor.phone ? <a href={`tel:${contractor.phone}`} style={{ color: T.primary, fontWeight: 700, textDecoration: 'none' }}>{contractor.phone}</a> : '—' },
                      { label: 'Ajouté le', val: fmtD(contractor.createdAt) },
                      { label: 'Nb. dépenses', val: `${expenses.length} enregistrée(s)` },
                      { label: 'Nb. documents', val: `${documents.length} fichier(s)` },
                    ].map(({ label, val }, i, arr) => (
                      <div key={label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '11px 0',
                        borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none',
                      }}>
                        <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.textPri }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* quick doc upload */}
                <div style={{ background: T.surface, borderRadius: T.rL, padding: '24px', border: `1px solid ${T.border}`, boxShadow: T.sh }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${T.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Upload size={16} color={T.accent} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 15, color: T.textPri }}>Joindre un document</span>
                  </div>
                  <form onSubmit={handleUploadDoc} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input name="docname" placeholder="Nom (ex: Facture #3)" required
                      style={{ ...inputStyle, fontSize: 13 }}
                      onFocus={e => e.target.style.borderColor = T.accent}
                      onBlur={e => e.target.style.borderColor = T.border} />
                    <input type="file" name="file" required
                      style={{ ...inputStyle, fontSize: 12, padding: '8px 12px', cursor: 'pointer' }} />
                    <button type="submit"
                      style={{ padding: '10px', borderRadius: T.r, background: T.accent, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 2px 8px ${T.accent}44` }}>
                      <Upload size={13} /> Joindre le fichier
                    </button>
                  </form>
                  {documents.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: .8, textTransform: 'uppercase', color: T.textMuted, marginBottom: 8 }}>Derniers fichiers</div>
                      {documents.slice(0, 3).map(doc => (
                        <div key={doc.id} className="cp-doc-row"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, transition: 'background .12s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <FileText size={13} color={T.accent} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: T.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{doc.name}</span>
                          </div>
                          <a href={`${API}${doc.url}`} target="_blank" rel="noopener noreferrer"
                            style={{ color: T.textMuted, display: 'flex', padding: 4 }}>
                            <Download size={13} />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Payments ── */}
          {activeTab === 'payments' && (
            <div style={{ animation: 'fadeIn .2s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
                <KPICard icon={DollarSign} label="Total des dépenses" value={paidExpenses} color={T.accent}
                  sub={`${expenses.length} transaction(s)`} />
                <KPICard icon={Wallet} label="Avances versées" value={advancePaid} color={T.warn} />
                <KPICard icon={TrendingUp} label="Total cumulé" value={totalPaid} color={T.primary}
                  sub={budget > 0 ? `sur ${fmt(budget)} TND de budget` : undefined} />
              </div>

              <div style={{ background: T.surface, borderRadius: T.rL, border: `1px solid ${T.border}`, boxShadow: T.sh, overflow: 'hidden' }}>
                <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: T.textPri }}>Historique des paiements</span>
                  <button onClick={() => setPayOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    <PlusCircle size={13} /> Nouveau paiement
                  </button>
                </div>
                {expenses.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: T.textMuted }}>
                    <Receipt size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: .25 }} />
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Aucun paiement enregistré</p>
                    <p style={{ fontSize: 12 }}>Ajoutez le premier paiement pour cet entrepreneur.</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: T.bg }}>
                        {['Date', 'Catégorie', 'Note', 'Montant'].map(h => (
                          <th key={h} style={{ padding: '11px 18px', textAlign: h === 'Montant' ? 'right' : 'left', fontSize: 10, fontWeight: 700, letterSpacing: .8, textTransform: 'uppercase', color: T.textMuted, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e, i) => (
                        <tr key={e.id} className="cp-row-hover" style={{ borderBottom: `1px solid ${T.border}`, transition: 'background .12s' }}>
                          <td style={{ padding: '14px 18px', fontSize: 13, color: T.textSec, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Calendar size={12} color={T.textMuted} />
                              {fmtD(e.date)}
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px' }}><Tag color={T.accent}>{e.category}</Tag></td>
                          <td style={{ padding: '14px 18px', fontSize: 13, color: T.textMuted, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.note || '—'}</td>
                          <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: 15, fontWeight: 900, color: T.textPri, whiteSpace: 'nowrap' }}>
                            {fmt(e.amount)} <span style={{ fontSize: 10, color: T.textMuted }}>TND</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Documents ── */}
          {activeTab === 'documents' && (
            <div style={{ animation: 'fadeIn .2s ease', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
              <div style={{ background: T.surface, borderRadius: T.rL, border: `1px solid ${T.border}`, boxShadow: T.sh, overflow: 'hidden' }}>
                <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: T.textPri }}>Documents & Paperasse</span>
                  <Tag color={T.accent}><Layers size={11} /> {documents.length} fichier(s)</Tag>
                </div>
                {documents.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: T.textMuted }}>
                    <FileText size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: .25 }} />
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Aucun document</p>
                    <p style={{ fontSize: 12 }}>Joignez des factures, devis ou bons de commande.</p>
                  </div>
                ) : (
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {documents.map(doc => (
                      <div key={doc.id} className="cp-doc-row"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1px solid ${T.border}`, transition: 'background .12s', background: T.surface }}>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: `${T.accent}10`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, overflow: 'hidden', border: `1px solid ${T.border}`
                          }}>
                            {doc.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <img src={`${API}${doc.url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            ) : (
                              <FileText size={16} color={T.accent} />
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: T.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{fmtD(doc.createdAt)}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setPreviewDoc(doc)}
                            style={{ width: 30, height: 30, borderRadius: 8, background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.accent, border: `1.5px solid ${T.accent}33`, cursor: 'pointer' }}>
                            <Eye size={13} />
                          </button>
                          <a href={`${API}${doc.url}`} download target="_blank" rel="noopener noreferrer"
                            style={{ width: 30, height: 30, borderRadius: 8, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textSec, textDecoration: 'none', border: `1px solid ${T.border}` }}>
                            <Download size={13} />
                          </a>
                          <button onClick={() => handleDeleteDoc(doc.id)}
                            style={{ width: 30, height: 30, borderRadius: 8, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.danger, border: `1px solid #fecaca`, cursor: 'pointer' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* upload panel */}
              <div style={{ background: T.surface, borderRadius: T.rL, padding: '24px', border: `1px solid ${T.border}`, boxShadow: T.sh, alignSelf: 'start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${T.primary}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={16} color={T.primary} />
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 15, color: T.textPri }}>Nouveau document</span>
                </div>
                <form onSubmit={handleUploadDoc} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Field label="NOM DU DOCUMENT">
                    <input name="docname" placeholder="ex: Facture #12, Devis béton…" required
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = T.primary}
                      onBlur={e => e.target.style.borderColor = T.border} />
                  </Field>
                  <Field label="FICHIER">
                    <input type="file" name="file" required
                      style={{ ...inputStyle, fontSize: 12, padding: '8px 12px', cursor: 'pointer' }} />
                  </Field>
                  <button type="submit"
                    style={{ padding: '11px', borderRadius: T.r, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Upload size={14} /> Joindre le document
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── TAB: Supplies ── */}
          {activeTab === 'supplies' && (
            <div style={{ animation: 'fadeIn .2s ease', maxWidth: 700 }}>
              <div style={{ background: T.surface, borderRadius: T.rL, padding: '28px', border: `1px solid ${T.border}`, boxShadow: T.sh }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${T.warn}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={16} color={T.warn} />
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 15, color: T.textPri }}>Fournitures & Matériaux à charge</span>
                </div>
                {contractor.suppliesDetails ? (
                  <div style={{ background: T.bg, borderRadius: T.rL, padding: '18px 20px', border: `1px solid ${T.border}`, lineHeight: 1.8, color: T.textSec, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                    {contractor.suppliesDetails}
                  </div>
                ) : (
                  <div style={{ background: T.bg, borderRadius: T.rL, padding: '36px', textAlign: 'center', border: `2px dashed ${T.border}` }}>
                    <Package size={32} style={{ display: 'block', margin: '0 auto 12px', color: T.textMuted, opacity: .4 }} />
                    <p style={{ color: T.textMuted, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Aucune note sur les fournitures</p>
                    <p style={{ color: T.textMuted, fontSize: 12 }}>Modifiez le profil pour ajouter les matériaux à la charge de cet entrepreneur.</p>
                    <button onClick={() => setEditOpen(true)}
                      style={{ marginTop: 14, padding: '8px 18px', borderRadius: T.r, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                      Modifier le profil
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit modal ── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le profil">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="NOM COMPLET">
              <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={inputStyle}
                onFocus={e => e.target.style.borderColor = T.primary} onBlur={e => e.target.style.borderColor = T.border} />
            </Field>
            <Field label="SPÉCIALITÉ">
              <input value={editForm.specialty} onChange={e => setEditForm(p => ({ ...p, specialty: e.target.value }))} placeholder="Maçon, Électricien…" style={inputStyle}
                onFocus={e => e.target.style.borderColor = T.primary} onBlur={e => e.target.style.borderColor = T.border} />
            </Field>
            <Field label="TÉLÉPHONE">
              <input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle}
                onFocus={e => e.target.style.borderColor = T.primary} onBlur={e => e.target.style.borderColor = T.border} />
            </Field>
            <Field label="TAILLE DE L'ÉQUIPE">
              <input type="number" min={1} value={editForm.teamSize} onChange={e => setEditForm(p => ({ ...p, teamSize: parseInt(e.target.value) || 1 }))} style={inputStyle}
                onFocus={e => e.target.style.borderColor = T.primary} onBlur={e => e.target.style.borderColor = T.border} />
            </Field>
            <Field label="BUDGET GLOBAL (TND)">
              <input type="number" min={0} value={editForm.totalBudget} onChange={e => setEditForm(p => ({ ...p, totalBudget: parseFloat(e.target.value) || 0 }))} style={inputStyle}
                onFocus={e => e.target.style.borderColor = T.primary} onBlur={e => e.target.style.borderColor = T.border} />
            </Field>
            <Field label="AVANCE VERSÉE (TND)">
              <input type="number" min={0} value={editForm.advancePaid} onChange={e => setEditForm(p => ({ ...p, advancePaid: parseFloat(e.target.value) || 0 }))} style={inputStyle}
                onFocus={e => e.target.style.borderColor = T.primary} onBlur={e => e.target.style.borderColor = T.border} />
            </Field>
          </div>
          <Field label="FOURNITURES & MATÉRIAUX À CHARGE">
            <textarea value={editForm.suppliesDetails} onChange={e => setEditForm(p => ({ ...p, suppliesDetails: e.target.value }))}
              placeholder="Liste des matériaux fournis par cet entrepreneur…"
              rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = T.primary} onBlur={e => e.target.style.borderColor = T.border} />
          </Field>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => setEditOpen(false)}
              style={{ padding: '9px 20px', borderRadius: T.r, background: 'none', border: `1.5px solid ${T.border}`, cursor: 'pointer', fontWeight: 700, color: T.textSec, fontSize: 13 }}>
              Annuler
            </button>
            <button onClick={handleEdit} disabled={saving}
              style={{ padding: '9px 22px', borderRadius: T.r, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? .7 : 1 }}>
              <Save size={14} /> {saving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add payment modal ── */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Enregistrer un paiement">
        <Field label="MONTANT (TND)">
          <input type="number" min={0} step={0.5} placeholder="0.00"
            value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
            style={{ ...inputStyle, fontSize: 18, fontWeight: 800, textAlign: 'center' }}
            onFocus={e => e.target.style.borderColor = T.primary} onBlur={e => e.target.style.borderColor = T.border} />
        </Field>
        <Field label="DATE">
          <input type="date" value={payForm.date} onChange={e => setPayForm(p => ({ ...p, date: e.target.value }))}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = T.primary} onBlur={e => e.target.style.borderColor = T.border} />
        </Field>
        <Field label="NOTE (optionnel)">
          <input placeholder="ex: Acompte 2ème tranche, Solde final…"
            value={payForm.note} onChange={e => setPayForm(p => ({ ...p, note: e.target.value }))}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = T.primary} onBlur={e => e.target.style.borderColor = T.border} />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={() => setPayOpen(false)}
            style={{ padding: '9px 20px', borderRadius: T.r, background: 'none', border: `1.5px solid ${T.border}`, cursor: 'pointer', fontWeight: 700, color: T.textSec, fontSize: 13 }}>
            Annuler
          </button>
          <button onClick={handlePay} disabled={saving || !payForm.amount}
            style={{ padding: '9px 22px', borderRadius: T.r, background: T.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, opacity: (saving || !payForm.amount) ? .6 : 1 }}>
            <CheckCircle size={14} /> {saving ? 'Enregistrement…' : 'Valider le paiement'}
          </button>
        </div>
      </Modal>

      {/* ── Preview modal ── */}
      {previewDoc && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40,
        }} onClick={() => setPreviewDoc(null)}>
          <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 12 }}>
            <a href={`${API}${previewDoc.url}`} download style={{ background: 'white', color: '#0f172a', padding: '10px 20px', borderRadius: 12, fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Download size={18} /> Télécharger
            </a>
            <button onClick={() => setPreviewDoc(null)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: 12, borderRadius: 12, cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>

          <div style={{ maxWidth: '90%', maxHeight: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
            {previewDoc.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img src={`${API}${previewDoc.url}`} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }} alt={previewDoc.name} />
            ) : (
              <div style={{ background: 'white', padding: 60, borderRadius: 24, textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
                <FileText size={80} color={T.accent} style={{ marginBottom: 24 }} />
                <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>{previewDoc.name}</h3>
                <p style={{ color: T.textMuted, marginBottom: 32 }}>Ce type de fichier ne peut pas être prévisualisé directement.</p>
                <a href={`${API}${previewDoc.url}`} target="_blank" rel="noreferrer" style={{ background: T.primary, color: 'white', padding: '14px 32px', borderRadius: 12, fontWeight: 800, textDecoration: 'none', display: 'inline-block' }}>
                  Ouvrir dans un nouvel onglet
                </a>
              </div>
            )}
          </div>
          <div style={{ marginTop: 24, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{previewDoc.name}</div>
        </div>
      )}
    </>
  );
}