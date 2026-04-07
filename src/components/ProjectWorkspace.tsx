import { useEffect, lazy, Suspense, type ComponentType } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import StepSidebar from './StepSidebar';

// Attempt to import step components; fall back to placeholder if not yet created
const stepModules: Record<number, () => Promise<{ default: ComponentType }>> = {
  0: () => import('../pages/Step00HospitalInfo'),
  1: () => import('../pages/Step01Drawing'),
  2: () => import('../pages/Step02Layout'),
  3: () => import('../pages/Step03System'),
  4: () => import('../pages/Step04Reception'),
  5: () => import('../pages/Step05Did'),
  6: () => import('../pages/Step06Ticket'),
  7: () => import('../pages/Step07Components'),
  8: () => import('../pages/Step08Contacts'),
  9: () => import('../pages/Step09Phase1'),
  10: () => import('../pages/Step10Phase2'),
  11: () => import('../pages/Step11Summary'),
};

const STEP_TITLES = [
  '병원 정보',
  '도면 업로드',
  '장비 배치',
  '시스템 이해',
  '접수 방식',
  '호출 · DID',
  '용지 설정',
  '구성품 확정',
  '부서별 연락처',
  'Phase 1',
  'Phase 2',
  '요약서 / 출력',
];

function StepPlaceholder({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-text-secondary gap-3">
      <div className="text-4xl font-bold opacity-20">
        {String(step).padStart(2, '0')}
      </div>
      <div className="text-sm">{STEP_TITLES[step] ?? `Step ${step}`}</div>
      <div className="text-xs opacity-60">이 단계는 아직 준비 중입니다.</div>
    </div>
  );
}

function buildStepComponent(step: number): ComponentType {
  if (!stepModules[step]) {
    return () => <StepPlaceholder step={step} />;
  }

  const LazyStep = lazy(() =>
    stepModules[step]().catch(() => ({
      default: () => <StepPlaceholder step={step} />,
    })),
  );

  return () => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full text-text-muted text-sm">
          불러오는 중...
        </div>
      }
    >
      <LazyStep />
    </Suspense>
  );
}

export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const setCurrentProject = useStore((s) => s.setCurrentProject);
  const currentStep = useStore((s) => s.currentStep);

  useEffect(() => {
    if (id) setCurrentProject(id);
    return () => setCurrentProject(null);
  }, [id, setCurrentProject]);

  const StepComponent = buildStepComponent(currentStep);

  return (
    <div className="flex flex-1 workspace-outer" style={{ height: 'calc(100vh - 56px)' }}>
      <StepSidebar />
      <div className="flex-1 overflow-y-auto bg-bg p-6 workspace-content">
        <StepComponent />
      </div>
    </div>
  );
}
