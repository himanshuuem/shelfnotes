import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { SORTS, BookError, validateBook } from "./books.js";
import { coverUrl } from "./openLibrary.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const today = () => new Date().toISOString().slice(0, 10);

export function createApp({ repo, openLibrary }) {
  const app = express();
  app.disable("x-powered-by");
  app.set("view engine", "ejs");
  app.set("views", path.join(root, "views"));
  app.use(express.static(path.join(root, "public")));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));
  app.locals.coverUrl = coverUrl;
  app.locals.paragraphs = (text) => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const id = (value) => (/^\d+$/.test(String(value)) ? Number(value) : null);
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  app.get("/", wrap(async (req, res) => {
    const sort = SORTS[req.query.sort] ? req.query.sort : "recent";
    const q = typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";
    res.render("index", { books: await repo.list({ sort, q }), stats: await repo.stats(), sort, q, flash: req.query.flash ?? null });
  }));

  app.get("/books/new", wrap(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";
    let results = [];
    let searchError = null;
    if (q) {
      try {
        results = await openLibrary.search(q);
      } catch (error) {
        searchError = error.message;
      }
    }
    // Picking a search result pre-fills the form via query params.
    const prefill = {
      ol_key: req.query.ol_key ?? "",
      title: req.query.title ?? "",
      author: req.query.author ?? "",
      cover_id: req.query.cover_id ?? "",
      year: req.query.year ?? "",
      rating: 8,
      date_read: today(),
      summary: "",
      notes: "",
    };
    res.render("new", { q, results, searchError, values: prefill, errors: {} });
  }));

  app.post("/books", wrap(async (req, res) => {
    const { value, errors } = validateBook(req.body);
    if (errors) return res.status(422).render("new", { q: "", results: [], searchError: null, values: req.body, errors });
    try {
      const newId = await repo.create(value);
      res.redirect(303, `/books/${newId}`);
    } catch (error) {
      if (!(error instanceof BookError)) throw error;
      res.status(error.status).render("new", { q: "", results: [], searchError: null, values: req.body, errors: { title: error.message } });
    }
  }));

  app.get("/books/:id", wrap(async (req, res) => {
    const book = await repo.get(id(req.params.id));
    if (!book) return res.status(404).render("notfound");
    res.render("show", { book });
  }));

  app.get("/books/:id/edit", wrap(async (req, res) => {
    const book = await repo.get(id(req.params.id));
    if (!book) return res.status(404).render("notfound");
    res.render("edit", { book, values: book, errors: {} });
  }));

  app.post("/books/:id/edit", wrap(async (req, res) => {
    const book = await repo.get(id(req.params.id));
    if (!book) return res.status(404).render("notfound");
    const { value, errors } = validateBook({ ...req.body, ol_key: book.ol_key });
    if (errors) return res.status(422).render("edit", { book, values: { ...book, ...req.body }, errors });
    await repo.update(book.id, value);
    res.redirect(303, `/books/${book.id}`);
  }));

  app.post("/books/:id/delete", wrap(async (req, res) => {
    await repo.remove(id(req.params.id));
    res.redirect(303, "/?flash=deleted");
  }));

  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use((req, res) => res.status(404).render("notfound"));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send("Something went wrong. Is Postgres running and set up? (npm run db:setup)");
  });

  return app;
}
