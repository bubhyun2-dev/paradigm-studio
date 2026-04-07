import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package,
  Plus,
  Trash2,
  TestTubes,
  Info,
  ChevronDown,
  ChevronRight,
  Server,
  Network,
  Printer,
} from 'lucide-react';
import React from 'react';
import { useStore } from '../store/useStore';
import type { ComponentItem, TubeSlot, ComponentInstance } from '../types';

/* ── quick-add chip presets ─────────────────────────────── */
const QUICK_ADD_GROUPS: { group: string; items: Omit<ComponentItem, 'id'>[] }[] = [
  {
    group: '검체 생성',
    items: [
      { category: '본체', productName: 'Paradigm 5 Series A', model: 'PDM-5SA', quantity: 1, note: '' },
      { category: '본체', productName: 'Paradigm 3 Series', model: 'PDM-3S', quantity: 1, note: '' },
      { category: '본체', productName: 'Paradigm 8 Series', model: 'PDM-8S', quantity: 1, note: '' },
    ],
  },
  {
    group: '분류 / 이송 / 플랫폼',
    items: [
      { category: '이송', productName: 'Paradigm Track', model: 'PDM-TRK', quantity: 1, note: '' },
      { category: '이송', productName: 'Link', model: 'LNK-STD', quantity: 1, note: '' },
      { category: '플랫폼', productName: 'OASIS', model: 'OAS-STD', quantity: 1, note: '' },
    ],
  },
  {
    group: '채혈 주변기기',
    items: [
      { category: '주변기기', productName: '키오스크', model: 'KSK-STD', quantity: 1, note: '' },
      { category: '주변기기', productName: 'DID 55', model: 'DID-55', quantity: 1, note: '' },
      { category: '주변기기', productName: '채혈 접수대', model: 'RCP-DSK', quantity: 1, note: '' },
    ],
  },
];

const CATEGORY_OPTIONS = ['본체', '주변기기', '이송', '플랫폼', '소모품', '네트워크', '기타'];

const TUBE_TYPES = ['SST', 'EDTA', 'Heparin', 'NaF', 'Citrate'];

const TUBE_COLORS: Record<string, string> = {
  SST: '#eab308',
  EDTA: '#a855f7',
  Heparin: '#22c55e',
  NaF: '#94a3b8',
  Citrate: '#3b82f6',
};

function uid() {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Step07Components() {
  const getCurrentProject = useStore((s) => s.getCurrentProject);
  const updateProject = useStore((s) => s.updateProject);
  const project = getCurrentProject();

  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [tubeSlots, setTubeSlots] = useState<TubeSlot[]>([
    { slot: 1, tubeType: '' },
    { slot: 2, tubeType: '' },
    { slot: 3, tubeType: '' },
    { slot: 4, tubeType: '' },
    { slot: 5, tubeType: '' },
    { slot: 6, tubeType: '' },
  ]);
  const [tubeNote, setTubeNote] = useState('');
  const [customTubeTypes, setCustomTubeTypes] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Omit<ComponentItem, 'id' | 'instances'>>({
    category: '본체',
    productName: '',
    model: '',
    quantity: 1,
    note: '',
  });
  const [customTubeInput, setCustomTubeInput] = useState('');
  const [expandedCompIds, setExpandedCompIds] = useState<Set<string>>(new Set());

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project) {
      setComponents(project.components.map((c) => ({ ...c })));
      if (project.tubeSlots.length > 0) {
        setTubeSlots(project.tubeSlots.map((t) => ({ ...t })));
      }
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(() => {
    if (!project) return;
    updateProject(project.id, { components, tubeSlots });
  }, [project, components, tubeSlots, updateProject]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 400);
  }, [save]);

  useEffect(() => {
    scheduleSave();
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [components, tubeSlots, scheduleSave]);

  /* ── handlers ───────────────────────────────────── */
  const addComponent = (item: Omit<ComponentItem, 'id'>) => {
    setComponents((prev) => [...prev, { ...item, id: uid() }]);
  };

  const removeComponent = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

  const updateComponent = (id: string, field: keyof ComponentItem, value: any) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const updateTubeSlot = (slot: number, tubeType: string) => {
    setTubeSlots((prev) => prev.map((t) => (t.slot === slot ? { ...t, tubeType } : t)));
  };

  const addCustomTube = () => {
    const name = customTubeInput.trim();
    if (!name || customTubeTypes.includes(name) || TUBE_TYPES.includes(name)) return;
    setCustomTubeTypes((prev) => [...prev, name]);
    setCustomTubeInput('');
  };

  const toggleExpand = (id: string) => {
    setExpandedCompIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const syncInstancesCount = (comp: ComponentItem, newQuantity: number) => {
    const instances = comp.instances || [];
    if (instances.length < newQuantity) {
      const needed = newQuantity - instances.length;
      const added = Array.from({ length: needed }).map(() => ({
        id: uid(),
        ip: '',
        macAddress: '',
        firmwareVersion: '',
        softwareVersion: '',
        hardwareVersion: '',
      }));
      return [...instances, ...added];
    } else if (instances.length > newQuantity) {
      return instances.slice(0, newQuantity);
    }
    return instances;
  };

  const updateQuantity = (id: string, qty: number) => {
    setComponents((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      return {
        ...c,
        quantity: qty,
        instances: syncInstancesCount(c, qty),
      };
    }));
  };

  const updateInstance = (compId: string, instId: string, field: keyof ComponentInstance, value: string) => {
    setComponents((prev) => prev.map((c) => {
      if (c.id !== compId) return c;
      const instances = c.instances || [];
      return {
        ...c,
        instances: instances.map(inst => inst.id === instId ? { ...inst, [field]: value } : inst)
      };
    }));
  };

  const totalQty = components.reduce((s, c) => s + c.quantity, 0);
  const allTubeOptions = [...TUBE_TYPES, ...customTubeTypes];

  const getTubeColor = (type: string) => TUBE_COLORS[type] || '#6b7280';

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
        <Package size={22} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>구성품 수량 확정</h2>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
          <Printer size={14} /> 구성품 목록 출력
        </button>
      </div>

      {/* ─── A. 구성품 목록 ─────────────────────────────── */}
      <div className="card">
        <h3 className="section-title">구성품 목록</h3>

        {/* Quick-add chips */}
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {QUICK_ADD_GROUPS.map((g) => (
            <div key={g.group} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: 120, fontWeight: 600 }}>{g.group}</span>
              {g.items.map((item) => (
                <button
                  key={item.model}
                  className="btn btn-outline btn-sm"
                  onClick={() => addComponent(item)}
                >
                  + {item.productName}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem', width: 40 }}></th>
                <th style={{ padding: '0.5rem' }}>분류</th>
                <th style={{ padding: '0.5rem' }}>제품명</th>
                <th style={{ padding: '0.5rem' }}>모델/사양</th>
                <th style={{ padding: '0.5rem', width: 80 }}>수량</th>
                <th style={{ padding: '0.5rem' }}>비고</th>
                <th style={{ padding: '0.5rem', width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {components.map((c) => (
                <React.Fragment key={c.id}>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', background: expandedCompIds.has(c.id) ? '#f8fafc' : 'transparent' }}>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleExpand(c.id)} style={{ padding: '4px' }}>
                        {expandedCompIds.has(c.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <span className="badge badge-gray">{c.category}</span>
                    </td>
                    <td style={{ padding: '0.5rem', fontWeight: 500 }}>{c.productName}</td>
                    <td style={{ padding: '0.5rem', color: '#64748b' }}>{c.model}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={c.quantity}
                        onChange={(e) => updateQuantity(c.id, Math.max(1, Number(e.target.value) || 1))}
                        style={{ width: 64, textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        className="input"
                        value={c.note}
                        onChange={(e) => updateComponent(c.id, 'note', e.target.value)}
                        placeholder="비고"
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => removeComponent(c.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                  
                  {expandedCompIds.has(c.id) && (
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <td colSpan={7} style={{ padding: '1rem 1rem 1.5rem 3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#64748b' }}>
                          <Server size={14} />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>장비 인스턴스 정보 (네트워크 / 버전)</span>
                        </div>
                        {(!c.instances || c.instances.length === 0) ? (
                          <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>인스턴스 정보가 필요 없는 항목이거나 누락되었습니다.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {c.instances.map((inst, idx) => (
                              <div key={inst.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#fff', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', width: 24, textAlign: 'center' }}>
                                  #{idx + 1}
                                </div>
                                <div style={{ flex: 1, display: 'flex', gap: '0.375rem' }}>
                                  <input className="input" style={{ flex: 1, minWidth: 100, fontSize: '0.75rem' }} placeholder="IP 주소" value={inst.ip} onChange={(e) => updateInstance(c.id, inst.id, 'ip', e.target.value)} />
                                  <input className="input" style={{ flex: 1, minWidth: 120, fontSize: '0.75rem' }} placeholder="MAC 주소" value={inst.macAddress || ''} onChange={(e) => updateInstance(c.id, inst.id, 'macAddress', e.target.value)} />
                                  <input className="input" style={{ flex: 1, minWidth: 100, fontSize: '0.75rem' }} placeholder="S/W 버전" value={inst.softwareVersion} onChange={(e) => updateInstance(c.id, inst.id, 'softwareVersion', e.target.value)} />
                                  <input className="input" style={{ flex: 1, minWidth: 100, fontSize: '0.75rem' }} placeholder="F/W 버전" value={inst.firmwareVersion} onChange={(e) => updateInstance(c.id, inst.id, 'firmwareVersion', e.target.value)} />
                                  <input className="input" style={{ flex: 1, minWidth: 100, fontSize: '0.75rem' }} placeholder="장비 버전" value={inst.hardwareVersion || ''} onChange={(e) => updateInstance(c.id, inst.id, 'hardwareVersion', e.target.value)} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {components.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    구성품이 없습니다. 위 버튼 또는 아래 추가 버튼을 이용해 추가하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={14} /> 구성품 추가
          </button>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            총 {components.length}종 / {totalQty}개
          </span>
        </div>

        {/* Inline add form */}
        {showAddForm && (
          <div style={{ marginTop: '0.75rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <div className="form-grid" style={{ gap: '0.5rem' }}>
              <div className="form-group">
                <label className="label">분류</label>
                <select
                  className="input"
                  value={newItem.category}
                  onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">제품명</label>
                <input
                  className="input"
                  value={newItem.productName}
                  onChange={(e) => setNewItem((p) => ({ ...p, productName: e.target.value }))}
                  placeholder="제품명 입력"
                />
              </div>
              <div className="form-group">
                <label className="label">모델/사양</label>
                <input
                  className="input"
                  value={newItem.model}
                  onChange={(e) => setNewItem((p) => ({ ...p, model: e.target.value }))}
                  placeholder="모델명"
                />
              </div>
              <div className="form-group">
                <label className="label">수량</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={newItem.quantity}
                  onChange={(e) => setNewItem((p) => ({ ...p, quantity: Math.max(1, Number(e.target.value) || 1) }))}
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">비고</label>
                <input
                  className="input"
                  value={newItem.note}
                  onChange={(e) => setNewItem((p) => ({ ...p, note: e.target.value }))}
                  placeholder="비고"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (!newItem.productName.trim()) return;
                  addComponent(newItem);
                  setNewItem({ category: '본체', productName: '', model: '', quantity: 1, note: '' });
                  setShowAddForm(false);
                }}
              >
                추가
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setShowAddForm(false)}>취소</button>
            </div>
          </div>
        )}
      </div>

      {/* ─── B. 튜브 배치 확정 ───────────────────────────── */}
      <div className="card">
        <h3 className="section-title">
          <TestTubes size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          튜브 배치 확정
        </h3>

        {/* 6 tube slots */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {tubeSlots.map((ts) => {
            const color = getTubeColor(ts.tubeType);
            return (
              <div
                key={ts.slot}
                style={{
                  flex: '1 1 120px',
                  minWidth: 120,
                  border: '2px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  textAlign: 'center',
                  background: ts.tubeType ? `${color}12` : '#fff',
                  borderColor: ts.tubeType ? color : '#e2e8f0',
                  transition: 'all 0.15s',
                }}
              >
                {/* Visual tube icon */}
                <div style={{
                  width: 28,
                  height: 48,
                  margin: '0 auto 0.5rem',
                  borderRadius: '0 0 8px 8px',
                  background: ts.tubeType
                    ? `linear-gradient(180deg, ${color} 30%, ${color}88 100%)`
                    : '#e2e8f0',
                  border: `2px solid ${ts.tubeType ? color : '#cbd5e1'}`,
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: -6,
                    left: -2,
                    right: -2,
                    height: 8,
                    background: ts.tubeType ? color : '#cbd5e1',
                    borderRadius: '2px 2px 0 0',
                  }} />
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.375rem' }}>
                  슬롯 {ts.slot}
                </div>
                <div style={{ position: 'relative' }}>
                  <select
                    className="input"
                    value={ts.tubeType}
                    onChange={(e) => updateTubeSlot(ts.slot, e.target.value)}
                    style={{ fontSize: '0.8125rem', textAlign: 'center', paddingRight: '1.5rem' }}
                  >
                    <option value="">미지정</option>
                    {allTubeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom tube type */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">커스텀 튜브 타입 추가</label>
            <input
              className="input"
              value={customTubeInput}
              onChange={(e) => setCustomTubeInput(e.target.value)}
              placeholder="튜브 타입명 입력"
              onKeyDown={(e) => e.key === 'Enter' && addCustomTube()}
            />
          </div>
          <button className="btn btn-outline btn-sm" onClick={addCustomTube} style={{ marginBottom: 2 }}>
            <Plus size={14} /> 커스텀 튜브 추가
          </button>
        </div>
        {customTubeTypes.length > 0 && (
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {customTubeTypes.map((t) => (
              <span key={t} className="badge badge-gray">{t}</span>
            ))}
          </div>
        )}

        {/* Tube note */}
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="label">튜브 배치 특이사항</label>
          <textarea
            className="input"
            rows={3}
            value={tubeNote}
            onChange={(e) => setTubeNote(e.target.value)}
            placeholder="튜브 배치에 대한 특이사항을 입력하세요."
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>
    </div>
  );
}
