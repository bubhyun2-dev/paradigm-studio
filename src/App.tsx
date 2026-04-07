import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import AppHeader from './components/AppHeader';
import ProjectWorkspace from './components/ProjectWorkspace';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
function LoginPage() {
  const login = useStore((s) => s.login);
  const user = useStore((s) => s.user);
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="card w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4">로그인</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            login(fd.get('email') as string, fd.get('pin') as string);
          }}
        >
          <div className="form-group mb-3">
            <label className="label">이메일</label>
            <input name="email" className="input" placeholder="demo@paradigm.co.kr" defaultValue="demo@paradigm.co.kr" />
          </div>
          <div className="form-group mb-4">
            <label className="label">PIN</label>
            <input name="pin" type="password" className="input" placeholder="1234" defaultValue="1234" />
          </div>
          <button type="submit" className="btn btn-primary w-full justify-center">로그인</button>
        </form>
      </div>
    </div>
  );
}
import AdminPage from './pages/AdminPage';
import AdminProducts from './pages/AdminProducts';
import AdminTemplates from './pages/AdminTemplates';
import HqDashboard from './pages/HqDashboard';

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
          <Route path="admin" element={user.role === 'admin' ? <AdminPage /> : <Navigate to="/" replace />} />
          <Route path="admin/products" element={user.role === 'admin' ? <AdminProducts /> : <Navigate to="/" replace />} />
          <Route path="admin/templates" element={user.role === 'admin' ? <AdminTemplates /> : <Navigate to="/" replace />} />
          <Route path="hq-dashboard" element={user.role === 'admin' ? <HqDashboard /> : <Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}
