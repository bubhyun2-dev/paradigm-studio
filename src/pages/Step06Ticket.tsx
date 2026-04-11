import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Ticket,
  Eye,
  Info,
  Settings,
  Monitor,
  Save,
  Download,
  Upload,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { TicketSettings, IndividualTicketSetting } from '../types';

type IndividualKeys = 'bloodTicket' | 'receptionTicket' | 'unpaidTicket' | 'noPrescriptionTicket' | 'noPatientTicket';

const TICKET_TABS: { key: IndividualKeys; label: string }[] = [
  { key: 'bloodTicket', label: '채혈 대기표' },
  { key: 'receptionTicket', label: '접수 대기표' },
  { key: 'unpaidTicket', label: '미수납 안내' },
  { key: 'noPrescriptionTicket', label: '처방 없음' },
  { key: 'noPatientTicket', label: '환자정보 없음' },
];

export default function Step06Ticket() {
  const getCurrentProject = useStore((s) => s.getCurrentProject);
  const updateProject = useStore((s) => s.updateProject);
  const project = getCurrentProject();

  const [ts, setTs] = useState<TicketSettings | null>(null);
  const [activeTab, setActiveTab] = useState<IndividualKeys>('bloodTicket');
  const [showAllPreviews, setShowAllPreviews] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project && project.ticketSettings) {
      setTs(JSON.parse(JSON.stringify(project.ticketSettings)));
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveToStore = useCallback(() => {
    if (!project || !ts) return;
    updateProject(project.id, { ticketSettings: JSON.parse(JSON.stringify(ts)) });
  }, [project, ts, updateProject]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToStore, 500);
  }, [saveToStore]);

  useEffect(() => {
    if (ts) scheduleSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [ts, scheduleSave]);

  const updateGlobal = <K extends keyof TicketSettings>(key: K, value: TicketSettings[K]) => {
    setTs((prev) => prev ? { ...prev, [key]: value } : null);
  };

  const updateIndividual = <K extends keyof IndividualTicketSetting>(
    typeKey: IndividualKeys,
    field: K,
    value: IndividualTicketSetting[K]
  ) => {
    setTs((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [typeKey]: {
          ...prev[typeKey],
          [field]: value,
        },
      };
    });
  };

  if (!project || !ts) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
        <Info size={32} style={{ margin: '0 auto 0.75rem' }} />
        <p>프로젝트를 선택해주세요.</p>
      </div>
    );
  }

  const activeTicketSetting = ts[activeTab];

  const renderTicketPreview = (ticketKey: IndividualKeys, compact = false) => {
    const setting = ts[ticketKey];
    // Mode A: all white
    // Mode B: only bloodTicket is white, all others are red
    // Mode C: bloodTicket and receptionTicket are white, others are red
    const isRed =
      ts.twoHeadColorMode === 'B'
        ? ticketKey !== 'bloodTicket'
        : ts.twoHeadColorMode === 'C'
        ? (ticketKey !== 'bloodTicket' && ticketKey !== 'receptionTicket')
        : false;
    // Actual coloring logic depends on 2-head mode. Mocking visual indication:
    const baseColor = isRed ? '#fef2f2' : ts.paperBackgroundColor || '#ffffff';
    const pColor = setting.pointColor || ts.pointColor || '#000000';
    const scale = compact ? 0.7 : 1;

    if (!setting.enabled) {
      return (
        <div style={{
          width: compact ? 180 : 260, height: compact ? 260 : 380,
          background: '#f1f5f9', border: '2px dashed #cbd5e1',
          borderRadius: '0.75rem', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          opacity: 0.6,
          position: 'relative'
        }}>
          <span className="badge badge-error" style={{ position: 'absolute', top: 10, right: 10 }}>미출력</span>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>출력 OFF</span>
        </div>
      );
    }

    return (
      <div
        style={{
          width: compact ? 180 : 260,
          minHeight: compact ? 260 : 380,
          padding: compact ? '1rem' : '1.5rem',
          border: `2px solid ${isRed ? '#fca5a5' : '#e2e8f0'}`,
          borderRadius: '0.75rem',
          background: baseColor,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: compact ? '0.5rem' : '0.75rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          transition: 'all 0.2s',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Row 1: topLineText (최상단 독립 문구, global, NOT from hospital profile) */}
        <div style={{ textAlign: 'center', fontSize: 11 * scale, color: '#64748b', letterSpacing: '0.05em' }}>
          {ts.topLineText || '대기 안내'}
        </div>

        {/* Row 2: Ticket type label (per-ticket, e.g. 채혈 대기표) */}
        <div style={{ textAlign: 'center', fontSize: 15 * scale, fontWeight: 700, color: '#1e293b' }}>
          {setting.headerTextKr || '채혈 대기표'}
        </div>

        {/* Separator */}
        <div style={{ height: 2, background: pColor, margin: '2px 0', opacity: 0.8 }} />

        {/* Row 3: Wait Number */}
        <div style={{ textAlign: 'center', fontSize: 36 * scale, fontWeight: 800, color: pColor, letterSpacing: '0.05em' }}>
          123
        </div>

        {/* Row 4: Patient Name + Chart Number */}
        <div style={{ textAlign: 'center', fontSize: 14 * scale, color: '#334155', fontWeight: 600 }}>
          홍길동 (12345)
        </div>

        {/* Row 5: Barcode */}
        <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 18 * scale, letterSpacing: '0.15em', margin: '4px 0' }}>
          |||||||||||
        </div>

        {/* Row 6: Notice Text (per-ticket editable) */}
        <div style={{ textAlign: 'center', fontSize: 11 * scale, color: '#475569', lineHeight: 1.4, margin: '4px 0', whiteSpace: 'pre-wrap' }}>
          {setting.noticeTextKr || '안내 사항이 없습니다.'}
        </div>

        {/* Row 7: 발급시간 + 대기인원 (ON/OFF) */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: 9 * scale, color: '#94a3b8' }}>
          {ts.showPrintDateTime && <div>{new Date().toLocaleString()}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {ts.showEstimatedWaitTime && <span>예상 대기: 15분</span>}
            {ts.showWaitingCount && <span>대기인원: 5명</span>}
          </div>
        </div>

        {/* Row 8: Hospital Name (ON/OFF, uses hospitalProfileName — NOT auto from hospitalProfile) */}
        {ts.showHospitalLogo && (
          <div style={{ textAlign: 'center', fontSize: 11 * scale, fontWeight: 700, color: '#1e293b', paddingTop: '6px', borderTop: '1px dashed #cbd5e1' }}>
            {ts.hospitalProfileName || '병원명 미입력'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Ticket size={22} style={{ color: '#4f46e5' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>키오스크 용지 설정 시스템</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start', flex: 1 }}>
        {/* Left: 60% settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* A. 전역 설정 */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Settings size={18} style={{ color: '#4f46e5' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>전역 설정</h3>
            </div>
            <div className="form-grid">
              {/* 병원명/채혈실명 표시 문구 (최하단) */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">병원명 채혈실명 기타 표시문구 (최하단 문구)</label>
                <input
                  className="input"
                  value={ts.hospitalProfileName || ''}
                  onChange={(e) => updateGlobal('hospitalProfileName', e.target.value)}
                  placeholder="예: 샘플대학교병원 채혈실, 감사합니다"
                />
              </div>

              {/* 접수대 사용 여부 / 자동접수 사용 여부 */}
              <div className="form-group">
                <label className="label">접수대 운영</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    className={`toggle-track${ts.useReceptionDesk ? ' active' : ''}`}
                    onClick={() => updateGlobal('useReceptionDesk', !ts.useReceptionDesk)}
                  >
                    <div className="toggle-knob" />
                  </div>
                  <span style={{ fontSize: '0.875rem' }}>{ts.useReceptionDesk ? '사용' : '미사용'}</span>
                </div>
              </div>
              <div className="form-group">
                <label className="label">자동접수 운영</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    className={`toggle-track${ts.useAutoRegistration ? ' active' : ''}`}
                    onClick={() => updateGlobal('useAutoRegistration', !ts.useAutoRegistration)}
                  >
                    <div className="toggle-knob" />
                  </div>
                  <span style={{ fontSize: '0.875rem' }}>{ts.useAutoRegistration ? '사용' : '미사용'}</span>
                </div>
              </div>

              {/* 2헤드 색상 분기 로직 */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">2헤드 분기 모드 (하얀/빨간 용지)</label>
                <select
                  className="input"
                  value={ts.twoHeadColorMode}
                  onChange={(e) => updateGlobal('twoHeadColorMode', e.target.value as 'A' | 'B' | 'C')}
                >
                  <option value="A">모드 A: 모든 용지 흰색</option>
                  <option value="B">모드 B: 채혈대기표만 흰색 / 나머지 빨간색</option>
                  <option value="C">모드 C: 채혈·접수대기표 흰색 / 예외 빨간색</option>
                </select>
              </div>

              {/* 기타 플래그 */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                 <label className="label">표시 옵션</label>
                 <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                   {([
                     { key: 'showHospitalLogo', label: '병원 이름 표시 (8번째 줄 ON/OFF)' },
                     { key: 'showPrintDateTime', label: '발급시간 표시 (7번째 줄)' },
                     { key: 'showEstimatedWaitTime', label: '예상 대기시간' },
                     { key: 'showWaitingCount', label: '현재 대기인원 표시 (7번째 줄)' }
                   ] as const).map(opt => (
                     <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                       <input
                         type="checkbox"
                         checked={ts[opt.key]}
                         onChange={(e) => updateGlobal(opt.key, e.target.checked)}
                       />
                       {opt.label}
                     </label>
                   ))}
                 </div>
              </div>
            </div>
          </div>

          {/* B. 용지 유형 탭 영역 */}
          <div className="card">
            <h3 className="section-title">용지 유형별 개별 설정</h3>
            
            <div className="tab-bar" style={{ marginTop: '1rem' }}>
              {TICKET_TABS.map((tab) => (
                <div
                  key={tab.key}
                  className={`tab-item${activeTab === tab.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>출력 여부</span>
                <div
                    className={`toggle-track${activeTicketSetting.enabled ? ' active' : ''}`}
                    onClick={() => updateIndividual(activeTab, 'enabled', !activeTicketSetting.enabled)}
                  >
                    <div className="toggle-knob" />
                </div>
              </div>

              {activeTicketSetting.enabled ? (
                <>
                  <div className="form-group">
                    <label className="label">헤더 문구 (한글)</label>
                    <input
                      className="input"
                      value={activeTicketSetting.headerTextKr}
                      onChange={(e) => updateIndividual(activeTab, 'headerTextKr', e.target.value)}
                      placeholder="예: 채혈 대기표"
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">안내 문구 (한글)</label>
                    <textarea
                      className="input"
                      rows={2}
                      value={activeTicketSetting.noticeTextKr}
                      onChange={(e) => updateIndividual(activeTab, 'noticeTextKr', e.target.value)}
                      placeholder="예: 대기번호를 호출하면 채혈실로 오세요."
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">포인트 색상 (라인/번호)</label>
                    <input
                      type="color"
                      className="input"
                      value={activeTicketSetting.pointColor || '#000000'}
                      onChange={(e) => updateIndividual(activeTab, 'pointColor', e.target.value)}
                      style={{ height: 40, padding: '0.25rem' }}
                    />
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>
                  이 용지는 미출력으로 설정되었습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: 40% live preview */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: '#f8fafc' }}>
            <h3 className="section-title" style={{ alignSelf: 'flex-start', margin: 0 }}>
              <Monitor size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
              실시간 미리보기
            </h3>

            {renderTicketPreview(activeTab)}

            <button
              className="btn btn-outline"
              style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.875rem' }}
              onClick={() => setShowAllPreviews(!showAllPreviews)}
            >
              <Eye size={14} style={{ marginRight: 6 }} />
              {showAllPreviews ? '미리보기 접기' : '5종 용지 전체보기'}
            </button>
          </div>

          {showAllPreviews && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(15, 23, 42, 0.8)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '4rem 2rem',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 1200, marginBottom: '2rem' }}>
                <h2 style={{ color: 'white', margin: 0 }}>5종 용지 전체보기</h2>
                <button className="btn btn-primary" onClick={() => setShowAllPreviews(false)}>닫기</button>
              </div>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center'
              }}>
                {TICKET_TABS.map(tab => (
                   <div key={tab.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                     <span style={{ color: 'white', fontWeight: 600 }}>{tab.label}</span>
                     {renderTicketPreview(tab.key)}
                   </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
