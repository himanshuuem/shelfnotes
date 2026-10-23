CREATE TABLE IF NOT EXISTS books (
  id          SERIAL        PRIMARY KEY,
  ol_key      VARCHAR(40)   UNIQUE,                         -- Open Library work key, e.g. /works/OL17930368W
  title       VARCHAR(200)  NOT NULL CHECK (char_length(trim(title)) >= 1),
  author      VARCHAR(160)  NOT NULL DEFAULT 'Unknown',
  cover_id    INTEGER,                                      -- Open Library cover id
  year        SMALLINT      CHECK (year BETWEEN -3000 AND 2100),
  rating      SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 10),
  date_read   DATE          NOT NULL DEFAULT CURRENT_DATE,
  summary     VARCHAR(280)  NOT NULL DEFAULT '',
  notes       TEXT          NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS books_date_read_idx ON books (date_read DESC);
CREATE INDEX IF NOT EXISTS books_rating_idx ON books (rating DESC);
