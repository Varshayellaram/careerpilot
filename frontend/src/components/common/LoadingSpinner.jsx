const LoadingSpinner = ({ message = 'Processing...' }) => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '48px 24px',
    fontFamily: 'DM Sans, sans-serif'
  }}>
    <div style={{ position: 'relative', width: '48px', height: '48px', marginBottom: '20px' }}>
      <div style={{
        width: '48px', height: '48px',
        borderRadius: '50%',
        border: '3px solid var(--blue-100)'
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: '48px', height: '48px',
        borderRadius: '50%',
        border: '3px solid transparent',
        borderTopColor: 'var(--blue-600)',
        animation: 'spin 0.8s linear infinite'
      }} />
    </div>
    <p style={{
      fontSize: '14px', fontWeight: '500',
      color: 'var(--slate-600)'
    }}>
      {message}
    </p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default LoadingSpinner;