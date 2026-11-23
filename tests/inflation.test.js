(function (App) {
  'use strict';

  /* Serie de prueba con la misma forma que devuelve la API real: un arreglo
   * data de pares [fecha, valor]. Las dos últimas observaciones son las que
   * definen la tasa mensual que se muestra en la pantalla. */
  /* Fecha de referencia para el techo de la serie: los tests no dependen del
   * reloj real de la máquina que los corre. */
  var HOY = '2026-11-16';

  var FIXTURE = {
    data: [
      ['2026-01-01', 10413.0309],
      ['2026-02-01', 10725.4218],
      ['2026-03-01', 11113.5870],
      ['2026-04-01', 11469.2326],
      ['2026-05-01', 11793.8571],
      ['2026-06-01', 12088.1035],
      ['2026-07-01', 12299.6484],
      ['2026-08-01', 12438.1726],
      ['2026-09-01', 12514.1508],
      ['2026-10-01', 12785.9321]
    ],
    count: 10
  };

  function almacenFalso() {
    var datos = {};
    return {
      getItem: function (clave) {
        return Object.prototype.hasOwnProperty.call(datos, clave) ? datos[clave] : null;
      },
      setItem: function (clave, valor) { datos[clave] = String(valor); },
      removeItem: function (clave) { delete datos[clave]; }
    };
  }

  function respuestaJson(cuerpo, opciones) {
    var opts = opciones || {};
    return Promise.resolve({
      ok: opts.ok !== false,
      status: opts.status || 200,
      type: 'cors',
      headers: {
        get: function (nombre) {
          if (nombre === 'content-type') {
            return opts.contentType || 'application/json';
          }
          return null;
        }
      },
      json: function () { return Promise.resolve(cuerpo); }
    });
  }

  function redCaida() {
    return Promise.reject(new Error('sin red'));
  }

  // Fecha local fija: 16 de noviembre de 2026, mediodía.
  function relojFijo() {
    return new Date(2026, 10, 16, 12, 0, 0);
  }

  function crearServicio(opciones) {
    var opts = opciones || {};
    return App.inflation.crearServicioInflacion({
      fetchFn: opts.fetchFn || redCaida,
      storage: App.storage.crearStorage(opts.almacen || almacenFalso()),
      now: opts.now || relojFijo,
      config: App.config
    });
  }

  App.test('SEC-04-01', 'inflacion: parsea la forma real de la API', function () {
    var r = App.inflation.parsearRespuesta(FIXTURE, App.config, HOY);
    App.assert.equal(r.ok, true);
    App.assert.equal(r.observaciones.length, 10);
    App.assert.equal(r.fecha, '2026-10-31');
  });

  App.test('SEC-04-02', 'inflacion: rechaza una respuesta sin arreglo data', function () {
    var r = App.inflation.parsearRespuesta({ foo: 1 }, App.config, HOY);
    App.assert.equal(r.ok, false);
  });

  App.test('SEC-04-03', 'inflacion: descarta valores que no son numeros', function () {
    var r = App.inflation.parsearRespuesta({
      data: [['2026-09-01', 100], ['2026-10-01', '2.2']]
    }, App.config, HOY);
    App.assert.equal(r.ok, false);
  });

  App.test('SEC-04-04', 'inflacion: descarta valores nulos', function () {
    var r = App.inflation.parsearRespuesta({
      data: [['2026-09-01', 100], ['2026-10-01', null]]
    }, App.config, HOY);
    App.assert.equal(r.ok, false);
  });

  App.test('SEC-04-05', 'inflacion: exige al menos dos observaciones', function () {
    var r = App.inflation.parsearRespuesta({
      data: [['2026-10-01', 100]]
    }, App.config, HOY);
    App.assert.equal(r.ok, false);
  });

  App.test('SEC-04-06', 'inflacion: descarta fechas invalidas', function () {
    var r = App.inflation.parsearRespuesta({
      data: [['2026-09-01', 100], ['fecha-mala', 110]]
    }, App.config, HOY);
    App.assert.equal(r.ok, false);
  });

  App.test('SEC-04-07', 'inflacion: descarta anios anteriores a ANIO_DESDE', function () {
    var r = App.inflation.parsearRespuesta({
      data: [['2025-12-01', 100], ['2026-01-01', 110]]
    }, App.config, HOY);
    App.assert.equal(r.ok, false);
  });

  App.test('SEC-04-08', 'inflacion: calcula la tasa mensual con dos indices', function () {
    var r = App.inflation.parsearRespuesta(FIXTURE, App.config, HOY);
    var tasa = App.inflation.tasaDesdeSerie(r.observaciones, App.config);
    App.assert.close(tasa, 2.1718, 0.001);
  });

  App.test('SEC-04-09', 'inflacion: normaliza el periodo al ultimo dia del mes', function () {
    App.assert.equal(App.inflation.normalizarFecha('2026-02-01'), '2026-02-28');
    App.assert.equal(App.inflation.normalizarFecha('2026-10-01'), '2026-10-31');
    App.assert.equal(App.inflation.normalizarFecha('2026-13-01'), null);
    App.assert.equal(App.inflation.normalizarFecha('2026-10-01basura'), null);
  });

  App.test('SEC-04-10', 'inflacion: marca vencido despues de los dias configurados', function () {
    App.assert.equal(App.inflation.estaVencido('2026-10-31', '2026-11-16', 75), false);
    App.assert.equal(App.inflation.estaVencido('2026-01-31', '2026-11-16', 75), true);
    App.assert.equal(App.inflation.estaVencido('mala', '2026-11-16', 75), true);
  });

  App.test('SEC-04-11', 'inflacion: acepta el anio siguiente cuando ya se publico', function () {
    var r = App.inflation.parsearRespuesta({
      data: [
        ['2026-12-01', 100],
        ['2027-01-01', 102],
        ['2027-02-01', 104]
      ]
    }, App.config, '2027-03-10');
    App.assert.equal(r.ok, true);
    App.assert.equal(r.observaciones.length, 3);
    App.assert.equal(r.fecha, '2027-02-28');
    App.assert.close(
      App.inflation.tasaDesdeSerie(r.observaciones, App.config),
      1.9608, 0.001
    );
  });

  App.test('SEC-04-12', 'inflacion: descarta un anio posterior al reloj', function () {
    var r = App.inflation.parsearRespuesta({
      data: [
        ['2026-09-01', 100],
        ['2026-10-01', 110],
        ['2027-01-01', 120]
      ]
    }, App.config, HOY);
    App.assert.equal(r.ok, true);
    App.assert.equal(r.observaciones.length, 2);
    App.assert.equal(r.fecha, '2026-10-31');
    App.assert.close(
      App.inflation.tasaDesdeSerie(r.observaciones, App.config),
      10, 0.001
    );
  });

  App.test('SEC-04-13', 'inflacion: descarta un mes posterior a hoy', function () {
    var r = App.inflation.parsearRespuesta({
      data: [
        ['2026-09-01', 100],
        ['2026-10-01', 110],
        ['2026-11-01', 120]
      ]
    }, App.config, HOY);
    App.assert.equal(r.ok, true);
    App.assert.equal(r.fecha, '2026-10-31');
    App.assert.equal(r.observaciones.length, 2);
  });

  App.test('SEC-04-14', 'inflacion: calcula la tasa aunque cruce de anio', function () {
    var r = App.inflation.parsearRespuesta({
      data: [['2026-12-01', 100], ['2027-01-01', 103]]
    }, App.config, '2027-02-15');
    App.assert.equal(r.ok, true);
    App.assert.close(
      App.inflation.tasaDesdeSerie(r.observaciones, App.config),
      3, 0.001
    );
  });

  App.test('SEC-13-03', 'inflacion: rechaza una tasa fuera del rango razonable', function () {
    var r = App.inflation.parsearRespuesta({
      data: [['2026-09-01', 100], ['2026-10-01', 9999]]
    }, App.config, HOY);
    var tasa = App.inflation.tasaDesdeSerie(r.observaciones, App.config);
    App.assert.ok(isNaN(tasa), 'La tasa debio rechazarse');
  });

  App.test('SEC-05-01', 'inflacion: sin red y sin cache usa el respaldo manual', function () {
    return crearServicio({ fetchFn: redCaida }).obtenerTasa().then(function (r) {
      App.assert.equal(r.origen, 'respaldo');
      App.assert.equal(r.etiqueta, 'Estimación manual');
      App.assert.equal(r.mensual, App.config.TASA_RESPALDO);
    });
  });

  App.test('SEC-05-02', 'inflacion: un error HTTP no rompe la pantalla', function () {
    return crearServicio({
      fetchFn: function () { return respuestaJson(FIXTURE, { ok: false, status: 500 }); }
    }).obtenerTasa().then(function (r) {
      App.assert.equal(r.origen, 'respaldo');
    });
  });

  App.test('SEC-05-03', 'inflacion: rechaza una respuesta que no es JSON', function () {
    return crearServicio({
      fetchFn: function () {
        return respuestaJson(FIXTURE, { contentType: 'text/html' });
      }
    }).obtenerTasa().then(function (r) {
      App.assert.equal(r.origen, 'respaldo');
    });
  });

  App.test('SEC-05-04', 'inflacion: con red guarda el dato oficial en cache', function () {
    var almacen = almacenFalso();
    return crearServicio({
      almacen: almacen,
      fetchFn: function () { return respuestaJson(FIXTURE); }
    }).obtenerTasa().then(function (r) {
      App.assert.equal(r.origen, 'red');
      App.assert.equal(r.etiqueta, 'Dato oficial (INDEC)');
      App.assert.close(r.mensual, 2.1718, 0.001);
      var guardado = JSON.parse(almacen.getItem(App.config.CLAVE_CACHE));
      App.assert.ok(guardado && guardado.mensual > 2, 'No se guardo la cache');
    });
  });

  App.test('SEC-06-08', 'inflacion: usa la cache fresca sin ir a la red', function () {
    var llamadas = 0;
    var almacen = almacenFalso();
    almacen.setItem(App.config.CLAVE_CACHE, JSON.stringify({
      mensual: 2.5,
      fecha: '2026-10-31',
      obtenidoEn: relojFijo().getTime() - 60 * 60 * 1000
    }));

    return crearServicio({
      almacen: almacen,
      fetchFn: function () { llamadas++; return respuestaJson(FIXTURE); }
    }).obtenerTasa().then(function (r) {
      App.assert.equal(llamadas, 0, 'No debio consultar la red');
      App.assert.equal(r.origen, 'cache');
      App.assert.equal(r.etiqueta, 'Dato oficial (INDEC)');
      App.assert.equal(r.mensual, 2.5);
    });
  });

  App.test('SEC-06-09', 'inflacion: con cache vencida y sin red avisa que esta desactualizada', function () {
    var almacen = almacenFalso();
    almacen.setItem(App.config.CLAVE_CACHE, JSON.stringify({
      mensual: 3.1,
      fecha: '2026-01-31',
      obtenidoEn: relojFijo().getTime() - 13 * 60 * 60 * 1000
    }));

    return crearServicio({
      almacen: almacen,
      fetchFn: redCaida
    }).obtenerTasa().then(function (r) {
      App.assert.equal(r.origen, 'cache');
      App.assert.equal(r.etiqueta, 'Dato desactualizado');
      App.assert.equal(r.vencido, true);
      App.assert.equal(r.mensual, 3.1);
    });
  });

  App.test('SEC-06-10', 'inflacion: sin cache y sin red usa el respaldo manual', function () {
    return crearServicio({ fetchFn: redCaida }).obtenerTasa().then(function (r) {
      App.assert.equal(r.origen, 'respaldo');
      App.assert.equal(r.etiqueta, 'Estimación manual');
      App.assert.equal(r.vencido, true);
    });
  });

  App.test('SEC-06-11', 'inflacion: una cache corrupta se ignora', function () {
    var almacen = almacenFalso();
    almacen.setItem(App.config.CLAVE_CACHE, '{roto');

    return crearServicio({
      almacen: almacen,
      fetchFn: redCaida
    }).obtenerTasa().then(function (r) {
      App.assert.equal(r.origen, 'respaldo');
    });
  });

  App.test('SEC-07-01', 'inflacion: el respaldo manual esta dentro del rango editable', function () {
    var tasa = App.config.TASA_RESPALDO;
    App.assert.ok(typeof tasa === 'number' && isFinite(tasa),
      'La tasa de respaldo no es finita');
    App.assert.ok(tasa >= App.config.TASA_MIN_EDICION &&
      tasa <= App.config.TASA_MAX_EDICION,
      'La tasa de respaldo esta fuera del rango editable');
  });

  App.test('SEC-07-02', 'inflacion: el respaldo se informa como estimacion manual', function () {
    return crearServicio({ fetchFn: redCaida }).obtenerTasa().then(function (r) {
      App.assert.equal(r.origen, 'respaldo');
      App.assert.equal(r.etiqueta, 'Estimación manual');
      App.assert.equal(r.mensual, App.config.TASA_RESPALDO);
      App.assert.ok(r.mensual >= App.config.TASA_MIN_EDICION &&
        r.mensual <= App.config.TASA_MAX_EDICION,
        'El respaldo quedo fuera del rango editable');
    });
  });

  App.test('SEC-06-12', 'inflacion: no guarda una tasa fuera de rango', function () {
    var almacen = almacenFalso();
    return crearServicio({
      almacen: almacen,
      fetchFn: function () {
        return respuestaJson({
          data: [['2026-09-01', 100], ['2026-10-01', 9999]]
        });
      }
    }).obtenerTasa().then(function (r) {
      App.assert.equal(r.origen, 'respaldo');
      App.assert.equal(almacen.getItem(App.config.CLAVE_CACHE), null);
    });
  });
})(window.MetasApp);
