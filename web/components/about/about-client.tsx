"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Flower, Heart, Info } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { packages } from "@/data/about-packages";

export default function AboutClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);
  if (!mounted) return null;

  const sortedPackages = packages.sort((a, b) => a.name.localeCompare(b.name));

  const container = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const item = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <main className="min-h-screen">
      <div className="container mx-auto max-w-5xl px-4 py-16">
        <motion.section
          variants={container}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3 }}
          className="mb-12 text-center"
        >
          <motion.div variants={item} transition={{ duration: 0.25 }}>
            <Flower className="mx-auto mb-4 h-16 w-16 text-indigo-500" />
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
              Lotusflare
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-300">
              A single-seat, open-source MTG inventory and deckbuilding tool,
              made for Cloudflare and its services.
            </p>
          </motion.div>
        </motion.section>

        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2, duration: 0.3 }}
          className="space-y-8"
        >
          <Card>
            <CardContent className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
              <span className="flex items center">
                <Info className="w-5 h-auto mr-2" />
                <p>
                  Lotusflare is a tool designed for Magic: The Gathering players
                  who want to manage their card collection and build decks. It
                  provides the following features:
                </p>
              </span>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Inventory Management:</strong> Keep track of your
                  entire card collection, including different printings,
                  conditions, and foils.
                </li>
                <li>
                  <strong>Deckbuilding:</strong> Create, edit, and manage your
                  decks for various formats.
                </li>
                <li>
                  <strong>Card Search:</strong> A powerful search service to
                  find any card: cardboard or digital.
                </li>
                <li>
                  <strong>Statistics:</strong> Get insights into your collection
                  and decks with detailed statistics.
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                License
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700 dark:text-slate-300">
              <p>
                This project is licensed under the <strong>MIT License</strong>.
                You are free to use, modify, and distribute the code as you see
                fit. The source code is available on{" "}
                <a
                  href="#"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  GitHub
                </a>
                .
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Acknowledgements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-slate-700 dark:text-slate-300">
                This application is built with the help of these amazing
                open-source projects:
              </p>
              <Accordion type="single" collapsible className="w-full">
                {sortedPackages.map((pkg) => (
                  <AccordionItem key={pkg.name} value={pkg.name}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <span>{pkg.name}</span>
                        <Badge variant="outline">{pkg.license}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <p className="text-xs italic text-muted-foreground">
                        {pkg.description}
                      </p>
                      <a
                        href={pkg.license_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium underline"
                      >
                        View full license
                      </a>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
