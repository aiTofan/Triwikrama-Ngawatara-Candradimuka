import React from 'react';

export function Loader() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 w-full" style={{ minHeight: '30vh' }}>
      <div className="flex space-x-2 animate-pulse">
        <div className="w-2 h-2 bg-[var(--patina)] rounded-full"></div>
        <div className="w-2 h-2 bg-[var(--patina)] rounded-full" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-[var(--patina)] rounded-full" style={{ animationDelay: '0.4s' }}></div>
      </div>
      <p className="mt-4 text-sm font-medium tracking-widest text-[var(--ink-2)] uppercase">Menyelaraskan Kesadaran</p>
    </div>
  );
}

export function SkeletonTest() {
  return (
    <div className="w-full animate-pulse mt-8">
      <div className="h-4 bg-[var(--line)] rounded w-1/4 mb-8"></div>
      <div className="h-8 bg-[var(--line)] rounded w-3/4 mb-4"></div>
      <div className="h-8 bg-[var(--line)] rounded w-full mb-12"></div>
      
      <div className="space-y-4">
        <div className="h-14 bg-[var(--line-2)] rounded w-full"></div>
        <div className="h-14 bg-[var(--line-2)] rounded w-full"></div>
        <div className="h-14 bg-[var(--line-2)] rounded w-full"></div>
        <div className="h-14 bg-[var(--line-2)] rounded w-full"></div>
      </div>
    </div>
  );
}

export function SkeletonResult() {
  return (
    <div className="w-full animate-pulse mt-8">
      <div className="h-4 bg-[var(--line)] rounded w-1/4 mb-4"></div>
      <div className="h-12 bg-[var(--line)] rounded w-1/2 mb-2"></div>
      <div className="h-6 bg-[var(--line)] rounded w-1/3 mb-12"></div>
      
      <div className="h-64 w-64 bg-[var(--line-2)] rounded-full mx-auto mb-12"></div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="h-24 bg-[var(--line-2)] rounded"></div>
        <div className="h-24 bg-[var(--line-2)] rounded"></div>
        <div className="h-24 bg-[var(--line-2)] rounded"></div>
      </div>
    </div>
  );
}
