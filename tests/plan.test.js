(function (App) {
  'use strict';

  App.test('FUNC-01', 'factorSerie con r=0,02 y n=6', function () {
    App.assert.close(App.plan.factorSerie(0.02, 6), 6.308121, 0.000001, 'S esperado');
  });

  App.test('FUNC-02', 'factorSerie con r=0 devuelve n', function () {
    App.assert.equal(App.plan.factorSerie(0, 1), 1);
    App.assert.equal(App.plan.factorSerie(0, 6), 6);
  });

  App.test('FUNC-03', 'objetivo proyectado M=1.000.000, r=0,02, n=6', function () {
    App.assert.close(App.plan.objetivoProyectado(1000000, 0.02, 6), 1126162.4, 1);
  });

  App.test('FUNC-04', 'cuota inicial cercana a 178.526', function () {
    App.assert.close(App.plan.cuotaInicial(1000000, 0.02, 6), 178526.4, 1);
  });

  App.test('FUNC-05', 'total acumulado x=100.000 en 6 meses = 630.812', function () {
    App.assert.close(App.plan.totalAcumulado(100000, 0.02, 6), 630812.1, 1);
  });

  App.test('FUNC-06', 'la cuota del mes 2 es la inicial ajustada', function () {
    var c0 = App.plan.cuotaInicial(1000000, 0.02, 6);
    App.assert.close(App.plan.cuotaEn(c0, 0.02, 1), c0 * 1.02, 0.001);
  });

  App.test('FUNC-07', 'n=1: el objetivo es M con un ajuste', function () {
    App.assert.close(App.plan.objetivoProyectado(100000, 0.02, 1), 102000, 0.001);
    App.assert.equal(App.plan.factorSerie(0.02, 1), 1);
    App.assert.close(App.plan.cuotaInicial(100000, 0.02, 1), 102000, 0.001);
  });

  App.test('FUNC-08', 'meses completos entre fechas', function () {
    App.assert.equal(App.plan.mesesEntre('2026-11-16', '2026-12-16'), 1);
    App.assert.equal(App.plan.mesesEntre('2026-11-16', '2027-05-16'), 6);
    App.assert.equal(App.plan.mesesEntre('2026-11-16', '2026-11-16'), 0);
    App.assert.equal(App.plan.mesesEntre('2026-11-16', '2026-11-15'), -1);
  });

  App.test('SEC-13-01', 'meses para plan: minimo 1 y tope 600', function () {
    App.assert.equal(App.plan.mesesParaPlan('2026-11-16', '2026-11-16'), 1);
    App.assert.equal(App.plan.mesesParaPlan('2026-11-16', '2126-11-16'), 600);
  });

  App.test('SEC-13-02', 'valores extremos siguen siendo finitos', function () {
    App.assert.ok(isFinite(App.plan.factorSerie(0.5, 600)), 'S debe ser finito');
    App.assert.ok(isFinite(App.plan.objetivoProyectado(1000000000, 0.5, 600)), 'T debe ser finito');
  });
})(window.MetasApp);
