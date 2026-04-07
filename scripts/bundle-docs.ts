import fs from "fs";
import path from "path";

function collectMdFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4).trimStart();
}

function bundle(inputDir: string, outputFile: string): void {
  const absInputDir = path.resolve(inputDir);

  if (!fs.existsSync(absInputDir)) {
    console.error(`Directory not found: ${absInputDir}`);
    process.exit(1);
  }

  const files = collectMdFiles(absInputDir);

  if (files.length === 0) {
    console.error(`No .md files found in: ${absInputDir}`);
    process.exit(1);
  }

  const sections = files.map((file) => {
    const relativePath = path.relative(absInputDir, file);
    const raw = fs.readFileSync(file, "utf-8");
    const content = stripFrontmatter(raw);
    return `<!-- ${relativePath} -->\n${content}`;
  });

  const output = sections.join("\n\n---\n\n");
  fs.writeFileSync(outputFile, output, "utf-8");

  console.log(`Bundled ${files.length} file(s) → ${outputFile}`);
  files.forEach((f) => console.log(`  ${path.relative(absInputDir, f)}`));
}

// Args: inputDir outputFile
const [, , inputDir, outputFile] = process.argv;

if (!inputDir || !outputFile) {
  console.error("Usage: npx tsx scripts/bundle-docs.ts <inputDir> <outputFile>");
  process.exit(1);
}

bundle(inputDir, outputFile);
