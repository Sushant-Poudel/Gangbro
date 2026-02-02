import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductCardSkeleton() {
  return (
    <div className="bg-card border border-white/10 rounded-lg overflow-hidden">
      <Skeleton className="aspect-square w-full bg-white/5" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4 bg-white/5" />
        <Skeleton className="h-4 w-1/2 bg-white/5" />
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1 bg-white/5" />
          <Skeleton className="h-8 w-8 bg-white/5" />
        </div>
      </div>
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="bg-card/50 border border-white/5 rounded-lg p-4 lg:p-6 min-w-[300px] lg:min-w-[400px]">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-12 w-12 rounded-full bg-white/5" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24 bg-white/5" />
          <Skeleton className="h-3 w-16 bg-white/5" />
        </div>
      </div>
      <Skeleton className="h-16 w-full bg-white/5 mb-2" />
      <Skeleton className="h-3 w-20 bg-white/5" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative min-h-[70vh] flex items-center justify-center bg-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Skeleton className="h-16 w-3/4 mx-auto mb-6 bg-white/5" />
        <Skeleton className="h-6 w-2/3 mx-auto mb-8 bg-white/5" />
        <Skeleton className="h-12 w-48 mx-auto bg-white/5" />
      </div>
    </div>
  );
}
