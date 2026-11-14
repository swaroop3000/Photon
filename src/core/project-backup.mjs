/** Validation boundary for untrusted, version-1 local project backup files.
 * Existing live storage is not migrated or rewritten by this module.
 */
import {validateFeature} from './feature-io.mjs';

export const PROJECT_BACKUP_FORMAT = 'photon/local-project-backup/1';
export const MAX_BACKUP_BYTES = 20_000_000;
const own = (o, key) => Object.hasOwn(o, key);
const fail = path => { throw new RangeError('Invalid backup: ' + path); };
function object(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path);
}
function string(value, path) { if (typeof value !== 'string') fail(path); }
function list(value, path) { if (!Array.isArray(value)) fail(path); }
function time(value, path) { if (!Number.isFinite(value) || value < 0) fail(path); }
function id(value, path) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) fail(path);
}
function branch(value, path) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_./-]+$/.test(value)) fail(path);
}
// Bound nesting and refuse object keys that could become prototype setters in
// legacy object-map operations. Preserve all other JSON extension metadata.
function json(value, path, depth = 0) {
  if (depth > 64) fail(path + ' exceeds nesting limit');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object') fail(path);
  for (const [key, child] of Object.entries(value)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) fail(path + '.' + key);
    json(child, path + '.' + key, depth + 1);
  }
}
function snapshot(value, path) {
  object(value, path);
  string(value.name, path + '.name');
  if (typeof value.seq !== 'string' || /[^ACGTRYSWKMBDHVN]/.test(value.seq)) fail(path + '.seq');
  if (!['linear', 'circular'].includes(value.topology)) fail(path + '.topology');
  list(value.features, path + '.features');
  for (const f of value.features) {
    object(f, path + '.feature');
    string(f.name, path + '.feature.name');
    string(f.type, path + '.feature.type');
    validateFeature(f, value.seq.length, {circular: value.topology === 'circular'});
    if (f.qualifiers !== undefined) object(f.qualifiers, path + '.feature.qualifiers');
  }
}
function commitGraph(commits, path) {
  // Iterative traversal handles long histories without recursive stack overflow.
  const done = new Set(), active = new Set();
  for (const root of Object.keys(commits)) {
    const stack = [[root, false]];
    while (stack.length) {
      const [key, exiting] = stack.pop();
      if (exiting) { active.delete(key); done.add(key); continue; }
      if (done.has(key)) continue;
      if (active.has(key)) fail(path + ' contains a commit cycle');
      active.add(key); stack.push([key, true]);
      for (const parent of commits[key].parents) stack.push([parent, false]);
    }
  }
}
function project(r, key) {
  const path = 'repos.' + key;
  object(r, path); id(key, path + '.id');
  if (r.id !== key) fail(path + '.id mismatch');
  string(r.name, path + '.name');
  for (const k of ['desc', 'readme']) if (r[k] !== undefined) string(r[k], path + '.' + k);
  time(r.created, path + '.created'); time(r.stars, path + '.stars');
  if (r.protected !== undefined && typeof r.protected !== 'boolean') fail(path + '.protected');
  snapshot(r.working, path + '.working');
  object(r.commits, path + '.commits');
  if (!Object.keys(r.commits).length) fail(path + '.commits empty');
  for (const [cid, c] of Object.entries(r.commits)) {
    id(cid, path + '.commit.id'); object(c, path + '.commit');
    if (c.id !== cid) fail(path + '.commit.id mismatch');
    for (const k of ['msg', 'author']) string(c[k], path + '.commit.' + k);
    branch(c.branch, path + '.commit.branch'); time(c.time, path + '.commit.time');
    if (c.merge !== undefined && typeof c.merge !== 'boolean') fail(path + '.commit.merge');
    snapshot(c.snap, path + '.commit.snap'); list(c.parents, path + '.commit.parents');
    for (const p of c.parents) {
      id(p, path + '.commit.parent');
      if (!own(r.commits, p)) fail(path + '.missing parent ' + p);
    }
  }
  commitGraph(r.commits, path);
  object(r.branches, path + '.branches'); branch(r.branch, path + '.branch');
  if (!own(r.branches, r.branch)) fail(path + '.active branch missing');
  for (const [b, ref] of Object.entries(r.branches)) {
    branch(b, path + '.branch'); object(ref, path + '.branch reference');
    id(ref.head, path + '.head');
    if (!own(r.commits, ref.head)) fail(path + '.branch head missing');
  }
  for (const k of ['tags', 'pulls', 'issues', 'wiki']) list(r[k], path + '.' + k);
  for (const t of r.tags) {
    object(t, path + '.tag'); string(t.name, path + '.tag.name');
    string(t.note, path + '.tag.note'); time(t.time, path + '.tag.time');
    id(t.commitId, path + '.tag.commitId');
    if (!own(r.commits, t.commitId)) fail(path + '.tag commit missing');
  }
  for (const p of r.pulls) {
    object(p, path + '.pull'); id(p.id, path + '.pull.id');
    string(p.title, path + '.pull.title'); string(p.desc, path + '.pull.desc');
    branch(p.from, path + '.pull.from'); branch(p.to, path + '.pull.to');
    if (!['open', 'closed', 'merged'].includes(p.status)) fail(path + '.pull.status');
    if (p.status === 'open' && (!own(r.branches, p.from) || !own(r.branches, p.to)))
      fail(path + '.open pull branch missing');
    time(p.created, path + '.pull.created'); list(p.reviews, path + '.pull.reviews');
    for (const rv of p.reviews) {
      object(rv, path + '.review'); string(rv.who, path + '.review.who');
      string(rv.text, path + '.review.text'); time(rv.time, path + '.review.time');
      if (!['approved', 'changes', 'comment'].includes(rv.state)) fail(path + '.review.state');
    }
  }
  for (const i of r.issues) {
    object(i, path + '.issue'); id(i.id, path + '.issue.id');
    string(i.title, path + '.issue.title'); time(i.created, path + '.issue.created');
    if (!['open', 'closed'].includes(i.status)) fail(path + '.issue.status');
    for (const k of ['assignee', 'milestone']) if (i[k] !== undefined) string(i[k], path + '.issue.' + k);
    list(i.labels, path + '.issue.labels'); i.labels.forEach(l => string(l, path + '.label'));
    list(i.comments, path + '.issue.comments');
    for (const c of i.comments) {
      object(c, path + '.comment'); string(c.who, path + '.comment.who');
      string(c.text, path + '.comment.text'); time(c.time, path + '.comment.time');
    }
  }
  if (!r.wiki.length) fail(path + '.wiki empty');
  for (const w of r.wiki) {
    object(w, path + '.wiki page'); string(w.title, path + '.wiki.title'); string(w.body, path + '.wiki.body');
  }
}

export function parseProjectBackup(text) {
  if (typeof text !== 'string') throw new TypeError('Backup must be JSON text');
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) fail('exceeds 20 MB limit');
  const payload = JSON.parse(text);
  object(payload, 'payload');
  if (payload.format !== PROJECT_BACKUP_FORMAT) fail('unsupported format');
  json(payload, 'payload');
  return validateProjectDatabase(payload.data);
}

/** Shared semantic validation for live storage and backup import. */
export function validateProjectDatabase(db, {maxProjects = 500} = {}) {
  json(db, 'data');
  object(db, 'data'); object(db.repos, 'repos');
  const entries = Object.entries(db.repos);
  if (!entries.length || entries.length > maxProjects) fail('invalid project count');
  id(db.cur, 'active project');
  if (!own(db.repos, db.cur)) fail('active project missing');
  string(db.tab, 'tab');
  for (const k of ['_q', '_hq']) if (db[k] !== undefined) string(db[k], k);
  if (db._lab !== undefined) string(db._lab, '_lab');
  if (db._chat !== undefined) {
    list(db._chat, '_chat');
    for (const message of db._chat) {
      object(message, '_chat message');
      string(message.r, '_chat role'); string(message.t, '_chat text');
    }
  }
  if (db._wiki !== undefined && (!Number.isSafeInteger(db._wiki) || db._wiki < 0)) fail('wiki selection');
  entries.forEach(([key, r]) => project(r, key));
  return db;
}
