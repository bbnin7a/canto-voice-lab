# Contributing

Thanks for improving Canto Voice Lab. The project is intentionally small: a React client, a local Express API, and provider adapters for speech services.

## Local Development

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm test
npm run build
npm audit
```

## Provider Adapters

Adapters live in `src/server/providers`. Keep provider-specific request mapping inside the adapter and expose only the shared provider metadata to the client. Do not log API keys, uploaded audio, generated audio, or provider responses that may include private account data.

## Voice Safety

Changes that affect reference audio, voice cloning, storage, or disclosure should preserve the consent checks and README safety language. If a provider creates temporary voices or other remote resources, report cleanup failures to the user.

## Documentation

Keep README wording practical and specific. Avoid broad claims about Cantonese quality unless the behavior has been tested with real clips.
