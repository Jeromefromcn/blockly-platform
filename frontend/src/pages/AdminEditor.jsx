import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BlocklyWorkspace from '../components/BlocklyWorkspace.jsx';

const S = {
  container: { maxWidth: 1100, margin: '28px auto', padding: '0 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  h1: { fontSize: '1.3rem', fontWeight: 700, color: '#2d3748' },
  card: { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 },
  label: { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#718096', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.92rem', outline: 'none', marginBottom: 16 },
  textarea: { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.88rem', fontFamily: 'monospace', resize: 'vertical', outline: 'none', marginBottom: 16 },
  row: { display: 'flex', gap: 20 },
  col: { flex: 1 },
  btn: { padding: '10px 24px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.92rem' },
  btnRow: { display: 'flex', gap: 12 },
};

export default function AdminEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    code: '', title: '', description: '', expectedOutput: '', createdBy: 'admin'
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/exercises/${id}`)
      .then(r => r.json())
      .then(data => {
        setForm({
          code: data.code,
          title: data.title,
          description: data.version?.description || '',
          expectedOutput: data.version?.expectedOutput || '',
          createdBy: 'admin'
        });
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.code.trim()) { alert('代碼和標題為必填'); return; }
    if (!form.description.trim()) { alert('題目描述為必填'); return; }
    if (!form.expectedOutput.trim()) { alert('預期輸出為必填'); return; }

    const blocklyState = wsRef.current
      ? JSON.stringify(wsRef.current.getState())
      : '{}';

    setSaving(true);
    try {
      const url = isEdit ? `/api/exercises/${id}` : '/api/exercises';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, blocklyState })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '保存失敗');
      alert('保存成功！');
      navigate('/admin');
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  if (loading) return <div style={{ padding: 40 }}>載入中...</div>;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <h1 style={S.h1}>{isEdit ? '編輯題目' : '新建題目'}</h1>
        <div style={S.btnRow}>
          <button style={{ ...S.btn, background: '#e2e8f0', color: '#4a5568' }}
            onClick={() => navigate('/admin')}>取消</button>
          <button style={{ ...S.btn, background: '#2b6cb0', color: '#fff' }}
            onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div style={S.row}>
        <div style={S.col}>
          <div style={S.card}>
            <h2 style={{ fontSize: '1rem', marginBottom: 16, color: '#2d3748' }}>基本信息</h2>
            <label style={S.label}>題目代碼（唯一標識，創建後不可修改）</label>
            <input style={{ ...S.input, ...(isEdit ? { background: '#f7fafc', color: '#a0aec0' } : {}) }}
              value={form.code} onChange={set('code')} placeholder="如 ex001"
              readOnly={isEdit} />

            <label style={S.label}>標題</label>
            <input style={S.input} value={form.title} onChange={set('title')} placeholder="題目標題" />

            <label style={S.label}>題目描述（學生可見，支持換行）</label>
            <textarea style={S.textarea} rows={6} value={form.description}
              onChange={set('description')} placeholder="描述題目要求..." />

            <label style={S.label}>預期輸出（程序應輸出的內容）</label>
            <textarea style={{ ...S.textarea, fontFamily: 'monospace', background: '#f7fafc' }}
              rows={4} value={form.expectedOutput}
              onChange={set('expectedOutput')} placeholder="Hello World" />
          </div>
        </div>

        <div style={{ flex: 1.4 }}>
          <div style={S.card}>
            <h2 style={{ fontSize: '1rem', marginBottom: 16, color: '#2d3748' }}>
              參考解答 <span style={{ fontWeight: 400, fontSize: '0.82rem', color: '#718096' }}>（用積木拼出標準答案）</span>
            </h2>
            <div style={{ height: 480 }}>
              <BlocklyWorkspace
                onWorkspaceReady={api => { wsRef.current = api; }}
                initialState={isEdit ? null : null}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
