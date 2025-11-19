import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ViewMode } from "@/components/context/view-mode-context";

const GridItemSkeleton = () => (
  <Card className="w-full">
    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </CardHeader>
    <CardContent>
      <div className="space-y-2 pt-2 border-t">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ListRowSkeleton = () => (
  <div className="grid grid-cols-[auto_100px_100px] md:grid-cols-[1fr_120px_160px] gap-4 items-center p-3 border-b">
    <Skeleton className="h-5 w-1/2" />
    <Skeleton className="h-6 w-12" />
    <div className="flex items-center justify-end gap-2">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
);

export function InventoryBrowseSkeleton({
  viewMode = "grid" as ViewMode,
}: {
  viewMode?: ViewMode;
}) {
  return (
    <div className="container mx-auto p-4 animate-pulse">
      <Card className="mb-4">
        <CardHeader className="flex flex-row justify-between items-center">
          <Skeleton className="h-10 w-36 rounded-md" />
          <Skeleton className="h-10 w-48 rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full rounded-lg" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-end">
          <div className="grid md:flex gap-2 justify-end">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-48 rounded-md" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full max-w-md mb-4 rounded-lg" />

          <div className="w-full border-b">
            <div className="flex space-x-1 overflow-x-auto no-scrollbar">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-t-md" />
              ))}
            </div>
          </div>

          {viewMode === "grid" ? (
            <div className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <GridItemSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-6">
              <div className="overflow-x-auto border rounded-lg shadow-sm">
                <div className="bg-muted sticky top-0 grid grid-cols-[auto_100px_100px] md:grid-cols-[1fr_120px_160px] gap-4 p-2">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <ListRowSkeleton key={i} />
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
