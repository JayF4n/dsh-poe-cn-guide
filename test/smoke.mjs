// Smoke test: load the provider with a fake ctx and exercise list()/get().
// Run with: node test/smoke.mjs

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const warnings = [];
const providers = [];
const ctx = {
  logger: { warn: (m) => warnings.push(m), info: () => {}, debug: () => {} },
  skills: { registerProvider: (factory) => providers.push(factory) },
};

const mod = await import(pathToFileURL(join(ROOT, "lib", "index.js")).href);
assert.equal(mod.name, "poe-cn-guide", "plugin name");
assert.deepEqual(mod.inject, ["skills"], "injects the skill registry");
assert.equal(typeof mod.apply, "function", "apply is exported");

mod.apply(ctx, { assetRoot: join(ROOT, "skills").replace(/\\\\/g, "/") });
assert.equal(providers.length, 1, "one provider registered");

let invalidations = 0;
const control = { invalidate: () => { invalidations++; } };
const provider = providers[0](control);
assert.equal(provider.name, "dsh-poe-cn-guide", "provider name");

const listed = await provider.list({ signal: undefined });
assert.equal(listed.complete, true, "list is complete");
assert.equal(listed.candidates.length, 1, "one candidate");
const candidate = listed.candidates[0];
assert.equal(candidate.name, "poe-cn-guide", "candidate name");
assert.ok(candidate.description.includes("Path of Exile"), "description mentions PoE");
assert.equal(candidate.rank, 600, "bundled rank");
assert.equal(candidate.resourceBase.kind, "directory", "resourceBase is a directory");
assert.ok(candidate.resourceBase.path.endsWith("/skills/poe-cn-guide"), "resourceBase points at the skill");

const loaded = await provider.get(candidate, { signal: undefined });
assert.ok(loaded.content.startsWith("# Path of Exile"), "body starts with the H1");
assert.ok(!loaded.content.includes("---\nname:"), "frontmatter is stripped from the body");
assert.equal(loaded.rank, undefined, "rank is not leaked into the loaded skill");

// the data files shipped beside SKILL.md must be readable from resourceBase
const glossary = JSON.parse(await readFile(join(candidate.resourceBase.path, "data", "glossary.json"), "utf8"));
assert.ok(Object.keys(glossary.entries).length > 3000, "glossary has >3000 entries");
assert.equal(glossary.entries.Inspiration_Support.color, "red", "Inspiration Support is a red gem");
assert.equal(glossary.entries.The_Maven.cn, "贤主", "override entry survived packaging");

const overrides = JSON.parse(await readFile(join(candidate.resourceBase.path, "data", "overrides.json"), "utf8"));
assert.equal(Object.keys(overrides.entries).length, 6, "six curated overrides");

// a missing assetRoot must degrade to an empty, complete catalog instead of throwing
const lonely = [];
const ctx2 = { logger: ctx.logger, skills: { registerProvider: (f) => lonely.push(f) } };
mod.apply(ctx2, { assetRoot: join(ROOT, "does-not-exist").replace(/\\\\/g, "/") });
const p2 = lonely[0](control);
const empty = await p2.list({ signal: undefined });
assert.equal(empty.candidates.length, 0, "missing root yields no candidates");
assert.equal(empty.complete, true, "missing root is a complete (if empty) catalog");
assert.equal(await p2.get({ name: "poe-cn-guide" }, { signal: undefined }), undefined, "get returns undefined");
assert.equal(invalidations, 1, "provider invalidates so the catalog retries later");
assert.ok(warnings.length >= 1, "the failure is logged once");

console.log(JSON.stringify({
  ok: true,
  entry: candidate.name,
  entries: Object.keys(glossary.entries).length,
  gems: Object.keys(JSON.parse(await readFile(join(candidate.resourceBase.path, "data", "gem-colors.json"), "utf8")).colors).length,
  warnings: warnings.length,
}));
