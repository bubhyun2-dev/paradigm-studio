import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import AppHeader from './components/AppHeader';
import ProjectWorkspace from './components/ProjectWorkspace';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import AdminPage from './pages/AdminPage';
import AdminProducts from './pages/AdminProducts';
import AdminTemplates from './pages/AdminTemplates';
import HqDashboard from './pages/HqDashboard';

// ─── 로딩 화면 ─────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted">서버에 연결하는 중...</p>
    </div>
  );
}

// ─── 로그인 ────────────────────────────────────────────────────────
function LoginPage() {
  const login = useStore((s) => s.login);
  const user = useStore((s) => s.user);
  const appSettings = useStore((s) => s.appSettings);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const ok = login(fd.get('email') as string, fd.get('pin') as string);
    if (!ok) {
      setError('이메일 또는 접근코드가 올바르지 않습니다.');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">{appSettings.appName}</h1>
          <p className="text-sm text-muted">{appSettings.companyName}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-3">
            <label className="label">이메일</label>
            <input
              name="email"
              className="input"
              placeholder="이메일 입력"
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group mb-2">
            <label className="label">접근코드 (PIN)</label>
            <input
              name="pin"
              type="password"
              className="input"
              placeholder="접근코드 입력"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 mb-3">{error}</p>
          )}
          <button
            type="submit"
            className="btn btn-primary w-full justify-center mt-2"
            disabled={loading}
          >
            {loading ? '확인 중...' : '로그인'}
          </button>
        </form>
        <p className="text-xs text-muted text-center mt-4">
          접근코드는 관리자에게 문의하세요.
        </p>
      </div>
    </div>
  );
}

// ─── 보호된 레이아웃 ───────────────────────────────────────────────
function ProtectedLayout() {
  const user = useStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="flex flex-col h-screen">
      <AppHeader />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<ProjectList />} />
          <Route path="project/:id" element={<ProjectWorkspace />} />
          <Route
            path="admin"
            element={user.role === 'admin' ? <AdminPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="admin/products"
            element={user.role === 'admin' ? <AdminProducts /> : <Navigate to="/" replace />}
          />
          <Route
            path="admin/templates"
            element={user.role === 'admin' ? <AdminTemplates /> : <Navigate to="/" replace />}
          />
          <Route
            path="hq-dashboard"
            element={user.role === 'admin' ? <HqDashboard /> : <Navigate to="/" replace />}
          />
        </Routes>
      </main>
    </div>
  );
}

// ─── 앱 루트 ───────────────────────────────────────────────────────
export default function App() {
  const initializeApp = useStore((s) => s.initializeApp);
  const isInitialized = useStore((s) => s.isInitialized);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  if (!isInitialized) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}
