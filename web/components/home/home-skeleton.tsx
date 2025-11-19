import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const StatCardSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-5 w-24" />
    </CardHeader>
    <CardContent className="space-y-2">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-4 w-32" />
    </CardContent>
  </Card>
);

const QuickActionSkeleton = () => (
  <Skeleton className="h-24 w-full rounded-lg" />
);

const ChartSkeleton = () => <Skeleton className="h-[300px] w-full" />;

const ActivityListSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3">
        <Skeleton className="h-2 w-2 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export function HomeSkeleton() {
  return (
    <div className="container mx-auto py-6 px-4 space-y-8 animate-pulse">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <QuickActionSkeleton />
        <QuickActionSkeleton />
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <Skeleton className="h-10 w-full rounded-lg" />

        {/* Default Tab Content (Overview) */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Color Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-6 w-48" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartSkeleton />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-6 w-48" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityListSkeleton />
              </CardContent>
            </Card>
          </div>

          {/* Format Legality */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-64" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
