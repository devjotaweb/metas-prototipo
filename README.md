# Metas de Ahorro

Prototipo web móvil-first de la pantalla **Nueva meta** de una app de ahorro
argentina, con un diferencial: **el objetivo también sube con la inflación**
(Modelo B). Si todos los meses separás el mismo monto, los aumentos se te
escapan; acá la cuota sugerida se ajusta mes a mes para que llegues de verdad.

Corre en el navegador: abrís `index.html` con doble clic y listo. Sin servidor,
sin Node, sin dependencias y sin telemetría. Las metas y la foto quedan en tu
dispositivo.

## ¿Para qué sirve?

- Para decidir **cuánto separar por mes** para un objetivo con fecha límite.
- Para no subestimar el esfuerzo en un país inflacionario: el monto objetivo se
  proyecta con la tasa mensual y las cuotas crecen con ella.
- Para ver el ritmo ajustado mes a mes con la **inflación oficial (INDEC)** y,
  si no hay dato, una estimación aclarada como tal.
- Para guardar varias metas en el teléfono, elegir una principal y seguirlas
  desde la pantalla de inicio.

## ¿Qué incluye?

- Formulario de meta: nombre, monto, moneda (pesos o dólares), cuenta de ahorro,
  aporte automático y fecha límite opcional.
- **Protección contra aumentos**: usa el IPC Nacional publicado por INDEC vía
  datos.gob.ar; podés editar la estimación y volver al dato oficial.
- **Calculadora de ritmo**: probás un aporte y comparás el total acumulado
  contra el objetivo proyectado; con *Aplicar este plan* pasás ese monto al
  aporte automático.
- Detalles opcionales plegados: foto, ícono, prioridad, nota, link y meta
  principal.
- Guardado real en `localStorage`: crear, renombrar, eliminar y marcar una como
  principal. Tope de 10 metas; foto JPEG de hasta 2 MB ya procesada.
- Cadena de respaldo ante fallos de red: caché fresca → red → caché vencida →
  estimación manual de 2,0 %, siempre con una etiqueta que dice de dónde salió
  el dato.

## Mini guía

¿Es la primera vez que lo abrís? Leé [docs/GUIA.md](docs/GUIA.md): explica para
qué sirve, cómo cargar tu primera meta en cinco minutos y cómo interpretar los
números que muestra.

## Cómo abrirlo

1. Descargá o cloná el repositorio.
2. Abrí `index.html` con doble clic (funciona con `file://`).
3. No hace falta servidor, Node ni instalar nada.

## Cómo verificarlo

1. Abrí `tests/tests.html` con doble clic.
2. Copiá el bloque `<pre id="resumen">` (el título de la pestaña también
   muestra el resultado).
3. La suite quedó en `PASS 96/96` al 2026-11-18.

Si aparece un `FAIL`, se corrige el código y se vuelve a correr; nunca se
debilita ni se salta el chequeo.

## Estado del proyecto

Prototipo completo y sin backend, con 96 pruebas automatizadas que cubren la
lógica financiera, la API, el almacenamiento, la foto, el formulario y los casos
de abuso. Pendientes conocidos, fuera del alcance actual: calculadora en
dólares con fuente propia y edición completa de una meta ya guardada.

## Estructura

```
index.html · css/styles.css
js/config.js · validators.js · plan.js · storage.js
   inflation.js · photo.js · ui.js · app.js
tests/tests.html · runner.js · *.test.js
docs/GUIA.md
```

## Seguridad

- CSP estricta por `<meta>`, sin `unsafe-inline` ni `unsafe-eval`.
- Render con nodos y `textContent`: ningún dato se interpreta como HTML.
- Red solo en `js/inflation.js`; almacenamiento solo en `js/storage.js`.
- Listas blancas para cuentas, íconos, prioridades y URLs; las URLs aceptadas
  son solo `http(s)` y se abren con `rel="noopener noreferrer"`.
- Validación al escribir, antes de guardar y otra vez al leer. La API y el
  `localStorage` se tratan como datos no confiables.
- Tope de 10 metas, tanto al crear como al leer.

## Limitaciones conocidas

- El almacenamiento local es editable desde DevTools; no hay integridad
  criptográfica.
- Las metas y la foto viven en `localStorage`: si borras los datos del
  navegador, se pierden. La cuota puede llenarse y la app lo avisa.
- No hay autenticación ni backend.
- La CSP por `<meta>` no cubre `frame-ancestors`.
- `file://` tiene un origen especial: la API respondió bien en la sonda CORS,
  pero el respaldo sigue siendo obligatorio por si cambia el navegador, la red
  o el servidor.
- Sin fuente oficial de inflación en dólares, la protección y la calculadora se
  deshabilitan en USD con una explicación.

## Subirlo a GitHub

El repositorio todavía no tiene historial. Esos comandos los ejecutás vos (no
los corre el agente, porque incluyen operaciones de red):

```
git init
git add .
git commit -m "Metas de Ahorro: prototipo web sin dependencias"
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

Reemplazá `TU_USUARIO/TU_REPO` por tus datos. Si la rama se llama `master`,
usala en el último comando.

## Fuente de datos

API de Series de Tiempo de datos.gob.ar, serie del IPC Nacional (nivel
general), publicada por INDEC. La serie es un índice: la tasa mensual se
calcula con las dos últimas observaciones publicadas. Arranca en enero de 2026
y sigue creciendo: los años nuevos se incorporan a medida que el organismo los
publica. Un dato fechado en el futuro se descarta.

- Documentación: https://datosgobar.github.io/series-tiempo-ar-api/
- Licencia de los datos: Creative Commons Attribution 4.0.
- Crédito: INDEC, vía datos.gob.ar.

Los textos están en español rioplatense, con voseo.
