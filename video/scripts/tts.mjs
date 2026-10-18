// Usage: node tts.mjs <speakingRate> [narration.json] [outDir]  -> <outDir>/<id>.wav + durations.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[4] ?? join(here, '..', 'build', 'audio');
mkdirSync(out, { recursive: true });
const rate = Number(process.argv[2] || '1.0');
const voice = process.env.VOICE || 'en-US-Chirp3-HD-Charon';
const token = execSync('gcloud auth print-access-token', { env: { ...process.env, CLOUDSDK_ACTIVE_CONFIG_NAME: 'pzy' } }).toString().trim();
const scenes = JSON.parse(readFileSync(process.argv[3] ?? join(here, 'narration.json'), 'utf8'));
const durations = {};
for (const s of scenes) {
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': 'era-closing-copilot', 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text: s.text }, voice: { languageCode: 'en-US', name: voice }, audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 48000, speakingRate: rate } }),
  });
  if (!res.ok) throw new Error(`${s.id}: ${res.status} ${await res.text()}`);
  const { audioContent } = await res.json();
  const f = join(out, `${s.id}.wav`);
  writeFileSync(f, Buffer.from(audioContent, 'base64'));
  durations[s.id] = Number(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString());
  console.log(s.id, durations[s.id].toFixed(2));
}
const total = Object.values(durations).reduce((a, b) => a + b, 0);
console.log('total', total.toFixed(2), 'rate', rate, voice);
writeFileSync(join(out, 'durations.json'), JSON.stringify({ rate, voice, durations, total }, null, 1));
