import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Plus,
  Pencil,
  Copy,
  Archive,
  X,
  Save,
  PackageOpen,
  Filter,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Product } from '../types';

const CATEGORIES = [
  '검체 생성',
  '검체 접수/분류',
  '검체 이송/도착',
  '운영 플랫폼',
  '채혈 주변기기',
];

const emptyProduct = (): Product => ({
  id: `prod-${Date.now()}`,
  name: '',
  code: '',
  category: CATEGORIES[0],
  width: 0,
  depth: 0,
  height: 0,
  footprint: '',
  workArea: '',
  maintenanceArea: '',
  powerRequired: 0,
  lanRequired: 0,
  installDirection: '',
  serviceDirection: '',
  memo: '',
  image: '',
  topViewImage: '',
  tags: [],
  version: '',
  active: true,
});

export default function AdminProducts() {
  const navigate = useNavigate();
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Product>(emptyProduct());
  const [tagsInput, setTagsInput] = useState('');

  /* ---------- filtered list ---------- */
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !searchText ||
        p.name.toLowerCase().includes(searchText.toLowerCase()) ||
        p.code.toLowerCase().includes(searchText.toLowerCase());
      const matchCategory = !categoryFilter || p.category === categoryFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.active) ||
        (statusFilter === 'inactive' && !p.active);
      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, searchText, categoryFilter, statusFilter]);

  /* ---------- actions ---------- */
  const openNew = () => {
    setEditingId(null);
    const p = emptyProduct();
    setForm(p);
    setTagsInput('');
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ ...p });
    setTagsInput(p.tags.join(', '));
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.code.trim()) return;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const product = { ...form, tags };

    if (editingId) {
      updateProduct(editingId, product);
    } else {
      addProduct(product);
    }
    setShowModal(false);
  };

  const handleDuplicate = (p: Product) => {
    const dup: Product = {
      ...structuredClone(p),
      id: `prod-${Date.now()}`,
      name: `${p.name} (복제)`,
    };
    addProduct(dup);
  };

  const handleArchive = (p: Product) => {
    updateProduct(p.id, { active: false });
  };

  /* ---------- render ---------- */
  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin')}>
          <ArrowLeft size={16} /> 관리자 설정
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <PackageOpen size={22} /> 제품 CMS 관리
        </h1>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="제품명 또는 코드로 검색"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={15} style={{ color: '#64748b' }} />
          <select className="input" style={{ width: 'auto', minWidth: 150 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">전체 카테고리</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <select className="input" style={{ width: 'auto', minWidth: 120 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
          <option value="all">전체 상태</option>
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <Plus size={15} /> 신규 등록
        </button>
      </div>

      {/* Product table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '3rem 0' }}>표시할 제품이 없습니다.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: '0.625rem 0.75rem' }}>제품명</th>
                  <th style={{ padding: '0.625rem 0.75rem' }}>제품코드</th>
                  <th style={{ padding: '0.625rem 0.75rem' }}>카테고리</th>
                  <th style={{ padding: '0.625rem 0.75rem' }}>가로x세로x높이 (mm)</th>
                  <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>전원</th>
                  <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>LAN</th>
                  <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>상태</th>
                  <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>{p.code}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <span className="badge badge-blue">{p.category}</span>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {p.width} x {p.depth} x {p.height}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>{p.powerRequired}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>{p.lanRequired}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      <span className={`badge ${p.active ? 'badge-green' : 'badge-gray'}`}>
                        {p.active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)} title="수정">
                          <Pencil size={13} /> 수정
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleDuplicate(p)} title="복제">
                          <Copy size={13} /> 복제
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleArchive(p)} title="보관" disabled={!p.active}>
                          <Archive size={13} /> 보관
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="card" style={{ width: '90%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                {editingId ? '제품 수정' : '신규 제품 등록'}
              </h2>
              <button className="btn btn-outline btn-sm" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="form-grid" style={{ gap: '1rem' }}>
              {/* Row 1 */}
              <div className="form-group">
                <label className="label">제품명</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">제품코드</label>
                <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>

              {/* Row 2 */}
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="label">카테고리</label>
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Dimensions */}
              <div className="form-group">
                <label className="label">가로 (mm)</label>
                <input className="input" type="number" value={form.width || ''} onChange={(e) => setForm({ ...form, width: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="label">세로 (mm)</label>
                <input className="input" type="number" value={form.depth || ''} onChange={(e) => setForm({ ...form, depth: Number(e.target.value) })} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="label">높이 (mm)</label>
                <input className="input" type="number" value={form.height || ''} onChange={(e) => setForm({ ...form, height: Number(e.target.value) })} style={{ maxWidth: 300 }} />
              </div>

              {/* Areas */}
              <div className="form-group">
                <label className="label">점유영역</label>
                <textarea className="input" rows={2} value={form.footprint} onChange={(e) => setForm({ ...form, footprint: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">작업영역</label>
                <textarea className="input" rows={2} value={form.workArea} onChange={(e) => setForm({ ...form, workArea: e.target.value })} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="label">유지보수영역</label>
                <textarea className="input" rows={2} value={form.maintenanceArea} onChange={(e) => setForm({ ...form, maintenanceArea: e.target.value })} />
              </div>

              {/* Infra */}
              <div className="form-group">
                <label className="label">전원 필요 개수</label>
                <input className="input" type="number" value={form.powerRequired || ''} onChange={(e) => setForm({ ...form, powerRequired: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="label">LAN 필요 개수</label>
                <input className="input" type="number" value={form.lanRequired || ''} onChange={(e) => setForm({ ...form, lanRequired: Number(e.target.value) })} />
              </div>

              {/* Directions */}
              <div className="form-group">
                <label className="label">설치 방향</label>
                <input className="input" value={form.installDirection} onChange={(e) => setForm({ ...form, installDirection: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">서비스 방향</label>
                <input className="input" value={form.serviceDirection} onChange={(e) => setForm({ ...form, serviceDirection: e.target.value })} />
              </div>

              {/* Memo */}
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="label">설치 메모</label>
                <textarea className="input" rows={3} value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
              </div>

              {/* Tags */}
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="label">태그 (쉼표로 구분)</label>
                <input className="input" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="예: 8시리즈, 듀얼헤드, 바스켓" />
              </div>

              {/* Version */}
              <div className="form-group">
                <label className="label">버전명</label>
                <input className="input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
              </div>

              {/* Active toggle */}
              <div className="form-group">
                <label className="label">상태</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <div
                    className={`toggle-track${form.active ? ' active' : ''}`}
                    onClick={() => setForm({ ...form, active: !form.active })}
                  >
                    <div className="toggle-knob" />
                  </div>
                  <span style={{ fontSize: '0.875rem' }}>{form.active ? '활성' : '비활성'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>
                <X size={15} /> 취소
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={15} /> 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
