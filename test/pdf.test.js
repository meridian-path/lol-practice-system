'use strict';

// Tests for src/pdf.js -- the optional headless-browser print-to-pdf pass.
// Deliberately does NOT assert that a browser is present or that a
// PDF actually gets produced -- whether this machine has Edge/Chrome installed is
// an environment fact, not something a test should require. What IS tested is the
// contract that matters for "never fails the build": the functions this script is
// built from never throw, and the pass degrades cleanly when dist/ or a browser is
// missing.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const pdf = require('../src/pdf.js');

test('listHtmlFiles() returns only .html files, sorted', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-test-'));
  try {
    fs.writeFileSync(path.join(dir, 'b.html'), '<html></html>');
    fs.writeFileSync(path.join(dir, 'a.html'), '<html></html>');
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'not html');
    fs.writeFileSync(path.join(dir, 'sheet.xlsx'), 'not html either');
    assert.deepEqual(pdf.listHtmlFiles(dir), ['a.html', 'b.html']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('toFileUrl() converts a Windows-style absolute path to a well-formed file:// URL', () => {
  const url = pdf.toFileUrl('C:\\Users\\someone\\dist\\00-readme.html');
  assert.ok(url.startsWith('file:///C:/'), `expected a file:///C:/... URL, got ${url}`);
  assert.ok(!url.includes('\\'), 'file:// URL should not contain backslashes');
});

test('toFileUrl() handles an already-POSIX absolute path without doubling the leading slash', () => {
  const url = pdf.toFileUrl('/home/someone/dist/00-readme.html');
  assert.equal(url, 'file:///home/someone/dist/00-readme.html');
});

test('findBrowser() never throws, and returns either null or a non-empty string', () => {
  assert.doesNotThrow(() => {
    const found = pdf.findBrowser();
    assert.ok(found === null || (typeof found === 'string' && found.length > 0));
  });
});

// run() is async (it drives the browser over the DevTools Protocol), but the
// "no dist/print yet" skip path returns before any of that async work starts
// -- still worth asserting doesNotReject rather than doesNotThrow now that the
// function's return value is a Promise, not the result object itself.
test('run() never throws and skips cleanly when dist/ does not exist yet', async () => {
  const originalExists = fs.existsSync;
  fs.existsSync = (p) => (p === pdf.DIST ? false : originalExists(p));
  try {
    let result;
    await assert.doesNotReject(async () => { result = await pdf.run(); });
    assert.equal(result.attempted, false);
    assert.equal(result.skippedReason, 'no_dist');
    assert.deepEqual(result.produced, []);
  } finally {
    fs.existsSync = originalExists;
  }
});

// findBrowser()'s two lookup strategies (a cheap fs.existsSync check for
// absolute-path candidates, a spawned "where"/"which" for bare-name
// candidates via the unexported resolveOnPath()) were previously untested --
// on a real Windows dev machine, the very first absolute Microsoft Edge
// candidate already exists, so the normal test run never even reaches the
// path-based branch. Forcing every absolute candidate to "not exist" and
// every spawned lookup to fail exercises the full fallthrough-to-null case;
// forcing one spawned lookup to succeed exercises the path-based find case
// (including resolveOnPath()'s own "take the first non-empty trimmed
// stdout line" parsing, since a real "where" can print more than one match).
const child_process = require('child_process');

// Awaits fn() before restoring fs.existsSync, whether fn is sync or async --
// a plain try/finally without the await would restore the mock before an
// async fn's own awaits (e.g. run()) finish.
async function withNoAbsoluteBrowserCandidates(fn) {
  const originalExists = fs.existsSync;
  fs.existsSync = (p) => {
    if (typeof p === 'string' && /msedge\.exe$|chrome\.exe$/i.test(p)) return false;
    return originalExists(p);
  };
  try {
    return await fn();
  } finally {
    fs.existsSync = originalExists;
  }
}

test('findBrowser() returns null when no absolute candidate exists and every spawned "where"/"which" lookup fails', async () => {
  const originalSpawnSync = child_process.spawnSync;
  child_process.spawnSync = () => { throw new Error('command not found (simulated)'); };
  try {
    await withNoAbsoluteBrowserCandidates(() => {
      assert.equal(pdf.findBrowser(), null);
    });
  } finally {
    child_process.spawnSync = originalSpawnSync;
  }
});

test('findBrowser() finds a path-based candidate via a successful spawned lookup, taking the first non-empty trimmed line', async () => {
  const originalSpawnSync = child_process.spawnSync;
  child_process.spawnSync = () => ({
    status: 0,
    stdout: '  C:\\Users\\someone\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe  \r\n\r\nC:\\some\\other\\match.exe\r\n'
  });
  try {
    await withNoAbsoluteBrowserCandidates(() => {
      const found = pdf.findBrowser();
      assert.equal(found, 'C:\\Users\\someone\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe');
    });
  } finally {
    child_process.spawnSync = originalSpawnSync;
  }
});

test('run() never throws and skips cleanly when no browser binary can be found', async () => {
  const originalSpawnSync = child_process.spawnSync;
  child_process.spawnSync = () => { throw new Error('command not found (simulated)'); };
  try {
    await withNoAbsoluteBrowserCandidates(async () => {
      let result;
      await assert.doesNotReject(async () => { result = await pdf.run(); });
      assert.equal(result.attempted, false);
      assert.equal(result.skippedReason, 'no_browser');
      assert.deepEqual(result.produced, []);
    });
  } finally {
    child_process.spawnSync = originalSpawnSync;
  }
});
