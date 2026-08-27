'use strict';

const express = require('express');
const { db } = require('../db');
const { layout, esc } = require('../render');

const router = express.Router();

// ---------------------------------------------------------------------------
// INTENTIONAL SQL injection — additional route.
//
// The query concatenates user input directly into a LIKE clause. This is the
// ONLY query in the application built this way; every other DB call uses bound
// parameters. UNION-based injection over the three projected columns
// (title, department, classification) can read the `secrets` table (the flag).
//
//   Base query:
//     SELECT title, department, classification
//     FROM documents
//     WHERE title LIKE '%<q>%'
// ---------------------------------------------------------------------------
router.get('/search', (req, res) => {
  const q = req.query.q != null ? String(req.query.q) : null;
  let rows = null;
  let error = null;
  let sql = null;

  if (q !== null) {
    sql =
      "SELECT title, department, classification FROM documents " +
      "WHERE title LIKE '%" + q + "%'";
    try {
      rows = db.prepare(sql).all();
    } catch (e) {
      // Verbose SQL errors are intentionally surfaced (error-based SQLi aid).
      error = e.message;
    }
  }

  let results = '';
  if (error) {
    results = `<div class="alert">SQL error: ${esc(error)}</div>`;
  } else if (rows) {
    if (rows.length === 0) {
      results = `<p class="muted">No documents matched <code>${esc(q)}</code>.</p>`;
    } else {
      results =
        `<table class="tbl"><thead><tr><th>Title</th><th>Department</th><th>Classification</th></tr></thead><tbody>` +
        rows
          .map(
            (r) =>
              `<tr><td>${esc(r.title)}</td><td>${esc(r.department)}</td><td>${esc(r.classification)}</td></tr>`
          )
          .join('') +
        `</tbody></table>`;
    }
  }

  const user = req.currentUser || null;
  const body = `
  <h1>Search documents</h1>
  <form method="get" action="/search" class="searchbar">
    <input name="q" value="${esc(q || '')}" placeholder="Search document titles…" autofocus>
    <button class="btn" type="submit">Search</button>
  </form>
  ${results}`;
  res.send(layout({ title: 'Search', body, user, theme: req.prefs && req.prefs.theme }));
});

module.exports = router;
