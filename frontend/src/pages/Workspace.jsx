import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import BlocklyWorkspace from '../components/BlocklyWorkspace.jsx';

const S = {
  layout: { display: 'flex', height: 'calc(100vh - 50px)' },
  sidebar: { width: 320, background: '#fff', borderRight: '1px solid #e2e8f0', padding: 24, overflowY: 'auto', flexShrink: 0 },
  main: { flex: 1, display: 'flex', flexDirection: 'column', padding: 20, gap: 12 },
  title: { fontSize: '1.2rem', fontWeight: 700, color: '#2d3748', marginBottom: 8 },
  desc: { fontSize: '0.9rem', color: '#4a5568', lineHeight: 1.7, whiteSpace: 'pre-wrap' },
  label: { fontSize: '0.8rem', fontWeight: 600, color: '#718096', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.9rem', outline: 'none', marginBottom: 12 },
  btnRow: { display: 'flex', gap: 10 },
  btn: { padding: '9px 20px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' },
  result: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 },
  score: { fontSize: '2rem', fontWeight: 700, color: '#2b6cb0' },
  pre: { background: '#f7fafc', borderRadius: 4, padding: '8px 12px', fontSize: '0.82rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', marginTop: 8 },
};

export default function Workspace() {
  const { id } = useParams();
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    fetch(`/api/exercises/${id}`)
      .then(r => r.json())
      .then(data => { setExercise(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!studentName.trim()) { alert('請輸入你的名字'); return; }
    if (!wsRef.current) return;

    const blocklyState = wsRef.current.getState();
    const generatedCode = wsRef.current.getCode();

    if (!generatedCode.trim()) { alert('請先放入一些積木！'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: parseInt(id),
          studentName: studentName.trim(),
          blocklyState: JSON.stringify(blocklyState),
          generatedCode
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '提交失敗');
      setResult(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>載入中...</div>;
  if (!exercise) return <div style={{ padding: 40 }}>題目不存在</div>;

  const version = exercise.version;

  return (
    <div style={S.layout}>
      <aside style={S.sidebar}>
        <div style={S.title}>{exercise.title}</div>
        <div style={S.desc}>{version?.description || '暫無描述'}</div>

        <hr style={{ margin: '20px 0', borderColor: '#e2e8f0' }} />

        <label style={S.label}>你的名字</label>
        <input style={S.input} placeholder="輸入名字後提交" value={studentName}
          onChange={e => setStudentName(e.target.value)} />

        <div style={S.btnRow}>
          <button style={{ ...S.btn, background: '#2b6cb0', color: '#fff', flex: 1 }}
            onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '提交答案'}
          </button>
          <button style={{ ...S.btn, background: '#e2e8f0', color: '#4a5568' }}
            onClick={() => wsRef.current?.clear()}>清空</button>
        </div>

        {result && (
          <div style={{ marginTop: 20 }}>
            <div style={S.result}>
              <div style={{ fontSize: '0.85rem', color: '#718096', marginBottom: 4 }}>總分</div>
              <div style={S.score}>{result.autoScore} / 100</div>
              <div style={{ marginTop: 10, fontSize: '0.82rem', color: '#4a5568' }}>
                執行得分：{result.executionScore}/40 ·
                結構得分：{result.structureScore}/30 ·
                複雜度：{result.complexityScore}/30
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: '0.82rem', color: '#718096' }}>你的輸出：</div>
            <pre style={S.pre}>{result.actualOutput || '（無輸出）'}</pre>
            {result.executionScore < 40 && (
              <>
                <div style={{ marginTop: 8, fontSize: '0.82rem', color: '#718096' }}>預期輸出：</div>
                <pre style={S.pre}>{result.expectedOutput}</pre>
              </>
            )}
          </div>
        )}
      </aside>

      <main style={S.main}>
        <div style={{ flex: 1 }}>
          <BlocklyWorkspace
            onWorkspaceReady={api => { wsRef.current = api; }}
          />
        </div>
      </main>
    </div>
  );
}
