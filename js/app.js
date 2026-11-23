/* MetasApp — app.js
 * PORQUÉ: el arranque y el cableado viven en un solo lugar para que el orden
 * de inicialización sea explícito. La función de inicio solo actúa cuando el
 * documento tiene el formulario, de modo que la página de pruebas puede
 * cargar los módulos sin arrancar la interfaz.
 */

window.MetasApp = window.MetasApp || {};

(function (App) {
  'use strict';

  function iniciar() {
    if (!document.getElementById('form-meta')) { return; }
    if (App.ui && typeof App.ui.iniciarFormulario === 'function') {
      App.ui.iniciarFormulario();
    }
  }

  App.app = {
    iniciar: iniciar
  };

  document.addEventListener('DOMContentLoaded', iniciar);
})(window.MetasApp);
