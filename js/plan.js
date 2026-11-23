/* MetasApp — plan.js
 * PORQUÉ: la matemática del ahorro vive aislada y sin efectos secundarios.
 * Así se puede probar con vectores conocidos y el resto de la aplicación solo
 * muestra resultados ya calculados.
 *
 * Modelo B: el objetivo también sube con la inflación.
 *   r = tasa mensual / 100; n = meses; M = monto objetivo.
 *   T = M·(1+r)^n
 *   S = ((1+r)^n - 1) / r, y S = n si r = 0
 *   c0 = T / S; cuota del mes k = c0·(1+r)^k
 *   total acumulado de un aporte x = x·S
 */

window.MetasApp = window.MetasApp || {};

(function (App) {
  'use strict';

  function esEnteroPositivo(valor) {
    return typeof valor === 'number' && isFinite(valor) &&
      Math.floor(valor) === valor && valor > 0;
  }

  /* Parsea una fecha ISO estricta (AAAA-MM-DD) sin usar zonas horarias,
   * para que el cálculo de meses no cambie según el país del usuario. */
  function partesISO(texto) {
    if (typeof texto !== 'string') { return null; }
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    if (!m) { return null; }
    var anio = parseInt(m[1], 10);
    var mes = parseInt(m[2], 10);
    var dia = parseInt(m[3], 10);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) { return null; }
    return { anio: anio, mes: mes, dia: dia };
  }

  /* Meses completos entre dos fechas. Puede dar 0 o negativo; la validación
   * del plazo es la que decide si eso es un error. */
  function mesesEntre(desdeISO, hastaISO) {
    var desde = partesISO(desdeISO);
    var hasta = partesISO(hastaISO);
    if (!desde || !hasta) { return NaN; }
    var meses = (hasta.anio - desde.anio) * 12 + (hasta.mes - desde.mes);
    if (hasta.dia < desde.dia) { meses -= 1; }
    return meses;
  }

  /* n para el plan: mínimo 1 y tope configurable, para que un plazo absurdo
   * no dispare números gigantes. */
  function mesesParaPlan(desdeISO, hastaISO) {
    var meses = mesesEntre(desdeISO, hastaISO);
    var tope = (App.config && App.config.MESES_MAX) || 600;
    if (!isFinite(meses) || meses < 1) { return 1; }
    if (meses > tope) { return tope; }
    return meses;
  }

  function factorSerie(r, n) {
    if (!isFinite(r) || !esEnteroPositivo(n)) { return NaN; }
    if (r === 0) { return n; }
    /* n = 1 debe dar exactamente 1: la fórmula general arrastra error de
     * punto flotante (0,02 - 1 no es exacto en binario). */
    if (n === 1) { return 1; }
    return (Math.pow(1 + r, n) - 1) / r;
  }

  function objetivoProyectado(monto, r, n) {
    if (!isFinite(monto) || !isFinite(r) || !esEnteroPositivo(n)) { return NaN; }
    return monto * Math.pow(1 + r, n);
  }

  function cuotaInicial(monto, r, n) {
    var total = objetivoProyectado(monto, r, n);
    var serie = factorSerie(r, n);
    if (!isFinite(total) || !isFinite(serie) || serie <= 0) { return NaN; }
    return total / serie;
  }

  function cuotaEn(cuotaBase, r, k) {
    if (!isFinite(cuotaBase) || !isFinite(r) ||
        typeof k !== 'number' || k < 0 || Math.floor(k) !== k) {
      return NaN;
    }
    return cuotaBase * Math.pow(1 + r, k);
  }

  function totalAcumulado(aporte, r, n) {
    var serie = factorSerie(r, n);
    if (!isFinite(aporte) || !isFinite(serie)) { return NaN; }
    return aporte * serie;
  }

  /* El redondeo se aplica solo al mostrar o al fijar una cuota; nunca dentro
   * de la serie, para no acumular error. */
  function redondearPeso(valor) {
    if (!isFinite(valor)) { return NaN; }
    return Math.round(valor);
  }

  App.plan = {
    mesesEntre: mesesEntre,
    mesesParaPlan: mesesParaPlan,
    factorSerie: factorSerie,
    objetivoProyectado: objetivoProyectado,
    cuotaInicial: cuotaInicial,
    cuotaEn: cuotaEn,
    totalAcumulado: totalAcumulado,
    redondearPeso: redondearPeso
  };
})(window.MetasApp);
