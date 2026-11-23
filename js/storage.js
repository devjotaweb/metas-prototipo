/* MetasApp — storage.js
 * PORQUÉ: es el ÚNICO módulo autorizado a tocar el almacenamiento del
 * navegador. Concentrar ese acceso permite envolverlo en try/catch y validar
 * lo leído, porque el almacenamiento local también es dato no confiable.
 *
 * El almacén se recibe por parámetro para poder probarlo con un doble en
 * memoria. Nunca se confía en la forma de lo guardado: cada lectura pasa por
 * un validador que reconstruye el objeto con los campos permitidos.
 */

window.MetasApp = window.MetasApp || {};

(function (App) {
  'use strict';

  var CLAVE_SONDA = '__metas_sonda__';

  function esAlmacenUtil(almacen) {
    return !!almacen &&
      typeof almacen.getItem === 'function' &&
      typeof almacen.setItem === 'function' &&
      typeof almacen.removeItem === 'function';
  }

  /* Prueba real de escritura: en modo privado algunos navegadores exponen
   * localStorage pero lanzan al usarlo. Si la sonda falla, el resto del
   * módulo funciona en modo seguro (no lee ni escribe). */
  function probarAlmacen(almacen) {
    if (!esAlmacenUtil(almacen)) { return false; }
    try {
      almacen.setItem(CLAVE_SONDA, '1');
      var leido = almacen.getItem(CLAVE_SONDA);
      almacen.removeItem(CLAVE_SONDA);
      return leido === '1';
    } catch (e) {
      return false;
    }
  }

  function crearStorage(almacen) {
    var disponible = probarAlmacen(almacen);

    function leer(clave, validador) {
      if (!disponible || typeof validador !== 'function') { return null; }
      try {
        var crudo = almacen.getItem(clave);
        if (crudo === null || crudo === undefined) { return null; }
        var parseado = JSON.parse(crudo);
        return validador(parseado);
      } catch (e) {
        // JSON roto o validador que lanza: se descarta el dato entero.
        return null;
      }
    }

    function escribir(clave, valor) {
      if (!disponible) { return false; }
      try {
        almacen.setItem(clave, JSON.stringify(valor));
        return true;
      } catch (e) {
        // Cuota llena o modo privado: no se rompe la pantalla.
        return false;
      }
    }

    function quitar(clave) {
      if (!disponible) { return false; }
      try {
        almacen.removeItem(clave);
        return true;
      } catch (e) {
        return false;
      }
    }

    return {
      disponible: disponible,
      leer: leer,
      escribir: escribir,
      quitar: quitar
    };
  }

  function nuevoId() {
    return Date.now().toString(36) + '-' +
      Math.random().toString(36).slice(2, 8);
  }

  function normalizarMonto(valor, cfg) {
    if (typeof valor === 'string') {
      return App.validators.parsearMonto(valor);
    }
    if (typeof valor !== 'number' || !isFinite(valor) ||
        Math.floor(valor) !== valor || valor <= 0) {
      return null;
    }
    var max = cfg && typeof cfg.MONTO_MAX === 'number'
      ? cfg.MONTO_MAX
      : 1000000000;
    return valor <= max ? valor : null;
  }

  function normalizarPorcentaje(valor, cfg) {
    var numero = typeof valor === 'string'
      ? parseFloat(valor.replace(',', '.'))
      : valor;
    if (typeof numero !== 'number' || !isFinite(numero)) { return null; }
    var min = cfg && typeof cfg.APORTE_PORC_MIN === 'number'
      ? cfg.APORTE_PORC_MIN
      : 1;
    var max = cfg && typeof cfg.APORTE_PORC_MAX === 'number'
      ? cfg.APORTE_PORC_MAX
      : 100;
    return numero >= min && numero <= max ? numero : null;
  }

  /* La foto se generó con canvas como JPEG. Al leer no confiamos en el
   * prefijo únicamente: también acotamos el largo para no aceptar un data URL
   * gigante que haya quedado en el almacén. */
  function esFotoDataUrl(valor, cfg) {
    if (typeof valor !== 'string' || valor === '') { return false; }
    var max = cfg && typeof cfg.FOTO_DATAURL_MAX === 'number'
      ? cfg.FOTO_DATAURL_MAX
      : 2 * 1024 * 1024;
    if (valor.length > max) { return false; }
    return /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(valor);
  }

  function sello(valor, porDefecto) {
    if (typeof valor === 'number' && isFinite(valor) && valor > 0) {
      return Math.floor(valor);
    }
    return porDefecto;
  }

  /* Reconstruye una meta campo por campo. Devuelve null si falta o es inválido
   * algo estructural; los opcionales peligrosos (link, foto) se descartan en
   * lugar de romper la lista entera. */
  function normalizarMeta(crudo, opciones) {
    var cfg = (opciones && opciones.config) || App.config || {};
    var hoy = (opciones && opciones.hoy) || App.validators.fechaHoyISO();
    var ahora = opciones && typeof opciones.ahora === 'number' ? opciones.ahora : 0;

    if (!crudo || typeof crudo !== 'object') { return null; }

    var id = typeof crudo.id === 'string' && /^[a-z0-9-]{6,64}$/.test(crudo.id)
      ? crudo.id
      : null;
    if (!id && opciones && typeof opciones.generarId === 'function') {
      id = opciones.generarId();
    }
    if (typeof id !== 'string' || !/^[a-z0-9-]{6,64}$/.test(id)) { return null; }

    var nombre = App.validators.validarNombre(crudo.nombre);
    var monto = normalizarMonto(crudo.monto, cfg);
    var moneda = cfg.MONEDAS && cfg.MONEDAS.indexOf(crudo.moneda) !== -1
      ? crudo.moneda
      : null;
    var cuenta = App.validators.validarCuenta(crudo.cuentaId, cfg.CUENTAS)
      ? crudo.cuentaId
      : null;
    var prioridad = App.validators.validarPrioridad(crudo.prioridad, cfg.PRIORIDADES)
      ? crudo.prioridad
      : null;
    var icono = App.validators.validarIcono(crudo.icono, cfg.ICONOS)
      ? crudo.icono
      : null;
    var plazo = typeof crudo.plazo === 'string' ? crudo.plazo : '';

    if (nombre === null || monto === null || !moneda || !cuenta ||
        !prioridad || !icono || !App.validators.validarPlazo(plazo, hoy)) {
      return null;
    }

    var modos = cfg.APORTE_MODOS || [];
    if (modos.indexOf(crudo.aporteModo) === -1) { return null; }
    var modo = crudo.aporteModo;
    var aporte = null;
    if (modo === 'monto_fijo') {
      aporte = normalizarMonto(crudo.aporteValor, cfg);
      if (aporte === null) { return null; }
    } else if (modo === 'porcentaje') {
      aporte = normalizarPorcentaje(crudo.aporteValor, cfg);
      if (aporte === null) { return null; }
    }

    var nota = typeof crudo.nota === 'string'
      ? App.validators.validarNota(crudo.nota)
      : '';
    if (nota === null) { nota = ''; }

    var link = typeof crudo.link === 'string'
      ? App.validators.validarLink(crudo.link)
      : '';
    if (link === null) { link = ''; }

    var creadoEn = sello(crudo.creadoEn, ahora);
    var actualizadoEn = sello(crudo.actualizadoEn, creadoEn);

    return {
      id: id,
      nombre: nombre,
      monto: monto,
      moneda: moneda,
      cuentaId: cuenta,
      plazo: plazo,
      aporteModo: modo,
      aporteValor: aporte,
      prioridad: prioridad,
      icono: icono,
      nota: nota,
      link: link,
      principal: crudo.principal === true,
      foto: esFotoDataUrl(crudo.foto, cfg) ? crudo.foto : null,
      creadoEn: creadoEn,
      actualizadoEn: actualizadoEn
    };
  }

  /* Repositorio de metas: única puerta a la lista persistida. Mantiene el
   * invariante de una sola meta principal y valida al leer y al escribir. */
  function crearRepositorioMetas(storage, config) {
    var cfg = config || App.config || {};
    var clave = cfg.CLAVE_METAS || 'metas.lista';

    function leerLista() {
      var crudo = storage && typeof storage.leer === 'function'
        ? storage.leer(clave, function (valor) {
          return Array.isArray(valor) ? valor : null;
        })
        : null;
      if (!crudo) { return []; }

      var lista = [];
      var vistos = {};
      /* Al leer se aceptan fechas ya vencidas: una meta guardada no debe
       * desaparecer solo porque llegó su plazo. Para crear se sigue exigiendo
       * una fecha futura (ver guardar). */
      var hoyLectura = cfg.FECHA_DESDE || '2026-01-01';
      /* El tope también se aplica al leer: si el almacén fue editado con
       * miles de objetos, no se normalizan ni se renderizan todos. La app
       * normal solo escribe hasta METAS_MAX; más que eso es dato hostil. */
      var topeLectura = cfg.METAS_MAX || 10;
      var limiteLectura = Math.min(crudo.length, topeLectura);
      for (var i = 0; i < limiteLectura; i++) {
        var meta = normalizarMeta(crudo[i], {
          config: cfg,
          hoy: hoyLectura
        });
        if (!meta || vistos[meta.id]) { continue; }
        vistos[meta.id] = true;
        lista.push(meta);
      }

      // Si alguien editó el almacén y dejó dos principales, gana la primera.
      var principal = false;
      for (var j = 0; j < lista.length; j++) {
        if (!lista[j].principal) { continue; }
        if (principal) { lista[j].principal = false; }
        else { principal = true; }
      }

      lista.sort(function (a, b) { return b.creadoEn - a.creadoEn; });
      return lista;
    }

    function escribirLista(lista) {
      return !!storage && typeof storage.escribir === 'function'
        ? storage.escribir(clave, lista)
        : false;
    }

    function almacenListo() {
      return !!storage && storage.disponible !== false;
    }

    function guardar(datos) {
      if (!almacenListo()) { return { ok: false, motivo: 'sin-almacen' }; }

      var meta = normalizarMeta(datos, {
        config: cfg,
        hoy: App.validators.fechaHoyISO(),
        generarId: nuevoId,
        ahora: Date.now()
      });
      if (!meta) { return { ok: false, motivo: 'invalida' }; }

      var lista = leerLista();
      var existente = null;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === meta.id) { existente = lista[i]; break; }
      }
      if (!existente && lista.length >= (cfg.METAS_MAX || 10)) {
        return { ok: false, motivo: 'tope' };
      }
      if (existente) { meta.creadoEn = existente.creadoEn; }

      var salida = [];
      var puesto = false;
      for (var j = 0; j < lista.length; j++) {
        if (lista[j].id === meta.id) {
          if (!puesto) { salida.push(meta); puesto = true; }
        } else {
          salida.push(lista[j]);
        }
      }
      if (!puesto) { salida.unshift(meta); }

      if (meta.principal) {
        for (var k = 0; k < salida.length; k++) {
          if (salida[k].id !== meta.id) { salida[k].principal = false; }
        }
      }

      if (!escribirLista(salida)) { return { ok: false, motivo: 'cuota' }; }
      return { ok: true, meta: meta };
    }

    function renombrar(id, nombre) {
      if (!almacenListo()) { return { ok: false, motivo: 'sin-almacen' }; }

      var limpio = App.validators.validarNombre(nombre);
      if (limpio === null) { return { ok: false, motivo: 'nombre' }; }

      var lista = leerLista();
      var encontrada = false;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === id) {
          lista[i].nombre = limpio;
          lista[i].actualizadoEn = Date.now();
          encontrada = true;
          break;
        }
      }
      if (!encontrada) { return { ok: false, motivo: 'no-existe' }; }
      if (!escribirLista(lista)) { return { ok: false, motivo: 'cuota' }; }
      return { ok: true };
    }

    function marcarPrincipal(id) {
      if (!almacenListo()) { return { ok: false, motivo: 'sin-almacen' }; }

      var lista = leerLista();
      var encontrada = false;
      for (var i = 0; i < lista.length; i++) {
        var esEsta = lista[i].id === id;
        if (esEsta) { encontrada = true; }
        lista[i].principal = esEsta;
      }
      if (!encontrada) { return { ok: false, motivo: 'no-existe' }; }
      if (!escribirLista(lista)) { return { ok: false, motivo: 'cuota' }; }
      return { ok: true };
    }

    function eliminar(id) {
      if (!almacenListo()) { return { ok: false, motivo: 'sin-almacen' }; }

      var lista = leerLista();
      var salida = [];
      var quitada = false;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === id) { quitada = true; }
        else { salida.push(lista[i]); }
      }
      if (!quitada) { return { ok: false, motivo: 'no-existe' }; }
      if (!escribirLista(salida)) { return { ok: false, motivo: 'cuota' }; }
      return { ok: true };
    }

    return {
      listar: leerLista,
      guardar: guardar,
      renombrar: renombrar,
      marcarPrincipal: marcarPrincipal,
      eliminar: eliminar
    };
  }

  /* El acceso a window.localStorage vive acá, no en app.js, para que el
   * chequeo de concentración de almacenamiento siga teniendo sentido. */
  function crearStorageDelNavegador() {
    var almacen = null;
    try {
      almacen = window.localStorage;
    } catch (e) {
      almacen = null;
    }
    return crearStorage(almacen);
  }

  App.storage = {
    crearStorage: crearStorage,
    crearStorageDelNavegador: crearStorageDelNavegador,
    crearRepositorioMetas: crearRepositorioMetas,
    normalizarMeta: normalizarMeta,
    esFotoDataUrl: esFotoDataUrl,
    nuevoId: nuevoId
  };
})(window.MetasApp);
