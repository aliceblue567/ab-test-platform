export default function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-medium mb-4">실험 상세</h2>
      <p className="text-slate-600">실험 상세 및 리포트가 여기에 표시됩니다.</p>
    </div>
  );
}
