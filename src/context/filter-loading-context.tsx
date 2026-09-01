'use client';

import React, { createContext, useContext, useState, useTransition } from 'react';

interface FilterLoadingContextType {
  isPending: boolean;
  targetPeriod: string | null;
  setTargetPeriod: (period: string | null) => void;
  startFilterTransition: (callback: () => void) => void;
}

const FilterLoadingContext = createContext<FilterLoadingContextType>({
  isPending: false,
  targetPeriod: null,
  setTargetPeriod: () => {},
  startFilterTransition: (fn) => fn(),
});

export function FilterLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition();
  const [targetPeriod, setTargetPeriod] = useState<string | null>(null);

  const startFilterTransition = (callback: () => void) => {
    startTransition(() => {
      callback();
    });
  };

  return (
    <FilterLoadingContext.Provider
      value={{
        isPending,
        targetPeriod,
        setTargetPeriod,
        startFilterTransition,
      }}
    >
      {children}
    </FilterLoadingContext.Provider>
  );
}

export function useFilterLoading() {
  return useContext(FilterLoadingContext);
}
