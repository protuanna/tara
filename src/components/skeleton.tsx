/**
 * Loading-placeholder block. Paired with each route's `loading.tsx` — Next
 * treats that file as a Suspense boundary around `page.tsx`, so the shell
 * (header/bottom nav/this skeleton) paints immediately while the Server
 * Component's Supabase queries are still running, then streams the real
 * content in to replace it. No client-side fetch/useEffect needed.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-line ${className}`} />;
}
