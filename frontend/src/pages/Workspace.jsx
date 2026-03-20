import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import BlocklyWorkspace from '../components/BlocklyWorkspace.jsx';

const S = {
  layout: { display: 'flex', height: 'calc(100vh - 50px)' },
  sidebar: { width: 320, background: '#fff', borderRight: '1px solid #e2e8f0', padding: 24, overflowY: 'auto', flexShrink: 0 },
  main: { flex: 1, padding: 20 },
  title: { fontSize: '1.2rem', fontWeight: 700, color: '#2d3748', marginBottom: 8 },
  desc: { fontSize: '0.9rem', color: '#4a5568', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 20 },
  divider: { margin: '16px 0', borderColor: '#e2e8f0' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#718096', marginBottom: 6 },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.9rem', outline: 'none', marginBottom: 12 },
  btn: { width: '100%', padding: '10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 },
  hint: { fontSize: '0.78rem', color: '#a0aec0', textAlign: 'center', marginTop: 4 },
};

export default function Workspace() {
  const { id } = useParams();
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');
  const wsRef = useRef(null);

  useEffect(() => {
    fetch(`/api/exercises/${id}`)
      .then(r => r.json())
      .then(data => { setExercise(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  // Export current workspace as JSON file
  const handleExport = () => {
    if (!wsRef.current) return;
    const name = studentName.trim();
    if (!name) { alert('Please enter your name before exporting.'); return; }

    const state = wsRef.current.getState();
    const payload = {
      exerciseId: parseInt(id),
      exerciseTitle: exercise?.title || '',
      studentName: name,
      blocklyState: state,
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
          onClick={() => wsRef.current?.clear()}>
          Clear Workspace
        </button>
      </aside>

      <main style={S.main}>
        <div style={{ height: '100%' }}>
          <BlocklyWorkspace onWorkspaceReady={api => { wsRef.current = api; }} />
        </div>
      </main>
    </div>
  );
}
