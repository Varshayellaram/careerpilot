import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--slate-50)' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: '240px', minHeight: '100vh' }}>
        <main style={{
          padding: '32px 40px',
          maxWidth: '1100px',
          margin: '0 auto'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;