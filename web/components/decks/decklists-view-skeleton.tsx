import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const DeckDetailedSkeleton = () => (
  <Card className="w-full flex flex-col">
    <CardHeader className="pb-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
        <div className="flex-grow space-y-2">
          <Skeleton className="h-8 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md flex-shrink-0" />
      </div>
      <Skeleton className="h-4 w-full mt-3 rounded-md" />
    </CardHeader>
    <CardContent className="pt-0 flex-grow">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-5/6 rounded-md" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export function DecksBrowseSkeleton() {
  return (
    <div className="container mx-auto py-8 px-2 sm:px-4 animate-pulse">
      <div className="mb-6">
        <Skeleton className="h-10 max-w-sm rounded-lg" />
      </div>

      <div className="space-y-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <DeckDetailedSkeleton key={i} />
        ))}
      </div>

      <div className="mt-8 flex justify-center items-center gap-2">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>
    </div>
  );
}
