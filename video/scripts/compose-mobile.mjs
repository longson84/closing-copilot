// Edits the mobile screencast frames into closing-copilot-mobile.mp4 (1080x1920) and
// closing-copilot-mobile-landscape.mp4 (1920x1080), plus closing-copilot-mobile.srt.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const V = join(here, '..');
const B = join(V, 'build');
const RAW = join(B, 'mraw');
const MB = join(B, 'mobile');
mkdirSync(join(MB, 'scenes'), { recursive: true });
const FPS = 30;
const XF = 0.35;
const SW = 1170, SH = 2532; // native screen capture
const AUD = JSON.parse(readFileSync(join(B, 'maudio', 'durations.json'), 'utf8')).durations;
const TEXT = Object.fromEntries(JSON.parse(readFileSync(join(here, 'narration-mobile.json'), 'utf8')).map((x) => [x.id, x.text]));
const LAYOUT = JSON.parse(readFileSync(join(MB, 'layout.json'), 'utf8'));
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

const PLANS = {
  m1: { speed: 0.85, cuts: [], zones: [], narr: [['m1', 'ready', 0.3]] },
  m2: { speed: 1.2, cuts: [['ai_start', 1.2, 'ai_text', -0.4]], zones: [['ai_end', 'end', 1.5]], narr: [['m2', 'ready', 0.2]] },
  m3: { speed: 1.25, cuts: [['ai_start', 1.2, 'ai_text', -0.4]], zones: [['ready', 'ai_start', 1.4]], narr: [['m3', 'ready', 0.3]] },
  m4: { speed: 1.3, cuts: [['ai_start', 1.2, 'ai_end', -0.2]], zones: [['ai_end', 'pre_save', 1.8]], narr: [['m4', 'ready', 0.3]] },
  m5: { speed: 1.3, cuts: [['ai_start', 1.2, 'ai_end', -0.2]], zones: [['form_start', 'form_end', 2.2]], narr: [['m5', 'photo', -0.6]] },
};

// frames (variable timing) -> constant-rate native clip; returns marks relative to the clip start
function framesToClip(name) {
  const { marks, frames } = JSON.parse(readFileSync(join(RAW, `${name}.json`), 'utf8'));
  const t0 = frames[0].t;
  let list = 'ffconcat version 1.0\n';
  frames.forEach((f, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t : marks.end;
    list += `file '${join(RAW, name, f.file)}'\nduration ${Math.max(0.001, next - f.t).toFixed(4)}\n`;
  });
  list += `file '${join(RAW, name, frames[frames.length - 1].file)}'\n`;
  const lf = join(MB, 'scenes', `${name}.ffconcat`);
  writeFileSync(lf, list);
  const clip = join(MB, 'scenes', `${name}-native.mp4`);
  ff(['-f', 'concat', '-safe', '0', '-i', lf, '-vf', `fps=${FPS},scale=${SW}:${SH},format=yuv420p`, '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', clip]);
  const m = Object.fromEntries(Object.entries(marks).map(([k, t]) => [k, t - t0]));
  return { clip, m };
}

function buildPieces(m, plan) {
  const cuts = plan.cuts.map(([a, ao, b, bo]) => [m[a] + ao, m[b] + bo]).filter(([a, b]) => b > a);
  let keep = [[m.ready, m.end - 0.1]];
  for (const [ca, cb] of cuts) keep = keep.flatMap(([a, b]) => (cb <= a || ca >= b ? [[a, b]] : [[a, ca], [cb, b]].filter(([x, y]) => y - x > 0.05)));
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
  const map = (t) => {
    let acc = 0;
    for (const p of pieces) {
      if (t < p.a) return acc;
      if (t <= p.b) return acc + (t - p.a) / p.s;
      acc += (p.b - p.a) / p.s;
    }
    return acc;
  };
  return { pieces, map, total: pieces.reduce((x, p) => x + (p.b - p.a) / p.s, 0) };
}

const report = {};
const scenes = [];
for (const [name, plan] of Object.entries(PLANS)) {
  const { clip, m } = framesToClip(name);
  const { pieces, map, total } = buildPieces(m, plan);
  let prevEnd = 0;
  const narr = plan.narr.map(([c, mark, off]) => {
    const start = Math.max(map(m[mark]) + off, prevEnd + 0.25, 0.15);
    prevEnd = start + AUD[c];
    return { clip: c, start };
  });
  const D = Math.max(total, prevEnd + 0.6);
  const n = pieces.length;
  let f = `[0:v]split=${n}${pieces.map((_, i) => `[p${i}]`).join('')};`;
  pieces.forEach((p, i) => (f += `[p${i}]trim=start=${p.a.toFixed(3)}:end=${p.b.toFixed(3)},setpts=(PTS-STARTPTS)/${p.s}[q${i}];`));
  f += `${pieces.map((_, i) => `[q${i}]`).join('')}concat=n=${n}:v=1:a=0,fps=${FPS},tpad=stop_mode=clone:stop_duration=${(D - total + 1).toFixed(3)},trim=duration=${D.toFixed(3)},settb=AVTB,format=yuv420p[out]`;
  const file = join(MB, 'scenes', `${name}.mp4`);
  ff(['-i', clip, '-filter_complex', f, '-map', '[out]', '-t', D.toFixed(3), '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', file]);
  scenes.push({ name, file, dur: D, narr });
  report[name] = { footage: +total.toFixed(2), duration: +D.toFixed(2) };
  console.log(name, 'footage', total.toFixed(2), 'scene', D.toFixed(2));
}

// screen track: scenes joined with crossfades
let acc = scenes[0].dur;
let fc = scenes.map((_, i) => `[${i}:v]settb=AVTB,fps=${FPS}[n${i}];`).join('');
let prev = 'n0';
const starts = [0];
for (let i = 1; i < scenes.length; i++) {
  const off = acc - XF;
  starts.push(off);
  const o = i === scenes.length - 1 ? 'vout' : `x${i}`;
  fc += `[${prev}][n${i}]xfade=transition=fade:duration=${XF}:offset=${off.toFixed(3)}[${o}];`;
  prev = o;
  acc = off + scenes[i].dur;
}
const SCREEN_D = acc;
const screen = join(MB, 'screen.mp4');
ff([...scenes.flatMap((s) => ['-i', s.file]), '-filter_complex', fc.replace(/;$/, ''), '-map', '[vout]', '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', screen]);

const END_D = 5.6;
const endStart = SCREEN_D - XF;
const TOTAL = endStart + END_D;
const clips = scenes.flatMap((s, i) => s.narr.map((n) => ({ ...n, abs: starts[i] + n.start })));
clips.push({ clip: 'm6', abs: endStart + 0.3 });

function render(kind, out) {
  const L = LAYOUT[kind];
  const args = ['-i', screen, '-loop', '1', '-t', TOTAL.toFixed(2), '-i', join(MB, `bezel-${kind}.png`), '-loop', '1', '-t', String(END_D), '-i', join(MB, `end-${kind}.png`)];
  clips.forEach((c) => args.push('-i', join(B, 'maudio', `${c.clip}.wav`)));
  let g = `color=c=0xEEF1EF:s=${L.W}x${L.H}:r=${FPS}:d=${SCREEN_D.toFixed(3)}[bg];`;
  g += `[0:v]scale=${L.sw}:${L.sh}:flags=lanczos,setsar=1[sc];[bg][sc]overlay=${L.sx}:${L.sy}[a1];[a1][1:v]overlay=0:0:shortest=1,fps=${FPS},settb=AVTB,format=yuv420p[ph];`;
  g += `[2:v]scale=${L.W}:${L.H},fps=${FPS},settb=AVTB,format=yuv420p,fade=t=out:st=${(END_D - 0.8).toFixed(2)}:d=0.8[ec];`;
  g += `[ph][ec]xfade=transition=fade:duration=${XF}:offset=${endStart.toFixed(3)}[v];`;
  clips.forEach((c, k) => (g += `[${3 + k}:a]aresample=48000,adelay=${Math.round(c.abs * 1000)}:all=1[a${k}];`));
  g += `${clips.map((_, k) => `[a${k}]`).join('')}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad,atrim=duration=${TOTAL.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aout]`;
  ff([...args, '-filter_complex', g, '-map', '[v]', '-map', '[aout]', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-t', TOTAL.toFixed(3), out]);
}
render('portrait', join(V, 'closing-copilot-mobile.mp4'));
render('landscape', join(V, 'closing-copilot-mobile-landscape.mp4'));

const fmt = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))},${p(ms % 1000, 3)}`;
};
let srt = '';
let idx = 1;
for (const c of clips) {
  let parts = TEXT[c.clip].match(/[^.!?]+[.!?]+|[^.!?]+$/g).map((x) => x.trim());
  parts = parts.flatMap((p) => (p.length > 70 ? p.split(/(?<=—|;|:|,)\s+(?=\S{4})/).reduce((a, x) => { if (a.length && (a[a.length - 1] + ' ' + x).length <= 60) a[a.length - 1] += ' ' + x; else a.push(x); return a; }, []) : [p]));
  const dur = AUD[c.clip] - 0.25;
  const chars = parts.reduce((a, p) => a + p.length, 0);
  let cur = c.abs + 0.1;
  for (const p of parts) {
    const d = (dur * p.length) / chars;
    srt += `${idx++}\n${fmt(cur)} --> ${fmt(cur + d - 0.04)}\n${p}\n\n`;
    cur += d;
  }
}
writeFileSync(join(V, 'closing-copilot-mobile.srt'), srt);
report.timeline = scenes.map((s, i) => ({ name: s.name, start: +starts[i].toFixed(2), dur: +s.dur.toFixed(2) })).concat([{ name: 'end', start: +endStart.toFixed(2), dur: END_D }]);
report.narration = clips.map((c) => ({ clip: c.clip, start: +c.abs.toFixed(2), end: +(c.abs + AUD[c.clip]).toFixed(2) }));
report.total = +TOTAL.toFixed(2);
writeFileSync(join(MB, 'edit-report.json'), JSON.stringify(report, null, 1));
console.log('TOTAL', TOTAL.toFixed(2));
