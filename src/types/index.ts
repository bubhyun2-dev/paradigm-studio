export type ProjectStatus =
  | 'draft'
  | 'field_survey_complete'
  | 'layout_in_progress'
  | 'proposal_ready'
  | 'confirmed'
  | 'installation_pending'
  | 'installed';

export type HospitalType = '상급종합병원' | '종합병원' | '병원' | '의원' | '기타';

export type TicketType = '자동접수' | '수동접수' | '환자정보없음' | '미수납' | '처방없음';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'sales' | 'installer' | 'viewer';
  dealerId?: string;
}

export interface Dealer {
  id: string;
  name: string;
  region: string;
  contact: string;
  phone: string;
  email: string;
  active?: boolean; // soft-delete: false = inactive
  driveFolderUrl?: string; // 구글 드라이브 시방서 폴더 URL
  accessCode?: string;     // 대리점 접근 코드 (로그인 PIN)
}

export interface AppSettings {
  appName: string;           // 앱 이름 (헤더 표시)
  companyName: string;       // 회사명
  adminPin: string;          // 관리자 PIN
  defaultRegions: string[];  // 지역 선택 옵션
  noticeMessage: string;     // 대시보드 공지 메시지
  hqDriveFolderUrl: string;  // 본사 집계 드라이브 폴더
  // 각 스텝 안내 문구
  step00Notice: string;
  step01Notice: string;
  step02Notice: string;
  step09Notice: string;
  step10Notice: string;
  step11Notice: string;
}

export interface HospitalProfile {
  hospitalName: string;
  hospitalType: HospitalType;
  region: string;
  address: string;
  dailyPatientCount: number;
  contactName: string;
  contactTitle: string;
  contactPhone: string;
  contactEmail: string;
}

export interface SalesProfile {
  dealerId: string;
  dealerName: string;
  salesRepName: string;
  salesRepEmail: string;
  salesRepPhone: string;
  sticky: boolean;
  createdDate: string;
  firstMeetingDate: string;
  memo: string;
}

export interface SiteInfo {
  ceilingHeight: string;
  doorWidth: string;
  elevatorAvailable: boolean;
  entryRoute: string;
  wallMaterial: string;
  floorCondition: string;
  existingPowerDesc: string;
  existingLanDesc: string;
  restrictions: string;
}

export interface SitePhoto {
  id: string;
  dataUrl?: string;   // legacy base64 (deprecated — use driveLink)
  url?: string;       // legacy object URL (session only)
  driveLink?: string; // 구글 드라이브 링크 (권장)
  title: string;
  note: string;
}

export interface DrawingElement {
  id: string;
  type: 'wall' | 'door' | 'column' | 'text' | 'zone';
  x: number;       // start X in canvas coords
  y: number;       // start Y
  x2?: number;     // end X  (wall)
  y2?: number;     // end Y  (wall)
  width: number;   // wall thickness | door width | column width | zone width
  height: number;  // column depth   | zone height | (wall uses width only)
  text?: string;   // text label content
  rotation: number;
  note: string;
  color?: string;
}

export interface InfraMarkLink {
  id: string;
  title: string;
  url: string;
  description: string;
}

export interface InfraMark {
  id: string;
  type: string; // 'power', 'lan', 'did', 'kiosk', 'desk', or custom
  label?: string; // used for custom items
  x: number;
  y: number;
  note: string;
  links?: InfraMarkLink[];
}

export interface LayoutMark {
  id: string;
  type: 'power' | 'lan';
  x: number;
  y: number;
  note: string;
  driveLink?: string;
  links?: InfraMarkLink[];
}

export interface ProductShape {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  width: number;
  depth: number;
  height: number;
  footprint: string;
  workArea: string;
  maintenanceArea: string;
  powerRequired: number;
  lanRequired: number;
  installDirection: string;
  serviceDirection: string;
  memo: string;
  image?: string;
  topViewImage?: string;
  tags: string[];
  version: string;
  active: boolean;
  shapes?: ProductShape[]; // Array of rects replacing single size for layout
}

export interface PlacedItem {
  id: string;
  productId: string;
  x: number;
  y: number;
  rotation: number;
  label: string;
  note: string;
}

export interface ExceptionItem {
  id: string;
  name: string;
  memo: string;
  linkTitle?: string;
  linkUrl?: string;
}

export interface WorkflowSettings {
  useReceptionDesk: boolean;
  useAutoRegistration: boolean;
  verificationMethod: string[];
  maskResidentNumber: boolean;
  allowUnpaidTicket: boolean;
  unpaidMemo: string;
  unpaidLinkTitle?: string;
  unpaidLinkUrl?: string;
  allowNoPrescriptionTicket?: boolean;
  noPrescriptionMemo?: string;
  noPrescriptionLinkTitle?: string;
  noPrescriptionLinkUrl?: string;
  exceptions: ExceptionItem[];
  autoRegistrationConditions?: string;
  manualCheckConditions?: string;
  exceptionMemo?: string;
}

export interface DidSettings {
  callingMethod: 'did_voice' | 'did_only';
  maskName: boolean;
  deskCount: number;
  layoutMode: 'standard' | 'split';
  rightPanelText?: string;
  rightPanelImageUrl?: string;
}

export interface IndividualTicketSetting {
  enabled: boolean;
  headerTextKr: string;
  headerTextEn: string;
  noticeTextKr: string;
  noticeTextEn: string;
  pointColor: string;
}

export interface TicketSettings {
  useReceptionDesk: boolean;
  useAutoRegistration: boolean;
  twoHeadColorMode: 'A' | 'B' | 'C';
  paperBackgroundColor: string;
  pointColor: string;
  multiLanguage: boolean;
  showHospitalLogo: boolean;
  showPrintDateTime: boolean;
  showEstimatedWaitTime: boolean;
  showWaitingCount: boolean;
  paperEmptyWarningThreshold: number;
  hospitalProfileName?: string;
  topLineText?: string;   // 최상단 독립 문구 (1번째 줄), global, not per-ticket

  bloodTicket: IndividualTicketSetting;
  receptionTicket: IndividualTicketSetting;
  unpaidTicket: IndividualTicketSetting;
  noPrescriptionTicket: IndividualTicketSetting;
  noPatientTicket: IndividualTicketSetting;
}

export interface ComponentInstance {
  id: string;
  ip: string;
  macAddress?: string;
  firmwareVersion: string;
  softwareVersion: string;
  hardwareVersion: string;
}

export interface ComponentItem {
  id: string;
  category: string;
  productName: string;
  model: string;
  quantity: number;
  note: string;
  instances?: ComponentInstance[];
}

export interface TubeSlot {
  slot: number;
  tubeType: string;
}

export interface ContactRow {
  id: string;
  department: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  priority: boolean;
}

export interface ChecklistItem {
  id: string;
  title: string;
  done: boolean;
  note: string;
  exampleLinkUrl?: string; // NEW
  driveLink: string;
  driveUploadDone: boolean;
  subform?: Record<string, any>;
  expanded: boolean;
  isTemplateItem?: boolean;
}

export interface TeamOutputSet {
  id: string;
  teamName: string;
  selectedSections: string[];
}

export interface MasterTemplate {
  id: string;
  name: string;
  description: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  author: string;
  createdAt: string;
  updatedAt: string;
  workflowSettings: WorkflowSettings;
  didSettings: DidSettings;
  ticketSettings: TicketSettings;
  baseComponents: ComponentItem[];
  phase1Items: ChecklistItem[];
  phase2Items: ChecklistItem[];
  teamOutputSets?: TeamOutputSet[]; // NEW
}

export interface VersionRecord {
  id: string;
  name: string;
  isFinal: boolean;
  placedItems: PlacedItem[];
  infraMarks: InfraMark[];
  createdAt: string;
}

export interface Project {
  id: string;
  hospitalProfile: HospitalProfile;
  salesProfile: SalesProfile;
  siteInfo: SiteInfo;
  sitePhotos: SitePhoto[];
  infraMarks: InfraMark[];
  layoutMarks: LayoutMark[];
  placedItems: PlacedItem[];
  drawingElements: DrawingElement[];
  workflowSettings: WorkflowSettings;
  didSettings: DidSettings;
  ticketSettings: TicketSettings;
  components: ComponentItem[];
  tubeSlots: TubeSlot[];
  contacts: ContactRow[];
  phase1Items: ChecklistItem[];
  phase2Items: ChecklistItem[];
  teamOutputSets?: TeamOutputSet[]; // NEW
  versions: VersionRecord[];
  assetLinks: AssetLink[];
  step03Notes?: EquipmentNote[];
  currentVersionId: string;
  templateVersionId?: string;
  templateVersionName?: string;
  createdFromPublishedMaster?: boolean;
  
  // Import metadata
  importedFromProjectId?: string;
  importedFromTemplateVersion?: string;
  importedAt?: string;
  importedFromFileType?: 'html' | 'json';
  importMode?: 'clone';

  status: ProjectStatus;
  completedSteps: number[];
  floorPlanUrl: string;        // legacy
  floorPlanDataUrl: string;    // base64 data URL of floor plan image
  floorPlanRotation: number;   // degrees
  floorPlanOpacity: number;    // 0.0 – 1.0
  floorPlanScale: number;      // mm per pixel (calibration)
  expectedInstallDate?: string;  // 예상 설치일 (YYYY-MM-DD) — 본사 입력
  actualInstallDate?: string;    // 실제 설치일 (YYYY-MM-DD) — 설치완료 시 기록
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  projectId: string;
  hospitalName: string;
  hospitalRegion: string;
  dealerId: string;
  templateVersionId: string;
  templateVersionName: string;
  status: ProjectStatus;
  phase1Progress: number;
  phase2Progress: number;
  placedItemsCount: number;
  expectedInstallDate?: string;
  updatedAt: string;
}

export interface AssetLink {
  id: string;
  title: string;
  url: string;
  assetType: 'photo_pre' | 'photo_post' | 'education' | 'example' | 'drawing' | 'print' | 'original_html' | 'original_json' | 'other';
  assetCategory: string; // e.g. 용지설정 예시, 시설팀 전달 도면
  description: string;
  createdBy: string;
  createdAt: string;
  isSharedAsset: boolean;
  projectId?: string;
}

export interface EquipmentNote {
  id: string;
  productLabel: string;
  description: string;
  photoUrl: string;
  linkTitle: string;
  linkUrl: string;
}

export interface EducationLink {
  id: string;
  title: string;
  url: string;
  category: string;
}

export interface ChecklistTemplate {
  id: string;
  phase: 1 | 2;
  title: string;
  items: ChecklistItem[];
}
