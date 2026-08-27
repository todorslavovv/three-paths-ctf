'use strict';

const express = require('express');
const { db } = require('../db');
const { layout, esc, C, icon } = require('../render');

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
    results = `<div class="${C.alert}">${icon('bug_report', 'text-lg')}<span>SQL error: ${esc(error)}</span></div>`;
  } else if (rows) {
    if (rows.length === 0) {
      results = `<p class="${C.muted}">No documents matched <code class="text-primary">${esc(q)}</code>.</p>`;
    } else {
      results = `
      <div class="border border-surface-border rounded-lg overflow-hidden">
        <table class="${C.table}">
          <thead><tr class="bg-surface-container-high text-outline font-label-sm-mono text-label-sm-mono uppercase tracking-widest">
            <th class="px-4 py-3">Title</th><th class="px-4 py-3">Department</th><th class="px-4 py-3">Classification</th>
          </tr></thead>
          <tbody>${rows
            .map(
              (r) => `<tr class="border-t border-surface-border/60">
              <td class="px-4 py-3 text-on-surface">${esc(r.title)}</td>
              <td class="px-4 py-3 text-on-surface-variant">${esc(r.department)}</td>
              <td class="px-4 py-3 text-on-surface-variant">${esc(r.classification)}</td></tr>`
            )
            .join('')}</tbody>
        </table>
      </div>`;
    }
  }

  const body = `
  <div>
    <h1 class="${C.h1}">Search documents</h1>
    <p class="${C.muted} mt-1">Query the document archive by title.</p>
  </div>
  <form method="get" action="/search" class="flex gap-3">
    <div class="relative flex-1">
      <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
      <input name="q" value="${esc(q || '')}" placeholder="Search document titles…" autofocus
        class="${C.input} pl-11">
    </div>
    <button class="${C.btn}" type="submit">Search</button>
  </form>
  ${results}`;
  res.send(layout({ title: 'Search', body, user: req.currentUser || null, theme: req.prefs && req.prefs.theme, active: 'search' }));
});

module.exports = router;
