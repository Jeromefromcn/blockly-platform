import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import BlocklyWorkspace from '../components/BlocklyWorkspace.jsx';
import { apiGet } from '../api.js';

const S = {
  layout: { display: 'flex', height: 'calc(100vh - 50px)' },
  sidebar: { width: 320, background: '#fff', borderRight: '1px solid #e2e8f0', padding: 24, overflowY: 'auto', flexShrink: 0 },
  main: { flex: 1, padding: 20, display: 'flex', flexDirection: 'column' },
  title: { fontSize: '1.2rem', fontWeight: 700, color: '#2d3748', marginBottom: 8 },
  desc: { fontSize: '0.9rem', color: '#4a5568', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 20 },
  divider: { margin: '16px 0', borderColor: '#e2e8f0' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#718096', marginBottom: 6 },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.9rem', outline: 'none', marginBottom: 12 },
  btn: { width: '100%', padding: '10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 },
  hint: { fontSize: '0.78rem', color: '#a0aec0', textAlign: 'center', marginTop: 4 },
  toolbar: { display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' },
  runBtn: { padding: '7px 20px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', background: '#38a169', color: '#fff' },
  outputPanel: { background: '#1a202c', color: '#e2e8f0', borderRadius: 6, padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.83rem', minHeight: 64, marginTop: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  outputError: { color: '#fc8181' },
  outputLabel: { fontSize: '0.78rem', fontWeight: 600, color: '#718096', marginBottom: 2 },
};

// Recursively collect all block types from Blockly workspace state JSON
function extractBlockTypes(state) {
  const types = new Set();
  function traverse(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(traverse); return; }
    if (obj.type && typeof obj.type === 'string') types.add(obj.type);
    Object.values(obj).forEach(traverse);
  }
  try {
    const parsed = typeof state === 'string' ? JSON.parse(state) : state;
    traverse(parsed);
  } catch {}
  return types;
}

function countBlocks(state) {
  let count = 0;
  function traverse(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(traverse); return; }
    if (obj.type && typeof obj.type === 'string') count++;
    Object.values(obj).forEach(traverse);
  }
  try {
    const parsed = typeof state === 'string' ? JSON.parse(state) : state;
    traverse(parsed);
  } catch {}
  return count;
}

function parseAspects(gradingMode) {
  try {
    const parsed = JSON.parse(gradingMode);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [{ type: 'OUTPUT_MATCH' }];
}

function gradeAspects(aspects, actualOutput, expectedOutput, workspaceState) {
  return aspects.map(aspect => {
    switch (aspect.type) {
      case 'OUTPUT_MATCH': {
        const passed = (actualOutput || '').trim() === (expectedOutput || '').trim();
        return { type: 'OUTPUT_MATCH', label: 'Output matches expected', passed };
      }
      case 'REQUIRED_BLOCKS': {
        const used = extractBlockTypes(workspaceState);
        const missing = (aspect.blocks || []).filter(b => !used.has(b));
        return {
          type: 'REQUIRED_BLOCKS',
          label: `Uses required blocks${aspect.blocks?.length ? ': ' + aspect.blocks.join(', ') : ''}`,
          passed: missing.length === 0,
        };
      }
      case 'FORBIDDEN_BLOCKS': {
        const used = extractBlockTypes(workspaceState);
        const found = (aspect.blocks || []).filter(b => used.has(b));
        return {
          type: 'FORBIDDEN_BLOCKS',
          label: `Does not use forbidden blocks${aspect.blocks?.length ? ': ' + aspect.blocks.join(', ') : ''}`,
          passed: found.length === 0,
        };
      }
      case 'MAX_BLOCKS': {
        const count = countBlocks(workspaceState);
        const max = aspect.max || 10;
        return {
          type: 'MAX_BLOCKS',
          label: `Solution uses \u2264 ${max} blocks (used: ${count})`,
          passed: count <= max,
        };
      }
      default:
        return { type: aspect.type, label: aspect.type, passed: false };
    }
  });
}

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
    if (!name) { alert('Please enter your name before exporting.'); return; }

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
    const gradingMode = exercise?.version?.gradingMode;
    const expectedOutput = exercise?.version?.expectedOutput;
    if (gradingMode && !result.error) {
      const aspects = parseAspects(gradingMode);
      const workspaceState = wsRef.current.getState();
      result.aspects = gradeAspects(aspects, result.output, expectedOutput, workspaceState);
    }
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
        alert('Invalid JSON file.');
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
        {runResult && (
          <div style={{ marginTop: 10 }}>
            <div style={S.outputLabel}>Output:</div>
            <div style={{ ...S.outputPanel, ...(runResult.error ? S.outputError : {}) }}>
              {runResult.error ? `Error: ${runResult.error}` : runResult.output}
            </div>
            {runResult.aspects && runResult.aspects.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={S.outputLabel}>Grading:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {runResult.aspects.map((a, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px', borderRadius: 6,
                      background: a.passed ? '#f0fff4' : '#fff5f5',
                      border: `1px solid ${a.passed ? '#9ae6b4' : '#feb2b2'}`,
                      fontSize: '0.85rem', color: a.passed ? '#276749' : '#c53030'
                    }}>
                      <span>{a.passed ? '✅' : '❌'}</span>
                      <span>{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
