# AstroPath 🚀🌌
### Odisea Vocacional Estelar

> **AstroPath** es un videojuego RPG de exploración en 2D (*top-down*) diseñado para evaluar y orientar la vocación profesional en las principales áreas de las **Tecnologías de la Información (TI)**. Ambientado en una nave espacial de exploración interestelar, los jugadores asumen el rol de un cadete novato que asiste a los líderes de departamento resolviendo dilemas cotidianos mediante deducción, empatía, análisis y minijuegos prácticos sin jerga técnica excluyente.

---

## 🧭 Visión y Propósito

El objetivo principal de **AstroPath** es desmitificar el mundo de la tecnología para estudiantes de educación media, preuniversitarios o personas en búsqueda de orientación profesional. 

A través de analogías del mundo real dentro de una nave espacial (automatizar robots de servicio, reparar enlaces de comunicación por radio, calibrar sensores de invernadero o mediar conflictos de convivencia), el juego mide de manera orgánica e intuitiva la afinidad hacia **5 grandes ramas tecnológicas**:

1. **Desarrollo de Software:** Pensamiento lógico, estructuración paso a paso y automatización de procesos.
2. **Redes e Infraestructura:** Enrutamiento de datos, canales de comunicación y estabilidad de flujos.
3. **Ciberseguridad:** Protección de accesos, detección de intrusiones, confidencialidad y reglas de blindaje.
4. **Ciencia de Datos e Inteligencia Artificial:** Detección de patrones, análisis de métricas e interpretación de variables.
5. **Gestión y Análisis de Negocios (Tech Management):** Priorización de recursos, mediación interpersonal y diseño de soluciones centradas en el usuario.

---

## 🛸 Estaciones de la Nave Espacial

| Estación | Líder de Área | Dilema Principal | Enfoque Evaluado | Minijuego |
| :--- | :--- | :--- | :--- | :--- |
| 🛠️ **Bahía de Ensamblaje** | **Mika**, la Inventora | Los robots asistentes se descalibran y chocan en los pasillos de servicio. | Desarrollo de Software | Secuenciación lógica y depuración de comandos |
| 📡 **Sala de Comunicaciones** | **Orion**, el Comunicador | Las transmisiones holográficas entre cabinas sufren latencia y cortes. | Redes e Infraestructura | Enrutamiento de paquetes y conmutación de nodos |
| 🛡️ **Puesto de Vigilancia** | **Kael**, el Guardián | Accesos no autorizados a almacenes críticos mediante credenciales vulneradas. | Ciberseguridad | Cobertura de sensores y detección de anomalías |
| 🌱 **Laboratorio Bio-Sensores** | **Nova**, la Investigadora | Variabilidad en los cultivos hidropónicos según luz, temperatura y humedad. | Ciencia de Datos e IA | Identificación de patrones y correlación de métricas |
| ☕ **Lounge Social** | **Dra. Valeria**, la Coordinadora | Demanda dispar de actividades recreativas con recursos energéticos limitados. | Gestión y Análisis de Negocios | Asignación de recursos y maximización de satisfacción |

---

## 🎮 Mecánicas de Juego (Core Gameplay Loop)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          MUNDO ABIERTO EN LA NAVE                      │
│      Navegación top-down libre • Radar holográfico • Bitácora (PDA)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        INVESTIGACIÓN EN ESTACIÓN                       │
│  1. Presentación del dilema con el Jefe de Departamento                │
│  2. Entrevistas testimoniales a tripulantes / pasajeros testigos       │
│  3. Minijuego práctico de resolución técnica                           │
│  4. Diagnóstico final y selección de propuesta de solución             │
│  5. Reflexión emocional (escala de autopercepción y disfrute)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       PUENTE CENTRAL Y REPORTE                         │
│  Gráfico de afinidad multicriterio • Perfil vocacional predominante    │
│  Fichas explicativas de carreras y proyección universitaria            │
└────────────────────────────────────────────────────────────────────────┘
```

* **Controles Universales:** Movimiento con `WASD` / Flechas direccionales y soporte completo para dispositivos táctiles (joystick virtual interactivo).
* **Diálogos Inmersivos:** Terminal de diálogo con estética retro-futurista, pistas contextuales e interacciones dinámicas.
* **Sistema de Orientación y HUD:** Minimapa holográfico con indicadores de estado de cada estación y bitácora de misiones accesibles mediante tecla `TAB` o botón en pantalla.
* **Evaluación Multicriterio Dinámica:** Algoritmo ponderado que evalúa decisiones tomadas, tiempo dedicado al análisis y autopercepción emocional tras cada actividad.

---

## 🛠️ Stack Tecnológico

* **Motor de Videojuegos:** [Phaser 4](https://phaser.io/) (Canvas / WebGL)
* **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
* **Bundler & Dev Server:** [Vite](https://vitejs.dev/)
* **Testing E2E:** [Playwright](https://playwright.dev/)
* **Mapas y Tilesets:** [Tiled](https://www.mapeditor.org/) (Formato TMX / JSON)
* **Gestor de Paquetes:** `pnpm` (compatible con `npm`)

---

## 📁 Estructura del Código Fuente

```text
cafe-central/
├── public/                     # Assets estáticos (tilesets, sprites, audio, fuentes)
├── src/
│   ├── data/                   # Definición de estaciones, perfiles y carreras de TI
│   │   ├── careerProfiles.ts   # Mapeo de perfiles vocacionales y recomendaciones académicas
│   │   └── stations.ts         # Contenido de dilemas, diálogos de pasajeros y ponderaciones
│   ├── scenes/                 # Escenas de Phaser 4
│   │   ├── minigames/          # Minijuegos interactivos de cada área de TI
│   │   │   ├── BizMinigameScene.ts
│   │   │   ├── DataMinigameScene.ts
│   │   │   ├── NetworkMinigameScene.ts
│   │   │   ├── RoboticsMinigameScene.ts
│   │   │   └── SecurityMinigameScene.ts
│   │   ├── DialogScene.ts      # Diálogos con NPCs, selección de respuestas y feedback emocional
│   │   ├── PreloadScene.ts     # Carga de recursos gráficos y sonoros
│   │   ├── ReportScene.ts      # Pantalla final: gráfico de radar, puntajes y carreras afines
│   │   ├── SpaceShipScene.ts   # Navegación del jugador en el mapa de la nave espacial
│   │   └── UIScene.ts          # HUD, minimapa holográfico, bitácora y onboarding
│   ├── state/
│   │   └── GameState.ts        # Gestor de estado global y cálculo del vector vocacional
│   ├── types/
│   │   └── vocational.ts       # Definiciones de tipos e interfaces de TypeScript
│   └── main.ts                 # Configuración e instanciación del juego en Phaser 4
├── docs/                       # Documentación central del sistema
│   ├── constitution.md         # Modelo funcional de negocio y respaldo psicopedagógico
│   └── ARCHITECTURE.md         # Arquitectura técnica, ciclo de escenas y patrones
├── AGENTS.md                   # Guía de convenciones y buenas prácticas para agentes de IA
├── playwright.config.ts        # Configuración de pruebas automatizadas
├── vite.config.ts              # Configuración de empaquetado Vite
└── package.json                # Dependencias y scripts de ejecución
```

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
* **Node.js** (versión 18 o superior recomendada)
* **pnpm** (o npm / yarn)

### 1. Clonar el repositorio
```bash
git clone https://github.com/maadcode/syscoffee.git
cd cafe-central
```

### 2. Instalar dependencias
```bash
pnpm install
# o con npm:
# npm install
```

### 3. Iniciar el servidor local de desarrollo
```bash
pnpm dev
# o con npm:
# npm run dev
```
Abre tu navegador en `http://localhost:5173/` para jugar.

### 4. Compilar para producción
```bash
pnpm build
# o con npm:
# npm run build
```
Los archivos optimizados se generarán en la carpeta `dist/`.

### 5. Probar la versión de producción localmente
```bash
pnpm preview
```

### 6. Ejecutar pruebas automatizadas
```bash
npx playwright test
```

---

## 📜 Licencia

Distribuido bajo licencia **ISC**. Consulta los términos en el repositorio para más detalles.
