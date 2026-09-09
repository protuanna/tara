"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type HeaderSearchContextValue = {
  query: string;
  setQuery: (query: string) => void;
};

const HeaderSearchContext = createContext<HeaderSearchContextValue | null>(null);

/**
 * Backs the global header's search input (`<SiteHeader>`) so any screen can
 * read what's currently typed there — a plain React Context rather than a
 * URL search param, since this is an instant client-side filter over an
 * already-loaded list (like `<CustomerPicker>`'s own inline search box),
 * not something worth making bookmarkable/shareable. Query resets on every
 * route change so leaving a screen doesn't leave a stale filter silently
 * armed on whatever screen you land on next.
 */
export function HeaderSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    setQuery("");
  }, [pathname]);

  return (
    <HeaderSearchContext.Provider value={{ query, setQuery }}>
      {children}
    </HeaderSearchContext.Provider>
  );
}

export function useHeaderSearch(): HeaderSearchContextValue {
  const ctx = useContext(HeaderSearchContext);
  if (!ctx) throw new Error("useHeaderSearch must be used within HeaderSearchProvider");
  return ctx;
}
