import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function collectSourceFiles(root:string):string[]{return readdirSync(root).flatMap((name)=>{const path=join(root,name);if(name==="branding.test.ts")return[];return statSync(path).isDirectory()?collectSourceFiles(path):/\.(ts|tsx|css)$/.test(name)?[path]:[]})}

describe("Maid Flow branding",()=>{
  it("does not reintroduce historical product names in active application code",()=>{
    const root=join(process.cwd(),"apps/web/src/app/maid-flow");
    const files=[...collectSourceFiles(root),join(process.cwd(),"index.html")];
    const content=files.map((path)=>readFileSync(path,"utf8")).join("\n");
    expect(content).not.toMatch(/Clean\s*Pro/i);
    expect(content).not.toMatch(/Clean\s*Flow/i);
    expect(content).toMatch(/Maid Flow/);
  });
});
