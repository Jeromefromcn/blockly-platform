import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const S = {
  container: { maxWidth: 1100, margin: '32px auto', padding: '0 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  h1: { fontSize: '1.4rem', fontWeight: 700, color: '#2d3748' },
  btn: { padding: '8px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' },
  tabs: { display: 'flex', marginBottom: 20, borderBottom: '2px solid #e2e8f0' },
  tab: { padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.92rem', color: '#718096', borderBottom: '3px solid transparent', marginBottom: -2 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  th: { background: '#f7fafc', padding: '10px 16px', textAlign: 'left', fontSize: '0.82rem', color: '#4a5568', fontWeight: 600, borderBottom: '2px solid #e2e8f0' },
  td: { padding: '11px 16px', borderBottom: '1px solid #edf2f7', fontSize: '0.88rem', color: '#2d3748', verticalAlign: 'middle' },
  importBox: { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 },
  dropzone: {
    border: '2px dashed #cbd5e0', borderRadius: 8, padding: '32px 20px',
    textAlign: 'center', color: '#718096', cursor: 'pointer', transition: 'all 0.2s'
  },
  gradeModal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
  },
  modal: { background: '#fff', borderRadius: 10, padding: 28, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' },
};

const badge = status => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: '0.78rem',
  background: status === 'PUBLISHED' ? '#c6f6d5' : '#e2e8f0',
  color: status === 'PUBLISHED' ? '#276749' : '#4a5568',
});

export default function Admin() {
  const [tab, setTab] = useState('exercises');
  const [exercises, setExercises] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importResults, setImportResults] = useState(null);
  const [grading, setGrading] = useState(null); // { submissionId, sourceFilename, currentScore, currentComment }
  const [gradeForm, setGradeForm] = useState({ score: '', comment: '' });
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const loadExercises = () => fetch('/api/exercises').then(r => r.json()).then(setExercises);
  const loadSubmissions = () => fetch('/api/submissions').then(r => r.json()).then(setSubmissions);

  useEffect(() => {
    Promise.all([loadExercises(), loadSubmissions()]).finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (ex) => {
    await fetch(`/api/exercises/${ex.id}/${ex.status === 'PUBLISHED' ? 'unpublish' : 'publish'}`, { method: 'POST' });
    loadExercises();
  };

  const deleteExercise = async (id) => {
    if (!confirm('Delete this exercise?')) return;
    await fetch(`/api/exercises/${id}`, { method: 'DELETE' });
    loadExercises();
  };

  const handleImport = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const formData = new FormData();
    for (const f of files) formData.append('files', f);
    try {
      const res = await fetch('/api/submissions/import', { method: 'POST', body: formData });
      const data = await res.json();
      setImportResults(data);
      loadSubmissions();
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
    e.target.value = '';
  };

  const openGrade = (sub) => {
    setGrading({ submissionId: sub.id, sourceFilename: sub.sourceFilename });
    setGradeForm({ score: sub.tutorScore ?? '', comment: sub.tutorComment ?? '' });
  };

  const submitGrade = async () => {
    const score = parseInt(gradeForm.score);
    if (isNaN(score) || score < 0 || score > 100) { alert('Score must be 0–100'); return; }
    await fetch(`/api/submissions/${grading.submissionId}/grade`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tutorScore: score, tutorComment: gradeForm.comment }),
    });
    setGrading(null);
    loadSubmissions();
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <h1 style={S.h1}>Admin Panel</h1>
        {tab === 'exercises' && (
          <button style={{ ...S.btn, background: '#2b6cb0', color: '#fff' }}
            onClick={() => navigate('/admin/exercise/new')}>+ New Exercise</button>
        )}
      </div>

      <div style={S.tabs}>
        {[['exercises', 'Exercises'], ['submissions', 'Submissions'], ['import', 'Import & Grade']].map(([key, label]) => (
          <button key={key} style={{ ...S.tab, ...(tab === key ? { color: '#2b6cb0', borderBottomColor: '#2b6cb0' } : {}) }}
            onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* Exercises Tab */}
      {tab === 'exercises' && (
        <table style={S.table}>
          <thead>
            <tr>{['ID', 'Code', 'Title', 'Status', 'Version', 'Likes', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {exercises.length === 0
              ? <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#a0aec0' }}>No exercises</td></tr>
              : exercises.map(ex => (
                <tr key={ex.id}>
                  <td style={S.td}>{ex.id}</td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.82rem' }}>{ex.code}</td>
                  <td style={S.td}>{ex.title}</td>
                  <td style={S.td}><span style={badge(ex.status)}>{ex.status}</span></td>
                  <td style={S.td}>v{ex.currentVersionNumber}</td>
                  <td style={S.td}>❤️ {ex.likeCount}</td>
                  <td style={{ ...S.td, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button style={{ ...S.btn, background: '#ebf8ff', color: '#2b6cb0' }}
                      onClick={() => navigate(`/admin/exercise/${ex.id}/edit`)}>Edit</button>
                    <button style={{ ...S.btn, background: ex.status === 'PUBLISHED' ? '#fffaf0' : '#f0fff4', color: ex.status === 'PUBLISHED' ? '#c05621' : '#276749' }}
                      onClick={() => toggleStatus(ex)}>
                      {ex.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button style={{ ...S.btn, background: '#fff5f5', color: '#c53030' }}
                      onClick={() => deleteExercise(ex.id)}>Delete</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {/* Submissions Tab */}
      {tab === 'submissions' && (
        <table style={S.table}>
          <thead>
            <tr>{['ID', 'Exercise', 'Student', 'Source File', 'Submitted', 'Score', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {submissions.length === 0
              ? <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#a0aec0' }}>No submissions</td></tr>
              : submissions.map(s => (
                <tr key={s.id}>
                  <td style={S.td}>{s.id}</td>
                  <td style={S.td}>{s.exerciseTitle}</td>
                  <td style={S.td}>{s.studentName || '—'}</td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.8rem', color: '#4a5568' }}>{s.sourceFilename}</td>
                  <td style={S.td}>{new Date(s.submittedAt).toLocaleString()}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>
                    {s.tutorScore != null
                      ? <span style={{ color: '#2b6cb0' }}>{s.sourceFilename} · {s.tutorScore}/100</span>
                      : <span style={{ color: '#a0aec0' }}>Ungraded</span>}
                  </td>
                  <td style={S.td}>
                    <button style={{ ...S.btn, background: '#ebf8ff', color: '#2b6cb0' }}
                      onClick={() => openGrade(s)}>
                      {s.tutorScore != null ? 'Re-grade' : 'Grade'}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {/* Import & Grade Tab */}
      {tab === 'import' && (
        <div>
          <div style={S.importBox}>
            <h2 style={{ fontSize: '1rem', marginBottom: 8, color: '#2d3748' }}>Batch Import Student Answers</h2>
            <p style={{ fontSize: '0.85rem', color: '#718096', marginBottom: 16 }}>
              Upload one or more student JSON files. Each file should contain:
              <code style={{ background: '#f7fafc', padding: '2px 6px', borderRadius: 4, marginLeft: 6 }}>
                {`{ "exerciseId": 1, "studentName": "...", "blocklyState": {...} }`}
              </code>
            </p>
            <div style={S.dropzone}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#4299e1'; e.currentTarget.style.background = '#ebf8ff'; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = '#cbd5e0'; e.currentTarget.style.background = ''; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#cbd5e0'; e.currentTarget.style.background = ''; fileInputRef.current.files = e.dataTransfer.files; handleImport({ target: { files: e.dataTransfer.files, value: '' } }); }}
              onClick={() => fileInputRef.current?.click()}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📂</div>
              <div>Click to select files or drag & drop</div>
              <div style={{ fontSize: '0.8rem', marginTop: 4, color: '#a0aec0' }}>Accepts .json files</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".json" multiple style={{ display: 'none' }} onChange={handleImport} />
          </div>

          {importResults && (
            <div style={{ ...S.importBox, marginTop: 0 }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: 12, color: '#2d3748' }}>Import Results</h3>
              <table style={S.table}>
                <thead><tr>{['Filename', 'Status', 'Submission ID'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {importResults.map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.82rem' }}>{r.filename}</td>
                      <td style={S.td}>
                        <span style={{ ...badge(r.status === 'imported' ? 'PUBLISHED' : 'DRAFT') }}>
                          {r.status}
                        </span>
                        {r.message && <span style={{ marginLeft: 8, color: '#e53e3e', fontSize: '0.8rem' }}>{r.message}</span>}
                      </td>
                      <td style={S.td}>{r.submissionId || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Grade Modal */}
      {grading && (
        <div style={S.gradeModal} onClick={() => setGrading(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 6, fontSize: '1rem', color: '#2d3748' }}>Grade Submission</h3>
            <p style={{ fontSize: '0.85rem', color: '#718096', marginBottom: 16, fontFamily: 'monospace' }}>
              {grading.sourceFilename}
            </p>
            <label style={S.label ?? { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#718096', marginBottom: 5 }}>
              Score (0–100)
            </label>
            <input type="number" min={0} max={100} placeholder="e.g. 85"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '1.1rem', fontWeight: 700, marginBottom: 14, outline: 'none' }}
              value={gradeForm.score} onChange={e => setGradeForm(f => ({ ...f, score: e.target.value }))} />
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#718096', marginBottom: 5 }}>
              Comment (optional)
            </label>
            <textarea rows={3} placeholder="Feedback for the student..."
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.9rem', resize: 'vertical', outline: 'none', marginBottom: 18 }}
              value={gradeForm.comment} onChange={e => setGradeForm(f => ({ ...f, comment: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={{ padding: '9px 20px', border: 'none', borderRadius: 6, cursor: 'pointer', background: '#e2e8f0', color: '#4a5568', fontWeight: 600 }}
                onClick={() => setGrading(null)}>Cancel</button>
              <button style={{ padding: '9px 20px', border: 'none', borderRadius: 6, cursor: 'pointer', background: '#2b6cb0', color: '#fff', fontWeight: 600 }}
                onClick={submitGrade}>Save Grade</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
