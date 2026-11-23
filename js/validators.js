/* MetasApp — validators.js
 * PORQUÉ: separar la validación en funciones puras permite probarla sin DOM
 * y reutilizarla al escribir y otra vez antes de guardar (defensa en
 * profundidad: nunca se confía en lo que quedó en pantalla).
 *
 * Regla general: cada validador devuelve el valor normalizado o null si es
 * inválido. La lista blanca manda: lo que no está permitido se rechaza.
 */

window.MetasApp = window.MetasApp || {};

(function (App) {
  'use strict';

  function limite(nombreClave, porDefecto) {
    if (App.config && typeof App.config[nombreClave] === 'number') {
      return App.config[nombreClave];
    }
    return porDefecto;
  }

  function enLista(valor, lista) {
    if (typeof valor !== 'string' || !Array.isArray(lista)) { return false; }
    return lista.indexOf(valor) !== -1;
  }

  /* Acepta "100.000" y "100000"; rechaza centavos, signos, exponentes y
   * cualquier cosa que no sea un entero positivo dentro del tope. */
  function parsearMonto(texto) {
    if (typeof texto !== 'string') { return null; }
    var limpio = texto.trim();
    var conPuntosDeMil = /^\d{1,3}(\.\d{3})*$/;
    var sinSeparadores = /^\d+$/;
    if (!conPuntosDeMil.test(limpio) && !sinSeparadores.test(limpio)) {
      return null;
    }
    var numero = parseInt(limpio.replace(/\./g, ''), 10);
    if (!isFinite(numero) || numero <= 0) { return null; }
    if (numero > limite('MONTO_MAX', 1000000000)) { return null; }
    return numero;
  }

  function validarNombre(texto) {
    if (typeof texto !== 'string') { return null; }
    var limpio = texto.trim();
    if (limpio.length < 1 || limpio.length > limite('NOMBRE_MAX', 60)) {
      return null;
    }
    if (/[\u0000-\u001F\u007F]/.test(limpio)) { return null; }
    return limpio;
  }

  /* La longitud se mide sobre el texto original: el contador muestra
   * exactamente lo que la persona escribió. */
  function validarNota(texto) {
    if (typeof texto !== 'string') { return null; }
    if (texto.length > limite('NOTA_MAX', 200)) { return null; }
    return texto.trim();
  }

  /* Vacío es válido (el link es opcional). Solo http y https: los esquemas
   * peligrosos como javascript:, data: o file: se rechazan. */
  function validarLink(texto) {
    if (typeof texto !== 'string') { return null; }
    var limpio = texto.trim();
    if (limpio === '') { return ''; }
    if (limpio.length > limite('LINK_MAX', 2048)) { return null; }
    if (/[\u0000-\u001F\u007F\s]/.test(limpio)) { return null; }
    var url;
    try {
      url = new URL(limpio);
    } catch (e) {
      return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') { return null; }
    return url.href;
  }

  function validarCuenta(id, cuentas) {
    if (typeof id !== 'string' || !Array.isArray(cuentas)) { return false; }
    for (var i = 0; i < cuentas.length; i++) {
      if (cuentas[i] && cuentas[i].id === id) { return true; }
    }
    return false;
  }

  function validarPrioridad(valor, prioridades) {
    return enLista(valor, prioridades);
  }

  function validarIcono(valor, iconos) {
    return enLista(valor, iconos);
  }

  function esFechaISO(texto) {
    if (typeof texto !== 'string') { return false; }
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    if (!m) { return false; }
    var anio = parseInt(m[1], 10);
    var mes = parseInt(m[2], 10);
    var dia = parseInt(m[3], 10);
    var fecha = new Date(Date.UTC(anio, mes - 1, dia));
    return fecha.getUTCFullYear() === anio &&
      fecha.getUTCMonth() === mes - 1 &&
      fecha.getUTCDate() === dia;
  }

  /* Sin plazo es válido. Con plazo, no puede ser anterior a hoy. Las fechas
   * ISO AAAA-MM-DD se comparan lexicográficamente sin ambigüedad. */
  function validarPlazo(plazoISO, hoyISO) {
    if (plazoISO === '' || plazoISO === null || typeof plazoISO === 'undefined') {
      return true;
    }
    if (!esFechaISO(plazoISO) || !esFechaISO(hoyISO)) { return false; }
    return plazoISO >= hoyISO;
  }

  function validarAporte(modo, valor) {
    var modos = (App.config && App.config.APORTE_MODOS) ||
      ['ninguno', 'monto_fijo', 'porcentaje'];
    if (modos.indexOf(modo) === -1) { return false; }
    if (modo === 'ninguno') { return true; }
    if (modo === 'monto_fijo') { return parsearMonto(valor) !== null; }
    if (modo === 'porcentaje') {
      var numero = typeof valor === 'string'
        ? parseFloat(valor.replace(',', '.'))
        : valor;
      if (typeof numero !== 'number' || !isFinite(numero)) { return false; }
      var min = limite('APORTE_PORC_MIN', 1);
      var max = limite('APORTE_PORC_MAX', 100);
      return numero >= min && numero <= max;
    }
    return false;
  }

  function fechaHoyISO() {
    var ahora = new Date();
    var anio = ahora.getFullYear();
    var mes = ahora.getMonth() + 1;
    var dia = ahora.getDate();
    return anio + '-' + (mes < 10 ? '0' : '') + mes + '-' +
      (dia < 10 ? '0' : '') + dia;
  }

  /* Punto único de validación del formulario. Devuelve un objeto con
   * { valido, errores } y mensajes listos para mostrar. Se ejecuta al
   * escribir y otra vez antes de guardar. */
  function validateGoal(datos, config) {
    var errores = {};
    var d = datos || {};
    var cfg = config || App.config || {};
    var hoy = d.hoy || fechaHoyISO();

    if (validarNombre(d.nombre) === null) {
      errores.nombre = 'Poné un nombre de 1 a 60 caracteres.';
    }
    if (parsearMonto(d.monto) === null) {
      errores.monto = 'Ingresá un monto entero mayor a cero, sin centavos.';
    }
    if (cfg.MONEDAS && cfg.MONEDAS.indexOf(d.moneda) === -1) {
      errores.moneda = 'Elegí pesos o dólares.';
    }
    if (!validarCuenta(d.cuentaId, cfg.CUENTAS)) {
      errores.cuenta = 'Elegí una cuenta de la lista.';
    }
    if (!validarPrioridad(d.prioridad, cfg.PRIORIDADES)) {
      errores.prioridad = 'Elegí una prioridad válida.';
    }
    if (!validarIcono(d.icono, cfg.ICONOS)) {
      errores.icono = 'Elegí un ícono de la lista.';
    }
    if (validarNota(d.nota) === null) {
      errores.nota = 'La nota no puede superar los 200 caracteres.';
    }
    if (d.link && validarLink(d.link) === null) {
      errores.link = 'El link debe ser una dirección web que empiece con http o https.';
    }
    if (!validarPlazo(d.plazo, hoy)) {
      errores.plazo = 'El plazo no puede ser una fecha pasada.';
    }
    if (!validarAporte(d.aporteModo, d.aporteValor)) {
      errores.aporte = 'Revisá el aporte automático.';
    }

    return { valido: Object.keys(errores).length === 0, errores: errores };
  }

  App.validators = {
    parsearMonto: parsearMonto,
    validarNombre: validarNombre,
    validarNota: validarNota,
    validarLink: validarLink,
    validarCuenta: validarCuenta,
    validarPrioridad: validarPrioridad,
    validarIcono: validarIcono,
    validarPlazo: validarPlazo,
    validarAporte: validarAporte,
    fechaHoyISO: fechaHoyISO,
    validateGoal: validateGoal
  };
})(window.MetasApp);
