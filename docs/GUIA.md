# Mini guía — Metas de Ahorro

Una lectura de cinco minutos: para qué sirve y cómo cargar tu primera meta.

## 1. El problema que resuelve

Imaginá que querés juntar $1.000.000 en un año. Si separás siempre lo mismo,
el número final alcanza, pero **los precios no se quedan quietos**: cuando
llegue el momento, esos $1.000.000 pueden comprar menos de lo que compraban hoy.

Esta app usa el **Modelo B**: proyecta el objetivo con la inflación y calcula
una cuota inicial que va subiendo mes a mes. Así lo que ves en pantalla es el
esfuerzo real estimado, no un número optimista.

No es un banco ni transfiere plata: es una calculadora-planificadora que guarda
tus metas en el dispositivo.

## 2. Abrir la app

Abrí `index.html` con doble clic. Funciona con `file://`, sin servidor ni
instalación. En la pantalla vas a ver **Tus metas** y el botón **Nueva meta**.

## 3. Tu primera meta, paso a paso

Al tocar **Nueva meta** se abre una hoja con seis bloques, en este orden:

1. **Meta** — escribí el nombre (por ejemplo, *Cubierta nueva*), el monto
   objetivo en pesos enteros y elegí la moneda: **Pesos** o **Dólares**.
2. **Ahorro** — elegí la cuenta de ahorro y el **Aporte automático**:
   *Ninguno*, *Monto fijo* o *% de cobro*. Si elegís fijo o porcentaje aparece
   el campo para el valor.
3. **Plazo** — poné la **Fecha límite**. Es opcional, pero sin fecha no se
   puede calcular el ritmo ni se activan las dos tarjetas siguientes. Tiene que
   ser futura.
4. **Proteger tu meta de los aumentos** — activá el interruptor para ajustar
   el ritmo con la inflación mensual. La tarjeta muestra la cuota de este mes y
   la del mes que viene.
5. **Calculadora de ritmo** — probá cuánto separar por mes y mirá cuánto
   llegás a acumular. Con **Aplicar este plan a mi meta** ese monto pasa a ser
   el aporte automático *Monto fijo*.
6. **Detalles opcionales** — tocá *Ver detalles opcionales* para foto, ícono,
   prioridad, nota (hasta 200 caracteres), link de referencia y *Meta
   principal* (se destaca en el inicio y reemplaza a la anterior).

El botón **Guardar meta** queda abajo, siempre visible, y se habilita cuando
los datos son válidos. Con **Escape** cerrás la hoja; también podés navegar
solo con el teclado.

## 4. Cómo leer la tasa de inflación

La tarjeta de protección muestra de dónde salió el número:

- **Dato oficial (INDEC)**: vino de la API de datos.gob.ar o de una caché
  fresca (menos de 12 horas).
- **Dato desactualizado**: se usó una caché vieja.
- **Estimación manual**: no hubo red ni caché válida; se usa el 2,0 % de
  respaldo.

Si el último dato publicado es del mes anterior, aparece un aviso tipo
*"Todavía no publicaron la inflación de {mes}. Usamos el último dato oficial:
{mes del dato}"*. Cuando sale la publicación nueva, el aviso desaparece solo.

Podés tocar el ícono de lápiz y escribir tu propia estimación (por ejemplo
`2,5`; se acepta coma o punto, entre 0 y 50 %). La etiqueta pasa a
**Estimación manual** para que nunca se confunda con un dato oficial.
**Volver al dato oficial** restaura el último valor recibido.

Si elegís **Dólares**, la protección y la calculadora se deshabilitan con una
explicación: no hay una fuente oficial de inflación en dólares y aplicar la de
pesos daría un número engañoso.

## 5. La calculadora de ritmo

En *Si este mes separás* cargás un monto (o movés el deslizador). La app te
muestra:

- **Próximo mes**: cuánto tendrías que separar al mes siguiente si el aporte
  acompaña a la inflación.
- **En N meses** (tu plazo): el total acumulado y qué porcentaje representa del
  **objetivo proyectado**, no del precio de hoy. Es una decisión deliberada:
  el resultado puede ser menor, pero es honesto.

## 6. Guardar y convivir con tus metas

Una vez guardada, la meta aparece en **Tus metas guardadas**. Desde cada fila
podés **Renombrar**, **Marcar principal** o **Eliminar** (pide confirmación).

- El tope es **10 metas**; al intentar la número 11 aparece un aviso.
- Solo una puede ser principal.
- La foto se elige en JPEG, PNG o WebP de hasta 5 MB; se reduce a 800 px y se
  guarda como JPEG de hasta 2 MB. Las fotos grandes se comprimen solas.
- El link de referencia solo acepta `http` o `https` y se abre en pestaña nueva
  con `rel="noopener noreferrer"`.
- Todo queda en `localStorage` de este navegador. Si borrás los datos del
  navegador, las metas se van con ellos.

## 7. Ejemplo con números reales

Objetivo: $1.000.000 · tasa: 2 % mensual · plazo: 12 meses.

| Resultado | Valor |
|---|---|
| Objetivo proyectado (`M·(1+r)^n`) | $1.268.242 |
| Cuota inicial (`T / S`) | $94.560 |
| Cuota del mes siguiente | $96.451 |
| Total acumulado en 12 meses | $1.268.242 |

Estos números salen de las mismas fórmulas de `js/plan.js` que usa la app (con
redondeo a pesos enteros al mostrar). Fíjate en la idea: el objetivo pasó de
$1.000.000 a $1.268.242 y la cuota va subiendo con él.

## 8. Si algo no anda

| Situación | Qué pasa |
|---|---|
| Sin red | Se usa la cadena de respaldo y la etiqueta dice `Estimación manual`. Podés seguir usando la app. |
| Tasa `51` o negativa | Error: la estimación manual va de 0 a 50 %. Corregila para ver el resultado. |
| Fecha límite pasada | Error: elegí una fecha futura. |
| Elegiste Dólares | Protección y calculadora deshabilitadas con explicación. |
| undécima meta | Aviso de máximo: hay 10 metas como tope. |
| Metas que desaparecieron | Se borraron los datos del navegador o se cambió de navegador. |

## 9. Para no confundirse

La app **no** mueve plata, **no** guarda nada en la nube, **no** promete
rendimientos y **no** reemplaza a tu banco. Es una herramienta de
planificación: te dice cuánto conviene separar para no quedar corto, y te deja
registrar las metas en tu dispositivo.

Si querés ver cómo está hecha y por qué, leé el [README](../README.md).
