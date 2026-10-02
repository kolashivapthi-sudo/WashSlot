import { useState, useEffect, FormEvent } from 'react';
import { api, parseApiError } from '../lib/api';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Schedule {
  id: string;
  openTime: string;
  closeTime: string;
  slotDuration: number;
  bufferDuration: number;
  dayType: string;
  specificDate: string | null;
  createdAt: string;
}

interface BlockedRange {
  id: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  dayType: string;
}

const DAY_TYPES = [
  { value: 'ALL', label: 'All Days' },
  { value: 'WEEKDAY', label: 'Weekdays (Mon–Fri)' },
  { value: 'WEEKEND', label: 'Weekends (Sat–Sun)' },
  { value: 'SUNDAY', label: 'Sundays Only' },
  { value: 'HOLIDAY', label: 'Holiday (specific date)' },
  { value: 'SPECIFIC', label: 'Specific Date' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingBlocked, setLoadingBlocked] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Schedule form state
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('22:00');
  const [slotDuration, setSlotDuration] = useState(30);
  const [bufferDuration, setBufferDuration] = useState(10);
  const [dayType, setDayType] = useState('ALL');
  const [specificDate, setSpecificDate] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Block range form state
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockDayType, setBlockDayType] = useState('SPECIFIC');
  const [savingBlock, setSavingBlock] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoadingSchedules(true);
    setLoadingBlocked(true);
    try {
      const [sRes, bRes] = await Promise.all([
        api.get<Schedule[]>('/admin/schedules'),
        api.get<BlockedRange[]>('/admin/blocked-ranges'),
      ]);
      setSchedules(sRes.data);
      setBlockedRanges(bRes.data);
    } catch (e) {
      setActionError(parseApiError(e));
    } finally {
      setLoadingSchedules(false);
      setLoadingBlocked(false);
    }
  }

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  }

  // ─── Save schedule ─────────────────────────────────────────────────────────

  async function handleSaveSchedule(e: FormEvent) {
    e.preventDefault();
    setActionError(null);
    setSavingSchedule(true);
    try {
      await api.post('/admin/schedules', {
        openTime,
        closeTime,
        slotDuration,
        bufferDuration,
        dayType,
        specificDate: (dayType === 'SPECIFIC' || dayType === 'HOLIDAY') ? specificDate : undefined,
      });
      // Trigger slot regeneration after saving
      await api.post('/admin/slots/generate');
      flash('Schedule saved and slots regenerated.');
      loadAll();
    } catch (e) {
      setActionError(parseApiError(e));
    } finally {
      setSavingSchedule(false);
    }
  }

  // ─── Deactivate schedule ───────────────────────────────────────────────────

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this schedule? Existing booked slots are not affected.')) return;
    setActionError(null);
    try {
      await api.delete(`/admin/schedules/${id}`);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      flash('Schedule deactivated.');
    } catch (e) {
      setActionError(parseApiError(e));
    }
  }

  // ─── Block range ───────────────────────────────────────────────────────────

  async function handleBlockRange(e: FormEvent) {
    e.preventDefault();
    setActionError(null);
    setSavingBlock(true);
    try {
      await api.post('/admin/blocked-ranges', {
        startTime: new Date(blockStart).toISOString(),
        endTime: new Date(blockEnd).toISOString(),
        reason: blockReason || undefined,
        dayType: blockDayType,
      });
      flash('Time range blocked. Affected slots are now unavailable.');
      setBlockStart('');
      setBlockEnd('');
      setBlockReason('');
      loadAll();
    } catch (e) {
      setActionError(parseApiError(e));
    } finally {
      setSavingBlock(false);
    }
  }

  // ─── Remove block ──────────────────────────────────────────────────────────

  async function handleRemoveBlock(id: string) {
    if (!confirm('Remove this block? Affected slots will become available again.')) return;
    setActionError(null);
    try {
      await api.delete(`/admin/blocked-ranges/${id}`);
      setBlockedRanges((prev) => prev.filter((b) => b.id !== id));
      flash('Block removed. Slots restored.');
    } catch (e) {
      setActionError(parseApiError(e));
    }
  }

  const needsDate = dayType === 'SPECIFIC' || dayType === 'HOLIDAY';

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <h1 style={s.title}>Slot Schedule</h1>
        <p style={s.subtitle}>Configure operating hours, slot duration, and blocked ranges</p>
      </div>

      {/* Success / Error banners */}
      {successMsg && <div style={s.successBanner}>✓ {successMsg}</div>}
      {actionError && (
        <div style={s.errorBanner}>
          ⚠️ {actionError}
          <button style={s.closeBtn} onClick={() => setActionError(null)}>×</button>
        </div>
      )}

      <div style={s.twoCol}>
        {/* ─── Left: Schedule Config ─────────────────────────── */}
        <div>
          <div style={s.card}>
            <h2 style={s.cardTitle}>Operating Hours</h2>
            <p style={s.cardSubtitle}>Set when slots are available for booking</p>

            <form onSubmit={handleSaveSchedule}>
              {/* Day type */}
              <div style={s.field}>
                <label style={s.label}>Apply To</label>
                <select
                  style={s.select}
                  value={dayType}
                  onChange={(e) => setDayType(e.target.value)}
                >
                  {DAY_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Specific date (only when needed) */}
              {needsDate && (
                <div style={s.field}>
                  <label style={s.label}>Date *</label>
                  <input
                    type="date"
                    style={s.input}
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Open / Close time */}
              <div style={s.row}>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Open From</label>
                  <input type="time" style={s.input} value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)} required />
                </div>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Open Until</label>
                  <input type="time" style={s.input} value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)} required />
                </div>
              </div>

              {/* Duration / Buffer */}
              <div style={s.row}>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Slot Duration (min)</label>
                  <input type="number" style={s.input} value={slotDuration} min={15} max={120}
                    onChange={(e) => setSlotDuration(Number(e.target.value))} required />
                </div>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Buffer (min)</label>
                  <input type="number" style={s.input} value={bufferDuration} min={0} max={60}
                    onChange={(e) => setBufferDuration(Number(e.target.value))} required />
                </div>
              </div>

              {/* Preview */}
              <div style={s.preview}>
                <span style={s.previewLabel}>Preview:</span>{' '}
                Each slot is <strong>{slotDuration} min</strong> with a{' '}
                <strong>{bufferDuration} min</strong> buffer.{' '}
                Next slot starts <strong>{slotDuration + bufferDuration} min</strong> after previous.
              </div>

              <button
                type="submit"
                disabled={savingSchedule}
                style={{ ...s.primaryBtn, opacity: savingSchedule ? 0.6 : 1 }}
              >
                {savingSchedule ? 'Saving...' : 'Save & Generate Slots'}
              </button>
            </form>
          </div>

          {/* ─── Active Schedules List ──────────────────────── */}
          <div style={{ ...s.card, marginTop: 20 }}>
            <h2 style={s.cardTitle}>Active Schedules</h2>
            {loadingSchedules ? (
              <p style={s.muted}>Loading...</p>
            ) : schedules.length === 0 ? (
              <p style={s.muted}>No schedules yet.</p>
            ) : (
              schedules.map((sc) => (
                <div key={sc.id} style={s.listRow}>
                  <div>
                    <p style={s.listMain}>
                      {sc.openTime} – {sc.closeTime}
                      {' · '}{sc.slotDuration}min slots{' · '}{sc.bufferDuration}min buffer
                    </p>
                    <p style={s.listSub}>
                      {DAY_TYPES.find((d) => d.value === sc.dayType)?.label ?? sc.dayType}
                      {sc.specificDate ? ` — ${sc.specificDate.slice(0, 10)}` : ''}
                    </p>
                  </div>
                  <button style={s.dangerBtn} onClick={() => handleDeactivate(sc.id)}>
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Right: Block Ranges ───────────────────────────── */}
        <div>
          <div style={s.card}>
            <h2 style={s.cardTitle}>Block Time Range</h2>
            <p style={s.cardSubtitle}>Prevent bookings during specific periods</p>

            <form onSubmit={handleBlockRange}>
              <div style={s.field}>
                <label style={s.label}>Apply To</label>
                <select style={s.select} value={blockDayType}
                  onChange={(e) => setBlockDayType(e.target.value)}>
                  {DAY_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div style={s.row}>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Block From</label>
                  <input type="datetime-local" style={s.input} value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)} required />
                </div>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Block Until</label>
                  <input type="datetime-local" style={s.input} value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)} required />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Reason (optional)</label>
                <input
                  style={s.input}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. College event, Maintenance"
                />
              </div>

              <button
                type="submit"
                disabled={savingBlock}
                style={{ ...s.primaryBtn, background: '#DC2626', opacity: savingBlock ? 0.6 : 1 }}
              >
                {savingBlock ? 'Blocking...' : 'Block This Range'}
              </button>
            </form>
          </div>

          {/* ─── Active Blocked Ranges List ─────────────────── */}
          <div style={{ ...s.card, marginTop: 20 }}>
            <h2 style={s.cardTitle}>Active Blocks</h2>
            {loadingBlocked ? (
              <p style={s.muted}>Loading...</p>
            ) : blockedRanges.length === 0 ? (
              <p style={s.muted}>No active blocks.</p>
            ) : (
              blockedRanges.map((b) => (
                <div key={b.id} style={s.listRow}>
                  <div>
                    <p style={s.listMain}>
                      {new Date(b.startTime).toLocaleString()} →{' '}
                      {new Date(b.endTime).toLocaleString()}
                    </p>
                    <p style={s.listSub}>
                      {DAY_TYPES.find((d) => d.value === b.dayType)?.label ?? b.dayType}
                      {b.reason ? ` — ${b.reason}` : ''}
                    </p>
                  </div>
                  <button style={s.dangerBtn} onClick={() => handleRemoveBlock(b.id)}>
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { padding: 32, maxWidth: 1100, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  pageHeader: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' },
  card: { background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' },
  cardSubtitle: { fontSize: 13, color: '#6B7280', margin: '0 0 20px' },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, boxSizing: 'border-box' as const, background: '#F9FAFB' },
  select: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, background: '#F9FAFB' },
  row: { display: 'flex', gap: 12 },
  preview: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534', marginBottom: 16 },
  previewLabel: { fontWeight: 600 },
  primaryBtn: { width: '100%', padding: '11px', background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  dangerBtn: { padding: '6px 12px', background: 'none', border: '1.5px solid #FECACA', color: '#DC2626', borderRadius: 8, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  listRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6', gap: 12 },
  listMain: { fontSize: 14, fontWeight: 500, color: '#1a1a2e', margin: 0 },
  listSub: { fontSize: 12, color: '#6B7280', margin: '2px 0 0' },
  muted: { color: '#9CA3AF', fontSize: 14 },
  successBanner: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#166534', marginBottom: 16 },
  errorBanner: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  closeBtn: { marginLeft: 'auto', background: 'none', border: 'none', color: '#DC2626', fontSize: 18, cursor: 'pointer', padding: 0 },
};
