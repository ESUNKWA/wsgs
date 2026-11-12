// Origines autorisées à appeler l'API (HTTP + WebSocket).
// Définies par CORS_ORIGINS (liste séparée par des virgules), sinon valeurs par défaut.
const DEFAULT_ORIGINS = [
  'https://neurostock.ekwatech.com',
  'http://r0ink59x39llhf02xfeuor5p.38.242.232.151.sslip.io',
  'http://localhost:4200',
];

export function corsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw?.trim()) return DEFAULT_ORIGINS;
  return raw
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}
