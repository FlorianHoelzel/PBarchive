import assert from "node:assert/strict";
import { access } from "node:fs/promises";
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

test("server-renders the PB Archive landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /PB Archive/i);
  assert.match(html, /speedrun\.com username/i);
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
  assert.match(feedHtml, /href="\/">PB ARCHIVE<\/a>/);
  assert.match(
    feedHtml,
    /class="accent-name" href="\/volpey">VOLPEY<\/a>/i,
  );
  assert.match(feedHtml, /href="#top">FEED<\/a>/);
  assert.doesNotMatch(feedHtml, /FIRST PB IMPROVEMENT/i);

  const embed = await render("/volpey/embed/feed");
  assert.equal(embed.status, 200);
  assert.match(await embed.text(), /RECENT PERSONAL BESTS/i);
});

test("shows the tiered historical world-record achievement", async () => {
  const response = await render("/volpey");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /href="\/">PB ARCHIVE<\/a>/);
  assert.match(html, /class="accent-name" href="#top">VOLPEY<\/a>/);
  assert.match(html, /SPEEDRUN PASSPORT/);
  assert.match(html, /ENTRY RECORD/);
  assert.match(html, /PREVIOUS/);
  assert.match(html, /NEXT/);
  assert.match(html, /PB STAMPS/);
  assert.match(html, /HISTORIC WRS/);
  assert.match(html, /BIGGEST LEAP/);
  assert.match(html, /WORLD BEATER/);
  assert.match(html, /World records when set/);
  assert.doesNotMatch(html, /WORLD RECORDS/);
  assert.doesNotMatch(html, /UNTOUCHABLE/);
});
