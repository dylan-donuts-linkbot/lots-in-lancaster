// Reusable status badge component

const STATUS_STYLES: Record<string, string> = {
  for_sale: 'bg-green-100 text-green-800',
  sold: 'bg-gray-200 text-gray-600',
  unknown: 'bg-yellow-100 text-yellow-800',
}

export function StatusBadge({ status }: { status: string | null }) {
  const cls = STATUS_STYLES[status ?? ''] ?? 'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${cls}`}>
      {status ?? 'unknown'}
    </span>
  )
}
