import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardList,
  Scan,
  KeyRound,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  FileText,
  Info,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { WorkflowSettings, ExceptionItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

const VERIFICATION_OPTIONS = [
  { value: 'barcode_scan', label: '바코드 스캔', icon: <Scan size={16} /> },
  { value: 'patient_number', label: '환자번호 입력', icon: <KeyRound size={16} /> },
  { value: 'resident_number', label: '주민번호 입력', icon: <ShieldCheck size={16} /> },
];

export default function Step04Reception() {
  const getCurrentProject = useStore((s) => s.getCurrentProject);
  const updateProject = useStore((s) => s.updateProject);
  const project = getCurrentProject();

  const [wf, setWf] = useState<WorkflowSettings>({
    useReceptionDesk: false,
    useAutoRegistration: true,
    verificationMethod: [],
    maskResidentNumber: true,
    allowUnpaidTicket: false,
    unpaidMemo: '',
    autoRegistrationConditions: '',
    manualCheckConditions: '',
    exceptionMemo: '',
    exceptions: [],
  });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project) {
      setWf({ ...project.workflowSettings });
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveToStore = useCallback(() => {
    if (!project) return;
    updateProject(project.id, { workflowSettings: { ...wf } });
  }, [project, wf, updateProject]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToStore, 500);
  }, [saveToStore]);

  useEffect(() => {
    scheduleSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [wf, scheduleSave]);

  const update = <K extends keyof WorkflowSettings>(key: K, value: WorkflowSettings[K]) => {
    setWf((prev) => ({ ...prev, [key]: value }));
  };

  const toggleVerification = (method: string) => {
    setWf((prev) => {
      const methods = prev.verificationMethod.includes(method)
        ? prev.verificationMethod.filter((m) => m !== method)
        : [...prev.verificationMethod, method];
      return { ...prev, verificationMethod: methods };
    });
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
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <ClipboardList size={22} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>접수 방식</h2>
      </div>

      {/* A. 접수대 운영 방식 */}
      <div className="card">
        <h3 className="section-title">
          <ClipboardList size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          접수대 운영 방식
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '0.75rem' }}>
          {[
            { value: false, label: '접수대 미사용', desc: '키오스크 단독 운영. 환자가 직접 바코드를 스캔합니다.' },
            { value: true, label: '접수대 사용', desc: '접수 직원이 바코드를 스캔하고 번호표를 발급합니다.' },
          ].map((opt) => (
            <label
              key={String(opt.value)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                border: `1.5px solid ${wf.useReceptionDesk === opt.value ? '#7c3aed' : '#e2e8f0'}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                background: wf.useReceptionDesk === opt.value ? '#f5f3ff' : '#fff',
                transition: 'all 0.15s',
              }}
            >
              <input
                type="radio"
                name="useReceptionDesk"
                checked={wf.useReceptionDesk === opt.value}
                onChange={() => update('useReceptionDesk', opt.value)}
                style={{ marginTop: '3px' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{opt.label}</div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.125rem' }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* B. 본인 확인 방식 */}
      <div className="card">
        <h3 className="section-title">
          <ShieldCheck size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          본인 확인 방식
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
          {VERIFICATION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                border: `1.5px solid ${wf.verificationMethod.includes(opt.value) ? '#7c3aed' : '#e2e8f0'}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                background: wf.verificationMethod.includes(opt.value) ? '#f5f3ff' : '#fff',
                transition: 'all 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={wf.verificationMethod.includes(opt.value)}
                onChange={() => toggleVerification(opt.value)}
              />
              <span style={{ color: '#7c3aed', display: 'flex' }}>{opt.icon}</span>
              <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{opt.label}</span>
            </label>
          ))}
        </div>

        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>주민번호 뒷자리 마스킹</span>
            <div
              className={`toggle-track${wf.maskResidentNumber ? ' active' : ''}`}
              onClick={() => update('maskResidentNumber', !wf.maskResidentNumber)}
            >
              <div className="toggle-knob" />
            </div>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              {wf.maskResidentNumber ? '마스킹 적용 (예: 901201-1******)' : '전체 표시'}
            </span>
          </div>
        </div>
      </div>

      {/* C. 미수납 처리 방식 */}
      <div className="card">
        <h3 className="section-title">
          <CreditCard size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          미수납 처리 방식
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
          <div
            className={`toggle-track${wf.allowUnpaidTicket ? ' active' : ''}`}
            onClick={() => update('allowUnpaidTicket', !wf.allowUnpaidTicket)}
          >
            <div className="toggle-knob" />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            수납 여부와 관계없이 번호표 발급 허용
          </span>
        </div>
        {wf.allowUnpaidTicket && (
          <div className="info-box" style={{ marginTop: '0.75rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>미수납 환자에게도 대기번호가 발급됩니다. 별도 안내 용지(빨간색)가 출력됩니다.</span>
          </div>
        )}

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="label">관련 특이사항</label>
          <textarea
            className="input"
            rows={3}
            value={wf.unpaidMemo}
            onChange={(e) => update('unpaidMemo', e.target.value)}
            placeholder="미수납 관련 병원 정책이나 특이사항을 입력하세요"
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label className="label">예시 링크 (선택)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="링크 제목 (예: 미수납 처리 예시)"
              value={wf.unpaidLinkTitle || ''}
              onChange={(e) => update('unpaidLinkTitle', e.target.value)}
            />
            <input
              className="input"
              style={{ flex: 2 }}
              placeholder="https://..."
              value={wf.unpaidLinkUrl || ''}
              onChange={(e) => update('unpaidLinkUrl', e.target.value)}
            />
            {wf.unpaidLinkUrl && (
              <a href={wf.unpaidLinkUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
                예시보기
              </a>
            )}
          </div>
        </div>
      </div>

      {/* D. 미처방 처리 방식 */}
      <div className="card">
        <h3 className="section-title">
          <FileText size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          미처방 처리 방식
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
          <div
            className={`toggle-track${wf.allowNoPrescriptionTicket ? ' active' : ''}`}
            onClick={() => update('allowNoPrescriptionTicket', !wf.allowNoPrescriptionTicket)}
          >
            <div className="toggle-knob" />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            처방 미확인 시 번호표 발급 허용
          </span>
        </div>
        {wf.allowNoPrescriptionTicket && (
          <div className="info-box" style={{ marginTop: '0.75rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>처방이 확인되지 않은 환자에게도 대기번호가 발급됩니다. 별도 안내 용지(빨간색)가 출력됩니다.</span>
          </div>
        )}
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="label">관련 특이사항</label>
          <textarea
            className="input"
            rows={3}
            value={wf.noPrescriptionMemo || ''}
            onChange={(e) => update('noPrescriptionMemo', e.target.value)}
            placeholder="미처방 관련 병원 정책이나 특이사항을 입력하세요"
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label className="label">예시 링크 (선택)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="링크 제목 (예: 미처방 처리 예시)"
              value={wf.noPrescriptionLinkTitle || ''}
              onChange={(e) => update('noPrescriptionLinkTitle', e.target.value)}
            />
            <input
              className="input"
              style={{ flex: 2 }}
              placeholder="https://..."
              value={wf.noPrescriptionLinkUrl || ''}
              onChange={(e) => update('noPrescriptionLinkUrl', e.target.value)}
            />
            {wf.noPrescriptionLinkUrl && (
              <a href={wf.noPrescriptionLinkUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
                예시보기
              </a>
            )}
          </div>
        </div>
      </div>

      {/* E. 처방 관련 특이사항 — 동적 항목 */}
      <div className="card">
        <h3 className="section-title">
          <FileText size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          처방 관련 특이사항
        </h3>

        {/* 자동접수 가능 조건 */}
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="label" style={{ margin: 0 }}>자동접수 가능 조건</label>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                const items = (wf.autoRegistrationConditions || '').split('\n').filter(Boolean);
                update('autoRegistrationConditions', [...items, ''].join('\n'));
              }}
            >
              <Plus size={13} /> 항목 추가
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {(wf.autoRegistrationConditions || '').split('\n').filter(Boolean).map((line, idx, arr) => (
              <div key={idx} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: 20, textAlign: 'right' }}>{idx + 1}</span>
                <input
                  className="input"
                  style={{ flex: 1, fontSize: '0.875rem' }}
                  value={line}
                  placeholder="조건 내용 입력"
                  onChange={(e) => {
                    const items = arr.slice();
                    items[idx] = e.target.value;
                    update('autoRegistrationConditions', items.join('\n'));
                  }}
                />
                <button
                  className="btn btn-ghost"
                  style={{ color: '#ef4444', padding: '0.375rem', flexShrink: 0 }}
                  onClick={() => {
                    const items = arr.filter((_, i) => i !== idx);
                    update('autoRegistrationConditions', items.join('\n'));
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!(wf.autoRegistrationConditions || '').trim() && (
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0' }}>항목 추가 버튼으로 조건을 입력하세요.</p>
            )}
          </div>
        </div>

        {/* 수동확인 필요 조건 */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="label" style={{ margin: 0 }}>수동확인 필요 조건</label>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                const items = (wf.manualCheckConditions || '').split('\n').filter(Boolean);
                update('manualCheckConditions', [...items, ''].join('\n'));
              }}
            >
              <Plus size={13} /> 항목 추가
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {(wf.manualCheckConditions || '').split('\n').filter(Boolean).map((line, idx, arr) => (
              <div key={idx} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: 20, textAlign: 'right' }}>{idx + 1}</span>
                <input
                  className="input"
                  style={{ flex: 1, fontSize: '0.875rem' }}
                  value={line}
                  placeholder="조건 내용 입력"
                  onChange={(e) => {
                    const items = arr.slice();
                    items[idx] = e.target.value;
                    update('manualCheckConditions', items.join('\n'));
                  }}
                />
                <button
                  className="btn btn-ghost"
                  style={{ color: '#ef4444', padding: '0.375rem', flexShrink: 0 }}
                  onClick={() => {
                    const items = arr.filter((_, i) => i !== idx);
                    update('manualCheckConditions', items.join('\n'));
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!(wf.manualCheckConditions || '').trim() && (
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0' }}>항목 추가 버튼으로 조건을 입력하세요.</p>
            )}
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="info-box">
        <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>
          EMR / HIS 연동 수준에 따라 자동접수 범위가 달라질 수 있습니다. 전산팀과 사전 협의가 필요합니다.
        </span>
      </div>
    </div>
  );
}
