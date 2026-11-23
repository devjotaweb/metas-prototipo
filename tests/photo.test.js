(function (App) {
  'use strict';

  function bytes(valores) {
    return new Uint8Array(valores);
  }

  function blob(valores, tipo) {
    return new Blob([bytes(valores)], { type: tipo || 'application/octet-stream' });
  }

  var JPEG = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0];
  var PNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0];
  var WEBP = [0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
  var EXE = [0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00];

  App.test('SEC-08-01', 'foto: reconoce la firma JPEG', function () {
    App.assert.equal(App.photo.detectarTipo(bytes(JPEG)), 'image/jpeg');
  });

  App.test('SEC-08-02', 'foto: reconoce la firma PNG', function () {
    App.assert.equal(App.photo.detectarTipo(bytes(PNG)), 'image/png');
  });

  App.test('SEC-08-03', 'foto: reconoce la firma WebP', function () {
    App.assert.equal(App.photo.detectarTipo(bytes(WEBP)), 'image/webp');
  });

  App.test('SEC-08-04', 'foto: rechaza un ejecutable renombrado a jpg', function () {
    return App.photo.validarFoto(blob(EXE, 'image/jpeg')).then(function (r) {
      App.assert.equal(r.ok, false, 'un MZ no es una imagen');
    });
  });

  App.test('SEC-08-05', 'foto: topea el tamaño y rechaza archivos vacíos', function () {
    var max = App.config.FOTO_MAX_BYTES;
    App.assert.equal(App.photo.validarTamano({ size: max }, max), true);
    App.assert.equal(App.photo.validarTamano({ size: max + 1 }, max), false);
    App.assert.equal(App.photo.validarTamano({ size: 0 }, max), false);
  });

  App.test('SEC-08-06', 'foto: vacío y firma desconocida se rechazan', function () {
    return App.photo.validarFoto(blob([], 'image/jpeg')).then(function (vacio) {
      App.assert.equal(vacio.ok, false);
      return App.photo.validarFoto(blob([1, 2, 3, 4, 5, 6, 7, 8], 'image/jpeg'));
    }).then(function (raro) {
      App.assert.equal(raro.ok, false);
    });
  });

  App.test('SEC-08-07', 'foto: manda la firma, no el tipo MIME declarado', function () {
    // Un JPEG con type "text/plain" se acepta por sus bytes; al revés, un MZ
    // con type "image/jpeg" se rechaza (SEC-08-04).
    return App.photo.validarFoto(blob(JPEG, 'text/plain')).then(function (r) {
      App.assert.equal(r.ok, true);
      App.assert.equal(r.tipo, 'image/jpeg');
    });
  });
})(window.MetasApp);
