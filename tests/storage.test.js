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

  App.test('SEC-06-01', 'storage: escribe y lee con validador', function () {
    var s = App.storage.crearStorage(almacenFalso());
    App.assert.equal(s.escribir('k', { a: 1 }), true);
    var leido = s.leer('k', function (o) {
      return o && o.a === 1 ? { a: 1 } : null;
    });
    App.assert.equal(leido.a, 1);
  });

  App.test('SEC-06-02', 'storage: JSON invalido devuelve null', function () {
    var almacen = almacenFalso();
    almacen.setItem('k', '{roto');
    var s = App.storage.crearStorage(almacen);
    App.assert.equal(s.leer('k', function () { return { a: 1 }; }), null);
  });

  App.test('SEC-06-03', 'storage: validador que rechaza devuelve null', function () {
    var almacen = almacenFalso();
    almacen.setItem('k', '{"a":2}');
    var s = App.storage.crearStorage(almacen);
    App.assert.equal(s.leer('k', function () { return null; }), null);
  });

  App.test('SEC-06-04', 'storage: cuota llena no rompe', function () {
    var s = App.storage.crearStorage({
      getItem: function () { return null; },
      setItem: function () { throw new Error('QuotaExceededError'); },
      removeItem: function () {}
    });
    App.assert.equal(s.escribir('k', { a: 1 }), false);
  });

  App.test('SEC-06-05', 'storage: almacen ausente es seguro', function () {
    var s = App.storage.crearStorage(null);
    App.assert.equal(s.disponible, false);
    App.assert.equal(s.leer('k', function () { return { a: 1 }; }), null);
    App.assert.equal(s.escribir('k', { a: 1 }), false);
  });

  App.test('SEC-06-06', 'storage: __proto__ no contamina', function () {
    var almacen = almacenFalso();
    almacen.setItem('k', '{"__proto__":{"contaminado":true},"a":1}');
    var s = App.storage.crearStorage(almacen);
    var leido = s.leer('k', function (o) {
      if (!o || typeof o !== 'object') { return null; }
      return { a: o.a };
    });
    App.assert.equal(leido.a, 1);
    App.assert.equal(({}).contaminado, undefined);
  });

  App.test('SEC-06-07', 'storage: validador que lanza devuelve null', function () {
    var almacen = almacenFalso();
    almacen.setItem('k', '{"a":1}');
    var s = App.storage.crearStorage(almacen);
    App.assert.equal(s.leer('k', function () { throw new Error('boom'); }), null);
  });
})(window.MetasApp);
