import React from "react";

import projectPackage from "@/package.json";
import type { LucideIcon } from "lucide-react";
import { Info, Code, Flower, ShieldCheck } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
const VERSION = `${projectPackage.version}`;
const currentYear = new Date().getFullYear();

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/about", label: "About", Icon: Info },
  { href: "/privacy", label: "Privacy", Icon: ShieldCheck },
  {
    href: "https://github.com/jfalava/lotusflare",
    label: "Source Code",
    Icon: Code,
  },
];

function Footer() {
  return (
    <footer className="mt-auto w-full select-none">
      <div className="flex items-center justify-center border-t py-3 gap-x-3">
        <div className="grid place-items-center border-r border-border pr-3 py-6">
          <span className="font-semibold opacity-80 flex items-center">
            <Flower className="mr-1" />
            Lotusflare
          </span>
          <span className="hidden md:flex items-center font-sans font-semibold text-xs gap-x-1 mb-1">
            an MTG inventory and deckbuilding tool
          </span>
          <span className="flex items-center font-sans font-bold text-xs gap-x-1 mb-1">
            by JFA
          </span>
          <div className="flex items-center font-mono text-xs gap-x-1">
            <span>v{VERSION}</span>
            <span>❖</span>
            <span>{currentYear}</span>
          </div>
        </div>
        <div className="grid gap-y-2 text-xs">
          {navItems.map(({ href, label, Icon }) => (
            <Link key={label} href={href}>
              <span
                className={clsx("flex items-center gap-x-1 hover:underline")}
              >
                <Icon className="w-4 h-4" aria-hidden />
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default Footer;
