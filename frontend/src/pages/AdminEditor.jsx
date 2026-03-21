import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BlocklyWorkspace from '../components/BlocklyWorkspace.jsx';

const ALL_CATEGORIES = ['Logic', 'Loops', 'Math', 'Text', 'Variables', 'Functions', 'Lists'];

const S = {
  container: { maxWidth: 1100, margin: '28px auto', padding: '0 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  h1: { fontSize: '1.3rem', fontWeight: 700, color: '#2d3748' },
  card: { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 },
  label: { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#718096', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.92rem', outline: 'none', marginBottom: 16 },
  textarea: { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.88rem', fontFamily: 'monospace', resize: 'vertical', outline: 'none', marginBottom: 16 },
  select: { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.92rem', outline: 'none', marginBottom: 16, background: '#fff' },
  row: { display: 'flex', gap: 20 },
  btn: { padding: '10px 24px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.92rem' },
  btnRow: { display: 'flex', gap: 12 },
  outputPanel: { background: '#1a202c', color: '#e2e8f0', borderRadius: 6, padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.85rem', minHeight: 80, marginTop: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  outputError: { color: '#fc8181' },
};

function runCode(code) {
  const logs = [];
  const mockConsole = { log: (...args) => logs.push(args.map(String).join(' ')) };
  try {
    const fn = new Function('console', code);
    const result = fn(mockConsole);
    if (result !== undefined) logs.push(String(result));
    return { output: logs.join('\n') || '(no output)', error: null };
  } catch (e) {
    return { output: null, error: e.message };
  }
}

export default function AdminEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({ code: '', title: '', description: '', expectedOutput: '', createdBy: 'admin', gradingMode: 'OUTPUT_MATCH', allowedBlocks: null });
  const [selectedCategories, setSelectedCategories] = useState([...ALL_CATEGORIES]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [initialBlocklyState, setInitialBlocklyState] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/exercises/${id}`)
      .then(r => r.json())
      .then(data => {
        const rawAllowedBlocks = data.version?.allowedBlocks || null;
        setForm({
          code: data.code,
          title: data.title,
          description: data.version?.description || '',
          expectedOutput: data.version?.expectedOutput || '',
          createdBy: data.version?.createdBy || 'admin',
          gradingMode: data.version?.gradingMode || 'OUTPUT_MATCH',
          allowedBlocks: rawAllowedBlocks,
        });
        if (rawAllowedBlocks) {
          try { setSelectedCategories(JSON.parse(rawAllowedBlocks)); } catch { setSelectedCategories([...ALL_CATEGORIES]); }
        } else {
          setSelectedCategories([...ALL_CATEGORIES]);
        }
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
    const allSelected = selectedCategories.length === ALL_CATEGORIES.length && ALL_CATEGORIES.every(c => selectedCategories.includes(c));
    const allowedBlocks = allSelected ? null : JSON.stringify(selectedCategories);

    setSaving(true);
    try {
      const url = isEdit ? `/api/exercises/${id}` : '/api/exercises';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, blocklyState, allowedBlocks }),
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

  const handleRun = () => {
    if (!wsRef.current) return;
    const code = wsRef.current.getCode();
    const result = runCode(code);
    setRunResult(result);
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
          <button style={{ ...S.btn, background: '#38a169', color: '#fff' }}
            onClick={handleRun}>Run</button>
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

            <label style={S.label}>Grading Mode</label>
            <select style={S.select} value={form.gradingMode} onChange={set('gradingMode')}>
              <option value="OUTPUT_MATCH">OUTPUT_MATCH</option>
              <option value="TRACE_MATCH">TRACE_MATCH</option>
            </select>

            {form.gradingMode === 'OUTPUT_MATCH' && (
              <>
                <label style={S.label}>Test Cases (JSON array)</label>
                <textarea style={{ ...S.textarea, background: '#f7fafc' }} rows={4}
                  value={form.expectedOutput} onChange={set('expectedOutput')}
                  placeholder={'[{"input": "add(1, 2)", "expected": "3"}]'} />
              </>
            )}

            {form.gradingMode === 'TRACE_MATCH' && (
              <>
                <label style={S.label}>Expected Trace (JSON array)</label>
                <textarea style={{ ...S.textarea, background: '#f7fafc' }} rows={4}
                  value={form.expectedOutput} onChange={set('expectedOutput')}
                  placeholder={'["step1", "loop", "end"]'} />
              </>
            )}

            <label style={S.label}>Allowed Blocks for Students</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginBottom: 16 }}>
              {ALL_CATEGORIES.map(cat => (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.88rem', color: '#4a5568', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedCategories(prev => [...prev, cat]);
                      } else {
                        setSelectedCategories(prev => prev.filter(c => c !== cat));
                      }
                    }}
                  />
                  {cat}
                </label>
              ))}
            </div>
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
            {runResult && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#718096', marginBottom: 4 }}>Output:</div>
                <div style={{ ...S.outputPanel, ...(runResult.error ? S.outputError : {}) }}>
                  {runResult.error ? `Error: ${runResult.error}` : runResult.output}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
