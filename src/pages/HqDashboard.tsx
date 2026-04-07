import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  UploadCloud,
  Building2,
  CalendarDays,
  List,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  FolderOpen,
  Check,
  X,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Project, ProjectStatus } from '../types';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: '초안',
  field_survey_complete: '현장조사 완료',
  layout_in_progress: '배치 진행중',
  proposal_ready: '제안 준비완료',
  confirmed: '확정',
  installation_pending: '설치 대기',
  installed: '설치 완료',
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  draft: '#94a3b8',
  field_survey_complete: '#3b82f6',
  layout_in_progress: '#f59e0b',
  proposal_ready: '#14b8a6',
  confirmed: '#22c55e',
  installation_pending: '#f97316',
  installed: '#10b981',
};

function formatDate(iso?: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoToMonthKey(iso?: string) {
  if (!iso) return '';
  return iso.slice(0, 7); // YYYY-MM
}

// ── 월별 캘린더 컴포넌트 ───────────────────────────────────────────
function MonthCalendar({
  year,
  month,
  projects,
  onOpenProject,
}: {
  year: number;
  month: number; // 0-indexed
  projects: Project[];
  onOpenProject: (id: string) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 날짜별 프로젝트 맵
  const byDate = useMemo(() => {
    const map: Record<string, Project[]> = {};
    projects.forEach((p) => {
      const d = p.expectedInstallDate;
      if (!d) return;
      const key = d.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [projects]);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // 6주 보장
  while (cells.length % 7 !== 0) cells.push(null);

  const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
        {DAY_LABELS.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, padding: '0.5rem 0', color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#64748b' }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} style={{ minHeight: 80, background: '#f8fafc', borderRadius: 4 }} />;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayProjects = byDate[dateKey] || [];
          const isToday = dateKey === todayKey;
          const isWeekend = (idx % 7 === 0 || idx % 7 === 6);
          return (
            <div
              key={idx}
              style={{
                minHeight: 80,
                background: isToday ? '#eff6ff' : '#fff',
                border: isToday ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: 4,
                padding: '4px',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: isToday ? 700 : 500, color: isWeekend ? (idx % 7 === 0 ? '#ef4444' : '#3b82f6') : '#334155', marginBottom: 2 }}>
                {day}
              </div>
              {dayProjects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onOpenProject(p.id)}
                  title={p.hospitalProfile.hospitalName}
                  style={{
                    background: p.status === 'installed' ? '#dcfce7' : '#dbeafe',
                    color: p.status === 'installed' ? '#166534' : '#1e40af',
                    fontSize: '0.6875rem',
                    padding: '1px 4px',
                    borderRadius: 3,
                    marginBottom: 2,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  {p.status === 'installed' && <Check size={9} />}
                  {p.hospitalProfile.hospitalName}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────
export default function HqDashboard() {
  const navigate = useNavigate();
  const projects = useStore((s) => s.projects);
  const dealers = useStore((s) => s.dealers);
  const updateProject = useStore((s) => s.updateProject);
  const setCurrentProject = useStore((s) => s.setCurrentProject);
  const importProjects = useStore((s) => s.importProjects);

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filterDealer, setFilterDealer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchName, setSearchName] = useState('');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; updated: number; errors: number } | null>(null);
  const [editingInstallId, setEditingInstallId] = useState<string | null>(null);
  const [installDateInput, setInstallDateInput] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [actualDateInput, setActualDateInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 통계 ─────────────────────────────────────────────────────────
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const stats = useMemo(() => {
    const total = projects.length;
    const installed = projects.filter((p) => p.status === 'installed').length;
    const inProgress = total - installed;
    const thisMonthInstall = projects.filter(
      (p) => p.expectedInstallDate && isoToMonthKey(p.expectedInstallDate) === thisMonthKey
    ).length;
    return { total, installed, inProgress, thisMonthInstall };
  }, [projects, thisMonthKey]);

  // ── 대리점 목록 ──────────────────────────────────────────────────
  const dealerNames = useMemo(() => {
    const names = new Set(projects.map((p) => p.salesProfile.dealerName).filter(Boolean));
    return Array.from(names).sort();
  }, [projects]);

  // ── 필터된 프로젝트 ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...projects];
    if (filterDealer) list = list.filter((p) => p.salesProfile.dealerName === filterDealer);
    if (filterStatus) list = list.filter((p) => p.status === filterStatus);
    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase();
      list = list.filter((p) => p.hospitalProfile.hospitalName.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      // 설치일 있는 것 먼저, 없으면 최근 수정순
      if (a.expectedInstallDate && b.expectedInstallDate) {
        return a.expectedInstallDate.localeCompare(b.expectedInstallDate);
      }
      if (a.expectedInstallDate) return -1;
      if (b.expectedInstallDate) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [projects, filterDealer, filterStatus, searchName]);

  // ── JSON 파일 파싱 & Import ────────────────────────────────────────
  const parseAndImport = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const parsed: Project[] = [];
    let errors = 0;

    await Promise.all(
      fileArr
        .filter((f) => f.name.endsWith('.json'))
        .map(
          (f) =>
            new Promise<void>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                try {
                  const data = JSON.parse(e.target?.result as string) as Project;
                  if (data && data.id && data.hospitalProfile) {
                    parsed.push(data);
                  } else {
                    errors++;
                  }
                } catch {
                  errors++;
                }
                resolve();
              };
              reader.readAsText(f);
            })
        )
    );

    if (parsed.length > 0) {
      const result = importProjects(parsed);
      setImportResult({ ...result, errors });
    } else {
      setImportResult({ added: 0, updated: 0, errors });
    }
  }, [importProjects]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) parseAndImport(e.dataTransfer.files);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) parseAndImport(e.target.files);
    e.target.value = '';
  };

  // ── 예상 설치일 저장 ──────────────────────────────────────────────
  const saveInstallDate = (id: string) => {
    updateProject(id, { expectedInstallDate: installDateInput || undefined });
    setEditingInstallId(null);
  };

  // ── 설치 완료 처리 ────────────────────────────────────────────────
  const confirmComplete = (id: string) => {
    updateProject(id, {
      status: 'installed',
      actualInstallDate: actualDateInput || new Date().toISOString().slice(0, 10),
    });
    setCompletingId(null);
    setActualDateInput('');
  };

  const handleOpenProject = (id: string) => {
    setCurrentProject(id);
    navigate(`/project/${id}`);
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── 헤더 ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart3 size={24} />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>본사 관리 센터</h1>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>대리점 시방서 수신 · 설치일정 관리 · 완료 처리</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setViewMode('list')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <List size={14} /> 목록
          </button>
          <button
            className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setViewMode('calendar')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <CalendarDays size={14} /> 캘린더
          </button>
        </div>
      </div>

      {/* ── 통계 카드 ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: '전체 프로젝트', value: stats.total, color: '#3b82f6', icon: <Building2 size={20} /> },
          { label: '진행중', value: stats.inProgress, color: '#f59e0b', icon: <Clock size={20} /> },
          { label: '설치 완료', value: stats.installed, color: '#10b981', icon: <CheckCircle2 size={20} /> },
          { label: `${MONTH_NAMES[now.getMonth()]} 예정`, value: stats.thisMonthInstall, color: '#8b5cf6', icon: <CalendarDays size={20} /> },
        ].map((s) => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div style={{ color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── JSON Import 드롭존 ────────────────────────────────────── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed #3b82f6' : '2px dashed #cbd5e1',
          background: isDragging ? '#eff6ff' : '#fafafa',
          borderRadius: '0.75rem',
          padding: '1.5rem 2rem',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <UploadCloud size={28} color={isDragging ? '#3b82f6' : '#94a3b8'} style={{ margin: '0 auto 0.5rem' }} />
        <p style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
          대리점 시방서 JSON 파일을 여기에 드래그하거나 클릭해서 선택하세요
        </p>
        <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          여러 파일 동시 선택 가능 · 기존 프로젝트는 자동 업데이트 · 신규는 추가
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Import 결과 */}
      {importResult && (
        <div style={{
          background: importResult.errors > 0 && importResult.added + importResult.updated === 0 ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${importResult.errors > 0 && importResult.added + importResult.updated === 0 ? '#fca5a5' : '#86efac'}`,
          borderRadius: '0.5rem',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.875rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534' }}>
            <Check size={16} />
            <span>
              <strong>가져오기 완료</strong> —
              신규 추가 {importResult.added}건 · 업데이트 {importResult.updated}건
              {importResult.errors > 0 && <span style={{ color: '#dc2626' }}> · 오류 {importResult.errors}건</span>}
            </span>
          </div>
          <button onClick={() => setImportResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── 필터 바 ───────────────────────────────────────────────── */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '0.75rem 1rem', alignItems: 'center' }}>
        {/* 검색 */}
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={15} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="input"
            placeholder="병원명 검색"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ paddingLeft: '2rem', fontSize: '0.875rem' }}
          />
        </div>

        {/* 대리점 필터 */}
        <select
          className="input"
          style={{ flex: '0 1 180px', fontSize: '0.875rem' }}
          value={filterDealer}
          onChange={(e) => setFilterDealer(e.target.value)}
        >
          <option value="">전체 대리점</option>
          {dealerNames.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* 상태 필터 */}
        <select
          className="input"
          style={{ flex: '0 1 160px', fontSize: '0.875rem' }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">전체 상태</option>
          {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((st) => (
            <option key={st} value={st}>{STATUS_LABELS[st]}</option>
          ))}
        </select>

        <span style={{ fontSize: '0.8125rem', color: '#94a3b8', marginLeft: 'auto' }}>
          {filtered.length}건 표시중 / 전체 {projects.length}건
        </span>
      </div>

      {/* ── 목록 뷰 ───────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['병원명', '대리점', '지역', '상태', '예상 설치일', '실제 설치일', '작업'].map((h) => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                      <FolderOpen size={32} style={{ margin: '0 auto 0.5rem' }} />
                      <p>프로젝트가 없습니다.<br />위 드롭존에 JSON 파일을 가져오거나 새 프로젝트를 생성하세요.</p>
                    </td>
                  </tr>
                ) : filtered.map((p, idx) => {
                  const isInstalled = p.status === 'installed';
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isInstalled ? '#f0fdf4' : idx % 2 === 0 ? '#fff' : '#fafafa',
                      }}
                    >
                      {/* 병원명 */}
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                        <button
                          onClick={() => handleOpenProject(p.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0 }}
                        >
                          {p.hospitalProfile.hospitalName}
                          <ExternalLink size={12} />
                        </button>
                      </td>

                      {/* 대리점 */}
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {p.salesProfile.dealerName || '-'}
                      </td>

                      {/* 지역 */}
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {p.hospitalProfile.region || '-'}
                      </td>

                      {/* 상태 */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: STATUS_COLOR[p.status] + '20',
                          color: STATUS_COLOR[p.status],
                          whiteSpace: 'nowrap',
                        }}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>

                      {/* 예상 설치일 */}
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        {editingInstallId === p.id ? (
                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            <input
                              type="date"
                              className="input"
                              value={installDateInput}
                              onChange={(e) => setInstallDateInput(e.target.value)}
                              style={{ fontSize: '0.8125rem', padding: '0.25rem 0.5rem', width: 140 }}
                              autoFocus
                            />
                            <button className="btn btn-primary btn-sm" onClick={() => saveInstallDate(p.id)}>
                              <Check size={13} />
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingInstallId(null)}>
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (isInstalled) return;
                              setEditingInstallId(p.id);
                              setInstallDateInput(p.expectedInstallDate || '');
                            }}
                            style={{
                              background: 'none',
                              border: isInstalled ? 'none' : '1px dashed #cbd5e1',
                              borderRadius: '0.375rem',
                              padding: '0.25rem 0.5rem',
                              cursor: isInstalled ? 'default' : 'pointer',
                              fontSize: '0.875rem',
                              color: p.expectedInstallDate ? '#1e40af' : '#94a3b8',
                              fontWeight: p.expectedInstallDate ? 600 : 400,
                            }}
                          >
                            {p.expectedInstallDate || (isInstalled ? '-' : '+ 날짜 입력')}
                          </button>
                        )}
                      </td>

                      {/* 실제 설치일 */}
                      <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontWeight: 600 }}>
                        {p.actualInstallDate || '-'}
                      </td>

                      {/* 작업 버튼 */}
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        {isInstalled ? (
                          <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={15} /> 설치완료
                          </span>
                        ) : (
                          <button
                            className="btn btn-sm"
                            style={{ background: '#16a34a', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
                            onClick={() => {
                              setCompletingId(p.id);
                              setActualDateInput(new Date().toISOString().slice(0, 10));
                            }}
                          >
                            <CheckCircle2 size={14} /> 설치완료
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 캘린더 뷰 ─────────────────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <div className="card">
          {/* 월 네비게이션 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}><ChevronLeft size={18} /></button>
            <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>
              {calYear}년 {MONTH_NAMES[calMonth]}
              <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: '#64748b', marginLeft: '0.5rem' }}>
                ({filtered.filter(p => isoToMonthKey(p.expectedInstallDate) === `${calYear}-${String(calMonth + 1).padStart(2, '0')}`).length}건 예정)
              </span>
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}><ChevronRight size={18} /></button>
          </div>
          <MonthCalendar
            year={calYear}
            month={calMonth}
            projects={filtered}
            onOpenProject={handleOpenProject}
          />
          {/* 범례 */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, background: '#dbeafe', borderRadius: 2 }} />
              진행중
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, background: '#dcfce7', borderRadius: 2 }} />
              설치완료
            </span>
          </div>
        </div>
      )}

      {/* ── 대리점별 현황 ─────────────────────────────────────────── */}
      {dealerNames.length > 0 && (
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>
            <Building2 size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
            대리점별 현황
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {dealerNames.map((name) => {
              const dProjects = projects.filter((p) => p.salesProfile.dealerName === name);
              const dInstalled = dProjects.filter((p) => p.status === 'installed').length;
              const dPct = dProjects.length > 0 ? Math.round((dInstalled / dProjects.length) * 100) : 0;
              const dealer = dealers.find((d) => d.name === name);
              return (
                <div
                  key={name}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    background: filterDealer === name ? '#eff6ff' : '#fff',
                    borderColor: filterDealer === name ? '#3b82f6' : '#e2e8f0',
                  }}
                  onClick={() => setFilterDealer(filterDealer === name ? '' : name)}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem' }}>{name}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    전체 {dProjects.length}건 · 완료 {dInstalled}건
                  </div>
                  {/* 진행바 */}
                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 9999 }}>
                    <div style={{ height: '100%', width: `${dPct}%`, background: '#10b981', borderRadius: 9999, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem', textAlign: 'right' }}>{dPct}%</div>
                  {dealer?.driveFolderUrl && (
                    <a
                      href={dealer.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: '0.75rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.375rem', textDecoration: 'underline' }}
                    >
                      <FolderOpen size={11} /> 드라이브 폴더
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 설치완료 확인 모달 ─────────────────────────────────────── */}
      {completingId && (() => {
        const p = projects.find((pr) => pr.id === completingId);
        if (!p) return null;
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '2rem', width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <CheckCircle2 size={22} color="#10b981" />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>설치 완료 처리</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>
                <strong style={{ color: '#1e293b' }}>{p.hospitalProfile.hospitalName}</strong>의 설치가 완료됐습니까?<br />
                실제 설치일을 입력하세요.
              </p>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="label">실제 설치일</label>
                <input
                  type="date"
                  className="input"
                  value={actualDateInput}
                  onChange={(e) => setActualDateInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => { setCompletingId(null); setActualDateInput(''); }}>취소</button>
                <button
                  className="btn btn-primary"
                  style={{ background: '#16a34a', borderColor: '#16a34a' }}
                  onClick={() => confirmComplete(completingId)}
                >
                  <CheckCircle2 size={15} /> 설치완료 확정
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
