import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { CONFIG, isTtsConfigured } from './config';
import { TtsService } from './tts.service';

type AudioFormat = 'pcm' | 'mp3' | 'ogg_opus' | 'wav' | 'unknown';

function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  const dataSize = pcm.length;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

function pcmStats(pcm: Buffer): string {
  const samples = Math.floor(pcm.length / 2);
  if (samples === 0) return 'samples=0';

  let peak = 0;
  let sumSquares = 0;
  for (let i = 0; i < samples; i++) {
    const sample = pcm.readInt16LE(i * 2);
    const abs = Math.abs(sample);
    if (abs > peak) peak = abs;
    sumSquares += sample * sample;
  }

  const rms = Math.sqrt(sumSquares / samples);
  return `samples=${samples}, peak=${peak}, peakRatio=${(peak / 32768).toFixed(3)}, rmsRatio=${(rms / 32768).toFixed(3)}`;
}

async function main(): Promise<void> {
  if (!isTtsConfigured()) {
    throw new Error('TTS is not configured. Check VOLC_TTS_APPID, VOLC_TTS_TOKEN, and VOLC_TTS_VOICE_TYPE.');
  }

  const text = process.argv.slice(2).join(' ') || '你好，我是小雅。这是一段语音合成测试。';
  const tts = new TtsService();
  const chunks: Buffer[] = [];
  const audioState: { format: AudioFormat; sampleRate: number } = {
    format: 'pcm',
    sampleRate: CONFIG.volcTtsSampleRate,
  };
  let error: Error | null = null;

  tts.on('audio', (base64: string, seq: number, audioFormat: AudioFormat = 'pcm', rate = CONFIG.volcTtsSampleRate) => {
    chunks[seq] = Buffer.from(base64, 'base64');
    audioState.format = audioFormat;
    audioState.sampleRate = rate;
  });

  tts.on('error', (err: Error) => {
    error = err;
  });

  await tts.synthesize(text);

  if (error) throw error;

  const orderedChunks = chunks.filter((chunk): chunk is Buffer => Buffer.isBuffer(chunk));
  if (orderedChunks.length === 0) {
    throw new Error('TTS finished but returned no audio chunks.');
  }
  if (orderedChunks.length !== chunks.length) {
    console.warn(`[TTS Smoke] Missing chunks: received ${orderedChunks.length}/${chunks.length}`);
  }

  const audio = Buffer.concat(orderedChunks);
  let output: Buffer = audio;
  let ext = 'bin';

  if (audioState.format === 'pcm') {
    output = pcmToWav(audio, audioState.sampleRate);
    ext = 'wav';
    console.log(`[TTS Smoke] PCM stats: ${pcmStats(audio)}`);
  } else if (audioState.format === 'wav') {
    ext = 'wav';
  } else if (audioState.format === 'mp3') {
    ext = 'mp3';
  } else if (audioState.format === 'ogg_opus') {
    ext = 'ogg';
  }

  const outDir = resolve(__dirname, '../tmp');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `tts-smoke-${Date.now()}.${ext}`);
  writeFileSync(outPath, output);

  console.log(`[TTS Smoke] text="${text}"`);
  console.log(`[TTS Smoke] format=${audioState.format}, sampleRate=${audioState.sampleRate}, chunks=${orderedChunks.length}, bytes=${audio.length}`);
  console.log(`[TTS Smoke] wrote ${outPath}`);

  if (audioState.format === 'unknown') {
    throw new Error('TTS returned an unknown audio payload. Do not play this file directly.');
  }
}

main().catch((err) => {
  console.error(`[TTS Smoke] Failed: ${err.message}`);
  process.exitCode = 1;
});
