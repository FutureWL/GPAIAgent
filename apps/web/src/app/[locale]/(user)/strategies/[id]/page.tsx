export default async function StrategyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400">
      <div className="text-4xl mb-4">📈</div>
      <div className="text-lg font-medium text-white mb-2">策略详情</div>
      <div className="text-sm">ID: {id}</div>
    </div>
  );
}
