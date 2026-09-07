// Tiny pub/sub singleton so `useApiGet` (called independently from many
// components) can report "a background refetch is in flight" to one shared
// <ResumeLoadingBar>, without pulling in a state library for a single
// boolean. Module-level state is fine here — there's one browser tab per
// user of this app, no SSR concerns since both sides only ever touch this
// from client components.

type Listener = (activeCount: number) => void;

let activeCount = 0;
const listeners = new Set<Listener>();

export function beginRefetch(): void {
  activeCount += 1;
  listeners.forEach((l) => l(activeCount));
}

export function endRefetch(): void {
  activeCount = Math.max(0, activeCount - 1);
  listeners.forEach((l) => l(activeCount));
}

export function subscribeRefetch(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
