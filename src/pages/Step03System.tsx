import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Monitor,
  Scan,
  Ticket,
  Phone,
  Droplets,
  AlertTriangle,
  BookOpen,
  ExternalLink,
  ChevronRight,
  LayoutGrid,
  Users,
  Printer,
  Info,
  Plus,
  Trash2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { EquipmentNote } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface FlowCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const flowWithoutDesk: FlowCard[] = [
  {
    icon: <Scan size={20} />,
    title: '환자 접수',
    description:
      '환자가 키오스크에서 직접 바코드 스캔 → 번호표 발급. 별도의 접수 인력 없이 환자가 스스로 바코드를 스캔하면 시스템이 자동으로 본인 확인 및 처방 조회를 수행합니다.',
  },
  {
    icon: <Ticket size={20} />,
    title: '번호표 발급',
    description:
      '키오스크에서 자동 번호표 출력 → 대기. 바코드 인식이 완료되면 즉시 대기번호가 인쇄되며, 환자는 번호표를 받고 대기 좌석에서 호출을 기다립니다.',
  },
  {
    icon: <Phone size={20} />,
    title: '호출',
    description:
      'DID 화면에 번호 표시 + 음성 안내. 채혈 준비가 완료된 데스크에서 호출 버튼을 누르면 DID 화면과 스피커를 통해 환자의 대기번호와 해당 데스크 번호가 안내됩니다.',
  },
  {
    icon: <Droplets size={20} />,
    title: '채혈',
    description:
      '채혈 데스크에서 채혈 진행. 환자가 지정된 데스크에 도착하면 Paradigm 장비가 자동으로 튜브를 준비하고 라벨을 부착하여 채혈자의 업무를 최소화합니다.',
  },
  {
    icon: <AlertTriangle size={20} />,
    title: '예외 처리 흐름',
    description:
      '미수납/처방없음 → 별도 안내 용지 출력. 수납이 완료되지 않았거나 처방 정보가 없는 경우, 키오스크에서 빨간색 안내 용지가 출력되어 환자에게 후속 절차를 안내합니다.',
  },
];

const flowWithDesk: FlowCard[] = [
  {
    icon: <Users size={20} />,
    title: '환자 접수',
    description:
      '환자 접수대 방문 → 직원이 바코드 스캔. 접수 직원이 환자의 신분증 또는 처방전 바코드를 직접 스캔하여 본인 확인과 처방 조회를 동시에 진행합니다.',
  },
  {
    icon: <Ticket size={20} />,
    title: '번호표 발급',
    description:
      '접수대에서 번호표 발급 → 환자에게 전달. 직원이 접수를 완료하면 프린터에서 번호표가 출력되며, 환자에게 직접 전달하고 대기 안내를 합니다.',
  },
  {
    icon: <Phone size={20} />,
    title: '호출',
    description:
      'DID 화면 호출. 채혈 데스크에서 다음 환자를 호출하면 DID 디스플레이에 대기번호와 데스크 번호가 표시되어 환자가 쉽게 자신의 차례를 확인할 수 있습니다.',
  },
  {
    icon: <Droplets size={20} />,
    title: '채혈',
    description:
      '채혈 데스크 진행. 호출된 환자가 해당 데스크에 착석하면 Paradigm 장비를 통해 자동화된 검체 준비와 채혈이 이루어집니다.',
  },
  {
    icon: <AlertTriangle size={20} />,
    title: '예외 처리 흐름',
    description:
      '특이 환자 → 직원이 수동 처리. 바코드 인식 실패, 외국인 환자, 긴급 채혈 등 특수한 상황에서는 접수대 직원이 수동으로 환자를 등록하고 우선순위를 조정합니다.',
  },
];

const equipmentCards = [
  {
    icon: <LayoutGrid size={22} />,
    title: '키오스크',
    description:
      '환자 셀프 접수 단말기입니다. 바코드 스캐너와 영수증 프린터가 내장되어 있으며, 환자가 직접 바코드를 스캔하면 자동으로 본인 확인 → 처방 조회 → 수납 확인 → 대기번호 발급까지 원스텝으로 처리합니다.',
  },
  {
    icon: <Monitor size={22} />,
    title: 'DID (디지털 안내 디스플레이)',
    description:
      '채혈실 대기 공간에 설치하는 대형 디지털 디스플레이입니다. 현재 호출 중인 대기번호, 채혈 데스크 번호, 다음 대기자 정보를 실시간으로 표시합니다.',
  },
  {
    icon: <Droplets size={22} />,
    title: '채혈데스크 (Paradigm)',
    description:
      'Paradigm 시리즈가 탑재된 채혈 전용 데스크입니다. AI DESK 모델의 경우 환자 정보를 자동 인식하여 필요한 튜브를 준비하고, 라벨링까지 자동으로 수행합니다.',
  },
  {
    icon: <Printer size={22} />,
    title: '접수대 세트',
    description:
      '수동 접수를 위한 전용 데스크 세트입니다. PC, 바코드 스캐너, 번호표 프린터가 포함되어 있으며, 키오스크를 보조하는 역할을 합니다.',
  },
];

export default function Step03System() {
  const educationLinks = useStore((s) => s.educationLinks);
  const getCurrentProject = useStore((s) => s.getCurrentProject);
  const updateProject = useStore((s) => s.updateProject);
  const project = getCurrentProject();

  const [activeTab, setActiveTab] = useState<'no_desk' | 'with_desk'>('no_desk');
  const [notes, setNotes] = useState<EquipmentNote[]>([]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project) {
      setNotes([...(project.step03Notes ?? [])]);
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveToStore = useCallback(() => {
    if (!project) return;
    updateProject(project.id, { step03Notes: [...notes] });
  }, [project, notes, updateProject]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToStore, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [notes, saveToStore]);

  const flowCards = activeTab === 'no_desk' ? flowWithoutDesk : flowWithDesk;

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
        <Monitor size={22} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>시스템 이해</h2>
      </div>

      {/* Tab bar */}
      <div className="card">
        <div className="tab-bar">
          <div
            className={`tab-item${activeTab === 'no_desk' ? ' active' : ''}`}
            onClick={() => setActiveTab('no_desk')}
          >
            접수대 미사용
          </div>
          <div
            className={`tab-item${activeTab === 'with_desk' ? ' active' : ''}`}
            onClick={() => setActiveTab('with_desk')}
          >
            접수대 사용
          </div>
        </div>

        {/* Flow cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
          {flowCards.map((card, idx) => (
            <div key={idx} style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.625rem',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#ede9fe',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {card.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                    <span className="badge" style={{ fontSize: '0.6875rem' }}>STEP {idx + 1}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{card.title}</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                    {card.description}
                  </p>
                </div>
              </div>
              {idx < flowCards.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '0.25rem 0' }}>
                  <ChevronRight size={18} style={{ transform: 'rotate(90deg)', color: '#94a3b8' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Equipment explanation cards removed — managed via 장비 설명 관리 below */}

      {/* Education links */}
      <div>
        <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>
          <BookOpen size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          교육 자료
        </h3>
        {educationLinks.length === 0 ? (
          <div className="info-box">
            <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>등록된 교육 자료가 없습니다. 관리자 페이지에서 교육 링크를 추가할 수 있습니다.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {educationLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.15s',
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: '0.5rem',
                      background: '#fef3c7',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ExternalLink size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.125rem' }}>
                      {link.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{link.category}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* 장비 설명 관리 (사진/링크/문구 — Google Drive URL 방식) */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="section-title" style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>장비 설명 관리</h3>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setNotes(prev => [
              ...prev,
              { id: uuidv4(), productLabel: '', description: '', photoUrl: '', linkTitle: '', linkUrl: '' }
            ])}
          >
            <Plus size={14} /> 장비 추가
          </button>
        </div>
        {notes.length === 0 && (
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>
            장비별 설명, 사진(Google Drive 링크), 참고 자료를 추가할 수 있습니다.
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notes.map((note, idx) => (
            <div key={note.id} className="card" style={{ background: '#f8fafc', padding: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <input
                  className="input"
                  style={{ flex: 1, fontWeight: 600, marginRight: '0.5rem' }}
                  placeholder="장비명 (예: Paradigm 5 Series)"
                  value={note.productLabel}
                  onChange={(e) => {
                    const n = [...notes];
                    n[idx] = { ...n[idx], productLabel: e.target.value };
                    setNotes(n);
                  }}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ef4444', flexShrink: 0 }}
                  onClick={() => setNotes(notes.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="label" style={{ fontSize: '0.75rem' }}>설명 문구</label>
                  <textarea
                    className="input"
                    rows={3}
                    style={{ fontSize: '0.8125rem', resize: 'vertical' }}
                    placeholder="장비 기능, 특징 등을 설명하세요"
                    value={note.description}
                    onChange={(e) => {
                      const n = [...notes];
                      n[idx] = { ...n[idx], description: e.target.value };
                      setNotes(n);
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="label" style={{ fontSize: '0.75rem' }}>사진 링크 (Google Drive URL)</label>
                  <input
                    className="input"
                    style={{ fontSize: '0.8125rem' }}
                    placeholder="https://drive.google.com/..."
                    value={note.photoUrl}
                    onChange={(e) => {
                      const n = [...notes];
                      n[idx] = { ...n[idx], photoUrl: e.target.value };
                      setNotes(n);
                    }}
                  />
                  {note.photoUrl && (
                    <a
                      href={note.photoUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.75rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4, marginTop: '0.25rem' }}
                    >
                      <ExternalLink size={12} /> 사진 확인
                    </a>
                  )}
                </div>
                <div className="form-group">
                  <label className="label" style={{ fontSize: '0.75rem' }}>참고 링크 제목</label>
                  <input
                    className="input"
                    style={{ fontSize: '0.8125rem' }}
                    placeholder="예: 설치 가이드"
                    value={note.linkTitle}
                    onChange={(e) => {
                      const n = [...notes];
                      n[idx] = { ...n[idx], linkTitle: e.target.value };
                      setNotes(n);
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="label" style={{ fontSize: '0.75rem' }}>참고 링크 URL</label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <input
                      className="input"
                      style={{ fontSize: '0.8125rem', flex: 1 }}
                      placeholder="https://..."
                      value={note.linkUrl}
                      onChange={(e) => {
                        const n = [...notes];
                        n[idx] = { ...n[idx], linkUrl: e.target.value };
                        setNotes(n);
                      }}
                    />
                    {note.linkUrl && (
                      <a href={note.linkUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
