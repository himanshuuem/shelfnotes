import { createApp } from "./app.js";
import { createPool } from "./db.js";
import { createBookRepo } from "./books.js";
import { createOpenLibrary } from "./openLibrary.js";

const pool = createPool();
const port = Number(process.env.PORT ?? 3000);
const server = createApp({ repo: createBookRepo(pool), openLibrary: createOpenLibrary() })
  .listen(port, () => console.log(`📚 ShelfNotes at http://localhost:${port}`));

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => pool.end().then(() => process.exit(0))));
}
