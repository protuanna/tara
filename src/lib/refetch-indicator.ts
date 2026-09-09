// Tiny pub/sub singletons so `useApiGet` (called independently from many
// components) can report background-fetch activity to one shared
// <ResumeToast>, without pulling in a state library for a couple of
// booleans. Module-level state is fine here — one browser tab per user,
// both sides only ever touch this from client components.

type CountListener = (activeCount: number) => void;
type ResumeListener = () => void;

let activeCount = 0;
const countListeners = new Set<CountListener>();
const resumeListeners = new Set<ResumeListener>();

// A quick app-switch (checking a notification, unlocking the screen) fires
// the same visibilitychange transition as the real iOS-PWA-suspend case
// this resume-refetch exists for, but doesn't need one — only refetch if
// the page was actually hidden for a while.
const RESUME_MIN_HIDDEN_MS = 20_000;
let hiddenAt: number | null = null;

/** Call when the page becomes hidden (see useApiGet's visibilitychange handler). */
export function markHidden(): void {
  hiddenAt = Date.now();
}

/** Whether the page was hidden long enough to be worth a resume-refetch. */
export function wasHiddenLongEnough(): boolean {
  return hiddenAt !== null && Date.now() - hiddenAt >= RESUME_MIN_HIDDEN_MS;
}

/** Call when a background revalidation (data already on screen) starts. */
export function beginRefetch(): void {
  activeCount += 1;
  countListeners.forEach((l) => l(activeCount));
}

/** Call when that revalidation's fetch settles (success or error). */
export function endRefetch(): void {
  activeCount = Math.max(0, activeCount - 1);
  countListeners.forEach((l) => l(activeCount));
}

export function subscribeRefetch(listener: CountListener): () => void {
  countListeners.add(listener);
  return () => countListeners.delete(listener);
}

/**
 * Call once when the app is detected coming back to the foreground (see
 * useApiGet's visibilitychange/pageshow handler) — every mounted
 * useApiGet instance calls this on the same event, so it fires several
 * times per actual resume; <ResumeToast> debounces that itself.
 */
export function announceResume(): void {
  resumeListeners.forEach((l) => l());
}

export function subscribeResume(listener: ResumeListener): () => void {
  resumeListeners.add(listener);
  return () => resumeListeners.delete(listener);
}
