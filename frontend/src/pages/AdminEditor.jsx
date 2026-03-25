import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BlocklyWorkspace from '../components/BlocklyWorkspace.jsx';
import { apiGet, apiPost, apiPut } from '../api.js';
import { useToast } from '../components/Toast.jsx';

const BLOCKLY_CATEGORIES = [
  { category: "Logic", blocks: [
    { type: "controls_if", label: "If" },
    { type: "logic_compare", label: "Compare" },
    { type: "logic_operation", label: "And / Or" },
    { type: "logic_negate", label: "Not" },
    { type: "logic_boolean", label: "True / False" },
  ]},
  { category: "Loops", blocks: [
    { type: "controls_repeat_ext", label: "Repeat" },
    { type: "controls_whileUntil", label: "While" },
    { type: "controls_for", label: "For" },
    { type: "controls_forEach", label: "For Each" },
  ]},
  { category: "Math", blocks: [
    { type: "math_number", label: "Number" },
    { type: "math_arithmetic", label: "Arithmetic" },
    { type: "math_single", label: "Math Functions" },
    { type: "math_round", label: "Round" },
    { type: "math_modulo", label: "Modulo" },
  ]},
  { category: "Text", blocks: [
    { type: "text", label: "Text" },
    { type: "text_print", label: "Print" },
    { type: "text_length", label: "Length" },
    { type: "text_join", label: "Join" },
  ]},
  { category: "Lists", blocks: [
    { type: "lists_create_with", label: "Create List" },
    { type: "lists_length", label: "Length" },
    { type: "lists_getIndex", label: "Get Item" },
    { type: "lists_setIndex", label: "Set Item" },
  ]},
  { category: "Variables", blocks: [
    { type: "variables_get", label: "Get Variable" },
    { type: "variables_set", label: "Set Variable" },
  ]},
  { category: "Functions", blocks: [
    { type: "procedures_defnoreturn", label: "Define (no return)" },
    { type: "procedures_defreturn", label: "Define (return)" },
    { type: "procedures_callnoreturn", label: "Call (no return)" },
    { type: "procedures_callreturn", label: "Call (return)" },
  ]},
];

const S = {
  container: { maxWidth: 1100, margin: '28px auto', padding: '0 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, position: 'sticky', top: 0, zIndex: 10, background: '#f7fafc', padding: '12px 0', borderBottom: '1px solid #e2e8f0' },
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
  const mockPrint = (...args) => logs.push(args.map(String).join(' '));
  const mockConsole = { log: mockPrint };
  try {
    const fn = new Function('console', 'print', code);
    const result = fn(mockConsole, mockPrint);
    if (result !== undefined) logs.push(String(result));
    return { output: logs.join('\n') || '(no output)', error: null };
  } catch (e) {
    return { output: null, error: e.message };
  }
}

export default function AdminEditor() {
  const toast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({ code: '', title: '', description: '', expectedOutput: '', createdBy: 'admin', allowedBlocks: null, category: '', difficulty: 'MEDIUM' });
  const [aspects, setAspects] = useState([{ type: 'OUTPUT_MATCH' }]);
  const [addAspectType, setAddAspectType] = useState('OUTPUT_MATCH');
  const [allowAllBlocks, setAllowAllBlocks] = useState(true);
  const [selectedBlocks, setSelectedBlocks] = useState([]);
  const [hints, setHints] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [initialBlocklyState, setInitialBlocklyState] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    apiGet('/api/exercises/categories')
      .then(r => r.json())
      .then(data => { setCategories(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    apiGet(`/api/exercises/${id}`)
      .then(r => r.json())
      .then(data => {
        const rawAllowedBlocks = data.version?.allowedBlocks || null;
        const rawHints = data.version?.hints || null;
        setForm({
          code: data.code,
          title: data.title,
          description: data.version?.description || '',
          expectedOutput: data.version?.expectedOutput || '',
          createdBy: data.version?.createdBy || 'admin',
          allowedBlocks: rawAllowedBlocks,
          category: data.category || '',
          difficulty: data.difficulty || 'MEDIUM',
        });
        // Parse gradingMode as aspects array (with backward compat)
        const rawGradingMode = data.version?.gradingMode;
        if (rawGradingMode) {
          try {
            const parsed = JSON.parse(rawGradingMode);
            if (Array.isArray(parsed)) {
              setAspects(parsed);
            } else {
              setAspects([{ type: 'OUTPUT_MATCH' }]);
            }
          } catch {
            setAspects([{ type: 'OUTPUT_MATCH' }]);
          }
        } else {
          setAspects([{ type: 'OUTPUT_MATCH' }]);
        }
        if (rawAllowedBlocks) {
          try {
            setSelectedBlocks(JSON.parse(rawAllowedBlocks));
            setAllowAllBlocks(false);
          } catch {
            setSelectedBlocks([]);
            setAllowAllBlocks(true);
          }
        } else {
          setSelectedBlocks([]);
          setAllowAllBlocks(true);
        }
        if (rawHints) {
          try { setHints(JSON.parse(rawHints)); } catch { setHints([]); }
        } else {
          setHints([]);
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
    if (!form.title.trim() || !form.code.trim()) { toast('Code and title are required.', 'warning'); return; }
    if (!form.description.trim()) { toast('Description is required.', 'warning'); return; }
    if (!form.expectedOutput.trim()) { toast('Expected output is required.', 'warning'); return; }

    const blocklyState = wsRef.current ? JSON.stringify(wsRef.current.getState()) : '{}';
    const allowedBlocks = allowAllBlocks ? null : JSON.stringify(selectedBlocks);
    const hintsPayload = hints.length > 0 ? JSON.stringify(hints) : null;
    const gradingMode = JSON.stringify(aspects);

    setSaving(true);
    try {
      const res = isEdit
        ? await apiPut(`/api/exercises/${id}`, { ...form, blocklyState, allowedBlocks, hints: hintsPayload, gradingMode })
        : await apiPost('/api/exercises', { ...form, blocklyState, allowedBlocks, hints: hintsPayload, gradingMode });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      toast('Saved successfully!', 'success');
      navigate('/admin');
    } catch (e) {
      toast(e.message || 'An error occurred', 'error');
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

            <label style={S.label}>Category</label>
            <select style={S.select} value={form.category} onChange={set('category')}>
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>

            <label style={S.label}>Difficulty</label>
            <select style={S.select} value={form.difficulty} onChange={set('difficulty')}>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>

            <label style={S.label}>Grading Aspects</label>
            <div style={{ marginBottom: 16 }}>
              {/* Aspects list */}
              {aspects.map((aspect, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#f7fafc' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2d3748', marginBottom: 6 }}>{aspect.type}</div>
                    {(aspect.type === 'REQUIRED_BLOCKS' || aspect.type === 'FORBIDDEN_BLOCKS') && (
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#718096', marginBottom: 4 }}>Select block types:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {BLOCKLY_CATEGORIES.map(cat => (
                            <div key={cat.category}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#4a5568', marginBottom: 3 }}>{cat.category}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', paddingLeft: 8 }}>
                                {cat.blocks.map(b => (
                                  <label key={b.type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#4a5568', cursor: 'pointer' }}>
                                    <input type="checkbox"
                                      checked={(aspect.blocks || []).includes(b.type)}
                                      onChange={e => {
                                        const updated = [...aspects];
                                        const current = updated[i].blocks || [];
                                        updated[i] = {
                                          ...updated[i],
                                          blocks: e.target.checked
                                            ? [...current, b.type]
                                            : current.filter(t => t !== b.type)
                                        };
                                        setAspects(updated);
                                      }}
                                    />
                                    {b.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {aspect.type === 'MAX_BLOCKS' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ fontSize: '0.82rem', color: '#4a5568' }}>Max blocks:</label>
                        <input type="number" min={1}
                          value={aspect.max ?? 10}
                          onChange={e => {
                            const updated = [...aspects];
                            updated[i] = { ...updated[i], max: parseInt(e.target.value) || 10 };
                            setAspects(updated);
                          }}
                          style={{ width: 80, padding: '4px 8px', border: '1px solid #cbd5e0', borderRadius: 4, fontSize: '0.88rem' }}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setAspects(aspects.filter((_, idx) => idx !== i))}
                    style={{ padding: '4px 10px', border: '1px solid #fc8181', background: '#fff5f5', color: '#c53030', borderRadius: 4, cursor: 'pointer', fontSize: '0.82rem', flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              ))}

              {/* Add aspect row */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <select
                  value={addAspectType}
                  onChange={e => setAddAspectType(e.target.value)}
                  style={{ ...S.select, marginBottom: 0, flex: 1 }}>
                  <option value="OUTPUT_MATCH">OUTPUT_MATCH</option>
                  <option value="REQUIRED_BLOCKS">REQUIRED_BLOCKS</option>
                  <option value="FORBIDDEN_BLOCKS">FORBIDDEN_BLOCKS</option>
                  <option value="MAX_BLOCKS">MAX_BLOCKS</option>
                </select>
                <button
                  onClick={() => {
                    if (addAspectType === 'OUTPUT_MATCH' && aspects.some(a => a.type === 'OUTPUT_MATCH')) {
                      toast('OUTPUT_MATCH can only be added once.', 'warning');
                      return;
                    }
                    const newAspect = addAspectType === 'MAX_BLOCKS'
                      ? { type: addAspectType, max: 10 }
                      : (addAspectType === 'REQUIRED_BLOCKS' || addAspectType === 'FORBIDDEN_BLOCKS')
                        ? { type: addAspectType, blocks: [] }
                        : { type: addAspectType };
                    setAspects([...aspects, newAspect]);
                  }}
                  style={{ padding: '9px 16px', border: '1px solid #cbd5e0', background: '#edf2f7', color: '#2d3748', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>
            </div>

            {aspects.some(a => a.type === 'OUTPUT_MATCH') && (
              <>
                <label style={S.label}>Expected Output</label>
                <textarea style={{ ...S.textarea, background: '#f7fafc' }} rows={4}
                  value={form.expectedOutput} onChange={set('expectedOutput')}
                  placeholder="Enter the expected output that the student's program should produce" />
              </>
            )}

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2d3748', marginBottom: 8 }}>Block Palette Restrictions</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: '#4a5568', cursor: 'pointer', marginBottom: 8 }}>
                <input type="checkbox" checked={allowAllBlocks}
                  onChange={e => { setAllowAllBlocks(e.target.checked); if (e.target.checked) setSelectedBlocks([]); }}
                />
                Allow all blocks (no restrictions)
              </label>
              {!allowAllBlocks && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {BLOCKLY_CATEGORIES.map(cat => {
                    const catTypes = cat.blocks.map(b => b.type);
                    const allSelected = catTypes.every(t => selectedBlocks.includes(t));
                    const someSelected = catTypes.some(t => selectedBlocks.includes(t));
                    return (
                      <div key={cat.category} style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: '#2d3748', cursor: 'pointer', marginBottom: 6 }}>
                          <input type="checkbox"
                            checked={allSelected}
                            ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                            onChange={e => {
                              if (e.target.checked) setSelectedBlocks([...new Set([...selectedBlocks, ...catTypes])]);
                              else setSelectedBlocks(selectedBlocks.filter(t => !catTypes.includes(t)));
                            }}
                          />
                          {cat.category}
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', paddingLeft: 8 }}>
                          {cat.blocks.map(b => (
                            <label key={b.type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', color: '#4a5568', cursor: 'pointer' }}>
                              <input type="checkbox"
                                checked={selectedBlocks.includes(b.type)}
                                onChange={e => {
                                  if (e.target.checked) setSelectedBlocks([...selectedBlocks, b.type]);
                                  else setSelectedBlocks(selectedBlocks.filter(t => t !== b.type));
                                }}
                              />
                              {b.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2d3748', marginBottom: 8 }}>Hints</h4>
              {hints.map((hint, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                  <input value={hint} onChange={e => {
                    const updated = [...hints];
                    updated[i] = e.target.value;
                    setHints(updated);
                  }} style={{ ...S.input, marginBottom: 0, flex: 1 }} placeholder={`Hint ${i + 1}`} />
                  <button onClick={() => setHints(hints.filter((_, idx) => idx !== i))}
                    style={{ padding: '6px 12px', border: '1px solid #fc8181', background: '#fff5f5', color: '#c53030', borderRadius: 4, cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              ))}
              <button onClick={() => setHints([...hints, ''])}
                style={{ marginTop: 6, padding: '6px 14px', border: '1px solid #cbd5e0', background: '#f7fafc', color: '#4a5568', borderRadius: 4, cursor: 'pointer', fontSize: '0.88rem' }}>
                + Add Hint
              </button>
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
