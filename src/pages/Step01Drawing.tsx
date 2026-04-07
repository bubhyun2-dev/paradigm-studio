import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  Camera,
  Wrench,
  MapPin,
  RotateCw,
  Trash2,
  Plus,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  FolderOpen,
  ExternalLink,
  Link,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/useStore';
import type { SiteInfo, SitePhoto, InfraMark, InfraMarkLink } from '../types';

/* ─── Image compression ─────────────────────────────────────── */
async function compressImage(file: File, maxW = 1920, maxH = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxW || h > maxH) {
          const r = Math.min(maxW / w, maxH / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/* ─── PDF first-page render ─────────────────────────────────── */
async function renderPdfFirstPage(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  // Use new URL() for Vite-friendly worker resolution (no ?url suffix needed)
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).href;
  const ab = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  const page = await pdf.getPage(1);
  const vp = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  canvas.width = vp.width;
  canvas.height = vp.height;
  // pdfjs-dist v5: render() accepts { canvas } (HTMLCanvasElement), not { canvasContext }
  await (page.render as Function)({ canvas, viewport: vp }).promise;
  return canvas.toDataURL('image/jpeg', 0.85);
}

/* ─── Infra type config ──────────────────────────────────────── */
interface InfraTypeConfig {
  type: InfraMark['type'];
  label: string;
  shortLabel: string;
  color: string;
}

const INFRA_TYPES: InfraTypeConfig[] = [
  { type: 'power',   label: '콘센트',    shortLabel: '전', color: '#ef4444' },
  { type: 'lan',     label: 'LAN 포트',  shortLabel: 'L',  color: '#3b82f6' },
  { type: 'did',     label: 'DID',       shortLabel: 'D',  color: '#8b5cf6' },
  { type: 'kiosk',   label: '키오스크',  shortLabel: 'K',  color: '#f97316' },
  { type: 'desk',    label: '채혈데스크',shortLabel: '채', color: '#10b981' },
  { type: 'custom',  label: '직접입력',  shortLabel: '+',  color: '#64748b' },
];

const getInfraConfig = (type: string, label?: string): InfraTypeConfig => {
  const found = INFRA_TYPES.find((t) => t.type === type);
  if (found) return found;
  // Unknown / custom type: derive display from label
  const displayLabel = label || type;
  return {
    type,
    label: displayLabel,
    shortLabel: displayLabel.charAt(0).toUpperCase(),
    color: '#64748b',
  };
};

/* ─── Coordinate helper ─────────────────────────────────────── */
function screenToWorld(
  e: React.MouseEvent,
  container: HTMLElement,
  panX: number,
  panY: number,
  zoom: number,
) {
  const rect = container.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - panX) / zoom,
    y: (e.clientY - rect.top - panY) / zoom,
  };
}

/* ─── Component ─────────────────────────────────────────────── */
export default function Step01Drawing() {
  const getCurrentProject = useStore((s) => s.getCurrentProject);
  const updateProject     = useStore((s) => s.updateProject);
  const project           = getCurrentProject();

  /* ── A. Floor plan state ── */
  const [floorPlanDataUrl, setFloorPlanDataUrl] = useState('');
  const [rotation, setRotation] = useState(0);
  const [opacity, setOpacity]   = useState(1);

  /* ── A. Viewer state (local) ── */
  const [zoom,      setZoom]      = useState(1);
  const [panX,      setPanX]      = useState(0);
  const [panY,      setPanY]      = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart,  setPanStart]  = useState({ x: 0, y: 0, px: 0, py: 0 });

  /* ── A. Upload state ── */
  const [uploading,    setUploading]    = useState(false);
  const [uploadedName, setUploadedName] = useState('');
  const [uploadedSize, setUploadedSize] = useState(0);
  const [isDragOver,   setIsDragOver]   = useState(false);
  const floorInputRef = useRef<HTMLInputElement>(null);
  const viewerRef     = useRef<HTMLDivElement>(null);

  /* ── B. Photos ── */
  const [photos, setPhotos] = useState<SitePhoto[]>([]);

  /* ── C. Site info ── */
  const [siteInfo, setSiteInfo] = useState<SiteInfo>({
    ceilingHeight:    '',
    doorWidth:        '',
    elevatorAvailable: false,
    entryRoute:       '',
    wallMaterial:     '',
    floorCondition:   '',
    existingPowerDesc:'',
    existingLanDesc:  '',
    restrictions:     '',
  });

  /* ── D. Infra marks ── */
  const [marks,          setMarks]          = useState<InfraMark[]>([]);
  const [activeMarkType, setActiveMarkType] = useState<InfraMark['type'] | null>('power');
  const [customMarkLabel, setCustomMarkLabel] = useState('');
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [markDrag, setMarkDrag] = useState<{ id: string; ox: number; oy: number } | null>(null);

  /* ── D. Mark viewer (separate, own zoom/pan) ── */
  const [mZoom, setMZoom] = useState(1);
  const [mPanX, setMPanX] = useState(0);
  const [mPanY, setMPanY] = useState(0);
  const [mPanning, setMPanning] = useState(false);
  const [mPanStart, setMPanStart] = useState({ x: 0, y: 0, px: 0, py: 0 });
  const markViewerRef = useRef<HTMLDivElement>(null);

  /* ── Debounce refs ── */
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Sync from store on mount / project change ── */
  useEffect(() => {
    if (!project) return;
    setFloorPlanDataUrl(project.floorPlanDataUrl ?? '');
    setRotation(project.floorPlanRotation ?? 0);
    setOpacity(project.floorPlanOpacity ?? 1);
    setSiteInfo({ ...project.siteInfo });
    setPhotos([...(project.sitePhotos ?? [])]);
    setMarks([...(project.infraMarks ?? [])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  /* ── Auto-save (600 ms debounce) ── */
  const saveToStore = useCallback(() => {
    if (!project) return;
    updateProject(project.id, {
      siteInfo:    { ...siteInfo },
      sitePhotos:  [...photos],
      infraMarks:  [...marks],
    });
  }, [project, siteInfo, photos, marks, updateProject]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToStore, 600);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [siteInfo, photos, marks, saveToStore]);

  /* ════════════════════════════════════════
     SECTION A — Floor plan upload & viewer
  ════════════════════════════════════════ */

  const handleFloorFile = async (file: File) => {
    if (file.size > 30 * 1024 * 1024) {
      alert('파일 크기가 너무 큽니다 (최대 30MB)');
      return;
    }
    setUploading(true);
    setUploadedName(file.name);
    setUploadedSize(file.size);
    try {
      let result: string;
      if (file.type === 'application/pdf') {
        result = await renderPdfFirstPage(file);
      } else {
        result = await compressImage(file);
      }
      setFloorPlanDataUrl(result);
      if (project) updateProject(project.id, { floorPlanDataUrl: result });
    } catch (err) {
      alert('파일 처리 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleFloorDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFloorFile(file);
  };

  const handleFloorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFloorFile(file);
    e.target.value = '';
  };

  const handleRotationChange = (deg: 0 | 90 | 180 | 270) => {
    setRotation(deg);
    if (project) updateProject(project.id, { floorPlanRotation: deg });
  };

  const handleOpacityChange = (val: number) => {
    setOpacity(val);
    if (project) updateProject(project.id, { floorPlanOpacity: val });
  };

  const handleDeleteFloorPlan = () => {
    if (!confirm('도면을 삭제하시겠습니까?')) return;
    setFloorPlanDataUrl('');
    setUploadedName('');
    setUploadedSize(0);
    setZoom(1); setPanX(0); setPanY(0);
    if (project) updateProject(project.id, { floorPlanDataUrl: '' });
  };

  /* Viewer pan — mouse */
  const handleViewerMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.mark-pin')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY, px: panX, py: panY });
  };
  const handleViewerMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanX(panStart.px + e.clientX - panStart.x);
    setPanY(panStart.py + e.clientY - panStart.y);
  };
  const handleViewerMouseUp = () => setIsPanning(false);

  /* Viewer zoom — wheel */
  const handleViewerWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.25, Math.min(4, z + (e.deltaY < 0 ? 0.1 : -0.1))));
  };

  /* ════════════════════════════════════════
     SECTION B — Site photos
  ════════════════════════════════════════ */

  // 드라이브 링크로 사진 추가
  const addPhotoByLink = () => {
    setPhotos((prev) => [...prev, { id: uuidv4(), driveLink: '', title: '', note: '' }]);
  };

  const updatePhoto = (id: string, field: keyof SitePhoto, value: string) =>
    setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));

  const deletePhoto = (id: string) =>
    setPhotos((prev) => prev.filter((p) => p.id !== id));

  /* ════════════════════════════════════════
     SECTION C — Site info helpers
  ════════════════════════════════════════ */
  const updateSI = <K extends keyof SiteInfo>(key: K, value: SiteInfo[K]) =>
    setSiteInfo((prev) => ({ ...prev, [key]: value }));

  /* ════════════════════════════════════════
     SECTION D — Infra marks
  ════════════════════════════════════════ */

  /* Mark viewer pan */
  const handleMarkViewerMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.mark-pin')) return;
    if (markDrag) return;
    if (activeMarkType) return; // clicking to place mark, not pan
    setMPanning(true);
    setMPanStart({ x: e.clientX, y: e.clientY, px: mPanX, py: mPanY });
  };
  const handleMarkViewerMouseMove = (e: React.MouseEvent) => {
    if (markDrag) {
      if (!markViewerRef.current) return;
      const wx = (e.clientX - markViewerRef.current.getBoundingClientRect().left - mPanX) / mZoom;
      const wy = (e.clientY - markViewerRef.current.getBoundingClientRect().top  - mPanY) / mZoom;
      setMarks((prev) =>
        prev.map((m) => m.id === markDrag.id
          ? { ...m, x: wx - markDrag.ox, y: wy - markDrag.oy }
          : m),
      );
      return;
    }
    if (!mPanning) return;
    setMPanX(mPanStart.px + e.clientX - mPanStart.x);
    setMPanY(mPanStart.py + e.clientY - mPanStart.y);
  };
  const handleMarkViewerMouseUp = () => {
    if (markDrag && project) {
      updateProject(project.id, { infraMarks: [...marks] });
      setMarkDrag(null);
    }
    setMPanning(false);
  };
  const handleMarkViewerWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setMZoom((z) => Math.max(0.25, Math.min(4, z + (e.deltaY < 0 ? 0.1 : -0.1))));
  };

  const handleMarkCanvasClick = (e: React.MouseEvent) => {
    if (!activeMarkType) return;
    if ((e.target as HTMLElement).closest('.mark-pin')) return;
    if (!markViewerRef.current) return;
    const { x, y } = screenToWorld(e, markViewerRef.current, mPanX, mPanY, mZoom);
    const effectiveType = activeMarkType === 'custom'
      ? (customMarkLabel.trim() || 'custom')
      : activeMarkType;
    const newMark: InfraMark = {
      id: uuidv4(),
      type: effectiveType,
      label: activeMarkType === 'custom' ? customMarkLabel.trim() || undefined : undefined,
      x,
      y,
      note: '',
    };
    const updated = [...marks, newMark];
    setMarks(updated);
    setSelectedMarkId(newMark.id);
    if (project) updateProject(project.id, { infraMarks: updated });
  };

  const handleMarkPinMouseDown = (e: React.MouseEvent, mark: InfraMark) => {
    e.stopPropagation();
    setSelectedMarkId(mark.id);
    if (!markViewerRef.current) return;
    const { x: wx, y: wy } = screenToWorld(e, markViewerRef.current, mPanX, mPanY, mZoom);
    setMarkDrag({ id: mark.id, ox: wx - mark.x, oy: wy - mark.y });
  };

  const updateMarkNote = (id: string, note: string) =>
    setMarks((prev) => prev.map((m) => m.id === id ? { ...m, note } : m));

  const deleteMark = (id: string) => {
    const updated = marks.filter((m) => m.id !== id);
    setMarks(updated);
    if (selectedMarkId === id) setSelectedMarkId(null);
    if (project) updateProject(project.id, { infraMarks: updated });
  };

  const deleteAllMarks = () => {
    if (!confirm('모든 마킹을 삭제하시겠습니까?')) return;
    setMarks([]);
    setSelectedMarkId(null);
    if (project) updateProject(project.id, { infraMarks: [] });
  };

  const addMarkLink = (markId: string, title: string, url: string) => {
    const newLink: InfraMarkLink = { id: uuidv4(), title, url, description: '' };
    setMarks((prev) =>
      prev.map((m) =>
        m.id === markId ? { ...m, links: [...(m.links ?? []), newLink] } : m,
      ),
    );
  };

  const removeMarkLink = (markId: string, linkId: string) => {
    setMarks((prev) =>
      prev.map((m) =>
        m.id === markId ? { ...m, links: (m.links ?? []).filter((l) => l.id !== linkId) } : m,
      ),
    );
  };

  const selectedMark = marks.find((m) => m.id === selectedMarkId);

  /* ════════════════════════════════════════
     NO PROJECT GUARD
  ════════════════════════════════════════ */
  if (!project) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
        <Upload size={32} style={{ margin: '0 auto 0.75rem' }} />
        <p>프로젝트를 선택해주세요.</p>
      </div>
    );
  }

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Upload size={22} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>도면 업로드 및 현장 정보</h2>
      </div>

      {/* ══════════════════════════════════════
          A. 도면 업로드
      ══════════════════════════════════════ */}
      <div className="card">
        <h3 className="section-title">
          <Upload size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          도면 업로드
        </h3>

        {/* Hidden file input */}
        <input
          ref={floorInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFloorInputChange}
        />

        {/* Drop zone — only shown when no floor plan */}
        {!floorPlanDataUrl && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFloorDrop}
            onClick={() => !uploading && floorInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? '#3b82f6' : '#cbd5e1'}`,
              borderRadius: '0.75rem',
              minHeight: 300,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              cursor: uploading ? 'wait' : 'pointer',
              background: isDragOver ? '#eff6ff' : '#fafbfc',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {uploading ? (
              <>
                <div style={{
                  width: 36, height: 36, border: '3px solid #3b82f6',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{ fontSize: '0.875rem', color: '#3b82f6', fontWeight: 500 }}>처리 중...</p>
              </>
            ) : (
              <>
                <Upload size={40} style={{ color: '#94a3b8' }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  도면 파일을 여기에 드래그하거나 클릭하여 업로드하세요
                </p>
                <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                  지원 형식: PDF, JPG, PNG (최대 30MB)
                </p>
              </>
            )}
          </div>
        )}

        {/* Floor plan viewer */}
        {floorPlanDataUrl && (
          <div>
            {/* Uploaded file info */}
            {uploadedName && (
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.75rem' }}>
                <strong>{uploadedName}</strong>
                {uploadedSize > 0 && (
                  <span style={{ marginLeft: '0.5rem' }}>
                    ({(uploadedSize / 1024).toFixed(0)} KB)
                  </span>
                )}
              </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {/* Zoom preset buttons */}
              {([0.25, 0.5, 0.75, 1, 1.5, 2] as const).map((z) => (
                <button
                  key={z}
                  className={`btn btn-sm ${zoom === z ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setZoom(z)}
                >
                  {z * 100}%
                </button>
              ))}
              <button className="btn btn-outline btn-sm" onClick={() => setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))} title="확대">
                <ZoomIn size={14} />
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))} title="축소">
                <ZoomOut size={14} />
              </button>

              {/* Separator */}
              <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 0.25rem' }} />

              {/* Opacity */}
              <Eye size={14} style={{ color: '#64748b' }} />
              <input
                type="range" min={0} max={100} step={5}
                value={Math.round(opacity * 100)}
                onChange={(e) => handleOpacityChange(Number(e.target.value) / 100)}
                style={{ width: 100 }}
              />
              <span style={{ fontSize: '0.8125rem', color: '#64748b', minWidth: 36 }}>
                {Math.round(opacity * 100)}%
              </span>

              {/* Separator */}
              <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 0.25rem' }} />

              {/* Rotation */}
              <RotateCw size={14} style={{ color: '#64748b' }} />
              {([0, 90, 180, 270] as const).map((deg) => (
                <button
                  key={deg}
                  className={`btn btn-sm ${rotation === deg ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleRotationChange(deg)}
                >
                  {deg}°
                </button>
              ))}

              {/* Separator */}
              <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 0.25rem' }} />

              {/* Canvas fit */}
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}
                title="캔버스 맞춤"
              >
                <Maximize2 size={14} />
                캔버스 맞춤
              </button>

              {/* Delete */}
              <button className="btn btn-sm btn-danger" onClick={handleDeleteFloorPlan}>
                <Trash2 size={14} />
                도면 삭제
              </button>
            </div>

            {/* Viewer canvas */}
            <div
              ref={viewerRef}
              style={{
                position: 'relative',
                width: '100%',
                height: 600,
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                background: '#f8fafc',
                cursor: isPanning ? 'grabbing' : 'grab',
                userSelect: 'none',
              }}
              onMouseDown={handleViewerMouseDown}
              onMouseMove={handleViewerMouseMove}
              onMouseUp={handleViewerMouseUp}
              onMouseLeave={handleViewerMouseUp}
              onWheel={handleViewerWheel}
            >
              {/* World div */}
              <div
                style={{
                  position: 'absolute',
                  transformOrigin: '0 0',
                  transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                }}
              >
                <img
                  src={floorPlanDataUrl}
                  alt="도면"
                  draggable={false}
                  style={{
                    display: 'block',
                    opacity,
                    transform: `rotate(${rotation}deg)`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          B. 현장 사진 (구글 드라이브 링크)
      ══════════════════════════════════════ */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 className="section-title" style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
            <Camera size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
            현장 사진 링크
          </h3>
          <button className="btn btn-outline btn-sm" onClick={addPhotoByLink}>
            <Plus size={14} /> 사진 링크 추가
          </button>
        </div>

        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', marginBottom: '1rem', fontSize: '0.8125rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FolderOpen size={14} />
          사진을 구글 드라이브에 업로드한 후 공유 링크를 여기에 붙여넣으세요. 저장 용량을 절약하고 어디서나 접근 가능합니다.
        </div>

        {photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            <Camera size={32} style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.875rem' }}>등록된 현장 사진 링크가 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {photos.map((photo, idx) => (
              <div key={photo.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#fafafa' }}>
                {/* 번호 */}
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, paddingTop: '0.5rem', minWidth: 20, textAlign: 'center' }}>{idx + 1}</div>
                {/* 드라이브 링크 썸네일 표시 */}
                <div style={{ width: 56, height: 56, borderRadius: '0.375rem', overflow: 'hidden', flexShrink: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {photo.driveLink ? (
                    <a href={photo.driveLink} target="_blank" rel="noopener noreferrer">
                      <Camera size={20} style={{ color: '#3b82f6' }} />
                    </a>
                  ) : (
                    <Camera size={20} style={{ color: '#cbd5e1' }} />
                  )}
                </div>
                {/* 입력 필드들 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <input
                    className="input"
                    value={photo.title}
                    onChange={(e) => updatePhoto(photo.id, 'title', e.target.value)}
                    placeholder="사진 제목 (예: 채혈실 정면)"
                    style={{ fontSize: '0.8125rem' }}
                  />
                  <div style={{ position: 'relative' }}>
                    <Link size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      className="input"
                      value={photo.driveLink || ''}
                      onChange={(e) => updatePhoto(photo.id, 'driveLink', e.target.value)}
                      placeholder="구글 드라이브 공유 링크 붙여넣기"
                      style={{ fontSize: '0.8125rem', paddingLeft: '1.75rem' }}
                    />
                  </div>
                  <input
                    className="input"
                    value={photo.note}
                    onChange={(e) => updatePhoto(photo.id, 'note', e.target.value)}
                    placeholder="메모 (선택)"
                    style={{ fontSize: '0.8125rem' }}
                  />
                </div>
                {/* 액션 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {photo.driveLink && (
                    <a href={photo.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="링크 열기">
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => deletePhoto(photo.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          C. 현장 인프라 정보
      ══════════════════════════════════════ */}
      <div className="card">
        <h3 className="section-title">
          <Wrench size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          현장 인프라 정보
        </h3>

        <div className="form-grid">
          {/* 천장고 */}
          <div className="form-group">
            <label className="label">천장고</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <input
                className="input"
                value={siteInfo.ceilingHeight}
                onChange={(e) => updateSI('ceilingHeight', e.target.value)}
                placeholder="예: 2700"
              />
              <span style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>mm</span>
            </div>
          </div>

          {/* 출입문 폭 */}
          <div className="form-group">
            <label className="label">출입문 폭</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <input
                className="input"
                value={siteInfo.doorWidth}
                onChange={(e) => updateSI('doorWidth', e.target.value)}
                placeholder="예: 900"
              />
              <span style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>mm</span>
            </div>
          </div>

          {/* 엘리베이터 */}
          <div className="form-group">
            <label className="label">엘리베이터 사용 가능 여부</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <div
                className={`toggle-track${siteInfo.elevatorAvailable ? ' active' : ''}`}
                onClick={() => updateSI('elevatorAvailable', !siteInfo.elevatorAvailable)}
              >
                <div className="toggle-knob" />
              </div>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                {siteInfo.elevatorAvailable ? '사용 가능' : '사용 불가'}
              </span>
            </div>
          </div>

          {/* 벽체 재질 */}
          <div className="form-group">
            <label className="label">벽체 재질</label>
            <input
              className="input"
              value={siteInfo.wallMaterial}
              onChange={(e) => updateSI('wallMaterial', e.target.value)}
              placeholder="예: 콘크리트, 경량벽체 등"
            />
          </div>

          {/* 바닥 상태 */}
          <div className="form-group">
            <label className="label">바닥 상태</label>
            <input
              className="input"
              value={siteInfo.floorCondition}
              onChange={(e) => updateSI('floorCondition', e.target.value)}
              placeholder="예: 비닐 타일, 에폭시 등"
            />
          </div>

          {/* spacer */}
          <div />

          {/* 장비 반입 경로 */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">장비 반입 경로</label>
            <textarea
              className="input"
              rows={2}
              value={siteInfo.entryRoute}
              onChange={(e) => updateSI('entryRoute', e.target.value)}
              placeholder="주 출입구에서 설치 장소까지 반입 경로를 설명하세요"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* 기타 설치 제한사항 */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="label">기타 설치 제한사항</label>
            <textarea
              className="input"
              rows={2}
              value={siteInfo.restrictions}
              onChange={(e) => updateSI('restrictions', e.target.value)}
              placeholder="높이 제한, 소음 기준, 작업 시간 제한 등"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          D. 인프라 마킹 도구
      ══════════════════════════════════════ */}
      <div className="card">
        <h3 className="section-title">
          <MapPin size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '0.375rem' }} />
          인프라 마킹 도구
        </h3>

        {/* Mark type toolbar */}
        <div
          className="toolbar"
          style={{ marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}
        >
          {INFRA_TYPES.map((infra) => {
            const isActive = activeMarkType === infra.type;
            return (
              <button
                key={infra.type}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveMarkType(isActive ? null : infra.type)}
                title={infra.label}
                style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: '50%',
                  background: isActive ? 'white' : infra.color,
                  color: isActive ? infra.color : 'white',
                  fontSize: '0.5625rem', fontWeight: 700, flexShrink: 0,
                }}>
                  {infra.shortLabel}
                </span>
                {infra.label}
              </button>
            );
          })}
        </div>

        {/* Custom label input */}
        {activeMarkType === 'custom' && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <input
              className="input"
              value={customMarkLabel}
              onChange={(e) => setCustomMarkLabel(e.target.value)}
              placeholder="마크 이름을 입력하세요"
              style={{ flex: 1, fontSize: '0.8125rem' }}
            />
          </div>
        )}

        {/* Hint */}
        {activeMarkType && (
          <div className="info-box" style={{ marginBottom: '0.75rem' }}>
            <MapPin size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              캔버스를 클릭하여{' '}
              <strong>{activeMarkType === 'custom' ? (customMarkLabel.trim() || '직접입력') : getInfraConfig(activeMarkType ?? 'power').label}</strong> 마크를 배치하세요.
              배치 후 드래그로 위치를 조정할 수 있습니다.
            </span>
          </div>
        )}
        {!activeMarkType && (
          <div className="info-box" style={{ marginBottom: '0.75rem' }}>
            <MapPin size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>위 도구 버튼을 선택한 뒤 캔버스를 클릭하여 인프라 마크를 배치하세요.</span>
          </div>
        )}

        {/* Mark canvas */}
        <div
          ref={markViewerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: 400,
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            background: floorPlanDataUrl ? '#f8fafc' : `
              linear-gradient(rgba(203,213,225,0.25) 1px, transparent 1px),
              linear-gradient(90deg, rgba(203,213,225,0.25) 1px, transparent 1px)
            `,
            backgroundSize: floorPlanDataUrl ? undefined : '20px 20px',
            cursor: activeMarkType ? 'crosshair' : (mPanning ? 'grabbing' : 'grab'),
            userSelect: 'none',
          }}
          onClick={handleMarkCanvasClick}
          onMouseDown={handleMarkViewerMouseDown}
          onMouseMove={handleMarkViewerMouseMove}
          onMouseUp={handleMarkViewerMouseUp}
          onMouseLeave={handleMarkViewerMouseUp}
          onWheel={handleMarkViewerWheel}
        >
          {/* World div */}
          <div style={{
            position: 'absolute',
            transformOrigin: '0 0',
            transform: `translate(${mPanX}px, ${mPanY}px) scale(${mZoom})`,
          }}>
            {/* Floor plan background */}
            {floorPlanDataUrl && (
              <img
                src={floorPlanDataUrl}
                alt="도면"
                draggable={false}
                style={{
                  display: 'block',
                  opacity,
                  transform: `rotate(${rotation}deg)`,
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* SVG overlay for marks */}
            <svg
              style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%', height: '100%',
                overflow: 'visible',
                pointerEvents: 'none',
              }}
            >
              {marks.map((mark) => {
                const cfg = getInfraConfig(mark.type, mark.label);
                const isSelected = mark.id === selectedMarkId;
                return (
                  <g key={mark.id}>
                    <circle
                      cx={mark.x} cy={mark.y} r={14}
                      fill={cfg.color}
                      stroke={isSelected ? '#2563eb' : 'white'}
                      strokeWidth={isSelected ? 3 : 1.5}
                      style={{ filter: isSelected ? 'drop-shadow(0 0 4px rgba(37,99,235,0.6))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                    />
                    <text
                      x={mark.x} y={mark.y}
                      textAnchor="middle" dominantBaseline="central"
                      fill="white" fontSize={10} fontWeight={700}
                      style={{ pointerEvents: 'none' }}
                    >
                      {cfg.shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Draggable hit areas for marks */}
            {marks.map((mark) => (
              <div
                key={mark.id}
                className="mark-pin"
                onMouseDown={(e) => handleMarkPinMouseDown(e, mark)}
                onClick={(e) => { e.stopPropagation(); setSelectedMarkId(mark.id); }}
                title={`${getInfraConfig(mark.type, mark.label).label}${mark.note ? ' — ' + mark.note : ''}`}
                style={{
                  position: 'absolute',
                  left: mark.x - 14,
                  top:  mark.y - 14,
                  width: 28, height: 28,
                  borderRadius: '50%',
                  cursor: 'move',
                  zIndex: 10,
                  background: 'transparent',
                }}
              />
            ))}
          </div>

          {/* Empty state hint */}
          {marks.length === 0 && !activeMarkType && !floorPlanDataUrl && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                도구를 선택한 뒤 캔버스를 클릭하여 인프라 마크를 배치하세요
              </span>
            </div>
          )}
        </div>

        {/* Mark viewer controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setMZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))}>
            <ZoomIn size={14} /> 확대
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setMZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))}>
            <ZoomOut size={14} /> 축소
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => { setMZoom(1); setMPanX(0); setMPanY(0); }}>
            <Maximize2 size={14} /> 맞춤
          </button>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{Math.round(mZoom * 100)}%</span>

          {marks.length > 0 && (
            <>
              <div style={{ flex: 1 }} />
              <button className="btn btn-sm btn-danger" onClick={deleteAllMarks}>
                <Trash2 size={14} />
                전체 마킹 삭제
              </button>
            </>
          )}
        </div>

        {/* Selected mark panel */}
        {selectedMark && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.75rem 1rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}>
            {/* Color badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: '50%',
              background: getInfraConfig(selectedMark.type, selectedMark.label).color,
              color: 'white', fontSize: '0.625rem', fontWeight: 700, flexShrink: 0,
            }}>
              {getInfraConfig(selectedMark.type, selectedMark.label).shortLabel}
            </span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, flexShrink: 0 }}>
              {getInfraConfig(selectedMark.type, selectedMark.label).label}
            </span>
            <input
              className="input"
              value={selectedMark.note}
              onChange={(e) => updateMarkNote(selectedMark.id, e.target.value)}
              placeholder="메모를 입력하세요"
              style={{ flex: '1 1 200px', fontSize: '0.8125rem' }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: '#ef4444', flexShrink: 0 }}
              onClick={() => deleteMark(selectedMark.id)}
            >
              <X size={14} />
              삭제
            </button>
          </div>
        )}

        {/* Links panel for selected mark */}
        {selectedMark && (
          <div style={{
            marginTop: '0.5rem',
            padding: '0.75rem 1rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
          }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>링크 관리</div>
            {(selectedMark.links ?? []).map((link) => (
              <div key={link.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '0.375rem', fontSize: '0.8125rem',
              }}>
                <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, color: '#3b82f6', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {link.title || link.url}
                </a>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ef4444', padding: '0.125rem 0.25rem', flexShrink: 0 }}
                  onClick={() => removeMarkLink(selectedMark.id, link.id)}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.375rem' }}>
              <input
                className="input"
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                placeholder="제목"
                style={{ flex: 1, fontSize: '0.75rem' }}
                onClick={(e) => e.stopPropagation()}
              />
              <input
                className="input"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="URL"
                style={{ flex: 2, fontSize: '0.75rem' }}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className="btn btn-outline btn-sm"
                style={{ flexShrink: 0 }}
                onClick={() => {
                  if (!newLinkUrl.trim()) return;
                  addMarkLink(selectedMark.id, newLinkTitle.trim(), newLinkUrl.trim());
                  setNewLinkTitle('');
                  setNewLinkUrl('');
                }}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Mark count summary */}
        {marks.length > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {INFRA_TYPES.map((infra) => {
              const count = marks.filter((m) => m.type === infra.type).length;
              if (count === 0) return null;
              return (
                <span key={infra.type} className="badge badge-gray" style={{ gap: '0.25rem' }}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8,
                    borderRadius: '50%', background: infra.color,
                  }} />
                  {infra.label} {count}개
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Spinner keyframe (injected inline for self-containment) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
