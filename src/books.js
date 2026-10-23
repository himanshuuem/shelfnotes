export const SORTS = {
  recent: "date_read DESC, id DESC",
  rating: "rating DESC, date_read DESC",
  title: "lower(title) ASC",
};

export class BookError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

const optionalInt = (value) => (value === undefined || value === null || String(value).trim() === "" ? null : Number(value));

export function validateBook(input) {
  const errors = {};
  const title = String(input.title ?? "").trim();
  const author = String(input.author ?? "").trim() || "Unknown";
  const rating = Number(input.rating);
  const dateRead = String(input.date_read ?? "").trim();
  const summary = String(input.summary ?? "").trim();
  const notes = String(input.notes ?? "").replace(/\r\n/g, "\n").trim();
  const year = optionalInt(input.year);
  const coverId = optionalInt(input.cover_id);
  const olKey = /^\/works\/OL\d+W$/.test(input.ol_key ?? "") ? input.ol_key : null;

  if (!title) errors.title = "Title is required.";
  if (title.length > 200) errors.title = "Title is too long.";
  if (author.length > 160) errors.author = "Author is too long.";
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) errors.rating = "Rate it from 1 to 10.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRead) || Number.isNaN(Date.parse(dateRead))) errors.date_read = "Pick the date you finished it.";
  else if (new Date(dateRead) > new Date(Date.now() + 86_400_000)) errors.date_read = "That date is in the future.";
  if (summary.length > 280) errors.summary = "Keep the one-liner under 280 characters.";
  if (notes.length > 20_000) errors.notes = "Notes are too long.";
  if (year !== null && (!Number.isInteger(year) || year < -3000 || year > 2100)) errors.year = "Year looks off.";
  if (coverId !== null && (!Number.isInteger(coverId) || coverId < 1)) errors.cover_id = "Invalid cover id.";

  const value = { olKey, title, author, coverId, year, rating, dateRead, summary, notes };
  return Object.keys(errors).length ? { errors, value } : { value };
}

export function createBookRepo(pool) {
  const columns = "id, ol_key, title, author, cover_id, year, rating, to_char(date_read, 'YYYY-MM-DD') AS date_read, summary, notes";

  return {
    async list({ sort = "recent", q = "" } = {}) {
      const order = SORTS[sort] ?? SORTS.recent;
      const term = q.trim();
      const { rows } = await pool.query(
        `SELECT ${columns} FROM books
         WHERE $1 = '' OR title ILIKE '%' || $1 || '%' OR author ILIKE '%' || $1 || '%' OR notes ILIKE '%' || $1 || '%'
         ORDER BY ${order}`,
        [term],
      );
      return rows;
    },

    async stats() {
      const { rows } = await pool.query(`
        SELECT count(*)::int AS total,
               count(*) FILTER (WHERE date_part('year', date_read) = date_part('year', CURRENT_DATE))::int AS this_year,
               round(avg(rating), 1)::float AS avg_rating
        FROM books`);
      return rows[0];
    },

    async get(id) {
      const { rows } = await pool.query(`SELECT ${columns} FROM books WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },

    async create(book) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO books (ol_key, title, author, cover_id, year, rating, date_read, summary, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [book.olKey, book.title, book.author, book.coverId, book.year, book.rating, book.dateRead, book.summary, book.notes],
        );
        return rows[0].id;
      } catch (error) {
        if (error.code === "23505") throw new BookError("That book is already on your shelf.", 409);
        throw error;
      }
    },

    async update(id, book) {
      const { rowCount } = await pool.query(
        `UPDATE books SET title = $2, author = $3, cover_id = $4, year = $5, rating = $6, date_read = $7,
                summary = $8, notes = $9, updated_at = now()
         WHERE id = $1`,
        [id, book.title, book.author, book.coverId, book.year, book.rating, book.dateRead, book.summary, book.notes],
      );
      return rowCount === 1;
    },

    async remove(id) {
      await pool.query("DELETE FROM books WHERE id = $1", [id]);
    },
  };
}
