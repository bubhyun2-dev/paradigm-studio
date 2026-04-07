import { useState, useEffect } from 'react';
import { Save, UploadCloud, Plus, AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import type { MasterTemplate, ChecklistItem, TeamOutputSet } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { createSeedMasterTemplate } from '../data/seed';

export default function AdminTemplates() {
  const navigate = useNavigate();
  const templates = useStore((s) => s.templates);
  const saveTemplateDraft = useStore((s) => s.saveTemplateDraft);
  const publishMasterTemplate = useStore((s) => s.publishMasterTemplate);
  const user = useStore((s) => s.user);

  const [activeTemplate, setActiveTemplate] = useState<MasterTemplate | null>(null);

  useEffect(() => {
    if (templates.length > 0 && !activeTemplate) {
      setActiveTemplate(templates[templates.length - 1]);
    }
  }, [templates, activeTemplate]);

  const handleCreateDraft = () => {
    const published = templates.find((t) => t.status === 'published') || createSeedMasterTemplate();
    const draft: MasterTemplate = {
      ...published,
      id: uuidv4(),
      version: published.version, 
      status: 'draft',
      name: `[수정본] ${published.name}`,
    };
    saveTemplateDraft(draft);
    setActiveTemplate(draft);
  };

  const handleSave = () => {
    if (activeTemplate) {
      saveTemplateDraft(activeTemplate);
      alert('저장되었습니다.');
    }
  };

  const handlePublish = () => {
    if (activeTemplate && activeTemplate.status === 'draft') {
      if (window.confirm('이 템플릿을 새로운 마스터(Published) 버전으로 배포하시겠습니까?\n이후 생성되는 새 프로젝트는 이 버전을 기준으로 만들어집니다.')) {
        publishMasterTemplate(activeTemplate.id, user?.name || '관리자');
        alert('배포 완료되었습니다.');
      }
    }
  };

  const handleTitleChange = (newTitle: string) => {
    if (activeTemplate) {
      setActiveTemplate({ ...activeTemplate, name: newTitle });
    }
  };

  return (
    <div className="flex h-full" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto', gap: '1.5rem', flexDirection: 'column' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')} style={{ marginBottom: '1rem', alignSelf: 'flex-start' }}>
        ← 관리자 설정으로
      </button>
      <div className="flex h-full" style={{ gap: '1.5rem', flex: 1 }}>
      {/* LEFT: Template List */}
      <div className="card" style={{ width: 300, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>마스터 템플릿</h2>
          <button className="btn btn-sm btn-outline" onClick={handleCreateDraft}>
            <Plus size={14} /> 목록 추가
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
          {templates.map((t) => (
            <div
              key={t.id}
              onClick={() => setActiveTemplate(t)}
              style={{
                padding: '0.75rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                border: activeTemplate?.id === t.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                background: activeTemplate?.id === t.id ? '#eff6ff' : '#fff',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{t.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ 
                  color: t.status === 'published' ? '#10b981' : t.status === 'draft' ? '#f59e0b' : '#64748b',
                  fontWeight: t.status === 'published' ? 700 : 400
                }}>
                  {t.status.toUpperCase()} (v{t.version})
                </span>
                <span style={{ color: '#94a3b8' }}>
                  {new Date(t.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>
              템플릿이 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: Editor */}
      {activeTemplate ? (
        <div className="card flex-1" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, marginRight: '1rem' }}>
              <input 
                className="input" 
                value={activeTemplate.name}
                onChange={(e) => handleTitleChange(e.target.value)}
                style={{ fontSize: '1.25rem', fontWeight: 600, border: 'none', background: 'transparent', padding: 0 }}
                disabled={activeTemplate.status !== 'draft'}
              />
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                버전: v{activeTemplate.version} | 작성자: {activeTemplate.author || '본사'} | 상태: {activeTemplate.status}
              </p>
            </div>
            {activeTemplate.status === 'draft' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" onClick={handleSave}>
                  <Save size={16} /> 임시저장
                </button>
                <button className="btn btn-primary" onClick={handlePublish}>
                  <UploadCloud size={16} /> 마스터로 배포
                </button>
              </div>
            )}
          </div>

          {activeTemplate.status !== 'draft' && (
            <div style={{ padding: '0.75rem', background: '#f8fafc', borderLeft: '4px solid #94a3b8', marginBottom: '1.5rem', fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertCircle size={16} color="#64748b" />
              <span>배포되거나 보관된 템플릿은 읽기 전용입니다. 수정하려면 `목록 추가`를 통해 새 Draft를 생성하세요.</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             {/* Note: JSON Editor or specialized field forms here. For P1 admin UI MVP, exposing Checklist items and WorkflowSettings forms. */}
             <div>
               <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                 기본 접수 정책 (Workflow Settings)
               </h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 <div className="form-group">
                   <label className="label">자동 접수 문구</label>
                   <textarea 
                     className="input" 
                     value={activeTemplate.workflowSettings.autoRegistrationConditions} 
                     onChange={(e) => setActiveTemplate({...activeTemplate, workflowSettings: {...activeTemplate.workflowSettings, autoRegistrationConditions: e.target.value}})}
                     disabled={activeTemplate.status !== 'draft'}
                   />
                 </div>
                 <div className="form-group">
                   <label className="label">예외 접수 문구</label>
                   <textarea 
                     className="input" 
                     value={activeTemplate.workflowSettings.exceptionMemo} 
                     onChange={(e) => setActiveTemplate({...activeTemplate, workflowSettings: {...activeTemplate.workflowSettings, exceptionMemo: e.target.value}})}
                     disabled={activeTemplate.status !== 'draft'}
                   />
                 </div>
               </div>
             </div>

             {/* Phase 1 Checklist Template Editor */}
             <div>
               <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                 Phase 1 체크리스트 템플릿 (Step 09)
               </h3>
               <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                 <button
                   className="btn btn-outline btn-sm"
                   disabled={activeTemplate.status !== 'draft'}
                   onClick={() => {
                     const newItem: ChecklistItem = {
                       id: `tmpl-p1-${Date.now()}`,
                       title: '새 항목',
                       done: false,
                       note: '',
                       driveLink: '',
                       driveUploadDone: false,
                       expanded: false,
                       isTemplateItem: true,
                     };
                     setActiveTemplate({ ...activeTemplate, phase1Items: [...activeTemplate.phase1Items, newItem] });
                   }}
                 >
                   <Plus size={14} /> 항목 추가
                 </button>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 {activeTemplate.phase1Items.map((item, idx) => (
                   <div key={item.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                     <span style={{ fontSize: '0.75rem', color: '#94a3b8', width: 24, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>
                     <input
                       className="input"
                       style={{ flex: 1, fontSize: '0.8125rem' }}
                       value={item.title}
                       disabled={activeTemplate.status !== 'draft'}
                       onChange={(e) => {
                         const updated = [...activeTemplate.phase1Items];
                         updated[idx] = { ...updated[idx], title: e.target.value };
                         setActiveTemplate({ ...activeTemplate, phase1Items: updated });
                       }}
                       placeholder="항목 제목"
                     />
                     <input
                       className="input"
                       style={{ flex: 1, fontSize: '0.8125rem' }}
                       value={item.exampleLinkUrl || ''}
                       disabled={activeTemplate.status !== 'draft'}
                       onChange={(e) => {
                         const updated = [...activeTemplate.phase1Items];
                         updated[idx] = { ...updated[idx], exampleLinkUrl: e.target.value };
                         setActiveTemplate({ ...activeTemplate, phase1Items: updated });
                       }}
                       placeholder="예시 링크 URL (선택)"
                     />
                     <button
                       className="btn btn-ghost btn-sm"
                       style={{ color: '#ef4444', flexShrink: 0 }}
                       disabled={activeTemplate.status !== 'draft'}
                       onClick={() => setActiveTemplate({ ...activeTemplate, phase1Items: activeTemplate.phase1Items.filter((_, i) => i !== idx) })}
                     >
                       <X size={14} />
                     </button>
                   </div>
                 ))}
                 {activeTemplate.phase1Items.length === 0 && (
                   <p style={{ fontSize: '0.8125rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>항목이 없습니다.</p>
                 )}
               </div>
             </div>

             {/* Phase 2 Checklist Template Editor */}
             <div>
               <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                 Phase 2 체크리스트 템플릿 (Step 10)
               </h3>
               <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                 <button
                   className="btn btn-outline btn-sm"
                   disabled={activeTemplate.status !== 'draft'}
                   onClick={() => {
                     const newItem: ChecklistItem = {
                       id: `tmpl-p2-${Date.now()}`,
                       title: '새 항목',
                       done: false,
                       note: '',
                       driveLink: '',
                       driveUploadDone: false,
                       expanded: false,
                       isTemplateItem: true,
                     };
                     setActiveTemplate({ ...activeTemplate, phase2Items: [...activeTemplate.phase2Items, newItem] });
                   }}
                 >
                   <Plus size={14} /> 항목 추가
                 </button>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 {activeTemplate.phase2Items.map((item, idx) => (
                   <div key={item.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                     <span style={{ fontSize: '0.75rem', color: '#94a3b8', width: 24, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>
                     <input
                       className="input"
                       style={{ flex: 1, fontSize: '0.8125rem' }}
                       value={item.title}
                       disabled={activeTemplate.status !== 'draft'}
                       onChange={(e) => {
                         const updated = [...activeTemplate.phase2Items];
                         updated[idx] = { ...updated[idx], title: e.target.value };
                         setActiveTemplate({ ...activeTemplate, phase2Items: updated });
                       }}
                       placeholder="항목 제목"
                     />
                     <input
                       className="input"
                       style={{ flex: 1, fontSize: '0.8125rem' }}
                       value={item.exampleLinkUrl || ''}
                       disabled={activeTemplate.status !== 'draft'}
                       onChange={(e) => {
                         const updated = [...activeTemplate.phase2Items];
                         updated[idx] = { ...updated[idx], exampleLinkUrl: e.target.value };
                         setActiveTemplate({ ...activeTemplate, phase2Items: updated });
                       }}
                       placeholder="예시 링크 URL (선택)"
                     />
                     <button
                       className="btn btn-ghost btn-sm"
                       style={{ color: '#ef4444', flexShrink: 0 }}
                       disabled={activeTemplate.status !== 'draft'}
                       onClick={() => setActiveTemplate({ ...activeTemplate, phase2Items: activeTemplate.phase2Items.filter((_, i) => i !== idx) })}
                     >
                       <X size={14} />
                     </button>
                   </div>
                 ))}
                 {activeTemplate.phase2Items.length === 0 && (
                   <p style={{ fontSize: '0.8125rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>항목이 없습니다.</p>
                 )}
               </div>
             </div>

             {/* Team Output Sets (Step 11) */}
             <div>
               <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                 팀별 출력 세트 정의 (Step 11)
               </h3>
               <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.75rem' }}>
                 관리자가 미리 정의한 팀별 출력 구성이 새 프로젝트 생성 시 기본값으로 적용됩니다.
               </p>
               {activeTemplate.status === 'draft' && (
                 <button
                   className="btn btn-outline btn-sm"
                   style={{ marginBottom: '0.75rem' }}
                   onClick={() => {
                     const newTeam: TeamOutputSet = {
                       id: `team-${Date.now()}`,
                       teamName: '새 팀',
                       selectedSections: [],
                     };
                     setActiveTemplate({ ...activeTemplate, teamOutputSets: [...(activeTemplate.teamOutputSets || []), newTeam] });
                   }}
                 >
                   <Plus size={14} /> 팀 추가
                 </button>
               )}
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 {(activeTemplate.teamOutputSets || []).map((team, idx) => (
                   <div key={team.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
                     <input
                       className="input"
                       style={{ flex: 1, fontSize: '0.8125rem' }}
                       value={team.teamName}
                       disabled={activeTemplate.status !== 'draft'}
                       onChange={(e) => {
                         const updated = [...(activeTemplate.teamOutputSets || [])];
                         updated[idx] = { ...updated[idx], teamName: e.target.value };
                         setActiveTemplate({ ...activeTemplate, teamOutputSets: updated });
                       }}
                       placeholder="팀명"
                     />
                     <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                       {team.selectedSections.length}개 섹션 선택됨
                     </span>
                     {activeTemplate.status === 'draft' && (
                       <button
                         className="btn btn-ghost btn-sm"
                         style={{ color: '#ef4444' }}
                         onClick={() => setActiveTemplate({ ...activeTemplate, teamOutputSets: (activeTemplate.teamOutputSets || []).filter((_, i) => i !== idx) })}
                       >
                         <X size={14} />
                       </button>
                     )}
                   </div>
                 ))}
                 {(activeTemplate.teamOutputSets || []).length === 0 && (
                   <p style={{ fontSize: '0.8125rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>팀이 없습니다.</p>
                 )}
               </div>
             </div>

             <div>
               <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                 공통 장비 기준안
               </h3>
               <p style={{ fontSize: '0.875rem', color: '#64748b' }}>기본 배치되는 초기 장비 템플릿 수량: {activeTemplate.baseComponents.length}종</p>
             </div>
          </div>
        </div>
      ) : (
        <div className="card flex-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          좌측에서 템플릿을 선택하거나 새로 추가하세요.
        </div>
      )}
      </div>
    </div>
  );
}
