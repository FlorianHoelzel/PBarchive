import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Sum of Best landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Sum of Best/i);
  assert.match(html, /speedrun\.com username/i);
  assert.match(
    html,
    /<script[^>]+src="https:\/\/stats\.sumof\.best\/script\.js"[^>]+data-website-id="b586f22e-d4e3-4a55-9154-c9f44325a61c"/i,
  );
  assert.doesNotMatch(html, /Your site is taking shape/i);
});

test("keeps the required public assets", async () => {
  await Promise.all([
    access(new URL("public/favicon.svg", projectRoot)),
    access(new URL("public/og-v2.png", projectRoot)),
    access(new URL("public/volpey-avatar.png", projectRoot)),
  ]);
});

test("server-renders shareable PB feed routes", async () => {
  const feed = await render("/volpey/feed");
  assert.equal(feed.status, 200);
  const feedHtml = await feed.text();
  assert.match(feedHtml, /PB FEED/i);
  assert.match(feedHtml, /class="brand-avatar"[^>]+src="\/volpey-avatar\.png"/);
  assert.match(feedHtml, /href="\/">SUM OF BEST<\/a>/);
  assert.match(
    feedHtml,
    /class="accent-name" href="\/volpey">VOLPEY<\/a>/i,
  );
  assert.match(feedHtml, /href="\/volpey#overview">OVERVIEW<\/a>/i);
  assert.match(feedHtml, /href="\/volpey#games">THE RUNS<\/a>/i);
  assert.match(feedHtml, /href="\/volpey\/feed">PB FEED<\/a>/i);
  assert.match(feedHtml, /href="\/volpey\/passport">PASSPORT<\/a>/i);
  assert.match(
    feedHtml,
    /class="accent-name" href="\/volpey">VOLPEY<\/a><span aria-hidden="true">\/<\/span><a href="\/volpey\/feed">PB FEED<\/a>/i,
  );
  assert.match(
    feedHtml,
    /href="\/volpey\/feed">PB FEED<\/a><a href="\/volpey\/passport">PASSPORT<\/a>/i,
  );
  const feedHeader = feedHtml.match(/<header class="site-header">.*?<\/header>/i)?.[0];
  assert.ok(feedHeader);
  assert.doesNotMatch(feedHeader, /<button/i);
  assert.match(feedHtml, /<section class="feed-hero">.*?aria-label="Feed actions"/i);
  assert.doesNotMatch(feedHtml, /FIRST PB IMPROVEMENT/i);

  const embed = await render("/volpey/embed/feed");
  assert.equal(embed.status, 200);
  assert.match(await embed.text(), /RECENT PERSONAL BESTS/i);
});

test("shows the tiered historical world-record achievement", async () => {
  const response = await render("/volpey");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /href="\/">SUM OF BEST<\/a>/);
  assert.match(html, /class="accent-name" href="\/volpey">VOLPEY<\/a>/i);
  assert.match(html, /href="\/volpey\/passport"/i);
  assert.match(html, /<h2>GAME INDEX<\/h2>/i);
  assert.match(html, /\d{2}(?:<!-- -->)? TITLES/);
  assert.doesNotMatch(html, /PB STAMPS/);
  assert.match(html, /WORLD BEATER/);
  assert.match(html, /World records when set/);
  assert.doesNotMatch(html, /WORLD RECORDS/);
  assert.doesNotMatch(html, /UNTOUCHABLE/);
});

test("serves a fresh generated archive from the durable cache", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sumof-best-cache-"));
  const username = "cached-runner";
  const key = createHash("sha256").update(username).digest("hex");
  const data = JSON.parse(
    await readFile(new URL("../app/data/speedruns.json", import.meta.url), "utf8"),
  );
  const now = Date.now();

  await writeFile(
    path.join(directory, `${key}.json`),
    JSON.stringify({
      version: 1,
      key,
      storedAt: new Date(now).toISOString(),
      refreshAfter: new Date(now + 60_000).toISOString(),
      expiresAt: new Date(now + 120_000).toISOString(),
      data,
    }),
  );

  process.env.ARCHIVE_CACHE_DIR = directory;
  try {
    const response = await render(`/${username}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Volpey(?:&apos;|&#x27;|â€™)s Sum of Best/i);
  } finally {
    delete process.env.ARCHIVE_CACHE_DIR;
    await rm(directory, { recursive: true, force: true });
  }
});

test("server-renders shareable and embeddable passport routes", async () => {
  const passport = await render("/volpey/passport");
  assert.equal(passport.status, 200);
  const passportHtml = await passport.text();
  assert.match(passportHtml, /SPEEDRUN PASSPORT/i);
  assert.match(
    passportHtml,
    /class="accent-name" href="\/volpey">VOLPEY<\/a><span aria-hidden="true">\/<\/span><a href="\/volpey\/passport">PASSPORT<\/a>/i,
  );
  assert.match(passportHtml, /SHARE PASSPORT/);
  assert.match(passportHtml, /ENTRY RECORD/);
  assert.match(passportHtml, /PB STAMPS/);
  assert.match(passportHtml, /EMBED/);

  const embed = await render("/volpey/embed/passport");
  assert.equal(embed.status, 200);
  const embedHtml = await embed.text();
  assert.match(embedHtml, /SPEEDRUN PASSPORT/i);
  assert.match(embedHtml, /OPEN PASSPORT/);
  assert.doesNotMatch(embedHtml, /SHARE PASSPORT/);
});
