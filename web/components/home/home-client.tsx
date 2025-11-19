"use client";

import React, { startTransition, useEffect, useRef, useState } from "react";
import { useTopLoader } from "nextjs-toploader";
import { useKeyPress } from "@/hooks/useKeyPress";
import { usePathname, useRouter } from "next/navigation";
import { PaginatedActivityResponse } from "#/backend/src/types";
import { HomeClientProps } from "./shared/home-types";
import QuickActions from "./home-quick-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OverviewTab from "./tabs/home-overview-tab";
import CollectionTab from "./tabs/home-collection-tab";
import DecksTab from "./tabs/home-decks-tab";
import ActivityTab from "./tabs/home-activity-tab";

export default function HomeClient({
  recentDecks,
  analytics,
  quickStats,
  isProd,
}: HomeClientProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [activityPage, setActivityPage] = useState(1);
  const [paginatedActivity, setPaginatedActivity] =
    useState<PaginatedActivityResponse | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const loader = useTopLoader();
  const manualNav = useRef(false);

  useKeyPress("i", () => router.push("/inventory"), { alt: true });
  useKeyPress("d", () => router.push("/decks"), { alt: true });
  useKeyPress("a", () => router.push("/edit/inventory"), { alt: true });
  useKeyPress("n", () => router.push("/edit/decks"), { alt: true });

  // Alt+A → Add Cards with top‐loader
  useKeyPress(
    "a",
    (e) => {
      const tgt = e.target as HTMLElement;
      if (
        tgt.tagName === "INPUT" ||
        tgt.tagName === "TEXTAREA" ||
        tgt.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      loader.start();
      manualNav.current = true;
      startTransition(() => {
        router.push("/edit/inventory");
      });
    },
    { alt: true },
  );

  // Alt+N → New Deck with top‐loader
  useKeyPress(
    "n",
    (e) => {
      const tgt = e.target as HTMLElement;
      if (
        tgt.tagName === "INPUT" ||
        tgt.tagName === "TEXTAREA" ||
        tgt.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      loader.start();
      manualNav.current = true;
      startTransition(() => {
        router.push("/edit/decks");
      });
    },
    { alt: true },
  );

  // finish loader once navigation completes
  useEffect(() => {
    if (manualNav.current) {
      loader.done();
      manualNav.current = false;
    }
  }, [pathname, loader]);

  useEffect(() => {
    if (activeTab === "activity") {
      const fetchActivity = async () => {
        const res = await fetch(`/api/activity?page=${activityPage}&limit=10`);
        setPaginatedActivity(await res.json());
      };
      fetchActivity();
    }
  }, [activeTab, activityPage]);

  return (
    <div className="container mx-auto py-6 px-4 space-y-8">
      {!isProd && <QuickActions />}

      {/* Tabs for different views */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="decks">Decks</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab analytics={analytics} setActiveTab={setActiveTab} />
        </TabsContent>

        <TabsContent value="collection">
          <CollectionTab analytics={analytics} />
        </TabsContent>

        <TabsContent value="decks">
          <DecksTab recentDecks={recentDecks} quickStats={quickStats} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab
            quickStats={quickStats}
            paginatedActivity={paginatedActivity}
            activityPage={activityPage}
            setActivityPage={setActivityPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
