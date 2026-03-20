import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BlocklyWorkspace from '../components/BlocklyWorkspace.jsx';

const S = {
  container: { maxWidth: 1100, margin: '28px auto', padding: '0 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  h1: { fontSize: '1.3rem', fontWeight: 700, color: '#2d3748' },
  card: { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 },
  label: { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#718096', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.92rem', outline: 'none', marginBottom: 16 },
  textarea: { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.88rem', fontFamily: 'monospace', resize: 'vertical', outline: 'none', marginBottom: 16 },
  row: { display: 'flex', gap: 20 },
  btn: { padding: '10px 24px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.92rem' },
  btnRow: { display: 'flex', gap: 12 },
};

export default function AdminEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({ code: '', title: '', description: '', expectedOutput: '', createdBy: 'admin' });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [initialBlocklyState, setInitialBlocklyState] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/exercises/${id}`)
      .then(r => r.json())
      .then(data => {
        setForm({
          code: data.code,
          title: data.title,
          description: data.version?.description || '',
          expectedOutput: data.version?.expectedOutput || '',
          createdBy: data.version?.createdBy || 'admin',
        });
        // Load saved blockly state for reference solution
        if (data.version?.blocklyState) {
          try {
            setInitialBlocklyState(JSON.parse(data.version.blocklyState));
          } catch {
            setInitialBlocklyState(data.version.blocklyState);
          }
        }
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.code.trim()) { alert('Code and title are required.'); return; }
    if (!form.description.trim()) { alert('Description is required.'); return; }
    if (!form.expectedOutput.trim()) { alert('Expected output is required.'); return; }

    const blocklyState = wsRef.current ? JSON.stringify(wsRef.current.getState()) : '{}';

    setSaving(true);
    try {
      const url = isEdit ? `/api/exercises/${id}` : '/api/exercises';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, blocklyState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      alert('Saved successfully!');
      navigate('/admin');
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <h1 style={S.h1}>{isEdit ? 'Edit Exercise' : 'New Exercise'}</h1>
        <div style={S.btnRow}>
          <button style={{ ...S.btn, background: '#e2e8f0', color: '#4a5568' }}
            onClick={() => navigate('/admin')}>Cancel</button>
          <button style={{ ...S.btn, background: '#2b6cb0', color: '#fff' }}
            onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div style={S.row}>
        <div style={{ flex: 1 }}>
          <div style={S.card}>
            <h2 style={{ fontSize: '1rem', marginBottom: 16, color: '#2d3748' }}>Exercise Info</h2>

            <label style={S.label}>Exercise Code (unique identifier, cannot change after creation)</label>
            <input style={{ ...S.input, ...(isEdit ? { background: '#f7fafc', color: '#a0aec0' } : {}) }}
              value={form.code} onChange={set('code')} placeholder="e.g. ex001" readOnly={isEdit} />

            <label style={S.label}>Title</label>
            <input style={S.input} value={form.title} onChange={set('title')} placeholder="Exercise title" />

            <label style={S.label}>Description (visible to students)</label>
            <textarea style={S.textarea} rows={6} value={form.description}
              onChange={set('description')} placeholder="Describe the exercise requirements..." />

            <label style={S.label}>Expected Output (what the program should print)</label>
            <textarea style={{ ...S.textarea, background: '#f7fafc' }} rows={4}
              value={form.expectedOutput} onChange={set('expectedOutput')} placeholder="Hello World" />
          </div>
        </div>

        <div style={{ flex: 1.4 }}>
          <div style={S.card}>
            <h2 style={{ fontSize: '1rem', marginBottom: 4, color: '#2d3748' }}>Reference Solution</h2>
            <p style={{ fontSize: '0.82rem', color: '#718096', marginBottom: 16 }}>
              Build the reference answer using blocks below.
              {isEdit && ' Previous answer has been loaded.'}
            </p>
            <div style={{ height: 480 }}>
              {/* Only render BlocklyWorkspace after data is loaded to ensure initialState is applied */}
              {(!isEdit || !loading) && (
                <BlocklyWorkspace
                  key={isEdit ? `edit-${id}` : 'new'}
                  onWorkspaceReady={api => { wsRef.current = api; }}
                  initialState={initialBlocklyState}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
