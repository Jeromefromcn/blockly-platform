import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiDelete, apiGet, apiPatch, apiPost } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import BlocklyWorkspace from '../components/BlocklyWorkspace.jsx';

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

  // Two-panel grading state
  const [selectedSubmission, setSelectedSubmission] = useState(null); // the selected submission object
  const [gradingState, setGradingState] = useState(null); // { submissionId, sourceFilename, autoScore, aspectResults, blocklyState, previewOpen, generatedCode, codeOutput, codeOutputOpen, codeRunning }
  const [gradeForm, setGradeForm] = useState({ score: '', comment: '' });
  const [savingGrade, setSavingGrade] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState('list'); // 'list' or 'form'

  // Submission filters
  const [filterExercise, setFilterExercise] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Ungraded' | 'Graded'

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [exercisesPage, setExercisesPage] = useState(1);
  const [exercisesPerPage, setExercisesPerPage] = useState(10);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsPerPage, setSubmissionsPerPage] = useState(25);

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

  // Open a submission in the right panel
  const openGrade = async (sub) => {
    setSelectedSubmission(sub);
    setGradingState({ submissionId: sub.id, sourceFilename: sub.sourceFilename, autoScore: sub.autoScore ?? null, aspectResults: null, blocklyState: null, generatedCode: null, previewOpen: false, codeOutput: null, codeOutputOpen: false, codeRunning: false });
    setGradeForm({ score: sub.tutorScore ?? '', comment: sub.tutorComment ?? '' });
    setShowMobilePanel('form');

    try {
      const [detailRes, exerciseRes] = await Promise.all([
        apiGet(`/api/submissions/${sub.id}`),
        apiGet(`/api/exercises/${sub.exerciseId}`),
      ]);
      const detail = await detailRes.json();
      const exercise = await exerciseRes.json();

      const gradingMode = exercise.version?.gradingMode;
      const expectedOutput = exercise.version?.expectedOutput;

      let aspectResults = [];
      if (gradingMode) {
        const aspects = parseAspects(gradingMode);
        aspectResults = gradeAspects(aspects, detail.generatedCode, expectedOutput, detail.blocklyState);
      }

      setGradingState(prev => prev ? {
        ...prev,
        aspectResults,
        blocklyState: detail.blocklyState ?? null,
        generatedCode: detail.generatedCode ?? null,
      } : prev);
    } catch {}
  };

  // Save grade and auto-advance to next ungraded submission
  const saveGrade = async () => {
    const score = parseInt(gradeForm.score);
    if (isNaN(score) || score < 0 || score > 100) { toast('Score must be 0–100', 'warning'); return; }
    setSavingGrade(true);
    try {
      await apiPatch(`/api/submissions/${gradingState.submissionId}/grade`,
        { tutorScore: score, tutorComment: gradeForm.comment }
      );
      toast('Grade saved', 'success');

      // Reload submissions, then auto-advance to next ungraded
      const res = await apiGet('/api/submissions');
      const updated = await res.json();
      setSubmissions(updated);

      // Find next ungraded submission in the filtered list (after the current one)
      const filtered = applyFilters(updated);
      const currentIndex = filtered.findIndex(s => s.id === gradingState.submissionId);
      const nextUngraded = filtered.slice(currentIndex + 1).find(s => s.tutorScore == null)
        || filtered.slice(0, currentIndex).find(s => s.tutorScore == null);

      if (nextUngraded) {
        openGrade(nextUngraded);
      } else {
        setSelectedSubmission(null);
        setGradingState(null);
        setGradeForm({ score: '', comment: '' });
        setShowMobilePanel('list');
        toast('All submissions graded!', 'success');
      }
    } finally {
      setSavingGrade(false);
    }
  };

  // Execute student code and capture output
  const executeCode = () => {
    let code = gradingState?.generatedCode;

    // If generatedCode is missing, try to generate from blocklyState
    if (!code && gradingState?.blocklyState) {
      try {
        const Blockly = window.Blockly;
        if (Blockly && Blockly.serialization && Blockly.serialization.workspaces && Blockly.javascript) {
          const tempWorkspace = new Blockly.Workspace();
          const state = typeof gradingState.blocklyState === 'string'
            ? JSON.parse(gradingState.blocklyState)
            : gradingState.blocklyState;
          Blockly.serialization.workspaces.load(state, tempWorkspace);
          code = Blockly.javascript.workspaceToCode(tempWorkspace);
          tempWorkspace.dispose();
        }
      } catch (err) {
        setGradingState(prev => prev ? { ...prev, codeOutput: `Error generating code: ${err.message}`, codeRunning: false } : prev);
        return;
      }
    }

    if (!code) {
      setGradingState(prev => prev ? { ...prev, codeOutput: 'No code to execute' } : prev);
      return;
    }

    setGradingState(prev => prev ? { ...prev, codeRunning: true } : prev);
    try {
      const logs = [];
      const mockPrint = (...args) => logs.push(args.map(String).join(' '));
      const mockConsole = { log: mockPrint };

      const fn = new Function('console', 'print', code);
      fn(mockConsole, mockPrint);

      const output = logs.length > 0 ? logs.join('\n') : '(no output)';
      setGradingState(prev => prev ? { ...prev, codeOutput: output, codeRunning: false } : prev);
    } catch (err) {
      setGradingState(prev => prev ? { ...prev, codeOutput: `Error: ${err.message}`, codeRunning: false } : prev);
    }
  };

  // Apply exercise and status filters to a submissions array
  const applyFilters = (subs) => {
    let result = subs;
    if (filterExercise) result = result.filter(s => String(s.exerciseId) === filterExercise);
    if (filterStatus === 'Ungraded') result = result.filter(s => s.tutorScore == null);
    if (filterStatus === 'Graded') result = result.filter(s => s.tutorScore != null);
    return result;
  };

  const filteredSubmissions = applyFilters(submissions);

  // Paginated slice of filtered submissions
  const pagedSubmissions = filteredSubmissions.slice(
    (submissionsPage - 1) * submissionsPerPage,
    submissionsPage * submissionsPerPage
  );

  // Get unique exercises from submissions for the filter dropdown
  const exerciseOptions = Array.from(
    new Map(submissions.map(s => [s.exerciseId, s.exerciseTitle])).entries()
  );

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

        {/* Submissions Tab — Two-Panel Bulk Grading UI */}
        {tab === 'submissions' && (
          <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 220px)', minHeight: 500 }}>

            {/* Left Panel: Submission List (~40%) */}
            <div style={{
              width: '40%',
              minWidth: 280,
              display: showMobilePanel === 'form' && selectedSubmission ? 'none' : 'flex',
              flexDirection: 'column',
              background: '#fff',
              borderRadius: '12px 0 0 12px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {/* List header */}
              <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 12 }}>
                  Submissions
                  <span style={{ marginLeft: 8, fontSize: '0.78rem', fontWeight: 600, color: '#6b7280' }}>
                    ({filteredSubmissions.length} shown)
                  </span>
                </div>
                {/* Filter bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <select
                    value={filterExercise}
                    onChange={e => { setFilterExercise(e.target.value); setSubmissionsPage(1); }}
                    style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem', background: '#f8fafc', color: '#374151', cursor: 'pointer' }}>
                    <option value="">All Exercises</option>
                    {exerciseOptions.map(([id, title]) => (
                      <option key={id} value={String(id)}>{title}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['All', 'Ungraded', 'Graded'].map(status => (
                      <button key={status}
                        onClick={() => { setFilterStatus(status); setSubmissionsPage(1); }}
                        style={{
                          flex: 1, padding: '5px 0', border: 'none', borderRadius: 6, cursor: 'pointer',
                          fontSize: '0.78rem', fontWeight: 600,
                          background: filterStatus === status ? '#6366f1' : '#f1f5f9',
                          color: filterStatus === status ? '#fff' : '#6b7280',
                          transition: 'all 0.15s',
                        }}>
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submission rows */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredSubmissions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>No submissions found</div>
                  </div>
                ) : (
                  pagedSubmissions.map(s => {
                    const isSelected = selectedSubmission?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => openGrade(s)}
                        style={{
                          padding: '12px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: isSelected ? '#eef2ff' : '#fff',
                          borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: isSelected ? '#4338ca' : '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>
                            {s.studentName || 'Unknown'}
                          </div>
                          <div>
                            {s.tutorScore != null
                              ? <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 6 }}>{s.tutorScore}/100</span>
                              : <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600, background: '#fef3c7', padding: '2px 8px', borderRadius: 6 }}>Ungraded</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.77rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.exerciseTitle}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: '#9ca3af', marginTop: 2 }}>
                          {new Date(s.submittedAt).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination inside left panel */}
              <div style={{ borderTop: '1px solid #e2e8f0', padding: '10px 14px', flexShrink: 0, background: '#fafafa' }}>
                <Pagination
                  totalItems={filteredSubmissions.length}
                  currentPage={submissionsPage}
                  itemsPerPage={submissionsPerPage}
                  onPageChange={setSubmissionsPage}
                  onItemsPerPageChange={setSubmissionsPerPage}
                />
              </div>
            </div>

            {/* Right Panel: Grading Form (~60%) */}
            <div style={{
              flex: 1,
              display: showMobilePanel === 'list' && !selectedSubmission ? 'none' : 'flex',
              flexDirection: 'column',
              background: '#fff',
              borderRadius: '0 12px 12px 0',
              border: '1px solid #e2e8f0',
              borderLeft: 'none',
              overflow: 'hidden',
            }}>
              {!selectedSubmission ? (
                // Placeholder when nothing selected
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#9ca3af' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>Select a submission to grade</div>
                  <div style={{ fontSize: '0.83rem' }}>Click any submission in the list on the left</div>
                </div>
              ) : (
                <>
                  {/* Grading panel header */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', flexShrink: 0, background: '#fafafa' }}>
                    {/* Mobile back button */}
                    <button
                      onClick={() => { setShowMobilePanel('list'); }}
                      style={{ display: 'none', marginBottom: 10, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', color: '#4b5563', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                      className="mobile-back-btn">
                      &larr; Back to list
                    </button>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', marginBottom: 2 }}>
                      {selectedSubmission.studentName || 'Unknown'}
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        Exercise: <strong style={{ color: '#374151' }}>{selectedSubmission.exerciseTitle}</strong>
                      </span>
                      {gradingState?.sourceFilename && (
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', fontFamily: 'monospace' }}>
                          {gradingState.sourceFilename}
                        </span>
                      )}
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        {new Date(selectedSubmission.submittedAt).toLocaleString()}
                      </span>
                      {selectedSubmission.tutorScore != null && (
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 10px', borderRadius: 8 }}>
                          Current score: {selectedSubmission.tutorScore}/100
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scrollable grading body */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

                    {/* Blockly Preview */}
                    <div style={{ marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                      <button
                        onClick={() => setGradingState(prev => prev ? { ...prev, previewOpen: !prev.previewOpen } : prev)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', border: 'none', background: '#f8fafc', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                        <span>Blockly Preview</span>
                        <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                          {gradingState?.previewOpen ? '▲ Collapse' : '▼ Expand'}
                        </span>
                      </button>
                      {gradingState?.previewOpen && (
                        <div style={{ padding: 12 }}>
                          {gradingState.blocklyState ? (
                            <>
                              <div style={{ width: '100%', height: 400, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                                <BlocklyWorkspace
                                  readOnly={true}
                                  initialState={gradingState.blocklyState}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <button
                                  onClick={executeCode}
                                  disabled={gradingState.codeRunning || (!gradingState.generatedCode && !gradingState.blocklyState)}
                                  style={{
                                    padding: '8px 14px', border: 'none', borderRadius: 6, background: (gradingState.codeRunning || (!gradingState.generatedCode && !gradingState.blocklyState)) ? '#a5b4fc' : '#6366f1',
                                    color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: (gradingState.codeRunning || (!gradingState.generatedCode && !gradingState.blocklyState)) ? 'default' : 'pointer',
                                    transition: 'background 0.15s',
                                  }}>
                                  {gradingState.codeRunning ? 'Running...' : '▶ Run Code'}
                                </button>
                                {!gradingState.generatedCode && !gradingState.blocklyState && (
                                  <div style={{ padding: 10, borderRadius: 6, background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', fontSize: '0.8rem' }}>
                                    No code or workspace available for this submission
                                  </div>
                                )}
                                {gradingState.codeOutput !== null && (
                                  <div style={{
                                    padding: 10, borderRadius: 6, background: '#f3f4f6', border: '1px solid #d1d5db',
                                    fontFamily: 'monospace', fontSize: '0.8rem', color: '#1f2937', maxHeight: 200, overflowY: 'auto',
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.4',
                                  }}>
                                    {gradingState.codeOutput}
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <div style={{ padding: 16, color: '#6b7280', textAlign: 'center', fontStyle: 'italic', fontSize: '0.85rem' }}>
                              {gradingState.blocklyState === null && gradingState.aspectResults === null
                                ? 'Loading workspace...'
                                : 'No workspace saved for this submission'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Aspect results */}
                    {gradingState?.aspectResults === null && (
                      <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: 16 }}>Loading grading results...</div>
                    )}
                    {gradingState?.aspectResults && gradingState.aspectResults.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Auto-Grading Results</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {gradingState.aspectResults.map((a, i) => (
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

                    {/* Score input */}
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Score (0–100)</div>
                    <input type="number" min={0} max={100} placeholder="e.g. 85"
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }}
                      value={gradeForm.score} onChange={e => setGradeForm(f => ({ ...f, score: e.target.value }))} />

                    {/* Comment input */}
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Comment (optional)</div>
                    <textarea rows={4} placeholder="Feedback for the student..."
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', resize: 'vertical', outline: 'none', marginBottom: 20, boxSizing: 'border-box' }}
                      value={gradeForm.comment} onChange={e => setGradeForm(f => ({ ...f, comment: e.target.value }))} />
                  </div>

                  {/* Save button footer */}
                  <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#fafafa', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                      Auto-advances to next ungraded after saving
                    </div>
                    <button
                      disabled={savingGrade}
                      onClick={saveGrade}
                      style={{
                        padding: '10px 28px', border: 'none', borderRadius: 8, cursor: savingGrade ? 'default' : 'pointer',
                        background: savingGrade ? '#a5b4fc' : '#6366f1', color: '#fff', fontWeight: 700,
                        fontSize: '0.92rem', transition: 'background 0.15s',
                      }}>
                      {savingGrade ? 'Saving...' : 'Save Grade'}
                    </button>
                  </div>
                </>
              )}
            </div>
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
    </div>
  );
}
