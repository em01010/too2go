/**
 * Textos de la interfaz en español de Honduras (voseo).
 * Único lugar donde viven los textos visibles: la app móvil, el panel web y el admin importan de aquí.
 */
export const esHN = {
  app: {
    nombre: 'Too2Go',
    eslogan: 'Comida rica, a mitad de precio, sin desperdicio.',
  },
  comun: {
    continuar: 'Continuar',
    cancelar: 'Cancelar',
    guardar: 'Guardar',
    cerrar: 'Cerrar',
    reintentar: 'Reintentar',
    cargando: 'Cargando…',
    errorGenerico: 'Algo salió mal. Probá de nuevo.',
    sinConexion: 'Parece que no tenés conexión.',
    si: 'Sí',
    no: 'No',
    hoy: 'Hoy',
    moneda: 'L',
  },
} as const;

export type EsHN = typeof esHN;
