(function (App) {
  'use strict';

  App.test('SEC-03-01', 'monto: acepta 100.000 y 100000', function () {
    App.assert.equal(App.validators.parsearMonto('100.000'), 100000);
    App.assert.equal(App.validators.parsearMonto('100000'), 100000);
    App.assert.equal(App.validators.parsearMonto('1.000.000'), 1000000);
  });

  App.test('SEC-03-02', 'monto: rechaza decimales, negativos y texto', function () {
    App.assert.equal(App.validators.parsearMonto('100.000,50'), null);
    App.assert.equal(App.validators.parsearMonto('-5'), null);
    App.assert.equal(App.validators.parsearMonto('abc'), null);
    App.assert.equal(App.validators.parsearMonto('1e308'), null);
    App.assert.equal(App.validators.parsearMonto('100000.50'), null);
  });

  App.test('SEC-03-03', 'monto: tope y cero', function () {
    App.assert.equal(App.validators.parsearMonto('0'), null);
    App.assert.equal(App.validators.parsearMonto('1000000001'), null);
    App.assert.equal(App.validators.parsearMonto('1000000000'), 1000000000);
  });

  App.test('SEC-03-04', 'nombre: 1 a 60, sin solo espacios', function () {
    App.assert.equal(App.validators.validarNombre('   '), null);
    App.assert.equal(App.validators.validarNombre('  Cubierta  '), 'Cubierta');
    App.assert.equal(App.validators.validarNombre('a'.repeat(61)), null);
  });

  App.test('SEC-03-05', 'nota: tope 200', function () {
    App.assert.equal(App.validators.validarNota('a'.repeat(200)), 'a'.repeat(200));
    App.assert.equal(App.validators.validarNota('a'.repeat(201)), null);
  });

  App.test('SEC-03-06', 'link: solo http y https', function () {
    App.assert.ok(
      App.validators.validarLink('https://apis.datos.gob.ar/serie/145'),
      'https valido'
    );
    App.assert.equal(App.validators.validarLink('javascript:alert(1)'), null);
    App.assert.equal(App.validators.validarLink('data:text/html,<b>x</b>'), null);
    App.assert.equal(App.validators.validarLink('file:///C:/secreto.txt'), null);
  });

  App.test('SEC-03-07', 'cuenta, prioridad e icono desde lista blanca', function () {
    App.assert.ok(App.validators.validarCuenta('caja-pesos', App.config.CUENTAS), 'cuenta valida');
    App.assert.equal(App.validators.validarCuenta('otra', App.config.CUENTAS), false);
    App.assert.ok(App.validators.validarPrioridad('media', App.config.PRIORIDADES), 'prioridad valida');
    App.assert.equal(App.validators.validarPrioridad('urgente', App.config.PRIORIDADES), false);
    App.assert.ok(App.validators.validarIcono('estrella', App.config.ICONOS), 'icono valido');
    App.assert.equal(App.validators.validarIcono('otro', App.config.ICONOS), false);
  });

  App.test('SEC-03-08', 'plazo: no puede ser pasado', function () {
    App.assert.ok(App.validators.validarPlazo('2026-12-31', '2026-11-16'), 'futuro valido');
    App.assert.equal(App.validators.validarPlazo('2026-11-15', '2026-11-16'), false);
    App.assert.equal(App.validators.validarPlazo('2026-02-30', '2026-11-16'), false);
  });

  App.test('SEC-03-09', 'validateGoal: objeto completo valido', function () {
    var datos = {
      nombre: 'Cubierta nueva',
      monto: '1.000.000',
      moneda: 'ARS',
      cuentaId: 'caja-pesos',
      prioridad: 'media',
      icono: 'estrella',
      nota: '',
      link: '',
      plazo: '2027-05-16',
      aporteModo: 'ninguno',
      aporteValor: '',
      metaPrincipal: false,
      hoy: '2026-11-16'
    };
    var r = App.validators.validateGoal(datos, App.config);
    App.assert.equal(r.valido, true, 'deberia ser valido');
    App.assert.equal(Object.keys(r.errores).length, 0);
  });

  App.test('SEC-03-10', 'validateGoal: detecta varios errores', function () {
    var datos = {
      nombre: '   ',
      monto: 'abc',
      moneda: 'ARS',
      cuentaId: 'otra',
      prioridad: 'urgente',
      icono: 'otro',
      nota: 'a'.repeat(201),
      link: 'javascript:alert(1)',
      plazo: '2026-01-01',
      aporteModo: 'monto_fijo',
      aporteValor: '0',
      metaPrincipal: false,
      hoy: '2026-11-16'
    };
    var r = App.validators.validateGoal(datos, App.config);
    App.assert.equal(r.valido, false);
    App.assert.ok(r.errores.nombre, 'error de nombre');
    App.assert.ok(r.errores.monto, 'error de monto');
    App.assert.ok(r.errores.cuenta, 'error de cuenta');
    App.assert.ok(r.errores.prioridad, 'error de prioridad');
    App.assert.ok(r.errores.icono, 'error de icono');
    App.assert.ok(r.errores.nota, 'error de nota');
    App.assert.ok(r.errores.link, 'error de link');
    App.assert.ok(r.errores.plazo, 'error de plazo');
    App.assert.ok(r.errores.aporte, 'error de aporte');
  });
})(window.MetasApp);
