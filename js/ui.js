/* MetasApp — ui.js
 * PORQUÉ: la interfaz solo dibuja y escucha eventos; no decide reglas de
 * negocio. Todo nodo se crea y se completa con texto, nunca interpretando
 * cadenas como marcado, para cerrar la puerta a la inyección de HTML.
 */

window.MetasApp = window.MetasApp || {};

(function (App) {
  'use strict';

  var NS_SVG = 'http://www.w3.org/2000/svg';

  // Trazos propios: no se descargan íconos de terceros ni se usa innerHTML.
  var TRAZOS = {
    estrella: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.2 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.2 5.9-.9z',
    laptop: 'M4 6h16v10H4zM2 18h20',
    avion: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z',
    casa: 'M3 11l9-8 9 8v10H3zM9 21v-7h6v7',
    moto: 'M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 15h6l3-5h3M10 10l-2-3H5',
    regalo: 'M3 9h18v4H3zM5 13h14v8H5zM12 9v12M12 9c-2.5 0-4-1.5-4-3a2 2 0 0 1 4 0c0 1.5 0 3 0 3zM12 9c2.5 0 4-1.5 4-3a2 2 0 0 0-4 0c0 1.5 0 3 0 3z',
    viaje: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'
  };

  var NOMBRES_ICONO = {
    estrella: 'Estrella',
    laptop: 'Laptop',
    avion: 'Avión',
    casa: 'Casa',
    moto: 'Moto',
    regalo: 'Regalo',
    viaje: 'Viaje'
  };

  var ETIQUETAS_PRIORIDAD = {
    alta: 'Prioridad alta',
    media: 'Prioridad media',
    baja: 'Prioridad baja'
  };

  var ERRORES = {
    nombre: 'error-nombre',
    monto: 'error-monto',
    moneda: 'error-moneda',
    cuenta: 'error-cuenta',
    prioridad: 'error-prioridad',
    icono: 'error-icono',
    nota: 'error-nota',
    link: 'error-link',
    plazo: 'error-plazo',
    aporte: 'error-aporte'
  };

  var CAMPOS = {
    nombre: 'nombre',
    monto: 'monto',
    moneda: 'grupo-moneda',
    cuenta: 'cuenta',
    prioridad: 'grupo-prioridad',
    icono: 'grupo-iconos',
    nota: 'nota',
    link: 'link',
    plazo: 'plazo',
    aporte: 'aporte-valor'
  };

  function $(id) {
    return document.getElementById(id);
  }

  /* Único punto de escritura de datos variables. textContent nunca interpreta
   * la cadena como marcado, así que un payload como <img ...> queda literal. */
  function escribirTexto(nodo, texto) {
    if (!nodo) { return null; }
    nodo.textContent = texto === null || texto === undefined ? '' : String(texto);
    return nodo;
  }

  function crearIcono(nombre) {
    if (typeof nombre !== 'string' ||
        !Object.prototype.hasOwnProperty.call(TRAZOS, nombre)) {
      return null;
    }

    var svg = document.createElementNS(NS_SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    var trazo = document.createElementNS(NS_SVG, 'path');
    trazo.setAttribute('d', TRAZOS[nombre]);
    trazo.setAttribute('fill', 'none');
    trazo.setAttribute('stroke', 'currentColor');
    trazo.setAttribute('stroke-width', '1.8');
    trazo.setAttribute('stroke-linecap', 'round');
    trazo.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(trazo);

    return svg;
  }

  function crearEtiquetaIcono(nombre) {
    if (typeof nombre !== 'string' ||
        !Object.prototype.hasOwnProperty.call(NOMBRES_ICONO, nombre)) {
      return '';
    }
    return NOMBRES_ICONO[nombre];
  }

  function formatearMonto(numero) {
    try {
      return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(numero);
    } catch (e) {
      return String(numero);
    }
  }

  var MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  function formatearTasa(numero) {
    if (typeof numero !== 'number' || !isFinite(numero)) { return ''; }
    try {
      return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2
      }).format(numero);
    } catch (e) {
      return String(numero).replace('.', ',');
    }
  }

  /* La tasa se escribe a mano: se acepta coma o punto y se rechaza cualquier
   * cosa fuera del rango editable de config.js. */
  function parsearTasa(texto, config) {
    if (typeof texto !== 'string') { return null; }
    var cfg = config || App.config || {};
    var limpio = texto.trim();
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(limpio)) { return null; }
    var numero = parseFloat(limpio.replace(',', '.'));
    if (!isFinite(numero)) { return null; }
    var min = typeof cfg.TASA_MIN_EDICION === 'number' ? cfg.TASA_MIN_EDICION : 0;
    var max = typeof cfg.TASA_MAX_EDICION === 'number' ? cfg.TASA_MAX_EDICION : 50;
    if (numero < min || numero > max) { return null; }
    return numero;
  }

  function mesDeFecha(fechaISO) {
    if (typeof fechaISO !== 'string') { return null; }
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaISO);
    if (!m) { return null; }
    var mes = parseInt(m[2], 10);
    if (mes < 1 || mes > 12) { return null; }
    return MESES[mes - 1] + ' de ' + m[1];
  }

  /* Grupo de radios accesible: flechas para moverse, Home/End para los
   * extremos y un solo elemento con tabindex 0 (roving tabindex). */
  function iniciarSegmentado(grupo, alCambiar) {
    if (!grupo) { return null; }
    var botones = Array.prototype.slice.call(grupo.querySelectorAll('[role="radio"]'));
    if (botones.length === 0) { return null; }

    function activo() {
      for (var i = 0; i < botones.length; i++) {
        if (botones[i].getAttribute('aria-checked') === 'true') { return botones[i]; }
      }
      return botones[0];
    }

    function buscarOpcion(nodo) {
      while (nodo && nodo !== grupo) {
        if (nodo.getAttribute && nodo.getAttribute('role') === 'radio') {
          return nodo;
        }
        nodo = nodo.parentNode;
      }
      return null;
    }

    function marcar(boton, enfocar) {
      for (var i = 0; i < botones.length; i++) {
        var esActivo = botones[i] === boton;
        botones[i].setAttribute('aria-checked', esActivo ? 'true' : 'false');
        botones[i].tabIndex = esActivo ? 0 : -1;
      }
      if (enfocar) { boton.focus(); }
      if (alCambiar) { alCambiar(boton.getAttribute('data-valor'), boton); }
    }

    function mover(paso) {
      var actual = activo();
      var indice = botones.indexOf(actual);
      var siguiente = (indice + paso + botones.length) % botones.length;
      marcar(botones[siguiente], true);
    }

    grupo.addEventListener('click', function (e) {
      var boton = buscarOpcion(e.target);
      if (!boton || botones.indexOf(boton) === -1) { return; }
      marcar(boton, true);
    });

    grupo.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault(); mover(1); return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault(); mover(-1); return;
      }
      if (e.key === 'Home') {
        e.preventDefault(); marcar(botones[0], true); return;
      }
      if (e.key === 'End') {
        e.preventDefault(); marcar(botones[botones.length - 1], true);
      }
    });

    for (var i = 0; i < botones.length; i++) {
      botones[i].tabIndex = botones[i].getAttribute('aria-checked') === 'true' ? 0 : -1;
    }

    return {
      seleccionarPorValor: function (valor) {
        for (var j = 0; j < botones.length; j++) {
          if (botones[j].getAttribute('data-valor') === valor) {
            marcar(botones[j], false);
            return;
          }
        }
      }
    };
  }

  function poblarCuentas(select) {
    if (!select) { return; }

    var vacia = document.createElement('option');
    vacia.value = '';
    vacia.textContent = 'Elegí una cuenta';
    select.appendChild(vacia);

    var cuentas = (App.config && App.config.CUENTAS) || [];
    for (var i = 0; i < cuentas.length; i++) {
      var cuenta = cuentas[i];
      if (!cuenta || typeof cuenta.id !== 'string') { continue; }
      var opcion = document.createElement('option');
      opcion.value = cuenta.id;
      opcion.textContent = cuenta.nombre + ' · ' + cuenta.moneda;
      select.appendChild(opcion);
    }
  }

  function poblarIconos(grupo, estado) {
    if (!grupo) { return; }

    var iconos = (App.config && App.config.ICONOS) || [];
    var creados = 0;

    for (var i = 0; i < iconos.length; i++) {
      var nombre = iconos[i];
      var svg = crearIcono(nombre);
      if (!svg) { continue; }

      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'icono-opcion';
      boton.setAttribute('role', 'radio');
      boton.setAttribute('data-valor', nombre);
      boton.setAttribute('aria-label', crearEtiquetaIcono(nombre) || nombre);
      boton.setAttribute('aria-checked', nombre === estado.icono ? 'true' : 'false');
      boton.appendChild(svg);
      grupo.appendChild(boton);
      creados++;
    }

    // Si la lista blanca cambió, el estado no puede quedar apuntando a un
    // ícono que ya no existe en pantalla.
    if (creados > 0 && !grupo.querySelector('[aria-checked="true"]')) {
      var primero = grupo.querySelector('[role="radio"]');
      if (primero) {
        primero.setAttribute('aria-checked', 'true');
        estado.icono = primero.getAttribute('data-valor');
      }
    }
  }

  function iniciarFormulario() {
    var hoja = $('hoja-nueva-meta');
    var fondo = $('fondo-hoja');
    var form = $('form-meta');
    var app = $('app');
    if (!hoja || !fondo || !form) { return; }

    var el = {
      nombre: $('nombre'),
      monto: $('monto'),
      cuenta: $('cuenta'),
      plazo: $('plazo'),
      nota: $('nota'),
      link: $('link'),
      aporteValor: $('aporte-valor'),
      guardar: $('guardar-meta'),
      estado: $('estado-form'),
      prefijoMonto: $('prefijo-monto'),
      ayudaCuenta: $('ayuda-cuenta'),
      notaContador: $('nota-contador'),
      grupoMoneda: $('grupo-moneda'),
      grupoAporte: $('grupo-aporte'),
      grupoPrioridad: $('grupo-prioridad'),
      grupoIconos: $('grupo-iconos'),
      aporteCampo: $('aporte-campo'),
      aporteEtiqueta: $('aporte-etiqueta'),
      aportePrefijo: $('aporte-prefijo'),
      aporteSufijo: $('aporte-sufijo'),
      principal: $('principal'),
      abrir: $('abrir-hoja'),
      cerrar: $('cerrar-hoja'),
      tarjetaProteccion: $('tarjeta-proteccion'),
      switchProteccion: $('switch-proteccion'),
      proteccionContenido: $('proteccion-contenido'),
      ayudaProteccion: $('ayuda-proteccion'),
      tasaMensual: $('tasa-mensual'),
      editarTasa: $('editar-tasa'),
      origenTasa: $('origen-tasa'),
      restaurarTasa: $('restaurar-tasa'),
      avisoTasa: $('aviso-tasa'),
      errorTasa: $('error-tasa'),
      cajaProteccion: $('caja-proteccion'),
      textoProteccion: $('texto-proteccion'),
      cuotaInicial: $('proteccion-cuota-inicial'),
      cuotaSiguiente: $('proteccion-cuota-siguiente'),
      aumentoProteccion: $('proteccion-aumento'),
      tarjetaCalculadora: $('tarjeta-calculadora'),
      calculadoraContenido: $('calculadora-contenido'),
      ayudaCalculadora: $('ayuda-calculadora'),
      aporteCalculado: $('aporte-calculado'),
      sliderAporte: $('slider-aporte'),
      errorAporteCalculado: $('error-aporte-calculado'),
      calculadoraProximo: $('calculadora-proximo'),
      calculadoraDiferencia: $('calculadora-diferencia'),
      calculadoraPlazo: $('calculadora-plazo'),
      calculadoraTotal: $('calculadora-total'),
      calculadoraPorcentaje: $('calculadora-porcentaje'),
      tasaCalculadora: $('tasa-calculadora'),
      aplicarPlan: $('aplicar-plan'),
      confirmacionCalculadora: $('confirmacion-calculadora'),
      verDetalles: $('ver-detalles'),
      detallesContenido: $('detalles-contenido'),
      listaMetas: $('tarjeta-metas'),
      metasLista: $('metas-lista'),
      metasContador: $('metas-contador'),
      metasError: $('metas-error'),
      estadoMetas: $('estado-metas'),
      estadoVacio: $('estado-vacio')
    };

    if (!el.nombre || !el.monto || !el.cuenta || !el.guardar ||
        !el.grupoMoneda || !el.grupoAporte || !el.grupoPrioridad ||
        !el.grupoIconos || !el.aporteValor) {
      return;
    }

    var estado = {
      moneda: 'ARS',
      aporteModo: 'ninguno',
      prioridad: 'media',
      icono: 'estrella',
      principal: false,
      foto: null,
      proteccion: true,
      tasa: null,
      tasaManual: false,
      tasaValida: true,
      tasaTocada: false,
      datoInflacion: null,
      aporteCalc: null
    };
    var tocado = {};

    function datos() {
      return {
        nombre: el.nombre.value,
        monto: el.monto.value,
        moneda: estado.moneda,
        cuentaId: el.cuenta.value,
        plazo: el.plazo ? el.plazo.value : '',
        aporteModo: estado.aporteModo,
        aporteValor: el.aporteValor.value,
        prioridad: estado.prioridad,
        icono: estado.icono,
        nota: el.nota ? el.nota.value : '',
        link: el.link ? el.link.value : '',
        principal: estado.principal
      };
    }

    /* Convierte lo que se ve en el formulario al objeto que se persiste. La
     * validación de forma la vuelve a hacer storage.js antes de escribir. */
    function construirMeta() {
      var nota = App.validators.validarNota(el.nota ? el.nota.value : '');
      var link = App.validators.validarLink(el.link ? el.link.value : '');
      var aporte = null;

      if (estado.aporteModo === 'monto_fijo') {
        aporte = App.validators.parsearMonto(el.aporteValor.value);
      } else if (estado.aporteModo === 'porcentaje') {
        var numero = parseFloat(String(el.aporteValor.value).replace(',', '.'));
        aporte = isFinite(numero) ? numero : null;
      }

      return {
        nombre: el.nombre.value,
        monto: montoActual(),
        moneda: estado.moneda,
        cuentaId: el.cuenta.value,
        plazo: plazoActual(),
        aporteModo: estado.aporteModo,
        aporteValor: aporte,
        prioridad: estado.prioridad,
        icono: estado.icono,
        nota: nota === null ? '' : nota,
        link: link === null ? '' : link,
        principal: estado.principal,
        foto: estado.foto
      };
    }

    /* Después de guardar, la hoja tiene que quedar como recién abierta: si
     * conservara los datos, la próxima meta arrancaría con los de la anterior. */
    function reiniciarFormulario() {
      el.nombre.value = '';
      el.monto.value = '';
      if (el.nota) { el.nota.value = ''; }
      if (el.link) { el.link.value = ''; }
      if (el.plazo) { el.plazo.value = ''; }
      el.cuenta.value = '';
      el.aporteValor.value = '';

      estado.moneda = 'ARS';
      estado.aporteModo = 'ninguno';
      estado.prioridad = 'media';
      estado.icono = 'estrella';
      estado.principal = false;
      estado.foto = null;
      estado.proteccion = true;
      estado.aporteCalc = null;
      estado.tasa = null;
      estado.tasaManual = false;
      estado.tasaTocada = false;
      estado.tasaValida = true;

      if (segmentoMoneda) { segmentoMoneda.seleccionarPorValor('ARS'); }
      if (segmentoAporte) { segmentoAporte.seleccionarPorValor('ninguno'); }
      if (segmentoPrioridad) {
        segmentoPrioridad.seleccionarPorValor('media');
      }
      if (segmentoIconos) { segmentoIconos.seleccionarPorValor('estrella'); }

      if (el.principal) {
        el.principal.setAttribute('aria-checked', 'false');
      }

      var preview = $('foto-preview');
      var imagen = $('foto-img');
      var textoFoto = $('foto-zona-texto');
      var errorFoto = $('error-foto');
      var archivoFoto = $('archivo-foto');
      if (archivoFoto) { archivoFoto.value = ''; }
      if (preview) { preview.hidden = true; }
      if (imagen) { imagen.removeAttribute('src'); }
      if (textoFoto) { escribirTexto(textoFoto, 'Elegir foto'); }
      if (errorFoto) {
        errorFoto.hidden = true;
        escribirTexto(errorFoto, '');
      }

      tocado = {};
      actualizarAporte();

      // Si había un dato oficial cargado, se restaura; si no, se deja la
      // tarjeta en su estado de consulta en vez de conservar una tasa vieja.
      if (estado.datoInflacion) {
        aplicarDatoInflacion(estado.datoInflacion);
      } else {
        actualizar();
      }
    }

    function limpiarEstado() {
      escribirTexto(el.estado, '');
    }

    function actualizarContador() {
      if (!el.nota || !el.notaContador) { return; }
      var max = (App.config && App.config.NOTA_MAX) || 200;
      escribirTexto(el.notaContador, el.nota.value.length + ' / ' + max);
    }

    function actualizarAyudaCuenta() {
      if (!el.ayudaCuenta) { return; }
      el.ayudaCuenta.hidden = !!el.cuenta.value;
    }

    function actualizarPrefijo() {
      if (el.prefijoMonto) {
        escribirTexto(el.prefijoMonto, estado.moneda === 'USD' ? 'US$' : '$');
      }
      var adornado = el.monto.parentNode;
      if (adornado && adornado.classList) {
        adornado.classList.toggle('campo-adornado--ancho', estado.moneda === 'USD');
      }
    }

    function actualizarAporte() {
      if (!el.aporteCampo || !el.aporteValor) { return; }

      var visible = estado.aporteModo !== 'ninguno';
      el.aporteCampo.hidden = !visible;
      if (!visible) { el.aporteValor.value = ''; }

      var esPorcentaje = estado.aporteModo === 'porcentaje';
      if (el.aporteEtiqueta) {
        escribirTexto(el.aporteEtiqueta, esPorcentaje ? 'Porcentaje del cobro' : 'Monto mensual');
      }
      if (el.aportePrefijo) { el.aportePrefijo.hidden = esPorcentaje; }
      if (el.aporteSufijo) { el.aporteSufijo.hidden = !esPorcentaje; }
      el.aporteValor.placeholder = esPorcentaje ? 'Ej: 10' : 'Ej: 50.000';
      el.aporteValor.setAttribute('inputmode', esPorcentaje ? 'decimal' : 'numeric');

      var adornado = el.aporteValor.parentNode;
      if (adornado && adornado.classList) {
        adornado.classList.toggle('campo-adornado--con-sufijo', esPorcentaje);
      }
    }

    function montoActual() {
      return App.validators.parsearMonto(el.monto.value);
    }

    function plazoActual() {
      return el.plazo && el.plazo.value ? el.plazo.value : '';
    }

    function tasaActual() {
      if (!estado.tasaValida) { return null; }
      return typeof estado.tasa === 'number' && isFinite(estado.tasa)
        ? estado.tasa
        : null;
    }

    function simboloMoneda() {
      return estado.moneda === 'USD' ? 'US$' : '$';
    }

    function dinero(valor) {
      if (typeof valor !== 'number' || !isFinite(valor)) { return '—'; }
      return simboloMoneda() + ' ' + formatearMonto(App.plan.redondearPeso(valor));
    }

    var repositorio = null;

    function obtenerRepositorio() {
      if (repositorio) { return repositorio; }
      if (!App.storage ||
          typeof App.storage.crearStorageDelNavegador !== 'function' ||
          typeof App.storage.crearRepositorioMetas !== 'function') {
        return null;
      }
      try {
        var almacen = App.storage.crearStorageDelNavegador();
        if (!almacen || almacen.disponible === false) { return null; }
        repositorio = App.storage.crearRepositorioMetas(almacen);
      } catch (e) {
        repositorio = null;
      }
      return repositorio;
    }

    function nombreCuenta(id) {
      var cuentas = (App.config && App.config.CUENTAS) || [];
      for (var i = 0; i < cuentas.length; i++) {
        if (cuentas[i] && cuentas[i].id === id) { return cuentas[i].nombre; }
      }
      return '';
    }

    function dineroMeta(meta) {
      return (meta.moneda === 'USD' ? 'US$ ' : '$ ') + formatearMonto(meta.monto);
    }

    function crearBotonAccion(texto, accion, etiqueta) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'boton-secundario meta__accion';
      boton.setAttribute('data-accion', accion);
      boton.textContent = texto;
      if (etiqueta) { boton.setAttribute('aria-label', etiqueta); }
      return boton;
    }

    function crearTarjetaMeta(meta) {
      var item = document.createElement('li');
      item.className = 'meta';
      item.setAttribute('data-id', meta.id);

      if (meta.foto) {
        var foto = document.createElement('img');
        foto.className = 'meta__foto';
        foto.alt = 'Foto de ' + meta.nombre;
        foto.src = meta.foto;
        item.appendChild(foto);
      }

      var cabecera = document.createElement('div');
      cabecera.className = 'meta__cabecera';

      var icono = crearIcono(meta.icono);
      if (icono) {
        var cajaIcono = document.createElement('span');
        cajaIcono.className = 'meta__icono';
        cajaIcono.setAttribute('aria-hidden', 'true');
        cajaIcono.appendChild(icono);
        cabecera.appendChild(cajaIcono);
      }

      var textos = document.createElement('div');
      textos.className = 'meta__textos';
      var nombre = document.createElement('h4');
      nombre.className = 'meta__nombre';
      escribirTexto(nombre, meta.nombre);
      var monto = document.createElement('p');
      monto.className = 'meta__monto';
      escribirTexto(monto, dineroMeta(meta));
      textos.appendChild(nombre);
      textos.appendChild(monto);
      cabecera.appendChild(textos);

      if (meta.principal) {
        var sello = document.createElement('span');
        sello.className = 'meta__principal';
        escribirTexto(sello, 'Principal');
        cabecera.appendChild(sello);
      }
      item.appendChild(cabecera);

      var detalle = document.createElement('p');
      detalle.className = 'meta__detalle';
      var partes = [];
      var cuenta = nombreCuenta(meta.cuentaId);
      if (cuenta) { partes.push(cuenta); }
      var prioridad = Object.prototype.hasOwnProperty.call(
        ETIQUETAS_PRIORIDAD, meta.prioridad
      ) ? ETIQUETAS_PRIORIDAD[meta.prioridad] : '';
      if (prioridad) { partes.push(prioridad); }
      var mes = meta.plazo ? mesDeFecha(meta.plazo) : null;
      partes.push(mes ? 'Hasta ' + mes : 'Sin fecha límite');
      escribirTexto(detalle, partes.join(' · '));
      item.appendChild(detalle);

      if (meta.nota) {
        var nota = document.createElement('p');
        nota.className = 'meta__nota';
        escribirTexto(nota, meta.nota);
        item.appendChild(nota);
      }

      if (meta.link) {
        var enlace = document.createElement('a');
        enlace.className = 'meta__link';
        enlace.href = meta.link;
        enlace.target = '_blank';
        enlace.rel = 'noopener noreferrer';
        escribirTexto(enlace, 'Ver referencia');
        item.appendChild(enlace);
      }

      var acciones = document.createElement('div');
      acciones.className = 'meta__acciones';
      acciones.appendChild(crearBotonAccion(
        'Renombrar', 'renombrar', 'Renombrar ' + meta.nombre
      ));
      if (!meta.principal) {
        acciones.appendChild(crearBotonAccion(
          'Marcar principal', 'principal',
          'Marcar ' + meta.nombre + ' como principal'
        ));
      }
      acciones.appendChild(crearBotonAccion(
        'Eliminar', 'eliminar', 'Eliminar ' + meta.nombre
      ));
      item.appendChild(acciones);

      var panel = document.createElement('div');
      panel.className = 'meta__renombrar';
      panel.hidden = true;

      var inputId = 'renombrar-' + meta.id;
      var etiqueta = document.createElement('label');
      etiqueta.className = 'sr-only';
      etiqueta.setAttribute('for', inputId);
      escribirTexto(etiqueta, 'Nuevo nombre');

      var input = document.createElement('input');
      input.type = 'text';
      input.id = inputId;
      input.className = 'meta__renombrar-input';
      input.maxLength = (App.config && App.config.NOMBRE_MAX) || 60;
      input.autocomplete = 'off';
      input.value = meta.nombre;

      var error = document.createElement('p');
      error.className = 'error';
      error.setAttribute('role', 'alert');
      error.hidden = true;

      var fila = document.createElement('div');
      fila.className = 'meta__renombrar-fila';
      fila.appendChild(input);
      fila.appendChild(crearBotonAccion('Guardar nombre', 'guardar-nombre'));
      fila.appendChild(crearBotonAccion('Cancelar', 'cancelar-renombrar'));

      panel.appendChild(etiqueta);
      panel.appendChild(fila);
      panel.appendChild(error);
      item.appendChild(panel);

      return item;
    }

    function mostrarErrorMetas(mensaje) {
      if (!el.metasError) { return; }
      escribirTexto(el.metasError, mensaje || '');
      el.metasError.hidden = !mensaje;
    }

    function renderMetas() {
      if (!el.listaMetas || !el.metasLista || !el.estadoVacio) { return; }

      var repo = obtenerRepositorio();
      var metas = repo ? repo.listar() : [];
      el.metasLista.textContent = '';
      for (var i = 0; i < metas.length; i++) {
        el.metasLista.appendChild(crearTarjetaMeta(metas[i]));
      }

      el.listaMetas.hidden = metas.length === 0;
      el.estadoVacio.hidden = metas.length > 0;
      escribirTexto(
        el.metasContador,
        metas.length === 1 ? '1 meta' : metas.length + ' metas'
      );
      mostrarErrorMetas('');
    }

    function manejarLista(e) {
      var boton = e.target && e.target.closest
        ? e.target.closest('button[data-accion]')
        : null;
      if (!boton) { return; }

      var item = boton.closest('li[data-id]');
      if (!item) { return; }

      var id = item.getAttribute('data-id');
      var accion = boton.getAttribute('data-accion');
      var repo = obtenerRepositorio();
      if (!repo) {
        mostrarErrorMetas('No pudimos acceder al almacenamiento del navegador.');
        return;
      }

      if (accion === 'renombrar') {
        var panel = item.querySelector('.meta__renombrar');
        var input = item.querySelector('.meta__renombrar-input');
        if (!panel || !input) { return; }
        panel.hidden = false;
        input.focus();
        input.select();
        return;
      }

      if (accion === 'cancelar-renombrar') {
        var panelCancelar = item.querySelector('.meta__renombrar');
        if (panelCancelar) { panelCancelar.hidden = true; }
        return;
      }

      if (accion === 'guardar-nombre') {
        var inputGuardar = item.querySelector('.meta__renombrar-input');
        var errorGuardar = item.querySelector('.meta__renombrar .error');
        if (!inputGuardar) { return; }

        var resultado = repo.renombrar(id, inputGuardar.value);
        if (resultado.ok) {
          renderMetas();
          return;
        }
        if (errorGuardar) {
          var maxNombre = (App.config && App.config.NOMBRE_MAX) || 60;
          var mensaje = 'Poné un nombre de 1 a ' + maxNombre + ' caracteres.';
          if (resultado.motivo === 'cuota') {
            mensaje = 'No pudimos guardar: el almacenamiento está lleno.';
          } else if (resultado.motivo === 'sin-almacen') {
            mensaje = 'No pudimos acceder al almacenamiento del navegador.';
          }
          escribirTexto(errorGuardar, mensaje);
          errorGuardar.hidden = false;
        }
        return;
      }

      if (accion === 'principal') {
        var resultadoPrincipal = repo.marcarPrincipal(id);
        if (!resultadoPrincipal.ok) {
          mostrarErrorMetas('No pudimos marcar la meta principal.');
          return;
        }
        renderMetas();
        return;
      }

      if (accion === 'eliminar') {
        var nombreNodo = item.querySelector('.meta__nombre');
        var nombre = nombreNodo ? nombreNodo.textContent : 'esta meta';
        if (!window.confirm('¿Eliminar «' + nombre + '»?')) { return; }

        var resultadoEliminar = repo.eliminar(id);
        if (!resultadoEliminar.ok) {
          mostrarErrorMetas('No pudimos eliminar la meta.');
          return;
        }
        renderMetas();
      }
    }

    function manejarListaTeclado(e) {
      if (!e.target || !e.target.classList ||
          !e.target.classList.contains('meta__renombrar-input')) {
        return;
      }
      var item = e.target.closest('li[data-id]');
      if (!item) { return; }

      if (e.key === 'Escape') {
        e.preventDefault();
        var panel = item.querySelector('.meta__renombrar');
        if (panel) { panel.hidden = true; }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        var guardarBoton = item.querySelector('button[data-accion="guardar-nombre"]');
        if (guardarBoton) { guardarBoton.click(); }
      }
    }

    function mostrarErrorTasa(mensaje) {
      if (!el.errorTasa) { return; }
      escribirTexto(el.errorTasa, mensaje || '');
      el.errorTasa.hidden = !mensaje;
      if (!el.tasaMensual) { return; }
      if (mensaje) { el.tasaMensual.setAttribute('aria-invalid', 'true'); }
      else { el.tasaMensual.removeAttribute('aria-invalid'); }
    }

    function mostrarErrorAporteCalc(mensaje) {
      if (!el.errorAporteCalculado) { return; }
      escribirTexto(el.errorAporteCalculado, mensaje || '');
      el.errorAporteCalculado.hidden = !mensaje;
      if (!el.aporteCalculado) { return; }
      if (mensaje) { el.aporteCalculado.setAttribute('aria-invalid', 'true'); }
      else { el.aporteCalculado.removeAttribute('aria-invalid'); }
    }

    function etiquetaDato(dato) {
      if (!dato) { return 'No pudimos obtener el dato oficial.'; }
      var partes = [];
      if (dato.etiqueta) { partes.push(dato.etiqueta); }
      if (dato.origen !== 'respaldo') {
        var mes = mesDeFecha(dato.fecha);
        if (mes) { partes.push(mes); }
      }
      if (dato.vencido &&
          (!dato.etiqueta || dato.etiqueta.indexOf('desactualizado') === -1)) {
        partes.push('dato vencido');
      }
      return partes.join(' · ') + '.';
    }

    /* El aviso es siempre visible: si el mes del último dato no es el mes
     * actual, se dice explícitamente que todavía falta la publicación. */
    function avisoMesPendiente(dato) {
      if (!dato || dato.origen === 'respaldo' || estado.tasaManual) { return ''; }
      var hoy = App.validators.fechaHoyISO();
      if (typeof dato.fecha !== 'string' || dato.fecha.slice(0, 7) >= hoy.slice(0, 7)) {
        return '';
      }
      var mesDato = mesDeFecha(dato.fecha);
      var mesHoy = mesDeFecha(hoy);
      if (!mesDato || !mesHoy) { return ''; }
      if (dato.vencido) {
        return 'El último dato disponible es de ' + mesDato +
          ' y está vencido. Revisá la etiqueta de origen.';
      }
      return 'Todavía no publicaron la inflación de ' + mesHoy +
        '. Usamos el último dato oficial: ' + mesDato + '.';
    }

    function aplicarDatoInflacion(dato) {
      estado.datoInflacion = dato || null;

      if (estado.tasaManual) {
        if (el.restaurarTasa) { el.restaurarTasa.hidden = !dato; }
        return;
      }

      estado.tasaManual = false;
      estado.tasaTocada = false;
      estado.tasaValida = true;
      estado.aporteCalc = null;

      if (dato && typeof dato.mensual === 'number' && isFinite(dato.mensual)) {
        estado.tasa = dato.mensual;
        if (el.tasaMensual) {
          el.tasaMensual.value = formatearTasa(dato.mensual);
        }
        escribirTexto(el.origenTasa, etiquetaDato(dato));
        var aviso = avisoMesPendiente(dato);
        escribirTexto(el.avisoTasa, aviso);
        if (el.avisoTasa) { el.avisoTasa.hidden = !aviso; }
      } else {
        estado.tasa = null;
        estado.tasaValida = false;
        escribirTexto(el.origenTasa, 'No pudimos obtener el dato oficial.');
        if (el.avisoTasa) { el.avisoTasa.hidden = true; }
      }

      if (el.restaurarTasa) { el.restaurarTasa.hidden = true; }
      mostrarErrorTasa('');
      actualizar();
    }

    function validarTasaManual(mostrarError) {
      estado.tasaManual = true;
      estado.aporteCalc = null;
      var numero = el.tasaMensual ? parsearTasa(el.tasaMensual.value) : null;

      /* Aunque el valor sea inválido, ya no es el dato oficial: la etiqueta
       * tiene que decirlo para no atribuirle a INDEC un número que no publicó. */
      escribirTexto(el.origenTasa, 'Estimación manual.');
      if (el.avisoTasa) { el.avisoTasa.hidden = true; }

      if (numero !== null) {
        estado.tasa = numero;
        estado.tasaValida = true;
        mostrarErrorTasa('');
      } else {
        estado.tasa = null;
        estado.tasaValida = false;
        if (mostrarError && estado.tasaTocada) {
          var min = (App.config && App.config.TASA_MIN_EDICION) || 0;
          var max = (App.config && App.config.TASA_MAX_EDICION) || 50;
          mostrarErrorTasa('Ingresá una estimación entre ' + min + ' % y ' + max + ' %.');
        }
      }

      if (el.restaurarTasa) {
        el.restaurarTasa.hidden = !estado.datoInflacion;
      }
      actualizarProteccion();
      actualizarCalculadora();
    }

    function calcularProteccion(monto, plazo, tasa) {
      var n = App.plan.mesesParaPlan(App.validators.fechaHoyISO(), plazo);
      var r = tasa / 100;
      var cuota = App.plan.redondearPeso(App.plan.cuotaInicial(monto, r, n));
      /* El mes siguiente se calcula sobre la cuota que se muestra, para que la
       * persona no vea dos totales distintos por un peso de redondeo. */
      var siguiente = App.plan.cuotaEn(cuota, r, 1);

      if (!isFinite(cuota) || !isFinite(siguiente)) {
        if (el.cajaProteccion) { el.cajaProteccion.hidden = true; }
        return;
      }

      var nombre = App.validators.validarNombre(el.nombre.value);
      var referencia = nombre ? '«' + nombre + '»' : 'tu meta';
      escribirTexto(
        el.textoProteccion,
        'Para llegar a ' + referencia + ' (' + dinero(monto) + ') en ' +
          n + (n === 1 ? ' mes:' : ' meses:')
      );
      escribirTexto(el.cuotaInicial, dinero(cuota));
      escribirTexto(el.cuotaSiguiente, dinero(siguiente));
      escribirTexto(
        el.aumentoProteccion,
        tasa === 0 ? '(sin ajuste)' : '(+' + formatearTasa(tasa) + ' %)'
      );
      if (el.cajaProteccion) { el.cajaProteccion.hidden = false; }
    }

    function actualizarProteccion() {
      if (!el.tarjetaProteccion || !el.switchProteccion) { return; }

      var esUSD = estado.moneda === 'USD';
      var monto = montoActual();
      var plazo = plazoActual();
      var tasa = tasaActual();
      var puedeEditar = !esUSD && !!plazo && monto !== null;
      var disponible = puedeEditar && tasa !== null;
      var mensaje = '';

      if (esUSD) {
        mensaje = 'En dólares no hay una fuente oficial de inflación en pesos. La protección queda desactivada.';
      } else if (!plazo) {
        mensaje = 'Elegí una fecha para calcular.';
      } else if (monto === null) {
        mensaje = 'Ingresá un monto válido para ver la estimación.';
      }

      el.switchProteccion.disabled = !disponible;
      el.switchProteccion.setAttribute(
        'aria-checked',
        disponible && estado.proteccion ? 'true' : 'false'
      );
      el.tarjetaProteccion.setAttribute('aria-disabled', puedeEditar ? 'false' : 'true');
      if (el.tarjetaProteccion.classList) {
        el.tarjetaProteccion.classList.toggle('tarjeta--pendiente', !puedeEditar);
      }

      /* La tasa se deja visible mientras haya monto y plazo, aunque el valor
       * sea inválido: si se ocultara, la persona no podría corregirlo. */
      if (el.proteccionContenido) {
        el.proteccionContenido.hidden = !puedeEditar;
      }
      if (el.cajaProteccion) {
        el.cajaProteccion.hidden = !(disponible && estado.proteccion);
      }

      if (!puedeEditar) {
        escribirTexto(el.ayudaProteccion, mensaje);
        if (el.ayudaProteccion) { el.ayudaProteccion.hidden = false; }
        return;
      }

      if (tasa === null) {
        if (estado.tasaManual) {
          mensaje = 'Revisá la estimación mensual.';
        } else if (estado.tasaValida) {
          mensaje = 'Consultando el último dato oficial…';
        } else {
          mensaje = 'No pudimos obtener el dato oficial.';
        }
        escribirTexto(el.ayudaProteccion, mensaje);
        if (el.ayudaProteccion) { el.ayudaProteccion.hidden = false; }
        return;
      }

      if (!estado.proteccion) {
        escribirTexto(
          el.ayudaProteccion,
          'La protección está desactivada. Activala para ajustar el ritmo.'
        );
        if (el.ayudaProteccion) { el.ayudaProteccion.hidden = false; }
        return;
      }

      if (el.ayudaProteccion) {
        escribirTexto(el.ayudaProteccion, '');
        el.ayudaProteccion.hidden = true;
      }
      calcularProteccion(monto, plazo, tasa);
    }

    function parsearAporteCalc(texto) {
      if (typeof texto !== 'string') { return null; }
      if (texto.trim() === '0') { return 0; }
      return App.validators.parsearMonto(texto);
    }

    function refrescarResultados() {
      var monto = montoActual();
      var plazo = plazoActual();
      var tasa = tasaActual();

      if (monto === null || !plazo || tasa === null ||
          tipoNumero(estado.aporteCalc) === null) {
        escribirTexto(el.calculadoraProximo, '—');
        escribirTexto(el.calculadoraDiferencia, '—');
        escribirTexto(el.calculadoraTotal, '—');
        escribirTexto(el.calculadoraPorcentaje, '—');
        if (el.aplicarPlan) { el.aplicarPlan.disabled = true; }
        return;
      }

      var n = App.plan.mesesParaPlan(App.validators.fechaHoyISO(), plazo);
      var r = tasa / 100;
      var aporte = estado.aporteCalc;
      var proximo = aporte * (1 + r);
      var diferencia = proximo - aporte;
      var total = App.plan.totalAcumulado(aporte, r, n);
      var objetivo = App.plan.objetivoProyectado(monto, r, n);
      var pct = objetivo > 0 ? (total / objetivo) * 100 : 0;
      var tope = (App.config && App.config.MONTO_MAX) || 1000000000;

      escribirTexto(el.calculadoraProximo, dinero(proximo));
      escribirTexto(
        el.calculadoraDiferencia,
        diferencia > 0 ? '+' + dinero(diferencia) + ' este mes' : 'Sin aumento'
      );
      escribirTexto(
        el.calculadoraPlazo,
        'En ' + n + (n === 1 ? ' mes' : ' meses') + ' llegás a'
      );
      escribirTexto(el.calculadoraTotal, dinero(total));
      var nombre = App.validators.validarNombre(el.nombre.value);
      escribirTexto(
        el.calculadoraPorcentaje,
        String(Math.round(pct * 10) / 10).replace('.', ',') + ' %' +
          (nombre ? ' de «' + nombre + '»' : '') + ' (objetivo proyectado)'
      );
      escribirTexto(
        el.tasaCalculadora,
        tasa === 0
          ? 'Sin ajuste mensual: la tasa es 0 %.'
          : 'Con un ajuste del ' + formatearTasa(tasa) + ' % mensual (estimado).'
      );

      if (!el.aplicarPlan) { return; }
      if (aporte < 1) {
        el.aplicarPlan.disabled = true;
        escribirTexto(el.confirmacionCalculadora, 'Elegí un monto mayor a cero para aplicar el plan.');
      } else if (aporte > tope) {
        el.aplicarPlan.disabled = true;
        escribirTexto(el.confirmacionCalculadora, 'El monto supera el tope permitido para el aporte.');
      } else {
        el.aplicarPlan.disabled = false;
        escribirTexto(el.confirmacionCalculadora, '');
      }
    }

    /* Un monto válido del formulario es un entero positivo; el 0 se permite
     * solo como escenario de la calculadora (no como aporte a aplicar). */
    function tipoNumero(valor) {
      if (typeof valor !== 'number' || !isFinite(valor) || valor < 0) {
        return null;
      }
      if (Math.floor(valor) !== valor) { return null; }
      return valor;
    }

    function actualizarCalculadora() {
      if (!el.tarjetaCalculadora || !el.calculadoraContenido) { return; }

      var esUSD = estado.moneda === 'USD';
      var monto = montoActual();
      var plazo = plazoActual();
      var tasa = tasaActual();
      var disponible = !esUSD && !!plazo && monto !== null && tasa !== null;
      var mensaje = '';

      if (esUSD) {
        mensaje = 'La calculadora en dólares necesita una tasa de inflación en dólares, que todavía no tenemos.';
      } else if (!plazo) {
        mensaje = 'Se activa cuando definas el plazo.';
      } else if (monto === null) {
        mensaje = 'Ingresá un monto válido para calcular.';
      } else if (tasa === null) {
        if (estado.tasaManual) {
          mensaje = 'Revisá la estimación mensual para calcular.';
        } else if (estado.tasaValida) {
          mensaje = 'Consultando el último dato oficial…';
        } else {
          mensaje = 'No pudimos obtener el dato oficial.';
        }
      }

      el.tarjetaCalculadora.setAttribute('aria-disabled', disponible ? 'false' : 'true');
      if (el.tarjetaCalculadora.classList) {
        el.tarjetaCalculadora.classList.toggle('tarjeta--pendiente', !disponible);
      }
      el.calculadoraContenido.hidden = !disponible;
      escribirTexto(el.ayudaCalculadora, disponible ? '' : mensaje);
      if (el.ayudaCalculadora) { el.ayudaCalculadora.hidden = disponible; }

      if (!disponible) {
        escribirTexto(el.confirmacionCalculadora, '');
        return;
      }

      var n = App.plan.mesesParaPlan(App.validators.fechaHoyISO(), plazo);
      var cuota = App.plan.cuotaInicial(monto, tasa / 100, n);
      var base = App.plan.redondearPeso(cuota);
      if (!isFinite(base) || base < 1) {
        escribirTexto(el.ayudaCalculadora, 'No pudimos calcular la cuota inicial.');
        if (el.ayudaCalculadora) { el.ayudaCalculadora.hidden = false; }
        el.calculadoraContenido.hidden = true;
        return;
      }

      if (estado.aporteCalc === null) {
        estado.aporteCalc = base;
        mostrarErrorAporteCalc('');
      }

      var tope = (App.config && App.config.MONTO_MAX) || 1000000000;
      /* Si la persona ya eligió un monto más alto, el rango se estira para no
       * bajarle el aporte en silencio cuando cambia otro campo del formulario. */
      var maximo = Math.min(
        tope,
        Math.max(base * 2, base + 10000, 1000, estado.aporteCalc || 0)
      );
      if (estado.aporteCalc > maximo) { estado.aporteCalc = maximo; }

      if (el.sliderAporte) {
        el.sliderAporte.min = '0';
        el.sliderAporte.max = String(maximo);
        /* Paso de 1 peso para que el slider y el input muestren el mismo
         * número desde el primer render; el rango se recorre igual. */
        el.sliderAporte.step = '1';
        el.sliderAporte.value = String(estado.aporteCalc);
      }
      if (el.aporteCalculado &&
          document.activeElement !== el.aporteCalculado) {
        el.aporteCalculado.value = formatearMonto(estado.aporteCalc);
      }
      refrescarResultados();
    }

    function mostrarErrores(resultado, todos) {
      for (var clave in ERRORES) {
        if (!Object.prototype.hasOwnProperty.call(ERRORES, clave)) { continue; }
        var nodo = $(ERRORES[clave]);
        if (!nodo) { continue; }

        var mensaje = resultado.errores[clave];
        var visible = !!mensaje && (todos || tocado[clave]);
        escribirTexto(nodo, visible ? mensaje : '');
        nodo.hidden = !visible;

        var campo = $(CAMPOS[clave]);
        if (campo) {
          if (visible) { campo.setAttribute('aria-invalid', 'true'); }
          else { campo.removeAttribute('aria-invalid'); }
        }
      }
    }

    function actualizar() {
      var resultado = App.validators.validateGoal(datos());
      actualizarContador();
      actualizarAyudaCuenta();
      actualizarPrefijo();
      mostrarErrores(resultado, false);
      el.guardar.disabled = !resultado.valido;
      actualizarProteccion();
      actualizarCalculadora();
      return resultado;
    }

    function marcarTocado(clave) {
      tocado[clave] = true;
      actualizar();
    }

    function enfocarPrimerError(resultado) {
      var orden = ['nombre', 'monto', 'moneda', 'cuenta', 'prioridad',
        'icono', 'nota', 'link', 'plazo', 'aporte'];
      for (var i = 0; i < orden.length; i++) {
        if (resultado.errores[orden[i]]) {
          var campo = $(CAMPOS[orden[i]]);
          if (campo && typeof campo.focus === 'function') {
            campo.focus();
            return;
          }
        }
      }
    }

    function abrirHoja(enfocar) {
      escribirTexto(el.estado, '');
      hoja.hidden = false;
      fondo.hidden = false;
      document.body.classList.add('hoja-abierta');
      if (app) { app.setAttribute('inert', ''); }
      if (enfocar) { hoja.focus(); }
    }

    function cerrarHoja() {
      hoja.hidden = true;
      fondo.hidden = true;
      document.body.classList.remove('hoja-abierta');
      if (app) { app.removeAttribute('inert'); }
      if (el.abrir) { el.abrir.focus(); }
    }

    function obtenerFocales(contenedor) {
      var nodos = contenedor.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
        'textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      var salida = [];
      for (var i = 0; i < nodos.length; i++) {
        if (nodos[i].getClientRects().length > 0) { salida.push(nodos[i]); }
      }
      return salida;
    }

    /* Plegar los detalles acorta la hoja sin quitar campos ni cambiar la
     * validación. Si se cierra con el foco adentro, lo devolvemos al botón
     * para que la navegación con teclado no salte a un lugar invisible. */
    function iniciarDetalles() {
      if (!el.verDetalles || !el.detallesContenido) { return; }

      el.verDetalles.addEventListener('click', function () {
        var abierto = el.verDetalles.getAttribute('aria-expanded') === 'true';
        var abrir = !abierto;
        el.verDetalles.setAttribute('aria-expanded', abrir ? 'true' : 'false');
        el.detallesContenido.hidden = !abrir;
        escribirTexto(
          el.verDetalles,
          abrir ? 'Ocultar detalles opcionales' : 'Ver detalles opcionales'
        );
        if (!abrir && el.detallesContenido.contains(document.activeElement)) {
          el.verDetalles.focus();
        }
      });
    }

    function iniciarFoto() {
      if (!App.photo) { return; }

      var boton = $('elegir-foto');
      var input = $('archivo-foto');
      var preview = $('foto-preview');
      var imagen = $('foto-img');
      var quitar = $('quitar-foto');
      var texto = $('foto-zona-texto');
      var error = $('error-foto');
      if (!boton || !input || !preview || !imagen || !quitar || !texto || !error) {
        return;
      }

      var procesando = false;

      function mostrarError(mensaje) {
        escribirTexto(error, mensaje || '');
        error.hidden = !mensaje;
        if (mensaje) { boton.setAttribute('aria-invalid', 'true'); }
        else { boton.removeAttribute('aria-invalid'); }
      }

      boton.addEventListener('click', function () {
        if (procesando) { return; }
        input.click();
      });

      input.addEventListener('change', function () {
        var archivo = input.files && input.files[0];
        if (!archivo) { return; }

        procesando = true;
        boton.setAttribute('aria-busy', 'true');
        escribirTexto(texto, 'Preparando foto…');
        mostrarError('');

        App.photo.validarFoto(archivo).then(function (r) {
          if (!r.ok) { throw new Error(r.mensaje || 'No pudimos validar la foto.'); }
          return App.photo.crearMiniatura(archivo);
        }).then(function (dataUrl) {
          estado.foto = dataUrl;
          imagen.src = dataUrl;
          preview.hidden = false;
          escribirTexto(texto, 'Cambiar foto');
          mostrarError('');
          limpiarEstado();
        }, function (e) {
          estado.foto = null;
          imagen.removeAttribute('src');
          preview.hidden = true;
          escribirTexto(texto, 'Elegir foto');
          mostrarError(e && e.message ? e.message : 'No pudimos preparar la foto. Probá con otra.');
        }).then(function () {
          procesando = false;
          boton.removeAttribute('aria-busy');
          input.value = '';
        });
      });

      quitar.addEventListener('click', function () {
        estado.foto = null;
        imagen.removeAttribute('src');
        preview.hidden = true;
        escribirTexto(texto, 'Elegir foto');
        mostrarError('');
        input.value = '';
        limpiarEstado();
      });
    }

    poblarCuentas(el.cuenta);
    poblarIconos(el.grupoIconos, estado);

    var segmentoMoneda = iniciarSegmentado(el.grupoMoneda, function (valor) {
      estado.moneda = valor;
      estado.aporteCalc = null;
      limpiarEstado();
      marcarTocado('moneda');
    });

    var segmentoAporte = iniciarSegmentado(el.grupoAporte, function (valor) {
      if (estado.aporteModo !== valor) { el.aporteValor.value = ''; }
      estado.aporteModo = valor;
      actualizarAporte();
      limpiarEstado();
      marcarTocado('aporte');
    });

    var segmentoPrioridad = iniciarSegmentado(el.grupoPrioridad, function (valor) {
      estado.prioridad = valor;
      limpiarEstado();
      marcarTocado('prioridad');
    });

    var segmentoIconos = iniciarSegmentado(el.grupoIconos, function (valor) {
      estado.icono = valor;
      limpiarEstado();
      marcarTocado('icono');
    });

    actualizarAporte();
    if (el.plazo) { el.plazo.min = App.validators.fechaHoyISO(); }

    el.nombre.addEventListener('input', function () {
      limpiarEstado();
      actualizar();
    });
    el.nombre.addEventListener('blur', function () {
      marcarTocado('nombre');
    });

    el.monto.addEventListener('input', function () {
      estado.aporteCalc = null;
      limpiarEstado();
      actualizar();
    });
    el.monto.addEventListener('blur', function () {
      var numero = App.validators.parsearMonto(el.monto.value);
      if (numero !== null) { el.monto.value = formatearMonto(numero); }
      marcarTocado('monto');
    });

    el.cuenta.addEventListener('change', function () {
      limpiarEstado();
      marcarTocado('cuenta');
    });

    if (el.plazo) {
      el.plazo.addEventListener('change', function () {
        estado.aporteCalc = null;
        limpiarEstado();
        marcarTocado('plazo');
      });
    }

    if (el.nota) {
      el.nota.addEventListener('input', function () {
        actualizarContador();
        limpiarEstado();
        actualizar();
      });
      el.nota.addEventListener('blur', function () {
        marcarTocado('nota');
      });
    }

    if (el.link) {
      el.link.addEventListener('input', function () {
        limpiarEstado();
        actualizar();
      });
      el.link.addEventListener('blur', function () {
        marcarTocado('link');
      });
    }

    el.aporteValor.addEventListener('input', function () {
      limpiarEstado();
      actualizar();
    });
    el.aporteValor.addEventListener('blur', function () {
      marcarTocado('aporte');
    });

    if (el.principal) {
      el.principal.addEventListener('click', function () {
        estado.principal = !estado.principal;
        el.principal.setAttribute('aria-checked', estado.principal ? 'true' : 'false');
        limpiarEstado();
      });
    }

    function iniciarInflacion() {
      if (!App.inflation ||
          typeof App.inflation.crearServicioInflacion !== 'function' ||
          !el.tasaMensual) {
        return;
      }
      try {
        var servicio = App.inflation.crearServicioInflacion();
        servicio.obtenerTasa().then(aplicarDatoInflacion, function () {
          aplicarDatoInflacion(null);
        });
      } catch (e) {
        /* Si el servicio no se puede construir, la pantalla sigue viva con la
         * estimación manual en vez de romperse al abrir el formulario. */
        aplicarDatoInflacion(null);
      }
    }

    if (el.switchProteccion) {
      el.switchProteccion.addEventListener('click', function () {
        if (el.switchProteccion.disabled) { return; }
        estado.proteccion = !estado.proteccion;
        actualizarProteccion();
      });
    }

    if (el.editarTasa) {
      el.editarTasa.addEventListener('click', function () {
        if (!el.tasaMensual) { return; }
        el.tasaMensual.focus();
        el.tasaMensual.select();
      });
    }

    if (el.tasaMensual) {
      el.tasaMensual.addEventListener('input', function () {
        estado.tasaTocada = true;
        validarTasaManual(false);
      });
      el.tasaMensual.addEventListener('blur', function () {
        estado.tasaTocada = true;
        var numero = parsearTasa(el.tasaMensual.value);
        if (numero !== null) {
          el.tasaMensual.value = formatearTasa(numero);
        }
        validarTasaManual(true);
      });
    }

    if (el.restaurarTasa) {
      el.restaurarTasa.addEventListener('click', function () {
        if (!estado.datoInflacion) { return; }
        estado.tasaManual = false;
        estado.tasaTocada = false;
        aplicarDatoInflacion(estado.datoInflacion);
      });
    }

    if (el.aporteCalculado) {
      el.aporteCalculado.addEventListener('input', function () {
        var valor = parsearAporteCalc(el.aporteCalculado.value);
        if (valor === null) {
          estado.aporteCalc = null;
          mostrarErrorAporteCalc('Ingresá un monto entero, sin centavos.');
          refrescarResultados();
          return;
        }
        estado.aporteCalc = valor;
        mostrarErrorAporteCalc('');
        if (el.sliderAporte) {
          var maximo = parseFloat(el.sliderAporte.max);
          if (isFinite(maximo) && valor > maximo) {
            var tope = (App.config && App.config.MONTO_MAX) || 1000000000;
            el.sliderAporte.max = String(Math.min(tope, valor));
          }
          el.sliderAporte.value = String(valor);
        }
        refrescarResultados();
      });
      el.aporteCalculado.addEventListener('blur', function () {
        var valor = parsearAporteCalc(el.aporteCalculado.value);
        if (valor !== null) {
          el.aporteCalculado.value = formatearMonto(valor);
          estado.aporteCalc = valor;
          refrescarResultados();
        }
      });
    }

    if (el.sliderAporte) {
      el.sliderAporte.addEventListener('input', function () {
        var valor = parseInt(el.sliderAporte.value, 10);
        if (!isFinite(valor) || valor < 0) { return; }
        estado.aporteCalc = valor;
        mostrarErrorAporteCalc('');
        if (el.aporteCalculado) {
          el.aporteCalculado.value = formatearMonto(valor);
        }
        refrescarResultados();
      });
    }

    if (el.aplicarPlan) {
      el.aplicarPlan.addEventListener('click', function () {
        var aporte = estado.aporteCalc;
        if (typeof aporte !== 'number' || !isFinite(aporte) || aporte < 1) {
          return;
        }
        estado.aporteModo = 'monto_fijo';
        if (segmentoAporte) { segmentoAporte.seleccionarPorValor('monto_fijo'); }
        el.aporteValor.value = formatearMonto(aporte);
        actualizarAporte();
        marcarTocado('aporte');
        escribirTexto(
          el.confirmacionCalculadora,
          'Listo: el aporte automático quedó en ' + dinero(aporte) +
            '. Se guarda en la Fase 5.'
        );
      });
    }

    if (el.metasLista) {
      el.metasLista.addEventListener('click', manejarLista);
      el.metasLista.addEventListener('keydown', manejarListaTeclado);
    }

    iniciarDetalles();
    iniciarFoto();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var resultado = actualizar();
      for (var clave in ERRORES) {
        if (Object.prototype.hasOwnProperty.call(ERRORES, clave)) {
          tocado[clave] = true;
        }
      }
      mostrarErrores(resultado, true);

      if (!resultado.valido) {
        escribirTexto(el.estado, 'Revisá los campos marcados.');
        enfocarPrimerError(resultado);
        return;
      }

      var repo = obtenerRepositorio();
      if (!repo) {
        escribirTexto(el.estado, 'No pudimos acceder al almacenamiento del navegador.');
        return;
      }

      var guardado = repo.guardar(construirMeta());
      if (!guardado.ok) {
        var mensaje = 'No pudimos guardar la meta. Revisá los datos.';
        if (guardado.motivo === 'cuota') {
          mensaje = 'No pudimos guardar: el almacenamiento está lleno. ' +
            'Probá quitar la foto o eliminar una meta.';
        } else if (guardado.motivo === 'tope') {
          mensaje = 'Llegaste al máximo de metas guardadas.';
        } else if (guardado.motivo === 'sin-almacen') {
          mensaje = 'No pudimos acceder al almacenamiento del navegador.';
        }
        escribirTexto(el.estado, mensaje);
        return;
      }

      reiniciarFormulario();
      escribirTexto(el.estadoMetas, 'Meta guardada.');
      renderMetas();
      cerrarHoja();
    });

    if (el.cerrar) { el.cerrar.addEventListener('click', cerrarHoja); }
    if (el.abrir) {
      el.abrir.addEventListener('click', function () { abrirHoja(true); });
    }
    fondo.addEventListener('click', cerrarHoja);

    hoja.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cerrarHoja();
        return;
      }
      if (e.key !== 'Tab') { return; }

      var focales = obtenerFocales(hoja);
      if (focales.length === 0) { e.preventDefault(); return; }

      var primero = focales[0];
      var ultimo = focales[focales.length - 1];

      if (e.shiftKey && (document.activeElement === primero || document.activeElement === hoja)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    });

    renderMetas();
    actualizar();
    iniciarInflacion();

    /* Primera vez: se abre la hoja para crear la meta. Si ya hay metas
     * guardadas, se muestra la lista y la hoja espera al botón "Nueva meta". */
    if (el.listaMetas && el.listaMetas.hidden) { abrirHoja(true); }
  }

  App.ui = {
    escribirTexto: escribirTexto,
    crearIcono: crearIcono,
    crearEtiquetaIcono: crearEtiquetaIcono,
    formatearTasa: formatearTasa,
    parsearTasa: parsearTasa,
    mesDeFecha: mesDeFecha,
    iniciarFormulario: iniciarFormulario
  };
})(window.MetasApp);
