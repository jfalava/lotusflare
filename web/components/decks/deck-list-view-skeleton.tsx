import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const CardListItemSkeleton = () => (
  <div className="flex justify-between items-center">
    <Skeleton className="h-4 flex-grow mr-4 rounded" />
    <Skeleton className="h-5 w-12 rounded-full" />
  </div>
);

const CardTypeGroupSkeleton = ({ cardCount = 4 }: { cardCount?: number }) => (
  <div className="min-w-[180px]">
    <Skeleton className="h-5 w-40 mb-2.5 rounded" />
    <div className="space-y-1.5 text-xs">
      {Array.from({ length: cardCount }).map((_, i) => (
        <CardListItemSkeleton key={i} />
      ))}
    </div>
  </div>
);

const DeckCardSkeleton = () => (
  <Card className="w-full flex flex-col bg-card/70 backdrop-blur-sm shadow-lg">
    <CardHeader className="pb-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
        <div className="flex-grow">
          <Skeleton className="h-8 w-64 rounded" />
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 mt-2 sm:mt-0">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-4 w-4/5 mt-4 rounded" />
    </CardHeader>

    <CardContent className="pt-0 flex-grow">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
        <CardTypeGroupSkeleton cardCount={4} />
        <CardTypeGroupSkeleton cardCount={2} />
        <CardTypeGroupSkeleton cardCount={2} />
        <CardTypeGroupSkeleton cardCount={1} />
        <CardTypeGroupSkeleton cardCount={5} />
        <CardTypeGroupSkeleton cardCount={8} />
      </div>

      <>
        <Separator className="my-4" />
        <div>
          <Skeleton className="h-6 w-32 mb-3 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardListItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </>
    </CardContent>
  </Card>
);

export function DeckListViewSkeleton() {
  return (
    <div className="container mx-auto py-8 px-2 sm:px-4 animate-pulse">
      <div className="flex justify-end items-center mb-8">
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>

      <div className="space-y-8">
        <DeckCardSkeleton />
        <DeckCardSkeleton />
        <DeckCardSkeleton />
      </div>
    </div>
  );
}
