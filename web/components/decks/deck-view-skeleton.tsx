import { Skeleton } from "@/components/ui/skeleton";

const CardImageSkeleton = () => (
  <div className="relative">
    <Skeleton className="aspect-[63/88] w-full rounded-lg" />
    <Skeleton className="absolute top-1 right-1 h-5 w-7 rounded-full" />
  </div>
);

const CardTypeGroupSkeleton = ({ cardCount }: { cardCount: number }) => (
  <div className="mb-6">
    <Skeleton className="mb-3 h-5 w-48 rounded" />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: cardCount }).map((_, i) => (
        <CardImageSkeleton key={i} />
      ))}
    </div>
  </div>
);

import type { ViewMode } from "@/components/context/view-mode-context";

export function DeckViewSkeleton({
  viewMode = "grid" as ViewMode,
}: {
  viewMode?: ViewMode;
}) {
  return (
    <div className="container mx-auto max-w-6xl animate-pulse py-8 px-4">
      {/* Back Button */}
      <Skeleton className="mb-6 h-9 w-36 rounded-md" />

      {/* Deck Header */}
      <div className="mb-8 border-b border-border pb-6">
        <Skeleton className="mb-3 h-10 w-3/4 rounded-lg" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-5 w-44 rounded" />
          <Skeleton className="h-5 w-36 rounded" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full max-w-3xl rounded" />
          <Skeleton className="h-4 w-2/3 max-w-2xl rounded" />
        </div>
      </div>

      {/* Commander Section */}
      <section className="mb-10">
        <Skeleton className="mb-4 h-8 w-52 rounded" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="block">
            <Skeleton className="aspect-[488/360] w-full rounded-xl" />
            <Skeleton className="mx-auto mt-2 h-4 w-1/2 rounded" />
          </div>
        </div>
      </section>

      {/* Actions & View Toggle */}
      <div className="mb-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-md" />
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="space-y-6">
        <Skeleton className="h-10 w-full rounded-lg" />

        {viewMode === "grid" ? (
          <div className="space-y-6">
            <div>
              <Skeleton className="mb-4 h-8 w-56 border-b border-transparent py-3" />
              <div className="pt-0">
                <CardTypeGroupSkeleton cardCount={4} />
                <CardTypeGroupSkeleton cardCount={2} />
                <CardTypeGroupSkeleton cardCount={6} />
              </div>
            </div>

            <Skeleton className="my-6 h-px w-full" />

            <div>
              <Skeleton className="mb-4 h-8 w-56 border-b border-transparent py-3" />
              <div className="pt-0">
                <CardTypeGroupSkeleton cardCount={4} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <Skeleton className="mb-4 h-8 w-56 border-b border-transparent py-3" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="min-w-[180px]">
                    <Skeleton className="mb-2 h-4 w-40" />
                    <div className="space-y-1">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <div
                          key={j}
                          className="flex items-center justify-between py-1"
                        >
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Skeleton className="my-6 h-px w-full" />

            <div>
              <Skeleton className="mb-4 h-8 w-56 border-b border-transparent py-3" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="min-w-[180px]">
                    <Skeleton className="mb-2 h-4 w-40" />
                    <div className="space-y-1">
                      {Array.from({ length: 4 }).map((__, j) => (
                        <div
                          key={j}
                          className="flex items-center justify-between py-1"
                        >
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
