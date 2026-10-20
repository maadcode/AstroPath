import * as fs from 'fs';
import * as path from 'path';

function createWavBuffer(samples, sampleRate = 44100) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20);  // audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // write 16-bit PCM samples (-32768 to 32767)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.round(val), offset);
    offset += 2;
  }
  return buffer;
}

const sampleRate = 44100;

// 1. Caminar: Pasos metálicos suaves (loop)
function generateFootsteps() {
  const duration = 0.55;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  function addStep(startTime, pitchMod = 1.0, vol = 0.6) {
    const startSample = Math.floor(startTime * sampleRate);
    const stepDuration = 0.16;
    const stepSamples = Math.floor(stepDuration * sampleRate);

    for (let i = 0; i < stepSamples; i++) {
      const idx = startSample + i;
      if (idx >= totalSamples) break;
      const t = i / sampleRate;

      // Thump grave suave
      const thumpFreq = 95 * pitchMod;
      const thump = Math.sin(2 * Math.PI * thumpFreq * t) * Math.exp(-t * 35);

      // Resonancia metálica suave
      const m1 = Math.sin(2 * Math.PI * 1150 * pitchMod * t) * Math.exp(-t * 28);
      const m2 = Math.sin(2 * Math.PI * 1840 * pitchMod * t) * Math.exp(-t * 36);
      const m3 = Math.sin(2 * Math.PI * 2600 * pitchMod * t) * Math.exp(-t * 45);

      // Fricción / ruido metálico sutil
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 50);

      const val = (thump * 0.45 + (m1 * 0.25 + m2 * 0.18 + m3 * 0.12) + noise * 0.15) * vol;
      samples[idx] += val;
    }
  }

  // Paso 1 y Paso 2
  addStep(0.06, 1.0, 0.5);
  addStep(0.33, 1.08, 0.45);

  // Suave fade in / fade out para que el loop no haga clic
  const fadeLen = Math.floor(sampleRate * 0.015);
  for (let i = 0; i < fadeLen; i++) {
    const f = i / fadeLen;
    samples[i] *= f;
    samples[totalSamples - 1 - i] *= f;
  }

  return samples;
}

// 2. Abrir diálogo con NPC: Beep electrónico corto
function generateDialogOpen() {
  const duration = 0.18;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  // Dos tonos agradables estilo comunicador sci-fi: 900 Hz -> 1400 Hz
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let val = 0;

    if (t < 0.08) {
      // Tono 1
      const env = Math.sin((t / 0.08) * Math.PI);
      val = (Math.sin(2 * Math.PI * 920 * t) + 0.3 * Math.sin(2 * Math.PI * 1840 * t)) * env * 0.45;
    } else {
      // Tono 2 (más alto y resolutivo)
      const t2 = t - 0.08;
      const env = Math.exp(-t2 * 22) * Math.min(1, t2 * 200);
      val = (Math.sin(2 * Math.PI * 1380 * t2) + 0.25 * Math.sin(2 * Math.PI * 2760 * t2)) * env * 0.5;
    }
    samples[i] = val;
  }

  return samples;
}

// 3. Seleccionar opción: Click/confirmación
function generateOptionSelect() {
  const duration = 0.09;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  // Click nítido futurista con pitch ascendente rápido
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const progress = t / duration;
    const freq = 1200 + progress * 600;
    const env = Math.exp(-progress * 5) * (1 - progress);

    const tone = Math.sin(2 * Math.PI * freq * t);
    const click = (i < 80) ? (Math.random() * 2 - 1) * (1 - i / 80) : 0;

    samples[i] = (tone * 0.65 + click * 0.35) * env * 0.55;
  }

  return samples;
}

// 4. Completar estación: Fanfarria corta satisfactoria
function generateStationComplete() {
  const duration = 1.25;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  // Acorde triunfal arpegiado (Do mayor / sci-fi chime)
  // C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.5)
  const notes = [
    { freq: 523.25, time: 0.00, dur: 0.85, vol: 0.35 },
    { freq: 659.25, time: 0.12, dur: 0.80, vol: 0.38 },
    { freq: 783.99, time: 0.24, dur: 0.85, vol: 0.42 },
    { freq: 1046.50, time: 0.38, dur: 0.85, vol: 0.50 },
    // Armónico brillo superior
    { freq: 1567.98, time: 0.40, dur: 0.70, vol: 0.22 }
  ];

  notes.forEach(note => {
    const startIdx = Math.floor(note.time * sampleRate);
    const noteSamples = Math.floor(note.dur * sampleRate);

    for (let i = 0; i < noteSamples; i++) {
      const idx = startIdx + i;
      if (idx >= totalSamples) break;
      const t = i / sampleRate;

      // Envolvente de campana / sintetizador
      const attack = Math.min(1, t * 120);
      const decay = Math.exp(-t * 3.2);
      const env = attack * decay;

      // Seno con armónico de octava suave y modulación sutil
      const shimmer = 1 + 0.02 * Math.sin(2 * Math.PI * 6 * t);
      const wave = Math.sin(2 * Math.PI * note.freq * t) +
                   0.3 * Math.sin(2 * Math.PI * note.freq * 2 * t) +
                   0.1 * Math.sin(2 * Math.PI * note.freq * 3 * t);

      samples[idx] += wave * env * note.vol * shimmer;
    }
  });

  // Normalizar levemente para evitar clipping
  let max = 0;
  for (let i = 0; i < totalSamples; i++) {
    if (Math.abs(samples[i]) > max) max = Math.abs(samples[i]);
  }
  if (max > 0.95) {
    for (let i = 0; i < totalSamples; i++) {
      samples[i] = (samples[i] / max) * 0.95;
    }
  }

  return samples;
}

// 5. Abrir/cerrar minijuego: Whoosh de transición
function generateWhoosh() {
  const duration = 0.42;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  // Ruido filtrado y barrido suave estilo escotilla / portal
  let noiseFilter = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const progress = t / duration;

    // Envolvente acampanada suave
    const env = Math.sin(progress * Math.PI);

    // Frecuencia de barrido que sube y baja (300Hz -> 1800Hz -> 300Hz)
    const sweep = 300 + Math.sin(progress * Math.PI) * 1500;

    // Tono base del whoosh
    const tone = Math.sin(2 * Math.PI * sweep * t);

    // Ruido blanco filtrado simple
    const white = Math.random() * 2 - 1;
    const alpha = Math.min(0.5, (2 * Math.PI * sweep) / sampleRate);
    noiseFilter += alpha * (white - noiseFilter);

    samples[i] = (tone * 0.25 + noiseFilter * 0.75) * env * 0.55;
  }

  return samples;
}

const outDir = path.resolve('public', 'assets', 'audio');
fs.mkdirSync(outDir, { recursive: true });

const files = [
  { name: 'footsteps.wav', data: generateFootsteps() },
  { name: 'dialog_open.wav', data: generateDialogOpen() },
  { name: 'option_select.wav', data: generateOptionSelect() },
  { name: 'station_complete.wav', data: generateStationComplete() },
  { name: 'whoosh.wav', data: generateWhoosh() }
];

files.forEach(f => {
  const filePath = path.join(outDir, f.name);
  const wavBuf = createWavBuffer(f.data, sampleRate);
  fs.writeFileSync(filePath, wavBuf);
  console.log(`Generated: ${filePath} (${wavBuf.length} bytes)`);
});
