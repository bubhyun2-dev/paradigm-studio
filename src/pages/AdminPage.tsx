import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Users,
  Link2,
  SlidersHorizontal,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ExternalLink,
  PackageOpen,
  BarChart3,
  UploadCloud,
  Shield,
  Globe,
  FolderOpen,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Dealer, EducationLink, AppSettings } from '../types';

const TABS = [
  { key: 'dealers',   label: '대리점 관리',  icon: Users },
  { key: 'accounts',  label: '계정 관리',    icon: Shield },
  { key: 'education', label: '교육 링크',    icon: Link2 },
  { key: 'appsettings', label: '앱 설정',   icon: Globe },
  { key: 'general',   label: '기본 설정',   icon: SlidersHorizontal },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const emptyDealer = (): Dealer => ({
  id: `dealer-${Date.now()}`,
  name: '', region: '', contact: '', phone: '', email: '',
  driveFolderUrl: '', accessCode: '',
});

const emptyLink = (): EducationLink => ({
  id: `edu-${Date.now()}`,
  title: '', url: '', category: '',
});

/* ================================================================
   AdminPage — 메인
   ================================================================ */
export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('dealers');

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={22} /> 관리자 설정
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/hq-dashboard')}>
            <BarChart3 size={15} /> 본사 관리 센터
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/templates')}>
            <UploadCloud size={15} /> 마스터 템플릿
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/products')}>
            <PackageOpen size={15} /> 제품 CMS
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className={`tab-item${activeTab === t.key ? ' active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon size={14} /> {t.label}
              </span>
            </div>
          );
        })}
      </div>

      {activeTab === 'dealers'     && <DealerTab />}
      {activeTab === 'accounts'    && <AccountsTab />}
      {activeTab === 'education'   && <EducationTab />}
      {activeTab === 'appsettings' && <AppSettingsTab />}
      {activeTab === 'general'     && <GeneralTab />}
    </div>
  );
}

/* ================================================================
   Tab 1 : 대리점 관리 (driveFolder + accessCode 포함)
   ================================================================ */
function DealerTab() {
  const dealers = useStore((s) => s.dealers);
  const addDealer = useStore((s) => s.addDealer);
  const updateDealer = useStore((s) => s.updateDealer);
  const deleteDealer = useStore((s) => s.deleteDealer);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Dealer>(emptyDealer());
  const [showCode, setShowCode] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const startAdd = () => { setEditingId(null); setForm(emptyDealer()); setShowForm(true); };
  const startEdit = (d: Dealer) => { setEditingId(d.id); setForm({ ...d }); setShowForm(true); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) updateDealer(editingId, form);
    else addDealer(form);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('이 대리점을 삭제하시겠습니까?')) deleteDealer(id);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const generateCode = () => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    setForm((f) => ({ ...f, accessCode: code }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>대리점 관리</h2>
          <button className="btn btn-primary btn-sm" onClick={startAdd}>
            <Plus size={14} /> 대리점 추가
          </button>
        </div>

        {/* 폼 */}
        {showForm && (
          <div className="card" style={{ marginBottom: '1rem', background: '#f8fafc' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              {editingId ? '대리점 수정' : '신규 대리점 추가'}
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="label label-required">대리점명</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">지역</label>
                <input className="input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">담당자</label>
                <input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">전화번호</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">이메일</label>
                <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              {/* 접근 코드 */}
              <div className="form-group">
                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={13} /> 접근 코드 (로그인 PIN)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    className="input"
                    value={form.accessCode || ''}
                    onChange={(e) => setForm({ ...form, accessCode: e.target.value })}
                    placeholder="대리점 전용 코드"
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-outline btn-sm" onClick={generateCode} title="랜덤 생성">
                    자동생성
                  </button>
                </div>
              </div>
              {/* 드라이브 폴더 */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FolderOpen size={13} /> 구글 드라이브 시방서 폴더 URL
                </label>
                <input
                  className="input"
                  value={form.driveFolderUrl || ''}
                  onChange={(e) => setForm({ ...form, driveFolderUrl: e.target.value })}
                  placeholder="https://drive.google.com/drive/folders/..."
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave}><Save size={13} /> 저장</button>
              <button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}><X size={13} /> 취소</button>
            </div>
          </div>
        )}

        {/* 테이블 */}
        {dealers.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>등록된 대리점이 없습니다.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  {['대리점명', '지역', '담당자', '전화번호', '접근 코드', '드라이브', '액션'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dealers.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>{d.name}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>{d.region || '-'}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>{d.contact || '-'}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>{d.phone || '-'}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {d.accessCode ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{
                            fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8125rem',
                            background: '#f1f5f9', padding: '2px 8px', borderRadius: 4,
                          }}>
                            {showCode[d.id] ? d.accessCode : '••••••'}
                          </span>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 4px' }}
                            onClick={() => setShowCode(p => ({ ...p, [d.id]: !p[d.id] }))}
                          >
                            {showCode[d.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 4px', color: copied === d.id ? '#10b981' : '#64748b' }}
                            onClick={() => handleCopyCode(d.accessCode!, d.id)}
                          >
                            {copied === d.id ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      ) : <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>미설정</span>}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {d.driveFolderUrl ? (
                        <a href={d.driveFolderUrl} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#2563eb', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <FolderOpen size={13} /> 열기
                        </a>
                      ) : <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>미설정</span>}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => startEdit(d)}><Pencil size={13} /> 수정</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d.id)}><Trash2 size={13} /> 삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Tab 2 : 계정 관리
   ================================================================ */
function AccountsTab() {
  const dealers = useStore((s) => s.dealers);
  const appSettings = useStore((s) => s.appSettings);
  const updateAppSettings = useStore((s) => s.updateAppSettings);
  const updateDealer = useStore((s) => s.updateDealer);

  const [newAdminPin, setNewAdminPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinMsg, setPinMsg] = useState('');
  const [editCodeId, setEditCodeId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');

  const handleChangeAdminPin = () => {
    if (!newAdminPin.trim()) { setPinMsg('새 PIN을 입력하세요.'); return; }
    if (newAdminPin !== confirmPin) { setPinMsg('PIN이 일치하지 않습니다.'); return; }
    if (newAdminPin.length < 4) { setPinMsg('PIN은 4자리 이상이어야 합니다.'); return; }
    updateAppSettings({ adminPin: newAdminPin });
    setPinMsg('✅ 관리자 PIN이 변경됐습니다.');
    setNewAdminPin(''); setConfirmPin('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* 관리자 PIN */}
      <div className="card">
        <h2 className="section-title">관리자 PIN 변경</h2>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
          현재 관리자 PIN: <strong style={{ fontFamily: 'monospace' }}>{showPin ? appSettings.adminPin : '••••'}</strong>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => setShowPin(v => !v)}>
            {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label className="label">새 PIN</label>
            <input className="input" type="password" value={newAdminPin} onChange={e => setNewAdminPin(e.target.value)} placeholder="새 PIN (4자리 이상)" />
          </div>
          <div className="form-group">
            <label className="label">새 PIN 확인</label>
            <input className="input" type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="동일하게 입력" />
          </div>
        </div>
        {pinMsg && <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem', color: pinMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{pinMsg}</p>}
        <div style={{ marginTop: '1rem' }}>
          <button className="btn btn-primary btn-sm" onClick={handleChangeAdminPin}><Save size={13} /> PIN 변경</button>
        </div>
      </div>

      {/* 대리점 접근 코드 관리 */}
      <div className="card">
        <h2 className="section-title">대리점 접근 코드</h2>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
          각 대리점에 고유 접근 코드를 부여하세요. 대리점은 이 코드로 로그인합니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {dealers.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#fafafa' }}>
              <span style={{ fontWeight: 600, flex: 1, fontSize: '0.875rem' }}>{d.name}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', width: 80 }}>{d.region}</span>
              {editCodeId === d.id ? (
                <>
                  <input
                    className="input"
                    value={codeInput}
                    onChange={e => setCodeInput(e.target.value)}
                    style={{ width: 140, fontFamily: 'monospace', fontSize: '0.875rem' }}
                    autoFocus
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => { updateDealer(d.id, { accessCode: codeInput }); setEditCodeId(null); }}>
                    <Save size={12} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditCodeId(null)}><X size={12} /></button>
                </>
              ) : (
                <>
                  <span style={{
                    fontFamily: 'monospace', fontWeight: 600, fontSize: '0.875rem',
                    background: d.accessCode ? '#dbeafe' : '#f1f5f9',
                    color: d.accessCode ? '#1e40af' : '#94a3b8',
                    padding: '2px 10px', borderRadius: 4, minWidth: 80, textAlign: 'center'
                  }}>
                    {d.accessCode || '미설정'}
                  </span>
                  <button className="btn btn-outline btn-sm" onClick={() => { setEditCodeId(d.id); setCodeInput(d.accessCode || ''); }}>
                    <Pencil size={12} /> 수정
                  </button>
                </>
              )}
            </div>
          ))}
          {dealers.length === 0 && (
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem' }}>
              대리점이 없습니다. '대리점 관리' 탭에서 먼저 추가하세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Tab 3 : 교육 링크 관리
   ================================================================ */
function EducationTab() {
  const links = useStore((s) => s.educationLinks);
  const addLink = useStore((s) => s.addEducationLink);
  const updateLink = useStore((s) => s.updateEducationLink);
  const deleteLink = useStore((s) => s.deleteEducationLink);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EducationLink>(emptyLink());

  const startAdd = () => { setEditingId(null); setForm(emptyLink()); setShowForm(true); };
  const startEdit = (l: EducationLink) => { setEditingId(l.id); setForm({ ...l }); setShowForm(true); };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editingId) updateLink(editingId, form);
    else addLink(form);
    setShowForm(false); setEditingId(null);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>교육 링크 관리</h2>
        <button className="btn btn-primary btn-sm" onClick={startAdd}><Plus size={14} /> 링크 추가</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1rem', background: '#f8fafc' }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="label">제목</label>
              <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">카테고리</label>
              <input className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="예: 설치 교육, 운영 매뉴얼" />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">URL</label>
              <input className="input" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSave}><Save size={13} /> 저장</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}><X size={13} /> 취소</button>
          </div>
        </div>
      )}

      {links.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>등록된 교육 링크가 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {links.map((l) => (
            <div key={l.id} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>{l.title}</div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-blue">{l.category || '미분류'}</span>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>{l.url}</a>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-outline btn-sm" onClick={() => startEdit(l)}><Pencil size={13} /> 수정</button>
                <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('삭제하시겠습니까?')) deleteLink(l.id); }}><Trash2 size={13} /> 삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Tab 4 : 앱 설정 (텍스트 커스터마이징)
   ================================================================ */
function AppSettingsTab() {
  const appSettings = useStore((s) => s.appSettings);
  const updateAppSettings = useStore((s) => s.updateAppSettings);
  const [form, setForm] = useState<AppSettings>({ ...appSettings });
  const [saved, setSaved] = useState(false);

  const u = (key: keyof AppSettings, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    updateAppSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const REGION_PLACEHOLDER = '수도권, 충청도, 경상남도, 경상북도, 전라남도, 제주도';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* 앱 기본 정보 */}
      <div className="card">
        <h2 className="section-title">앱 기본 정보</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="label">앱 이름 (헤더 표시)</label>
            <input className="input" value={form.appName} onChange={e => u('appName', e.target.value)} placeholder="Paradigm Studio" />
          </div>
          <div className="form-group">
            <label className="label">회사명 (헤더 하단)</label>
            <input className="input" value={form.companyName} onChange={e => u('companyName', e.target.value)} placeholder="AT Solutions" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">본사 집계 드라이브 폴더 URL</label>
            <input className="input" value={form.hqDriveFolderUrl} onChange={e => u('hqDriveFolderUrl', e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
            {form.hqDriveFolderUrl && (
              <a href={form.hqDriveFolderUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.8125rem', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                <ExternalLink size={12} /> 폴더 열기
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 대시보드 공지 */}
      <div className="card">
        <h2 className="section-title">대시보드 공지 메시지</h2>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.75rem' }}>
          대시보드 상단에 표시되는 공지 문구입니다. 비워두면 표시되지 않습니다.
        </p>
        <textarea
          className="input"
          rows={3}
          value={form.noticeMessage}
          onChange={e => u('noticeMessage', e.target.value)}
          placeholder="예: 4월 업데이트 — Phase 2 체크리스트 항목이 추가됐습니다."
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* 지역 선택 옵션 */}
      <div className="card">
        <h2 className="section-title">지역 선택 옵션</h2>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.75rem' }}>
          병원 정보에서 지역 드롭다운에 표시될 옵션을 쉼표(,)로 구분해 입력하세요.
        </p>
        <input
          className="input"
          value={form.defaultRegions.join(', ')}
          onChange={e => setForm(f => ({ ...f, defaultRegions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
          placeholder={REGION_PLACEHOLDER}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
          {form.defaultRegions.map(r => (
            <span key={r} className="badge badge-blue">{r}</span>
          ))}
        </div>
      </div>

      {/* 스텝별 안내 문구 */}
      <div className="card">
        <h2 className="section-title">스텝별 안내 문구</h2>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
          각 스텝 상단에 표시되는 안내 메시지를 설정하세요. 비워두면 표시되지 않습니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { key: 'step00Notice' as const, label: 'Step 00 — 병원 정보' },
            { key: 'step01Notice' as const, label: 'Step 01 — 현장 조사' },
            { key: 'step02Notice' as const, label: 'Step 02 — 장비 배치' },
            { key: 'step09Notice' as const, label: 'Step 09 — Phase 1 체크리스트' },
            { key: 'step10Notice' as const, label: 'Step 10 — Phase 2 체크리스트' },
            { key: 'step11Notice' as const, label: 'Step 11 — 요약서 / 출력' },
          ].map(({ key, label }) => (
            <div key={key} className="form-group">
              <label className="label">{label}</label>
              <input
                className="input"
                value={form[key]}
                onChange={e => u(key, e.target.value)}
                placeholder="안내 문구를 입력하세요 (선택)"
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        {saved && <span style={{ color: '#10b981', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} /> 저장됐습니다</span>}
        <button className="btn btn-primary" onClick={handleSave}><Save size={15} /> 앱 설정 저장</button>
      </div>
    </div>
  );
}

/* ================================================================
   Tab 5 : 기본 설정 (영업담당 기본값)
   ================================================================ */
function GeneralTab() {
  const appSettings = useStore((s) => s.appSettings);
  const updateAppSettings = useStore((s) => s.updateAppSettings);

  // 영업 기본값은 localStorage에서 유지 (기존 호환)
  const LS_KEY = 'paradigm-admin-general';
  const [form, setForm] = useState(() => {
    try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : { salesRepName: '', salesRepEmail: '', salesRepPhone: '', commonTemplate: '' }; }
    catch { return { salesRepName: '', salesRepEmail: '', salesRepPhone: '', commonTemplate: '' }; }
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <h2 className="section-title">영업 담당 기본값</h2>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
          새 프로젝트 생성 시 영업 정보에 자동으로 채워지는 기본값입니다.
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label className="label">담당자 이름</label>
            <input className="input" value={form.salesRepName} onChange={e => setForm({ ...form, salesRepName: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">이메일</label>
            <input className="input" value={form.salesRepEmail} onChange={e => setForm({ ...form, salesRepEmail: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">전화번호</label>
            <input className="input" value={form.salesRepPhone} onChange={e => setForm({ ...form, salesRepPhone: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">공통 문구 템플릿</h2>
        <textarea
          className="input"
          rows={5}
          value={form.commonTemplate}
          onChange={e => setForm({ ...form, commonTemplate: e.target.value })}
          placeholder="제안서나 보고서에 공통으로 사용할 문구를 입력하세요."
          style={{ resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        {saved && <span style={{ color: '#10b981', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} /> 저장됐습니다</span>}
        <button className="btn btn-primary" onClick={handleSave}><Save size={15} /> 설정 저장</button>
      </div>
    </div>
  );
}
