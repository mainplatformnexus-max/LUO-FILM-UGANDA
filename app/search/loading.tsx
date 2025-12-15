export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#141414]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-gray-600 dark:text-gray-400">Loading search results...</p>
      </div>
    </div>
  )
}
