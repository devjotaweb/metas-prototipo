(function (App) {
  'use strict';

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

  function copiar(base, extra) {
    var salida = {};
    var k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) { salida[k] = base[k]; }
    }
    if (extra) {
      for (k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) { salida[k] = extra[k]; }
      }
    }
    return salida;
  }

  function metaValida(extra) {
    return copiar({
      id: 'meta-1',
      nombre: 'Cubierta nueva',
      monto: 1000000,
      moneda: 'ARS',
      cuentaId: 'caja-pesos',
      plazo: '',
      aporteModo: 'ninguno',
      aporteValor: null,
      prioridad: 'media',
      icono: 'estrella',
      nota: '',
      link: '',
      principal: false,
      foto: null,
      creadoEn: 1000,
      actualizadoEn: 1000
    }, extra);
  }

  function opciones() {
    return { config: App.config, hoy: '2026-11-18' };
  }

  function repoCon(almacen) {
    return App.storage.crearRepositorioMetas(
      App.storage.crearStorage(almacen), App.config
    );
  }

  App.test('SEC-03-11', 'ataque: nota de 201 caracteres no pasa validacion', function () {
    var datos = {
      nombre: 'Cubierta',
      monto: '1000',
      moneda: 'ARS',
      cuentaId: 'caja-pesos',
      prioridad: 'media',
      icono: 'estrella',
      nota: 'a'.repeat(201),
      link: '',
      plazo: '',
      aporteModo: 'ninguno',
      aporteValor: '',
      hoy: '2026-11-18'
    };
    var r = App.validators.validateGoal(datos, App.config);
    App.assert.equal(r.valido, false);
    App.assert.ok(r.errores.nota, 'debe marcar la nota');
  });

  App.test('SEC-03-12', 'ataque: nombre de solo espacios no pasa', function () {
    App.assert.equal(App.validators.validarNombre('   '), null);
  });

  App.test('SEC-03-13', 'ataque: montos 1e308, negativo, abc y decimal', function () {
    App.assert.equal(App.validators.parsearMonto('1e308'), null);
    App.assert.equal(App.validators.parsearMonto('-5'), null);
    App.assert.equal(App.validators.parsearMonto('abc'), null);
    App.assert.equal(App.validators.parsearMonto('100.000,50'), null);
  });

  App.test('SEC-03-14', 'ataque: link javascript, data y file se rechazan', function () {
    App.assert.equal(App.validators.validarLink('javascript:alert(1)'), null);
    App.assert.equal(App.validators.validarLink('data:text/html,<b>x</b>'), null);
    App.assert.equal(App.validators.validarLink('file:///C:/secreto.txt'), null);
    App.assert.ok(
      App.validators.validarLink('http://www.w3.org/2000/svg'),
      'http valido'
    );
    App.assert.ok(
      App.validators.validarLink('https://apis.datos.gob.ar/series/api/series/'),
      'https valido'
    );
  });

  App.test('SEC-03-15', 'ataque: plazo pasado y meses gigantes', function () {
    App.assert.equal(App.validators.validarPlazo('2026-01-01', '2026-11-18'), false);
    App.assert.equal(App.validators.validarPlazo('2126-11-18', '2026-11-18'), true);
    App.assert.equal(App.plan.mesesParaPlan('2026-11-18', '2126-11-18'), 600);
    App.assert.ok(
      isFinite(App.plan.objetivoProyectado(1000000000, 0.5, 600)),
      'el objetivo debe seguir siendo finito'
    );
  });

  App.test('SEC-04-15', 'ataque: API con objeto en vez de arreglo', function () {
    var r = App.inflation.parsearRespuesta({ data: { 0: ['2026-10-01', 100] } },
      App.config, '2026-11-18');
    App.assert.equal(r.ok, false);
  });

  App.test('SEC-04-16', 'ataque: API con cadena, null, 9999 y fecha invalida', function () {
    var cadena = App.inflation.parsearRespuesta({
      data: [['2026-09-01', 100], ['2026-10-01', '2.2']]
    }, App.config, '2026-11-18');
    var nulo = App.inflation.parsearRespuesta({
      data: [['2026-09-01', 100], ['2026-10-01', null]]
    }, App.config, '2026-11-18');
    var extrema = App.inflation.parsearRespuesta({
      data: [['2026-09-01', 100], ['2026-10-01', 9999]]
    }, App.config, '2026-11-18');
    var fecha = App.inflation.parsearRespuesta({
      data: [['2026-09-01', 100], ['fecha-mala', 110]]
    }, App.config, '2026-11-18');
    var vacia = App.inflation.parsearRespuesta({
      data: []
    }, App.config, '2026-11-18');

    App.assert.equal(cadena.ok, false);
    App.assert.equal(nulo.ok, false);
    App.assert.ok(isNaN(App.inflation.tasaDesdeSerie(extrema.observaciones, App.config)),
      '9999 debe quedar fuera de rango');
    App.assert.equal(fecha.ok, false);
    App.assert.equal(vacia.ok, false);
  });

  App.test('SEC-06-13', 'ataque: almacen con mas de METAS_MAX metas no se renderiza entero', function () {
    var almacen = almacenFalso();
    var lista = [];
    for (var i = 0; i < 100; i++) {
      lista.push(metaValida({
        id: 'meta-' + i,
        creadoEn: i + 1
      }));
    }
    almacen.setItem(App.config.CLAVE_METAS, JSON.stringify(lista));

    var leidas = repoCon(almacen).listar();
    App.assert.equal(leidas.length, App.config.METAS_MAX);
  });

  App.test('SEC-06-14', 'ataque: __proto__ en una meta valida no contamina', function () {
    var crudo = JSON.parse(JSON.stringify(metaValida({ id: 'meta-1' })));
    crudo.__proto__ = { contaminado: true };
    var meta = App.storage.normalizarMeta(crudo, opciones());
    App.assert.ok(meta, 'la meta debe seguir siendo valida');
    App.assert.equal(({}).contaminado, undefined);
  });

  App.test('SEC-06-15', 'ataque: link file persistido se descarta', function () {
    var almacen = almacenFalso();
    almacen.setItem(App.config.CLAVE_METAS, JSON.stringify([
      metaValida({ id: 'meta-1', link: 'file:///C:/secreto.txt' })
    ]));
    var leidas = repoCon(almacen).listar();
    App.assert.equal(leidas.length, 1);
    App.assert.equal(leidas[0].link, '');
  });

  App.test('SEC-09-15', 'ataque: XSS, SVG y nota larga en almacen', function () {
    var almacen = almacenFalso();
    almacen.setItem(App.config.CLAVE_METAS, JSON.stringify([
      metaValida({
        id: 'meta-1',
        nombre: '<img src=x onerror=alert(1)>',
        nota: 'a'.repeat(201),
        link: 'javascript:alert(1)',
        foto: 'data:image/svg+xml;base64,AAAA',
        principal: true
      }),
      metaValida({
        id: 'meta-2',
        nombre: 'Otra',
        principal: true
      })
    ]));

    var leidas = repoCon(almacen).listar();
    App.assert.equal(leidas.length, 2);
    App.assert.equal(leidas[0].nombre, '<img src=x onerror=alert(1)>');
    App.assert.equal(leidas[0].nota, '');
    App.assert.equal(leidas[0].link, '');
    App.assert.equal(leidas[0].foto, null);

    var principales = 0;
    for (var i = 0; i < leidas.length; i++) {
      if (leidas[i].principal) { principales++; }
    }
    App.assert.equal(principales, 1);
  });

  App.test('SEC-09-16', 'ataque: id con inyeccion se descarta', function () {
    var almacen = almacenFalso();
    almacen.setItem(App.config.CLAVE_METAS, JSON.stringify([
      metaValida({ id: '"><img src=x onerror=alert(1)>' })
    ]));
    App.assert.equal(repoCon(almacen).listar().length, 0);
  });

  App.test('SEC-06-16', 'ataque: JSON roto en el almacen no rompe', function () {
    var almacen = almacenFalso();
    almacen.setItem(App.config.CLAVE_METAS, '{roto');
    App.assert.equal(repoCon(almacen).listar().length, 0);
  });
})(window.MetasApp);
