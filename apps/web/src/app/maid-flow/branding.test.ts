import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function collectTextFiles(root:string):string[]{return readdirSync(root).flatMap((name)=>{const path=join(root,name);return statSync(path).isDirectory()?collectTextFiles(path):/\.(ts|tsx|css|md)$/.test(name)?[path]:[]})}

describe("Maid Flow branding",()=>{
  it("does not reintroduce historical product names in the active rebuild",()=>{
    const root=join(process.cwd(),"apps/web/src/app/maid-flow");
    const files=[...collectTextFiles(root),join(process.cwd(),"index.html"),join(process.cwd(),"README.md")];
    const content=files.map((path)=>readFileSync(path,"utf8")).join("\n");
    expect(content).not.toMatch(/Clean\s*Pro/i);
    expect(content).not.toMatch(/Clean\s*Flow/i);
    expect(content).toMatch(/Maid Flow/);
  });
});
