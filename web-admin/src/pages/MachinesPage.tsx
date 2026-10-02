import { useState, useEffect } from 'react';
import { api, parseApiError } from '../lib/api';

interface Machine {
  id: string;
  name: string;
  description: string | null;
  status: 'AVAILABLE' | 'IN_USE' | 'UNDER_REPAIR';
  isActive: boolean;
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add machine form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadMachines();
  }, []);

  async function loadMachines() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<Machine[]>('/machines/admin/all');
      setMachines(res.data);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleRepair(machine: Machine) {
    setActionError(null);
    try {
      const res = await api.patch<Machine>(`/machines/${machine.id}/toggle-repair`);
      setMachines((prev) => prev.map((m) => (m.id === machine.id ? res.data : m)));
    } catch (e) {
      setActionError(parseApiError(e));
    }
  }

  async function handleDeactivate(machine: Machine) {
    if (!confirm(`Deactivate "${machine.name}"? This will block all its future slots.`)) return;
    setActionError(null);
    try {
      await api.delete(`/machines/${machine.id}`);
      setMachines((prev) => prev.map((m) => m.id === machine.id ? { ...m, isActive: false } : m));
    } catch (e) {
      setActionError(parseApiError(e));
    }
  }

  async function handleAddMachine(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsAdding(true);
    setActionError(null);
    try {
      const res = await api.post<Machine>('/machines', {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      });
      setMachines((prev) => [...prev, res.data]);
      setNewName('');
      setNewDesc('');
      setShowAddForm(false);
    } catch (e) {
      setActionError(parseApiError(e));
    } finally {
      setIsAdding(false);
    }
  }

  const statusColor: Record<string, string> = {
    AVAILABLE: '#2D6A4F',
    IN_USE: '#6C757D',
    UNDER_REPAIR: '#DC2626',
  };

  const statusLabel: Record<string, string> = {
    AVAILABLE: 'Available',
    IN_USE: 'In Use',
    UNDER_REPAIR: 'Under Repair',
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Machines</h1>
          <p style={s.subtitle}>Manage washing machines and repair status</p>
        </div>
        <button style={s.addBtn} onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? '✕ Cancel' : '+ Add Machine'}
        </button>
      </div>

      {/* Action error */}
      {actionError && (
        <div style={s.errorBanner}>
          ⚠️ {actionError}
          <button style={s.closeBtn} onClick={() => setActionError(null)}>×</button>
        </div>
      )}

      {/* Add Machine Form */}
      {showAddForm && (
        <div style={s.formCard}>
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>New Machine</h3>
          <form onSubmit={handleAddMachine}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Name *</label>
              <input
                style={s.input}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Machine 3"
                required
              />
            </div>
            <div style={{ ...s.fieldGroup, marginBottom: 16 }}>
              <label style={s.label}>Location / Description</label>
              <input
                style={s.input}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Second floor laundry room"
              />
            </div>
            <button
              type="submit"
              disabled={isAdding || !newName.trim()}
              style={{ ...s.addBtn, opacity: isAdding || !newName.trim() ? 0.6 : 1 }}
            >
              {isAdding ? 'Adding...' : 'Add Machine'}
            </button>
          </form>
        </div>
      )}

      {/* Machine List */}
      {isLoading ? (
        <p style={{ color: '#666', padding: '24px 0' }}>Loading machines...</p>
      ) : error ? (
        <div style={s.errorBanner}>⚠️ {error} <button style={s.closeBtn} onClick={loadMachines}>Retry</button></div>
      ) : machines.length === 0 ? (
        <div style={s.emptyState}>
          <span style={{ fontSize: 40 }}>🧺</span>
          <p style={{ marginTop: 12, color: '#666' }}>No machines yet. Add one above.</p>
        </div>
      ) : (
        <div style={s.grid}>
          {machines.map((machine) => (
            <div
              key={machine.id}
              style={{
                ...s.card,
                opacity: machine.isActive ? 1 : 0.5,
                borderColor: statusColor[machine.status] + '44',
              }}
            >
              {/* Status dot + name */}
              <div style={s.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      ...s.statusDot,
                      background: machine.isActive ? statusColor[machine.status] : '#9CA3AF',
                    }}
                  />
                  <div>
                    <p style={s.machineName}>{machine.name}</p>
                    {machine.description && (
                      <p style={s.machineDesc}>{machine.description}</p>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <span
                  style={{
                    ...s.badge,
                    color: machine.isActive ? statusColor[machine.status] : '#9CA3AF',
                    background: (machine.isActive ? statusColor[machine.status] : '#9CA3AF') + '18',
                  }}
                >
                  {machine.isActive ? statusLabel[machine.status] : 'Inactive'}
                </span>
              </div>

              {/* Actions */}
              {machine.isActive && (
                <div style={s.actions}>
                  <button
                    style={{
                      ...s.actionBtn,
                      color: machine.status === 'UNDER_REPAIR' ? '#2D6A4F' : '#DC2626',
                      borderColor: machine.status === 'UNDER_REPAIR' ? '#2D6A4F44' : '#DC262644',
                    }}
                    onClick={() => handleToggleRepair(machine)}
                  >
                    {machine.status === 'UNDER_REPAIR' ? '✓ Mark Repaired' : '🔧 Mark Under Repair'}
                  </button>
                  <button
                    style={{ ...s.actionBtn, color: '#6B7280', borderColor: '#E5E7EB' }}
                    onClick={() => handleDeactivate(machine)}
                  >
                    Deactivate
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: { padding: 32, maxWidth: 900, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  addBtn: { padding: '10px 18px', background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  errorBanner: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 },
  closeBtn: { marginLeft: 'auto', background: 'none', border: 'none', color: '#DC2626', fontSize: 18, cursor: 'pointer', padding: 0 },
  formCard: { background: '#fff', borderRadius: 14, padding: 24, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB' },
  fieldGroup: { marginBottom: 12 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 },
  input: { width: '100%', padding: '9px 13px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, boxSizing: 'border-box', background: '#F9FAFB' },
  emptyState: { textAlign: 'center', padding: '60px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  card: { background: '#fff', borderRadius: 14, padding: 20, border: '1.5px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  statusDot: { width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 3 },
  machineName: { fontSize: 15, fontWeight: 600, color: '#1a1a2e', margin: 0 },
  machineDesc: { fontSize: 12, color: '#6B7280', margin: '2px 0 0' },
  badge: { fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  actionBtn: { padding: '7px 14px', background: 'none', border: '1.5px solid', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
};
