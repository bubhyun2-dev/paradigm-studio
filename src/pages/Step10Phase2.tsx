import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ListChecks,
  ChevronDown,
  ChevronRight,
  Plus,
  Info,
  Calendar,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { ChecklistItem } from '../types';

const DEFAULT_PHASE2_TITLES = [
  '인프라 공사 확인',
  '바코드 연동 테스트',
  '화면 문구 최종 컨펌',
  '설치 희망일 확인',
];

function uid() {
  return `p2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeDefaultItems(): ChecklistItem[] {
  return DEFAULT_PHASE2_TITLES.map((title) => ({
    id: uid(),
    title,
    done: false,
    note: '',
    driveLink: '',
    driveUploadDone: false,
    expanded: false,
    subform: { date: '' },
  }));
}

export default function Step10Phase2() {
  const getCurrentProject = useStore((s) => s.getCurrentProject);
  const updateProject = useStore((s) => s.updateProject);
  const project = getCurrentProject();

  const [items, setItems] = useState<ChecklistItem[]>(makeDefaultItems());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project) {
      if (project.phase2Items.length > 0) {
        setItems(project.phase2Items.map((i) => ({ ...i, subform: i.subform ? { ...i.subform } : { date: '' } })));
      } else {
        setItems(makeDefaultItems());
      }
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(() => {
    if (!project) return;
    updateProject(project.id, { phase2Items: items });
  }, [project, items, updateProject]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 400);
  }, [save]);

  useEffect(() => {
    scheduleSave();
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [items, scheduleSave]);

  const updateItem = (id: string, partial: Partial<ChecklistItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...partial } : i)));
  };

  const updateSubform = (id: string, field: string, value: any) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, subform: { ...(i.subform || {}), [field]: value } } : i
      )
    );
  };

  const deleteItem = (id: string) => {
    if (window.confirm('이 항목을 삭제하시겠습니까?')) {
      setItems((prev) => prev.filter(i => i.id !== id));
    }
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: uid(), title: '', done: false, note: '', driveLink: '', driveUploadDone: false, expanded: true, subform: { date: '' } },
    ]);
  };

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const notDoneCount = total - doneCount;

  const statusBadge = () => {
    if (doneCount === total && total > 0) return <span className="badge badge-green">준비 완료</span>;
    if (doneCount > 0) return <span className="badge badge-orange">진행중</span>;
    return <span className="badge badge-red">미착수</span>;
  };

  if (!project) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
        <Info size={32} style={{ margin: '0 auto 0.75rem' }} />
        <p>프로젝트를 선택해주세요.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <ListChecks size={22} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Phase 2 체크리스트</h2>
      </div>

      {/* Progress header */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{doneCount}/{total} 완료</span>
        {statusBadge()}
      </div>

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((item) => {
          const isInstallDate = item.title === '설치 희망일 확인';
          const dateLabel = isInstallDate ? '설치 희망일' : '확인 날짜';
          return (
            <div
              key={item.id}
              className="checklist-item"
              style={{
                borderLeft: `4px solid ${item.done ? '#22c55e' : '#e2e8f0'}`,
                background: item.done ? '#f0fdf4' : '#fff',
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                transition: 'all 0.15s',
              }}
            >
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={(e) => updateItem(item.id, { done: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#22c55e' }}
                />
                <span style={{
                  flex: 1,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textDecoration: item.done ? 'line-through' : 'none',
                  color: item.done ? '#64748b' : '#1e293b',
                }}>
                  {item.isTemplateItem ? item.title : (
                    <input
                      className="input"
                      value={item.title}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      placeholder="항목명 입력"
                      style={{ fontSize: '0.875rem', width: '100%' }}
                    />
                  )}
                </span>
                
                {item.exampleLinkUrl && (
                  <a href={item.exampleLinkUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', flexShrink: 0 }}>
                    예시보기
                  </a>
                )}

                {!item.isTemplateItem && (
                   <button className="btn btn-ghost btn-sm" onClick={() => deleteItem(item.id)} style={{ color: '#ef4444' }}>
                     <Trash2 size={16} />
                   </button>
                )}

                {/* Inline date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                  <Calendar size={14} style={{ color: '#94a3b8' }} />
                  <input
                    type="date"
                    className="input"
                    value={item.subform?.date || ''}
                    onChange={(e) => updateSubform(item.id, 'date', e.target.value)}
                    title={dateLabel}
                    style={{ fontSize: '0.8125rem', width: 140, padding: '0.25rem 0.5rem' }}
                  />
                </div>

                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem' }}
                  onClick={() => updateItem(item.id, { expanded: !item.expanded })}
                >
                  {item.expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
              </div>

              {/* Expanded note */}
              {item.expanded && (
                <div style={{ marginTop: '0.75rem', paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {!item.isTemplateItem && (
                    <div className="form-group">
                      <label className="label">항목명</label>
                      <input
                        className="input"
                        value={item.title}
                        onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="label">{dateLabel}</label>
                    <input
                      type="date"
                      className="input"
                      value={item.subform?.date || ''}
                      onChange={(e) => updateSubform(item.id, 'date', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">메모</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={item.note}
                      onChange={(e) => updateItem(item.id, { note: e.target.value })}
                      placeholder="메모를 입력하세요"
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">사진 링크 (Google Drive)</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        className="input"
                        style={{ flex: 1 }}
                        value={item.driveLink || ''}
                        onChange={(e) => updateItem(item.id, { driveLink: e.target.value })}
                        placeholder="https://drive.google.com/..."
                      />
                      {item.driveLink && (
                        <a href={item.driveLink} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
                          사진보기
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label">예시 링크 URL</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        className="input"
                        style={{ flex: 1 }}
                        value={item.exampleLinkUrl || ''}
                        onChange={(e) => updateItem(item.id, { exampleLinkUrl: e.target.value })}
                        placeholder="https://... (예시 자료 링크)"
                      />
                      {item.exampleLinkUrl && (
                        <a href={item.exampleLinkUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                          예시보기
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add button */}
      <div>
        <button className="btn btn-outline btn-sm" onClick={addItem}>
          <Plus size={14} /> 항목 추가
        </button>
      </div>

      {/* Bottom summary */}
      <div className="card" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>완료율</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{pct}%</div>
        </div>
        <div>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>미완료 항목 수</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{notDoneCount}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>설치 준비 상태</span>
          <div style={{ marginTop: '0.25rem' }}>{statusBadge()}</div>
        </div>
      </div>
    </div>
  );
}
