'use strict';
// SRT / WebVTT parsing and SRT serialisation.

function decodeBuffer(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf.subarray(2));
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    // Older English subtitles are frequently Windows-1252 encoded.
    return new TextDecoder('windows-1252').decode(buf);
  }
}

const TIME_RE =
  /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[,.](\d{1,3})\s*-->\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/;

const toMs = (h, m, s, ms) =>
  (parseInt(h || '0', 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10)) * 1000 + parseInt(ms.padEnd(3, '0'), 10);

function parseSubtitles(text) {
  const cues = [];
  const blocks = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '').split(/\n[ \t]*\n+/);
  for (const block of blocks) {
    const lines = block.split('\n');
    const idx = lines.findIndex((l) => l.includes('-->'));
    if (idx < 0) continue;
    const m = TIME_RE.exec(lines[idx]);
    if (!m) continue;
    const body = lines
      .slice(idx + 1)
      .join('\n')
      .replace(/<(?!\/?[ibu]>)[^>\n]+>/gi, '') // strip WebVTT voice/class tags, keep <i>/<b>/<u>
      .trim();
    if (!body) continue;
    cues.push({ start: toMs(m[1], m[2], m[3], m[4]), end: toMs(m[5], m[6], m[7], m[8]), text: body });
  }
  cues.sort((a, b) => a.start - b.start);
  return cues;
}

function fmt(ms) {
  ms = Math.max(0, Math.round(ms));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
}

function toSrt(cues) {
  return cues.map((c, i) => `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n`).join('\n');
}

module.exports = { decodeBuffer, parseSubtitles, toSrt };
