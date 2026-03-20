import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const S = {
  container: { maxWidth: 1000, margin: '32px auto', padding: '0 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  h1: { fontSize: '1.4rem', fontWeight: 700, color: '#2d3748' },
  btn: { padding: '8px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  th: { background: '#f7fafc', padding: '10px 16px', textAlign: 'left', fontSize: '0.82rem', color: '#4a5568', fontWeight: 600, borderBottom: '2px solid #e2e8f0' },
  td: { padding: '11px 16px', borderBottom: '1px solid #edf2f7', fontSize: '0.88rem', color: '#2d3748', verticalAlign: 'middle' },
  tabs: { display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e2e8f0' },
  tab: { padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.92rem', color: '#718096', borderBottom: '3px solid transparent', marginBottom: -2 },
};

const badge = (status) => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: '0.78rem',
  background: status === 'PUBLISHED' ? '#c6f6d5' : '#e2e8f0',
  color: status === 'PUBLISHED' ? '#276749' : '#4a5568',
});

export default function Admin() {
  const [tab, setTab] = useState('exercises');
  const [exercises, setExercises] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadExercises = () =>
    fetch('/api/exercises').then(r => r.json()).then(setExercises);

  const loadSubmissions = () =>
    fetch('/api/submissions').then(r => r.json()).then(setSubmissions);

  useEffect(() => {
    Promise.all([loadExercises(), loadSubmissions()])
      .finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (ex) => {
    const url = `/api/exercises/${ex.id}/${ex.status === 'PUBLISHED' ? 'unpublish' : 'publish'}`;
    await fetch(url, { method: 'POST' });
    loadExercises();
  };

  const deleteExercise = async (id) => {
    if (!confirm('確定刪除？')) return;
    await fetch(`/api/exercises/${id}`, { method: 'DELETE' });
    loadExercises();
  };

  const overrideGrade = async (subId) => {
    const score = prompt('輸入覆蓋分數 (0-100)：');
    if (score === null) return;
    const comment = prompt('輸入評語（可選）：') || '';
    await fetch(`/api/submissions/${subId}/grade`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tutorScore: parseInt(score), tutorComment: comment })
    });
    loadSubmissions();
  };

  if (loading) return <div style={{ padding: 40 }}>載入中...</div>;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <h1 style={S.h1}>管理後台</h1>
        {tab === 'exercises' && (
          <button style={{ ...S.btn, background: '#2b6cb0', color: '#fff' }}
            onClick={() => navigate('/admin/exercise/new')}>+ 新建題目</button>
        )}
      </div>

      <div style={S.tabs}>
        {[['exercises', '題目管理'], ['submissions', '提交記錄']].map(([key, label]) => (
          <button key={key} style={{ ...S.tab, ...(tab === key ? { color: '#2b6cb0', borderBottomColor: '#2b6cb0' } : {}) }}
            onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'exercises' && (
        <table style={S.table}>
          <thead>
            <tr>
              {['ID', '代碼', '標題', '狀態', '版本', '操作'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exercises.length === 0
              ? <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#a0aec0' }}>暫無題目</td></tr>
              : exercises.map(ex => (
                <tr key={ex.id}>
                  <td style={S.td}>{ex.id}</td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.82rem' }}>{ex.code}</td>
                  <td style={S.td}>{ex.title}</td>
                  <td style={S.td}><span style={badge(ex.status)}>{ex.status}</span></td>
                  <td style={S.td}>v{ex.currentVersionNumber}</td>
                  <td style={{ ...S.td, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button style={{ ...S.btn, background: '#ebf8ff', color: '#2b6cb0' }}
                      onClick={() => navigate(`/admin/exercise/${ex.id}/edit`)}>編輯</button>
                    <button style={{ ...S.btn, background: ex.status === 'PUBLISHED' ? '#fffaf0' : '#f0fff4', color: ex.status === 'PUBLISHED' ? '#c05621' : '#276749' }}
                      onClick={() => toggleStatus(ex)}>
                      {ex.status === 'PUBLISHED' ? '下架' : '發布'}
                    </button>
                    <button style={{ ...S.btn, background: '#fff5f5', color: '#c53030' }}
                      onClick={() => deleteExercise(ex.id)}>刪除</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {tab === 'submissions' && (
        <table style={S.table}>
          <thead>
            <tr>
              {['ID', '題目', '學生', '提交時間', '自動分', '老師分', '操作'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0
              ? <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#a0aec0' }}>暫無記錄</td></tr>
              : submissions.map(s => (
                <tr key={s.id}>
                  <td style={S.td}>{s.id}</td>
                  <td style={S.td}>{s.exerciseTitle}</td>
                  <td style={S.td}>{s.studentName}</td>
                  <td style={S.td}>{new Date(s.submittedAt).toLocaleString('zh-TW')}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: '#2b6cb0' }}>{s.autoScore ?? '—'}</td>
                  <td style={S.td}>{s.tutorScore ?? '—'}</td>
                  <td style={S.td}>
                    <button style={{ ...S.btn, background: '#ebf8ff', color: '#2b6cb0' }}
                      onClick={() => overrideGrade(s.id)}>覆蓋分數</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
