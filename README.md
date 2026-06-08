# Canto Voice Lab

Cantonese text-to-speech evaluation workspace for comparing bring-your-own-key providers.

The app supports OpenAI and ElevenLabs through Next.js API routes. Enter an API key, write Cantonese text, optionally provide voice settings or permitted reference audio, generate speech, preview it, rate the result, add quality notes, and download the audio.

## Safety and Consent

Only upload recordings that you own or have explicit permission to use. Do not use this project to impersonate people, clone public figures, commit fraud, harass others, bypass consent, or present synthetic speech as a human recording. Generated audio should be disclosed as AI-generated when shared.

The API routes do not persist API keys, uploaded reference audio, or generated speech. ElevenLabs reference-audio mode creates a temporary voice through the provider API, synthesizes speech, and then attempts to delete that temporary voice. The optional "Remember" setting stores a provider key in the browser's local storage.

## Quick Start

```bash
npm install
npm run dev
```

Open the Next.js URL shown in the terminal, usually `http://localhost:3000`.

## Deploying to Vercel

The production API is implemented with Next.js route handlers in `app/api/providers/route.ts` and `app/api/tts/route.ts`. Vercel deploys the frontend and backend as one Next.js app; deployed builds call the same `/api/*` paths on the Vercel domain.

## Testing TTS Quality

Use the same Cantonese prompt across providers and voices, then review each generated clip in the **Quality Review** section. Rate naturalness, Cantonese pronunciation, pacing, emotional fit, and voice similarity. Notes and ratings stay in the current browser session; there is no database.

## Scripts

```bash
npm run dev       # run the Next.js app
npm run build     # build the Next.js app
npm test          # run unit and UI tests
npm start         # run the production Next.js server after build
```

## Provider Notes

- **ElevenLabs**: Use an existing `voiceId` when possible. If reference audio is provided without a voice ID, the server uses ElevenLabs IVC voice creation and then tries to delete the temporary voice.
- **OpenAI**: Preset-voice TTS backend. The `gpt-4o-mini-tts` option sends a Cantonese direction prompt through the speech API `instructions` field. This adapter does not accept uploaded reference audio.
- **ElevenLabs language code**: The app sends `zh` by default because the ElevenLabs API exposes Chinese language steering, not a dedicated Cantonese `yue-HK` option.
- Cantonese quality is provider-specific. The UI warns when a provider may read `zh-HK` text with a Mandarin-like accent.
