import axios from "axios";

const SEARCH_URL = "https://openlibrary.org/search.json";

export const coverUrl = (coverId, size = "M") => (coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : null);

export function createOpenLibrary({ http = axios.create({ timeout: 8000, headers: { "User-Agent": "ShelfNotes/1.0 (github.com/himanshuuem/shelfnotes)" } }) } = {}) {
  return {
    async search(query) {
      const q = String(query ?? "").trim();
      if (q.length < 2) return [];
      try {
        const { data } = await http.get(SEARCH_URL, {
          params: { q, limit: 12, fields: "key,title,author_name,cover_i,first_publish_year" },
        });
        return (data.docs ?? []).map((doc) => ({
          olKey: doc.key,
          title: doc.title,
          author: (doc.author_name ?? ["Unknown"]).slice(0, 2).join(", "),
          coverId: doc.cover_i ?? null,
          year: doc.first_publish_year ?? null,
        }));
      } catch {
        const error = new Error("Open Library is unreachable right now. You can still add the book manually.");
        error.status = 502;
        throw error;
      }
    },
  };
}
