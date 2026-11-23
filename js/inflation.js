/* MetasApp — inflation.js
 * PORQUÉ: es el ÚNICO módulo autorizado a hacer pedidos de red. Recibe sus
 * dependencias por parámetro (pedido, almacén, reloj) para poder probarse sin
 * internet ni estado real, y para que la cadena de respaldo sea explícita.
 *
 * Cadena: caché fresca → red → caché vencida → estimación manual.
 * Ningún dato se muestra como oficial si no vino de la API o de una caché
 * fresca; la etiqueta viaja junto con la tasa para que la interfaz no invente.
 */

window.MetasApp = window.MetasApp || {};

(function (App) {
  'use strict';

  var DIA_MS = 24 * 60 * 60 * 1000;

  function dosDigitos(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function construirUrl() {
    return App.config.URL_API +
      '?ids=' + encodeURIComponent(App.config.ID_SERIE) +
      '&start_date=' + encodeURIComponent(App.config.FECHA_DESDE) +
      '&format=json';
  }

  /* Normaliza un período de la API (YYYY-MM o YYYY-MM-DD) al último día del
   * mes. Así el vencimiento se mide contra el cierre del período, no contra
   * el primer día, que haría parecer más viejo al dato. */
  function normalizarFecha(periodo) {
    if (typeof periodo !== 'string') { return null; }
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(periodo);
    if (!m) { return null; }
    var anio = parseInt(m[1], 10);
    var mes = parseInt(m[2], 10);
    if (!isFinite(anio) || !isFinite(mes) || mes < 1 || mes > 12) {
      return null;
    }
    var ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    return anio + '-' + dosDigitos(mes) + '-' + dosDigitos(ultimo);
  }

  function fechaAUTC(texto) {
    if (typeof texto !== 'string') { return null; }
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    if (!m) { return null; }
    var anio = parseInt(m[1], 10);
    var mes = parseInt(m[2], 10);
    var dia = parseInt(m[3], 10);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) { return null; }
    var d = new Date(Date.UTC(anio, mes - 1, dia));
    if (d.getUTCFullYear() !== anio ||
        d.getUTCMonth() !== mes - 1 ||
        d.getUTCDate() !== dia) {
      return null;
    }
    return d;
  }

  /* Falla cerrado: una fecha ilegible se trata como vencida. */
  function estaVencido(fechaISO, hoyISO, dias) {
    var f = fechaAUTC(fechaISO);
    var h = fechaAUTC(hoyISO);
    if (!f || !h) { return true; }
    var diferencia = Math.floor((h.getTime() - f.getTime()) / DIA_MS);
    return diferencia > dias;
  }

  function fechaHoyISO(fecha) {
    var d = fecha instanceof Date ? fecha : new Date();
    return d.getFullYear() + '-' + dosDigitos(d.getMonth() + 1) +
      '-' + dosDigitos(d.getDate());
  }

  /* Valida la forma real de la API y descarta filas que no sirvan. No confía
   * en `count`: usa la longitud real de `data` y deduplica por fecha.
   *
   * El año no está fijado: la serie arranca en ANIO_DESDE (2026) y avanza a
   * medida que se publican los datos. El techo es el reloj inyectado, así un
   * dato fechado en el futuro se descarta en vez de tomarse como oficial. */
  function parsearRespuesta(json, config, hoyISO) {
    var cfg = config || App.config;
    if (!json || typeof json !== 'object' || !Array.isArray(json.data)) {
      return { ok: false, motivo: 'forma' };
    }

    var anioDesde = typeof cfg.ANIO_DESDE === 'number'
      ? cfg.ANIO_DESDE
      : 2026;
    var limite = fechaAUTC(hoyISO) ? hoyISO : fechaHoyISO();
    var porFecha = Object.create(null);

    for (var i = 0; i < json.data.length; i++) {
      var fila = json.data[i];
      if (!Array.isArray(fila) || fila.length < 2) { continue; }

      var fecha = normalizarFecha(fila[0]);
      var valor = fila[1];
      if (!fecha) { continue; }
      var anio = parseInt(fecha.slice(0, 4), 10);
      if (!isFinite(anio) || anio < anioDesde) { continue; }
      if (fecha > limite) { continue; }
      if (typeof valor !== 'number' || !isFinite(valor) || valor <= 0) {
        continue;
      }
      porFecha[fecha] = valor;
    }

    var fechas = Object.keys(porFecha).sort();
    var observaciones = [];
    for (var j = 0; j < fechas.length; j++) {
      observaciones.push({ fecha: fechas[j], valor: porFecha[fechas[j]] });
    }

    if (observaciones.length < 2) {
      return { ok: false, motivo: 'pocos-datos' };
    }

    return {
      ok: true,
      observaciones: observaciones,
      fecha: observaciones[observaciones.length - 1].fecha
    };
  }

  /* La serie es un índice: la tasa mensual es la variación entre las dos
   * últimas observaciones, en porcentaje. Un resultado fuera del rango
   * razonable se rechaza en vez de mostrarse. */
  function tasaDesdeSerie(observaciones, config) {
    var cfg = config || App.config;
    if (!Array.isArray(observaciones) || observaciones.length < 2) {
      return NaN;
    }

    var anterior = observaciones[observaciones.length - 2];
    var ultima = observaciones[observaciones.length - 1];

    if (!anterior || !ultima) { return NaN; }
    if (typeof anterior.valor !== 'number' || anterior.valor <= 0) {
      return NaN;
    }
    if (typeof ultima.valor !== 'number' || !isFinite(ultima.valor)) {
      return NaN;
    }

    var tasa = ((ultima.valor / anterior.valor) - 1) * 100;
    if (!isFinite(tasa)) { return NaN; }
    if (tasa < cfg.TASA_MIN_API || tasa > cfg.TASA_MAX_API) { return NaN; }
    return tasa;
  }

  /* Hace el pedido real y devuelve un objeto con el resultado, sin lanzar.
   * Se usa desde tests/cors-probe.html para que la persona vea si el
   * navegador permite leer la respuesta desde file://. */
  function sondaCORS(opciones) {
    var opts = opciones || {};
    var fetchFn = opts.fetchFn || (typeof fetch === 'function' ? fetch : null);
    if (!fetchFn) {
      return Promise.resolve({ ok: false, error: 'fetch no disponible' });
    }

    var url = opts.url || construirUrl();
    var controlador = null;
    var temporizador = null;

    if (typeof AbortController === 'function') {
      controlador = new AbortController();
      temporizador = setTimeout(function () {
        controlador.abort();
      }, 8000);
    }

    var init = { headers: { Accept: 'application/json' } };
    if (controlador) { init.signal = controlador.signal; }

    return fetchFn(url, init).then(function (respuesta) {
      if (temporizador) { clearTimeout(temporizador); }

      var contentType = respuesta.headers
        ? respuesta.headers.get('content-type')
        : null;
      var acao = respuesta.headers
        ? respuesta.headers.get('access-control-allow-origin')
        : null;

      var base = {
        ok: respuesta.ok,
        status: respuesta.status,
        tipo: respuesta.type,
        contentType: contentType,
        acao: acao
      };

      return respuesta.json().then(function (cuerpo) {
        if (cuerpo && Array.isArray(cuerpo.data) && cuerpo.data.length > 0) {
          var ultimo = cuerpo.data[cuerpo.data.length - 1];
          base.muestra = 'data[' + cuerpo.data.length + ']; último = ' +
            JSON.stringify(ultimo);
        } else {
          base.muestra = 'la respuesta no trae un arreglo data con datos';
        }
        base.cuerpo = cuerpo;
        return base;
      }, function () {
        base.muestra = 'la respuesta no es JSON válido';
        return base;
      });
    }, function (error) {
      if (temporizador) { clearTimeout(temporizador); }
      var nombre = error && error.name ? error.name : 'Error';
      var mensaje = error && error.message ? error.message : 'fallo de red';
      return { ok: false, error: nombre + ': ' + mensaje };
    });
  }

  function esFresca(obtenidoEn, momento, ttl) {
    if (!(momento instanceof Date)) { return false; }
    if (typeof obtenidoEn !== 'number' || !isFinite(obtenidoEn)) { return false; }
    var diferencia = momento.getTime() - obtenidoEn;
    // Un sello en el futuro no se considera fresco: puede ser un reloj
    // manipulado y no queremos que la caché quede válida para siempre.
    return diferencia >= 0 && diferencia <= ttl;
  }

  function crearServicioInflacion(deps) {
    var d = deps || {};
    var cfg = d.config || App.config;

    var fetchFn = typeof d.fetchFn === 'function'
      ? d.fetchFn
      : (typeof fetch === 'function' ? fetch : null);

    var almacen = d.storage;
    if (!almacen) {
      if (App.storage && typeof App.storage.crearStorageDelNavegador === 'function') {
        almacen = App.storage.crearStorageDelNavegador();
      } else {
        almacen = {
          disponible: false,
          leer: function () { return null; },
          escribir: function () { return false; },
          quitar: function () { return false; }
        };
      }
    }

    var ahora = typeof d.now === 'function'
      ? d.now
      : function () { return new Date(); };

    var timeoutMs = typeof d.timeoutMs === 'number' && d.timeoutMs > 0
      ? d.timeoutMs
      : 8000;

    /* Reconstruye la caché campo por campo: lo guardado es dato no confiable
     * y puede haber sido editado desde DevTools. */
    function validarCache(obj) {
      if (!obj || typeof obj !== 'object') { return null; }
      var mensual = obj.mensual;
      var fecha = obj.fecha;
      var obtenidoEn = obj.obtenidoEn;

      if (typeof mensual !== 'number' || !isFinite(mensual)) { return null; }
      if (mensual < cfg.TASA_MIN_API || mensual > cfg.TASA_MAX_API) { return null; }
      if (typeof fecha !== 'string' || !fechaAUTC(fecha)) { return null; }
      if (typeof obtenidoEn !== 'number' || !isFinite(obtenidoEn) || obtenidoEn <= 0) {
        return null;
      }

      return { mensual: mensual, fecha: fecha, obtenidoEn: obtenidoEn };
    }

    function leerCache() {
      return almacen.leer(cfg.CLAVE_CACHE, validarCache);
    }

    function guardarCache(dato) {
      almacen.escribir(cfg.CLAVE_CACHE, {
        mensual: dato.mensual,
        fecha: dato.fecha,
        obtenidoEn: dato.obtenidoEn
      });
    }

    function desdeRed() {
      if (!fetchFn) { return Promise.resolve(null); }

      var controlador = null;
      var temporizador = null;
      if (typeof AbortController === 'function') {
        controlador = new AbortController();
        temporizador = setTimeout(function () {
          controlador.abort();
        }, timeoutMs);
      }

      var init = { headers: { Accept: 'application/json' } };
      if (controlador) { init.signal = controlador.signal; }

      return fetchFn(construirUrl(), init).then(function (respuesta) {
        if (temporizador) { clearTimeout(temporizador); }
        if (!respuesta || !respuesta.ok) { return null; }

        var tipo = respuesta.headers
          ? respuesta.headers.get('content-type')
          : null;
        if (typeof tipo !== 'string' || tipo.indexOf('application/json') === -1) {
          return null;
        }

        var promesaCuerpo;
        try {
          promesaCuerpo = respuesta.json();
        } catch (e) {
          return null;
        }
        if (!promesaCuerpo || typeof promesaCuerpo.then !== 'function') {
          return null;
        }

        return promesaCuerpo.then(function (cuerpo) {
          var parseado = parsearRespuesta(cuerpo, cfg, fechaHoyISO(ahora()));
          if (!parseado.ok) { return null; }

          var tasa = tasaDesdeSerie(parseado.observaciones, cfg);
          if (!isFinite(tasa)) { return null; }

          return {
            mensual: tasa,
            fecha: parseado.fecha,
            obtenidoEn: ahora().getTime()
          };
        }, function () {
          return null;
        });
      }, function () {
        if (temporizador) { clearTimeout(temporizador); }
        return null;
      });
    }

    function resultado(dato, origen, etiqueta, vencido) {
      return {
        mensual: dato.mensual,
        fecha: dato.fecha,
        origen: origen,
        etiqueta: etiqueta,
        vencido: !!vencido
      };
    }

    function obtenerTasa() {
      var cache = leerCache();

      if (cache && esFresca(cache.obtenidoEn, ahora(), cfg.TTL_CACHE_MS)) {
        return Promise.resolve(
          resultado(cache, 'cache', 'Dato oficial (INDEC)', false)
        );
      }

      return desdeRed().then(function (fresco) {
        if (fresco) {
          guardarCache(fresco);
          return resultado(
            fresco,
            'red',
            'Dato oficial (INDEC)',
            estaVencido(fresco.fecha, fechaHoyISO(ahora()), cfg.DIAS_VENCIDO)
          );
        }

        var viejo = cache || leerCache();
        if (viejo) {
          return resultado(viejo, 'cache', 'Dato desactualizado', true);
        }

        return resultado({
          mensual: cfg.TASA_RESPALDO,
          fecha: fechaHoyISO(ahora()),
          obtenidoEn: ahora().getTime()
        }, 'respaldo', 'Estimación manual', true);
      });
    }

    return { obtenerTasa: obtenerTasa };
  }

  App.inflation = {
    sondaCORS: sondaCORS,
    parsearRespuesta: parsearRespuesta,
    tasaDesdeSerie: tasaDesdeSerie,
    normalizarFecha: normalizarFecha,
    estaVencido: estaVencido,
    crearServicioInflacion: crearServicioInflacion
  };
})(window.MetasApp);
