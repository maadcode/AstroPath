# AGENTS.md — Guía para Agentes de IA en AstroPath 🚀

Este documento define la arquitectura, convenciones, principios de diseño y flujos de trabajo que **cualquier agente de IA** (Antigravity, Cursor, Copilot, etc.) debe seguir al interactuar, modificar o extender la base de código de **AstroPath**.

---

## 1. Visión del Proyecto y Filosofía

* **Nombre del Proyecto:** AstroPath (Odisea Vocacional Estelar).
* **Propósito:** Experiencia RPG 2D top-down diseñada para orientar y evaluar la afinidad vocacional en 5 ramas de Tecnologías de la Información (TI):
  1. `dev`: Desarrollo de Software (Lógica, algoritmos, automatización).
  2. `net`: Redes e Infraestructura (Caminos, enrutamiento, fluidez).
  3. `sec`: Ciberseguridad (Blindaje, prevención de trampas, privacidad).
  4. `data`: Ciencia de Datos e IA (Patrones, tendencias, métricas).
  5. `biz`: Gestión y Análisis de Negocios (Empatía, prioridades, recursos).
* **Filosofía Narrativa (Zero-Jargon):**
  - **Prohibido** usar jerga técnica intimidante o descontextualizada en diálogos de NPCs o dilemas (ej. evitar hablar en frío de *APIs, Docker, TCP/IP, SQL, Firewalls*).
  - Usar siempre **analogías de a bordo de la nave** (sensores de cultivo, conmutación de antenas, reglas para robots de cocina, llaves de acceso a almacenes, reparto de suministros sociales).
* **Diseño Orientado por Especificaciones (Spec-Driven Development):**
  - La fuente de verdad del modelo funcional, psicopedagógico y de negocio es [`docs/constitution.md`](file:///C:/Users/Pc/Documents/Software Projects/Frontend Projects/cafe-central/docs/constitution.md).
  - La fuente de verdad para la arquitectura técnica de escenas, ciclo de vida y gestión de estado es [`docs/ARCHITECTURE.md`](file:///C:/Users/Pc/Documents/Software Projects/Frontend Projects/cafe-central/docs/ARCHITECTURE.md).
  - Cualquier nueva mecánica o cambio en el balance vocacional debe mantener consistencia con dichos documentos.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Motor de Juego** | Phaser 4 | `^4.2.1` (WebGL / Canvas) |
| **Lenguaje** | TypeScript | `^7.0.2` (Modo estricto) |
| **Empaquetador** | Vite | `^8.3.4` |
| **Testing E2E** | Playwright | `^1.64.0` |
| **Package Manager** | `pnpm` (o `npm`) | `pnpm-lock.yaml` presente |

---

## 3. Skills Locales de Phaser 4 (`.agents/skills/`)

Este repositorio cuenta con un catálogo exhaustivo de habilidades para Phaser 4 en la carpeta [`.agents/skills/`](file:///C:/Users/Pc/Documents/Software Projects/Frontend Projects/cafe-central/.agents/skills).

> [!IMPORTANT]
> Antes de implementar o refactorizar mecánicas de Phaser 4, consulta el `SKILL.md` correspondiente:
> - **Escenas y Ciclo de Vida:** [`.agents/skills/scenes/SKILL.md`](file:///C:/Users/Pc/Documents/Software Projects/Frontend Projects/cafe-central/.agents/skills/scenes/SKILL.md)
> - **Física Arcade:** [`.agents/skills/physics-arcade/SKILL.md`](file:///C:/Users/Pc/Documents/Software Projects/Frontend Projects/cafe-central/.agents/skills/physics-arcade/SKILL.md)
> - **Tilemaps y Colisiones:** [`.agents/skills/tilemaps/SKILL.md`](file:///C:/Users/Pc/Documents/Software Projects/Frontend Projects/cafe-central/.agents/skills/tilemaps/SKILL.md)
> - **Input, Teclado y Táctil:** [`.agents/skills/input-keyboard-mouse-touch/SKILL.md`](file:///C:/Users/Pc/Documents/Software Projects/Frontend Projects/cafe-central/.agents/skills/input-keyboard-mouse-touch/SKILL.md)
> - **Animaciones y Sprites:** [`.agents/skills/animations/SKILL.md`](file:///C:/Users/Pc/Documents/Software Projects/Frontend Projects/cafe-central/.agents/skills/animations/SKILL.md) y [`.agents/skills/sprites-and-images/SKILL.md`](file:///C:/Users/Pc/Documents/Software Projects/Frontend Projects/cafe-central/.agents/skills/sprites-and-images/SKILL.md)
> - **Tweens y Efectos UI:** [`.agents/skills/tweens/SKILL.md`](file:///C:/Users/Pc/Documents/Software Projects/Frontend Projects/cafe-central/.agents/skills/tweens/SKILL.md)
> - **Pruebas Automatizadas:** [`.agents/skills/playwright-cli/SKILL.md`](file:///C:/Users/Pc/Documents/Software Projects/Frontend Projects/cafe-central/.agents/skills/playwright-cli/SKILL.md)

---

## 4. Arquitectura de Escenas y Flujo del Juego

```
[PreloadScene]
      │
      ▼
[SpaceShipScene] <═════════> [UIScene] (Ejecutándose en paralelo como overlay)
      │
      ├──> [DialogScene] (Se abre al hablar con NPCs o Líderes)
      │         │
      │         └──> Minijuegos de Estación:
      │                 ├── RoboticsMinigameScene (Dev)
      │                 ├── NetworkMinigameScene (Net)
      │                 ├── SecurityMinigameScene (Sec)
      │                 ├── DataMinigameScene (Data)
      │                 └── BizMinigameScene (Biz)
      │
      └──> [ReportScene] (Se lanza al completar las 5 estaciones en el Puente Central)
```

### Reglas de Gestión de Escenas
1. **Paralelismo UI:** `UIScene` corre superpuesta a `SpaceShipScene` gestionando el HUD (minimapa/radar, bitácora PDA, modal de bienvenida).
2. **Pausa y Retoma:** Cuando se abre `DialogScene` o un minijuego, `SpaceShipScene` se pausa (`this.scene.pause('SpaceShipScene')`) y su input se suspende para evitar movimientos accidentales del jugador.
3. **Cierre de Escenas Temporales:** Al concluir el diálogo o el minijuego, la escena invocada debe detenerse limpiamente (`this.scene.stop()`) y resumir `SpaceShipScene`.

---

## 5. Estado Global y Algoritmo Vocacional (`src/state/GameState.ts`)

El objeto `GameState` es el singleton que almacena el progreso de la partida:
* **Vector de Afinidad:** `affinity: { dev, net, sec, data, biz }`.
* **Ponderaciones ($P_1, P_2, P_3$):**
  - **$P_1$ (Decisión de Estación):** Pesos fijos según la opción elegida en `stations.ts`.
  - **$P_2$ (Tiempo Invertido):** Modular suavemente estilos de trabajo sin penalizar con derrota.
  - **$P_3$ (Autopercepción Likert 1–5):** Multiplicador de afinidad según el disfrute expresado por el jugador al finalizar cada dilema.
* **Persistencia:** Cualquier propiedad agregada debe mantener tipado estricto en [`src/types/vocational.ts`](file:///C:/Users/Pc/Documents/Software Projects/Frontend Projects/cafe-central/src/types/vocational.ts).

---

## 6. Convenciones de Código y Buenas Prácticas

1. **TypeScript Estricto:**
   - Evitar `any` a menos que sea una interacción con APIs de terceros o Canvas donde no haya tipos disponibles.
   - Declarar interfaces claras para payloads de eventos, datos de NPCs y parámetros de minijuegos.
2. **Preservación de Documentación y Comentarios:**
   - Mantener comentarios explicativos existentes. No eliminar documentación de lógica de negocio o matrices de ponderación sin justificación explícita.
3. **Optimización de Assets en Phaser:**
   - Destruir listeners de eventos (`this.events.off(...)`) en el shutdown de cada escena para evitar memory leaks.
   - Reutilizar texturas generadas y limpiar tweens activos al salir de minijuegos.
4. **Soporte Híbrido (Desktop + Mobile/Touch):**
   - Asegurarse de que cualquier nueva interacción (botones, minijuegos) responda tanto a `pointerdown` / click como a controles táctiles o teclas de atajo.

---

## 7. Comandos de Verificación para Agentes

Antes de dar por finalizada cualquier tarea o cambio de código, el agente **debe ejecutar y verificar**:

```bash
# 1. Compilación de TypeScript y bundle de producción (no debe arrojar errores)
pnpm build
# o: npm run build

# 2. Pruebas automatizadas (si se modificaron flujos de interacción o UI)
npx playwright test
```

---

## 8. Formato de Commits

Seguir el estándar de **Conventional Commits**:
* `feat(...)`: Nueva funcionalidad o mecánica (ej. `feat(minigame): añadir feedback háptico en sensores`).
* `fix(...)`: Corrección de errores (ej. `fix(dialog): evitar overflow de texto en resoluciones pequeñas`).
* `style(...)`: Cambios visuales o ajustes de coordenadas en Phaser.
* `refactor(...)`: Reestructuración de escenas o módulos sin alterar funcionalidad.
* `docs(...)`: Actualización de la constitución, arquitectura técnica, README o guías técnicas.
