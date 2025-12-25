#!/usr/bin/env bun
/* eslint-disable */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

interface PackageInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  outdated: boolean;
}

async function getLatestVersion(packageName: string): Promise<string> {
  try {
    const output = execSync(`bun pm view ${packageName} version`, {
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    return output;
  } catch (error) {
    console.error(`Failed to get latest version for ${packageName}:`, error);
    return "unknown";
  }
}

function parseVersion(version: string): string {
  return version.replace(/^[\^~]/, "");
}

function isOutdated(current: string, latest: string): boolean {
  const currentClean = parseVersion(current);
  const latestClean = parseVersion(latest);

  if (currentClean === "unknown" || latestClean === "unknown") return false;

  const currentParts = currentClean.split(".").map(Number);
  const latestParts = latestClean.split(".").map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }

  return false;
}

function sortObjectKeys(obj: Record<string, any>): Record<string, any> {
  const sorted: Record<string, any> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

function prettifyPackageJson(filePath: string): void {
  try {
    const packageJson = JSON.parse(readFileSync(filePath, "utf8"));

    if (packageJson.dependencies) {
      packageJson.dependencies = sortObjectKeys(packageJson.dependencies);
    }

    if (packageJson.devDependencies) {
      packageJson.devDependencies = sortObjectKeys(packageJson.devDependencies);
    }

    if (packageJson.scripts) {
      packageJson.scripts = sortObjectKeys(packageJson.scripts);
    }

    if (packageJson.workspaces?.catalog) {
      packageJson.workspaces.catalog = sortObjectKeys(
        packageJson.workspaces.catalog,
      );
    }

    writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + "\n");
    console.log(`✨ Prettified ${filePath}`);
  } catch (error) {
    console.error(`Failed to prettify ${filePath}:`, error);
  }
}

function findAllPackageJsonFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules"
      ) {
        files.push(...findAllPackageJsonFiles(fullPath));
      } else if (entry.name === "package.json") {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore permission errors
  }

  return files;
}

async function main() {
  const packageJsonPath = "./package.json";
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const catalog = packageJson.workspaces?.catalog || {};

  console.log("🔍 Checking catalog for outdated packages...\n");

  const packages: PackageInfo[] = [];

  for (const [name, version] of Object.entries(catalog)) {
    const currentVersion = version as string;
    const latestVersion = await getLatestVersion(name);
    const outdated = isOutdated(currentVersion, latestVersion);

    packages.push({
      name,
      currentVersion,
      latestVersion,
      outdated,
    });
  }

  const outdatedPackages = packages.filter((pkg) => pkg.outdated);

  if (outdatedPackages.length === 0) {
    console.log("✅ All catalog packages are up to date!");
    return;
  }

  console.log(`📦 Found ${outdatedPackages.length} outdated package(s):\n`);

  outdatedPackages.forEach((pkg) => {
    const current = parseVersion(pkg.currentVersion);
    const latest = parseVersion(pkg.latestVersion);
    console.log(`${pkg.name}: ${current} → ${latest}`);
  });

  console.log(
    "\n💡 To update all packages, run: bun run update:catalog:unsafe",
  );
  console.log(
    "💡 To update specific package, run: bun update <package-name>@latest",
  );

  console.log("\n🎨 Prettifying all package.json files...");
  const packageJsonFiles = findAllPackageJsonFiles(".");
  for (const file of packageJsonFiles) {
    prettifyPackageJson(file);
  }
  console.log(`✨ Prettified ${packageJsonFiles.length} package.json file(s)`);
}

main().catch(console.error);
