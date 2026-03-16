import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard, FileText,
  Target, Zap, LogOut, ChevronRight
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Tailor Resume', path: '/pipeline', icon: Zap, primary: true },
  { id: 'ats', label: 'ATS Checker', path: '/ats', icon: Target },
  { id: 'resumes', label: 'My Resumes', path: '/resumes', icon: FileText },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useApp();

  return (
    <aside style={{
      width: '240px',
      height: '100vh',
      background: 'white',
      borderRight: '1px solid var(--slate-200)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow-sm)'
    }}>

      {/* Logo */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid var(--slate-100)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37,99,235,0.35)'
          }}>
            <Zap size={16} color="white" />
          </div>
          <div>
            <div style={{
              fontSize: '15px', fontWeight: '700',
              color: 'var(--slate-900)', letterSpacing: '-0.3px'
            }}>
              CareerPilot
            </div>
            <div style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '1px' }}>
              AI Resume Assistant
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13.5px',
                fontWeight: isActive ? '600' : '500',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'var(--transition)',
                background: item.primary && !isActive
                  ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                  : isActive
                    ? 'var(--blue-50)'
                    : 'transparent',
                color: item.primary && !isActive
                  ? 'white'
                  : isActive
                    ? 'var(--blue-600)'
                    : 'var(--slate-600)',
                boxShadow: item.primary && !isActive
                  ? '0 2px 8px rgba(37,99,235,0.3)'
                  : 'none'
              }}
              onMouseEnter={e => {
                if (!isActive && !item.primary) {
                  e.currentTarget.style.background = 'var(--slate-50)';
                  e.currentTarget.style.color = 'var(--slate-800)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive && !item.primary) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--slate-600)';
                }
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              {isActive && <ChevronRight size={14} />}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{
        padding: '12px 10px',
        borderTop: '1px solid var(--slate-100)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: '10px', padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '4px'
        }}>
          <div style={{
            width: '30px', height: '30px',
            background: 'linear-gradient(135deg, var(--blue-100), var(--blue-50))',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '700',
            color: 'var(--blue-600)', flexShrink: 0
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13px', fontWeight: '600',
              color: 'var(--slate-800)',
              whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user?.name}
            </div>
            <div style={{
              fontSize: '11px', color: 'var(--slate-400)',
              whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user?.email}
            </div>
          </div>
        </div>

        <button
          onClick={() => { logout(); }}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 12px',
            borderRadius: 'var(--radius-md)',
            border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '500',
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--slate-500)',
            background: 'transparent',
            transition: 'var(--transition)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--red-50)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--slate-500)';
          }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;