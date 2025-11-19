import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PlaceCardSkeleton = () => (
  <Card className="flex flex-col items-start justify-between p-4 sm:flex-row sm:items-center">
    <div className="mb-2 w-full flex-grow sm:mb-0">
      <Skeleton className="h-6 w-1/2 rounded-md" />
      <Skeleton className="mt-2 h-4 w-1/3 rounded-md" />
      <Skeleton className="mt-2 h-3 w-3/4 rounded-md" />
      <Skeleton className="mt-2 h-3 w-2/3 rounded-md" />
    </div>
    <div className="flex flex-shrink-0 items-center gap-2 self-start sm:self-center">
      <Skeleton className="h-9 w-20 rounded-md" />
      <Skeleton className="h-9 w-24 rounded-md" />
    </div>
  </Card>
);

export function PlacesManageSkeleton() {
  return (
    <div className="container mx-auto animate-pulse py-6 px-2 sm:px-4 md:px-6">
      <Card className="border-border/60 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="mt-2 h-4 w-80 rounded-md" />
          </div>
          <Skeleton className="h-10 w-36 rounded-md" />
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="mb-6">
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          <div className="mb-4">
            <Skeleton className="h-5 w-48 rounded-md" />
          </div>

          <div className="space-y-3">
            <PlaceCardSkeleton />
            <PlaceCardSkeleton />
            <PlaceCardSkeleton />
            <PlaceCardSkeleton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
