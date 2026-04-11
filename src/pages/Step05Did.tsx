import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Monitor,
  Eye,
  Minus,
  Plus,
  Info,
  Clock,
  Users,
  MessageSquare,
  Link as LinkIcon,
  AlignLeft,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { DidSettings, DidRightCard } from '../types';

const DEFAULT_CARDS: DidRightCard[] = [
  { title: '채혈 후 지혈 방법', description: '지혈 부위를 5분 이상\n꾹 눌러서 지혈해주세요.', imageUrl: '' },
  { title: '소변검체 제출 방법', description: '채혈실 안에 있는 검사용\n화장실에서 소변을 받은 후에\n노란색 창문을 열고 소변컵을\n넣어주세요.', imageUrl: '' },
];

const DEFAULT_DID: DidSettings = {
  callingMethod: 'did_voice',
  maskName: true,
  deskCount: 6,
  layoutMode: 'standard',
  showClock: true,
  showWaitingCount: true,
  matrixMessage: '',
  rightCards: DEFAULT_CARDS,
};

export default function Step05Did() {
  const project = useStore((s) =>
    s.currentProjectId ? s.projects.find((p) => p.id === s.currentProjectId) ?? null : null
  );
  const updateProject = useStore((s) => s.updateProject);

  const [did, setDid] = useState<DidSettings>(DEFAULT_DID);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project) {
      const d = project.didSettings;
      setDid({
        ...DEFAULT_DID,
        ...d,
        rightCards: d.rightCards?.length ? d.rightCards : DEFAULT_CARDS,
        showClock: d.showClock ?? true,
        showWaitingCount: d.showWaitingCount ?? true,
        matrixMessage: d.matrixMessage ?? '',
      });
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
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [did, scheduleSave]);

  const update = <K extends keyof DidSettings>(key: K, value: DidSettings[K]) =>
    setDid((prev) => ({ ...prev, [key]: value }));

  const updateCard = (idx: number, field: keyof DidRightCard, value: string) => {
    setDid((prev) => {
      const cards = [...(prev.rightCards || DEFAULT_CARDS)];
      cards[idx] = { ...cards[idx], [field]: value };
      return { ...prev, rightCards: cards };
    });
  };

  const maskName = (name: string) => {
    if (!did.maskName || name.length <= 1) return name;
    if (name.length === 2) return name[0] + '*';
    return name[0] + '*' + name[name.length - 1];
  };

  const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  if (!project) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
        <Info size={32} style={{ margin: '0 auto 0.75rem' }} />
        <p>프로젝트를 선택해주세요.</p>
      </div>
    );
  }

  const cards = did.rightCards?.length ? did.rightCards : DEFAULT_CARDS;
  const hospitalName = project.hospitalProfile.hospitalName || '병원명';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Monitor size={22} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>호출 · DID 시스템</h2>
      </div>

      {/* ── A. 기본 설정 ────────────────────────────────── */}
      <div className="card">
        <h3 className="section-title">기본 설정</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '0.75rem' }}>

          {/* 채혈 데스크 수 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, minWidth: 120 }}>채혈 데스크 수</span>
            <button className="btn btn-outline" onClick={() => update('deskCount', Math.max(1, did.deskCount - 1))}
              style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Minus size={16} />
            </button>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, minWidth: '2.5rem', textAlign: 'center' }}>{did.deskCount}</span>
            <button className="btn btn-outline" onClick={() => update('deskCount', Math.min(20, did.deskCount + 1))}
              style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={16} />
            </button>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>개</span>
          </div>

          {/* 이름 마스킹 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className={`toggle-track${did.maskName ? ' active' : ''}`} onClick={() => update('maskName', !did.maskName)}>
              <div className="toggle-knob" />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>이름 마스킹</span>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              {did.maskName ? `예: ${maskName('김소영')}` : '예: 김소영 (전체)'}
            </span>
          </div>

          {/* 시계 표기 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className={`toggle-track${did.showClock ? ' active' : ''}`} onClick={() => update('showClock', !did.showClock)}>
              <div className="toggle-knob" />
            </div>
            <Clock size={15} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>상단 시계 표기</span>
          </div>

          {/* 대기인원 표기 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className={`toggle-track${did.showWaitingCount ? ' active' : ''}`} onClick={() => update('showWaitingCount', !did.showWaitingCount)}>
              <div className="toggle-knob" />
            </div>
            <Users size={15} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>하단 대기인원 표기</span>
          </div>
        </div>
      </div>

      {/* ── B. 하단 매트릭스 메시지 ─────────────────────── */}
      <div className="card">
        <h3 className="section-title">
          <MessageSquare size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          하단 매트릭스 메시지
        </h3>
        <input
          className="input"
          style={{ marginTop: '0.75rem' }}
          value={did.matrixMessage || ''}
          onChange={(e) => update('matrixMessage', e.target.value)}
          placeholder="예: 채혈 후 원무과에서 수납해 주시기 바랍니다."
        />
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.375rem' }}>
          DID 화면 최하단에 표시되는 스크롤 안내 문구
        </p>
      </div>

      {/* ── C. 우측 안내 카드 ───────────────────────────── */}
      <div className="card">
        <h3 className="section-title">
          <AlignLeft size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          우측 안내 카드
        </h3>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem', marginBottom: '1rem' }}>
          병원에서 제공한 안내 이미지/자료가 있으면 구글 드라이브에 올리고 링크를 입력해 주세요.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cards.map((card, idx) => (
            <div key={idx} style={{ padding: '0.875rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.625rem' }}>
                카드 {idx + 1}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  className="input"
                  value={card.title}
                  onChange={(e) => updateCard(idx, 'title', e.target.value)}
                  placeholder="제목 (예: 채혈 후 지혈 방법)"
                />
                <textarea
                  className="input"
                  rows={3}
                  value={card.description}
                  onChange={(e) => updateCard(idx, 'description', e.target.value)}
                  placeholder="안내 문구"
                  style={{ resize: 'vertical' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LinkIcon size={13} style={{ color: '#64748b', flexShrink: 0 }} />
                  <input
                    className="input"
                    value={card.imageUrl}
                    onChange={(e) => updateCard(idx, 'imageUrl', e.target.value)}
                    placeholder="이미지 링크 (구글 드라이브 또는 URL)"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── D. DID 시뮬레이터 ───────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <h3 className="section-title" style={{ padding: '1rem 1.25rem 0.75rem' }}>DID 시뮬레이터</h3>

        {/* 전체 시뮬레이터 박스 */}
        <div style={{ margin: '0 0.75rem 0.75rem', borderRadius: '0.75rem', overflow: 'hidden', border: '2px solid #1e3a5f' }}>

          {/* 헤더 */}
          <div style={{
            background: '#1a2e4a',
            padding: '0.625rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #2d4a6b',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, background: '#2d4a6b', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', color: '#93c5fd', fontWeight: 700 }}>
                LOGO
              </div>
              <div>
                <div style={{ fontSize: '0.625rem', color: '#93c5fd' }}>가톨릭대학교</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>{hospitalName}</div>
              </div>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>
              채혈실 대기 현황
            </div>
            {did.showClock ? (
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#93c5fd' }}>{nowTime}</div>
            ) : (
              <div style={{ width: 60 }} />
            )}
          </div>

          {/* 본문 */}
          <div style={{ display: 'flex', background: '#0f2236', minHeight: 320 }}>

            {/* 좌측: 대기자 테이블 */}
            <div style={{ flex: 1.2, borderRight: '1px solid #1e3a5f' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', height: '100%' }}>
                <tbody>
                  {Array.from({ length: did.deskCount }, (_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e3a5f', height: `${Math.max(40, 300 / did.deskCount)}px` }}>
                      <td style={{
                        width: 48,
                        background: '#1a4a8a',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: '1.125rem',
                        color: '#fff',
                        borderRight: '1px solid #1e3a5f',
                        verticalAlign: 'middle',
                      }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '0.25rem 0.75rem', verticalAlign: 'middle' }}>
                        {i === 0 && (
                          <span style={{ fontSize: '0.875rem', color: '#fbbf24', fontWeight: 600 }}>
                            {maskName('홍길동')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 우측: 안내 카드 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem' }}>
              {cards.map((card, idx) => (
                <div key={idx} style={{
                  flex: 1,
                  background: '#1a2e4a',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  display: 'flex',
                  gap: '0.625rem',
                  alignItems: 'flex-start',
                }}>
                  {/* 이미지 */}
                  <div style={{ flexShrink: 0 }}>
                    {card.imageUrl ? (
                      <img src={card.imageUrl} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#2d4a6b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93c5fd', fontSize: '0.625rem', textAlign: 'center' }}>
                        이미지<br/>링크
                      </div>
                    )}
                  </div>
                  {/* 텍스트 */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
                      ※ {card.title || `안내 제목 ${idx + 1}`}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#93c5fd', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {card.description || '안내 문구를 입력해 주세요.'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 하단 대기인원 바 */}
          {did.showWaitingCount && (
            <div style={{
              background: '#1a4a8a',
              padding: '0.625rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #1e3a5f',
            }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>채혈 대기 인원</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24' }}>00</span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>명</span>
            </div>
          )}

          {/* 매트릭스 메시지 */}
          {did.matrixMessage && (
            <div style={{
              background: '#0a1a2e',
              padding: '0.375rem 1rem',
              borderTop: '1px solid #1e3a5f',
              overflow: 'hidden',
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#fbbf24',
                whiteSpace: 'nowrap',
                animation: 'marquee 12s linear infinite',
              }}>
                {did.matrixMessage}
              </div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes marquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
    </div>
  );
}
