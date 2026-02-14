#!/usr/bin/env node

import fs from "fs";
import path from "path";

/**
 * Recursively scans a directory and builds structure
 */
function getDirectoryStructure(
  dirPath,
  options = { exclude: ["node_modules", ".git", "dist", "bin", "docs"] }
) {
  try {
    if (!fs.existsSync(dirPath)) return null;

    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) return null;

    const structure = {};
    const files = fs.readdirSync(dirPath).sort();

    files.forEach((file) => {
      // 🚫 Exclude dot files & folders
      if (file.startsWith(".")) return;

      // 🚫 Exclude user-defined folders
      if (options.exclude.some(ex => file === ex || file.endsWith(ex))) return;

      const fullPath = path.join(dirPath, file);

      try {
        const fileStat = fs.lstatSync(fullPath);

        if (fileStat.isDirectory()) {
          structure[file] = getDirectoryStructure(fullPath, options);
        } else {
          structure[file] = "file";
        }
      } catch (e) {
        // Skip files that can't be accessed/stat'ed
        structure[file] = "error";
      }
    });

    return structure;
  } catch (err) {
    return null;
  }
}

/**
 * Prints tree structure to console
 */
function printTree(structure, indent = "") {
  if (!structure) return;

  const entries = Object.entries(structure);
  entries.forEach(([key, value], index) => {
    const isLast = index === entries.length - 1;
    const prefix = isLast ? "└── " : "├── ";

    console.log(indent + prefix + key);

    if (typeof value === "object" && value !== null) {
      printTree(value, indent + (isLast ? "    " : "│   "));
    }
  });
}

/**
 * Entry point
 */
const rootDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : process.cwd();

const customExclude = process.argv
  .slice(3)
  .filter((arg) => arg.startsWith("--exclude="))
  .flatMap((arg) => arg.replace("--exclude=", "").split(","));

const exclude = [
  ...new Set([
    ...customExclude,
    "node_modules",
    ".git",
    "dist",
    "coverage",
    ".test-deployment",
    "logs",
    "uploads"
  ])
];

console.log(`\n📂 Directory Tree: ${rootDir}\n`);

const tree = getDirectoryStructure(rootDir, { exclude });

if (!tree) {
  console.error("❌ Invalid directory or permission denied");
  process.exit(1);
}

printTree({ [path.basename(rootDir)]: tree });
