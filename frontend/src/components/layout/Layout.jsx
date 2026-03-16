import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar — fixed position */}
      <Sidebar />

      {/* Main content — pushed right by sidebar width */}
      <div style={{ marginLeft: '256px' }}>
        <main className="p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
