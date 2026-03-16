import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Target,
  LogOut,
  ChevronRight,
  Zap
} from 'lucide-react';

// Navigation items for sidebar
const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard
  },
  {
    id: 'pipeline',
    label: 'Tailor Resume',
    path: '/pipeline',
    icon: Zap,
    highlight: true  // highlighted as main CTA
  },
  {
    id: 'ats',
    label: 'ATS Checker',
    path: '/ats',
    icon: Target
  },
  {
    id: 'resumes',
    label: 'My Resumes',
    path: '/resumes',
    icon: FileText
  }
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useApp();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 h-screen bg-white border-r border-slate-200 
                    flex flex-col fixed left-0 top-0 z-50">

      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center 
                          justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-xl font-bold text-slate-800">
            CareerPilot
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 ml-11">
          AI Resume Assistant
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 
                         rounded-xl text-sm font-medium transition-all
                         ${isActive
                           ? 'bg-blue-50 text-blue-600'
                           : item.highlight
                             ? 'bg-blue-600 text-white hover:bg-blue-700'
                             : 'text-slate-600 hover:bg-slate-50'
                         }`}
            >
              <Icon size={18} />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && (
                <ChevronRight size={16} />
              )}
            </button>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center 
                          justify-center">
            <span className="text-blue-600 font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm
                     text-slate-600 hover:text-red-600 hover:bg-red-50
                     rounded-lg transition-all"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;