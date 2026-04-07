import { useNavigate } from 'react-router-dom';
import { Plus, Save, Shield, LogOut, LayoutDashboard, BarChart3 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { createDemoProject } from '../data/seed';

export default function AppHeader() {
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const getCurrentProject = useStore((s) => s.getCurrentProject);
  const addProject = useStore((s) => s.addProject);
  const setCurrentProject = useStore((s) => s.setCurrentProject);
  const appSettings = useStore((s) => s.appSettings);

  const project = getCurrentProject();

  const handleNewProject = () => {
    const state = useStore.getState();
    const publishedTemplates = state.templates.filter(t => t.status === 'published');
    const master = publishedTemplates.length > 0
      ? publishedTemplates.reduce((prev, cur) => prev.version > cur.version ? prev : cur)
      : undefined;
    const blank = createDemoProject(master);
    blank.hospitalProfile.hospitalName = '새 병원';
    blank.hospitalProfile.hospitalType = '의원';
    blank.hospitalProfile.region = '';
    blank.hospitalProfile.address = '';
    blank.hospitalProfile.dailyPatientCount = 0;
    blank.hospitalProfile.contactName = '';
    blank.hospitalProfile.contactTitle = '';
    blank.hospitalProfile.contactPhone = '';
    blank.hospitalProfile.contactEmail = '';
    blank.salesProfile.dealerName = '';
    blank.salesProfile.salesRepName = '';
    blank.salesProfile.memo = '';
    blank.status = 'draft';
    blank.completedSteps = [];
    blank.sitePhotos = [];
    blank.infraMarks = [];
    blank.placedItems = [];
    blank.components = [];
    blank.contacts = [];
    blank.phase1Items = blank.phase1Items.map(i => ({ ...i, done: false, note: '' }));
    blank.phase2Items = blank.phase2Items.map(i => ({ ...i, done: false, note: '' }));
    blank.versions = [];
    blank.createdAt = new Date().toISOString();
    blank.updatedAt = new Date().toISOString();
    addProject(blank);
    setCurrentProject(blank.id);
    navigate(`/project/${blank.id}`);
  };

  const roleLabelMap: Record<string, string> = {
    admin: '관리자',
    sales: '영업',
    installer: '설치',
    viewer: '뷰어',
  };

  return (
    <header
      className="no-print flex items-center justify-between px-4 text-white shrink-0"
      style={{ backgroundColor: '#1e3a5f', height: 56 }}
    >
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <LayoutDashboard size={20} />
          <div className="leading-tight">
            <div className="font-bold text-sm tracking-wide">{appSettings?.appName || 'Paradigm Studio'}</div>
            <div className="text-[10px] opacity-70">{appSettings?.companyName || 'AT Solutions'}</div>
          </div>
        </button>
      </div>

      {/* Center: Current hospital name */}
      <div className="absolute left-1/2 -translate-x-1/2 text-sm font-medium truncate max-w-[300px]">
        {project ? project.hospitalProfile.hospitalName : ''}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          className="btn btn-sm flex items-center gap-1 text-white border-white/30 hover:bg-white/10"
          style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.3)' }}
          onClick={handleNewProject}
        >
          <Plus size={15} />
          <span className="text-xs">새 프로젝트</span>
        </button>

        <button
          className="btn btn-sm flex items-center gap-1 text-white border-white/30 hover:bg-white/10"
          style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.3)' }}
        >
          <Save size={15} />
          <span className="text-xs">저장</span>
        </button>

        {user?.role === 'admin' && (
          <>
            <button
              className="btn btn-sm flex items-center gap-1 text-white border-white/30 hover:bg-white/10"
              style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={() => navigate('/hq-dashboard')}
            >
              <BarChart3 size={15} />
              <span className="text-xs">본사관리</span>
            </button>
            <button
              className="btn btn-sm flex items-center gap-1 text-white border-white/30 hover:bg-white/10"
              style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={() => navigate('/admin')}
            >
              <Shield size={15} />
              <span className="text-xs">관리자</span>
            </button>
          </>
        )}

        {user && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
            <span className="text-xs opacity-90">{user.name}</span>
            <span className="badge badge-blue text-[10px] px-1.5 py-0">
              {roleLabelMap[user.role] ?? user.role}
            </span>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="hover:opacity-70 transition-opacity"
              title="로그아웃"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
