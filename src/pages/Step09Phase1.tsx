import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  Plus,
  Info,
  ExternalLink,
  Upload,
  Trash2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { ChecklistItem } from '../types';

const DEFAULT_PHASE1_TITLES = [
  '설치 위치 확정 및 설치전 사진 확보',
  '전원 및 랜포트 요청',
  'IP 주소 요청',
  '키오스크 화면 상세 협의',
  'DID 화면 상세 협의',
  '바코드 양식 확보',
  '검사-튜브 매핑 자료 확보',
  'EMR 전산 특이사항 기재',
  '장비 반입 경로 확인',
  '검수 절차 여부 확인',
  '튜브 배치 확정',
];

function uid() {
  return `p1-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeDefaultItems(): ChecklistItem[] {
  return DEFAULT_PHASE1_TITLES.map((title) => {
    const item: ChecklistItem = {
      id: uid(),
      title,
      done: false,
      note: '',
      driveLink: '',
      driveUploadDone: false,
      expanded: false,
    };
    if (title === '키오스크 화면 상세 협의') {
      item.subform = {
        maskResidentNumber: false,
        unpaidBranchCriteria: '',
        noPrescriptionCriteria: '',
        uiNotes: '',
        ticketDataLink: '',
        dataUploadDone: false,
        memo: '',
      };
    }
    if (title === 'DID 화면 상세 협의') {
      item.subform = {
        maskName: false,
        uiNotes: '',
        mediaLink: '',
        mediaUploadDone: false,
        memo: '',
      };
    }
    return item;
  });
}

export default function Step09Phase1() {
  const getCurrentProject = useStore((s) => s.getCurrentProject);
  const updateProject = useStore((s) => s.updateProject);
  const project = getCurrentProject();

  const [items, setItems] = useState<ChecklistItem[]>(makeDefaultItems());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project) {
      if (project.phase1Items.length > 0) {
        setItems(project.phase1Items.map((i) => ({ ...i, subform: i.subform ? { ...i.subform } : undefined })));
      } else {
        setItems(makeDefaultItems());
      }
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(() => {
    if (!project) return;
    updateProject(project.id, { phase1Items: items });
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
      { id: uid(), title: '', done: false, note: '', driveLink: '', driveUploadDone: false, expanded: true },
    ]);
  };

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const statusBadge = () => {
    if (pct === 100) return <span className="badge badge-green">완료</span>;
    if (pct > 0) return <span className="badge badge-orange">진행중 {pct}%</span>;
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
        <ClipboardCheck size={22} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Phase 1 체크리스트</h2>
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
        {items.map((item, idx) => (
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

              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem' }}
                onClick={() => updateItem(item.id, { expanded: !item.expanded })}
              >
                {item.expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>

            {/* Expanded details */}
            {item.expanded && (
              <div style={{ marginTop: '0.75rem', paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Editable title for custom items */}
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
                  <label className="label">메모</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={item.note}
                    onChange={(e) => updateItem(item.id, { note: e.target.value })}
                    placeholder="메모를 입력하세요"
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="form-group">
                  <label className="label">
                    <ExternalLink size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '0.25rem' }} />
                    사진 링크 (Google Drive)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="input"
                      style={{ flex: 1 }}
                      value={item.driveLink}
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                  <input
                    type="checkbox"
                    checked={item.driveUploadDone}
                    onChange={(e) => updateItem(item.id, { driveUploadDone: e.target.checked })}
                  />
                  <Upload size={14} /> 드라이브 업로드 완료
                </label>

                {/* ── 키오스크 subform ──────────────── */}
                {item.title === '키오스크 화면 상세 협의' && item.subform && (
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569' }}>키오스크 상세 설정</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8125rem' }}>주민번호 마스킹 여부</span>
                      <div
                        className={`toggle-track${item.subform.maskResidentNumber ? ' active' : ''}`}
                        onClick={() => updateSubform(item.id, 'maskResidentNumber', !item.subform!.maskResidentNumber)}
                      >
                        <div className="toggle-knob" />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {item.subform.maskResidentNumber ? '마스킹' : '미마스킹'}
                      </span>
                    </div>
                    <div className="form-group">
                      <label className="label">미수납 분기 기준</label>
                      <input
                        className="input"
                        value={item.subform.unpaidBranchCriteria || ''}
                        onChange={(e) => updateSubform(item.id, 'unpaidBranchCriteria', e.target.value)}
                        placeholder="미수납 시 분기 기준 입력"
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">처방없음 분기 기준</label>
                      <input
                        className="input"
                        value={item.subform.noPrescriptionCriteria || ''}
                        onChange={(e) => updateSubform(item.id, 'noPrescriptionCriteria', e.target.value)}
                        placeholder="처방없음 시 분기 기준 입력"
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">화면 UI 특이사항</label>
                      <textarea
                        className="input"
                        rows={2}
                        value={item.subform.uiNotes || ''}
                        onChange={(e) => updateSubform(item.id, 'uiNotes', e.target.value)}
                        placeholder="화면 UI 관련 특이사항"
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">티켓 자료 링크</label>
                      <input
                        className="input"
                        value={item.subform.ticketDataLink || ''}
                        onChange={(e) => updateSubform(item.id, 'ticketDataLink', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                      <input
                        type="checkbox"
                        checked={item.subform.dataUploadDone || false}
                        onChange={(e) => updateSubform(item.id, 'dataUploadDone', e.target.checked)}
                      />
                      자료 업로드 여부
                    </label>
                    <div className="form-group">
                      <label className="label">메모</label>
                      <textarea
                        className="input"
                        rows={2}
                        value={item.subform.memo || ''}
                        onChange={(e) => updateSubform(item.id, 'memo', e.target.value)}
                        placeholder="추가 메모"
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>
                )}

                {/* ── DID subform ──────────────── */}
                {item.title === 'DID 화면 상세 협의' && item.subform && (
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569' }}>DID 상세 설정</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8125rem' }}>이름 마스킹 여부</span>
                      <div
                        className={`toggle-track${item.subform.maskName ? ' active' : ''}`}
                        onClick={() => updateSubform(item.id, 'maskName', !item.subform!.maskName)}
                      >
                        <div className="toggle-knob" />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {item.subform.maskName ? '마스킹' : '미마스킹'}
                      </span>
                    </div>
                    <div className="form-group">
                      <label className="label">UI 특이사항</label>
                      <textarea
                        className="input"
                        rows={2}
                        value={item.subform.uiNotes || ''}
                        onChange={(e) => updateSubform(item.id, 'uiNotes', e.target.value)}
                        placeholder="DID UI 관련 특이사항"
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">미디어 링크</label>
                      <input
                        className="input"
                        value={item.subform.mediaLink || ''}
                        onChange={(e) => updateSubform(item.id, 'mediaLink', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                      <input
                        type="checkbox"
                        checked={item.subform.mediaUploadDone || false}
                        onChange={(e) => updateSubform(item.id, 'mediaUploadDone', e.target.checked)}
                      />
                      미디어 업로드 완료
                    </label>
                    <div className="form-group">
                      <label className="label">메모</label>
                      <textarea
                        className="input"
                        rows={2}
                        value={item.subform.memo || ''}
                        onChange={(e) => updateSubform(item.id, 'memo', e.target.value)}
                        placeholder="추가 메모"
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add button */}
      <div>
        <button className="btn btn-outline btn-sm" onClick={addItem}>
          <Plus size={14} /> 항목 추가
        </button>
      </div>
    </div>
  );
}
