import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api.js';

const S = {
  container: { maxWidth: 800, margin: '40px auto', padding: '0 20px' },
  h1: { fontSize: '1.6rem', color: '#2d3748', marginBottom: 8 },
  sub: { color: '#718096', marginBottom: 28, fontSize: '0.95rem' },
  card: {
    background: '#fff', borderRadius: 10, padding: '20px 24px',
    marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'box-shadow 0.2s'
  },
  cardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '1.05rem', fontWeight: 600, color: '#2d3748' },
  badge: {
    display: 'inline-block', padding: '2px 10px', borderRadius: 12,
    background: '#c6f6d5', color: '#276749', fontSize: '0.78rem', fontWeight: 600
  },
  likeBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 14px', border: '1px solid #e2e8f0',
    borderRadius: 20, background: '#fff', cursor: 'pointer',
    fontSize: '0.85rem', color: '#718096', transition: 'all 0.15s'
  },
  empty: { textAlign: 'center', color: '#a0aec0', padding: '60px 0', fontSize: '1rem' },
};

function getClientId() {
  let id = localStorage.getItem('clientId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('clientId', id);
  }
  return id;
}

export default function Home() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('liked') || '{}'); } catch { return {}; }
  });
  const navigate = useNavigate();

  useEffect(() => {
    apiGet('/api/exercises/published')
      .then(r => r.json())
      .then(data => { setExercises(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleLike = async (e, exId) => {
    e.stopPropagation();
    try {
      const clientId = getClientId();
      const res = await apiPost(`/api/exercises/${exId}/like?clientId=${encodeURIComponent(clientId)}`);
      const data = await res.json();
      setExercises(prev => prev.map(ex => ex.id === exId ? { ...ex, likeCount: data.likeCount } : ex));
      const newLiked = { ...liked, [exId]: data.liked };
      setLiked(newLiked);
      localStorage.setItem('liked', JSON.stringify(newLiked));
    } catch {}
  };

  if (loading) return <div style={S.container}><p style={S.sub}>Loading...</p></div>;

  return (
    <div style={S.container}>
      <h1 style={S.h1}>Exercises</h1>
      <p style={S.sub}>Choose an exercise and build your solution with blocks!</p>
      {exercises.length === 0
        ? <div style={S.empty}>No exercises available yet.</div>
        : exercises.map(ex => (
          <div key={ex.id} style={S.card}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'}
            onClick={() => navigate(`/exercise/${ex.id}`)}>
            <div style={S.cardRow}>
              <div>
                <div style={S.title}>{ex.title}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={S.badge}>Published</span>
                  <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>v{ex.currentVersionNumber}</span>
                </div>
              </div>
              <button
                style={{ ...S.likeBtn, ...(liked[ex.id] ? { background: '#fff5f5', borderColor: '#feb2b2', color: '#e53e3e' } : {}) }}
                onClick={e => handleLike(e, ex.id)}
                title={liked[ex.id] ? 'Already liked' : 'Like this exercise'}>
                {liked[ex.id] ? '❤️' : '🤍'} {ex.likeCount}
              </button>
            </div>
          </div>
        ))
      }
    </div>
  );
}
