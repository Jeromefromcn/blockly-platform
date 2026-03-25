import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import BlocklyWorkspace from '../components/BlocklyWorkspace.jsx';
import { apiGet } from '../api.js';
import { useToast } from '../components/Toast.jsx';

const S = {
  layout: { display: 'flex', height: 'calc(100vh - 50px)' },
  sidebar: {
    width: 300, background: '#fff',
    borderRight: '1px solid #edf2f7',
    padding: '24px 20px',
    overflowY: 'auto', flexShrink: 0,
    display: 'flex', flexDirection: 'column', gap: 0,
  },
  main: { flex: 1, padding: 20, display: 'flex', flexDirection: 'column' },
  title: { fontSize: '1.1rem', fontWeight: 700, color: '#1a202c', marginBottom: 6, lineHeight: 1.4 },
  desc: { fontSize: '0.9rem', color: '#4a5568', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 20 },
  divider: { margin: '16px 0', borderColor: '#e2e8f0' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#718096', marginBottom: 6 },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.9rem', outline: 'none', marginBottom: 12 },
  btn: {
    width: '100%', padding: '10px 14px', border: 'none', borderRadius: 8,
    cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', marginBottom: 8,
    transition: 'opacity 0.15s',
  },
  hint: { fontSize: '0.78rem', color: '#a0aec0', textAlign: 'center', marginTop: 4 },
  toolbar: { display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' },
  runBtn: {
    padding: '8px 24px', border: 'none', borderRadius: 8,
    cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
    background: 'linear-gradient(135deg, #38a169, #2f855a)', color: '#fff',
    boxShadow: '0 2px 4px rgba(56,161,105,0.3)',
    transition: 'transform 0.1s, box-shadow 0.1s',
  },
  outputPanel: { background: '#1a202c', color: '#e2e8f0', borderRadius: 6, padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.83rem', minHeight: 64, marginTop: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  outputError: { color: '#fc8181' },
  outputLabel: { fontSize: '0.78rem', fontWeight: 600, color: '#718096', marginBottom: 2 },
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

export default function Workspace() {
  const toast = useToast();
  const { id } = useParams();
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [runResult, setRunResult] = useState(null);
  const [parsedHints, setParsedHints] = useState([]);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const wsRef = useRef(null);

  useEffect(() => {
    apiGet(`/api/exercises/${id}`)
      .then(r => r.json())
      .then(data => {
        setExercise(data);
        if (data.version?.hints) {
          try { setParsedHints(JSON.parse(data.version.hints)); } catch { setParsedHints([]); }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Export current workspace as JSON file
  const handleExport = () => {
    if (!wsRef.current) return;
    const name = studentName.trim();
    if (!name) { toast('Please enter your name before exporting.', 'warning'); return; }

    const state = wsRef.current.getState();
    const code = wsRef.current.getCode();
    const payload = {
      exerciseId: parseInt(id),
      exerciseTitle: exercise?.title || '',
      studentName: name,
      blocklyState: state,
      generatedCode: code,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}_${exercise?.title?.replace(/\s+/g, '_') || id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRun = () => {
    if (!wsRef.current) return;
    const code = wsRef.current.getCode();
    const result = runCode(code);
    setRunResult(result);
  };

  // Import a previously saved JSON file to restore workspace
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.studentName) setStudentName(data.studentName);
        if (data.blocklyState && wsRef.current) {
          wsRef.current.loadState(data.blocklyState);
        }
      } catch {
        toast('Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!exercise) return <div style={{ padding: 40 }}>Exercise not found.</div>;

  return (
    <div style={S.layout}>
      <aside style={S.sidebar}>
        <div style={S.title}>{exercise.title}</div>
        {exercise.difficulty && (
          <span style={{
            display: 'inline-block', marginBottom: 10, padding: '3px 10px', borderRadius: 20,
            fontSize: '0.73rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
            background: exercise.difficulty === 'EASY' ? '#c6f6d5' : exercise.difficulty === 'HARD' ? '#fed7d7' : '#fefcbf',
            color: exercise.difficulty === 'EASY' ? '#22543d' : exercise.difficulty === 'HARD' ? '#822727' : '#744210',
          }}>
            {exercise.difficulty}
          </span>
        )}
        <div style={S.desc}>{exercise.version?.description || 'No description.'}</div>

        <hr style={S.divider} />

        <label style={S.label}>Your Name</label>
        <input style={S.input} placeholder="Enter your name" value={studentName}
          onChange={e => setStudentName(e.target.value)} />

        <button style={{ ...S.btn, background: '#2b6cb0', color: '#fff' }} onClick={handleExport}>
          ⬇ Export Answer (JSON)
        </button>
        <p style={S.hint}>Download your answer to upload to the submission system.</p>

        <label style={{ ...S.btn, background: '#f7fafc', color: '#4a5568', textAlign: 'center', display: 'block', cursor: 'pointer', border: '1px dashed #cbd5e0', marginTop: 8 }}>
          ⬆ Import Saved Answer
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </label>
        <p style={S.hint}>Restore a previously exported JSON file.</p>

        <button style={{ ...S.btn, background: '#e2e8f0', color: '#4a5568', marginTop: 12 }}
          onClick={() => { wsRef.current?.clear(); setRunResult(null); }}>
          Clear Workspace
        </button>

        {runResult && (
          <div style={{ marginTop: 16 }}>
            <hr style={S.divider} />
            <div style={S.outputLabel}>Output:</div>
            <div style={{ ...S.outputPanel, maxHeight: 160, overflowY: 'auto', ...(runResult.error ? S.outputError : {}) }}>
              {runResult.error ? `Error: ${runResult.error}` : runResult.output}
            </div>
          </div>
        )}
      </aside>

      <main style={S.main}>
        <div style={S.toolbar}>
          <button style={S.runBtn} onClick={handleRun}>Run</button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <BlocklyWorkspace
            onWorkspaceReady={api => { wsRef.current = api; }}
            allowedBlocks={exercise?.version?.allowedBlocks ? JSON.parse(exercise.version.allowedBlocks) : null}
          />
        </div>
        {parsedHints.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => { if (hintsRevealed < parsedHints.length) setHintsRevealed(hintsRevealed + 1); }}
              disabled={hintsRevealed >= parsedHints.length}
              style={{ backgroundColor: '#f6ad55', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: hintsRevealed >= parsedHints.length ? 'default' : 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
            >
              {hintsRevealed >= parsedHints.length ? 'All hints revealed' : `Get Hint (${hintsRevealed}/${parsedHints.length})`}
            </button>
            {parsedHints.slice(0, hintsRevealed).map((hint, i) => (
              <div key={i} style={{ marginTop: '8px', padding: '8px', background: '#fffbeb', border: '1px solid #f6ad55', borderRadius: '4px', fontSize: '0.88rem', color: '#4a5568' }}>
                <strong>Hint {i + 1}:</strong> {hint}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
