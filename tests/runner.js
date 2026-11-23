/* MetasApp — runner de pruebas (tests/runner.js)
 * PORQUÉ: sin Node ni librerías, el runner corre en el navegador y deja un
 * resumen copiable. Cada prueba lleva un ID de requisito (FUNC-xx / SEC-xx)
 * para poder rastrear qué control quedó demostrado.
 *
 * Los scripts con defer se ejecutan en orden antes de DOMContentLoaded, así
 * que al llegar ese evento ya están registradas todas las pruebas.
 * Las pruebas pueden ser sincrónicas o devolver una promesa; en ese caso el
 * runner espera el resultado antes de seguir.
 */

window.MetasApp = window.MetasApp || {};

(function (App) {
  'use strict';

  var pendientes = [];
  var resultados = [];

  App.assert = {
    ok: function (valor, mensaje) {
      if (!valor) {
        throw new Error(mensaje || 'Se esperaba un valor verdadero');
      }
    },

    equal: function (actual, esperado, mensaje) {
      if (actual !== esperado) {
        throw new Error((mensaje || 'Valores distintos') +
          ' (actual: ' + String(actual) + ', esperado: ' + String(esperado) + ')');
      }
    },

    close: function (actual, esperado, tolerancia, mensaje) {
      if (typeof actual !== 'number' || !isFinite(actual) ||
          Math.abs(actual - esperado) > tolerancia) {
        throw new Error((mensaje || 'Fuera de tolerancia') +
          ' (actual: ' + String(actual) + ', esperado: ' + String(esperado) +
          ' ±' + String(tolerancia) + ')');
      }
    },

    throws: function (fn, mensaje) {
      var lanzo = false;
      try {
        fn();
      } catch (e) {
        lanzo = true;
      }
      if (!lanzo) {
        throw new Error(mensaje || 'Se esperaba una excepción');
      }
    }
  };

  App.test = function (id, nombre, fn) {
    pendientes.push({ id: id, nombre: nombre, fn: fn });
  };

  function ejecutar() {
    var indice = 0;

    function siguiente() {
      if (indice >= pendientes.length) {
        mostrar();
        return;
      }

      var t = pendientes[indice];
      indice++;
      var salida;

      try {
        salida = t.fn();
      } catch (e) {
        resultados.push({ id: t.id, nombre: t.nombre, ok: false, detalle: e.message });
        siguiente();
        return;
      }

      if (salida && typeof salida.then === 'function') {
        salida.then(function () {
          resultados.push({ id: t.id, nombre: t.nombre, ok: true, detalle: '' });
          siguiente();
        }, function (e) {
          resultados.push({ id: t.id, nombre: t.nombre, ok: false, detalle: e.message });
          siguiente();
        });
        return;
      }

      resultados.push({ id: t.id, nombre: t.nombre, ok: true, detalle: '' });
      siguiente();
    }

    siguiente();
  }

  function mostrar() {
    var total = resultados.length;
    var pasaron = 0;
    var lineas = [];
    var fallidos = [];

    for (var i = 0; i < total; i++) {
      var r = resultados[i];
      if (r.ok) {
        pasaron++;
      } else {
        fallidos.push(r.id);
      }
      lineas.push((r.ok ? 'PASS' : 'FAIL') + '  ' + r.id + '  ' + r.nombre +
        (r.detalle ? '  -> ' + r.detalle : ''));
    }

    var resumen = 'RESUMEN: PASS ' + pasaron + '/' + total;
    if (fallidos.length > 0) {
      resumen += ' — FAIL: ' + fallidos.join(', ');
    }

    lineas.push('');
    lineas.push(resumen);

    var pre = document.getElementById('resumen');
    if (pre) {
      pre.textContent = lineas.join('\n');
    }
    document.title = (fallidos.length > 0 ? 'FAIL ' : 'PASS ') + pasaron + '/' + total;
  }

  document.addEventListener('DOMContentLoaded', ejecutar);
})(window.MetasApp);
