import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiDelete, apiGet, apiPatch, apiPost } from '../api.js';
import { useToast } from '../components/Toast.jsx';

const NAV_ITEMS = [
  { key: 'exercises', icon: '📚', label: 'Exercises' },
  { key: 'submissions', icon: '📋', label: 'Submissions' },
  { key: 'import', icon: '📥', label: 'Import & Grade' },
];

function runCodeForGrading(code) {
  const logs = [];
  const mockPrint = (...args) => logs.push(args.map(String).join(' '));
  try {
    const fn = new Function('console', 'print', code);
    fn({ log: mockPrint }, mockPrint);
    return logs.join('\n');
  } catch {
    return null;
  }
}

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

function gradeAspects(aspects, generatedCode, expectedOutput, blocklyState) {
  const actualOutput = generatedCode ? runCodeForGrading(generatedCode) : null;
  return aspects.map(aspect => {
    switch (aspect.type) {
      case 'OUTPUT_MATCH': {
        if (actualOutput === null) return { type: 'OUTPUT_MATCH', label: 'Output matches expected', passed: false, note: 'No generated code' };
        const passed = actualOutput.trim() === (expectedOutput || '').trim();
        return { type: 'OUTPUT_MATCH', label: 'Output matches expected', passed };
      }
      case 'REQUIRED_BLOCKS': {
        const used = extractBlockTypes(blocklyState);
        const missing = (aspect.blocks || []).filter(b => !used.has(b));
        return {
          type: 'REQUIRED_BLOCKS',
          label: `Uses required blocks${aspect.blocks?.length ? ': ' + aspect.blocks.join(', ') : ''}`,
          passed: missing.length === 0,
        };
      }
      case 'FORBIDDEN_BLOCKS': {
        const used = extractBlockTypes(blocklyState);
        const found = (aspect.blocks || []).filter(b => used.has(b));
        return {
          type: 'FORBIDDEN_BLOCKS',
          label: `Does not use forbidden blocks${aspect.blocks?.length ? ': ' + aspect.blocks.join(', ') : ''}`,
          passed: found.length === 0,
        };
      }
      case 'MAX_BLOCKS': {
        const count = countBlocks(blocklyState);
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

function Pagination({ totalItems, currentPage, itemsPerPage, onPageChange, onItemsPerPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalItems === 0) return null;
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      pageNumbers.push(i);
    }
  }

  const pagesWithEllipsis = [];
  let prev = null;
  for (const p of pageNumbers) {
    if (prev !== null && p - prev > 1) pagesWithEllipsis.push('...');
    pagesWithEllipsis.push(p);
    prev = p;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
      <div style={{ fontSize: '0.83rem', color: '#6b7280' }}>
        Showing {startItem}–{endItem} of {totalItems} items
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <select
          value={itemsPerPage}
          onChange={e => { onItemsPerPageChange(Number(e.target.value)); onPageChange(1); }}
          style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.82rem', background: '#fff', cursor: 'pointer' }}>
          {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: currentPage === 1 ? '#f9fafb' : '#fff', color: currentPage === 1 ? '#9ca3af' : '#374151', cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
          Previous
        </button>
        {pagesWithEllipsis.map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} style={{ fontSize: '0.82rem', color: '#9ca3af', padding: '0 2px' }}>...</span>
            : <button key={p}
                onClick={() => onPageChange(p)}
                style={{ padding: '4px 9px', border: '1px solid #e2e8f0', borderRadius: 6, background: p === currentPage ? '#6366f1' : '#fff', color: p === currentPage ? '#fff' : '#374151', cursor: 'pointer', fontSize: '0.82rem', fontWeight: p === currentPage ? 700 : 400 }}>
                {p}
              </button>
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: currentPage === totalPages ? '#f9fafb' : '#fff', color: currentPage === totalPages ? '#9ca3af' : '#374151', cursor: currentPage === totalPages ? 'default' : 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
          Next
        </button>
      </div>
    </div>
  );
}

export default function Admin() {
  const toast = useToast();
  const [tab, setTab] = useState('exercises');
  const [exercises, setExercises] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importResults, setImportResults] = useState(null);
  const [grading, setGrading] = useState(null); // { submissionId, sourceFilename, currentScore, currentComment }
  const [gradeForm, setGradeForm] = useState({ score: '', comment: '' });
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [exercisesPage, setExercisesPage] = useState(1);
  const [exercisesPerPage, setExercisesPerPage] = useState(10);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsPerPage, setSubmissionsPerPage] = useState(10);

  const loadExercises = () => apiGet('/api/exercises').then(r => r.json()).then(setExercises);
  const loadSubmissions = () => apiGet('/api/submissions').then(r => r.json()).then(setSubmissions);

  useEffect(() => {
    Promise.all([loadExercises(), loadSubmissions()]).finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (ex) => {
    await apiPost(`/api/exercises/${ex.id}/${ex.status === 'PUBLISHED' ? 'unpublish' : 'publish'}`);
    loadExercises();
  };

  const deleteExercise = async (id) => {
    if (!confirm('Delete this exercise?')) return;
    await apiDelete(`/api/exercises/${id}`);
    loadExercises();
  };

  const handleImport = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const formData = new FormData();
    for (const f of files) formData.append('files', f);
    try {
      const res = await fetch('/api/submissions/import', { method: 'POST', body: formData, credentials: 'include' });
      const data = await res.json();
      setImportResults(data);
      loadSubmissions();
    } catch (err) {
      toast('Import failed: ' + err.message, 'error');
    }
    e.target.value = '';
  };

  const openGrade = async (sub) => {
    setGrading({ submissionId: sub.id, sourceFilename: sub.sourceFilename, autoScore: sub.autoScore ?? null, aspectResults: null });
    setGradeForm({ score: sub.tutorScore ?? '', comment: sub.tutorComment ?? '' });

    try {
      const [detailRes, exerciseRes] = await Promise.all([
        apiGet(`/api/submissions/${sub.id}`),
        apiGet(`/api/exercises/${sub.exerciseId}`),
      ]);
      const detail = await detailRes.json();
      const exercise = await exerciseRes.json();

      const gradingMode = exercise.version?.gradingMode;
      const expectedOutput = exercise.version?.expectedOutput;

      if (gradingMode) {
        const aspects = parseAspects(gradingMode);
        const results = gradeAspects(aspects, detail.generatedCode, expectedOutput, detail.blocklyState);
        setGrading(prev => prev ? { ...prev, aspectResults: results } : prev);
      } else {
        setGrading(prev => prev ? { ...prev, aspectResults: [] } : prev);
      }
    } catch {}
  };

  const submitGrade = async () => {
    const score = parseInt(gradeForm.score);
    if (isNaN(score) || score < 0 || score > 100) { toast('Score must be 0–100', 'warning'); return; }
    await apiPatch(`/api/submissions/${grading.submissionId}/grade`,
      { tutorScore: score, tutorComment: gradeForm.comment }
    );
    setGrading(null);
    loadSubmissions();
  };

  if (loading) return <div style={{ padding: 40, fontFamily: 'Inter, sans-serif' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #e2e8f0', padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: 8 }}>Admin Panel</div>
        {NAV_ITEMS.map(item => (
          <button key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: '0.88rem', fontWeight: tab === item.key ? 600 : 400,
              background: tab === item.key ? '#eef2ff' : 'transparent',
              color: tab === item.key ? '#6366f1' : '#4b5563',
              textAlign: 'left', width: '100%', transition: 'all 0.15s',
            }}>
            <span style={{ fontSize: '1rem' }}>{item.icon}</span>
            {item.label}
            {item.key === 'submissions' && submissions.filter(s => s.tutorScore == null).length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#fef3c7', color: '#d97706', fontSize: '0.7rem', fontWeight: 700, padding: '1px 7px', borderRadius: 10 }}>
                {submissions.filter(s => s.tutorScore == null).length}
              </span>
            )}
          </button>
        ))}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Exercises', value: exercises.length, color: '#6366f1', bg: '#eef2ff' },
            { label: 'Published', value: exercises.filter(e => e.status === 'PUBLISHED').length, color: '#16a34a', bg: '#dcfce7' },
            { label: 'Submissions', value: submissions.length, color: '#d97706', bg: '#fef3c7' },
            { label: 'Ungraded', value: submissions.filter(s => s.tutorScore == null).length, color: '#dc2626', bg: '#fee2e2' },
          ].map(s => (
            <div key={s.label} style={{ flex: '1 1 140px', background: s.bg, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Exercises Tab */}
        {tab === 'exercises' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>Exercises</h2>
              <button style={{ padding: '9px 18px', border: 'none', borderRadius: 8, background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => navigate('/admin/exercise/new')}>
                + New Exercise
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {exercises.length === 0
                ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📭</div>
                    <div style={{ fontWeight: 600 }}>No exercises yet</div>
                  </div>
                : exercises.slice((exercisesPage - 1) * exercisesPerPage, exercisesPage * exercisesPerPage).map(ex => (
                  <div key={ex.id} style={{
                    background: '#fff', borderRadius: 12, padding: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column', gap: 12,
                    transition: 'box-shadow 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}>
                    {/* Card header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: 4 }}>{ex.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>{ex.code}</div>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
                        background: ex.status === 'PUBLISHED' ? '#dcfce7' : '#f1f5f9',
                        color: ex.status === 'PUBLISHED' ? '#15803d' : '#6b7280',
                      }}>{ex.status}</span>
                    </div>
                    {/* Badges row */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {ex.category && <span style={{ padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#374151', fontSize: '0.75rem', fontWeight: 500 }}>{ex.category}</span>}
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                        background: ex.difficulty === 'EASY' ? '#dcfce7' : ex.difficulty === 'HARD' ? '#fee2e2' : '#fef3c7',
                        color: ex.difficulty === 'EASY' ? '#15803d' : ex.difficulty === 'HARD' ? '#dc2626' : '#d97706',
                      }}>{ex.difficulty}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#6b7280', fontSize: '0.75rem' }}>v{ex.currentVersionNumber}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#6b7280', fontSize: '0.75rem' }}>❤️ {ex.likeCount}</span>
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button style={{ flex: 1, padding: '7px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}
                        onClick={() => navigate(`/admin/exercise/${ex.id}/edit`)}>Edit</button>
                      <button style={{ flex: 1, padding: '7px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        background: ex.status === 'PUBLISHED' ? '#fef3c7' : '#dcfce7',
                        color: ex.status === 'PUBLISHED' ? '#d97706' : '#15803d' }}
                        onClick={() => toggleStatus(ex)}>{ex.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</button>
                      <button style={{ padding: '7px 12px', border: 'none', borderRadius: 7, background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        onClick={() => deleteExercise(ex.id)}>✕</button>
                    </div>
                  </div>
                ))}
            </div>
            <Pagination
              totalItems={exercises.length}
              currentPage={exercisesPage}
              itemsPerPage={exercisesPerPage}
              onPageChange={setExercisesPage}
              onItemsPerPageChange={setExercisesPerPage}
            />
          </div>
        )}

        {/* Submissions Tab */}
        {tab === 'submissions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>Submissions</h2>
            </div>
            {submissions.length === 0
              ? <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📭</div>
                  <div style={{ fontWeight: 600 }}>No submissions yet</div>
                </div>
              : <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {submissions.slice((submissionsPage - 1) * submissionsPerPage, submissionsPage * submissionsPerPage).map(s => (
                      <div key={s.id} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#111827' }}>{s.studentName || 'Unknown'}</div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>{s.exerciseTitle} · <span style={{ fontFamily: 'monospace' }}>{s.sourceFilename}</span></div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>{new Date(s.submittedAt).toLocaleDateString()}</div>
                        <div style={{ minWidth: 80, textAlign: 'right' }}>
                          {s.tutorScore != null
                            ? <span style={{ fontWeight: 700, color: '#6366f1' }}>{s.tutorScore}/100</span>
                            : <span style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 600, background: '#fef3c7', padding: '2px 8px', borderRadius: 6 }}>Ungraded</span>}
                        </div>
                        <button style={{ padding: '7px 16px', border: 'none', borderRadius: 7, background: '#eef2ff', color: '#6366f1', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                          onClick={() => openGrade(s)}>{s.tutorScore != null ? 'Re-grade' : 'Grade'}</button>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    totalItems={submissions.length}
                    currentPage={submissionsPage}
                    itemsPerPage={submissionsPerPage}
                    onPageChange={setSubmissionsPage}
                    onItemsPerPageChange={setSubmissionsPerPage}
                  />
                </div>}
          </div>
        )}

        {/* Import Tab */}
        {tab === 'import' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: 20, marginTop: 0 }}>Import & Grade</h2>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#111827', marginBottom: 6 }}>Batch Import Student Answers</div>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 16, marginTop: 0 }}>
                Upload one or more student JSON files. Each file should contain:
                <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, marginLeft: 6, fontSize: '0.8rem' }}>
                  {`{ "exerciseId": 1, "studentName": "...", "blocklyState": {...} }`}
                </code>
              </p>
              <div
                style={{ border: '2px dashed #c7d2fe', borderRadius: 10, padding: '40px 20px', textAlign: 'center', color: '#6366f1', cursor: 'pointer', background: '#fafafe', transition: 'all 0.2s' }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = '#eef2ff'; }}
                onDragLeave={e => { e.currentTarget.style.background = '#fafafe'; }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.background = '#fafafe'; fileInputRef.current.files = e.dataTransfer.files; handleImport({ target: { files: e.dataTransfer.files, value: '' } }); }}
                onClick={() => fileInputRef.current?.click()}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📂</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Click to select or drag & drop</div>
                <div style={{ fontSize: '0.8rem', color: '#818cf8' }}>Accepts .json files</div>
              </div>
              <input ref={fileInputRef} type="file" accept=".json" multiple style={{ display: 'none' }} onChange={handleImport} />
            </div>
            {importResults && (
              <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#111827', marginBottom: 16 }}>Import Results</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {importResults.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: r.status === 'imported' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${r.status === 'imported' ? '#bbf7d0' : '#fecaca'}` }}>
                      <span>{r.status === 'imported' ? '✅' : '❌'}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', flex: 1 }}>{r.filename}</span>
                      {r.submissionId && <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>ID: {r.submissionId}</span>}
                      {r.message && <span style={{ fontSize: '0.78rem', color: '#dc2626' }}>{r.message}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Grade Modal */}
      {grading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}
          onClick={() => setGrading(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827', marginBottom: 4 }}>Grade Submission</div>
            <div style={{ fontSize: '0.82rem', color: '#6b7280', fontFamily: 'monospace', marginBottom: 20 }}>{grading.sourceFilename}</div>

            {grading.aspectResults === null && (
              <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: 16 }}>Loading grading results...</div>
            )}
            {grading.aspectResults && grading.aspectResults.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Grading Results</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {grading.aspectResults.map((a, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                      background: a.passed ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${a.passed ? '#bbf7d0' : '#fecaca'}`,
                      fontSize: '0.83rem', color: a.passed ? '#15803d' : '#dc2626', fontWeight: 500,
                    }}>
                      <span>{a.passed ? '✅' : '❌'}</span>
                      <span>{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Score (0–100)</div>
            <input type="number" min={0} max={100} placeholder="e.g. 85"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }}
              value={gradeForm.score} onChange={e => setGradeForm(f => ({ ...f, score: e.target.value }))} />
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Comment (optional)</div>
            <textarea rows={3} placeholder="Feedback for the student..."
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', resize: 'vertical', outline: 'none', marginBottom: 20, boxSizing: 'border-box' }}
              value={gradeForm.comment} onChange={e => setGradeForm(f => ({ ...f, comment: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={{ padding: '9px 20px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', background: '#fff', color: '#4b5563', fontWeight: 600, fontSize: '0.88rem' }}
                onClick={() => setGrading(null)}>Cancel</button>
              <button style={{ padding: '9px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}
                onClick={submitGrade}>Save Grade</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
