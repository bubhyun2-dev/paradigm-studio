import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import type {
  Project,
  Dealer,
  Product,
  MasterTemplate,
  AppSettings,
  EducationLink,
} from '../types';

// ─── App Settings ──────────────────────────────────────────────────
const appSettingsRef = () => doc(db, 'settings', 'app');

export async function fetchAppSettings(): Promise<AppSettings | null> {
  const snap = await getDoc(appSettingsRef());
  return snap.exists() ? (snap.data() as AppSettings) : null;
}
export const saveAppSettings = (s: AppSettings) =>
  setDoc(appSettingsRef(), s).catch(console.error);

// ─── Dealers ───────────────────────────────────────────────────────
export async function fetchDealers(): Promise<Dealer[]> {
  const snap = await getDocs(collection(db, 'dealers'));
  return snap.docs.map((d) => d.data() as Dealer);
}
export const saveDealer = (d: Dealer) =>
  setDoc(doc(db, 'dealers', d.id), d).catch(console.error);
export const deleteDealerDb = (id: string) =>
  deleteDoc(doc(db, 'dealers', id)).catch(console.error);

// ─── Products ──────────────────────────────────────────────────────
export async function fetchProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, 'products'));
  return snap.docs.map((d) => d.data() as Product);
}
export const saveProduct = (p: Product) =>
  setDoc(doc(db, 'products', p.id), p).catch(console.error);
export const deleteProductDb = (id: string) =>
  deleteDoc(doc(db, 'products', id)).catch(console.error);

// ─── Education Links ───────────────────────────────────────────────
export async function fetchEducationLinks(): Promise<EducationLink[]> {
  const snap = await getDocs(collection(db, 'educationLinks'));
  return snap.docs.map((d) => d.data() as EducationLink);
}
export const saveEducationLink = (l: EducationLink) =>
  setDoc(doc(db, 'educationLinks', l.id), l).catch(console.error);
export const deleteEducationLinkDb = (id: string) =>
  deleteDoc(doc(db, 'educationLinks', id)).catch(console.error);

// ─── Templates ─────────────────────────────────────────────────────
export async function fetchTemplates(): Promise<MasterTemplate[]> {
  const snap = await getDocs(collection(db, 'templates'));
  return snap.docs.map((d) => d.data() as MasterTemplate);
}
export const saveTemplate = (t: MasterTemplate) =>
  setDoc(doc(db, 'templates', t.id), t).catch(console.error);

// ─── Projects ──────────────────────────────────────────────────────
export async function fetchProjects(dealerId?: string): Promise<Project[]> {
  const q = dealerId
    ? query(
        collection(db, 'projects'),
        where('salesProfile.dealerId', '==', dealerId),
      )
    : collection(db, 'projects');
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Project);
}

export function watchProjects(
  dealerId: string | undefined,
  onChange: (projects: Project[]) => void,
): () => void {
  const q = dealerId
    ? query(
        collection(db, 'projects'),
        where('salesProfile.dealerId', '==', dealerId),
      )
    : collection(db, 'projects');
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => d.data() as Project)),
    console.error,
  );
}

export const saveProject = (p: Project) =>
  setDoc(doc(db, 'projects', p.id), p).catch(console.error);
export const deleteProjectDb = (id: string) =>
  deleteDoc(doc(db, 'projects', id)).catch(console.error);
