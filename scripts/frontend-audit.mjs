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
  return source.split(/\r?\n/).flatMap((line, index) => {
    regex.lastIndex = 0;
    return regex.test(line) ? [{ file: rel(file), line: index + 1, text: line.trim().slice(0, 220) }] : [];
  });
}

const files = walk(ROOT);
const sourceFiles = files.filter((file) => !file.includes(`${path.sep}mocks${path.sep}`));
const findings = {
  commentMarkers: [],
  mockDataSignalsOutsideMocks: [],
  uiExampleIdentities: [],
  hardcodedUrls: [],
  debugLogs: [],
  timersOrRandom: [],
  directStorage: [],
  legacyFiles: [],
  largeFiles: [],
  duplicatedShell: [],
  iconButtonsWithoutAccessibleName: [],
};

for (const file of sourceFiles) {
  const relative = rel(file);
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/).length;

  findings.commentMarkers.push(...lineMatches(file, /(?:\/\/|\/\*|\*)\s*(TODO|FIXME|HACK|XXX)\b/i));
  findings.mockDataSignalsOutsideMocks.push(...lineMatches(file, /\b(mockData|mock[A-Z][A-Za-z0-9_]*|fakeData|fixture(?:s|Data)?|dummyData|demoData|sampleData|seedData)\b/));
  findings.uiExampleIdentities.push(...lineMatches(file, /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?1?[\s.-]?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/i));
  findings.hardcodedUrls.push(...lineMatches(file, /https?:\/\/(?!schema\.org|www\.w3\.org|fonts\.googleapis\.com|fonts\.gstatic\.com)/i));
  findings.debugLogs.push(...lineMatches(file, /console\.(log|debug|trace)\s*\(/));
  findings.timersOrRandom.push(...lineMatches(file, /Math\.random\s*\(|setTimeout\s*\(|setInterval\s*\(/));
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

  if (path.extname(file) === ".tsx") {
    const sourceLines = source.split(/\r?\n/);
    sourceLines.forEach((line, index) => {
      if (/<Button\b/.test(line) && /size=["']icon["']/.test(line) && !/(aria-label|title)=/.test(line)) {
        findings.iconButtonsWithoutAccessibleName.push({ file: relative, line: index + 1, text: line.trim().slice(0, 220) });
      }
    });
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
