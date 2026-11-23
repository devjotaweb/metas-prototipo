/* MetasApp — config.js
 * PORQUÉ: centralizar constantes evita "números mágicos" repartidos y permite
 * cambiar la fuente de datos o los límites en un solo lugar. Debe cargarse
 * antes que el resto de los módulos.
 */

window.MetasApp = window.MetasApp || {};

(function (App) {
  'use strict';

  App.config = {
    /* Fuente oficial: API de Series de Tiempo de datos.gob.ar.
     * La serie es el IPC Nacional, nivel general, expresado como índice.
     * La tasa mensual se deriva de dos observaciones consecutivas.
     */
    URL_API: 'https://apis.datos.gob.ar/series/api/series/',
    ID_SERIE: '145.3_INGNACNAL_DICI_M_15',
    /* La serie arranca en enero de 2026 y sigue creciendo: cada año nuevo se
     * incorpora solo cuando el organismo publica sus observaciones. El techo
     * no es una constante: lo pone el reloj (nunca aceptamos datos futuros). */
    FECHA_DESDE: '2026-01-01',
    ANIO_DESDE: 2026,

    // Caché: 12 horas. Se guarda solo el dato mínimo necesario.
    TTL_CACHE_MS: 12 * 60 * 60 * 1000,

    // Un dato con más de 75 días se considera desactualizado.
    DIAS_VENCIDO: 75,

    // Rangos de la tasa mensual, en porcentaje.
    TASA_MIN_API: -20,
    TASA_MAX_API: 100,
    TASA_MIN_EDICION: 0,
    TASA_MAX_EDICION: 50,

    // Límites del formulario.
    NOMBRE_MAX: 60,
    NOTA_MAX: 200,
    LINK_MAX: 2048,
    MONTO_MAX: 1000000000,
    MESES_MAX: 600,
    FOTO_MAX_BYTES: 5 * 1024 * 1024,
    FOTO_LADO_MAX: 800,
    FOTO_CALIDAD: 0.82,

    // Claves de almacenamiento.
    CLAVE_CACHE: 'metas.cache.inflacion',
    CLAVE_METAS: 'metas.lista',

    // Límites de la lista persistida. La foto se guarda como data URL JPEG;
    // el tope evita que una sola imagen gigante llene la cuota.
    METAS_MAX: 10,
    FOTO_DATAURL_MAX: 2 * 1024 * 1024,

    // Respaldo cuando no hay red ni caché válida. Es una estimación manual,
    // no un dato oficial, y la interfaz debe decirlo.
    TASA_RESPALDO: 2.0,

    // Cuentas de ejemplo. Lista blanca: solo estos ids son válidos.
    CUENTAS: [
      { id: 'caja-pesos', nombre: 'Caja de ahorro en pesos', moneda: 'ARS' },
      { id: 'caja-usd', nombre: 'Caja de ahorro en dólares', moneda: 'USD' },
      { id: 'billetera', nombre: 'Billetera virtual', moneda: 'ARS' },
      { id: 'plazo-fijo', nombre: 'Plazo fijo', moneda: 'ARS' }
    ],

    // Listas blancas del formulario. Denegar por defecto: lo que no está acá
    // se rechaza, aunque el navegador haya aceptado el valor.
    MONEDAS: ['ARS', 'USD'],
    PRIORIDADES: ['alta', 'media', 'baja'],
    ICONOS: ['estrella', 'laptop', 'avion', 'casa', 'moto', 'regalo', 'viaje'],
    APORTE_MODOS: ['ninguno', 'monto_fijo', 'porcentaje'],
    APORTE_PORC_MIN: 1,
    APORTE_PORC_MAX: 100
  };
})(window.MetasApp);
