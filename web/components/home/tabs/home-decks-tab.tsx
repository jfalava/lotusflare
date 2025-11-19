"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { DeckWithDetails } from "#/backend/src/types";
import { ArrowRight, BarChart3, ListTree, PlusCircle } from "lucide-react";
import Link from "next/link";
import React from "react";
import { QuickStats } from "../shared/home-types";

interface DecksTabProps {
  recentDecks: DeckWithDetails[];
  quickStats: QuickStats;
}

const DecksTab = ({ recentDecks, quickStats }: DecksTabProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ListTree className="h-5 w-5" />
              <span>Recent Decks</span>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/decks">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
                <div className="hidden items-center gap-1 ml-2 lg:flex">
                  <Kbd>Alt</Kbd>
                  <Kbd>D</Kbd>
                </div>
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentDecks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ListTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No decks created yet</p>
                <Button asChild className="mt-4">
                  <Link href="/edit/decks">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create First Deck
                  </Link>
                </Button>
              </div>
            ) : (
              recentDecks.slice(0, 5).map((deck) => (
                <Link
                  key={deck.id}
                  href={`/decks/${deck.id}`}
                  className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{deck.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {deck.format} •{" "}
                        {deck.cards?.reduce(
                          (sum, card) => sum + card.quantity,
                          0,
                        ) || 0}{" "}
                        cards
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {new Date(deck.updated_at).toLocaleDateString()}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deck Statistics by Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quickStats.deckStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No deck statistics available</p>
              </div>
            ) : (
              quickStats.deckStats.map((format) => (
                <div
                  key={format.format}
                  className="flex items-center justify-between py-2 border-b border-border/50"
                >
                  <div>
                    <p className="font-medium capitalize">{format.format}</p>
                    <p className="text-sm text-muted-foreground">
                      Avg {Math.round(format.avg_deck_size || 0)} cards
                    </p>
                  </div>
                  <Badge variant="outline">
                    {format.deck_count} deck
                    {format.deck_count !== 1 ? "s" : ""}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DecksTab;
