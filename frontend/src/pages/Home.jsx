import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const S = {
  container: { maxWidth: 800, margin: '40px auto', padding: '0 20px' },
  h1: { fontSize: '1.6rem', color: '#2d3748', marginBottom: 8 },
  sub: { color: '#718096', marginBottom: 28, fontSize: '0.95rem' },
  card: {
    background: '#fff', borderRadius: 10, padding: '20px 24px',
    marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    cursor: 'pointer', transition: 'box-shadow 0.2s',
    border: '1px solid #e2e8f0'
  },
  title: { fontSize: '1.1rem', fontWeight: 600, color: '#2d3748', marginBottom: 6 },
  badge: {
    display: 'inline-block', padding: '2px 10px', borderRadius: 12,
    background: '#c6f6d5', color: '#276749', fontSize: '0.78rem', fontWeight: 600
  },
  empty: { textAlign: 'center', color: '#a0aec0', padding: '60px 0', fontSize: '1rem' },
};

export default function Home() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/exercises/published')
      .then(r => r.json())
      .then(data => { setExercises(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={S.container}><p style={S.sub}>載入中...</p></div>;

  return (
    <div style={S.container}>
      <h1 style={S.h1}>練習題目</h1>
      <p style={S.sub}>選擇一道題目，用積木拼出你的答案！</p>
      {exercises.length === 0
        ? <div style={S.empty}>目前沒有可用的題目</div>
        : exercises.map(ex => (
          <div key={ex.id} style={S.card}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'}
            onClick={() => navigate(`/exercise/${ex.id}`)}>
            <div style={S.title}>{ex.title}</div>
            <span style={S.badge}>已發布</span>
            <span style={{ marginLeft: 12, fontSize: '0.82rem', color: '#a0aec0' }}>
              版本 {ex.currentVersionNumber}
            </span>
          </div>
        ))
      }
    </div>
  );
}
