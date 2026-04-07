import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2,
  User,
  Briefcase,
  CheckCircle2,
  Plus,
  Info,
  Trash2,
  FolderOpen,
  ExternalLink,
  Edit2,
  Check,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { HospitalProfile, SalesProfile, Dealer } from '../types';

interface DealerInlineForm {
  name: string;
  region: string;
  contact: string;
  phone: string;
  email: string;
  driveFolderUrl: string;
}

const HOSPITAL_TYPES = ['상급종합병원', '종합병원', '병원', '의원', '기타'] as const;

const REGION_OPTIONS = ['수도권', '충청도', '경상남도', '경상북도', '전라남도', '제주도'] as const;

const EMPTY_DEALER_FORM: DealerInlineForm = {
  name: '',
  region: '',
  contact: '',
  phone: '',
  email: '',
  driveFolderUrl: '',
};

export default function Step00HospitalInfo() {
  const getCurrentProject = useStore((s) => s.getCurrentProject);
  const updateProject = useStore((s) => s.updateProject);
  const dealers = useStore((s) => s.dealers);
  const addDealer = useStore((s) => s.addDealer);
  const deleteDealer = useStore((s) => s.deleteDealer);
  const updateDealer = useStore((s) => s.updateDealer);
  const user = useStore((s) => s.user);

  const project = getCurrentProject();

  // Local form state
  const [hospital, setHospital] = useState<HospitalProfile>({
    hospitalName: '',
    hospitalType: '의원',
    region: '',
    address: '',
    dailyPatientCount: 0,
    contactName: '',
    contactTitle: '',
    contactPhone: '',
    contactEmail: '',
  });

  const [sales, setSales] = useState<SalesProfile>({
    dealerId: '',
    dealerName: '',
    salesRepName: '',
    salesRepEmail: '',
    salesRepPhone: '',
    sticky: false,
    createdDate: '',
    firstMeetingDate: '',
    memo: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showNewDealer, setShowNewDealer] = useState(false);
  const [newDealer, setNewDealer] = useState<DealerInlineForm>(EMPTY_DEALER_FORM);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drive folder URL editing state
  const [editingDriveUrl, setEditingDriveUrl] = useState(false);
  const [driveFolderInput, setDriveFolderInput] = useState('');

  // Sync from store on mount
  useEffect(() => {
    if (project) {
      setHospital({ ...project.hospitalProfile });
      setSales({ ...project.salesProfile });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  // Auto-save debounced
  const saveToStore = useCallback(() => {
    if (!project) return;
    updateProject(project.id, {
      hospitalProfile: { ...hospital },
      salesProfile: { ...sales },
    });
  }, [project, hospital, sales, updateProject]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToStore, 600);
  }, [saveToStore]);

  // Save on every change
  useEffect(() => {
    scheduleSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [hospital, sales, scheduleSave]);

  // Helpers
  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const isInvalid = (field: string, value: string) =>
    touched[field] && !value.trim();

  const inputClass = (field: string, value: string) =>
    `input${isInvalid(field, value) ? ' input-error' : ''}`;

  const isSaved =
    hospital.hospitalName.trim() !== '' && hospital.contactPhone.trim() !== '';

  // Hospital field updater
  const updateH = <K extends keyof HospitalProfile>(
    key: K,
    value: HospitalProfile[K],
  ) => {
    setHospital((prev) => ({ ...prev, [key]: value }));
  };

  // Sales field updater
  const updateS = <K extends keyof SalesProfile>(
    key: K,
    value: SalesProfile[K],
  ) => {
    setSales((prev) => ({ ...prev, [key]: value }));
  };

  // Dealer selection
  const handleDealerChange = (value: string) => {
    if (value === '__new__') {
      setShowNewDealer(true);
      updateS('dealerId', '');
      updateS('dealerName', '');
      return;
    }
    setShowNewDealer(false);
    const dealer = dealers.find((d) => d.id === value);
    if (dealer) {
      updateS('dealerId', dealer.id);
      updateS('dealerName', dealer.name);
    } else {
      updateS('dealerId', '');
      updateS('dealerName', '');
    }
  };

  const handleDeleteDealer = (dealerId: string) => {
    if (!window.confirm('이 대리점을 삭제하시겠습니까?')) return;
    const inUse = useStore.getState().projects.some(
      (p) => p.salesProfile.dealerId === dealerId,
    );
    if (inUse) {
      window.alert(
        '이 대리점은 프로젝트에서 사용 중입니다. 비활성화 처리합니다.',
      );
      updateDealer(dealerId, { active: false });
    } else {
      deleteDealer(dealerId);
    }
    updateS('dealerId', '');
    updateS('dealerName', '');
  };

  const handleRegisterDealer = () => {
    if (!newDealer.name.trim()) return;
    const dealer: Dealer = {
      id: `dealer-${Date.now()}`,
      name: newDealer.name,
      region: newDealer.region,
      contact: newDealer.contact,
      phone: newDealer.phone,
      email: newDealer.email,
      driveFolderUrl: newDealer.driveFolderUrl || undefined,
    };
    addDealer(dealer);
    updateS('dealerId', dealer.id);
    updateS('dealerName', dealer.name);
    setShowNewDealer(false);
    setNewDealer(EMPTY_DEALER_FORM);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Building2 size={22} />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>병원 정보</h2>
        </div>
        {isSaved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#0d9488', fontSize: '0.8125rem', fontWeight: 500 }}>
            <CheckCircle2 size={16} />
            저장 완료
          </div>
        )}
      </div>

      {/* ─── A. 병원 기본 정보 ─────────────────────────────────── */}
      <div className="card">
        <h3 className="section-title">
          <Building2 size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          병원 기본 정보
        </h3>

        <div className="form-grid">
          {/* 병원명 */}
          <div className="form-group">
            <label className="label label-required">병원명</label>
            <input
              className={inputClass('hospitalName', hospital.hospitalName)}
              value={hospital.hospitalName}
              onChange={(e) => updateH('hospitalName', e.target.value)}
              onBlur={() => markTouched('hospitalName')}
              placeholder="병원명을 입력하세요"
            />
          </div>

          {/* 병원 유형 */}
          <div className="form-group">
            <label className="label">병원 유형</label>
            <select
              className="input"
              value={hospital.hospitalType}
              onChange={(e) => updateH('hospitalType', e.target.value as HospitalProfile['hospitalType'])}
            >
              {HOSPITAL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 지역 */}
          <div className="form-group">
            <label className="label">지역</label>
            <select
              className="input"
              value={hospital.region}
              onChange={(e) => updateH('region', e.target.value)}
            >
              <option value="">지역 선택</option>
              {REGION_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 일 채혈 건수 */}
          <div className="form-group">
            <label className="label">일 채혈 건수 (예상)</label>
            <input
              className="input"
              type="number"
              min={0}
              value={hospital.dailyPatientCount || ''}
              onChange={(e) => updateH('dailyPatientCount', Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          {/* 주소 - full width */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">병원 주소</label>
            <input
              className="input"
              value={hospital.address}
              onChange={(e) => updateH('address', e.target.value)}
              placeholder="상세 주소를 입력하세요"
            />
          </div>
        </div>
      </div>

      {/* ─── B. 병원 담당자 ──────────────────────────────────── */}
      <div className="card">
        <h3 className="section-title">
          <User size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          병원 담당자
        </h3>

        <div className="form-grid">
          {/* 담당자 성명 */}
          <div className="form-group">
            <label className="label label-required">담당자 성명</label>
            <input
              className={inputClass('contactName', hospital.contactName)}
              value={hospital.contactName}
              onChange={(e) => updateH('contactName', e.target.value)}
              onBlur={() => markTouched('contactName')}
              placeholder="담당자 이름"
            />
          </div>

          {/* 직책 / 부서 */}
          <div className="form-group">
            <label className="label">직책 / 부서</label>
            <input
              className="input"
              value={hospital.contactTitle}
              onChange={(e) => updateH('contactTitle', e.target.value)}
              placeholder="예: 진단검사의학과 팀장"
            />
          </div>

          {/* 연락처 */}
          <div className="form-group">
            <label className="label label-required">연락처</label>
            <input
              className={inputClass('contactPhone', hospital.contactPhone)}
              value={hospital.contactPhone}
              onChange={(e) => updateH('contactPhone', e.target.value)}
              onBlur={() => markTouched('contactPhone')}
              placeholder="010-0000-0000"
            />
          </div>

          {/* 이메일 */}
          <div className="form-group">
            <label className="label">이메일</label>
            <input
              className="input"
              type="email"
              value={hospital.contactEmail}
              onChange={(e) => updateH('contactEmail', e.target.value)}
              placeholder="email@hospital.co.kr"
            />
          </div>
        </div>
      </div>

      {/* ─── C. 영업 정보 ────────────────────────────────────── */}
      <div className="card">
        <h3 className="section-title">
          <Briefcase size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          영업 정보
        </h3>

        <div className="form-grid">
          {/* 대리점 선택 */}
          <div className="form-group">
            <label className="label label-required">대리점 선택</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                className={inputClass('dealerId', sales.dealerId)}
                value={showNewDealer ? '__new__' : sales.dealerId}
                onChange={(e) => handleDealerChange(e.target.value)}
                onBlur={() => markTouched('dealerId')}
                style={{ flex: 1 }}
              >
                <option value="">대리점을 선택하세요</option>
                {dealers.filter((d) => d.active !== false).map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.region})</option>
                ))}
                <option value="__new__">+ 대리점 등록</option>
              </select>
              {sales.dealerId && user?.role === 'admin' && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  title="대리점 삭제"
                  onClick={() => handleDeleteDealer(sales.dealerId)}
                  style={{ flexShrink: 0, color: '#ef4444', borderColor: '#ef4444' }}
                >
                  <Trash2 size={14} />
                  삭제
                </button>
              )}
            </div>
          </div>

          {/* 구글 드라이브 시방서 폴더 — 대리점 선택 시 표시 */}
          {sales.dealerId && (() => {
            const selectedDealer = dealers.find(d => d.id === sales.dealerId);
            if (!selectedDealer) return null;
            return (
              <div style={{ gridColumn: '1 / -1', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: '#0369a1' }}>
                    <FolderOpen size={14} />
                    구글 드라이브 시방서 폴더
                  </div>
                  {user?.role === 'admin' && !editingDriveUrl && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem' }}
                      onClick={() => { setEditingDriveUrl(true); setDriveFolderInput(selectedDealer.driveFolderUrl || ''); }}
                    >
                      <Edit2 size={12} /> 편집
                    </button>
                  )}
                </div>

                {editingDriveUrl ? (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <input
                      className="input"
                      value={driveFolderInput}
                      onChange={e => setDriveFolderInput(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                      style={{ flex: 1, fontSize: '0.8125rem' }}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => { updateDealer(sales.dealerId, { driveFolderUrl: driveFolderInput.trim() || undefined }); setEditingDriveUrl(false); }}
                    >
                      <Check size={13} /> 저장
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingDriveUrl(false)}>취소</button>
                  </div>
                ) : selectedDealer.driveFolderUrl ? (
                  <a
                    href={selectedDealer.driveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.8125rem', color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <ExternalLink size={12} />
                    {selectedDealer.driveFolderUrl}
                  </a>
                ) : (
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                    {user?.role === 'admin'
                      ? '미설정 — 편집 버튼을 눌러 드라이브 폴더 URL을 등록하세요'
                      : '미설정 — 관리자에게 드라이브 폴더 URL 등록을 요청하세요'}
                  </p>
                )}
              </div>
            );
          })()}

          {/* 영업 담당자명 */}
          <div className="form-group">
            <label className="label label-required">영업 담당자명</label>
            <input
              className={inputClass('salesRepName', sales.salesRepName)}
              value={sales.salesRepName}
              onChange={(e) => updateS('salesRepName', e.target.value)}
              onBlur={() => markTouched('salesRepName')}
              placeholder="영업 담당자 이름"
            />
          </div>

          {/* 담당자 이메일 */}
          <div className="form-group">
            <label className="label">담당자 이메일</label>
            <input
              className="input"
              type="email"
              value={sales.salesRepEmail}
              onChange={(e) => updateS('salesRepEmail', e.target.value)}
              placeholder="sales@dealer.co.kr"
            />
          </div>

          {/* 담당자 전화번호 */}
          <div className="form-group">
            <label className="label">담당자 전화번호</label>
            <input
              className="input"
              value={sales.salesRepPhone}
              onChange={(e) => updateS('salesRepPhone', e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>

          {/* 영업 담당자 정보 고정 toggle */}
          <div className="form-group">
            <label className="label">영업 담당자 정보 고정</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <div
                className={`toggle-track${sales.sticky ? ' active' : ''}`}
                onClick={() => updateS('sticky', !sales.sticky)}
              >
                <div className="toggle-knob" />
              </div>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                {sales.sticky ? '다음 프로젝트에도 동일 정보 사용' : '비활성'}
              </span>
            </div>
          </div>

          {/* 작성일 */}
          <div className="form-group">
            <label className="label">작성일</label>
            <input
              className="input"
              type="date"
              value={sales.createdDate}
              onChange={(e) => updateS('createdDate', e.target.value)}
            />
          </div>

          {/* 첫 미팅 날짜 */}
          <div className="form-group">
            <label className="label">첫 미팅 날짜</label>
            <input
              className="input"
              type="date"
              value={sales.firstMeetingDate}
              onChange={(e) => updateS('firstMeetingDate', e.target.value)}
            />
          </div>

          {/* empty cell for alignment */}
          <div />

          {/* 메모 - full width */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">메모 / 특이사항</label>
            <textarea
              className="input"
              rows={3}
              value={sales.memo}
              onChange={(e) => updateS('memo', e.target.value)}
              placeholder="특이사항이나 참고할 내용을 입력하세요"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Inline new dealer form */}
        {showNewDealer && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Plus size={16} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>새 대리점 등록</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="label label-required">대리점명</label>
                <input
                  className="input"
                  value={newDealer.name}
                  onChange={(e) => setNewDealer((p) => ({ ...p, name: e.target.value }))}
                  placeholder="대리점명"
                />
              </div>
              <div className="form-group">
                <label className="label">지역</label>
                <input
                  className="input"
                  value={newDealer.region}
                  onChange={(e) => setNewDealer((p) => ({ ...p, region: e.target.value }))}
                  placeholder="지역"
                />
              </div>
              <div className="form-group">
                <label className="label">담당자명</label>
                <input
                  className="input"
                  value={newDealer.contact}
                  onChange={(e) => setNewDealer((p) => ({ ...p, contact: e.target.value }))}
                  placeholder="담당자명"
                />
              </div>
              <div className="form-group">
                <label className="label">전화번호</label>
                <input
                  className="input"
                  value={newDealer.phone}
                  onChange={(e) => setNewDealer((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="전화번호"
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">이메일</label>
                <input
                  className="input"
                  value={newDealer.email}
                  onChange={(e) => setNewDealer((p) => ({ ...p, email: e.target.value }))}
                  placeholder="이메일"
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <FolderOpen size={13} /> 구글 드라이브 시방서 폴더 URL
                </label>
                <input
                  className="input"
                  value={newDealer.driveFolderUrl}
                  onChange={(e) => setNewDealer((p) => ({ ...p, driveFolderUrl: e.target.value }))}
                  placeholder="https://drive.google.com/drive/folders/..."
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn btn-primary btn-sm" onClick={handleRegisterDealer}>
                등록
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setShowNewDealer(false);
                  setNewDealer(EMPTY_DEALER_FORM);
                }}
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Validation info */}
      {!isSaved && (
        <div className="warning-box">
          <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>병원명과 연락처는 필수 입력 항목입니다. 모든 필수 항목을 입력하면 자동으로 저장됩니다.</span>
        </div>
      )}
    </div>
  );
}
