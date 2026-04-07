import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, FolderOpen, Copy, Trash2, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { ProjectStatus } from '../types';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: '초안',
  field_survey_complete: '현장조사 완료',
  layout_in_progress: '배치 진행중',
  proposal_ready: '제안 준비완료',
  confirmed: '확정',
  installation_pending: '설치 대기',
  installed: '설치 완료',
};

const STATUS_BADGE: Record<ProjectStatus, string> = {
  draft: 'badge badge-gray',
  field_survey_complete: 'badge badge-blue',
  layout_in_progress: 'badge badge-orange',
  proposal_ready: 'badge badge-teal',
  confirmed: 'badge badge-green',
  installation_pending: 'badge badge-orange',
  installed: 'badge badge-green',
};

const TOTAL_STEPS = 12;

export default function ProjectList() {
  const navigate = useNavigate();
  const projects = useStore((s) => s.projects);
  const duplicateProject = useStore((s) => s.duplicateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const setCurrentProject = useStore((s) => s.setCurrentProject);

  const sortedProjects = useMemo(
    () =>
      [...projects].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [projects],
  );

  const handleOpen = (id: string) => {
    setCurrentProject(id);
    navigate(`/project/${id}`);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('이 프로젝트를 삭제하시겠습니까?')) {
      deleteProject(id);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1280, margin: '0 auto' }}>
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <List size={24} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>프로젝트 목록</h1>
        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          총 {projects.length}건
        </span>
      </div>

      {sortedProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <FolderOpen size={40} style={{ margin: '0 auto 0.75rem' }} />
          <p>등록된 프로젝트가 없습니다.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr
                style={{
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>병원명</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>유형</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>지역</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>상태</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>진행률</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>수정일</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((p) => {
                const progress = p.completedSteps.length;
                const pct = Math.round((progress / TOTAL_STEPS) * 100);
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onClick={() => handleOpen(p.id)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                      {p.hospitalProfile.hospitalName}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      {p.hospitalProfile.hospitalType}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      {p.hospitalProfile.region || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={STATUS_BADGE[p.status]}>{STATUS_LABELS[p.status]}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 120 }}>
                        <div className="progress-bar-track" style={{ flex: 1 }}>
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {progress}/{TOTAL_STEPS}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      {formatDate(p.updatedAt)}
                    </td>
                    <td
                      style={{ padding: '0.75rem 1rem', textAlign: 'center' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="열기"
                          onClick={() => handleOpen(p.id)}
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="복제"
                          onClick={() => duplicateProject(p.id)}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="삭제"
                          onClick={() => handleDelete(p.id)}
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
