INSERT INTO books (ol_key, title, author, cover_id, year, rating, date_read, summary, notes) VALUES
  ('/works/OL17930368W', 'Atomic Habits', 'James Clear', 12539702, 2016, 9, '2026-09-14',
   'Tiny changes, compounded, beat big resolutions.',
   E'Systems > goals. You don''t rise to the level of your goals; you fall to the level of your systems.\n\nThe four laws: make it obvious, attractive, easy, satisfying. Invert them to break a bad habit.\n\nI started habit-stacking: "After I pour my morning chai, I will review my task list."'),
  ('/works/OL17713267W', 'Deep Work', 'Cal Newport', 7988607, 2016, 8, '2026-07-02',
   'Focused, distraction-free work is rare — and valuable.',
   E'Schedule every minute; treat focus like a muscle. Shutdown ritual at the end of the day.\n\nBiggest takeaway: batch shallow work so it doesn''t eat the whole day.'),
  ('/works/OL5748544W', 'The Pragmatic Programmer', 'Andy Hunt, Dave Thomas', 10143650, 1999, 9, '2026-05-20',
   'Habits and attitudes of effective software developers.',
   E'DRY is about knowledge, not just code. Tracer bullets: build a thin end-to-end slice first.\n\n"Don''t live with broken windows" — fix small messes before they spread.')
ON CONFLICT (ol_key) DO NOTHING;
