# Codédex Design Guide (Aesthetic, Typography, and Colors)

Este documento detalla la identidad visual, tipografía, paleta de colores y estilos extraídos directamente de la plataforma educativa **Codédex** (https://www.codedex.io/). Este sistema de diseño combina una estética retro de 8 bits inspirada en los juegos de rol (RPG) de los 90s con un ambiente cálido, acogedor (*cozy*) y moderno.

---

## 🎮 1. Filosofía de Diseño

La estética de Codédex se desmarca de los entornos de desarrollo tradicionales, aburridos o ultra-profesionales, adoptando una interfaz lúdica y narrativa:
- **Gamificación RPG**: Uso de barras de progreso, insignias coleccionables, globos de diálogo estilo cómic y mapas de aventuras.
- **Nostalgia Retro (NES/GameBoy)**: Tipografías pixeladas, cursores de espada/mano personalizados y bordes de grosor irregular (estilo pixel art).
- **Entorno Cozy**: Acompañado de colores pasteles cálidos que hacen que el proceso de aprendizaje sea menos intimidante y más amigable.

---

## 🎨 2. Paleta de Colores

La paleta se divide en tonos de fondo acogedores, bordes oscuros estilo 8-bit y acentos vivos para representar diferentes tecnologías, logros y estados.

### A. Tonos Cozy y Fondos (Pasteles Cálidos)
Estos colores proporcionan el fondo amigable y suave de la plataforma:
- **Warm Peach (Melocotón):** `#FFDEC4` / `#FFBB8E` (Fondo de tarjetas, perfiles y banners primarios)
- **Vanilla Cream (Crema):** `#FFE3C5` (Fondos de contenedores y secciones secundarias)
- **Vintage Parchment (Pergamino):** `#DFD3B9` (Fondo de marcos retro y terminales simuladas)
- **Canvas White (Blanco Puro):** `#FFFFFF` (Fondos interiores de tarjetas de código y bloques de lectura)

### B. Colores Retro de Contraste (8-Bit NES Colors)
Colores de alto impacto utilizados para botones, etiquetas, XP y cursos específicos:
- **HTML / Heart Red (Rojo Retro):** `#FD2B2B` o `#FF001D` (Temática HTML, botones de cancelar, iconos de corazón/vida)
- **XP / Success Lime (Verde Lima):** `#8BEB46` (Indicadores de experiencia/XP ganados, estados completados y botones de acción principal)
- **JS / Warning Yellow (Amarillo Eléctrico):** `#EBE527` (Temática JavaScript, estrellas de logros y llamadas de atención)
- **CSS / Python Orange (Naranja Cozy):** `#F59F54` o `#E98C25` (Temática Python, CSS y botones secundarios)
- **SQL / Premium Purple (Morado):** `#8005C8` (Temática SQL y áreas premium del mapa)
- **Teal / Cyan Accent (Cian):** `#5CEEE1` o `#3FC3B5` (Enlaces destacados y curso de Git/Terminal)
- **Pink Detail (Rosa):** `#FF5478` / `#D40075` (Detalles estéticos y estados alternativos)

### C. Colores de Interfaz Oscuros (Bordes y Texto)
Para emular el pixel art, se utilizan bordes gruesos y textos oscuros de alto contraste:
- **NES Charcoal (Gris Oscuro Principal):** `#212529` (Bordes principales, sombras pixeladas, iconos y texto por defecto)
- **Pure Black:** `#000000` (Sombras fuertes y bordes superpuestos)
- **Ink Gray:** `#333333` / `#444444` (Texto alternativo y estados inactivos)
- **Slate Gray (Gris Azulado):** `#3C4665` (Fondo de paneles y terminales de código oscuras)

---

## 🔤 3. Tipografía

Codédex combina fuentes pixeladas de fantasía con fuentes sans-serif modernas y redondeadas para mantener la legibilidad sin perder el estilo de consola.

### Fuertes Principales de Interfaz
1. **`Press Start 2P`**:
   - **Estilo:** Pixel-art clásico de arcade (8-bit).
   - **Uso:** Títulos principales (`h1`, `h2`), botones principales, insignias y elementos decorativos de UI.
2. **`Mulish` / `Work Sans` / `Montserrat`**:
   - **Estilo:** Sans-serif moderno, geométrico y redondeado.
   - **Uso:** Cuerpo de texto, lecciones, menús de navegación, textos largos y párrafos. Asegura que la lectura prolongada no canse la vista.

### Fuentes de Código y Datos
3. **`Noto Sans Mono` / `Hack`**:
   - **Estilo:** Monospaciado de alta legibilidad.
   - **Uso:** Editor de código en vivo, snippets de código y variables técnicas.

---

## 🖼️ 4. Estilos y Componentes Clave

La plataforma utiliza el framework **NES.css** personalizado con adaptaciones visuales propias para crear sus componentes:

### A. Bordes y Sombras Pixeladas
Los contenedores no usan `border-radius` tradicional, sino bordes con grosor simulado de 8 bits y sombras sólidas en lugar de difuminadas:
```css
.retro-container {
  border-style: solid;
  border-width: 4px;
  border-color: #212529;
  background-color: #ffffff;
  /* Sombra sólida desplazada hacia abajo y derecha */
  box-shadow: 4px 4px 0px #212529;
}
```

### B. Globos de Diálogo (Speech Balloons)
Usados para los diálogos con mascotas u orientadores dentro del juego:
- **Borde:** Generado con un borde pixelado SVG (`data:image/svg+xml`).
- **Punteros:** Triángulos pixelados hacia la izquierda o derecha en la parte inferior.

### C. Botones Retro Interactivos (`.nes-btn`)
Los botones tienen un efecto 3D simple que cambia al hacer click (simulando que se hunden):
```css
.retro-btn {
  position: relative;
  border: 4px solid #212529;
  background-color: #8BEB46; /* Verde Lima */
  color: #212529;
  font-family: 'Press Start 2P', sans-serif;
  padding: 8px 16px;
}

/* Efecto de borde inferior oscuro simulando 3D */
.retro-btn::after {
  content: "";
  position: absolute;
  top: -4px; right: -4px; bottom: -4px; left: -4px;
  box-shadow: inset -4px -4px #4AA52E; /* Verde más oscuro */
}

/* Estado activo/hundido */
.retro-btn:active::after {
  box-shadow: inset 4px 4px #4AA52E;
}
```

---

## 🖱️ 5. Cursores Personalizados

Una de las características más representativas de la interfaz de Codédex es el reemplazo del cursor por defecto por cursores pixelados.

### Cursor Principal (Espada/Puntero RPG)
Usado globalmente en todo el cuerpo (`html`):
```css
html {
  cursor: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABFklEQVRYR9WXURLDIAhE6/0PbSdOtUpcd1Gnpv1KGpTHBpCE1/cXq+vrMph7dGvXZTtpfW10DCA5jrH1H0Jhs5E0hnZdCR+vb5S8Nn8mQCeS9BdSalYJqMBjAGzq59xAESN7VFVUgV8AZB/dZBR7QTFDCqGquvUBVVoEtgIwpQRzmANSFHgWQKExHdIrPeuMvQNDarXe6nC/AutgV3JW+6bgqQLeV8FekRtgV+ToDKEKnACYKsfZjjkam7a0ZpYTytwmgainpC3HvwBocgKOxqRjehoR9DFKNFYtOwCGYCszobeCbl26N6yyQ6g8X/Wex/rBPsNEV6qAMaJPMynIHQCoSqS9JSMmwef51LflTgCRszU7DvAGiV6mHWfsaVUAAAAASUVORK5CYII=), auto;
}
```

### Cursor Hover (Mano/Guante de Selección RPG)
Usado en enlaces (`a`), botones (`button`) y elementos interactivos:
```css
a, button, .interactive {
  cursor: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAzElEQVRYR+2X0Q6AIAhF5f8/2jYXZkwEjNSVvVUjDpcrGgT7FUkI2D9xRfQETwNIiWO85wfINfQUEyxBG2ArsLwC0jioGt5zFcwF4OYDPi/mBYKm4t0U8ATgRm3ThFoAqkhNgWkA0jJLvaOVSs7j3qMnSgXWBMiWPXe94QqMBMBc1VZIvaTu5u5pQewq0EqNZvIEMCmxAawK0DNkay9QmfFNAJUXfgGgUkLaE7j/h8fnASkxHTz0DGIBMCnBeeM7AArpUd3mz2x3C7wADglA8BcWMZhZAAAAAElFTkSuQmCC) 14 0, pointer;
}

---

## 🌌 6. Estilo CyberVocational / SysTest

La pantalla de inicio utiliza una identidad visual "CyberVocational / SysTest" que complementa el estilo retro acogedor con un ambiente oscuro cyberpunk y tecnológico de ciencia ficción.

### A. Paleta de Colores de la Estación
- **Fondo de Circuitos (Ciber-Espacio):** Textura oscura de alto contraste (`bg.png`) con líneas de circuitos brillantes de color verde y azul.
- **Header Superior Oscuro:** `#131924` (Gris-azul oscuro metalizado) que aporta estructura a la pantalla.
- **Borde de Cabecera:** `#24334a` (Azul medianoche para líneas divisorias).
- **Verde Neón (Acentos/Botones/Iconos):** `#8beb46` (Lime Green) y `#00ffcc` (Cyan/Green). Se utiliza para texto, iconos pixelados y el estado por defecto del botón de inicio.
- **Tono Menta Suave (Títulos):** `#a2ecc7`. Usado en el título principal para destacar con un halo de luz o glow verde.
- **Texto Secundario/Sombra:** `#cbd5e1` (Gris slate suave) y `#0a0f1d` (Azul-negro profundo para sombras sólidas).

### B. Elementos Visuales
1. **Iconos de Matriz de Píxeles (Programáticos)**:
   - Se evitan las imágenes estáticas o emojis comunes, utilizando en su lugar matrices de píxeles dibujadas mediante código (`Phaser.GameObjects.Graphics`) con un tamaño de píxel de 4px.
   - **Ojo (Sin respuestas correctas)**: Representa la observación analítica.
   - **Rayo (Intuición pura)**: Representa el instinto cognitivo rápido.
   - **Mapa (Tu propia hoja de ruta)**: Representa la aventura vocacional individualizada.
2. **Botón [INICIAR EXPLORACIÓN]**:
   - Botón retro con esquinas ligeramente redondeadas (8px de radio).
   - Efecto hover interactivo: cambia de verde brillante (`#8beb46`) a cian eléctrico (`#00ffcc`) y el texto se escala suavemente.
   - Brackets `[...]` envolviendo el texto en la tipografía `'Press Start 2P'` para enfatizar la estética de consola interactiva.
3. **Cabecera "SysTest"**:
   - Un monitor pixel-art detallado a dos colores (bisel gris `#b2bec3`, pantalla `#0f172a` y código `#8beb46`) al lado del nombre del sistema "SysTest".
