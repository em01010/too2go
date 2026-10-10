import { t } from '@too2go/shared';

import { env } from '@/lib/env';
import { useAuth } from '@/lib/auth';

/** Pantalla del comercio mientras el admin revisa su solicitud. */
export function Pendiente() {
  const { merchant, signOut } = useAuth();
  const support = env.supportWhatsapp.replace(/\D/g, '');
  return (
    <div className="login">
      <div className="brand" style={{ fontSize: 28, padding: 0, marginBottom: 16 }}>
        {t.app.nombre}
      </div>
      <div className="card">
        <h1 className="ok">{t.panel.registro.pendienteTitulo}</h1>
        <p>{t.panel.registro.pendienteTexto(merchant?.name ?? '')}</p>
        <p className="muted">
          {merchant?.address}
          {merchant?.zone ? ` · ${merchant.zone}` : ''}
        </p>
        <div className="row mt">
          {support ? (
            <a
              className="btn secondary"
              href={`https://wa.me/${support}`}
              target="_blank"
              rel="noreferrer"
            >
              {t.panel.registro.pendienteSoporte}
            </a>
          ) : null}
          <button className="btn ghost" onClick={() => void signOut()}>
            {t.comun.salir}
          </button>
        </div>
      </div>
    </div>
  );
}
