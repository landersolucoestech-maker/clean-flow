import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("apps/web/src");
const MOCK_ROOT = path.join(ROOT, "mocks");
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return ALLOWED_EXTENSIONS.has(path.extname(entry.name)) ? [full] : [];
  });
}

function rel(file) {
  return path.relative(process.cwd(), file).replaceAll("\\", "/");
}

function lineMatches(file, regex) {
  const source = fs.readFileSync(file, "utf8");
  return source.split(/\r?\n/).flatMap((line, index) => regex.test(line) ? [{ file: rel(file), line: index + 1, text: line.trim().slice(0, 220) }] : []);
}

const files = walk(ROOT);
const sourceFiles = files.filter((file) => !file.includes(`${path.sep}mocks${path.sep}`));
const findings = {
  markers: [],
  mockReferencesOutsideMocks: [],
  suspiciousIdentityData: [],
  hardcodedUrls: [],
  debugLogs: [],
  randomOrTimers: [],
  directStorage: [],
  legacyFiles: [],
  largeFiles: [],
  duplicatedShell: [],
};

for (const file of sourceFiles) {
  const relative = rel(file);
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/).length;

  findings.markers.push(...lineMatches(file, /\b(TODO|FIXME|HACK|XXX)\b/i));
  findings.mockReferencesOutsideMocks.push(...lineMatches(file, /\b(mock(?:ed|Data)?|fake|fixture|dummy|demoData|sampleData)\b/i));
  findings.suspiciousIdentityData.push(...lineMatches(file, /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?1?[\s.-]?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/i));
  findings.hardcodedUrls.push(...lineMatches(file, /https?:\/\/(?!schema\.org|www\.w3\.org|fonts\.googleapis\.com|fonts\.gstatic\.com)/i));
  findings.debugLogs.push(...lineMatches(file, /console\.(log|debug|trace)\s*\(/));
  findings.randomOrTimers.push(...lineMatches(file, /Math\.random\s*\(|setTimeout\s*\(|setInterval\s*\(/));
  findings.directStorage.push(...lineMatches(file, /\b(localStorage|sessionStorage)\b/));

  if (/Legacy|Critical|Old|Deprecated/i.test(path.basename(file))) {
    findings.legacyFiles.push({ file: relative });
  }
  if (lines >= 800) {
    findings.largeFiles.push({ file: relative, lines });
  }
  if (relative !== "apps/web/src/app/layout/PageLayout.tsx" && /<Sidebar\b|<Header\b/.test(source)) {
    findings.duplicatedShell.push({ file: relative });
  }
}

for (const key of Object.keys(findings)) {
  const values = findings[key];
  console.log(`\n=== ${key} (${values.length}) ===`);
  for (const item of values.slice(0, 200)) {
    console.log(JSON.stringify(item));
  }
  if (values.length > 200) console.log(`... ${values.length - 200} additional findings omitted`);
}

console.log("\n=== summary ===");
console.log(JSON.stringify(Object.fromEntries(Object.entries(findings).map(([key, values]) => [key, values.length])), null, 2));
console.log(`Mock boundary present: ${fs.existsSync(MOCK_ROOT) ? "YES" : "NO"}`);

if (!fs.existsSync(MOCK_ROOT)) {
  console.error("Frontend mock boundary is missing: apps/web/src/mocks");
  process.exitCode = 1;
}
