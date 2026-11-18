import { readFile } from "node:fs/promises";
import { isAbsolute, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import z from "@deepseek-ai/schemastery";
import { parse } from "yaml";

/**
 * Bundled poe-cn-guide skill for the DeepSeek Harness.
 *
 * Registers a skill provider named "dsh-poe-cn-guide" that serves the SKILL.md shipped in
 * ../skills/poe-cn-guide. The skill directory keeps its data/ and scripts/ beside SKILL.md,
 * and the catalog entry resourceBase points there, so the agent can run
 * "node scripts/lookup.mjs ..." relative to the skill root.
 */

const SKILL_NAME = "poe-cn-guide";

const Config = z.object({
  assetRoot: z.string().min(1),
});

const name = "poe-cn-guide";
const inject = ["skills"];

/** Parse YAML frontmatter the way the built-in providers do. */
function parseSkill(raw, path) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(raw);
  if (frontmatter?.[1] === undefined) {
    throw new Error(SKILL_NAME + ": " + path + " has no YAML frontmatter");
  }
  const metadata = parse(frontmatter[1]);
  const description =
    typeof metadata === "object" && metadata !== null && "description" in metadata
      ? metadata.description
      : undefined;
  if (typeof description !== "string" || description.length === 0) {
    throw new Error(SKILL_NAME + ": " + path + " has no description");
  }
  const declaredName = typeof metadata.name === "string" ? metadata.name : SKILL_NAME;
  return { declaredName, description, content: raw.slice(frontmatter[0].length).trim() };
}

function persistentReadFailure(error) {
  const code = error instanceof Error && "code" in error ? error.code : undefined;
  return code === "ENOENT" || code === "ENOTDIR";
}

function apply(ctx, config) {
  const assetRoot = config.assetRoot ?? fileURLToPath(new URL("../skills/", import.meta.url));
  if (!isAbsolute(assetRoot)) {
    throw new Error(SKILL_NAME + ": assetRoot must be an absolute directory");
  }

  const reportedFailures = new Map();

  function failed(error, persistent) {
    const failure = String(error);
    if (reportedFailures.get(SKILL_NAME) !== failure) {
      reportedFailures.set(SKILL_NAME, failure);
      ctx.logger.warn(SKILL_NAME + ": skill is unavailable: " + failure);
    }
    return { kind: "failed", error, persistent };
  }

  async function readSkill(signal) {
    const path = join(assetRoot, SKILL_NAME, "SKILL.md");
    let raw;
    try {
      raw = await readFile(path, { encoding: "utf8", signal });
    } catch (error) {
      if (signal?.aborted === true) throw error;
      return failed(error, persistentReadFailure(error));
    }
    try {
      return { kind: "loaded", ...parseSkill(raw, path) };
    } catch (error) {
      return failed(error, true);
    }
  }

  ctx.skills.registerProvider((control) => ({
    name: "dsh-poe-cn-guide",
    async list(options) {
      const read = await readSkill(options.signal);
      if (read.kind === "failed") return { candidates: [], complete: read.persistent };
      reportedFailures.delete(SKILL_NAME);
      const directory = join(assetRoot, SKILL_NAME);
      return {
        complete: true,
        candidates: [
          {
            name: read.declaredName,
            description: read.description,
            invocation: { modelInvocable: true, userInvocable: true },
            provider: "dsh-poe-cn-guide",
            source: "bundled",
            rank: 600,
            resourceBase: { kind: "directory", path: directory.split(sep).join("/") },
            locator: join(directory, "SKILL.md"),
          },
        ],
      };
    },
    async get(candidate, options) {
      const { rank: _rank, locator: _locator, ...summary } = candidate;
      const read = await readSkill(options.signal);
      if (read.kind === "failed") {
        if (!read.persistent) throw read.error;
        control.invalidate();
        return;
      }
      return { ...summary, content: read.content };
    },
  }));
}

export { Config, apply, inject, name };
