import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Star,
  Info,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { ContactRow } from '../types';

const DEFAULT_DEPARTMENTS = [
  '진단검사의학과 결정권자',
  '진단검사의학과 실무자',
  '전산팀',
  '시설팀',
  '인터페이스 업체',
];

function uid() {
  return `ct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeDefaultRows(): ContactRow[] {
  return DEFAULT_DEPARTMENTS.map((dept) => ({
    id: uid(),
    department: dept,
    name: '',
    phone: '',
    email: '',
    note: '',
    priority: dept.includes('결정권자'),
  }));
}

export default function Step08Contacts() {
  const getCurrentProject = useStore((s) => s.getCurrentProject);
  const updateProject = useStore((s) => s.updateProject);
  const project = getCurrentProject();

  const [contacts, setContacts] = useState<ContactRow[]>(makeDefaultRows());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project) {
      if (project.contacts.length > 0) {
        setContacts(project.contacts.map((c) => ({ ...c })));
      } else {
        setContacts(makeDefaultRows());
      }
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(() => {
    if (!project) return;
    updateProject(project.id, { contacts });
  }, [project, contacts, updateProject]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 400);
  }, [save]);

  useEffect(() => {
    scheduleSave();
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [contacts, scheduleSave]);

  const updateContact = (id: string, field: keyof ContactRow, value: any) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const addContact = () => {
    setContacts((prev) => [
      ...prev,
      { id: uid(), department: '', name: '', phone: '', email: '', note: '', priority: false },
    ]);
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
        <Users size={22} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>부서별 연락처</h2>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem', minWidth: 160 }}>부서/역할</th>
                <th style={{ padding: '0.5rem', minWidth: 100 }}>담당자 성명</th>
                <th style={{ padding: '0.5rem', minWidth: 130 }}>연락처</th>
                <th style={{ padding: '0.5rem', minWidth: 160 }}>이메일</th>
                <th style={{ padding: '0.5rem', minWidth: 120 }}>메모</th>
                <th style={{ padding: '0.5rem', width: 44, textAlign: 'center' }}>우선</th>
                <th style={{ padding: '0.5rem', width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: c.priority ? '#eff6ff' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      className="input"
                      value={c.department}
                      onChange={(e) => updateContact(c.id, 'department', e.target.value)}
                      placeholder="부서/역할"
                      style={{ fontWeight: 500 }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      className="input"
                      value={c.name}
                      onChange={(e) => updateContact(c.id, 'name', e.target.value)}
                      placeholder="성명"
                    />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      className="input"
                      value={c.phone}
                      onChange={(e) => updateContact(c.id, 'phone', e.target.value)}
                      placeholder="000-0000-0000"
                    />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      className="input"
                      value={c.email}
                      onChange={(e) => updateContact(c.id, 'email', e.target.value)}
                      placeholder="email@example.com"
                    />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      className="input"
                      value={c.note}
                      onChange={(e) => updateContact(c.id, 'note', e.target.value)}
                      placeholder="메모"
                    />
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: c.priority ? '#eab308' : '#cbd5e1',
                        transition: 'color 0.15s',
                      }}
                      onClick={() => updateContact(c.id, 'priority', !c.priority)}
                      title={c.priority ? '우선 해제' : '우선 설정'}
                    >
                      <Star size={18} fill={c.priority ? '#eab308' : 'none'} />
                    </button>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => removeContact(c.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button className="btn btn-primary btn-sm" onClick={addContact}>
            <Plus size={14} /> 연락처 추가
          </button>
        </div>

        <div className="info-box" style={{ marginTop: '1rem' }}>
          <Star size={14} style={{ color: '#eab308', flexShrink: 0 }} />
          <span>우선 연락처로 지정된 담당자는 파란색 배경으로 강조 표시됩니다.</span>
        </div>
      </div>
    </div>
  );
}
