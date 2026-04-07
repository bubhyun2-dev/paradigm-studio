import {
  Building2,
  LayoutGrid,
  MonitorCog,
  ClipboardList,
  MonitorSpeaker,
  Ticket,
  Package,
  Contact,
  ListChecks,
  ListTodo,
  FileText,
} from 'lucide-react';
import { useStore } from '../store/useStore';

const STEPS = [
  { num: 0, title: '병원 정보', icon: Building2 },
  { num: 2, title: '장비 배치', icon: LayoutGrid },
  { num: 3, title: '시스템 이해', icon: MonitorCog },
  { num: 4, title: '접수 방식', icon: ClipboardList },
  { num: 5, title: '호출 · DID', icon: MonitorSpeaker },
  { num: 6, title: '용지 설정', icon: Ticket },
  { num: 7, title: '구성품 확정', icon: Package },
  { num: 8, title: '부서별 연락처', icon: Contact },
  { num: 9, title: 'Phase 1', icon: ListChecks },
  { num: 10, title: 'Phase 2', icon: ListTodo },
  { num: 11, title: '요약서 / 출력', icon: FileText },
] as const;

export default function StepSidebar() {
  const currentStep = useStore((s) => s.currentStep);
  const setCurrentStep = useStore((s) => s.setCurrentStep);
  const getCurrentProject = useStore((s) => s.getCurrentProject);

  const project = getCurrentProject();
  const completedSteps = project?.completedSteps ?? [];
  const completedCount = completedSteps.length;

  return (
    <aside
      className="no-print shrink-0 border-r border-border bg-white flex flex-col overflow-y-auto"
      style={{ width: 220 }}
    >
      {/* Progress indicator */}
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center justify-between text-xs text-text-secondary mb-1.5">
          <span className="font-medium">진행 상태</span>
          <span>{completedCount}/11 완료</span>
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${(completedCount / 11) * 100}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <nav className="flex-1 p-2 flex flex-col gap-0.5">
        {STEPS.map((step) => {
          const isActive = currentStep === step.num;
          const isCompleted = completedSteps.includes(step.num);
          const Icon = step.icon;

          return (
            <button
              key={step.num}
              onClick={() => setCurrentStep(step.num)}
              className={`step-nav-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            >
              <span className="step-dot" />
              <Icon size={14} className="shrink-0 opacity-60" />
              <span className="truncate">
                <span className="text-text-muted mr-1">
                  {String(step.num).padStart(2, '0')}
                </span>
                {step.title}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
