# YouTube Custom Light

Userscript para ajustar la apariencia y algunas opciones de navegación de
YouTube. Incluye alto contraste, reducción de efectos visuales y un modo
inteligente con controles manuales. El panel de ajustes está en español.

**Versión:** 1.2.1 · **Licencia:** MIT · **Archivo único, sin dependencias externas.**

## Funciones

### Apariencia adaptable

El **Modo inteligente** está activado por defecto. Solo decide las opciones que
están en **Automático**; cualquier elección manual prevalece.

| Ajuste | Modos disponibles | Comportamiento automático |
|---|---|---|
| Contraste | Automático, Normal, Alto, Máximo | Respeta los colores forzados del sistema; usa contraste alto si el sistema lo solicita. |
| Efectos visuales | Automático, YouTube, Reducidos, Ninguno | Reduce efectos según las preferencias de accesibilidad y el modo de contraste. |
| Densidad del feed | Automática, Cómoda, Compacta | Compacta las cuadrículas amplias; prefiere una presentación cómoda en pantallas estrechas y páginas de reproducción/Shorts. |

El perfil toma en cuenta la página actual, el ancho de ventana y las preferencias
compatibles del sistema operativo. Un indicador en el panel muestra el resultado
aplicado. La reducción de movimiento del sistema también se respeta aunque el
modo inteligente esté desactivado.

Los ajustes de contraste y efectos estilizan la interfaz, no el contenido del
video. Las reglas generales excluyen el reproductor y los elementos `<video>`;
no se eliminan de forma general las imágenes de miniatura ni los degradados
funcionales de los controles del reproductor.

### Opciones de navegación

| Opción | Predeterminado | Función |
|---|---:|---|
| Pausar en pestaña inactiva | Activada | Pausa los videos que se reproducen cuando la pestaña queda oculta. |
| Destacar Suscripciones | Activada | Resalta la entrada de Suscripciones en la guía lateral. |
| Ocultar estantes de Shorts | Desactivada | Oculta las filas de Shorts; no oculta la página de Shorts. |
| Carga eficiente del feed | Desactivada | Aplica `content-visibility` a las tarjetas de cuadrícula. Es experimental. |
| Reducir todas las animaciones | Desactivada | Reduce animaciones y transiciones de la interfaz como ajuste explícito. |

También se pueden elegir colores de acento: Original, Verde, Océano, Atardecer
y Violeta.

## Instalación

1. Instalar [Tampermonkey](https://www.tampermonkey.net/) o
   [Violentmonkey](https://violentmonkey.github.io/).
2. Abrir el [userscript desde la rama `main`](https://raw.githubusercontent.com/MoriNo23/youtube-custom-light/main/youtube-custom-light.user.js)
   y aceptar la instalación que presenta el gestor.
3. Recargar YouTube. El botón de ajustes aparece en la esquina inferior derecha.

Atajos: **Alt + Shift + Y** abre o cierra el panel; **Escape** lo cierra y
regresa el foco al botón.

## Privacidad y almacenamiento

Las preferencias se guardan en el almacenamiento del gestor de userscripts con
`GM_getValue`/`GM_setValue` (clave `ycl-features-v1`). No se envían preferencias,
historial ni datos de cuenta a un servidor. El script no usa bibliotecas, CDN ni
solicitudes de red durante su ejecución.

## Desarrollo

El userscript instalable se mantiene como un archivo único en la raíz del
repositorio. No requiere compilación ni instalación de paquetes. Para ejecutar
las comprobaciones se necesita Node.js 18 o posterior:

```sh
npm run check
npm test
npm run test:mutation
npm run validate
```

`npm test` ejecuta las pruebas unitarias. `npm run test:mutation` comprueba que
las mutaciones cubiertas sean detectadas; al final también enumera las áreas de
cobertura que aún no valida.

### Estructura

```text
.
├── .editorconfig
├── .gitignore
├── LICENSE
├── README.md
├── package.json
├── youtube-custom-light.user.js
├── docs/
│   ├── DESIGN.md
│   └── showcase.html
├── tests/
│   └── youtube-custom-light.test.js
├── tools/
│   └── mutation-test.js
└── openspec/
```

La vista previa interactiva del panel está en [`docs/showcase.html`](docs/showcase.html);
para simular cambios de ruta, sírvela por HTTP desde la raíz del repositorio
(por ejemplo, `python3 -m http.server`) y abre `/docs/showcase.html`. Las notas
de arquitectura están en [`docs/DESIGN.md`](docs/DESIGN.md). Las capturas locales
de YouTube no se incluyen ni son necesarias para instalar o probar el userscript.

## Compatibilidad y límites

El script está dirigido a `youtube.com` y a gestores que implementen las API
`GM_getValue` y `GM_setValue`. Los selectores dependen del DOM y del CSS de
YouTube, que pueden cambiar sin aviso. Las pruebas unitarias cubren la lógica y
los contratos del panel; no sustituyen una comprobación visual en una sesión
activa de YouTube.

## Licencia

MIT. Consulta [`LICENSE`](LICENSE).
