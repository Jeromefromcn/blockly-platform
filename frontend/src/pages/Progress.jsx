import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../api.js';

const PASSING_SCORE = 60;

function difficultyStyle(difficulty) {
  if (difficulty === 'EASY') return { background: '#c6f6d5', color: '#22543d' };
  if (difficulty === 'HARD') return { background: '#fed7d7', color: '#822727' };
  return { background: '#fefcbf', color: '#744210' };
}

function difficultyBarColor(difficulty) {
  if (difficulty === 'EASY') return '#48bb78';
  if (difficulty === 'HARD') return '#fc8181';
  return '#f6ad55';
}

export default function Progress() {
  const [exercises, setExercises] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      apiGet('/api/exercises/published').then(r => r.json()),
      apiGet('/api/submissions/mine').then(r => r.json()),
    ])
      .then(([exData, subData]) => {
        setExercises(exData);
        setSubmissions(Array.isArray(subData) ? subData : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load progress data.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 20px', color: '#718096' }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 20px' }}>
        <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030', padding: '12px 16px', borderRadius: 8 }}>
          {error}
        </div>
      </div>
    );
  }

  // Build a map: exerciseId -> best submission info
  // For each exercise, pick the submission with the highest effective score (tutorScore > autoScore),
  // or if no grade, pick the most recent submission.
  const submissionsByExercise = {};
  for (const sub of submissions) {
    const exId = sub.exerciseId;
    const effectiveScore = sub.tutorScore != null ? sub.tutorScore : sub.autoScore;
    const isGraded = effectiveScore != null;

    if (!submissionsByExercise[exId]) {
      submissionsByExercise[exId] = { ...sub, effectiveScore, isGraded };
    } else {
      const existing = submissionsByExercise[exId];
      // Prefer graded over ungraded; among graded, prefer highest score
      if (!existing.isGraded && isGraded) {
        submissionsByExercise[exId] = { ...sub, effectiveScore, isGraded };
      } else if (existing.isGraded && isGraded && effectiveScore > existing.effectiveScore) {
        submissionsByExercise[exId] = { ...sub, effectiveScore, isGraded };
      }
    }
  }

  // Summary stats
  const totalExercises = exercises.length;
  const completedExercises = Object.values(submissionsByExercise).filter(s => s.isGraded).length;
  const attemptedExercises = Object.keys(submissionsByExercise).length;
  const gradedSubmissions = Object.values(submissionsByExercise).filter(s => s.isGraded);
  const avgScore = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + s.effectiveScore, 0) / gradedSubmissions.length)
    : null;
  const passCount = gradedSubmissions.filter(s => s.effectiveScore >= PASSING_SCORE).length;
  const passRate = gradedSubmissions.length > 0
    ? Math.round((passCount / gradedSubmissions.length) * 100)
    : null;

  const statCard = (label, value, sub, accent) => (
    <div style={{
      flex: '1 1 160px',
      background: '#fff',
      borderRadius: 12,
      padding: '18px 22px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: `1px solid #edf2f7`,
      borderTop: `3px solid ${accent}`,
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: accent, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2d3748', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: '#a0aec0', marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1a202c', marginBottom: 4 }}>My Progress</h1>
      <p style={{ color: '#718096', marginBottom: 28, fontSize: '0.92rem' }}>
        Track your exercise completion, scores, and overall performance.
      </p>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        {statCard('Total Exercises', totalExercises, 'available to you', '#6366f1')}
        {statCard('Attempted', attemptedExercises, `${totalExercises - attemptedExercises} not started`, '#3b82f6')}
        {statCard('Graded', completedExercises, 'with a score', '#10b981')}
        {statCard('Average Score', avgScore != null ? `${avgScore}/100` : '—', gradedSubmissions.length > 0 ? `across ${gradedSubmissions.length} graded` : 'no grades yet', '#f59e0b')}
        {statCard('Pass Rate', passRate != null ? `${passRate}%` : '—', `passing score ≥ ${PASSING_SCORE}`, '#8b5cf6')}
      </div>

      {/* Exercise progress list */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #edf2f7', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: '#2d3748', fontSize: '0.95rem' }}>Exercise Overview</span>
          <span style={{ fontSize: '0.78rem', color: '#a0aec0' }}>{totalExercises} exercises total</span>
        </div>

        {exercises.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#a0aec0', padding: '60px 20px', fontSize: '1rem' }}>
            No exercises available yet.
          </div>
        ) : (
          exercises.map((ex, idx) => {
            const sub = submissionsByExercise[ex.id];
            const isLast = idx === exercises.length - 1;

            let statusBadge;
            if (!sub) {
              statusBadge = (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: '#f7fafc', border: '1px solid #e2e8f0', color: '#a0aec0', fontSize: '0.8rem', fontWeight: 600 }}>
                  Not attempted
                </span>
              );
            } else if (!sub.isGraded) {
              statusBadge = (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', fontSize: '0.8rem', fontWeight: 600 }}>
                  Submitted — Pending grade
                </span>
              );
            } else {
              const passed = sub.effectiveScore >= PASSING_SCORE;
              statusBadge = (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700,
                  background: passed ? '#f0fff4' : '#fff5f5',
                  border: `1px solid ${passed ? '#9ae6b4' : '#feb2b2'}`,
                  color: passed ? '#276749' : '#c53030',
                }}>
                  {passed ? '✓' : '✗'} Score: {sub.effectiveScore}/100
                </span>
              );
            }

            return (
              <div
                key={ex.id}
                onClick={() => navigate(`/exercise/${ex.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px',
                  borderBottom: isLast ? 'none' : '1px solid #f7fafc',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Difficulty color bar */}
                <div style={{ width: 4, borderRadius: 4, alignSelf: 'stretch', flexShrink: 0, background: difficultyBarColor(ex.difficulty) }} />

                {/* Exercise info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a202c', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ex.title}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {ex.category && (
                      <span style={{ padding: '2px 8px', background: '#edf2f7', borderRadius: 20, fontSize: '0.75rem', color: '#4a5568', fontWeight: 500 }}>
                        {ex.category}
                      </span>
                    )}
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, ...difficultyStyle(ex.difficulty) }}>
                      {ex.difficulty || 'MEDIUM'}
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ flexShrink: 0 }}>
                  {statusBadge}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Progress bar */}
      {totalExercises > 0 && (
        <div style={{ marginTop: 20, background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #edf2f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4a5568' }}>Overall Completion</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6366f1' }}>
              {attemptedExercises}/{totalExercises} attempted
            </span>
          </div>
          <div style={{ background: '#edf2f7', borderRadius: 8, height: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 8, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              width: `${totalExercises > 0 ? (attemptedExercises / totalExercises) * 100 : 0}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#718096' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#f7fafc', border: '1px solid #e2e8f0' }} />
              Not attempted ({totalExercises - attemptedExercises})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#718096' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fefcbf', border: '1px solid #fcd34d' }} />
              Pending grade ({attemptedExercises - completedExercises})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#718096' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#c6f6d5', border: '1px solid #9ae6b4' }} />
              Graded ({completedExercises})
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
