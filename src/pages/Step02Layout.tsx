import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Save,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Magnet,
  Ruler,
  MessageSquare,
  Zap,
  Network,
  Footprints,
  Layers,
  Printer,
  Trash2,
  Plus,
  Info,
  ChevronDown,
  ChevronRight,
  Square,
  DoorOpen,
  RectangleHorizontal,
  Type,
  Star,
  AlertTriangle,
  MousePointer,
  Minus,
  Copy,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { PlacedItem, DrawingElement, InfraMark, LayoutMark, Product, VersionRecord } from '../types';

/* ─── Category config ──────────────────────────────────── */
const CATEGORIES = [
  '검체 생성',
  '검체 접수 / 분류',
  '검체 이송 / 도착',
  '운영 플랫폼',
  '채혈 주변기기',
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  '검체 생성': '#22c55e',
  '검체 접수 / 분류': '#3b82f6',
  '검체 이송 / 도착': '#a855f7',
  '운영 플랫폼': '#14b8a6',
  '채혈 주변기기': '#f97316',
};

const CATEGORY_BG: Record<string, string> = {
  '검체 생성': '#dcfce7',
  '검체 접수 / 분류': '#dbeafe',
  '검체 이송 / 도착': '#f3e8ff',
  '운영 플랫폼': '#ccfbf1',
  '채혈 주변기기': '#ffedd5',
};

type DrawingMode = 'select' | 'wall' | 'door' | 'column' | 'zone' | 'text' | null;

const SCALE = 0.2;       // product mm → px
const DRAW_SCALE = 0.15; // drawing element mm → px (columns, doors)

/* ─── History ─────────────────────────────────────────── */
interface HistoryEntry {
  placedItems: PlacedItem[];
  drawingElements: DrawingElement[];
}

/* ─── Component ─────────────────────────────────────────── */
export default function Step02Layout() {
  const getCurrentProject = useStore((s) => s.getCurrentProject);
  const updateProject = useStore((s) => s.updateProject);
  const products = useStore((s) => s.products);
  const project = getCurrentProject();

  // ─── Local state
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([]);
  const [infraMarks, setInfraMarks] = useState<InfraMark[]>([]);
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  // Canvas controls
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showDimensions, setShowDimensions] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showPower, setShowPower] = useState(false);
  const [showLan, setShowLan] = useState(false);
  const [showFlow, setShowFlow] = useState(false);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);

  // Layout marks (Step02 specific)
  const [layoutMarks, setLayoutMarks] = useState<LayoutMark[]>([]);
  const [showLayoutPower, setShowLayoutPower] = useState(false);
  const [showLayoutLan, setShowLayoutLan] = useState(false);
  const [layoutMarkMode, setLayoutMarkMode] = useState<'power' | 'lan' | null>(null);
  const [selectedLayoutMarkId, setSelectedLayoutMarkId] = useState<string | null>(null);

  // mm-based dimension inputs
  const [newWallLengthMm, setNewWallLengthMm] = useState(5000);
  const [newColumnWMm, setNewColumnWMm] = useState(500);
  const [newColumnHMm, setNewColumnHMm] = useState(500);
  const [newDoorWMm, setNewDoorWMm] = useState(900);
  const [showRoomCreator, setShowRoomCreator] = useState(false);
  const [roomWidthMm, setRoomWidthMm] = useState(10000);
  const [roomHeightMm, setRoomHeightMm] = useState(10000);

  // Drawing state
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null);
  const [zoneStart, setZoneStart] = useState<{ x: number; y: number } | null>(null);
  const [previewMouse, setPreviewMouse] = useState<{ x: number; y: number } | null>(null);

  // Sidebar collapse
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Drag state (placed items)
  const [dragInfo, setDragInfo] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Drag state (drawing elements — walls, doors, columns, text, zones)
  const [dragDrawingInfo, setDragDrawingInfo] = useState<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    origX: number;
    origY: number;
    origX2: number | undefined;
    origY2: number | undefined;
  } | null>(null);

  // Undo / Redo
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didDragRef = useRef(false);
  const didDragDrawingRef = useRef(false);

  // ─── Sync from store on project or version change
  useEffect(() => {
    if (!project) return;
    const ver = project.versions.find((v) => v.id === project.currentVersionId);
    setVersions([...project.versions]);
    setCurrentVersionId(project.currentVersionId);
    if (ver) {
      setPlacedItems([...ver.placedItems]);
      setInfraMarks([...ver.infraMarks]);
    } else {
      setPlacedItems([...project.placedItems]);
      setInfraMarks([...project.infraMarks]);
    }
    setDrawingElements([...(project.drawingElements ?? [])]);
    setLayoutMarks([...(project.layoutMarks ?? [])]);
    setSelectedItemId(null);
    setSelectedDrawingId(null);
    setUndoStack([]);
    setRedoStack([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.currentVersionId]);

  // ─── Auto-save debounced
  const saveToStore = useCallback(() => {
    if (!project) return;
    const updatedVersions = versions.map((v) =>
      v.id === currentVersionId
        ? { ...v, placedItems: [...placedItems], infraMarks: [...infraMarks] }
        : v,
    );
    updateProject(project.id, {
      placedItems: [...placedItems],
      drawingElements: [...drawingElements],
      infraMarks: [...infraMarks],
      layoutMarks: [...layoutMarks],
      versions: updatedVersions,
      currentVersionId,
    });
  }, [project, placedItems, drawingElements, infraMarks, layoutMarks, versions, currentVersionId, updateProject]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToStore, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [placedItems, drawingElements, infraMarks, versions, currentVersionId, saveToStore]);

  // ─── Window-level drag fix (prevents drag cancel on canvas mouseLeave)
  useEffect(() => {
    if (!dragInfo) return;
    const onMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      didDragRef.current = true;
      const rect = canvasRef.current.getBoundingClientRect();
      let x = (e.clientX - rect.left - dragInfo.offsetX) / (zoom / 100);
      let y = (e.clientY - rect.top - dragInfo.offsetY) / (zoom / 100);
      if (snapEnabled) {
        const g = 20;
        x = Math.round(x / g) * g;
        y = Math.round(y / g) * g;
      }
      x = Math.max(0, x);
      y = Math.max(0, y);
      setPlacedItems((prev) =>
        prev.map((item) => (item.id === dragInfo.id ? { ...item, x, y } : item)),
      );
    };
    const onUp = () => setDragInfo(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragInfo, zoom, snapEnabled]);

  // ─── Window-level drag for drawing elements (walls, doors, columns, zones, text)
  useEffect(() => {
    if (!dragDrawingInfo) return;
    const onMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      didDragDrawingRef.current = true;
      const rect = canvasRef.current.getBoundingClientRect();
      const scale = zoom / 100;
      const mouseX = (e.clientX - rect.left) / scale;
      const mouseY = (e.clientY - rect.top) / scale;
      let dx = mouseX - dragDrawingInfo.startMouseX;
      let dy = mouseY - dragDrawingInfo.startMouseY;
      let newX = dragDrawingInfo.origX + dx;
      let newY = dragDrawingInfo.origY + dy;
      if (snapEnabled) {
        const g = 20;
        newX = Math.round(newX / g) * g;
        newY = Math.round(newY / g) * g;
        // recalc actual dx/dy after snapping
        dx = newX - dragDrawingInfo.origX;
        dy = newY - dragDrawingInfo.origY;
      }
      const partial: Partial<DrawingElement> = { x: newX, y: newY };
      if (dragDrawingInfo.origX2 !== undefined) partial.x2 = dragDrawingInfo.origX2 + dx;
      if (dragDrawingInfo.origY2 !== undefined) partial.y2 = dragDrawingInfo.origY2 + dy;
      setDrawingElements((prev) =>
        prev.map((el) => (el.id === dragDrawingInfo.id ? { ...el, ...partial } : el))
      );
    };
    const onUp = () => setDragDrawingInfo(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragDrawingInfo, zoom, snapEnabled]);

  // ─── History helpers
  const pushHistory = useCallback(() => {
    setUndoStack((prev) => [
      ...prev.slice(-49),
      { placedItems: [...placedItems], drawingElements: [...drawingElements] },
    ]);
    setRedoStack([]);
  }, [placedItems, drawingElements]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, { placedItems: [...placedItems], drawingElements: [...drawingElements] }]);
    setUndoStack((u) => u.slice(0, -1));
    setPlacedItems(prev.placedItems);
    setDrawingElements(prev.drawingElements);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, { placedItems: [...placedItems], drawingElements: [...drawingElements] }]);
    setRedoStack((r) => r.slice(0, -1));
    setPlacedItems(next.placedItems);
    setDrawingElements(next.drawingElements);
  };

  // ─── Product helpers
  const getProduct = useCallback(
    (productId: string): Product | undefined => products.find((p) => p.id === productId),
    [products],
  );

  const groupedProducts = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const cat of CATEGORIES) map[cat] = [];
    for (const p of products) {
      if (p.active && map[p.category]) {
        map[p.category].push(p);
      }
    }
    return map;
  }, [products]);

  // ─── Add product to canvas
  const addProductToCanvas = (product: Product) => {
    pushHistory();
    const newItem: PlacedItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: product.id,
      x: 400,
      y: 300,
      rotation: 0,
      label: product.name,
      note: '',
    };
    setPlacedItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
    setSelectedDrawingId(null);
  };

  // ─── Delete placed item
  const deleteItem = (id: string) => {
    pushHistory();
    setPlacedItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  // ─── Duplicate placed item
  const duplicateItem = (id: string) => {
    const item = placedItems.find((i) => i.id === id);
    if (!item) return;
    pushHistory();
    const copy: PlacedItem = {
      ...item,
      id: `item-${Date.now()}`,
      x: item.x + 40,
      y: item.y + 40,
    };
    setPlacedItems((prev) => [...prev, copy]);
    setSelectedItemId(copy.id);
  };

  // ─── Update placed item field
  const updateItem = (id: string, partial: Partial<PlacedItem>) => {
    setPlacedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...partial } : item)),
    );
  };

  // ─── Drawing element helpers
  const deleteDrawingElement = (id: string) => {
    pushHistory();
    setDrawingElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedDrawingId === id) setSelectedDrawingId(null);
  };

  const updateDrawingElement = (id: string, partial: Partial<DrawingElement>) => {
    setDrawingElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...partial } : el)),
    );
  };

  const updateLayoutMark = (id: string, partial: Partial<LayoutMark>) => {
    setLayoutMarks((prev) => prev.map((m) => (m.id === id ? { ...m, ...partial } : m)));
  };

  const deleteLayoutMark = (id: string) => {
    setLayoutMarks((prev) => prev.filter((m) => m.id !== id));
    if (selectedLayoutMarkId === id) setSelectedLayoutMarkId(null);
  };

  // ─── Drawing handlers
  const handleWallClick = (x: number, y: number) => {
    if (!wallStart) {
      setWallStart({ x, y });
    } else {
      pushHistory();
      const el: DrawingElement = {
        id: `draw-${Date.now()}`,
        type: 'wall',
        x: wallStart.x,
        y: wallStart.y,
        x2: x,
        y2: y,
        width: 10,
        height: 0,
        rotation: 0,
        note: '',
      };
      setDrawingElements((prev) => [...prev, el]);
      setWallStart(null);
    }
  };

  const handleZoneClick = (x: number, y: number) => {
    if (!zoneStart) {
      setZoneStart({ x, y });
    } else {
      pushHistory();
      const el: DrawingElement = {
        id: `draw-${Date.now()}`,
        type: 'zone',
        x: Math.min(zoneStart.x, x),
        y: Math.min(zoneStart.y, y),
        width: Math.abs(x - zoneStart.x),
        height: Math.abs(y - zoneStart.y),
        rotation: 0,
        note: '',
      };
      setDrawingElements((prev) => [...prev, el]);
      setZoneStart(null);
    }
  };

  const handleDoorPlace = (x: number, y: number) => {
    const w = newDoorWMm;
    if (w > 0) {
      pushHistory();
      const el: DrawingElement = {
        id: `draw-${Date.now()}`,
        type: 'door',
        x,
        y,
        x2: undefined,
        y2: undefined,
        width: w,
        height: 200,
        rotation: 0,
        note: '',
      };
      setDrawingElements((prev) => [...prev, el]);
    }
  };

  const handleColumnPlace = (x: number, y: number) => {
    const w = newColumnWMm;
    const h = newColumnHMm;
    if (w > 0 && h > 0) {
      pushHistory();
      const el: DrawingElement = {
        id: `draw-${Date.now()}`,
        type: 'column',
        x,
        y,
        width: w,
        height: h,
        rotation: 0,
        note: '',
      };
      setDrawingElements((prev) => [...prev, el]);
    }
  };

  const handleTextPlace = (x: number, y: number) => {
    const txt = window.prompt('텍스트 입력:', '');
    if (txt) {
      pushHistory();
      const el: DrawingElement = {
        id: `draw-${Date.now()}`,
        type: 'text',
        x,
        y,
        width: 0,
        height: 0,
        text: txt,
        rotation: 0,
        note: '',
      };
      setDrawingElements((prev) => [...prev, el]);
    }
  };

  // ─── Quick Room Creator: draws 4 walls forming a rectangle
  const createRoomFromMm = () => {
    const wPx = roomWidthMm * DRAW_SCALE;
    const hPx = roomHeightMm * DRAW_SCALE;
    const ox = 50; // canvas offset
    const oy = 50;
    const t = 150; // default wall thickness mm
    const now = Date.now();
    const walls: DrawingElement[] = [
      // Top wall
      { id: `draw-room-top-${now}`, type: 'wall', x: ox, y: oy, x2: ox + wPx, y2: oy, width: t, height: 0, rotation: 0, note: '' },
      // Bottom wall
      { id: `draw-room-bot-${now}`, type: 'wall', x: ox, y: oy + hPx, x2: ox + wPx, y2: oy + hPx, width: t, height: 0, rotation: 0, note: '' },
      // Left wall
      { id: `draw-room-lft-${now}`, type: 'wall', x: ox, y: oy, x2: ox, y2: oy + hPx, width: t, height: 0, rotation: 0, note: '' },
      // Right wall
      { id: `draw-room-rgt-${now}`, type: 'wall', x: ox + wPx, y: oy, x2: ox + wPx, y2: oy + hPx, width: t, height: 0, rotation: 0, note: '' },
    ];
    pushHistory();
    setDrawingElements((prev) => [...prev, ...walls]);
    setShowRoomCreator(false);
  };

  // ─── Fixed drag handlers
  const handleItemMouseDown = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedItemId(itemId);
    setSelectedDrawingId(null);
    pushHistory();
    const item = placedItems.find((i) => i.id === itemId);
    if (!item || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    didDragRef.current = false;
    setDragInfo({
      id: itemId,
      offsetX: (e.clientX - rect.left) - item.x * (zoom / 100),
      offsetY: (e.clientY - rect.top) - item.y * (zoom / 100),
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // Update preview mouse for wall/zone preview lines
    if ((drawingMode === 'wall' && wallStart) || (drawingMode === 'zone' && zoneStart)) {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const scale = zoom / 100;
        setPreviewMouse({
          x: (e.clientX - rect.left) / scale,
          y: (e.clientY - rect.top) / scale,
        });
      }
    } else {
      setPreviewMouse(null);
    }

    if (!dragInfo || !canvasRef.current) return;
    didDragRef.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) - dragInfo.offsetX) / (zoom / 100);
    let y = ((e.clientY - rect.top) - dragInfo.offsetY) / (zoom / 100);
    if (snapEnabled) {
      const g = 20;
      x = Math.round(x / g) * g;
      y = Math.round(y / g) * g;
    }
    x = Math.max(0, x);
    y = Math.max(0, y);
    setPlacedItems((prev) =>
      prev.map((item) => (item.id === dragInfo.id ? { ...item, x, y } : item)),
    );
  };

  const handleCanvasMouseUp = () => {
    setDragInfo(null);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scale = zoom / 100;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (layoutMarkMode) {
      const newMark: LayoutMark = {
        id: `lm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: layoutMarkMode,
        x,
        y,
        note: '',
      };
      setLayoutMarks((prev) => [...prev, newMark]);
      return;
    }

    if (!drawingMode || drawingMode === 'select') {
      setSelectedItemId(null);
      setSelectedDrawingId(null);
      setSelectedLayoutMarkId(null);
      return;
    }

    if (drawingMode === 'wall') { handleWallClick(x, y); return; }
    if (drawingMode === 'zone') { handleZoneClick(x, y); return; }
    if (drawingMode === 'door') { handleDoorPlace(x, y); return; }
    if (drawingMode === 'column') { handleColumnPlace(x, y); return; }
    if (drawingMode === 'text') { handleTextPlace(x, y); return; }
  };

  // ─── Version management
  const switchVersion = (versionId: string) => {
    if (!project) return;
    const updatedVersions = versions.map((v) =>
      v.id === currentVersionId
        ? { ...v, placedItems: [...placedItems], infraMarks: [...infraMarks] }
        : v,
    );
    setVersions(updatedVersions);

    const target = updatedVersions.find((v) => v.id === versionId);
    if (target) {
      setPlacedItems([...target.placedItems]);
      setInfraMarks([...target.infraMarks]);
    }
    setCurrentVersionId(versionId);
    setSelectedItemId(null);
    setSelectedDrawingId(null);
    setUndoStack([]);
    setRedoStack([]);

    updateProject(project.id, {
      currentVersionId: versionId,
      versions: updatedVersions,
    });
  };

  const addVersion = () => {
    if (!project) return;
    const letter = String.fromCharCode(65 + versions.length);
    const newVersion: VersionRecord = {
      id: `ver-${Date.now()}`,
      name: `${letter}안`,
      isFinal: false,
      placedItems: [...placedItems],
      infraMarks: [...infraMarks],
      createdAt: new Date().toISOString(),
    };
    const updatedVersions = versions.map((v) =>
      v.id === currentVersionId
        ? { ...v, placedItems: [...placedItems], infraMarks: [...infraMarks] }
        : v,
    );
    const allVersions = [...updatedVersions, newVersion];
    setVersions(allVersions);
    setCurrentVersionId(newVersion.id);
    setSelectedItemId(null);

    updateProject(project.id, {
      versions: allVersions,
      currentVersionId: newVersion.id,
    });
  };

  const setFinalVersion = () => {
    if (!project) return;
    const updatedVersions = versions.map((v) => ({
      ...v,
      isFinal: v.id === currentVersionId,
      placedItems: v.id === currentVersionId ? [...placedItems] : v.placedItems,
      infraMarks: v.id === currentVersionId ? [...infraMarks] : v.infraMarks,
    }));
    setVersions(updatedVersions);
    updateProject(project.id, { versions: updatedVersions });
  };

  // ─── Computed stats
  const selectedItem = placedItems.find((i) => i.id === selectedItemId);
  const selectedProduct = selectedItem ? getProduct(selectedItem.productId) : undefined;
  const selectedDrawingEl = drawingElements.find((el) => el.id === selectedDrawingId);

  const totalPower = useMemo(
    () =>
      placedItems.reduce((sum, item) => {
        const p = getProduct(item.productId);
        return sum + (p?.powerRequired ?? 0);
      }, 0),
    [placedItems, getProduct],
  );

  const totalLan = useMemo(
    () =>
      placedItems.reduce((sum, item) => {
        const p = getProduct(item.productId);
        return sum + (p?.lanRequired ?? 0);
      }, 0),
    [placedItems, getProduct],
  );

  const warnings = useMemo(() => {
    const list: string[] = [];
    for (const item of placedItems) {
      const p = getProduct(item.productId);
      if (item.x < 10 || item.y < 10) {
        list.push(`경고: ${p?.name ?? item.label} 배치 위치가 경계에 가깝습니다`);
      }
    }
    const powerMarks = infraMarks.filter((m) => m.type === 'power').length;
    const lanMarks = infraMarks.filter((m) => m.type === 'lan').length;
    if (totalPower > powerMarks) {
      list.push(`경고: 필요 전원 ${totalPower}개 > 마킹된 전원 ${powerMarks}개`);
    }
    if (totalLan > lanMarks) {
      list.push(`경고: 필요 LAN ${totalLan}개 > 마킹된 LAN ${lanMarks}개`);
    }
    return list;
  }, [placedItems, infraMarks, totalPower, totalLan, getProduct]);

  // ─── Toggle category collapse
  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // ─── Manual save
  const handleSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveToStore();
  };

  // ─── Render drawing element as SVG
  const renderDrawingElement = (el: DrawingElement) => {
    const isSelected = el.id === selectedDrawingId;
    const selStroke = isSelected ? '#3b82f6' : undefined;
    const isDragging = dragDrawingInfo?.id === el.id;

    const handleElClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (didDragDrawingRef.current) {
        didDragDrawingRef.current = false;
        return;
      }
      setSelectedDrawingId(el.id);
      setSelectedItemId(null);
    };

    const handleElMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scale = zoom / 100;
      const mouseX = (e.clientX - rect.left) / scale;
      const mouseY = (e.clientY - rect.top) / scale;
      pushHistory();
      didDragDrawingRef.current = false;
      setDragDrawingInfo({
        id: el.id,
        startMouseX: mouseX,
        startMouseY: mouseY,
        origX: el.x,
        origY: el.y,
        origX2: el.x2,
        origY2: el.y2,
      });
      setSelectedDrawingId(el.id);
      setSelectedItemId(null);
    };

    if (el.type === 'wall') {
      const x2 = el.x2 ?? el.x;
      const y2 = el.y2 ?? el.y;
      return (
        <g key={el.id} onClick={handleElClick} onMouseDown={handleElMouseDown} style={{ cursor: isDragging ? 'grabbing' : 'grab', pointerEvents: 'all' }}>
          {/* Wider transparent hit area */}
          <line
            x1={el.x} y1={el.y} x2={x2} y2={y2}
            stroke="transparent" strokeWidth={12}
          />
          <line
            x1={el.x} y1={el.y} x2={x2} y2={y2}
            stroke={selStroke ?? '#475569'} strokeWidth={isSelected ? 4 : 3}
            strokeLinecap="round"
          />
          {isSelected && (
            <>
              <circle cx={el.x} cy={el.y} r={5} fill="#3b82f6" stroke="white" strokeWidth={1.5} />
              <circle cx={x2} cy={y2} r={5} fill="#3b82f6" stroke="white" strokeWidth={1.5} />
            </>
          )}
        </g>
      );
    }

    if (el.type === 'door') {
      const dw = el.width * DRAW_SCALE;
      const dh = el.height * DRAW_SCALE;
      // Door swing arc
      const arcPath = `M ${el.x} ${el.y} L ${el.x + dw} ${el.y} A ${dw} ${dw} 0 0 0 ${el.x} ${el.y + dw}`;
      return (
        <g key={el.id} onClick={handleElClick} onMouseDown={handleElMouseDown} style={{ cursor: isDragging ? 'grabbing' : 'grab', pointerEvents: 'all' }}>
          <rect
            x={el.x} y={el.y} width={dw} height={dh}
            fill="white" stroke={selStroke ?? '#64748b'} strokeWidth={isSelected ? 2 : 1.5}
          />
          <path
            d={arcPath}
            fill="rgba(59,130,246,0.08)" stroke={selStroke ?? '#94a3b8'}
            strokeWidth={1} strokeDasharray="4,3"
          />
          {isSelected && (
            <rect x={el.x - 2} y={el.y - 2} width={dw + 4} height={dh + 4}
              fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4,2" />
          )}
        </g>
      );
    }

    if (el.type === 'column') {
      const cw = el.width * DRAW_SCALE;
      const ch = el.height * DRAW_SCALE;
      return (
        <g key={el.id} onClick={handleElClick} onMouseDown={handleElMouseDown} style={{ cursor: isDragging ? 'grabbing' : 'grab', pointerEvents: 'all' }}>
          <rect
            x={el.x} y={el.y} width={cw} height={ch}
            fill="#cbd5e1" stroke={selStroke ?? '#475569'}
            strokeWidth={isSelected ? 2 : 1.5}
          />
          {/* Cross-hatch pattern */}
          <line x1={el.x} y1={el.y} x2={el.x + cw} y2={el.y + ch}
            stroke="#94a3b8" strokeWidth={1} />
          <line x1={el.x + cw} y1={el.y} x2={el.x} y2={el.y + ch}
            stroke="#94a3b8" strokeWidth={1} />
          {isSelected && (
            <rect x={el.x - 2} y={el.y - 2} width={cw + 4} height={ch + 4}
              fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4,2" />
          )}
        </g>
      );
    }

    if (el.type === 'text') {
      return (
        <g key={el.id} onClick={handleElClick} onMouseDown={handleElMouseDown} style={{ cursor: isDragging ? 'grabbing' : 'grab', pointerEvents: 'all' }}>
          {isSelected && (
            <rect
              x={el.x - 4} y={el.y - 16}
              width={(el.text?.length ?? 4) * 8 + 8} height={22}
              fill="rgba(59,130,246,0.1)" stroke="#3b82f6"
              strokeWidth={1} rx={2}
            />
          )}
          <text
            x={el.x} y={el.y}
            fill={isSelected ? '#1d4ed8' : '#1e293b'}
            fontSize={14}
            fontFamily="sans-serif"
            style={{ userSelect: 'none' }}
          >
            {el.text}
          </text>
        </g>
      );
    }

    if (el.type === 'zone') {
      return (
        <g key={el.id} onClick={handleElClick} onMouseDown={handleElMouseDown} style={{ cursor: isDragging ? 'grabbing' : 'grab', pointerEvents: 'all' }}>
          <rect
            x={el.x} y={el.y} width={el.width} height={el.height}
            fill={isSelected ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)'}
            stroke={selStroke ?? '#3b82f6'}
            strokeWidth={isSelected ? 2 : 1.5}
            strokeDasharray="6,4"
            rx={2}
          />
        </g>
      );
    }

    return null;
  };

  // ─── Drawing mode instruction text
  const modeInstruction: Record<string, string> = {
    wall: '첫 번째 클릭: 시작점 / 두 번째 클릭: 끝점',
    door: '클릭하여 문 배치 (폭 입력)',
    column: '클릭하여 기둥 배치 (크기 입력)',
    text: '클릭하여 텍스트 배치',
    zone: '첫 번째 클릭: 시작점 / 두 번째 클릭: 끝점',
  };

  // ─── No project guard
  if (!project) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
        <Info size={32} style={{ margin: '0 auto 0.75rem' }} />
        <p>프로젝트를 선택해주세요.</p>
      </div>
    );
  }

  // ─── Sidebar panel: which mode is "active"
  const hasSelection = !!(selectedItem || selectedDrawingEl);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 0, overflow: 'hidden' }}>
      {/* ════════════════════════════════════════════════════════
          LEFT SIDEBAR - Product Library + Drawing Tools
         ════════════════════════════════════════════════════════ */}
      <div
        style={{
          width: 240,
          minWidth: 240,
          background: 'white',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '0.75rem',
            borderBottom: '1px solid var(--color-border)',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          제품 라이브러리
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {/* Product categories */}
          {CATEGORIES.map((cat) => {
            const prods = groupedProducts[cat] || [];
            const isCollapsed = collapsedCategories[cat];
            return (
              <div key={cat} style={{ marginBottom: '0.5rem' }}>
                <div
                  onClick={() => toggleCategory(cat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.375rem 0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    userSelect: 'none',
                  }}
                >
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: CATEGORY_COLORS[cat],
                      flexShrink: 0,
                    }}
                  />
                  {cat}
                  <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>{prods.length}</span>
                </div>
                {!isCollapsed &&
                  prods.map((product) => (
                    <div
                      key={product.id}
                      className="product-card-small"
                      onClick={() => addProductToCanvas(product)}
                      style={{ marginBottom: '0.25rem' }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '0.25rem',
                          background: CATEGORY_BG[product.category] || '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Square
                          size={16}
                          style={{ color: CATEGORY_COLORS[product.category] || '#64748b' }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {product.name}
                        </div>
                        <div style={{ fontSize: '0.625rem', color: '#94a3b8' }}>
                          {product.width}x{product.depth}mm
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            );
          })}

          {/* Drawing tools */}
          <div
            style={{
              marginTop: '1rem',
              borderTop: '1px solid var(--color-border)',
              paddingTop: '0.75rem',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                padding: '0 0.25rem 0.5rem',
              }}
            >
              그리기 도구
            </div>

            {/* Select tool */}
            <button
              className={`btn btn-sm ${drawingMode === 'select' || drawingMode === null ? 'btn-primary' : 'btn-outline'}`}
              style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '0.25rem' }}
              onClick={() => setDrawingMode(null)}
            >
              <MousePointer size={14} />
              선택
            </button>

            {([
              { mode: 'wall' as DrawingMode, label: '벽 그리기', sub: '(길이 자동측정)', icon: <Minus size={14} /> },
              { mode: 'door' as DrawingMode, label: '문', sub: '(폭 사전 설정)', icon: <DoorOpen size={14} /> },
              { mode: 'column' as DrawingMode, label: '기둥', sub: '(크기 사전 설정)', icon: <Square size={14} /> },
              { mode: 'text' as DrawingMode, label: '텍스트', sub: '', icon: <Type size={14} /> },
              { mode: 'zone' as DrawingMode, label: '영역', sub: '', icon: <RectangleHorizontal size={14} /> },
            ]).map(({ mode, label, sub, icon }) => (
              <button
                key={mode as string}
                className={`btn btn-sm ${drawingMode === mode ? 'btn-primary' : 'btn-outline'}`}
                style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '0.25rem' }}
                onClick={() => {
                  setDrawingMode(drawingMode === mode ? null : mode);
                  setWallStart(null);
                  setZoneStart(null);
                  setPreviewMouse(null);
                }}
              >
                {icon}
                <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                {sub && (
                  <span style={{ fontSize: '0.6rem', color: drawingMode === mode ? 'rgba(255,255,255,0.7)' : '#94a3b8' }}>
                    {sub}
                  </span>
                )}
              </button>
            ))}

            {/* Quick Room Creator */}
            <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
              <button
                className="btn btn-outline btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => setShowRoomCreator((v) => !v)}
              >
                <Square size={14} />
                <span style={{ flex: 1, textAlign: 'left' }}>빠른 방 만들기</span>
              </button>
              {showRoomCreator && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.375rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#166534', marginBottom: '0.5rem' }}>방 크기 (mm)</div>
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <input
                      type="number"
                      value={roomWidthMm}
                      min={1000}
                      step={500}
                      onChange={e => setRoomWidthMm(Number(e.target.value))}
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.25rem 0.5rem', border: '1px solid #86efac', borderRadius: '0.25rem' }}
                      placeholder="가로"
                    />
                    <span style={{ fontSize: '0.7rem', color: '#166534' }}>×</span>
                    <input
                      type="number"
                      value={roomHeightMm}
                      min={1000}
                      step={500}
                      onChange={e => setRoomHeightMm(Number(e.target.value))}
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.25rem 0.5rem', border: '1px solid #86efac', borderRadius: '0.25rem' }}
                      placeholder="세로"
                    />
                  </div>
                  <button
                    className="btn btn-sm"
                    style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none' }}
                    onClick={createRoomFromMm}
                  >
                    생성
                  </button>
                </div>
              )}
            </div>

            {/* Dimension presets for door / column modes */}
            {drawingMode === 'door' && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>문 폭 (mm)</div>
                <input
                  type="number"
                  value={newDoorWMm}
                  min={100}
                  step={50}
                  onChange={e => setNewDoorWMm(Number(e.target.value))}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '0.25rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: '0.25rem' }}
                />
              </div>
            )}
            {drawingMode === 'column' && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>기둥 크기 (mm)</div>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={newColumnWMm}
                    min={100}
                    step={50}
                    onChange={e => setNewColumnWMm(Number(e.target.value))}
                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.25rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: '0.25rem' }}
                    placeholder="가로"
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>×</span>
                  <input
                    type="number"
                    value={newColumnHMm}
                    min={100}
                    step={50}
                    onChange={e => setNewColumnHMm(Number(e.target.value))}
                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.25rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: '0.25rem' }}
                    placeholder="세로"
                  />
                </div>
              </div>
            )}

            {/* Mode instruction */}
            {drawingMode && drawingMode !== 'select' && modeInstruction[drawingMode] && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  background: '#eff6ff',
                  borderRadius: '0.375rem',
                  fontSize: '0.7rem',
                  color: '#1d4ed8',
                  lineHeight: 1.4,
                }}
              >
                {drawingMode === 'wall' && wallStart && (
                  <div style={{ marginBottom: '0.25rem', fontWeight: 600 }}>
                    시작점 설정됨 — 끝점을 클릭하세요
                  </div>
                )}
                {drawingMode === 'zone' && zoneStart && (
                  <div style={{ marginBottom: '0.25rem', fontWeight: 600 }}>
                    시작점 설정됨 — 끝점을 클릭하세요
                  </div>
                )}
                {modeInstruction[drawingMode]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          CENTER AREA - Canvas
         ════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Version tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            background: 'white',
            borderBottom: '1px solid var(--color-border)',
            padding: '0 0.5rem',
          }}
        >
          {versions.map((ver) => (
            <div
              key={ver.id}
              onClick={() => switchVersion(ver.id)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: ver.id === currentVersionId ? 600 : 400,
                color:
                  ver.id === currentVersionId
                    ? 'var(--color-primary)'
                    : 'var(--color-text-secondary)',
                borderBottom:
                  ver.id === currentVersionId
                    ? '2px solid var(--color-primary)'
                    : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                userSelect: 'none',
              }}
            >
              {ver.isFinal && <Star size={12} style={{ color: '#f59e0b', fill: '#f59e0b' }} />}
              {ver.name}
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: '0.25rem' }} onClick={addVersion}>
            <Plus size={14} />
            버전 추가
          </button>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: '0.25rem' }} onClick={setFinalVersion}>
            <Star size={14} />
            최종안 지정
          </button>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <button className="btn btn-ghost btn-sm" onClick={handleSave} title="저장">
            <Save size={16} />
            저장
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="실행취소"
            style={{ opacity: undoStack.length === 0 ? 0.4 : 1 }}
          >
            <Undo2 size={16} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="다시실행"
            style={{ opacity: redoStack.length === 0 ? 0.4 : 1 }}
          >
            <Redo2 size={16} />
          </button>

          <div className="toolbar-divider" />

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            title="확대"
          >
            <ZoomIn size={16} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setZoom((z) => Math.max(25, z - 10))}
            title="축소"
          >
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, minWidth: 40, textAlign: 'center' }}>
            {zoom}%
          </span>

          <div className="toolbar-divider" />

          <button
            className={`btn btn-sm ${snapEnabled ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSnapEnabled(!snapEnabled)}
            title="스냅"
          >
            <Magnet size={14} />
            스냅
          </button>
          <button
            className={`btn btn-sm ${showGrid ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowGrid(!showGrid)}
            title="그리드"
          >
            <Grid3X3 size={14} />
            그리드
          </button>

          <div className="toolbar-divider" />

          <button
            className={`btn btn-sm ${showDimensions ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowDimensions(!showDimensions)}
            title="치수"
          >
            <Ruler size={14} />
            치수
          </button>
          <button
            className={`btn btn-sm ${showAnnotations ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowAnnotations(!showAnnotations)}
            title="주석"
          >
            <MessageSquare size={14} />
            주석
          </button>

          <div className="toolbar-divider" />

          <button
            className={`btn btn-sm ${showPower ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowPower(!showPower)}
            title="현장 전원 보기 (Step01)"
          >
            <Zap size={14} />
            전원
          </button>
          <button
            className={`btn btn-sm ${showLan ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowLan(!showLan)}
            title="현장 LAN 보기 (Step01)"
          >
            <Network size={14} />
            LAN
          </button>

          <div className="toolbar-divider" />

          <button
            className={`btn btn-sm ${layoutMarkMode === 'power' ? 'btn-primary' : (showLayoutPower ? 'btn-outline' : 'btn-ghost')}`}
            style={layoutMarkMode === 'power' ? { background: '#f97316', borderColor: '#f97316' } : showLayoutPower ? { borderColor: '#f97316', color: '#f97316' } : {}}
            onClick={() => {
              if (layoutMarkMode === 'power') { setLayoutMarkMode(null); } else { setLayoutMarkMode('power'); setShowLayoutPower(true); }
            }}
            title="배치용 콘센트 마크 (Step02)"
          >
            <Zap size={14} />
            배치전원
          </button>
          <button
            className={`btn btn-sm ${layoutMarkMode === 'lan' ? 'btn-primary' : (showLayoutLan ? 'btn-outline' : 'btn-ghost')}`}
            style={layoutMarkMode === 'lan' ? { background: '#8b5cf6', borderColor: '#8b5cf6' } : showLayoutLan ? { borderColor: '#8b5cf6', color: '#8b5cf6' } : {}}
            onClick={() => {
              if (layoutMarkMode === 'lan') { setLayoutMarkMode(null); } else { setLayoutMarkMode('lan'); setShowLayoutLan(true); }
            }}
            title="배치용 LAN 마크 (Step02)"
          >
            <Network size={14} />
            배치LAN
          </button>
          <button
            className={`btn btn-sm ${showFlow ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowFlow(!showFlow)}
            title="동선 보기"
          >
            <Footprints size={14} />
            동선
          </button>

          <div className="toolbar-divider" />

          <button className="btn btn-ghost btn-sm" title="레이어 보기">
            <Layers size={14} />
            레이어
          </button>
          <button className="btn btn-ghost btn-sm" title="출력 미리보기">
            <Printer size={14} />
            출력
          </button>
        </div>

        {/* Canvas area */}
        <div
          className="canvas-container"
          style={{ flex: 1, position: 'relative', overflow: 'auto' }}
        >
          {/* Wrapper div sets scroll area to match scaled canvas size */}
          <div style={{ width: 4000 * (zoom / 100), height: 3000 * (zoom / 100), flexShrink: 0, position: 'relative' }}>
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 4000,
              height: 3000,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              background: showGrid
                ? `
                  linear-gradient(rgba(203,213,225,0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(203,213,225,0.3) 1px, transparent 1px)
                `
                : 'white',
              backgroundSize: '20px 20px',
              cursor: layoutMarkMode || (drawingMode && drawingMode !== 'select')
                ? 'crosshair'
                : dragInfo
                  ? 'grabbing'
                  : 'default',
              userSelect: 'none',
            }}
          >
            {/* Floor plan background image */}
            {project.floorPlanDataUrl && (
              <img
                src={project.floorPlanDataUrl}
                alt="도면 배경"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  opacity: project.floorPlanOpacity ?? 0.6,
                  maxWidth: '100%',
                  pointerEvents: 'none',
                  transform: `rotate(${project.floorPlanRotation ?? 0}deg)`,
                  transformOrigin: 'top left',
                }}
              />
            )}

            {/* SVG layer for drawing elements — z-index 1 so placed items (z-index 2) are above and draggable */}
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible',
                zIndex: 1,
                pointerEvents: 'none',
              }}
            >
              {/* Render all drawing elements */}
              {drawingElements.map((el) => renderDrawingElement(el))}

              {/* Wall preview line */}
              {drawingMode === 'wall' && wallStart && previewMouse && (
                <line
                  x1={wallStart.x} y1={wallStart.y}
                  x2={previewMouse.x} y2={previewMouse.y}
                  stroke="#3b82f6" strokeWidth={2}
                  strokeDasharray="6,4"
                  strokeLinecap="round"
                />
              )}
              {drawingMode === 'wall' && wallStart && (
                <circle cx={wallStart.x} cy={wallStart.y} r={5}
                  fill="#3b82f6" stroke="white" strokeWidth={1.5} />
              )}

              {/* Zone preview rect */}
              {drawingMode === 'zone' && zoneStart && previewMouse && (
                <rect
                  x={Math.min(zoneStart.x, previewMouse.x)}
                  y={Math.min(zoneStart.y, previewMouse.y)}
                  width={Math.abs(previewMouse.x - zoneStart.x)}
                  height={Math.abs(previewMouse.y - zoneStart.y)}
                  fill="rgba(59,130,246,0.08)"
                  stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="6,4"
                />
              )}
            </svg>

            {/* Placed equipment items */}
            {placedItems.map((item) => {
              const product = getProduct(item.productId);
              if (!product) return null;
              const w = product.width * SCALE;
              const h = product.depth * SCALE;
              const catColor = CATEGORY_COLORS[product.category] || '#6b7280';
              const catBg = CATEGORY_BG[product.category] || '#f1f5f9';
              const isSelected = item.id === selectedItemId;
              const hasShapes = product.shapes && product.shapes.length > 0;

              return (
                <div
                  key={item.id}
                  onMouseDown={(e) => handleItemMouseDown(e, item.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!drawingMode || drawingMode === 'select') {
                      setSelectedItemId(item.id);
                      setSelectedDrawingId(null);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: item.x,
                    top: item.y,
                    width: w,
                    height: h,
                    background: hasShapes ? 'transparent' : catBg,
                    border: hasShapes 
                      ? (isSelected ? '2px dashed rgba(59,130,246,0.5)' : '1px dashed transparent') 
                      : (isSelected ? `2px solid #3b82f6` : `1px solid ${catColor}`),
                    borderRadius: '3px',
                    transform: `rotate(${item.rotation}deg)`,
                    transformOrigin: 'center center',
                    cursor: drawingMode && drawingMode !== 'select' ? 'crosshair' : 'grab',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: hasShapes ? 'visible' : 'hidden',
                    boxShadow: isSelected && !hasShapes
                      ? '0 0 0 3px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.15)'
                      : '0 1px 3px rgba(0,0,0,0.1)',
                    zIndex: isSelected ? 10 : 2,
                    transition: dragInfo?.id === item.id ? 'none' : 'box-shadow 0.15s',
                  }}
                >
                  {hasShapes && product.shapes!.map((shape, idx) => (
                    <div key={idx} style={{
                      position: 'absolute',
                      left: shape.offsetX * SCALE,
                      top: shape.offsetY * SCALE,
                      width: shape.width * SCALE,
                      height: shape.height * SCALE,
                      background: catBg,
                      border: isSelected ? '1px solid #3b82f6' : `1px solid ${catColor}`,
                      pointerEvents: 'none',
                      borderRadius: '3px'
                    }} />
                  ))}
                  <span
                    style={{
                      position: hasShapes ? 'absolute' : 'static',
                      zIndex: 5,
                      fontSize: Math.min(w, h) > 60 ? '0.625rem' : '0.5rem',
                      fontWeight: 600,
                      color: hasShapes ? '#1e293b' : catColor,
                      textAlign: 'center',
                      lineHeight: 1.2,
                      padding: '2px',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}
                  >
                    {item.label || product.name}
                  </span>
                  {showDimensions && (
                    <span
                      style={{
                        position: hasShapes ? 'absolute' : 'static',
                        marginTop: hasShapes ? '16px' : '0',
                        zIndex: 5,
                        fontSize: '0.5rem',
                        color: hasShapes ? '#64748b' : '#94a3b8',
                        pointerEvents: 'none',
                      }}
                    >
                      {product.width}x{product.depth}
                    </span>
                  )}

                  {/* Selection handles */}
                  {isSelected && (
                    <>
                      {[
                        { top: -4, left: -4 },
                        { top: -4, right: -4 },
                        { bottom: -4, left: -4 },
                        { bottom: -4, right: -4 },
                      ].map((pos, i) => (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            ...pos,
                            width: 8,
                            height: 8,
                            background: '#3b82f6',
                            border: '1px solid white',
                            borderRadius: '1px',
                            pointerEvents: 'none',
                          }}
                        />
                      ))}
                    </>
                  )}

                  {/* Annotation label */}
                  {showAnnotations && item.note && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -18,
                        left: 0,
                        fontSize: '0.5rem',
                        background: '#fef3c7',
                        color: '#92400e',
                        padding: '1px 4px',
                        borderRadius: '2px',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                      }}
                    >
                      {item.note}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Infra marks - Power */}
            {showPower &&
              infraMarks
                .filter((m) => m.type === 'power')
                .map((mark) => (
                  <div
                    key={mark.id}
                    style={{
                      position: 'absolute',
                      left: mark.x - 6,
                      top: mark.y - 6,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: '#ef4444',
                      border: '2px solid white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      pointerEvents: 'none',
                      zIndex: 20,
                    }}
                    title={`전원: ${mark.note}`}
                  />
                ))}

            {/* Infra marks - LAN */}
            {showLan &&
              infraMarks
                .filter((m) => m.type === 'lan')
                .map((mark) => (
                  <div
                    key={mark.id}
                    style={{
                      position: 'absolute',
                      left: mark.x - 6,
                      top: mark.y - 6,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: '#3b82f6',
                      border: '2px solid white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      pointerEvents: 'none',
                      zIndex: 20,
                    }}
                    title={`LAN: ${mark.note}`}
                  />
                ))}

            {/* Layout marks - Power (배치용 콘센트, orange, distinct from infraMarks) */}
            {showLayoutPower &&
              layoutMarks
                .filter((m) => m.type === 'power')
                .map((mark) => {
                  const isSel = mark.id === selectedLayoutMarkId;
                  return (
                    <div
                      key={mark.id}
                      style={{
                        position: 'absolute',
                        left: mark.x - 9,
                        top: mark.y - 9,
                        width: 18,
                        height: 18,
                        borderRadius: '3px',
                        background: '#f97316',
                        border: isSel ? '2px solid #3b82f6' : '2px solid white',
                        boxShadow: isSel ? '0 0 0 2px #3b82f6, 0 1px 4px rgba(0,0,0,0.35)' : '0 1px 4px rgba(0,0,0,0.35)',
                        cursor: 'pointer',
                        zIndex: 21,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.5rem',
                        color: 'white',
                        fontWeight: 700,
                      }}
                      title={`배치 콘센트${mark.note ? ': ' + mark.note : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (layoutMarkMode) return; // in placement mode, don't select
                        setSelectedLayoutMarkId(isSel ? null : mark.id);
                        setSelectedItemId(null);
                        setSelectedDrawingId(null);
                      }}
                    >
                      P
                    </div>
                  );
                })}

            {/* Layout marks - LAN (배치용 LAN, purple, distinct from infraMarks) */}
            {showLayoutLan &&
              layoutMarks
                .filter((m) => m.type === 'lan')
                .map((mark) => {
                  const isSel = mark.id === selectedLayoutMarkId;
                  return (
                    <div
                      key={mark.id}
                      style={{
                        position: 'absolute',
                        left: mark.x - 9,
                        top: mark.y - 9,
                        width: 18,
                        height: 18,
                        borderRadius: '3px',
                        background: '#8b5cf6',
                        border: isSel ? '2px solid #3b82f6' : '2px solid white',
                        boxShadow: isSel ? '0 0 0 2px #3b82f6, 0 1px 4px rgba(0,0,0,0.35)' : '0 1px 4px rgba(0,0,0,0.35)',
                        cursor: 'pointer',
                        zIndex: 21,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.5rem',
                        color: 'white',
                        fontWeight: 700,
                      }}
                      title={`배치 LAN${mark.note ? ': ' + mark.note : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (layoutMarkMode) return; // in placement mode, don't select
                        setSelectedLayoutMarkId(isSel ? null : mark.id);
                        setSelectedItemId(null);
                        setSelectedDrawingId(null);
                      }}
                    >
                      L
                    </div>
                  );
                })}

            {/* Empty canvas hint */}
            {placedItems.length === 0 && drawingElements.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                  <Grid3X3 size={40} style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ fontSize: '0.875rem' }}>
                    왼쪽 제품 라이브러리에서 장비를 클릭하여 배치하세요
                  </p>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    또는 그리기 도구로 벽·문·기둥을 추가하세요
                  </p>
                </div>
              </div>
            )}
          </div>
          </div>{/* end wrapper */}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          RIGHT SIDEBAR - Properties / Summary
         ════════════════════════════════════════════════════════ */}
      <div
        style={{
          width: 280,
          minWidth: 280,
          background: 'white',
          borderLeft: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '0.75rem',
            borderBottom: '1px solid var(--color-border)',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          {selectedItem
            ? '속성 (장비)'
            : selectedDrawingEl
              ? '속성 (도면 요소)'
              : selectedLayoutMarkId
                ? `속성 (${layoutMarks.find(m => m.id === selectedLayoutMarkId)?.type === 'power' ? '콘센트' : 'LAN'} 마크)`
                : '요약'}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {/* ─── Selected placed item properties ─── */}
          {selectedItem && selectedProduct ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="label">제품명</label>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text)',
                    padding: '0.375rem 0.5rem',
                    background: '#f8fafc',
                    borderRadius: '0.25rem',
                  }}
                >
                  {selectedProduct.name}
                </div>
              </div>

              <div className="form-group">
                <label className="label">모델명</label>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text)',
                    padding: '0.375rem 0.5rem',
                    background: '#f8fafc',
                    borderRadius: '0.25rem',
                  }}
                >
                  {selectedProduct.code}
                </div>
              </div>

              <div className="form-group">
                <label className="label">카테고리</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: CATEGORY_COLORS[selectedProduct.category] || '#6b7280',
                    }}
                  />
                  <span style={{ fontSize: '0.8125rem' }}>{selectedProduct.category}</span>
                </div>
              </div>

              {/* Editable position */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="label">X</label>
                  <input
                    className="input"
                    type="number"
                    value={Math.round(selectedItem.x)}
                    onChange={(e) => {
                      pushHistory();
                      updateItem(selectedItem.id, { x: Number(e.target.value) });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Y</label>
                  <input
                    className="input"
                    type="number"
                    value={Math.round(selectedItem.y)}
                    onChange={(e) => {
                      pushHistory();
                      updateItem(selectedItem.id, { y: Number(e.target.value) });
                    }}
                  />
                </div>
              </div>

              {/* Rotation */}
              <div className="form-group">
                <label className="label">회전 ({selectedItem.rotation}°)</label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={selectedItem.rotation}
                  onChange={(e) => {
                    updateItem(selectedItem.id, { rotation: Number(e.target.value) });
                  }}
                  onMouseDown={() => pushHistory()}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Label */}
              <div className="form-group">
                <label className="label">라벨</label>
                <input
                  className="input"
                  value={selectedItem.label}
                  onChange={(e) => updateItem(selectedItem.id, { label: e.target.value })}
                />
              </div>

              {/* Note */}
              <div className="form-group">
                <label className="label">비고</label>
                <textarea
                  className="input"
                  rows={3}
                  value={selectedItem.note}
                  onChange={(e) => updateItem(selectedItem.id, { note: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Product specs */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  제품 스펙
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.375rem',
                    fontSize: '0.75rem',
                  }}
                >
                  <div>
                    <span style={{ color: '#94a3b8' }}>가로</span>
                    <div style={{ fontWeight: 500 }}>{selectedProduct.width}mm</div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>세로</span>
                    <div style={{ fontWeight: 500 }}>{selectedProduct.depth}mm</div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>높이</span>
                    <div style={{ fontWeight: 500 }}>{selectedProduct.height}mm</div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>전원 필요</span>
                    <div style={{ fontWeight: 500 }}>{selectedProduct.powerRequired}개</div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>LAN 필요</span>
                    <div style={{ fontWeight: 500 }}>{selectedProduct.lanRequired}개</div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => duplicateItem(selectedItem.id)}
                >
                  <Copy size={14} />
                  복제
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => deleteItem(selectedItem.id)}
                >
                  <Trash2 size={14} />
                  삭제
                </button>
              </div>
            </div>

          ) : selectedDrawingEl ? (
            /* ─── Selected drawing element properties ─── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="label">유형</label>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    padding: '0.375rem 0.5rem',
                    background: '#f8fafc',
                    borderRadius: '0.25rem',
                  }}
                >
                  {{
                    wall: '벽',
                    door: '문',
                    column: '기둥',
                    text: '텍스트',
                    zone: '영역',
                  }[selectedDrawingEl.type]}
                </div>
              </div>

              {/* Position */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="label">X</label>
                  <input
                    className="input"
                    type="number"
                    value={Math.round(selectedDrawingEl.x)}
                    onChange={(e) =>
                      updateDrawingElement(selectedDrawingEl.id, { x: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="label">Y</label>
                  <input
                    className="input"
                    type="number"
                    value={Math.round(selectedDrawingEl.y)}
                    onChange={(e) =>
                      updateDrawingElement(selectedDrawingEl.id, { y: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              {/* Size fields for door, column, zone */}
              {(selectedDrawingEl.type === 'door' ||
                selectedDrawingEl.type === 'column' ||
                selectedDrawingEl.type === 'zone') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group">
                    <label className="label">가로 (mm)</label>
                    <input
                      className="input"
                      type="number"
                      value={selectedDrawingEl.width}
                      onChange={(e) =>
                        updateDrawingElement(selectedDrawingEl.id, { width: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">세로 (mm)</label>
                    <input
                      className="input"
                      type="number"
                      value={selectedDrawingEl.height}
                      onChange={(e) =>
                        updateDrawingElement(selectedDrawingEl.id, { height: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Text content */}
              {selectedDrawingEl.type === 'text' && (
                <div className="form-group">
                  <label className="label">텍스트 내용</label>
                  <input
                    className="input"
                    value={selectedDrawingEl.text ?? ''}
                    onChange={(e) =>
                      updateDrawingElement(selectedDrawingEl.id, { text: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Wall length in mm */}
              {selectedDrawingEl.type === 'wall' && (() => {
                const x2 = selectedDrawingEl.x2 ?? selectedDrawingEl.x;
                const y2 = selectedDrawingEl.y2 ?? selectedDrawingEl.y;
                const dx = x2 - selectedDrawingEl.x;
                const dy = y2 - selectedDrawingEl.y;
                const lenPx = Math.sqrt(dx * dx + dy * dy);
                const lenMm = Math.round(lenPx / DRAW_SCALE);
                return (
                  <div className="form-group">
                    <label className="label">
                      길이 (mm) <span style={{ color: '#94a3b8', fontWeight: 400 }}>현재: {lenMm.toLocaleString()}mm</span>
                    </label>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        step={100}
                        defaultValue={lenMm}
                        key={`wall-len-${selectedDrawingEl.id}`}
                        onBlur={(e) => {
                          const newMm = Number(e.target.value);
                          if (!newMm || lenPx === 0) return;
                          const newPx = newMm * DRAW_SCALE;
                          const factor = newPx / lenPx;
                          updateDrawingElement(selectedDrawingEl.id, {
                            x2: selectedDrawingEl.x + dx * factor,
                            y2: selectedDrawingEl.y + dy * factor,
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        placeholder="예: 7000"
                      />
                      <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center', flexShrink: 0 }}>mm</span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>입력 후 Enter 또는 클릭 이탈 시 적용</p>
                  </div>
                );
              })()}

              {/* Note */}
              <div className="form-group">
                <label className="label">비고</label>
                <textarea
                  className="input"
                  rows={3}
                  value={selectedDrawingEl.note}
                  onChange={(e) =>
                    updateDrawingElement(selectedDrawingEl.id, { note: e.target.value })
                  }
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button
                className="btn btn-danger btn-sm"
                onClick={() => deleteDrawingElement(selectedDrawingEl.id)}
              >
                <Trash2 size={14} />
                삭제
              </button>
            </div>

          ) : selectedLayoutMarkId && layoutMarks.find(m => m.id === selectedLayoutMarkId) ? (() => {
            const mark = layoutMarks.find(m => m.id === selectedLayoutMarkId)!;
            const isPower = mark.type === 'power';
            return (
              /* ─── Selected layout mark properties ─── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Type badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '3px',
                    background: isPower ? '#f97316' : '#8b5cf6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.625rem', color: 'white', fontWeight: 700,
                  }}>
                    {isPower ? 'P' : 'L'}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    배치용 {isPower ? '콘센트' : 'LAN 포트'}
                  </span>
                </div>

                {/* Note */}
                <div className="form-group">
                  <label className="label">메모</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={mark.note}
                    onChange={(e) => updateLayoutMark(mark.id, { note: e.target.value })}
                    placeholder="위치 설명, 용도 등"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Photo link */}
                <div className="form-group">
                  <label className="label">사진 링크 (Google Drive)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="input"
                      style={{ flex: 1 }}
                      value={mark.driveLink || ''}
                      onChange={(e) => updateLayoutMark(mark.id, { driveLink: e.target.value })}
                      placeholder="https://drive.google.com/..."
                    />
                    {mark.driveLink && (
                      <a href={mark.driveLink} target="_blank" rel="noreferrer"
                        className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
                        사진보기
                      </a>
                    )}
                  </div>
                </div>

                {/* Position info */}
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  위치: ({Math.round(mark.x)}, {Math.round(mark.y)})
                </div>

                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteLayoutMark(mark.id)}
                >
                  <Trash2 size={14} />
                  마크 삭제
                </button>
              </div>
            );
          })() : (
            /* ─── Summary when nothing selected ─── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Stats */}
              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  배치된 장비 수
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {placedItems.length}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.625rem', color: '#94a3b8' }}>총 전원 필요</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ef4444' }}>
                    <Zap
                      size={14}
                      style={{ display: 'inline', verticalAlign: '-2px', marginRight: '2px' }}
                    />
                    {totalPower}
                  </div>
                </div>
                <div className="card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.625rem', color: '#94a3b8' }}>총 LAN 필요</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#3b82f6' }}>
                    <Network
                      size={14}
                      style={{ display: 'inline', verticalAlign: '-2px', marginRight: '2px' }}
                    />
                    {totalLan}
                  </div>
                </div>
              </div>

              {/* Drawing elements count */}
              {drawingElements.length > 0 && (
                <div className="card" style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.625rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                    도면 요소
                  </div>
                  <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {(['wall', 'door', 'column', 'text', 'zone'] as const).map((t) => {
                      const cnt = drawingElements.filter((e) => e.type === t).length;
                      if (cnt === 0) return null;
                      const labels: Record<string, string> = {
                        wall: '벽', door: '문', column: '기둥', text: '텍스트', zone: '영역',
                      };
                      return (
                        <div key={t} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>{labels[t]}</span>
                          <span style={{ fontWeight: 600 }}>{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category breakdown */}
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                카테고리별 배치
              </div>
              {CATEGORIES.map((cat) => {
                const count = placedItems.filter((item) => {
                  const p = getProduct(item.productId);
                  return p?.category === cat;
                }).length;
                if (count === 0) return null;
                return (
                  <div
                    key={cat}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: CATEGORY_COLORS[cat],
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1 }}>{cat}</span>
                    <span style={{ fontWeight: 600 }}>{count}</span>
                  </div>
                );
              })}

              {/* Warnings */}
              {warnings.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#92400e',
                      marginBottom: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <AlertTriangle size={14} />
                    경고 ({warnings.length})
                  </div>
                  {warnings.map((w, i) => (
                    <div key={i} className="warning-box" style={{ marginBottom: '0.375rem' }}>
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {placedItems.length === 0 && warnings.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem 0' }}>
                  <Info size={24} style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ fontSize: '0.8125rem' }}>왼쪽에서 장비를 선택하여 배치하세요</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
