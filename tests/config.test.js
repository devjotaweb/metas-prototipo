/* MetasApp — pruebas de configuración (tests/config.test.js)
 * PORQUÉ: una prueba mínima confirma que el espacio de nombres y la fuente
 * de datos cargaron. El fallo intencional de Fase 0 (FUNC-00) se eliminó al
 * empezar la Fase 1.
 */

(function (App) {
  'use strict';

  App.test('FUNC-00A', 'La configuración existe y apunta al dominio permitido', function () {
    App.assert.ok(App.config, 'Falta App.config');
    App.assert.ok(
      App.config.URL_API.indexOf('https://apis.datos.gob.ar') === 0,
      'La URL de la API no es la esperada'
    );
  });
})(window.MetasApp);
