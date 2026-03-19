import { ExperimentCreateForm } from "@/components/admin/experiment-form/experiment-create-form";

export default function PlannerPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">새 실험 만들기</h1>
        <p className="text-muted-foreground">
          사용자에게 어떤 화면을 보여주고, 어떤 행동 차이를 확인할지 설정하세요.
        </p>
      </div>
      <ExperimentCreateForm />
    </div>
  );
}
