import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db.js";
import { createBookRepo, validateBook } from "../src/books.js";
import { createOpenLibrary, coverUrl } from "../src/openLibrary.js";

const fakeHttp = {
  async get(url, { params }) {
    if (params.q === "down") throw new Error("ECONNREFUSED");
    return { data: { docs: [{ key: "/works/OL1W", title: "Dune", author_name: ["Frank Herbert"], cover_i: 42, first_publish_year: 1965 }] } };
  },
};

test("coverUrl builds Open Library URLs", () => {
  assert.equal(coverUrl(42, "S"), "https://covers.openlibrary.org/b/id/42-S.jpg");
  assert.equal(coverUrl(null), null);
});

test("openLibrary.search maps docs and reports outages", async () => {
  const ol = createOpenLibrary({ http: fakeHttp });
  assert.deepEqual(await ol.search("dune"), [{ olKey: "/works/OL1W", title: "Dune", author: "Frank Herbert", coverId: 42, year: 1965 }]);
  await assert.rejects(ol.search("down"), /unreachable/);
  assert.deepEqual(await ol.search(" "), []);
});

test("validateBook enforces rating, date and ol_key format", () => {
  const ok = validateBook({ title: "Dune", rating: "9", date_read: "2026-01-02", ol_key: "/works/OL1W" });
  assert.equal(ok.errors, undefined);
  assert.equal(ok.value.olKey, "/works/OL1W");
  const bad = validateBook({ title: "", rating: "11", date_read: "2999-01-01", ol_key: "javascript:alert(1)" });
  assert.ok(bad.errors.title && bad.errors.rating && bad.errors.date_read);
  assert.equal(bad.value.olKey, null);
});

describe("ShelfNotes with PostgreSQL", { skip: !process.env.DATABASE_URL && "DATABASE_URL not set" }, () => {
  let pool;
  let repo;
  let server;
  let base;

  before(async () => {
    pool = createPool();
    await pool.query("DROP TABLE IF EXISTS books");
    for (const file of ["schema.sql", "seed.sql"]) await pool.query(await readFile(new URL(`../db/${file}`, import.meta.url), "utf8"));
    repo = createBookRepo(pool);
    server = createApp({ repo, openLibrary: createOpenLibrary({ http: fakeHttp }) }).listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server?.close();
    await pool?.end();
  });

  const post = (path, body) => fetch(`${base}${path}`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });

  test("home lists seeded books and sorts by rating", async () => {
    const byRating = await repo.list({ sort: "rating" });
    assert.ok(byRating[0].rating >= byRating.at(-1).rating);
    const html = await (await fetch(`${base}/?sort=title`)).text();
    assert.match(html, /Atomic Habits/);
  });

  test("search covers notes text", async () => {
    const results = await repo.list({ q: "tracer bullets" });
    assert.deepEqual(results.map((b) => b.title), ["The Pragmatic Programmer"]);
  });

  test("Open Library results prefill the add form", async () => {
    const html = await (await fetch(`${base}/books/new?q=dune`)).text();
    assert.match(html, /Frank Herbert/);
  });

  test("create, read, update, delete", async () => {
    const created = await post("/books", { ol_key: "/works/OL1W", title: "Dune", author: "Frank Herbert", cover_id: "42", year: "1965", rating: "10", date_read: "2026-10-01", summary: "Spice must flow.", notes: "Fear is the mind-killer.\n\nPara two." });
    assert.equal(created.status, 303);
    const path = created.headers.get("location");
    const page = await (await fetch(`${base}${path}`)).text();
    assert.match(page, /<p>Fear is the mind-killer.<\/p>/);
    assert.match(page, /covers\.openlibrary\.org\/b\/id\/42-L\.jpg/);

    const dupe = await post("/books", { ol_key: "/works/OL1W", title: "Dune", rating: "8", date_read: "2026-10-01" });
    assert.equal(dupe.status, 409);

    const id = Number(path.split("/").pop());
    await post(`${path}/edit`, { title: "Dune", author: "Frank Herbert", rating: "9", date_read: "2026-10-02", summary: "", notes: "" });
    assert.equal((await repo.get(id)).rating, 9);

    await post(`${path}/delete`, {});
    assert.equal(await repo.get(id), null);
  });

  test("invalid input re-renders with 422 and messages", async () => {
    const res = await post("/books", { title: "", rating: "0", date_read: "" });
    assert.equal(res.status, 422);
    assert.match(await res.text(), /Title is required/);
  });
});
