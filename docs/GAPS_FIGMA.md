# GAPS — Figma (página «Gaps · v1»)

Archivo Figma `hK6ZmxpUjxlz7NT3fxoFVd`, página **Gaps · v1** (id `233:308`). Cada GAP del PLAN §9 es una *Section* con una cuadrícula de 4 columnas: iOS claro, iOS oscuro, Android claro, Android oscuro. Las variantes oscuras son clones de las claras con los modos Dark de las colecciones de variables (iOS: `Colors` de iOS + `MiVueltica`; Android: `MiVueltica` + `M3 Theme · MiVueltica`).

Reutiliza: variables (`MiVueltica`, M3, iOS Colors), estilos de texto (iOS Inter→SF Pro, Ruta Clara), y componentes de Foundations (iconos, Badge, Map Base/Pin/Cluster/User Location, iOS Status Bar, Tab Bar, Home Indicator, logo). Controles como filas, switches, chips, segmented, sheets, diálogos, toasts, banners y botones se construyen con auto-layout enlazado a variables (no hay componentes publicados para ellos todavía).

Nombres: `iOS · G01a …`, `iOS · Dark · G01a …`, `Android · G01a …`, `Android · Dark · G01a …`.

| GAP | Section | Pantalla | iOS claro | iOS oscuro | Android claro | Android oscuro |
|---|---|---|---|---|---|---|
| G01 | `236:1234` | G01a Ubicación denegada (banner + Abrir ajustes + provincia) | `236:1242` | `236:1396` | `236:1427` | `236:1602` |
| G01 | `236:1234` | G01b Selector de provincia | `236:1656` | `236:1841` | `236:1902` | `236:2079` |
| G02 | `236:2148` | G02a Gate Guardar | `236:2156` | `236:2312` | `236:2343` | `236:2503` |
| G02 | `236:2148` | G02b Textos del gate por acción (Guardar/Aportar/Reseña/Moderar) | `236:2555` | `236:2609` | `236:2650` | `236:2698` |
| G02 | `236:2148` | G02c Correo electrónico | `236:2732` | `236:2767` | `236:2786` | `236:2823` |
| G02 | `236:2148` | G02d Correo con error | `236:2843` | `236:2882` | `236:2902` | `236:2943` |
| G02 | `236:2148` | G02e Sesión iniciada | `236:2964` | `236:2995` | `236:3011` | `236:3044` |
| G03 | `236:3060` | G03a Perfil sin sesión | `236:3068` | `236:3148` | `236:3181` | `236:3265` |
| G03 | `236:3060` | G03b Guardados sin sesión | `236:3317` | `236:3376` | `236:3392` | `236:3459` |
| G03 | `236:3060` | G03c Aportar sin sesión | `236:3498` | `236:3559` | `236:3575` | `236:3644` |
| G04 | `239:2426` | G04a Selector de categoría | `239:2434` | `239:2529` | `239:2592` | `239:2700` |
| G04 | `239:2426` | G04b Selector de ubicación (mapa) | `239:2761` | `239:2849` | `239:2870` | `239:2960` |
| G04 | `239:2426` | G04c Selector de fecha | `239:2982` | `239:3176` | `239:3349` | `239:3542` |
| G04 | `239:2426` | G04d Selector de hora | `239:3713` | `239:3796` | `239:3860` | `239:3932` |
| G04 | `239:2426` | G04e Horario del lugar | `239:3984` | `239:4071` | `239:4139` | `239:4218` |
| G04 | `239:2426` | G04f Validación / error de precio > ₡5.000 | `239:4277` | `239:4340` | `239:4375` | `239:4442` |
| G04 | `239:2426` | G04g Fotos agregar y quitar | `239:4480` | `239:4544` | `239:4577` | `239:4645` |
| G04 | `239:2426` | G04h Fotos límite alcanzado (5) | `239:4681` | `239:4764` | `239:4805` | `239:4888` |
| G04 | `239:2426` | G04i Confirmar descartar | `239:4931` | `239:4999` | `239:5049` | `239:5122` |
| G05 | `239:5172` | G05a Mis vuelticas (lista con estados) | `239:5180` | `239:5288` | `239:5339` | `239:5451` |
| G05 | `239:5172` | G05b Acciones editar/retirar | `239:5504` | `239:5651` | `239:5729` | `239:5875` |
| G05 | `239:5172` | G05c Confirmar retirar | `239:5950` | `239:6067` | `239:6127` | `239:6247` |
| G05 | `239:5172` | G05d Editar vueltica en revisión | `239:6308` | `239:6381` | `239:6421` | `239:6498` |
| G06 | `241:4456` | G06a Lugar con horario | `241:4464` | `241:4549` | `241:4598` | `241:4695` |
| G06 | `241:4456` | G06b Pendiente de revisión | `241:4741` | `241:4827` | `241:4878` | `241:4962` |
| G06 | `241:4456` | G06c Oculta por reportes | `241:5010` | `241:5094` | `241:5143` | `241:5225` |
| G06 | `241:4456` | G06d Rechazada | `241:5271` | `241:5351` | `241:5399` | `241:5477` |
| G06 | `241:4456` | G06e Galería de fotos | `241:5522` | `241:5573` | `241:5595` | `241:5650` |
| G06 | `241:4456` | G06f Cargando (skeleton) | `241:5675` | `241:5710` | `241:5732` | `241:5769` |
| G06 | `241:4456` | G06g Guardar sin sesión | `241:5792` | `241:5901` | `241:5964` | `241:6072` |
| G07 | `241:6132` | G07a Catálogo de toasts (7) | `241:6140` | `241:6205` | `241:6245` | `241:6293` |
| G07 | `241:6132` | G07b Toast en contexto | `241:6327` | `241:6450` | `241:6488` | `241:6617` |
| G08 | `242:5778` | G08a Error genérico + Reintentar | `242:5786` | `242:5845` | `242:5859` | `242:5940` |
| G08 | `242:5778` | G08b Error en línea con Reintentar | `242:5977` | `242:6081` | `242:6112` | `242:6224` |
| G09 | `242:6277` | G09a Guardados vacío | `242:6285` | `242:6342` | `242:6356` | `242:6421` |
| G09 | `242:6277` | G09b Reseñas vacío | `242:6458` | `242:6488` | `242:6504` | `242:6536` |
| G09 | `242:6277` | G09c Moderación vacío | `242:6553` | `242:6613` | `242:6630` | `242:6700` |
| G09 | `242:6277` | G09d Mis vuelticas vacío | `242:6741` | `242:6773` | `242:6789` | `242:6823` |
| G09 | `242:6277` | G09e Búsqueda antes de escribir | `242:6840` | `242:6908` | `242:6955` | `242:7021` |
| G10 | `242:7064` | G10a Moderación bloqueada (< Nivel 3) | `242:7072` | `242:7151` | `242:7186` | `242:7269` |
| G10 | `242:7064` | G10b Detalle de ítem a moderar | `242:7323` | `242:7412` | `242:7463` | `242:7550` |
| G11 | `242:8210` | G11a Precio máximo | `242:8218` | `242:8327` | `242:8416` | `242:8512` |
| G11 | `242:8210` | G11b App para cómo llegar | `242:8587` | `242:8700` | `242:8793` | `242:8891` |
| G11 | `242:8210` | G11c Cambiar recordatorio | `242:8968` | `242:9081` | `242:9174` | `242:9272` |
| G11 | `242:8210` | G11d Confirmar eliminar cuenta | `242:9349` | `242:9440` | `242:9514` | `242:9596` |
| G11 | `242:8210` | G11e Descargar datos (resultado) | `242:9660` | `242:9770` | `242:9855` | `242:9956` |
| G11 | `242:8210` | G11f Confirmar cerrar sesión | `242:10031` | `242:10122` | `242:10196` | `242:10278` |
| G11 | `242:8210` | G11g Pre-aviso permiso de notificaciones | `242:10342` | `242:10436` | `242:10470` | `242:10571` |
| G12 | `242:10626` | G12a Filtros completo (CUÁNDO / ACCESIBILIDAD) | `242:10634` | `242:10707` | `242:10766` | `242:10853` |
| G12 | `242:10626` | G12b Elegir fechas (rango, iOS y Android) | `242:10920` | `242:11140` | `242:11342` | `242:11575` |
| G13 | `243:7872` | G13a Tocar un clúster | `243:7880` | `243:8089` | `243:8149` | `243:8380` |
| G13 | `243:7872` | G13b Pin seleccionado con Detalle abierto | `243:8463` | `243:8607` | `243:8654` | `243:8802` |
| G13 | `243:7872` | G13c Buscar en esta zona | `243:8852` | `243:9000` | `243:9035` | `243:9192` |
| G13 | `243:7872` | G13d Mapa sin conexión | `243:9251` | `243:9396` | `243:9422` | `243:9572` |
| G14 | `243:9619` | G14 Cómo llegar sin app de mapas | `243:9627` | `243:9692` | `243:9731` | `243:9799` |
| G15 | `244:9808` | G15a Splash | `244:9816` | `244:9842` | `244:9849` | `244:9892` |
| G15 | `244:9808` | G15b Ícono de la app (iOS / Android adaptive + monochrome) | `244:9901` | `244:9929` | `244:9939` | `244:9981` |
| G16 | `244:9997` | G16a Texto al máximo (200%) | `244:10005` | `244:10105` | `244:10135` | `244:10245` |
| G16 | `244:9997` | G16b Botones más grandes | `244:10299` | `244:10371` | `244:10407` | `244:10479` |
| G16 | `244:9997` | G16c Aumentar contraste | `244:10514` | `244:10624` | `244:10661` | `244:10779` |
| G18 | `245:10647` | G18a Enlace compartido (landing) | `245:10655` | `245:10713` | `245:10734` | `245:10809` |
| G18 | `245:10647` | G18b Enlace no disponible | `245:10832` | `245:10865` | `245:10881` | `245:10916` |
| G19 | `245:10932` | G19 Verificar como Nivel 1 | `245:10940` | `245:11027` | `245:11077` | `245:11163` |
| G20 | `245:11210` | G20a Motivo del rechazo | `245:11218` | `245:11315` | `245:11376` | `245:11466` |
| G20 | `245:11210` | G20b Voto en contra de la mayoría | `245:11519` | `245:11593` | `245:11623` | `245:11708` |
| G21 | `245:11759` | G21 Chip de costo "Gratis" | `245:11767` | `245:11874` | `245:11911` | `245:12028` |

Otros nodos: G17 (decisión tablet/horizontal/web, solo texto) Section `245:10642`; T0 tokens oscuros Section `246:11576`.

## Cobertura por ítem de PLAN §9

1 G01 · 2 G02 · 3 G03 · 4 G04 · 5 G05 · 6 G06 · 7 G07 · 8 G08 · 9 G09 · 10 G10 · 11 G11 · 12 G12 · 13 G13 · 14 G14 · 15 G15 · 16 G16 · 17 G17 (decisión) · 18 G18 · 19 G19 · 20 G20 · 21 G21.

## Tokens oscuros (PLAN §2 «?»)

Los valores ya existían en la colección `MiVueltica` (modo Dark `26:0`); no se modificó ninguna variable. Quedan documentados en la Section `246:11576` («T0 · Tokens oscuros»):

- audience/senior `#ffd24d`, audience/senior-container `#3a2e00`
- status/stale `#ffd24d` sobre status/stale-container `#3a2e00`
- price/container `#1e2533`, price/on-container `#f4f6fa`
- neutral/surface-variant `#1e2533`
- category/place-container `#0b2f1c` (derivado de audience/free-container)
- Aviso: neutral/surface oscuro en Figma es `#0f1522` (el PLAN indicaba `#0b1220`, que es on-surface claro); tokens.ts debe usar `#0f1522`.

## Lo que no se pudo hacer / limitaciones

- Los controles nuevos (sheets, diálogos, toasts, banners, chips, filas, switches, campos, calendario, picker de hora) no son componentes de Figma: son frames con auto-layout y variables. Convertirlos en componentes queda pendiente.
- Los componentes de Foundations de iOS (Tab Bar, Status Bar, Home Indicator) y de mapa se usan como instancias; el Tab Bar se actualizó con la pestaña seleccionada correcta por pantalla. En Android la barra de navegación es propia (no hay componente).
- El ícono monocromo de Android (G15b) es una aproximación: el logo 43:244 es una pieza con fondo propio, por lo que la silueta real debe exportarse aparte (glifo sin fondo).
- El logo (G15a) no cambia de variante en modo oscuro; se mantiene el logo azul sobre fondo oscuro.
- Selectores nativos (calendario, hora) se dibujaron como aproximaciones de iOS 26 / Material 3, no como los controles del sistema.
- G17 (tablet/horizontal/web) es solo una decisión documentada: solo teléfono en vertical.
- Las 5 preguntas abiertas de §8 no se rediseñaron; se usaron los placeholders del PLAN (niveles 0/50/120/200/400, 5/3 votos, 72 h, etc.).
- El prototipo (páginas 54:464 / 54:8785) no se tocó ni se cablearon interacciones para estas pantallas.
- Los textos de pantalla usan Ruta Clara (Atkinson Hyperlegible) en contenido y Inter (iOS) / Roboto (Android) en cromo, igual que las pantallas existentes; el estilo de texto se aplicó cuando existe estilo local.
