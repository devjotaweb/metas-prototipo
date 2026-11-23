/* MetasApp — photo.js
 * PORQUÉ: la validación de la foto debe mirar los bytes reales del archivo y
 * no su extensión, porque una extensión se puede renombrar. Además reduce la
 * imagen para quitar metadatos y cuidar la cuota del almacenamiento.
 */

window.MetasApp = window.MetasApp || {};

(function (App) {
  'use strict';

  // Con 12 bytes alcanza para distinguir JPEG, PNG y WebP.
  var BYTES_FIRMA = 12;

  function limite(nombre, porDefecto) {
    if (App.config && typeof App.config[nombre] === 'number') {
      return App.config[nombre];
    }
    return porDefecto;
  }

  /* Mira la firma binaria. El tipo MIME que informa el navegador es solo una
   * pista: un .exe renombrado a .jpg puede declarar image/jpeg y igual se
   * rechaza porque sus primeros bytes no son de una imagen permitida. */
  function detectarTipo(bytes) {
    if (!bytes || typeof bytes.length !== 'number') { return null; }

    if (bytes.length >= 3 &&
        bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'image/jpeg';
    }

    if (bytes.length >= 8 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
        bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
      return 'image/png';
    }

    if (bytes.length >= 12 &&
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return 'image/webp';
    }

    return null;
  }

  function validarTamano(archivo, maxBytes) {
    var max = typeof maxBytes === 'number'
      ? maxBytes
      : limite('FOTO_MAX_BYTES', 5 * 1024 * 1024);
    return !!archivo && typeof archivo.size === 'number' &&
      archivo.size > 0 && archivo.size <= max;
  }

  /* FileReader en vez de arrayBuffer(): funciona en más navegadores y no
   * necesita recordar la compatibilidad de Blob.arrayBuffer. */
  function leerBytes(archivo, cantidad) {
    return new Promise(function (resolve) {
      try {
        var lector = new FileReader();
        lector.onload = function () {
          resolve(lector.result ? new Uint8Array(lector.result) : null);
        };
        lector.onerror = function () { resolve(null); };
        lector.readAsArrayBuffer(archivo.slice(0, cantidad));
      } catch (e) {
        resolve(null);
      }
    });
  }

  function validarFoto(archivo, config) {
    var cfg = config || App.config || {};
    var max = typeof cfg.FOTO_MAX_BYTES === 'number'
      ? cfg.FOTO_MAX_BYTES
      : 5 * 1024 * 1024;

    if (!archivo || typeof archivo.size !== 'number' || archivo.size <= 0) {
      return Promise.resolve({ ok: false, mensaje: 'Elegí una imagen.' });
    }

    if (archivo.size > max) {
      var mb = Math.round(max / (1024 * 1024));
      return Promise.resolve({
        ok: false,
        mensaje: 'La foto supera los ' + mb + ' MB.'
      });
    }

    return leerBytes(archivo, BYTES_FIRMA).then(function (bytes) {
      var tipo = detectarTipo(bytes);
      if (!tipo) {
        return {
          ok: false,
          mensaje: 'Ese archivo no es una imagen JPEG, PNG o WebP.'
        };
      }
      return { ok: true, tipo: tipo };
    });
  }

  /* Redibujar en un canvas reduce el lado mayor a 800 px y descarta los
   * metadatos EXIF (incluidas las coordenadas GPS) porque solo se copian
   * los píxeles. El fondo blanco evita que un PNG transparente quede negro
   * al convertirlo a JPEG. */
  function crearMiniatura(archivo, ladoMax) {
    var max = typeof ladoMax === 'number'
      ? ladoMax
      : limite('FOTO_LADO_MAX', 800);
    var calidad = App.config && typeof App.config.FOTO_CALIDAD === 'number'
      ? App.config.FOTO_CALIDAD
      : 0.82;

    return new Promise(function (resolve, reject) {
      var url;
      try {
        url = URL.createObjectURL(archivo);
      } catch (e) {
        reject(new Error('No pudimos leer la foto. Probá con otra.'));
        return;
      }

      var imagen = new Image();

      function liberar() {
        try { URL.revokeObjectURL(url); } catch (e) { /* nada */ }
      }

      imagen.onload = function () {
        try {
          if (!imagen.naturalWidth || !imagen.naturalHeight) {
            throw new Error('La imagen no tiene tamaño.');
          }

          var escala = Math.min(
            1,
            max / Math.max(imagen.naturalWidth, imagen.naturalHeight)
          );
          var ancho = Math.max(1, Math.round(imagen.naturalWidth * escala));
          var alto = Math.max(1, Math.round(imagen.naturalHeight * escala));

          var lienzo = document.createElement('canvas');
          lienzo.width = ancho;
          lienzo.height = alto;

          var contexto = lienzo.getContext('2d');
          if (!contexto) { throw new Error('Sin contexto de dibujo.'); }

          contexto.fillStyle = '#ffffff';
          contexto.fillRect(0, 0, ancho, alto);
          contexto.drawImage(imagen, 0, 0, ancho, alto);

          var datos = lienzo.toDataURL('image/jpeg', calidad);
          liberar();
          resolve(datos);
        } catch (e) {
          liberar();
          reject(new Error('No pudimos preparar la foto. Probá con otra.'));
        }
      };

      imagen.onerror = function () {
        liberar();
        reject(new Error('No pudimos leer la foto. Probá con otra.'));
      };

      imagen.src = url;
    });
  }

  App.photo = {
    detectarTipo: detectarTipo,
    validarTamano: validarTamano,
    validarFoto: validarFoto,
    crearMiniatura: crearMiniatura
  };
})(window.MetasApp);
