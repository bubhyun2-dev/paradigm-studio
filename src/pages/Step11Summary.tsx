import { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Printer,
  FileJson,
  Code,
  Info,
  Link as LinkIcon,
  Plus,
  Trash2,
  Download,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  Edit2,
  Check,
  Upload,
  FolderOpen,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { AssetLink, TeamOutputSet } from '../types';
import { exportProjectAsHtml, exportProjectAsJson, exportForHeadquarters } from '../utils/exportUtils';
import { v4 as uuidv4 } from 'uuid';

// Available sections that can be included in team output
const SECTION_OPTIONS: { key: string; label: string; description: string }[] = [
  { key: 'hospitalProfile', label: '병원 기본 정보', description: '병원명, 유형, 지역, 담당자' },
  { key: 'workflowSettings', label: '접수 방식', description: '접수대 운영, 본인 확인, 미수납 처리' },
  { key: 'didSettings', label: 'DID 설정', description: 'DID 안내 문구, 데스크 수' },
  { key: 'ticketSettings', label: '용지 설정', description: '대기표 설정, 2헤드 모드' },
  { key: 'components', label: '구성품 / IP 정보', description: '장비 목록, IP, 버전 정보' },
  { key: 'facilityDrawing', label: '시설팀 도면', description: '배치 도면, 전원/LAN 위치' },
  { key: 'phase1Checklist', label: 'Phase 1 체크리스트', description: '사전 준비 항목 현황' },
  { key: 'phase2Checklist', label: 'Phase 2 체크리스트', description: '설치 준비 항목 현황' },
  { key: 'contacts', label: '담당자 연락처', description: '부서별 연락처 목록' },
  { key: 'assetLinks', label: '자산 링크', description: '관련 사진, 문서, 링크' },
];

export default function Step11Summary() {
  // Subscribe directly to project data — getCurrentProject selector won't re-render on data change
  const project = useStore((s) =>
    s.currentProjectId ? (s.projects.find(p => p.id === s.currentProjectId) ?? null) : null
  );
  const updateProject = useStore((s) => s.updateProject);
  const products = useStore((s) => s.products);
  const dealers = useStore((s) => s.dealers);
  const user = useStore((s) => s.user);

  // 현재 프로젝트의 대리점 찾기 (dealerId 없으면 로그인 사용자의 대리점으로 fallback)
  const currentDealer = useMemo(() => {
    if (!project) return null;
    const byProject = dealers.find((d) => d.id === project.salesProfile.dealerId);
    if (byProject) return byProject;
    if (user?.dealerId) return dealers.find((d) => d.id === user.dealerId) ?? null;
    return null;
  }, [dealers, project, user]);

  const [newAsset, setNewAsset] = useState<Partial<AssetLink>>({
    title: '', url: '', assetCategory: '설치전 사진', isSharedAsset: false, description: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Team output sets state
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [showNewTeamForm, setShowNewTeamForm] = useState(false);
  const [printingTeamId, setPrintingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [hqSentStatus, setHqSentStatus] = useState<'idle' | 'success' | 'no_drive'>('idle');

  if (!project) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
        <Info size={32} style={{ margin: '0 auto 0.75rem' }} />
        <p>프로젝트를 선택해주세요.</p>
      </div>
    );
  }

  const assets = project.assetLinks || [];
  const teamOutputSets: TeamOutputSet[] = project.teamOutputSets || [];

  // ─── 본사 전송 핸들러 ───────────────────────────────────
  const handleSendToHQ = () => {
    const driveFolderUrl = currentDealer?.driveFolderUrl;

    // JSON 다운로드 (대리점명_병원명_날짜_시방서.json)
    exportForHeadquarters(project);

    if (driveFolderUrl) {
      window.open(driveFolderUrl, '_blank');
      setHqSentStatus('success');
    } else {
      setHqSentStatus('no_drive');
    }
  };

  const handleAddAsset = () => {
    if (!newAsset.title || !newAsset.url) return;
    const link: AssetLink = {
      id: uuidv4(),
      title: newAsset.title,
      url: newAsset.url,
      assetType: 'other',
      assetCategory: newAsset.assetCategory || '기타',
      description: newAsset.description || '',
      createdBy: '사용자',
      createdAt: new Date().toISOString(),
      isSharedAsset: !!newAsset.isSharedAsset,
      projectId: project.id,
    };
    updateProject(project.id, { assetLinks: [...assets, link] });
    setNewAsset({ title: '', url: '', assetCategory: '설치전 사진', isSharedAsset: false, description: '' });
    setShowAddForm(false);
  };

  const handleRemoveAsset = (id: string) => {
    updateProject(project.id, { assetLinks: assets.filter(a => a.id !== id) });
  };

  // Team output set helpers
  const addTeamOutputSet = () => {
    if (!newTeamName.trim()) return;
    const newSet: TeamOutputSet = {
      id: uuidv4(),
      teamName: newTeamName.trim(),
      selectedSections: [],
    };
    updateProject(project.id, { teamOutputSets: [...teamOutputSets, newSet] });
    setNewTeamName('');
    setShowNewTeamForm(false);
    setExpandedTeamId(newSet.id);
  };

  const removeTeamOutputSet = (id: string) => {
    updateProject(project.id, { teamOutputSets: teamOutputSets.filter(t => t.id !== id) });
  };

  const toggleSection = (teamId: string, sectionKey: string) => {
    const updated = teamOutputSets.map(t => {
      if (t.id !== teamId) return t;
      const has = t.selectedSections.includes(sectionKey);
      return {
        ...t,
        selectedSections: has
          ? t.selectedSections.filter(s => s !== sectionKey)
          : [...t.selectedSections, sectionKey],
      };
    });
    updateProject(project.id, { teamOutputSets: updated });
  };

  const saveTeamName = (teamId: string) => {
    if (!editTeamName.trim()) return;
    const updated = teamOutputSets.map(t =>
      t.id === teamId ? { ...t, teamName: editTeamName.trim() } : t
    );
    updateProject(project.id, { teamOutputSets: updated });
    setEditingTeamId(null);
  };

  const printForTeam = (teamId: string) => {
    setPrintingTeamId(teamId);
    // window.print() triggered by useEffect after re-render
  };

  // Trigger print after DOM has updated with printingTeamId content
  useEffect(() => {
    if (!printingTeamId) return;
    const timer = setTimeout(() => {
      window.print();
      setPrintingTeamId(null);
    }, 350);
    return () => clearTimeout(timer);
  }, [printingTeamId]);

  const hp = project.hospitalProfile;
  const ws = project.workflowSettings;
  const ds = project.didSettings;
  const ts = project.ticketSettings;

  const instancesList = useMemo(() => {
    const list: any[] = [];
    project.components.forEach(c => {
      if (!c.instances || c.instances.length === 0) {
        list.push({ ...c, ip: '-', mac: '-', sw: '-', fw: '-', hw: '-', idx: 1 });
      } else {
        c.instances.forEach((inst, idx) => {
          list.push({
            ...c,
            ip: inst.ip || '-',
            mac: inst.macAddress || '-',
            sw: inst.softwareVersion || '-',
            fw: inst.firmwareVersion || '-',
            hw: inst.hardwareVersion || '-',
            idx: idx + 1
          });
        });
      }
    });
    return list;
  }, [project.components]);

  const printingTeam = teamOutputSets.find(t => t.id === printingTeamId);
  const printSections = printingTeam?.selectedSections || [];

  const renderPrintSection = (sectionKey: string) => {
    // Common print styles
    const TH: React.CSSProperties = { background: '#e8edf2', border: '1px solid #b0b8c4', padding: '0.45rem 0.7rem', textAlign: 'left', fontWeight: 600, fontSize: '9pt', whiteSpace: 'nowrap', verticalAlign: 'top' };
    const TD: React.CSSProperties = { border: '1px solid #b0b8c4', padding: '0.45rem 0.7rem', fontSize: '9.5pt', verticalAlign: 'top' };
    const TBL: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' };
    const H2: React.CSSProperties = { fontSize: '13pt', fontWeight: 700, borderBottom: '2px solid #2563eb', paddingBottom: '0.3rem', marginBottom: '0.8rem', color: '#1e3a5f' };
    const H3: React.CSSProperties = { fontSize: '10.5pt', fontWeight: 700, background: '#dbeafe', padding: '0.3rem 0.6rem', marginTop: '0.8rem', marginBottom: '0.4rem', borderLeft: '4px solid #2563eb', color: '#1e40af' };
    const yesNo = (v: boolean) => v ? '✔ 사용' : '✘ 미사용';
    const dash = (v: string | undefined | null) => v || '—';

    switch (sectionKey) {
      case 'hospitalProfile': {
        const sp = project.salesProfile;
        const si = project.siteInfo;
        return (
          <div key={sectionKey} className="print-section">
            <h2 style={H2}>병원 기본 정보</h2>

            <h3 style={H3}>병원 정보</h3>
            <table style={TBL}>
              <tbody>
                <tr>
                  <th style={{ ...TH, width: '18%' }}>병원명</th>
                  <td style={{ ...TD, fontWeight: 700, fontSize: '11pt' }}>{hp.hospitalName}</td>
                  <th style={{ ...TH, width: '18%' }}>병원 유형</th>
                  <td style={TD}>{dash(hp.hospitalType)}</td>
                </tr>
                <tr>
                  <th style={TH}>지역</th>
                  <td style={TD}>{dash(hp.region)}</td>
                  <th style={TH}>주소</th>
                  <td style={TD}>{dash(hp.address)}</td>
                </tr>
                <tr>
                  <th style={TH}>일 평균 환자 수</th>
                  <td style={TD}>{hp.dailyPatientCount ? `약 ${hp.dailyPatientCount.toLocaleString()}명` : '—'}</td>
                  <th style={TH}></th>
                  <td style={TD}></td>
                </tr>
              </tbody>
            </table>

            <h3 style={H3}>병원 담당자</h3>
            <table style={TBL}>
              <tbody>
                <tr>
                  <th style={{ ...TH, width: '18%' }}>담당자명</th>
                  <td style={TD}>{dash(hp.contactName)}</td>
                  <th style={{ ...TH, width: '18%' }}>직함/부서</th>
                  <td style={TD}>{dash(hp.contactTitle)}</td>
                </tr>
                <tr>
                  <th style={TH}>연락처</th>
                  <td style={TD}>{dash(hp.contactPhone)}</td>
                  <th style={TH}>이메일</th>
                  <td style={TD}>{dash(hp.contactEmail)}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={H3}>영업 정보</h3>
            <table style={TBL}>
              <tbody>
                <tr>
                  <th style={{ ...TH, width: '18%' }}>딜러사</th>
                  <td style={TD}>{dash(sp?.dealerName)}</td>
                  <th style={{ ...TH, width: '18%' }}>영업 담당자</th>
                  <td style={TD}>{dash(sp?.salesRepName)}</td>
                </tr>
                <tr>
                  <th style={TH}>담당자 연락처</th>
                  <td style={TD}>{dash(sp?.salesRepPhone)}</td>
                  <th style={TH}>담당자 이메일</th>
                  <td style={TD}>{dash(sp?.salesRepEmail)}</td>
                </tr>
                <tr>
                  <th style={TH}>최초 상담일</th>
                  <td style={TD}>{dash(sp?.firstMeetingDate)}</td>
                  <th style={TH}>등록일</th>
                  <td style={TD}>{dash(sp?.createdDate)}</td>
                </tr>
                {sp?.memo && (
                  <tr>
                    <th style={TH}>메모</th>
                    <td style={{ ...TD, colspan: 3 } as any} colSpan={3}>{sp.memo}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {si && (
              <>
                <h3 style={H3}>현장 정보</h3>
                <table style={TBL}>
                  <tbody>
                    <tr>
                      <th style={{ ...TH, width: '18%' }}>천장 높이</th>
                      <td style={TD}>{dash(si.ceilingHeight)}</td>
                      <th style={{ ...TH, width: '18%' }}>출입문 폭</th>
                      <td style={TD}>{dash(si.doorWidth)}</td>
                    </tr>
                    <tr>
                      <th style={TH}>엘리베이터</th>
                      <td style={TD}>{si.elevatorAvailable ? '있음' : '없음'}</td>
                      <th style={TH}>반입 경로</th>
                      <td style={TD}>{dash(si.entryRoute)}</td>
                    </tr>
                    <tr>
                      <th style={TH}>벽 재질</th>
                      <td style={TD}>{dash(si.wallMaterial)}</td>
                      <th style={TH}>바닥 상태</th>
                      <td style={TD}>{dash(si.floorCondition)}</td>
                    </tr>
                    <tr>
                      <th style={TH}>기존 전원</th>
                      <td style={TD}>{dash(si.existingPowerDesc)}</td>
                      <th style={TH}>기존 LAN</th>
                      <td style={TD}>{dash(si.existingLanDesc)}</td>
                    </tr>
                    {si.restrictions && (
                      <tr>
                        <th style={TH}>제약 사항</th>
                        <td style={TD} colSpan={3}>{si.restrictions}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>
        );
      }

      case 'workflowSettings':
        return (
          <div key={sectionKey} className="print-section">
            <h2 style={H2}>접수 방식 설정</h2>

            <h3 style={H3}>기본 접수 설정</h3>
            <table style={TBL}>
              <tbody>
                <tr>
                  <th style={{ ...TH, width: '28%' }}>접수대 운영</th>
                  <td style={TD}>{yesNo(ws.useReceptionDesk)}</td>
                  <th style={{ ...TH, width: '28%' }}>자동 접수</th>
                  <td style={TD}>{yesNo(ws.useAutoRegistration)}</td>
                </tr>
                <tr>
                  <th style={TH}>본인 확인 방법</th>
                  <td style={TD} colSpan={3}>{ws.verificationMethod?.length ? ws.verificationMethod.join(', ') : '—'}</td>
                </tr>
                <tr>
                  <th style={TH}>주민번호 마스킹</th>
                  <td style={TD}>{yesNo(ws.maskResidentNumber)}</td>
                  <th style={TH}></th>
                  <td style={TD}></td>
                </tr>
              </tbody>
            </table>

            <h3 style={H3}>미수납 처리</h3>
            <table style={TBL}>
              <tbody>
                <tr>
                  <th style={{ ...TH, width: '28%' }}>미수납 발권 허용</th>
                  <td style={TD} colSpan={3}>{ws.allowUnpaidTicket ? '✔ 허용' : '✘ 미허용'}</td>
                </tr>
                {ws.allowUnpaidTicket && (
                  <>
                    {ws.unpaidMemo && (
                      <tr>
                        <th style={TH}>미수납 안내 문구</th>
                        <td style={{ ...TD, whiteSpace: 'pre-wrap' }} colSpan={3}>{ws.unpaidMemo}</td>
                      </tr>
                    )}
                    {ws.unpaidLinkTitle && (
                      <tr>
                        <th style={TH}>미수납 예시 링크</th>
                        <td style={TD} colSpan={3}>{ws.unpaidLinkTitle}{ws.unpaidLinkUrl ? ` → ${ws.unpaidLinkUrl}` : ''}</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>

            <h3 style={H3}>미처방 처리</h3>
            <table style={TBL}>
              <tbody>
                <tr>
                  <th style={{ ...TH, width: '28%' }}>미처방 발권 허용</th>
                  <td style={TD} colSpan={3}>{ws.allowNoPrescriptionTicket ? '✔ 허용' : '✘ 미허용'}</td>
                </tr>
                {ws.allowNoPrescriptionTicket && ws.noPrescriptionMemo && (
                  <tr>
                    <th style={TH}>미처방 안내 문구</th>
                    <td style={{ ...TD, whiteSpace: 'pre-wrap' }} colSpan={3}>{ws.noPrescriptionMemo}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {ws.autoRegistrationConditions && (
              <>
                <h3 style={H3}>자동 접수 조건</h3>
                <table style={TBL}>
                  <tbody>
                    {ws.autoRegistrationConditions.split('\n').filter(Boolean).map((c, i) => (
                      <tr key={i}>
                        <td style={{ ...TH, width: '6%', textAlign: 'center' }}>{i + 1}</td>
                        <td style={TD}>{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {ws.manualCheckConditions && (
              <>
                <h3 style={H3}>수동 확인 조건</h3>
                <table style={TBL}>
                  <tbody>
                    {ws.manualCheckConditions.split('\n').filter(Boolean).map((c, i) => (
                      <tr key={i}>
                        <td style={{ ...TH, width: '6%', textAlign: 'center' }}>{i + 1}</td>
                        <td style={TD}>{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {ws.exceptions && ws.exceptions.length > 0 && (
              <>
                <h3 style={H3}>예외 항목</h3>
                <table style={TBL}>
                  <thead>
                    <tr>
                      <th style={{ ...TH, width: '25%' }}>항목명</th>
                      <th style={TH}>메모</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ws.exceptions.map(ex => (
                      <tr key={ex.id}>
                        <td style={TD}>{ex.name}</td>
                        <td style={TD}>{ex.memo}{ex.linkTitle ? ` [${ex.linkTitle}]` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        );

      case 'didSettings':
        return (
          <div key={sectionKey} className="print-section">
            <h2 style={H2}>호출 · DID 설정</h2>

            <h3 style={H3}>DID 기본 설정</h3>
            <table style={TBL}>
              <tbody>
                <tr>
                  <th style={{ ...TH, width: '28%' }}>호출 방식</th>
                  <td style={TD}>{ds.callingMethod === 'did_voice' ? 'DID + 음성 호출' : 'DID 화면만'}</td>
                  <th style={{ ...TH, width: '28%' }}>이름 마스킹</th>
                  <td style={TD}>{yesNo(ds.maskName)}</td>
                </tr>
                <tr>
                  <th style={TH}>채혈 데스크 수</th>
                  <td style={TD}><strong>{ds.deskCount}개</strong></td>
                  <th style={TH}>레이아웃 모드</th>
                  <td style={TD}>{ds.layoutMode === 'standard' ? '표준형' : '분할형'}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={H3}>오른쪽 안내 패널</h3>
            <table style={TBL}>
              <tbody>
                <tr>
                  <th style={{ ...TH, width: '28%' }}>안내 문구</th>
                  <td style={{ ...TD, whiteSpace: 'pre-wrap' }}>{dash(ds.rightPanelText)}</td>
                </tr>
                {ds.rightPanelImageUrl && (
                  <tr>
                    <th style={TH}>이미지 URL</th>
                    <td style={TD}>{ds.rightPanelImageUrl}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );

      case 'ticketSettings': {
        const tickets = [
          { label: '채혈 발권', key: 'bloodTicket', data: ts.bloodTicket },
          { label: '접수 발권', key: 'receptionTicket', data: ts.receptionTicket },
          { label: '미수납 발권', key: 'unpaidTicket', data: ts.unpaidTicket },
          { label: '미처방 발권', key: 'noPrescriptionTicket', data: ts.noPrescriptionTicket },
          { label: '미진료 발권', key: 'noPatientTicket', data: ts.noPatientTicket },
        ];
        return (
          <div key={sectionKey} className="print-section">
            <h2 style={H2}>용지 / 발권 설정</h2>

            <h3 style={H3}>전역 설정</h3>
            <table style={TBL}>
              <tbody>
                <tr>
                  <th style={{ ...TH, width: '25%' }}>2헤드 컬러 모드</th>
                  <td style={TD}>모드 {ts.twoHeadColorMode || '—'}</td>
                  <th style={{ ...TH, width: '25%' }}>용지 배경색</th>
                  <td style={TD}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, background: ts.paperBackgroundColor || '#fff', border: '1px solid #aaa', marginRight: 5, verticalAlign: 'middle' }} />
                    {dash(ts.paperBackgroundColor)}
                  </td>
                </tr>
                <tr>
                  <th style={TH}>포인트 색상</th>
                  <td style={TD}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, background: ts.pointColor || '#ccc', border: '1px solid #aaa', marginRight: 5, verticalAlign: 'middle' }} />
                    {dash(ts.pointColor)}
                  </td>
                  <th style={TH}>다국어 지원</th>
                  <td style={TD}>{yesNo(ts.multiLanguage)}</td>
                </tr>
                <tr>
                  <th style={TH}>병원 로고 표시</th>
                  <td style={TD}>{yesNo(ts.showHospitalLogo)}</td>
                  <th style={TH}>발권 일시 표시</th>
                  <td style={TD}>{yesNo(ts.showPrintDateTime)}</td>
                </tr>
                <tr>
                  <th style={TH}>대기 시간 표시</th>
                  <td style={TD}>{yesNo(ts.showEstimatedWaitTime)}</td>
                  <th style={TH}>대기 인원 표시</th>
                  <td style={TD}>{yesNo(ts.showWaitingCount)}</td>
                </tr>
                <tr>
                  <th style={TH}>용지 부족 경고 (장)</th>
                  <td style={TD}>{ts.paperEmptyWarningThreshold ?? '—'}</td>
                  <th style={TH}>병원 프로필명</th>
                  <td style={TD}>{dash(ts.hospitalProfileName)}</td>
                </tr>
                {ts.topLineText && (
                  <tr>
                    <th style={TH}>최상단 문구</th>
                    <td style={TD} colSpan={3}>{ts.topLineText}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <h3 style={H3}>티켓 유형별 설정</h3>
            <table style={TBL}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '15%' }}>티켓 유형</th>
                  <th style={{ ...TH, width: '8%', textAlign: 'center' }}>사용</th>
                  <th style={TH}>헤더 문구 (한국어)</th>
                  <th style={TH}>헤더 문구 (영어)</th>
                  <th style={TH}>안내 문구 (한국어)</th>
                  <th style={TH}>포인트 색</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.key} style={{ opacity: t.data?.enabled ? 1 : 0.5 }}>
                    <td style={{ ...TD, fontWeight: 600 }}>{t.label}</td>
                    <td style={{ ...TD, textAlign: 'center' }}>{t.data?.enabled ? '✔' : '✘'}</td>
                    <td style={TD}>{dash(t.data?.headerTextKr)}</td>
                    <td style={TD}>{dash(t.data?.headerTextEn)}</td>
                    <td style={{ ...TD, whiteSpace: 'pre-wrap' }}>{dash(t.data?.noticeTextKr)}</td>
                    <td style={TD}>
                      {t.data?.pointColor && (
                        <span style={{ display: 'inline-block', width: 12, height: 12, background: t.data.pointColor, border: '1px solid #aaa', marginRight: 4, verticalAlign: 'middle' }} />
                      )}
                      {dash(t.data?.pointColor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case 'components':
        return (
          <div key={sectionKey} className="print-section">
            <h2 style={H2}>구성품 / IP 정보</h2>

            <h3 style={H3}>장비 목록</h3>
            <table style={TBL}>
              <thead>
                <tr>
                  {['분류','제품명','모델','No.','수량','IP 주소','MAC 주소','S/W 버전','F/W 버전','H/W 버전'].map(h => (
                    <th key={h} style={{ ...TH, fontSize: '8.5pt', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {instancesList.map((c, i) => (
                  <tr key={`${c.id}-${i}`} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ ...TD, fontSize: '8.5pt' }}>{c.category}</td>
                    <td style={{ ...TD, fontSize: '8.5pt', fontWeight: 600 }}>{c.productName}</td>
                    <td style={{ ...TD, fontSize: '8.5pt' }}>{c.model}</td>
                    <td style={{ ...TD, fontSize: '8.5pt', textAlign: 'center' }}>#{c.idx}</td>
                    <td style={{ ...TD, fontSize: '8.5pt', textAlign: 'center' }}>{c.quantity ?? 1}</td>
                    <td style={{ ...TD, fontSize: '8.5pt', fontFamily: 'monospace' }}>{c.ip}</td>
                    <td style={{ ...TD, fontSize: '8.5pt', fontFamily: 'monospace' }}>{c.mac}</td>
                    <td style={{ ...TD, fontSize: '8.5pt' }}>{c.sw}</td>
                    <td style={{ ...TD, fontSize: '8.5pt' }}>{c.fw}</td>
                    <td style={{ ...TD, fontSize: '8.5pt' }}>{c.hw}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={H3}>전원 / LAN 요구사항 요약</h3>
            <table style={TBL}>
              <tbody>
                <tr>
                  <th style={{ ...TH, width: '30%' }}>총 필요 전원 콘센트</th>
                  <td style={TD}><strong>{project.placedItems.reduce((s, pi) => s + ((products.find(p => p.id === pi.productId))?.powerRequired || 0), 0)}구</strong></td>
                  <th style={{ ...TH, width: '30%' }}>총 필요 LAN 포트</th>
                  <td style={TD}><strong>{project.placedItems.reduce((s, pi) => s + ((products.find(p => p.id === pi.productId))?.lanRequired || 0), 0)}포트</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        );

      case 'facilityDrawing': {
        const totalPowerReq = project.placedItems.reduce((s, pi) => s + ((products.find(p => p.id === pi.productId))?.powerRequired || 0), 0);
        const totalLanReq = project.placedItems.reduce((s, pi) => s + ((products.find(p => p.id === pi.productId))?.lanRequired || 0), 0);
        const powerMarks = project.layoutMarks?.filter(m => m.type === 'power') || [];
        const lanMarks = project.layoutMarks?.filter(m => m.type === 'lan') || [];
        return (
          <div key={sectionKey} className="print-section">
            <h2 style={H2}>시설팀 전달 자료 (도면 / 인프라)</h2>

            <h3 style={H3}>전원 / LAN 요구사항</h3>
            <table style={TBL}>
              <tbody>
                <tr>
                  <th style={{ ...TH, width: '28%' }}>필요 전원 콘센트</th>
                  <td style={TD}><strong>{totalPowerReq}구</strong></td>
                  <th style={{ ...TH, width: '28%' }}>배치 마킹된 콘센트</th>
                  <td style={TD}>{powerMarks.length}개{totalPowerReq > powerMarks.length ? <span style={{ color: 'red', marginLeft: 6 }}>⚠ {totalPowerReq - powerMarks.length}개 부족</span> : <span style={{ color: 'green', marginLeft: 6 }}>✔ 충족</span>}</td>
                </tr>
                <tr>
                  <th style={TH}>필요 LAN 포트</th>
                  <td style={TD}><strong>{totalLanReq}포트</strong></td>
                  <th style={TH}>배치 마킹된 LAN</th>
                  <td style={TD}>{lanMarks.length}개{totalLanReq > lanMarks.length ? <span style={{ color: 'red', marginLeft: 6 }}>⚠ {totalLanReq - lanMarks.length}개 부족</span> : <span style={{ color: 'green', marginLeft: 6 }}>✔ 충족</span>}</td>
                </tr>
              </tbody>
            </table>

            {(powerMarks.length > 0 || lanMarks.length > 0) && (
              <>
                <h3 style={H3}>마킹된 위치 상세</h3>
                <table style={TBL}>
                  <thead>
                    <tr>
                      <th style={{ ...TH, width: '10%' }}>구분</th>
                      <th style={{ ...TH, width: '8%', textAlign: 'center' }}>No.</th>
                      <th style={TH}>메모</th>
                      <th style={TH}>사진 링크</th>
                    </tr>
                  </thead>
                  <tbody>
                    {powerMarks.map((m, i) => (
                      <tr key={m.id}>
                        <td style={{ ...TD, fontWeight: 600, color: '#c2410c' }}>콘센트</td>
                        <td style={{ ...TD, textAlign: 'center' }}>P{i + 1}</td>
                        <td style={TD}>{dash(m.note)}</td>
                        <td style={TD}>{m.driveLink ? <span style={{ fontSize: '8pt', color: '#2563eb' }}>{m.driveLink}</span> : '—'}</td>
                      </tr>
                    ))}
                    {lanMarks.map((m, i) => (
                      <tr key={m.id}>
                        <td style={{ ...TD, fontWeight: 600, color: '#6d28d9' }}>LAN</td>
                        <td style={{ ...TD, textAlign: 'center' }}>L{i + 1}</td>
                        <td style={TD}>{dash(m.note)}</td>
                        <td style={TD}>{m.driveLink ? <span style={{ fontSize: '8pt', color: '#2563eb' }}>{m.driveLink}</span> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <h3 style={H3}>도면 이미지</h3>
            {project.floorPlanDataUrl
              ? <img src={project.floorPlanDataUrl} style={{ maxWidth: '100%', border: '1px solid #ccc' }} alt="배치 도면" />
              : <p style={{ color: '#888', fontStyle: 'italic' }}>도면 이미지가 등록되지 않았습니다.</p>}
          </div>
        );
      }

      case 'phase1Checklist': {
        return (
          <div key={sectionKey} className="print-section">
            <h2 style={H2}>Phase 1 체크리스트 (사전 준비)</h2>
            <table style={TBL}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '5%', textAlign: 'center' }}>완료</th>
                  <th style={{ ...TH, width: '35%' }}>항목</th>
                  <th style={TH}>확인 날짜</th>
                  <th style={TH}>메모</th>
                  <th style={TH}>사진 링크</th>
                </tr>
              </thead>
              <tbody>
                {project.phase1Items.map((item, i) => (
                  <tr key={item.id} style={{ background: item.done ? '#f0fdf4' : (i % 2 === 0 ? '#fff' : '#f8fafc') }}>
                    <td style={{ ...TD, textAlign: 'center', fontSize: '12pt' }}>{item.done ? '☑' : '☐'}</td>
                    <td style={{ ...TD, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? '#6b7280' : '#111' }}>{item.title}</td>
                    <td style={TD}>{item.subform?.date || '—'}</td>
                    <td style={{ ...TD, whiteSpace: 'pre-wrap' }}>{dash(item.note)}</td>
                    <td style={TD}>{item.driveLink ? <span style={{ fontSize: '8pt', color: '#2563eb' }}>{item.driveLink}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case 'phase2Checklist': {
        return (
          <div key={sectionKey} className="print-section">
            <h2 style={H2}>Phase 2 체크리스트 (설치 준비)</h2>
            <table style={TBL}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '5%', textAlign: 'center' }}>완료</th>
                  <th style={{ ...TH, width: '35%' }}>항목</th>
                  <th style={TH}>확인 날짜</th>
                  <th style={TH}>메모</th>
                  <th style={TH}>사진 링크</th>
                </tr>
              </thead>
              <tbody>
                {project.phase2Items.map((item, i) => (
                  <tr key={item.id} style={{ background: item.done ? '#f0fdf4' : (i % 2 === 0 ? '#fff' : '#f8fafc') }}>
                    <td style={{ ...TD, textAlign: 'center', fontSize: '12pt' }}>{item.done ? '☑' : '☐'}</td>
                    <td style={{ ...TD, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? '#6b7280' : '#111' }}>{item.title}</td>
                    <td style={TD}>{item.subform?.date || '—'}</td>
                    <td style={{ ...TD, whiteSpace: 'pre-wrap' }}>{dash(item.note)}</td>
                    <td style={TD}>{item.driveLink ? <span style={{ fontSize: '8pt', color: '#2563eb' }}>{item.driveLink}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case 'contacts':
        return (
          <div key={sectionKey} className="print-section">
            <h2 style={H2}>담당자 연락처</h2>
            <table style={TBL}>
              <thead>
                <tr>
                  {['부서/소속','이름','직함','전화번호','이메일','비고'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {project.contacts.length === 0
                  ? <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', color: '#888', fontStyle: 'italic' }}>등록된 연락처가 없습니다.</td></tr>
                  : project.contacts.map((c, i) => (
                    <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ ...TD, fontWeight: 600 }}>{c.department}</td>
                      <td style={TD}>{c.name}</td>
                      <td style={TD}>{(c as any).title || '—'}</td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>{c.phone}</td>
                      <td style={TD}>{c.email}</td>
                      <td style={TD}>{c.note}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        );

      case 'assetLinks':
        return (
          <div key={sectionKey} className="print-section">
            <h2 style={H2}>자산 링크 / 참고 자료</h2>
            {assets.length === 0
              ? <p style={{ color: '#888', fontStyle: 'italic' }}>등록된 자산 링크가 없습니다.</p>
              : (
                <table style={TBL}>
                  <thead>
                    <tr>
                      <th style={{ ...TH, width: '18%' }}>분류</th>
                      <th style={{ ...TH, width: '30%' }}>제목</th>
                      <th style={TH}>URL</th>
                      <th style={TH}>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a, i) => (
                      <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                        <td style={TD}><span style={{ fontWeight: 600 }}>{a.assetCategory}</span></td>
                        <td style={{ ...TD, fontWeight: 500 }}>{a.title}</td>
                        <td style={{ ...TD, fontSize: '8pt', wordBreak: 'break-all', color: '#2563eb' }}>{a.url}</td>
                        <td style={TD}>{a.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="summary-page-root" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <Download size={24} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>요약서 / 출력 관리</h2>
      </div>

      {/* ─── 본사 전송 (Google Drive) ─────────────────────────────── */}
      <div className="no-print card" style={{ background: '#f0fdf4', border: '2px solid #86efac' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 className="section-title" style={{ color: '#166534', margin: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Upload size={17} /> 본사 전송 (Google Drive)
          </h3>
          {currentDealer?.driveFolderUrl ? (
            <a href={currentDealer.driveFolderUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '0.75rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'underline' }}>
              <FolderOpen size={13} /> 드라이브 폴더 열기
            </a>
          ) : null}
        </div>

        <p style={{ fontSize: '0.8125rem', color: '#15803d', marginBottom: '1rem', lineHeight: 1.6 }}>
          작성한 시방서 전체를 <strong>JSON 파일로 다운로드</strong>하고, 대리점 구글 드라이브 폴더를 자동으로 열어줍니다.<br />
          다운로드된 파일을 드라이브 폴더에 드래그하면 본사 전송이 완료됩니다.
        </p>

        {/* 파일명 미리보기 */}
        {(() => {
          const today = new Date();
          const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
          const filename = `${dateStr}_${project.salesProfile.dealerName || '대리점'}_${project.hospitalProfile.hospitalName || '병원'}_시방서.json`;
          return (
            <div style={{ background: '#dcfce7', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: '#166534', marginBottom: '1rem', fontFamily: 'monospace' }}>
              📄 {filename}
            </div>
          );
        })()}

        {/* 상태 메시지 */}
        {hqSentStatus === 'success' && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#166534', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <Check size={16} style={{ marginTop: '1px', flexShrink: 0 }} />
            <span>
              <strong>파일이 다운로드됐습니다!</strong><br />
              드라이브 폴더가 새 탭에 열렸습니다. 다운로드된 JSON 파일을 폴더에 드래그하여 업로드하세요.
            </span>
          </div>
        )}
        {hqSentStatus === 'no_drive' && (
          <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#713f12', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <Info size={16} style={{ marginTop: '1px', flexShrink: 0 }} />
            <span>
              파일은 다운로드됐습니다. <br />
              <strong>대리점 드라이브 폴더 URL이 미설정</strong>되어 폴더를 자동으로 열 수 없습니다.<br />
              Step 00 영업 정보 → 관리자에게 드라이브 폴더 URL 등록을 요청하세요.
            </span>
          </div>
        )}

        {/* 대리점 드라이브 폴더 상태 표시 */}
        {(() => {
          const hasDrive = !!currentDealer?.driveFolderUrl;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>
              <FolderOpen size={14} style={{ color: hasDrive ? '#16a34a' : '#94a3b8' }} />
              <span style={{ color: '#64748b' }}>대리점 드라이브 폴더:</span>
              {hasDrive ? (
                <a href={currentDealer!.driveFolderUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#2563eb', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  연결됨 <ExternalLink size={11} />
                </a>
              ) : (
                <span style={{ color: '#ef4444' }}>미설정 (관리자에게 드라이브 폴더 URL 등록 요청)</span>
              )}
            </div>
          );
        })()}

        <button
          className="btn btn-primary"
          onClick={handleSendToHQ}
          style={{ background: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
        >
          <Upload size={16} />
          본사 전송 — 시방서 다운로드 + 드라이브 열기
        </button>
      </div>

      {/* Data Export */}
      <div className="no-print card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>데이터 내보내기 (기타)</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => exportProjectAsHtml(project, assets)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Code size={16} /> HTML 자산 패키지
          </button>
          <button className="btn btn-outline" onClick={() => exportProjectAsJson(project, 'summary')} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <FileJson size={16} /> Summary JSON
          </button>
          <button className="btn btn-outline" onClick={() => exportProjectAsJson(project, 'full')} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <FileJson size={16} /> Full Backup JSON
          </button>
        </div>
      </div>

      {/* Team Output Sets */}
      <div className="no-print card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="section-title">
            <Users size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
            팀별 출력 세트
          </h3>
          <button className="btn btn-outline btn-sm" onClick={() => setShowNewTeamForm(!showNewTeamForm)}>
            <Plus size={14} /> 팀 추가
          </button>
        </div>

        {showNewTeamForm && (
          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder="팀명 (예: 전산팀, CS팀, 개발팀)"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTeamOutputSet()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={addTeamOutputSet}>추가</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowNewTeamForm(false); setNewTeamName(''); }}>취소</button>
          </div>
        )}

        {teamOutputSets.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            팀을 추가하고 각 팀에 전달할 섹션을 선택하세요. 팀별로 필요한 정보만 포함하여 출력할 수 있습니다.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {teamOutputSets.map(team => (
            <div key={team.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
              {/* Team header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: expandedTeamId === team.id ? '1px solid #e2e8f0' : 'none' }}>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                  onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                >
                  {expandedTeamId === team.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {editingTeamId === team.id ? (
                  <>
                    <input
                      className="input"
                      value={editTeamName}
                      onChange={(e) => setEditTeamName(e.target.value)}
                      style={{ flex: 1, fontSize: '0.875rem' }}
                      onKeyDown={(e) => e.key === 'Enter' && saveTeamName(team.id)}
                      autoFocus
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => saveTeamName(team.id)}>
                      <Check size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9375rem' }}>{team.teamName}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {team.selectedSections.length}개 섹션 선택됨
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setEditingTeamId(team.id); setEditTeamName(team.teamName); }}
                      title="팀명 수정"
                    >
                      <Edit2 size={14} />
                    </button>
                  </>
                )}

                <button className="btn btn-outline btn-sm" onClick={() => printForTeam(team.id)} style={{ flexShrink: 0 }}>
                  <Printer size={14} /> 출력
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => removeTeamOutputSet(team.id)}>
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Section selector */}
              {expandedTeamId === team.id && (
                <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                  {SECTION_OPTIONS.map(opt => {
                    const isSelected = team.selectedSections.includes(opt.key);
                    return (
                      <div
                        key={opt.key}
                        role="checkbox"
                        aria-checked={isSelected}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.5rem',
                          padding: '0.625rem 0.75rem',
                          border: `1.5px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          background: isSelected ? '#eff6ff' : '#fff',
                          transition: 'all 0.15s',
                          userSelect: 'none',
                        }}
                        onClick={() => toggleSection(team.id, opt.key)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          onClick={e => e.stopPropagation()}
                          style={{ marginTop: '2px', accentColor: '#3b82f6', pointerEvents: 'none' }}
                        />
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{opt.label}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.125rem' }}>{opt.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Asset links */}
      <div className="no-print card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="section-title">
            <LinkIcon size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
            프로젝트 연동 자산 (링크)
          </h3>
          <button className="btn btn-outline btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={14} /> 링크 추가
          </button>
        </div>

        {showAddForm && (
          <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
            <div className="form-grid" style={{ gap: '0.5rem' }}>
              <div className="form-group">
                <label className="label">분류 카테고리</label>
                <input className="input" placeholder="예: 설치전 사진" value={newAsset.assetCategory} onChange={e => setNewAsset({...newAsset, assetCategory: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">제목</label>
                <input className="input" placeholder="링크 제목" value={newAsset.title} onChange={e => setNewAsset({...newAsset, title: e.target.value})} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">URL 주소</label>
                <input className="input" placeholder="https://" value={newAsset.url} onChange={e => setNewAsset({...newAsset, url: e.target.value})} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">설명</label>
                <input className="input" placeholder="간략한 설명" value={newAsset.description} onChange={e => setNewAsset({...newAsset, description: e.target.value})} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: '1 / -1', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={newAsset.isSharedAsset} onChange={e => setNewAsset({...newAsset, isSharedAsset: e.target.checked})} />
                공통 자산 (타 지점 공통 템플릿/교육자료)
              </label>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary btn-sm" onClick={handleAddAsset}>저장</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}>취소</button>
            </div>
          </div>
        )}

        {assets.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>연동된 자산 링크가 없습니다.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>분류</th>
                <th style={{ padding: '0.5rem' }}>제목</th>
                <th style={{ padding: '0.5rem' }}>설명</th>
                <th style={{ padding: '0.5rem' }}>공통</th>
                <th style={{ padding: '0.5rem', width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '0.5rem' }}><span className="badge badge-gray">{a.assetCategory}</span></td>
                  <td style={{ padding: '0.5rem', fontWeight: 500 }}>
                    <a href={a.url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>{a.title}</a>
                  </td>
                  <td style={{ padding: '0.5rem', color: '#64748b' }}>{a.description}</td>
                  <td style={{ padding: '0.5rem' }}>{a.isSharedAsset ? 'O' : '-'}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', padding: '0.25rem' }} onClick={() => handleRemoveAsset(a.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PRINT AREA */}
      <div className="print-only">
        {printingTeam && (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1>{hp.hospitalName} — {printingTeam.teamName} 전달 자료</h1>
            <p style={{ color: '#666' }}>생성일시: {new Date().toLocaleString()}</p>
          </div>
        )}
        {printSections.map(key => renderPrintSection(key))}
      </div>

      <style>{`
        .print-only { display: none; }
        @media print {
          /* ══ 1. 색상 인쇄 강제 ══ */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* ══ 2. 앱 레이아웃의 h-screen / overflow 제거 (핵심) ══
             App.tsx: .flex.flex-col.h-screen
             ProjectWorkspace: height:calc(100vh-56px), overflow-y-auto
             이것들이 인쇄 영역을 뷰포트 높이로 잘라버리는 주범
          */
          html, body {
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          #root,
          #root > *,
          #root > * > * {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }
          /* flex-col h-screen → block */
          .flex { display: block !important; }
          .flex-1 { height: auto !important; overflow: visible !important; }
          .overflow-y-auto { overflow: visible !important; height: auto !important; }
          .h-screen { height: auto !important; }

          /* ══ 3. 앱 특정 컨테이너 height/overflow 직접 해제 ══ */
          .workspace-outer {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            width: 100% !important;
          }
          .workspace-content {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            width: 100% !important;
          }

          /* ══ 4. 화면 UI 모두 숨기기 ══ */
          .no-print { display: none !important; }
          header, nav, aside, .step-sidebar, [class*="sidebar"], [class*="header"] { display: none !important; }

          /* ══ 4. 인쇄 영역 표시 ══ */
          .print-only { display: block !important; }

          /* ══ 5. 인쇄 컨테이너 레이아웃 ══ */
          .summary-page-root {
            display: block !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
            width: 100% !important;
          }

          /* ══ 6. 섹션별 페이지 나눔 (섹션 내부는 자유롭게 여러 페이지) ══ */
          .print-section {
            display: block !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            padding-bottom: 0 !important;
            margin-bottom: 0 !important;
          }
          .print-section:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          /* ══ 7. 테이블 행 페이지 잘림 방지 ══ */
          table { width: 100% !important; border-collapse: collapse !important; }
          thead { display: table-header-group !important; }
          tbody tr { page-break-inside: avoid !important; break-inside: avoid !important; }

          /* ══ 8. 제목 고아 방지 ══ */
          h2, h3 { page-break-after: avoid !important; break-after: avoid !important; }

          /* ══ 9. 이미지 ══ */
          img { max-width: 100% !important; page-break-inside: avoid !important; break-inside: avoid !important; }

          /* ══ 10. A4 페이지 ══ */
          @page { size: A4 portrait; margin: 15mm; }
        }
      `}</style>
    </div>
  );
}
