(function (App) {
  'use strict';

  App.test('SEC-02-01', 'render: un payload queda como texto y no crea nodos', function () {
    var caja = document.createElement('div');
    var payload = '<img src=x onerror=alert(1)>';

    App.ui.escribirTexto(caja, payload);

    App.assert.equal(caja.textContent, payload);
    App.assert.equal(caja.children.length, 0);
    App.assert.equal(caja.querySelector('img'), null);
  });

  App.test('SEC-02-02', 'render: crearIcono solo acepta la lista blanca', function () {
    var valido = App.ui.crearIcono('estrella');
    App.assert.ok(valido, 'estrella debe existir');
    App.assert.equal(valido.namespaceURI, 'http://www.w3.org/2000/svg');
    App.assert.ok(valido.querySelector('path'), 'debe tener un trazo');

    App.assert.equal(App.ui.crearIcono('<img src=x onerror=alert(1)>'), null);
    App.assert.equal(App.ui.crearIcono('icono-inventado'), null);
  });

  App.test('SEC-10-01', 'accesibilidad: el ícono decorativo no se anuncia', function () {
    var svg = App.ui.crearIcono('casa');
    App.assert.equal(svg.getAttribute('aria-hidden'), 'true');
    App.assert.equal(svg.getAttribute('focusable'), 'false');
  });

  App.test('SEC-10-02', 'accesibilidad: cada ícono tiene trazo y etiqueta', function () {
    for (var i = 0; i < App.config.ICONOS.length; i++) {
      var nombre = App.config.ICONOS[i];
      App.assert.ok(App.ui.crearIcono(nombre), 'falta el trazo de ' + nombre);
      App.assert.ok(App.ui.crearEtiquetaIcono(nombre), 'falta la etiqueta de ' + nombre);
    }
  });

  App.test('UI-04-01', 'tasa manual: acepta coma, punto y los extremos', function () {
    App.assert.equal(App.ui.parsearTasa('2,5'), 2.5);
    App.assert.equal(App.ui.parsearTasa('2.5'), 2.5);
    App.assert.equal(App.ui.parsearTasa('0'), 0);
    App.assert.equal(App.ui.parsearTasa('50'), 50);
  });

  App.test('UI-04-02', 'tasa manual: rechaza texto y valores fuera de rango', function () {
    App.assert.equal(App.ui.parsearTasa(''), null);
    App.assert.equal(App.ui.parsearTasa('abc'), null);
    App.assert.equal(App.ui.parsearTasa('-1'), null);
    App.assert.equal(App.ui.parsearTasa('51'), null);
    App.assert.equal(App.ui.parsearTasa('1e3'), null);
    App.assert.equal(App.ui.parsearTasa('2,555'), null);
  });

  App.test('UI-04-03', 'tasa manual: se muestra con coma decimal', function () {
    App.assert.equal(App.ui.formatearTasa(2.1718), '2,17');
    App.assert.equal(App.ui.formatearTasa(2), '2,0');
  });

  App.test('UI-04-04', 'fechas: el mes se muestra en castellano', function () {
    App.assert.equal(App.ui.mesDeFecha('2026-10-31'), 'octubre de 2026');
    App.assert.equal(App.ui.mesDeFecha('2027-01-31'), 'enero de 2027');
    App.assert.equal(App.ui.mesDeFecha('2026-13-31'), null);
    App.assert.equal(App.ui.mesDeFecha('mala'), null);
  });
})(window.MetasApp);
