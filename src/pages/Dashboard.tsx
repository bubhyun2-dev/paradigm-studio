import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Plus,
  Clock,
  Copy,
  Trash2,
  Search,
  ArrowUpDown,
  FolderOpen,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { ProjectStatus, Project } from '../types';
import { createDemoProject } from '../data/seed';
import { parseEmbeddedProjectData, cloneProjectForImport } from '../utils/exportUtils';

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

const ALL_STATUSES: ProjectStatus[] = [
  'draft',
  'field_survey_complete',
  'layout_in_progress',
  'proposal_ready',
  'confirmed',
  'installation_pending',
  'installed',
];

const TOTAL_STEPS = 12;

export default function Dashboard() {
  const navigate = useNavigate();
  const projects = useStore((s) => s.projects);
  const products = useStore((s) => s.products);
  const dealers = useStore((s) => s.dealers);
  const appSettings = useStore((s) => s.appSettings);
  const user = useStore((s) => s.user);
  const addProject = useStore((s) => s.addProject);
  const duplicateProject = useStore((s) => s.duplicateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const setCurrentProject = useStore((s) => s.setCurrentProject);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterSalesRep, setFilterSalesRep] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortRecent, setSortRecent] = useState(true);

  // Seed data on first render if empty

  // Derived data
  const regions = useMemo(
    () => [...new Set(projects.map((p) => p.hospitalProfile.region))].filter(Boolean),
    [projects],
  );
  const salesReps = useMemo(
    () => [...new Set(projects.map((p) => p.salesProfile.salesRepName))].filter(Boolean),
    [projects],
  );

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const stats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter(
      (p) => !['confirmed', 'installed'].includes(p.status),
    ).length;
    const recentlyModified = projects.filter(
      (p) => new Date(p.updatedAt).getTime() >= sevenDaysAgo,
    ).length;
    const phase1Incomplete = projects.filter(
      (p) => p.phase1Items.some((item) => !item.done),
    ).length;
    const phase2Incomplete = projects.filter(
      (p) => p.phase2Items.some((item) => !item.done),
    ).length;
    const confirmed = projects.filter((p) => p.status === 'confirmed' || p.status === 'installed').length;
    return { total, inProgress, recentlyModified, phase1Incomplete, phase2Incomplete, confirmed };
  }, [projects, sevenDaysAgo]);

  // Filtered + sorted projects
  const filteredProjects = useMemo(() => {
    let list = [...projects];

    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase();
      list = list.filter((p) => p.hospitalProfile.hospitalName.toLowerCase().includes(q));
    }
    if (filterRegion) {
      list = list.filter((p) => p.hospitalProfile.region === filterRegion);
    }
    if (filterSalesRep) {
      list = list.filter((p) => p.salesProfile.salesRepName === filterSalesRep);
    }
    if (filterStatus) {
      list = list.filter((p) => p.status === filterStatus);
    }

    list.sort((a, b) => {
      const diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return sortRecent ? diff : -diff;
    });

    return list;
  }, [projects, searchName, filterRegion, filterSalesRep, filterStatus, sortRecent]);

  // Quick actions
  const handleNewProject = () => {
    const state = useStore.getState();
    const publishedTemplates = state.templates.filter(t => t.status === 'published');
    const master = publishedTemplates.length > 0
      ? publishedTemplates.reduce((prev, current) => (prev.version > current.version) ? prev : current)
      : undefined;
      
    const blank = createDemoProject(master);
    // Override to make it blank-ish
    blank.hospitalProfile.hospitalName = '새 병원';
    blank.hospitalProfile.hospitalType = '의원';
    blank.hospitalProfile.region = '';
    blank.hospitalProfile.address = '';
    blank.hospitalProfile.dailyPatientCount = 0;
    blank.hospitalProfile.contactName = '';
    blank.hospitalProfile.contactTitle = '';
    blank.hospitalProfile.contactPhone = '';
    blank.hospitalProfile.contactEmail = '';
    // 대리점 로그인 시 dealerId/dealerName 자동 설정
    if (user?.dealerId) {
      const myDealer = dealers.find((d) => d.id === user.dealerId);
      blank.salesProfile.dealerId = myDealer?.id ?? '';
      blank.salesProfile.dealerName = myDealer?.name ?? '';
    } else {
      blank.salesProfile.dealerId = '';
      blank.salesProfile.dealerName = '';
    }
    blank.salesProfile.salesRepName = '';
    blank.salesProfile.memo = '';
    blank.status = 'draft';
    blank.completedSteps = [];
    blank.sitePhotos = [];
    blank.infraMarks = [];
    blank.placedItems = [];
    blank.components = [];
    blank.contacts = [];
    blank.phase1Items = blank.phase1Items.map((i) => ({ ...i, done: false, note: '' }));
    blank.phase2Items = blank.phase2Items.map((i) => ({ ...i, done: false, note: '' }));
    blank.versions = [];
    blank.createdAt = new Date().toISOString();
    blank.updatedAt = new Date().toISOString();
    addProject(blank);
    setCurrentProject(blank.id);
    navigate(`/project/${blank.id}`);
  };

  const handleContinueRecent = () => {
    if (projects.length === 0) return;
    const sorted = [...projects].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    const recent = sorted[0];
    setCurrentProject(recent.id);
    navigate(`/project/${recent.id}`);
  };

  const handleDuplicateRecent = () => {
    if (projects.length === 0) return;
    const sorted = [...projects].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    duplicateProject(sorted[0].id);
  };

  const handleOpenProject = (id: string) => {
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const importProjects = useStore((s) => s.importProjects);
  const updateProject = useStore((s) => s.updateProject);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let importedOriginal: Project | null = null;
      let importType: 'html' | 'json' = 'json';

      if (file.name.endsWith('.html')) {
        importedOriginal = parseEmbeddedProjectData(text);
        importType = 'html';
      } else if (file.name.endsWith('.json')) {
        importedOriginal = JSON.parse(text) as Project;
      }

      if (!importedOriginal || !importedOriginal.id) {
        throw new Error("유효한 프로젝트 백업 데이터가 아닙니다.");
      }

      const cloned = cloneProjectForImport(importedOriginal, importType);
      addProject(cloned);
      setCurrentProject(cloned.id);
      navigate(`/project/${cloned.id}`);

    } catch (err: any) {
      alert(`가져오기 실패: ${err.message}`);
    }
    e.target.value = '';
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const parsed: Project[] = [];
    let errors = 0;
    await Promise.all(
      Array.from(files).filter(f => f.name.endsWith('.json')).map(
        f => new Promise<void>(resolve => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const data = JSON.parse(ev.target?.result as string) as Project;
              if (data?.id && data.hospitalProfile) parsed.push(data);
              else errors++;
            } catch { errors++; }
            resolve();
          };
          reader.readAsText(f);
        })
      )
    );
    if (parsed.length > 0) {
      const result = importProjects(parsed);
      alert(`가져오기 완료: 신규 ${result.added}건 · 업데이트 ${result.updated}건${errors > 0 ? ` · 오류 ${errors}건` : ''}`);
    } else {
      alert(`가져올 수 있는 파일이 없습니다.${errors > 0 ? ` (오류 ${errors}건)` : ''}`);
    }
    e.target.value = '';
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1280, margin: '0 auto' }}>
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: appSettings?.noticeMessage ? '0.75rem' : '1.5rem' }}>
        <BarChart3 size={24} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>대시보드</h1>
      </div>

      {/* 공지 메시지 */}
      {appSettings?.noticeMessage && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '0.5rem', padding: '0.625rem 1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#713f12', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📢</span> {appSettings.noticeMessage}
        </div>
      )}

      {/* ─── A. Stats Row ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">전체 프로젝트 수</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.inProgress}</span>
          <span className="stat-label">진행 중</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.recentlyModified}</span>
          <span className="stat-label">최근 수정 (7일)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.phase1Incomplete}</span>
          <span className="stat-label">Phase 1 미완료</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.phase2Incomplete}</span>
          <span className="stat-label">Phase 2 미완료</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.confirmed}</span>
          <span className="stat-label">최종안 확정</span>
        </div>
      </div>

      {/* ─── B. Filters Bar ───────────────────────────────────────── */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem',
          padding: '1rem 1.25rem',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="input"
            placeholder="병원명 검색"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ paddingLeft: '2rem' }}
          />
        </div>

        <select
          className="input"
          style={{ flex: '0 1 160px' }}
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
        >
          <option value="">지역 전체</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          className="input"
          style={{ flex: '0 1 160px' }}
          value={filterSalesRep}
          onChange={(e) => setFilterSalesRep(e.target.value)}
        >
          <option value="">담당 영업 전체</option>
          {salesReps.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          className="input"
          style={{ flex: '0 1 170px' }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">상태 전체</option>
          {ALL_STATUSES.map((st) => (
            <option key={st} value={st}>{STATUS_LABELS[st]}</option>
          ))}
        </select>

        <button
          className="btn btn-outline btn-sm"
          onClick={() => setSortRecent((v) => !v)}
          title="최근 수정일 정렬 토글"
        >
          <ArrowUpDown size={14} />
          {sortRecent ? '최신순' : '오래된순'}
        </button>
      </div>

      {/* ─── B. Actions Row ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button
          className="btn btn-primary"
          onClick={handleNewProject}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} /> 새 프로젝트 생성
        </button>
        <button
          className="btn btn-outline"
          onClick={handleContinueRecent}
          disabled={projects.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Clock size={18} /> 최근 프로젝트 이어서 하기
        </button>
        <button
          className="btn btn-outline"
          onClick={handleImportClick}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FolderOpen size={18} /> 단일 복원 (HTML/JSON)
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".html,.json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          className="btn btn-outline"
          onClick={() => bulkFileInputRef.current?.click()}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#3b82f6', color: '#3b82f6' }}
        >
          <Building2 size={18} /> 대량 Import (여러 JSON)
        </button>
        <input
          type="file"
          ref={bulkFileInputRef}
          accept=".json"
          multiple
          style={{ display: 'none' }}
          onChange={handleBulkImport}
        />
        <button className="btn btn-outline" onClick={handleDuplicateRecent} disabled={projects.length === 0}>
          <Copy size={16} />
          기존 프로젝트 복제
        </button>
        <button
          className="btn btn-outline"
          onClick={() => navigate('/hq-dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', borderColor: '#8b5cf6', color: '#8b5cf6' }}
        >
          <BarChart3 size={18} /> 본사 관리 센터
        </button>
      </div>

      {/* ─── D. Project Cards ─────────────────────────────────────── */}
      {filteredProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <FolderOpen size={40} style={{ margin: '0 auto 0.75rem' }} />
          <p>조건에 맞는 프로젝트가 없습니다.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1rem',
          }}
        >
          {filteredProjects.map((p) => {
            const progress = p.completedSteps.length;
            const pct = Math.round((progress / TOTAL_STEPS) * 100);
            return (
              <div
                key={p.id}
                className="card"
                style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onClick={() => handleOpenProject(p.id)}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      {p.hospitalProfile.hospitalName}
                    </h3>
                    <span className={STATUS_BADGE[p.status]}>{STATUS_LABELS[p.status]}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
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
                </div>

                <div style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
                  <span>지역: {p.hospitalProfile.region || '-'}</span>
                  <span>담당 영업: {p.salesProfile.salesRepName || '-'}</span>
                  <span>대리점: {p.salesProfile.dealerName || '-'}</span>
                  {p.expectedInstallDate && (
                    <span style={{ color: '#1e40af', fontWeight: 600 }}>📅 예상 설치일: {p.expectedInstallDate}</span>
                  )}
                  {p.actualInstallDate && (
                    <span style={{ color: '#10b981', fontWeight: 600 }}>✅ 실제 설치일: {p.actualInstallDate}</span>
                  )}
                  <span>마지막 수정일: {formatDate(p.updatedAt)}</span>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="progress-bar-track" style={{ flex: 1 }}>
                    <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {progress}/{TOTAL_STEPS}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
