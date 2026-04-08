import { create } from 'zustand';
import type {
  User,
  Project,
  Product,
  Dealer,
  EducationLink,
  MasterTemplate,
  AppSettings,
} from '../types';
import {
  fetchAppSettings,
  saveAppSettings,
  fetchDealers,
  saveDealer,
  deleteDealerDb,
  fetchProducts,
  saveProduct,
  deleteProductDb,
  fetchEducationLinks,
  saveEducationLink,
  deleteEducationLinkDb,
  fetchTemplates,
  saveTemplate,
  watchProjects,
  saveProject,
  deleteProjectDb,
} from '../lib/db';

// ─── 기본 앱 설정 ──────────────────────────────────────────────────
const DEFAULT_APP_SETTINGS: AppSettings = {
  appName: 'Paradigm Studio',
  companyName: 'AT Solutions',
  adminPin: '1234',
  defaultRegions: ['수도권', '충청도', '경상남도', '경상북도', '전라남도', '제주도'],
  noticeMessage: '',
  hqDriveFolderUrl: '',
  step00Notice: '',
  step01Notice: '',
  step02Notice: '',
  step09Notice: '',
  step10Notice: '',
  step11Notice: '',
};

// 실시간 리스너 언서브스크라이브 함수 (모듈 수준 보관)
let unsubscribeProjects: (() => void) | null = null;

// ─── 타입 ──────────────────────────────────────────────────────────
interface AppState {
  // 로딩 상태
  isLoading: boolean;
  isInitialized: boolean;

  // 데이터
  user: User | null;
  projects: Project[];
  products: Product[];
  dealers: Dealer[];
  educationLinks: EducationLink[];
  templates: MasterTemplate[];
  appSettings: AppSettings;
  currentProjectId: string | null;
  currentStep: number;

  // 초기화
  initializeApp: () => Promise<void>;
  loadAllData: (dealerId?: string) => Promise<void>;

  // Auth
  setUser: (user: User | null) => void;
  login: (email: string, pin: string) => boolean;
  logout: () => void;

  // Navigation
  setCurrentProject: (id: string | null) => void;
  setCurrentStep: (step: number) => void;

  // Projects
  addProject: (project: Project) => void;
  updateProject: (id: string, partial: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  getCurrentProject: () => Project | undefined;
  importProjects: (incoming: Project[]) => { added: number; updated: number };

  // Products
  addProduct: (product: Product) => void;
  updateProduct: (id: string, partial: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Dealers
  addDealer: (dealer: Dealer) => void;
  updateDealer: (id: string, partial: Partial<Dealer>) => void;
  deleteDealer: (id: string) => void;

  // Education Links
  addEducationLink: (link: EducationLink) => void;
  updateEducationLink: (id: string, partial: Partial<EducationLink>) => void;
  deleteEducationLink: (id: string) => void;

  // Templates
  saveTemplateDraft: (template: MasterTemplate) => void;
  publishMasterTemplate: (id: string, authorName: string) => void;

  // App Settings
  updateAppSettings: (partial: Partial<AppSettings>) => void;
}

// ─── Store ─────────────────────────────────────────────────────────
export const useStore = create<AppState>()((set, get) => ({
  isLoading: false,
  isInitialized: false,
  user: null,
  projects: [],
  products: [],
  dealers: [],
  educationLinks: [],
  templates: [],
  appSettings: DEFAULT_APP_SETTINGS,
  currentProjectId: null,
  currentStep: 0,

  // ── 앱 초기화: 로그인 전에 설정/대리점 로드 ──────────────────────
  initializeApp: async () => {
    set({ isLoading: true });
    try {
      const [settings, dealers] = await Promise.all([
        fetchAppSettings(),
        fetchDealers(),
      ]);

      const patch: Partial<AppState> = {
        isInitialized: true,
        isLoading: false,
        dealers: dealers.length > 0 ? dealers : [],
      };
      if (settings) patch.appSettings = settings;
      set(patch);

      // 세션 복구: localStorage에 저장된 사용자가 있으면 자동 로그인
      const saved = localStorage.getItem('paradigm-user');
      if (saved) {
        try {
          const user: User = JSON.parse(saved);
          set({ user });
          await get().loadAllData(user.role === 'admin' ? undefined : user.dealerId);
        } catch {
          localStorage.removeItem('paradigm-user');
        }
      }
    } catch (e) {
      console.error('Firebase 초기화 오류:', e);
      set({ isInitialized: true, isLoading: false });
    }
  },

  // ── 로그인 후 전체 데이터 로드 + 실시간 리스너 ───────────────────
  loadAllData: async (dealerId?: string) => {
    set({ isLoading: true });
    try {
      const [products, templates, educationLinks] = await Promise.all([
        fetchProducts(),
        fetchTemplates(),
        fetchEducationLinks(),
      ]);
      set({ products, templates, educationLinks, isLoading: false });

      // 기존 리스너 정리 후 새 리스너 등록
      if (unsubscribeProjects) {
        unsubscribeProjects();
        unsubscribeProjects = null;
      }
      unsubscribeProjects = watchProjects(dealerId, (projects) => {
        useStore.setState({ projects });
      });
    } catch (e) {
      console.error('데이터 로드 오류:', e);
      set({ isLoading: false });
    }
  },

  // ── Auth ─────────────────────────────────────────────────────────
  setUser: (user) => set({ user }),

  login: (email, pin) => {
    const { appSettings, dealers } = get();

    // 관리자 로그인
    if (
      (email.toLowerCase().startsWith('admin') || email === 'admin@paradigm.co.kr') &&
      pin === appSettings.adminPin
    ) {
      const user: User = {
        id: 'admin-001',
        name: '관리자',
        email,
        role: 'admin',
      };
      set({ user });
      localStorage.setItem('paradigm-user', JSON.stringify(user));
      get().loadAllData(undefined);
      return true;
    }

    // 대리점 로그인 (이메일 + 접근코드)
    const dealer = dealers.find(
      (d) => d.email === email && d.accessCode === pin && d.active !== false,
    );
    if (dealer) {
      const user: User = {
        id: dealer.id,
        name: dealer.name,
        email,
        role: 'sales',
        dealerId: dealer.id,
      };
      set({ user });
      localStorage.setItem('paradigm-user', JSON.stringify(user));
      get().loadAllData(dealer.id);
      return true;
    }

    return false;
  },

  logout: () => {
    if (unsubscribeProjects) {
      unsubscribeProjects();
      unsubscribeProjects = null;
    }
    localStorage.removeItem('paradigm-user');
    set({
      user: null,
      projects: [],
      products: [],
      templates: [],
      educationLinks: [],
      currentProjectId: null,
      currentStep: 0,
    });
  },

  // ── Navigation ───────────────────────────────────────────────────
  setCurrentProject: (id) => set({ currentProjectId: id, currentStep: 0 }),
  setCurrentStep: (step) => set({ currentStep: step }),

  // ── Projects ─────────────────────────────────────────────────────
  addProject: (project) => {
    set((state) => ({ projects: [...state.projects, project] }));
    saveProject(project);
  },

  updateProject: (id, partial) => {
    let updated: Project | null = null;
    set((state) => {
      const projects = state.projects.map((p) => {
        if (p.id !== id) return p;
        const u = { ...p, ...partial, updatedAt: new Date().toISOString() };
        updated = u;
        return u;
      });
      return { projects };
    });
    if (updated) saveProject(updated);
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
    }));
    deleteProjectDb(id);
  },

  duplicateProject: (id) => {
    const source = get().projects.find((p) => p.id === id);
    if (!source) return;
    const now = new Date().toISOString();
    const duplicate: Project = {
      ...structuredClone(source),
      id: `proj-${Date.now()}`,
      hospitalProfile: {
        ...source.hospitalProfile,
        hospitalName: `${source.hospitalProfile.hospitalName} (복사본)`,
      },
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ projects: [...state.projects, duplicate] }));
    saveProject(duplicate);
  },

  getCurrentProject: () => {
    const { projects, currentProjectId } = get();
    return projects.find((p) => p.id === currentProjectId);
  },

  importProjects: (incoming) => {
    let added = 0;
    let updated = 0;
    const toSave: Project[] = [];

    set((state) => {
      let projects = [...state.projects];
      incoming.forEach((p) => {
        const existingIdx = projects.findIndex((ep) => ep.id === p.id);
        if (existingIdx >= 0) {
          const existing = projects[existingIdx];
          const merged: Project = {
            ...p,
            expectedInstallDate: existing.expectedInstallDate ?? p.expectedInstallDate,
            actualInstallDate: existing.actualInstallDate ?? p.actualInstallDate,
            status: existing.status === 'installed' ? existing.status : p.status,
          };
          projects[existingIdx] = merged;
          toSave.push(merged);
          updated++;
        } else {
          projects.push(p);
          toSave.push(p);
          added++;
        }
      });
      return { projects };
    });

    toSave.forEach(saveProject);
    return { added, updated };
  },

  // ── Products ─────────────────────────────────────────────────────
  addProduct: (product) => {
    set((state) => ({ products: [...state.products, product] }));
    saveProduct(product);
  },

  updateProduct: (id, partial) => {
    let updated: Product | null = null;
    set((state) => {
      const products = state.products.map((p) => {
        if (p.id !== id) return p;
        const u = { ...p, ...partial };
        updated = u;
        return u;
      });
      return { products };
    });
    if (updated) saveProduct(updated);
  },

  deleteProduct: (id) => {
    set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
    deleteProductDb(id);
  },

  // ── Dealers ──────────────────────────────────────────────────────
  addDealer: (dealer) => {
    set((state) => ({ dealers: [...state.dealers, dealer] }));
    saveDealer(dealer);
  },

  updateDealer: (id, partial) => {
    let updated: Dealer | null = null;
    set((state) => {
      const dealers = state.dealers.map((d) => {
        if (d.id !== id) return d;
        const u = { ...d, ...partial };
        updated = u;
        return u;
      });
      return { dealers };
    });
    if (updated) saveDealer(updated);
  },

  deleteDealer: (id) => {
    set((state) => ({ dealers: state.dealers.filter((d) => d.id !== id) }));
    deleteDealerDb(id);
  },

  // ── Education Links ───────────────────────────────────────────────
  addEducationLink: (link) => {
    set((state) => ({ educationLinks: [...state.educationLinks, link] }));
    saveEducationLink(link);
  },

  updateEducationLink: (id, partial) => {
    let updated: EducationLink | null = null;
    set((state) => {
      const educationLinks = state.educationLinks.map((l) => {
        if (l.id !== id) return l;
        const u = { ...l, ...partial };
        updated = u;
        return u;
      });
      return { educationLinks };
    });
    if (updated) saveEducationLink(updated);
  },

  deleteEducationLink: (id) => {
    set((state) => ({
      educationLinks: state.educationLinks.filter((l) => l.id !== id),
    }));
    deleteEducationLinkDb(id);
  },

  // ── Templates ─────────────────────────────────────────────────────
  saveTemplateDraft: (template) => {
    let toSave: MasterTemplate | null = null;
    set((state) => {
      const exists = state.templates.find((t) => t.id === template.id);
      if (exists) {
        const updated = {
          ...template,
          updatedAt: new Date().toISOString(),
        };
        toSave = updated;
        return {
          templates: state.templates.map((t) =>
            t.id === template.id ? updated : t,
          ),
        };
      }
      const newT = {
        ...template,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      toSave = newT;
      return { templates: [...state.templates, newT] };
    });
    if (toSave) saveTemplate(toSave);
  },

  publishMasterTemplate: (id, authorName) => {
    set((state) => {
      const target = state.templates.find((t) => t.id === id);
      if (!target) return state;
      const published = state.templates.filter((t) => t.status === 'published');
      const maxVersion = published.reduce((max, t) => Math.max(max, t.version), 0);
      const newVersion = maxVersion + 1;
      const templates = state.templates.map((t) => {
        if (t.status === 'published') {
          const archived = { ...t, status: 'archived' as const, updatedAt: new Date().toISOString() };
          saveTemplate(archived);
          return archived;
        }
        if (t.id === id) {
          const pub = {
            ...t,
            status: 'published' as const,
            version: newVersion,
            author: authorName,
            updatedAt: new Date().toISOString(),
          };
          saveTemplate(pub);
          return pub;
        }
        return t;
      });
      return { templates };
    });
  },

  // ── App Settings ──────────────────────────────────────────────────
  updateAppSettings: (partial) => {
    let updated: AppSettings | null = null;
    set((state) => {
      const appSettings = { ...state.appSettings, ...partial };
      updated = appSettings;
      return { appSettings };
    });
    if (updated) saveAppSettings(updated);
  },
}));
