export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-muted animate-spin border-t-primary"></div>
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading...</p>
      </div>
    </div>
  );
}
