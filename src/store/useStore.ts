import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User,
  Project,
  Product,
  Dealer,
  EducationLink,
  MasterTemplate,
  AppSettings,
} from '../types';

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

interface AppState {
  // State
  user: User | null;
  projects: Project[];
  products: Product[];
  dealers: Dealer[];
  educationLinks: EducationLink[];
  templates: MasterTemplate[];
  appSettings: AppSettings;
  currentProjectId: string | null;
  currentStep: number;

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

const DEMO_USER: User = {
  id: 'demo-sales-001',
  name: '김영업',
  email: 'demo@paradigm.co.kr',
  role: 'admin', // changed to admin for easier debugging
  dealerId: 'dealer-001',
};

const DEFAULT_INDIVIDUAL_TICKET = {
  enabled: true,
  headerTextKr: '',
  headerTextEn: '',
  noticeTextKr: '',
  noticeTextEn: '',
  pointColor: '#000000',
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: DEMO_USER,
      projects: [],
      products: [],
      dealers: [],
      educationLinks: [],
      templates: [],
      appSettings: DEFAULT_APP_SETTINGS,
      currentProjectId: null,
      currentStep: 0,

      // Auth
      setUser: (user) => set({ user }),

      login: (email: string, _pin: string) => {
        if (_pin === '1234') {
          const isAdmin = email === 'admin@paradigm.co.kr' || email.toLowerCase().startsWith('admin');
          const mockUser: User = {
            id: `user-${Date.now()}`,
            name: email.split('@')[0],
            email,
            role: isAdmin ? 'admin' : 'sales',
          };
          set({ user: mockUser });
          return true;
        }
        return false;
      },

      logout: () =>
        set({
          user: null,
          currentProjectId: null,
          currentStep: 0,
        }),

      // Navigation
      setCurrentProject: (id) => set({ currentProjectId: id, currentStep: 0 }),
      setCurrentStep: (step) => set({ currentStep: step }),

      // Projects
      addProject: (project) =>
        set((state) => ({ projects: [...state.projects, project] })),

      updateProject: (id, partial) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...partial, updatedAt: new Date().toISOString() } : p
          ),
        })),

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProjectId:
            state.currentProjectId === id ? null : state.currentProjectId,
        })),

      duplicateProject: (id) =>
        set((state) => {
          const source = state.projects.find((p) => p.id === id);
          if (!source) return state;
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
          return { projects: [...state.projects, duplicate] };
        }),

      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        return projects.find((p) => p.id === currentProjectId);
      },

      importProjects: (incoming) => {
        let added = 0;
        let updated = 0;
        set((state) => {
          let projects = [...state.projects];
          incoming.forEach((p) => {
            const existingIdx = projects.findIndex((ep) => ep.id === p.id);
            if (existingIdx >= 0) {
              // 기존 프로젝트: 더 최신인 경우만 업데이트 (본사가 설정한 필드는 보존)
              const existing = projects[existingIdx];
              projects[existingIdx] = {
                ...p,
                // 본사가 입력한 설치일 정보는 기존 값 보존
                expectedInstallDate: existing.expectedInstallDate ?? p.expectedInstallDate,
                actualInstallDate: existing.actualInstallDate ?? p.actualInstallDate,
                // 상태가 installed면 기존 유지
                status: existing.status === 'installed' ? existing.status : p.status,
              };
              updated++;
            } else {
              projects.push(p);
              added++;
            }
          });
          return { projects };
        });
        return { added, updated };
      },

      // Products
      addProduct: (product) =>
        set((state) => ({ products: [...state.products, product] })),

      updateProduct: (id, partial) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...partial } : p
          ),
        })),

      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        })),

      // Dealers
      addDealer: (dealer) =>
        set((state) => ({ dealers: [...state.dealers, dealer] })),

      updateDealer: (id, partial) =>
        set((state) => ({
          dealers: state.dealers.map((d) =>
            d.id === id ? { ...d, ...partial } : d
          ),
        })),

      deleteDealer: (id) =>
        set((state) => ({
          dealers: state.dealers.filter((d) => d.id !== id),
        })),

      // Education Links
      addEducationLink: (link) =>
        set((state) => ({ educationLinks: [...state.educationLinks, link] })),

      updateEducationLink: (id, partial) =>
        set((state) => ({
          educationLinks: state.educationLinks.map((l) =>
            l.id === id ? { ...l, ...partial } : l
          ),
        })),

      deleteEducationLink: (id) =>
        set((state) => ({
          educationLinks: state.educationLinks.filter((l) => l.id !== id),
        })),

      // Templates
      saveTemplateDraft: (template) =>
        set((state) => {
          const exists = state.templates.find((t) => t.id === template.id);
          if (exists) {
            return {
              templates: state.templates.map((t) =>
                t.id === template.id ? { ...t, ...template, updatedAt: new Date().toISOString() } : t
              ),
            };
          }
          return {
            templates: [...state.templates, { ...template, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
          };
        }),

      publishMasterTemplate: (id, authorName) =>
        set((state) => {
          const target = state.templates.find((t) => t.id === id);
          if (!target) return state;

          // Find current highest version
          const published = state.templates.filter((t) => t.status === 'published');
          const maxVersion = published.reduce((max, t) => Math.max(max, t.version), 0);
          const newVersion = maxVersion + 1;

          return {
            templates: state.templates.map((t) => {
              // Archive existing published
              if (t.status === 'published') return { ...t, status: 'archived', updatedAt: new Date().toISOString() };
              // Publish target
              if (t.id === id) return { ...t, status: 'published', version: newVersion, author: authorName, updatedAt: new Date().toISOString() };
              return t;
            }),
          };
        }),

      updateAppSettings: (partial) =>
        set((state) => ({
          appSettings: { ...state.appSettings, ...partial },
        })),
    }),
    {
      name: 'paradigm-studio-v2',
      migrate: (persistedState: any, version: number) => {
        let state = persistedState as any;
        if (version < 2) {
          console.warn('Migration v2: resetting projects/templates.');
          state = { ...state, projects: [], templates: [], checklistTemplates: undefined };
        }
        if (version < 3) {
          // Restore admin role for demo and admin accounts without losing project data
          if (state.user && (
            state.user.email === 'demo@paradigm.co.kr' ||
            state.user.email?.toLowerCase().startsWith('admin')
          )) {
            state = { ...state, user: { ...state.user, role: 'admin' } };
          }
        }
        if (version < 4) {
          // Add appSettings default if missing
          if (!state.appSettings) {
            state = { ...state, appSettings: DEFAULT_APP_SETTINGS };
          }
        }
        return state;
      },
      version: 4,
    }
  )
);

// Always correct admin role after hydration — runs after localStorage sync completes.
// This catches cases where the persist version migration didn't fire (e.g. stale cache).
setTimeout(() => {
  const { user } = useStore.getState();
  if (!user) return;
  const email = user.email ?? '';
  if (
    (email === 'demo@paradigm.co.kr' || email.toLowerCase().startsWith('admin')) &&
    user.role !== 'admin'
  ) {
    useStore.setState({ user: { ...user, role: 'admin' } });
  }
}, 0);
