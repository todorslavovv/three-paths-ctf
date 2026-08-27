'use strict';

// Session guard for authenticated pages/APIs.
function isApi(req) {
  return (req.originalUrl || req.url || '').startsWith('/api/');
}

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  if (isApi(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') return next();
  if (isApi(req)) {
    return res.status(403).json({ error: 'Administrator role required' });
  }
  return res.status(403).send('403 Forbidden — administrator role required');
}

module.exports = { requireAuth, requireAdmin };
