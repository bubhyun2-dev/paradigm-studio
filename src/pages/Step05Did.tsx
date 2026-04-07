import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Monitor,
  Eye,
  Minus,
  Plus,
  Info,
  ImageIcon,
  AlignLeft,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { DidSettings } from '../types';

export default function Step05Did() {
  const getCurrentProject = useStore((s) => s.getCurrentProject);
  const updateProject = useStore((s) => s.updateProject);
  const project = getCurrentProject();

  const [did, setDid] = useState<DidSettings>({
    callingMethod: 'did_voice',
    maskName: true,
    deskCount: 3,
    layoutMode: 'standard',
    rightPanelText: '',
    rightPanelImageUrl: '',
  });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project) {
      setDid({ ...project.didSettings });
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveToStore = useCallback(() => {
    if (!project) return;
    updateProject(project.id, { didSettings: { ...did } });
  }, [project, did, updateProject]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToStore, 500);
  }, [saveToStore]);

  useEffect(() => {
    scheduleSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [did, scheduleSave]);

  const update = <K extends keyof DidSettings>(key: K, value: DidSettings[K]) => {
    setDid((prev) => ({ ...prev, [key]: value }));
  };

  const adjustDeskCount = (delta: number) => {
    setDid((prev) => ({
      ...prev,
      deskCount: Math.max(1, Math.min(20, prev.deskCount + delta)),
    }));
  };

  const maskNameDisplay = (name: string) => {
    if (!did.maskName || name.length <= 1) return name;
    if (name.length === 2) return name[0] + '*';
    return name[0] + '*' + name[name.length - 1];
  };

  if (!project) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
        <Info size={32} style={{ margin: '0 auto 0.75rem' }} />
        <p>프로젝트를 선택해주세요.</p>
      </div>
    );
  }

  const activeDesk = 0;
  const sampleName = '홍길동';
  const sampleNumber = 'A023';
  const nextWaiting = 'B024';
  const cols = Math.min(did.deskCount, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Monitor size={22} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>호출 · DID 시스템</h2>
      </div>

      {/* A. DID 표시 설정 */}
      <div className="card">
        <h3 className="section-title">
          <Eye size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          DID 표시 설정
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
          <div
            className={`toggle-track${did.maskName ? ' active' : ''}`}
            onClick={() => update('maskName', !did.maskName)}
          >
            <div className="toggle-knob" />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>이름 마스킹</span>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            {did.maskName ? `예: ${maskNameDisplay('김소영')}` : '예: 김소영 (전체 표시)'}
          </span>
        </div>
      </div>

      {/* B. 채혈 데스크 수 */}
      <div className="card">
        <h3 className="section-title">채혈 데스크 수</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.75rem' }}>
          <button
            className="btn btn-outline"
            onClick={() => adjustDeskCount(-1)}
            disabled={did.deskCount <= 1}
            style={{ width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Minus size={18} />
          </button>
          <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#1e293b', minWidth: '3rem', textAlign: 'center' }}>
            {did.deskCount}
          </span>
          <button
            className="btn btn-outline"
            onClick={() => adjustDeskCount(1)}
            disabled={did.deskCount >= 20}
            style={{ width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={18} />
          </button>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
          총 {did.deskCount}개 채혈 데스크 운영
        </p>
      </div>

      {/* C. 오른쪽 패널 안내 내용 */}
      <div className="card">
        <h3 className="section-title">
          <AlignLeft size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          오른쪽 안내 패널
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
          <div className="form-group">
            <label className="label">안내 문구</label>
            <textarea
              className="input"
              rows={3}
              value={did.rightPanelText || ''}
              onChange={(e) => update('rightPanelText', e.target.value)}
              placeholder="예: 채혈 후 5분간 지혈해주세요."
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-group">
            <label className="label">
              <ImageIcon size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.25rem' }} />
              이미지 URL (선택)
            </label>
            <input
              className="input"
              value={did.rightPanelImageUrl || ''}
              onChange={(e) => update('rightPanelImageUrl', e.target.value)}
              placeholder="https://drive.google.com/... 또는 이미지 URL"
            />
          </div>
        </div>
      </div>

      {/* D. DID 시뮬레이터 */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <h3 className="section-title" style={{ padding: '1rem 1.25rem 0' }}>DID 시뮬레이터</h3>
        <div
          style={{
            margin: '0.75rem',
            borderRadius: '0.75rem',
            background: '#0f172a',
            padding: '1.5rem',
            color: '#fff',
            minHeight: 280,
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', height: '100%' }}>
            {/* Left: desk area */}
            <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column' }}>
              <div style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#fff', letterSpacing: '0.05em' }}>
                채혈 안내
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gap: '0.75rem',
                }}
              >
                {Array.from({ length: did.deskCount }, (_, i) => {
                  const isActive = i === activeDesk;
                  return (
                    <div
                      key={i}
                      style={{
                        background: isActive ? '#7c3aed' : '#1e293b',
                        borderRadius: '0.625rem',
                        padding: '1rem 0.75rem',
                        textAlign: 'center',
                        border: isActive ? '2px solid #a78bfa' : '1px solid #334155',
                        height: '100px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: isActive ? '#e9d5ff' : '#64748b', marginBottom: '0.375rem' }}>
                        {i + 1}번 데스크
                      </div>
                      {isActive ? (
                        <>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>{sampleNumber}</div>
                          <div style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{maskNameDisplay(sampleName)}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.875rem', color: '#475569' }}>대기중</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8', borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
                다음 대기: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{nextWaiting}</span>
              </div>
            </div>

            {/* Right: notice panel */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1e293b', borderRadius: '0.5rem', border: '1px solid #334155', padding: '1rem', gap: '0.75rem' }}>
              {did.rightPanelImageUrl ? (
                <img
                  src={did.rightPanelImageUrl}
                  alt="안내 이미지"
                  style={{ maxWidth: '100%', maxHeight: 120, borderRadius: '0.375rem', objectFit: 'contain' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div style={{ width: 60, height: 60, background: '#334155', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                  <ImageIcon size={28} />
                </div>
              )}
              <p style={{ fontSize: '0.875rem', color: '#e2e8f0', textAlign: 'center', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {did.rightPanelText || '안내 문구를 입력해주세요'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
