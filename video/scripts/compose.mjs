// Edits the raw scene recordings into the final video.
// Each scene: keep [ready,end], cut AI waits, apply speed zones, pad to narration, scale onto 1920x1080,
// overlay captions. Then title card + scenes + architecture/phone/end with crossfades, narration placed at anchors.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const V = join(here, '..');
const B = join(V, 'build');
const RAW = join(B, 'raw');
const SC = join(B, 'scenes');
mkdirSync(SC, { recursive: true });
const BG = '0xEEF1EF';
const FPS = 30;
const XF = 0.4; // crossfade seconds
const AUD = JSON.parse(readFileSync(join(B, 'audio', 'durations.json'), 'utf8')).durations;
const TEXT = Object.fromEntries(JSON.parse(readFileSync(join(here, 'narration.json'), 'utf8')).map((x) => [x.id, x.text]));
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
const marksOf = (s) => JSON.parse(readFileSync(join(RAW, `${s}.json`), 'utf8'));

// Scene plans. cut: [fromMark, offset, toMark, offset]; zones: [fromMark, toMark, speed]
// narr: [clip, anchorMark, offsetSeconds(in edited time)]; caps: [caption, anchorMark, offset, duration]
const PLANS = {
  s1: { speed: 1.0, cuts: [], zones: [], narr: [['s1', 'ready', 0.3]], caps: [] },
  s2: {
    speed: 1.15,
    cuts: [['ai_start', 1.4, 'ai_end', -0.2]],
    zones: [['form_start', 'form_end', 1.9]],
    narr: [['s2a', 'ready', 0.3], ['s2b', 'ai_start', 0.0]],
    caps: [['docai', 'ai_start', 0.2, 3.4]],
  },
  s3: {
    speed: 1.1,
    cuts: [['ai_start', 1.4, 'ai_end', -0.2], ['ai2_start', 1.2, 'ai2_end', -0.2]],
    zones: [['hold_end', 'ai2_start', 1.4]],
    narr: [['s3a', 'ready', 0.3], ['s3b', 'ai_end', 0.2]],
    caps: [['mismatch', 'ai_end', 0.6, 3.6]],
  },
  s4: {
    speed: 1.15,
    cuts: [['ai_start', 1.4, 'ai_end', -0.2], ['ai2_start', 1.4, 'ai2_end', -0.2]],
    zones: [['ai_end', 'pre_save', 1.35]],
    narr: [['s4a', 'ready', 0.3], ['s4b', 'pre_save', -0.4], ['s4c', 'ai2_start', -1.0]],
    caps: [['confirm', 'pre_save', -0.2, 3.2]],
  },
  s5: {
    speed: 1.1,
    cuts: [['ai_start', 1.4, 'ai_text', -0.6]],
    zones: [],
    narr: [['s5a', 'ready', 0.3], ['s5b', 'reminders', 0.0]],
    caps: [['pdpa', 'family', 2.0, 3.6]],
  },
  s6: {
    speed: 1.15,
    cuts: [['ai_tool', 2.0, 'ai_text', -1.2]],
    zones: [['ready', 'ai_start', 1.3]],
    narr: [['s6', 'ready', 0.3]],
    caps: [['adk', 'ai_tool', 0.3, 3.4]],
  },
};

function buildPieces(m, plan) {
  // absolute (raw) cut intervals
  const cuts = plan.cuts.map(([a, ao, b, bo]) => [m[a] + ao, m[b] + bo]).filter(([a, b]) => b > a);
  let keep = [[m.ready, m.end - 0.15]];
  for (const [ca, cb] of cuts) keep = keep.flatMap(([a, b]) => (cb <= a || ca >= b ? [[a, b]] : [[a, ca], [cb, b]].filter(([x, y]) => y - x > 0.05)));
  // split by zone boundaries
  const zones = plan.zones.map(([a, b, s]) => [m[a], m[b], s]);
  const bounds = zones.flatMap(([a, b]) => [a, b]);
  let pieces = keep.flatMap(([a, b]) => {
    const pts = [a, ...bounds.filter((x) => x > a && x < b).sort((x, y) => x - y), b];
    return pts.slice(1).map((y, i) => [pts[i], y]);
  });
  pieces = pieces.map(([a, b]) => {
    const z = zones.find(([za, zb]) => a >= za - 1e-6 && b <= zb + 1e-6);
    return { a, b, s: z ? z[2] : plan.speed };
  });
  // map raw time -> edited time
  const map = (t) => {
    let acc = 0;
    for (const p of pieces) {
      if (t < p.a) return acc;
      if (t <= p.b) return acc + (t - p.a) / p.s;
      acc += (p.b - p.a) / p.s;
    }
    return acc;
  };
  const total = pieces.reduce((x, p) => x + (p.b - p.a) / p.s, 0);
  return { pieces, map, total };
}

function placeNarr(narr, m, map) {
  const out = [];
  let prevEnd = 0;
  for (const [clip, mark, off] of narr) {
    const start = Math.max(map(m[mark]) + off, prevEnd + 0.25, 0.2);
    out.push({ clip, start, end: start + AUD[clip] });
    prevEnd = start + AUD[clip];
  }
  return out;
}

const report = {};
const timeline = []; // {file, dur, narr:[{clip,start}]}

// ---- Title card
const TITLE_D = 3.2;
ff(['-loop', '1', '-t', String(TITLE_D), '-i', join(B, 'card-title.png'), '-vf', `scale=1920:1080,fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', join(SC, 'title.mp4')]);
timeline.push({ name: 'title', file: join(SC, 'title.mp4'), dur: TITLE_D, narr: [] });

// ---- Desktop scenes
for (const [name, plan] of Object.entries(PLANS)) {
  const m = marksOf(name);
  const { pieces, map, total } = buildPieces(m, plan);
  const narr = placeNarr(plan.narr, m, map);
  const D = Math.max(total, narr[narr.length - 1].end + 0.9);
  const n = pieces.length;
  let f = `[0:v]split=${n}${pieces.map((_, i) => `[p${i}]`).join('')};`;
  pieces.forEach((p, i) => (f += `[p${i}]trim=start=${p.a.toFixed(3)}:end=${p.b.toFixed(3)},setpts=(PTS-STARTPTS)/${p.s}[q${i}];`));
  f += `${pieces.map((_, i) => `[q${i}]`).join('')}concat=n=${n}:v=1:a=0,fps=${FPS},tpad=stop_mode=clone:stop_duration=${(D - total + 1).toFixed(3)},trim=duration=${D.toFixed(3)},`;
  f += `scale=1728:1080:flags=lanczos,pad=1920:1080:96:0:color=${BG},setsar=1[base]`;
  const inputs = ['-i', join(RAW, `${name}.webm`)];
  let last = 'base';
  plan.caps.forEach(([cap, mark, off, dur], i) => {
    const t = Math.max(0.2, map(m[mark]) + off);
    inputs.push('-loop', '1', '-t', String(D), '-i', join(B, 'captions', `${cap}.png`));
    f += `;[${i + 1}:v]format=rgba,fade=t=in:st=${t.toFixed(2)}:d=0.35:alpha=1,fade=t=out:st=${(t + dur).toFixed(2)}:d=0.35:alpha=1[c${i}]`;
    f += `;[${last}][c${i}]overlay=x=(W-w)/2+40:y=H-h-54:shortest=1[o${i}]`;
    last = `o${i}`;
  });
  f += `;[${last}]format=yuv420p[out]`;
  const file = join(SC, `${name}.mp4`);
  ff([...inputs, '-filter_complex', f, '-map', '[out]', '-t', D.toFixed(3), '-r', String(FPS), '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', file]);
  timeline.push({ name, file, dur: D, narr });
  report[name] = { footage: +total.toFixed(2), duration: +D.toFixed(2), pieces: pieces.map((p) => [+p.a.toFixed(2), +p.b.toFixed(2), p.s]) };
  console.log(name, 'footage', total.toFixed(2), 'scene', D.toFixed(2));
}

// ---- S7: architecture card -> phone shot -> end card
{
  const m = marksOf('s7p');
  const ARCH = 10.2;
  const phoneLen = m.end - 0.15 - m.ready;
  const PH = Math.max(phoneLen, 6.2);
  const END = 3.6;
  // phone: 390x844 -> 434x940 with a dark bezel, centred on the app background
  ff(['-i', join(RAW, 's7p.webm'), '-filter_complex',
    `[0:v]trim=start=${m.ready}:end=${(m.end - 0.15).toFixed(3)},setpts=PTS-STARTPTS,fps=${FPS},tpad=stop_mode=clone:stop_duration=${(PH - phoneLen + 1).toFixed(2)},trim=duration=${PH},` +
    `scale=434:940:flags=lanczos,pad=458:964:12:12:color=0x16232A,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=${BG},setsar=1,format=yuv420p[v]`,
    '-map', '[v]', '-c:v', 'libx264', '-crf', '16', join(SC, 'phone.mp4')]);
  ff(['-loop', '1', '-t', String(ARCH), '-i', join(B, 'card-arch.png'), '-vf', `scale=1920:1080,fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-crf', '16', join(SC, 'arch.mp4')]);
  ff(['-loop', '1', '-t', String(END), '-i', join(B, 'card-title.png'), '-vf', `scale=1920:1080,fps=${FPS},fade=t=out:st=${END - 0.8}:d=0.8,format=yuv420p`, '-c:v', 'libx264', '-crf', '16', join(SC, 'end.mp4')]);
  const narr = [{ clip: 's7', start: 0.3, end: 0.3 + AUD.s7 }];
  timeline.push({ name: 'arch', file: join(SC, 'arch.mp4'), dur: ARCH, narr });
  timeline.push({ name: 'phone', file: join(SC, 'phone.mp4'), dur: PH, narr: [] });
  timeline.push({ name: 'end', file: join(SC, 'end.mp4'), dur: END, narr: [] });
  report.s7 = { arch: ARCH, phone: +PH.toFixed(2), end: END };
}

// ---- Assemble with crossfades
let t = 0;
const starts = timeline.map((s, i) => {
  const st = t;
  t += s.dur - (i < timeline.length - 1 ? XF : 0);
  return st;
});
const TOTAL = t;
const vin = timeline.flatMap((s) => ['-i', s.file]);
let vf = timeline.map((_, i) => `[${i}:v]fps=${FPS},settb=AVTB,format=yuv420p[n${i}];`).join('');
let prev = 'n0';
let acc = timeline[0].dur;
for (let i = 1; i < timeline.length; i++) {
  const off = acc - XF;
  const outL = i === timeline.length - 1 ? 'vout' : `x${i}`;
  vf += `[${prev}][n${i}]xfade=transition=fade:duration=${XF}:offset=${off.toFixed(3)}[${outL}];`;
  prev = outL;
  acc = off + timeline[i].dur;
}
// narration
const clips = timeline.flatMap((s, i) => s.narr.map((n) => ({ ...n, abs: starts[i] + n.start })));
const ain = clips.flatMap((c) => ['-i', join(B, 'audio', `${c.clip}.wav`)]);
const base = timeline.length;
clips.forEach((c, k) => (vf += `[${base + k}:a]aresample=48000,adelay=${Math.round(c.abs * 1000)}:all=1[a${k}];`));
vf += `${clips.map((_, k) => `[a${k}]`).join('')}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad,atrim=duration=${TOTAL.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aout]`;
const OUT = join(V, 'closing-copilot-demo.mp4');
ff([...vin, ...ain, '-filter_complex', vf, '-map', '[vout]', '-map', '[aout]', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-t', TOTAL.toFixed(3), OUT]);

// ---- SRT from narration (sentence chunks timed by character share)
const fmt = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000), mi = Math.floor((ms % 3600000) / 60000), se = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(se).padStart(2, '0')},${String(r).padStart(3, '0')}`;
};
let srt = '';
let idx = 1;
for (const c of clips) {
  const text = TEXT[c.clip];
  // split into sentences, then long sentences at dashes/semicolons/colons
  let parts = text.match(/[^.!?]+[.!?]+["”]?|[^.!?]+$/g).map((x) => x.trim());
  parts = parts.flatMap((p) => (p.length > 90 ? p.split(/(?<=—|;|:)\s+/).map((x) => x.trim()) : [p])).filter(Boolean);
  const lead = 0.1, dur = AUD[c.clip] - 0.25;
  const totalChars = parts.reduce((a, p) => a + p.length, 0);
  let cur = c.abs + lead;
  for (const p of parts) {
    const d = (dur * p.length) / totalChars;
    srt += `${idx++}\n${fmt(cur)} --> ${fmt(cur + d - 0.04)}\n${p}\n\n`;
    cur += d;
  }
}
writeFileSync(join(V, 'closing-copilot-demo.srt'), srt);
report.timeline = timeline.map((s, i) => ({ name: s.name, start: +starts[i].toFixed(2), dur: +s.dur.toFixed(2) }));
report.total = +TOTAL.toFixed(2);
report.narration = clips.map((c) => ({ clip: c.clip, start: +c.abs.toFixed(2), end: +(c.abs + AUD[c.clip]).toFixed(2) }));
writeFileSync(join(B, 'edit-report.json'), JSON.stringify(report, null, 1));
console.log('TOTAL', TOTAL.toFixed(2));
