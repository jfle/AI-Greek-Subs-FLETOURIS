'use strict';
// Unit tests for subtitle matching and synchronisation (src/sync.js) and the extra subtitle formats.
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/sync');
const { parseSubtitles, detectFormat } = require('../src/subtitles');

const WORDS = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango uniform victor whiskey xray yankee zulu'.split(' ');
const line = (i) => `We talk about ${WORDS[i % 26]} and ${WORDS[(i * 7) % 26]} number ${i}`;
const make = (n, f = (t) => t, text = line) => Array.from({ length: n }, (_, i) => {
  const t = 5000 + i * 3100 + (i % 5) * 400;
  return { start: Math.round(f(t)), end: Math.round(f(t + 2000)), text: text(i) };
});
const maxError = (a, src, ref) => Math.max(...src.map((c) => Math.abs(a.map(c.start) - ref.find((r) => r.text === c.text).start)));

test('release names: group, source, edition, CD/forced/HI flags, episode', () => {
  const r = S.parseRelease('Doc.2025.S03E06.1080p.AMZN.WEB-DL.DDP5.1.H.264-CAKES.mkv');
  assert.equal(r.group, 'cakes');
  assert.equal(r.source, 'web');
  assert.deepEqual(r.services, ['amzn']);
  assert.equal(r.resolution, '1080');
  assert.deepEqual([r.season, r.episode], [3, 6]);
  assert.equal(S.parseRelease('Movie.2001.EXTENDED.1080p.BluRay.x264-SPARKS').edition, 'extended');
  assert.equal(S.parseRelease('Movie.2001.DVDRip.XviD.CD1-aXXo.srt').cd, true);
  assert.equal(S.parseRelease('Harry.Potter.and.the.Deathly.Hallows.Part.1.2010.1080p.BluRay').cd, false);
  assert.equal(S.parseRelease('Movie.2020.1080p.WEB.H264-GRP.forced.srt').forced, true);
  assert.equal(S.parseRelease('Show.S01E01.720p.HDTV.x264-GRP.HI.srt').hi, true);
});

test('fingerprint: hash and release matches score, wrong types are rejected', () => {
  const ctx = S.matchContext('series', 'tt1:3:6', 'videoHash=abc&videoSize=1&filename=Doc.2025.S03E06.1080p.WEB.H264-CAKES.mkv');
  const fp = (meta) => S.fingerprint({ m: 'i', season: 3, episode: 6, ...meta }, ctx);
  assert.equal(fp({ m: 'h' }).hash, true);
  assert.ok(fp({ m: 'h' }).score >= 100);
  const same = fp({ movieReleaseName: 'Doc.2025.S03E06.1080p.WEB.H264-CAKES', releaseGroup: 'CAKES' });
  assert.ok(same.score >= 55, JSON.stringify(same));
  assert.ok(same.reasons.includes('same group (cakes)'));
  assert.ok(fp({ movieReleaseName: 'Doc.2025.S03E06.720p.HDTV.x264-KILLERS' }).score < 0, 'different source scores lower');
  assert.match(fp({ subtitleFileName: 'Doc.S03E06.CD1.srt' }).reject, /CDs/);
  assert.match(fp({ subtitleFileName: 'Doc.S03E06.forced.srt' }).reject, /forced/);
  assert.match(fp({ episode: 7 }).reject, /wrong episode/);
  assert.match(fp({ season: 2 }).reject, /wrong season/);
  const movie = S.matchContext('movie', 'tt9', 'filename=Film.2001.EXTENDED.1080p.BluRay.x264-SPARKS.mkv');
  assert.match(S.fingerprint({ movieReleaseName: 'Show.S01E02.HDTV', episode: 2 }, movie).reject, /episode subtitle for a movie/);
  const ed = S.fingerprint({ movieReleaseName: 'Film.2001.1080p.BluRay.x264-SPARKS', releaseGroup: 'SPARKS' }, movie);
  assert.ok(ed.reasons.some((r) => /different edition/.test(r)));
});

test('profile recognises English text', () => {
  assert.ok(S.profile(make(50, undefined, (i) => `I think you know what we have to do, ${i}`)).english > 0.3);
  assert.ok(S.profile(make(50, undefined, (i) => `Je ne sais pas quoi dire ${i}`)).english < 0.08);
});

test('length check: frame-rate ratios, partial files, runtime', () => {
  const v = S.lengthVerdict({ count: 800, end: 2400000 }, { refEnd: (2400000 * 25) / 23.976 });
  assert.equal(v.ok, false);
  assert.match(v.reason, /frame-rate mismatch \(25 → 23\.976 fps\)/);
  assert.ok(Math.abs(v.fpsScale - 25 / 23.976) < 1e-6);
  assert.equal(S.lengthVerdict({ count: 400, end: 1200000 }, { refEnd: 2400000 }).partial, true);
  assert.equal(S.lengthVerdict({ count: 800, end: 2390000 }, { refEnd: 2400000 }).ok, true);
  assert.equal(S.lengthVerdict({ count: 800, end: 2400000 }, { runtimeMs: 43 * 60000, series: true }).ok, true);
  assert.equal(S.lengthVerdict({ count: 800, end: 9000000 }, { runtimeMs: 120 * 60000 }).ok, false);
  assert.equal(S.lengthVerdict({ count: 800, end: 2400000 }, {}).ok, null);
});

test('alignment: constant offset', () => {
  const ref = make(600);
  const src = make(600, (t) => t + 2500);
  const a = S.align(src, ref);
  assert.equal(a.ok, true);
  assert.equal(a.method, 'text');
  assert.ok(maxError(a, src, ref) <= 2);
  assert.equal(S.describeFix(a), '-2.5 s');
});

test('alignment: frame-rate conversion (25 fps subtitle on a 23.976 fps video), with offset', () => {
  const ref = make(800);
  const src = make(800, (t) => (t * 23.976) / 25 - 1200);
  const a = S.align(src, ref);
  assert.equal(a.ok, true);
  assert.ok(Math.abs(a.scale - 25 / 23.976) < 1e-4, `scale ${a.scale}`);
  assert.ok(maxError(a, src, ref) <= 5);
  assert.match(S.describeFix(a), /^25 → 23\.976 fps, \+1\.3 s$/);
  assert.match(S.describeFix(a, 'el'), /^25 → 23,976 fps, \+1,3 δ$/);
});

test('alignment: different cut (scenes missing) with frame-rate change — elastic', () => {
  const ref = make(800);
  const cut = (t) => ((t >= 1200000 && t < 1245000) || (t >= 1900000 && t < 1930000) ? null : t - (t >= 1245000 ? 45000 : 0) - (t >= 1930000 ? 30000 : 0));
  const src = ref.map((c) => { const s = cut(c.start); return s === null ? null : { ...c, start: Math.round((s * 23.976) / 25), end: Math.round(((s + 2000) * 23.976) / 25) }; }).filter(Boolean);
  const a = S.align(src, ref);
  assert.equal(a.ok, true);
  assert.equal(a.method, 'text-elastic');
  assert.equal(a.piecewise, true);
  assert.ok(maxError(a, src, ref) <= 5, `max error ${maxError(a, src, ref)}`);
});

test('alignment: reworded subtitle falls back to timing patterns', () => {
  const ref = make(500);
  const src = make(500, (t) => t + 3300, (i) => `Completely different words ${i}`);
  const a = S.align(src, ref);
  assert.equal(a.ok, true);
  assert.equal(a.method, 'timing');
  assert.ok(Math.abs(a.offset + 3300) <= 100);
});

test('alignment: unrelated subtitles are not "aligned"', () => {
  const ref = make(300);
  const rnd = (() => { let x = 7; return () => (x = (x * 48271) % 2147483647) / 2147483647; })();
  const src = Array.from({ length: 300 }, (_, i) => { const t = Math.round(rnd() * 3.6e6); return { start: t, end: t + 1500, text: `Other ${i}` }; }).sort((p, q) => p.start - q.start);
  assert.equal(S.align(src, ref).ok, false);
});

test('identical timing is a no-op; retiming keeps order and minimum duration', () => {
  const ref = make(100);
  assert.equal(S.isNoop(S.align(make(100), ref)), true);
  const out = S.retimeCues([{ start: 1000, end: 1100, text: 'a' }, { start: 500, end: 900, text: 'b' }], (t) => t * 2);
  assert.deepEqual(out.map((c) => [c.start, c.end, c.text]), [[1000, 1800, 'b'], [2000, 2300, 'a']]);
});

test('formats: ASS/SSA and MicroDVD (frame-based, uses the frame rate)', () => {
  const ass = '[Script Info]\nTitle: x\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:01.50,0:00:03.00,Default,,0,0,0,,{\\i1}Hello{\\i0}, there\\Nfriend\n';
  assert.equal(detectFormat(ass), 'ass');
  assert.deepEqual(parseSubtitles(ass), [{ start: 1500, end: 3000, text: '<i>Hello</i>, there\nfriend' }]);
  assert.equal(detectFormat('{25}{50}Hi'), 'microdvd');
  assert.deepEqual(parseSubtitles('{1}{1}25\n{25}{75}Hello|world'), [{ start: 1000, end: 3000, text: 'Hello\nworld' }]);
  assert.deepEqual(parseSubtitles('{24}{48}Hi', { fps: 24 }), [{ start: 1000, end: 2000, text: 'Hi' }]);
});
