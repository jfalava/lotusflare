"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Cookie, AlertTriangle, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export default function PrivacyClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  const container = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const item = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <main className="min-h-screen">
      <div className="container mx-auto max-w-5xl px-4 py-16">
        {/* Hero */}
        <motion.section
          variants={container}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3 }}
          className="mb-12 text-center"
        >
          <motion.div variants={item} transition={{ duration: 0.25 }}>
            <ShieldCheck className="mx-auto mb-4 h-16 w-16 text-indigo-500" />
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
              Privacy Policy
            </h1>
          </motion.div>
        </motion.section>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cookies">Cookies</TabsTrigger>
            <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <motion.div
              variants={container}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader className="flex items-center">
                  <Database className="h-5 w-5" />
                  <CardTitle>Data We Collect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    We collect the minimum amount of data required to run the
                    service:
                  </p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      <strong>User Preferences:</strong> Theme, font, view mode,
                      infinite-scroll toggle.
                    </li>
                    <li>
                      <strong>Basic Telemetry:</strong> Error traces and
                      performance metrics via Cloudflare Workers.
                    </li>
                    <li>
                      <strong>Session Data:</strong> Temporary identifiers for
                      rate-limiting and abuse prevention.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="cookies">
            <motion.div
              variants={container}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cookie className="h-5 w-5" />
                    Cookies We Store
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <CookieRow
                      name="cookieConsent"
                      purpose="Stores your cookie-consent choice."
                      expiry="1 year"
                    />
                    <CookieRow
                      name="theme"
                      purpose="Persists your color theme, fonts, and dark-mode preference."
                      expiry="1 year"
                    />
                    <CookieRow
                      name="inventoryInfiniteScroll"
                      purpose="Remembers your scroll preference (infinite vs pagination)."
                      expiry="1 year"
                    />
                    <CookieRow
                      name="hideKeybinds"
                      purpose="Remembers whether to show keyboard-shortcut hints."
                      expiry="1 year"
                    />
                    <CookieRow
                      name="universalViewMode"
                      purpose="Remembers your default decklist view (grid/list)."
                      expiry="1 year"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="telemetry">
            <motion.div
              variants={container}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-auto"
                      viewBox="0 0 128 128"
                    >
                      <path
                        fill="currentColor"
                        d="M30.743 116.257a15.5 15.5 0 0 1-3.42-4.107L4.068 71.752a15.56 15.56 0 0 1 0-15.503L27.323 15.85a15.5 15.5 0 0 1 3.417-4.084l15.601 28.166l-11.266 20.282a7.75 7.75 0 0 0 0 7.543l11.277 20.349zM100.665 15.85l23.255 40.398a15.49 15.49 0 0 1 0 15.503l-23.255 40.398a15.5 15.5 0 0 1-13.416 7.752H68.994l28.92-52.145a7.75 7.75 0 0 0 0-7.513L68.994 8.099h18.255a15.5 15.5 0 0 1 13.416 7.751M36.119 9.139a15.5 15.5 0 0 1 5.562-1.041h21.255l28.92 52.145a7.75 7.75 0 0 1 0 7.513l-28.92 52.145H41.682c-2.062 0-4.124-.423-5.993-1.193L63.406 67.29c.894-1.61 1.002-4.738.107-6.348z"
                      />
                    </svg>
                    Telemetry
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    Our edge workers log the following{" "}
                    <strong>anonymized</strong> data for stability and
                    performance insights:
                  </p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>HTTP status codes</li>
                    <li>Response times</li>
                    <li>Exception stack traces (no PII)</li>
                    <li>Country-level geolocation (rounded)</li>
                  </ul>
                  <p>Logs are retained for 7 days and automatically purged.</p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        <motion.section
          variants={container}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3 }}
          className="mt-12"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Your Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700 dark:text-slate-300">
              <p>
                You may revoke consent at any time by clearing cookies or using
                the “Decline” button in the cookie banner. For questions, email{" "}
                <a
                  href="mailto:lotusflare@jfa.dev"
                  className="font-medium underline"
                >
                  lotusflare@jfa.dev
                </a>
                .
              </p>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </main>
  );
}

function CookieRow({
  name,
  purpose,
  expiry,
}: {
  name: string;
  purpose: string;
  expiry: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-700 py-3 last:border-0">
      <div>
        <Badge variant="outline" className="font-mono text-xs">
          {name}
        </Badge>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {purpose}
        </p>
      </div>
      <p className="mt-2 sm:mt-0 text-xs text-slate-500 dark:text-slate-400">
        Expires: {expiry}
      </p>
    </div>
  );
}
