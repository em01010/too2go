import { esHN, formatLempiras } from '@too2go/shared';

export function App() {
  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ color: 'var(--color-primary)' }}>{esHN.app.nombre} · Panel</h1>
      <p>{esHN.app.eslogan}</p>
      <p style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{formatLempiras(90)}</p>
    </main>
  );
}
