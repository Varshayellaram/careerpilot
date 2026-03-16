const ScoreCard = ({ title, score, maxScore }) => {
  const percentage = Math.round((score / maxScore) * 100);

  const getColor = () => {
    if (percentage >= 80) return '#16a34a';
    if (percentage >= 60) return '#2563eb';
    if (percentage >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div style={{
      background: 'var(--slate-50)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      transition: 'var(--transition)'
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-50)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--slate-50)'}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '8px'
      }}>
        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--slate-600)' }}>
          {title}
        </span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--slate-800)' }}>
          {score}/{maxScore}
        </span>
      </div>
      <div style={{
        width: '100%', height: '6px',
        background: 'var(--slate-200)',
        borderRadius: '99px', overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: getColor(),
          borderRadius: '99px',
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)'
        }} />
      </div>
    </div>
  );
};

export default ScoreCard;