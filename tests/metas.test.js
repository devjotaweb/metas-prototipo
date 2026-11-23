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

  function repoCon(almacen, config) {
    return App.storage.crearRepositorioMetas(
      App.storage.crearStorage(almacen),
      config || App.config
    );
  }

  App.test('SEC-09-01', 'metas: normaliza una meta valida', function () {
    var meta = App.storage.normalizarMeta(
      metaValida({ link: 'https://apis.datos.gob.ar/series/api/series/' }),
      opciones()
    );
    App.assert.ok(meta, 'debe aceptar la meta');
    App.assert.equal(meta.nombre, 'Cubierta nueva');
    App.assert.equal(meta.monto, 1000000);
    App.assert.equal(meta.link, 'https://apis.datos.gob.ar/series/api/series/');
    App.assert.equal(meta.foto, null);
  });

  App.test('SEC-09-02', 'metas: rechaza requeridos invalidos', function () {
    var o = opciones();
    App.assert.equal(App.storage.normalizarMeta(metaValida({ monto: 0 }), o), null);
    App.assert.equal(App.storage.normalizarMeta(metaValida({ moneda: 'EUR' }), o), null);
    App.assert.equal(App.storage.normalizarMeta(metaValida({ cuentaId: 'nope' }), o), null);
    App.assert.equal(App.storage.normalizarMeta(metaValida({ icono: 'nope' }), o), null);
    App.assert.equal(App.storage.normalizarMeta(metaValida({ plazo: '2020-01-01' }), o), null);
  });

  App.test('SEC-09-03', 'metas: descarta links peligrosos', function () {
    var o = opciones();
    var javascript = App.storage.normalizarMeta(
      metaValida({ link: 'javascript:alert(1)' }), o
    );
    var data = App.storage.normalizarMeta(
      metaValida({ link: 'data:text/html,x' }), o
    );
    App.assert.equal(javascript.link, '');
    App.assert.equal(data.link, '');
  });

  App.test('SEC-09-04', 'metas: descarta fotos que no son JPEG', function () {
    var o = opciones();
    var svg = App.storage.normalizarMeta(
      metaValida({ foto: 'data:image/svg+xml;base64,AAAA' }), o
    );
    var jpeg = App.storage.normalizarMeta(
      metaValida({ foto: 'data:image/jpeg;base64,/9j/4AAQ' }), o
    );
    App.assert.equal(svg.foto, null);
    App.assert.equal(jpeg.foto, 'data:image/jpeg;base64,/9j/4AAQ');
  });

  App.test('SEC-09-05', 'metas: guarda y lista', function () {
    var repo = repoCon(almacenFalso());
    var a = repo.guardar(metaValida({
      id: undefined, nombre: 'A', creadoEn: 1000
    }));
    var b = repo.guardar(metaValida({
      id: undefined, nombre: 'B', creadoEn: 2000
    }));
    App.assert.equal(a.ok, true);
    App.assert.equal(b.ok, true);

    var lista = repo.listar();
    App.assert.equal(lista.length, 2);
    App.assert.equal(lista[0].nombre, 'B');
  });

  App.test('SEC-09-06', 'metas: principal unica al guardar', function () {
    var repo = repoCon(almacenFalso());
    repo.guardar(metaValida({
      id: undefined, nombre: 'A', principal: true, creadoEn: 1000
    }));
    repo.guardar(metaValida({
      id: undefined, nombre: 'B', principal: true, creadoEn: 2000
    }));

    var lista = repo.listar();
    var principales = 0;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].principal) { principales++; }
    }
    App.assert.equal(principales, 1);
    App.assert.equal(lista[0].nombre, 'B');
  });

  App.test('SEC-09-07', 'metas: leer con dos principales deja una', function () {
    var almacen = almacenFalso();
    almacen.setItem(App.config.CLAVE_METAS, JSON.stringify([
      metaValida({ id: 'meta-1', principal: true, creadoEn: 2000 }),
      metaValida({
        id: 'meta-2', nombre: 'Otra', principal: true, creadoEn: 1000
      })
    ]));

    var lista = repoCon(almacen).listar();
    var principales = 0;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].principal) { principales++; }
    }
    App.assert.equal(lista.length, 2);
    App.assert.equal(principales, 1);
  });

  App.test('SEC-09-08', 'metas: renombrar revalida', function () {
    var repo = repoCon(almacenFalso());
    var guardada = repo.guardar(metaValida({ id: undefined, nombre: 'Original' }));
    var id = guardada.meta.id;

    App.assert.equal(repo.renombrar(id, '   ').ok, false);
    App.assert.equal(repo.listar()[0].nombre, 'Original');

    App.assert.equal(repo.renombrar(id, '  Nuevo  ').ok, true);
    App.assert.equal(repo.listar()[0].nombre, 'Nuevo');
  });

  App.test('SEC-09-09', 'metas: cuota llena no rompe', function () {
    var datos = {};
    var almacen = {
      getItem: function (clave) {
        return Object.prototype.hasOwnProperty.call(datos, clave) ? datos[clave] : null;
      },
      setItem: function (clave, valor) {
        if (clave === 'metas.lista') { throw new Error('QuotaExceededError'); }
        datos[clave] = String(valor);
      },
      removeItem: function (clave) { delete datos[clave]; }
    };
    var repo = App.storage.crearRepositorioMetas(
      App.storage.crearStorage(almacen), App.config
    );

    var resultado = repo.guardar(metaValida({ id: undefined }));
    App.assert.equal(resultado.ok, false);
    App.assert.equal(resultado.motivo, 'cuota');
  });

  App.test('SEC-09-10', 'metas: almacen roto o contaminado no rompe', function () {
    var almacen = almacenFalso();
    almacen.setItem(App.config.CLAVE_METAS, '{roto');
    App.assert.equal(repoCon(almacen).listar().length, 0);

    almacen.setItem(App.config.CLAVE_METAS,
      '[{"__proto__":{"contaminado":true},"id":"meta-1","nombre":"A"}]');
    App.assert.equal(repoCon(almacen).listar().length, 0);
    App.assert.equal(({}).contaminado, undefined);
  });

  App.test('SEC-09-11', 'metas: eliminar', function () {
    var repo = repoCon(almacenFalso());
    var guardada = repo.guardar(metaValida({ id: undefined }));
    App.assert.equal(repo.eliminar(guardada.meta.id).ok, true);
    App.assert.equal(repo.listar().length, 0);
  });

  App.test('SEC-09-12', 'metas: tope de metas', function () {
    var cfg = Object.create(App.config);
    cfg.METAS_MAX = 2;
    var repo = repoCon(almacenFalso(), cfg);

    App.assert.equal(repo.guardar(metaValida({
      id: undefined, nombre: 'A', creadoEn: 1000
    })).ok, true);
    App.assert.equal(repo.guardar(metaValida({
      id: undefined, nombre: 'B', creadoEn: 2000
    })).ok, true);

    var tercera = repo.guardar(metaValida({ id: undefined, nombre: 'C' }));
    App.assert.equal(tercera.ok, false);
    App.assert.equal(tercera.motivo, 'tope');
  });

  App.test('SEC-09-13', 'metas: una fecha vencida no borra la meta', function () {
    var almacen = almacenFalso();
    almacen.setItem(App.config.CLAVE_METAS, JSON.stringify([
      metaValida({ id: 'meta-1', plazo: '2026-01-15' })
    ]));

    var lista = repoCon(almacen).listar();
    App.assert.equal(lista.length, 1);
    App.assert.equal(lista[0].plazo, '2026-01-15');
  });

  App.test('SEC-09-14', 'metas: sin almacen avisa distinto de cuota', function () {
    var repo = App.storage.crearRepositorioMetas(
      App.storage.crearStorage(null), App.config
    );

    var resultado = repo.guardar(metaValida({ id: undefined }));
    App.assert.equal(resultado.ok, false);
    App.assert.equal(resultado.motivo, 'sin-almacen');
  });
})(window.MetasApp);
