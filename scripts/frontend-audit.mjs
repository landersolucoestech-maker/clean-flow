import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve("apps/web/src");
const MOCK_ROOT = path.join(ROOT, "mocks");
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const BUSINESS_RECORD_KEYS = new Set([
  "name", "email", "phone", "phone2", "address", "customer", "customer_id",
  "company", "company_id", "amount", "status", "employeeName", "employee_name",
  "client", "businessName", "business_name",
]);

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

function isStaticDataCatalog(relative) {
  return relative.startsWith("apps/web/src/app/i18n/") || relative.endsWith("/app/infrastructure/supabase/types.ts");
}

function propertyName(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return null;
}

function findBusinessRecordArrays(file, source) {
  if (!/\.(ts|tsx)$/.test(file)) return [];
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const results = [];

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      const objects = node.initializer.elements.filter(ts.isObjectLiteralExpression);
      if (objects.length >= 2 && objects.length === node.initializer.elements.length) {
        const qualifying = objects.filter((object) => {
          const keys = object.properties.map((property) => propertyName(property.name)).filter(Boolean);
          return keys.filter((key) => BUSINESS_RECORD_KEYS.has(key)).length >= 2;
        });
        if (qualifying.length >= 2) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          results.push({ file: rel(file), line: line + 1, variable: node.name.text, records: objects.length });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return results;
}

function findUnsafeHtml(file, source) {
  if (!source.includes("dangerouslySetInnerHTML")) return [];
  if (/DOMPurify\.sanitize\s*\(/.test(source)) return [];
  return lineMatches(file, /dangerouslySetInnerHTML/);
}

function findUnsafeBlankTargets(file, source) {
  const findings = [];
  for (const match of source.matchAll(/<a\b[\s\S]*?>/gi)) {
    const tag = match[0];
    if (!/target\s*=\s*["']_blank["']/i.test(tag)) continue;
    if (/rel\s*=\s*["'][^"']*\bnoopener\b[^"']*["']/i.test(tag)) continue;
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    findings.push({ file: rel(file), line, text: tag.replace(/\s+/g, " ").slice(0, 220) });
  }
  return findings;
}

function findImagesWithoutAlt(file, source) {
  const findings = [];
  for (const match of source.matchAll(/<img\b[\s\S]*?>/gi)) {
    const tag = match[0];
    if (/\balt\s*=/.test(tag)) continue;
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    findings.push({ file: rel(file), line, text: tag.replace(/\s+/g, " ").slice(0, 220) });
  }
  return findings;
}

function hasDirectSupabaseClientImport(source) {
  return /from\s+["'](?:@\/integrations\/supabase\/client|@\/app\/infrastructure\/supabase\/client|\.\.?\/[^"']*supabase\/client)["']/.test(source);
}

const files = walk(ROOT);
const sourceFiles = files.filter((file) => !file.includes(`${path.sep}mocks${path.sep}`));
const findings = {
  commentMarkers: [],
  mockDataSignalsOutsideMocks: [],
  businessRecordLiteralsOutsideMocks: [],
  uiExampleIdentities: [],
  hardcodedUrls: [],
  debugLogs: [],
  timersOrRandom: [],
  directStorage: [],
  typeSafetySuppressions: [],
  unsafeHtml: [],
  targetBlankWithoutRel: [],
  imagesWithoutAlt: [],
  directSupabaseInUI: [],
  legacyFiles: [],
  largeLogicFiles: [],
  staticDataCatalogs: [],
  duplicatedShell: [],
  iconButtonsWithoutAccessibleName: [],
};

for (const file of sourceFiles) {
  const relative = rel(file);
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/).length;

  findings.commentMarkers.push(...lineMatches(file, /(?:\/\/|\/\*|\*)\s*(TODO|FIXME|HACK|XXX)\b/i));
  findings.mockDataSignalsOutsideMocks.push(...lineMatches(file, /\b(mockData|mock[A-Z][A-Za-z0-9_]*|fakeData|fixtureData|testFixtures|dummyData|demoData|sampleData|seedData)\b/));
  findings.businessRecordLiteralsOutsideMocks.push(...findBusinessRecordArrays(file, source));
  findings.uiExampleIdentities.push(...lineMatches(file, /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?1?[\s.-]?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/i));
  findings.hardcodedUrls.push(...lineMatches(file, /https?:\/\/(?!schema\.org|www\.w3\.org|fonts\.googleapis\.com|fonts\.gstatic\.com)/i));
  findings.debugLogs.push(...lineMatches(file, /console\.(log|debug|trace)\s*\(/));
  findings.timersOrRandom.push(...lineMatches(file, /Math\.random\s*\(|setTimeout\s*\(|setInterval\s*\(/));
  findings.directStorage.push(...lineMatches(file, /\b(localStorage|sessionStorage)\b/));
  findings.typeSafetySuppressions.push(...lineMatches(file, /@ts-(ignore|nocheck|expect-error)|eslint-disable|\bas\s+any\b|:\s*any\b/));
  findings.unsafeHtml.push(...findUnsafeHtml(file, source));
  findings.targetBlankWithoutRel.push(...findUnsafeBlankTargets(file, source));
  findings.imagesWithoutAlt.push(...findImagesWithoutAlt(file, source));

  if (/\.(tsx|jsx)$/.test(file) && !relative.includes("/hooks/") && !relative.includes("/services/") && (hasDirectSupabaseClientImport(source) || /\bsupabase\s*\.\s*(from|rpc|functions|auth|storage)\b/s.test(source))) {
    findings.directSupabaseInUI.push({ file: relative });
  }

  if (/Legacy|Critical|Old|Deprecated/i.test(path.basename(file))) findings.legacyFiles.push({ file: relative });
  if (lines >= 800) {
    (isStaticDataCatalog(relative) ? findings.staticDataCatalogs : findings.largeLogicFiles).push({ file: relative, lines });
  }
  if (relative !== "apps/web/src/app/layout/PageLayout.tsx" && /<Sidebar\b|<Header\b/.test(source)) findings.duplicatedShell.push({ file: relative });

  if (path.extname(file) === ".tsx") {
    source.split(/\r?\n/).forEach((line, index) => {
      if (/<Button\b/.test(line) && /size=["']icon["']/.test(line) && !/(aria-label|title)=/.test(line)) {
        findings.iconButtonsWithoutAccessibleName.push({ file: relative, line: index + 1, text: line.trim().slice(0, 220) });
      }
    });
  }
}

for (const key of Object.keys(findings)) {
  const values = findings[key];
  console.log(`\n=== ${key} (${values.length}) ===`);
  for (const item of values.slice(0, 200)) console.log(JSON.stringify(item));
  if (values.length > 200) console.log(`... ${values.length - 200} additional findings omitted`);
}

console.log("\n=== summary ===");
console.log(JSON.stringify(Object.fromEntries(Object.entries(findings).map(([key, values]) => [key, values.length])), null, 2));
console.log(`Mock boundary present: ${fs.existsSync(MOCK_ROOT) ? "YES" : "NO"}`);

if (!fs.existsSync(MOCK_ROOT)) {
  console.error("Frontend mock boundary is missing: apps/web/src/mocks");
  process.exitCode = 1;
}
