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
      <p style={S.sub}>Choose an exercise and build your solution with blocks!</p>

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
        ? <div style={S.empty}>No exercises available yet.</div>
        : exercises.map(ex => (
          <div key={ex.id} style={S.card}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'}
            onClick={() => navigate(`/exercise/${ex.id}`)}>
            <div style={S.cardRow}>
              <div style={{ flex: 1 }}>
                <div style={S.title}>{ex.title}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {ex.category && (
                    <span style={{ display: 'inline-block', padding: '4px 10px', backgroundColor: '#e0e0e0', borderRadius: 4, fontSize: '0.82rem', fontWeight: 500, color: '#2d3748' }}>
                      {ex.category}
                    </span>
                  )}
                  <span style={{ display: 'inline-block', padding: '4px 10px', backgroundColor: ex.difficulty === 'EASY' ? '#90EE90' : ex.difficulty === 'MEDIUM' ? '#FFD700' : '#FF6B6B', borderRadius: 4, fontSize: '0.82rem', fontWeight: 500, color: ex.difficulty === 'MEDIUM' ? '#000' : '#fff' }}>
                    {ex.difficulty || 'MEDIUM'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>v{ex.currentVersionNumber}</span>
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
