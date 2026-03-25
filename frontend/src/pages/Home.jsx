import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api.js';

const S = {
  container: { maxWidth: 800, margin: '40px auto', padding: '0 20px' },
  h1: { fontSize: '1.8rem', fontWeight: 800, color: '#1a202c', marginBottom: 4 },
  sub: { color: '#718096', marginBottom: 28, fontSize: '0.92rem' },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '18px 20px',
    marginBottom: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    border: '1px solid #edf2f7',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s, transform 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  cardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 },
  title: { fontSize: '1rem', fontWeight: 700, color: '#1a202c', marginBottom: 4 },
  badge: {
    display: 'inline-block', padding: '2px 10px', borderRadius: 12,
    background: '#c6f6d5', color: '#22543d', fontSize: '0.78rem', fontWeight: 600
  },
  likeBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 14px', border: '1px solid #e2e8f0',
    borderRadius: 20, background: '#fff', cursor: 'pointer',
    fontSize: '0.82rem', color: '#718096',
    transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
  },
  empty: { textAlign: 'center', color: '#a0aec0', padding: '60px 0', fontSize: '1rem' },
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getClientId() {
  let id = localStorage.getItem('clientId');
  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : generateUUID();
    localStorage.setItem('clientId', id);
  }
  return id;
}

export default function Home() {
  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('liked') || '{}'); } catch { return {}; }
  });
  const navigate = useNavigate();

  useEffect(() => {
    apiGet('/api/exercises/categories')
      .then(r => r.json())
      .then(data => { setCategories(data); })
      .catch(() => {});
  }, []);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (selectedCategory) params.append('category', selectedCategory);
    if (selectedDifficulties.length > 0) {
      params.append('difficulty', selectedDifficulties.join(','));
    }
    return params.toString() ? `?${params.toString()}` : '';
  };

  useEffect(() => {
    const qs = buildQueryString();
    apiGet(`/api/exercises/published${qs}`)
      .then(r => r.json())
      .then(data => { setExercises(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedCategory, selectedDifficulties]);

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
      <p style={S.sub}>Pick an exercise and solve it with blocks</p>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#718096' }}>Category</label>
          <select value={selectedCategory || ''} onChange={(e) => setSelectedCategory(e.target.value || null)}
            style={{ padding: '8px 12px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: '0.9rem', cursor: 'pointer' }}>
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#718096' }}>Difficulty</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['EASY', 'MEDIUM', 'HARD'].map(diff => (
              <label key={diff} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.9rem', color: '#4a5568', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedDifficulties.includes(diff)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDifficulties([...selectedDifficulties, diff]);
                    } else {
                      setSelectedDifficulties(selectedDifficulties.filter(d => d !== diff));
                    }
                  }}
                />
                {diff}
              </label>
            ))}
          </div>
        </div>
      </div>

      {exercises.length === 0
        ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#a0aec0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4, color: '#718096' }}>No exercises yet</div>
            <div style={{ fontSize: '0.85rem' }}>Check back later or ask your tutor to publish some exercises.</div>
          </div>
        )
        : exercises.map(ex => (
          <div key={ex.id} style={S.card}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onClick={() => navigate(`/exercise/${ex.id}`)}>
            <div style={{
              width: 4, borderRadius: 4, alignSelf: 'stretch', flexShrink: 0,
              background: ex.difficulty === 'EASY' ? '#48bb78' : ex.difficulty === 'HARD' ? '#fc8181' : '#f6ad55'
            }} />
            <div style={S.cardRow}>
              <div style={{ flex: 1 }}>
                <div style={S.title}>{ex.title}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {ex.category && (
                    <span style={{ display: 'inline-block', padding: '3px 9px', backgroundColor: '#edf2f7', borderRadius: 20, fontSize: '0.78rem', fontWeight: 500, color: '#4a5568' }}>
                      {ex.category}
                    </span>
                  )}
                  <span style={{
                    display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                    background: ex.difficulty === 'EASY' ? '#c6f6d5' : ex.difficulty === 'HARD' ? '#fed7d7' : '#fefcbf',
                    color: ex.difficulty === 'EASY' ? '#22543d' : ex.difficulty === 'HARD' ? '#822727' : '#744210',
                  }}>
                    {ex.difficulty || 'MEDIUM'}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#a0aec0' }}>v{ex.currentVersionNumber}</span>
                </div>
              </div>
              <button
                style={{ ...S.likeBtn, ...(liked[ex.id] ? { background: '#fff5f5', borderColor: '#feb2b2', color: '#e53e3e' } : {}) }}
                onClick={e => handleLike(e, ex.id)}
                title={liked[ex.id] ? 'Unlike' : 'Like this exercise'}>
                {liked[ex.id] ? '❤️' : '🤍'} {ex.likeCount}
              </button>
            </div>
          </div>
        ))
      }
    </div>
  );
}
