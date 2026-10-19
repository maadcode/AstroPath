import * as Phaser from 'phaser';
import { MinigameMetrics, VocationalScores } from '../../types/vocational';

export type RobotInstruction = 'TO_PART' | 'LOWER' | 'GRAB' | 'RAISE' | 'TO_SLOT' | 'RELEASE' | 'WAIT';

interface RobotPart {
  id: number;
  name: string;
  expectedOrder: number;
  color: number;
  colorHex: string;
  width: number;
  height: number;
  slotX: number;
  slotY: number;
  body: MatterJS.BodyType;
  graphic: Phaser.GameObjects.Graphics;
  hitZone: Phaser.GameObjects.Zone;
  installed: boolean;
  accuracy: number;
}

export class RoboticsMinigameScene extends Phaser.Scene {
  private panelWidth = 860;
  private panelHeight = 540;
  private panelX = 512;
  private panelY = 320;

  // Riel superior y pórtico móvil (Gantry crane)
  private railY = 190;
  private trolleyX = 512;
  private trolleyMinX = 252; // panelX - 260
  private trolleyMaxX = 772; // panelX + 260

  // Cinemática inversa (2-Bone IK)
  private upperArmLength = 138;
  private forearmLength = 138;
  public targetClawX = 512;
  public targetClawY = 340;
  private clawX = 512;
  private clawY = 340;
  private elbowX = 512;
  private elbowY = 260;
  private prevClawX = 512;
  private prevClawY = 340;

  // Cuerpo físico de la pinza/imán
  private clawBody!: MatterJS.BodyType;
  private armGraphics!: Phaser.GameObjects.Graphics;

  // Electroimán y agarre
  private isMagnetActive = false;
  public isClickLocked = false;
  public heldPart: RobotPart | null = null;
  private pointerDownTime = 0;
  private pointerDownPos = { x: 0, y: 0 };

  // Piezas y Chasis
  public parts: RobotPart[] = [];
  private installedOrder: number[] = [];
  private totalParts = 3;
  private roughMovesCount = 0;
  private startTime = 0;

  // Programador visual de secuencias
  private programmedSequence: RobotInstruction[] = [];
  private isExecutingProgram = false;
  private programRunAttempts = 0;
  private totalInstructionsExecuted = 0;
  private sequenceSlotContainers: Phaser.GameObjects.Container[] = [];
  private executeBtn!: Phaser.GameObjects.Rectangle;
  private executeBtnText!: Phaser.GameObjects.Text;

  // Métricas de Stealth Assessment (Landers 2024 / Shute 2011)
  private firstGrabDelaySec = 0;
  private regrabsCount = 0;
  private failedDropsCount = 0;
  private partGrabCounts: { [id: number]: number } = {};

  // UI
  private statusText!: Phaser.GameObjects.Text;
  private accuracyText!: Phaser.GameObjects.Text;
  private sequenceText!: Phaser.GameObjects.Text;
  private magnetStatusText!: Phaser.GameObjects.Text;
  public completedModal!: Phaser.GameObjects.Container;

  // Callbacks
  private onCompleteCallback?: (metrics: MinigameMetrics) => void;
  private onCancelCallback?: () => void;

  constructor() {
    super({
      key: 'RoboticsMinigameScene',
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 0.5 },
          debug: false
        }
      }
    });
  }

  init(data: { onComplete?: (metrics: MinigameMetrics) => void; onCancel?: () => void }) {
    this.onCompleteCallback = data.onComplete;
    this.onCancelCallback = data.onCancel;
    this.parts = [];
    this.installedOrder = [];
    this.roughMovesCount = 0;
    this.heldPart = null;
    this.isMagnetActive = false;
    this.isClickLocked = false;
    this.firstGrabDelaySec = 0;
    this.regrabsCount = 0;
    this.failedDropsCount = 0;
    this.partGrabCounts = {};
    this.programmedSequence = [];
    this.isExecutingProgram = false;
    this.programRunAttempts = 0;
    this.totalInstructionsExecuted = 0;
    this.trolleyX = this.panelX;
    this.targetClawX = this.panelX;
    this.targetClawY = this.panelY + 40;
    this.clawX = this.panelX;
    this.clawY = this.panelY + 40;
    this.prevClawX = this.panelX;
    this.prevClawY = this.panelY + 40;
  }

  create() {
    this.startTime = Date.now();
    const { width, height } = this.scale;

    // 1. Overlay oscuro
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.88);
    overlay.setInteractive();

    // 2. Chasis del Taller de Montaje
    const frame = this.add.rectangle(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 0x0f172a, 0.96);
    frame.setStrokeStyle(3, 0x3b82f6);

    // Cabecera
    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 25, '🤖 BAHÍA DE ENSAMBLAJE // PROGRAMADOR DE SECUENCIAS DEL ROBOT', {
      fontSize: '17px',
      color: '#60a5fa',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 48, 'Arma la secuencia de instrucciones para comandar el brazo articulado IK o contrólalo manualmente.\nPulsa [EJECUTAR PROGRAMA] para compilar y ensamblar los componentes del robot asistente.', {
      fontSize: '11.5px',
      color: '#94a3b8',
      fontFamily: 'sans-serif',
      lineSpacing: 3
    });

    // Botón Salir
    const cancelBtn = this.add.rectangle(this.panelX + this.panelWidth / 2 - 70, this.panelY - this.panelHeight / 2 + 30, 90, 30, 0x334155).setInteractive({ useHandCursor: true });
    cancelBtn.setStrokeStyle(1, 0x64748b);
    this.add.text(cancelBtn.x, cancelBtn.y, 'Cerrar', { fontSize: '12px', color: '#f1f5f9', fontStyle: 'bold' }).setOrigin(0.5);
    cancelBtn.on('pointerdown', () => this.closeMinigame());

    // 3. Establecer límites físicos
    const minX = this.panelX - this.panelWidth / 2 + 20;
    const maxX = this.panelX + this.panelWidth / 2 - 20;
    const minY = this.panelY - this.panelHeight / 2 + 90;
    const maxY = this.panelY + this.panelHeight / 2 - 20;
    this.matter.world.setBounds(minX, minY, maxX - minX, maxY - minY, 32, true, true, true, true);

    // 4. Mesa de trabajo y Soporte del chasis
    this.setupWorkbench();

    // 5. Crear el brazo cinemático y gráficos
    this.armGraphics = this.add.graphics();
    this.setupRoboticArm();

    // 6. Crear las piezas físicas y slots
    this.setupPartsAndSlots();

    // 7. Consola de programación por bloques
    this.setupProgrammerConsole();

    // 8. HUD
    this.setupHUD();

    // 9. Controles con puntero
    this.setupInputHandlers();

    // 10. Modal de finalización
    this.createCompletionModal();
  }

  private setupWorkbench() {
    const tableY = this.panelY + 115;

    // Mesa izquierda (Banco de Piezas)
    const tableLeft = this.add.rectangle(this.panelX - 240, tableY, 260, 20, 0x1e293b);
    tableLeft.setStrokeStyle(2, 0x475569);
    this.matter.add.rectangle(tableLeft.x, tableLeft.y, 260, 20, { isStatic: true, restitution: 0.1 });
    this.add.text(tableLeft.x, tableLeft.y + 18, 'BANCO DE PIEZAS', { fontSize: '10px', color: '#94a3b8', fontStyle: 'bold' }).setOrigin(0.5);

    // Mesa derecha (Chasis del robot)
    const tableRight = this.add.rectangle(this.panelX + 220, tableY, 280, 20, 0x1e293b);
    tableRight.setStrokeStyle(2, 0x3b82f6);
    this.matter.add.rectangle(tableRight.x, tableRight.y, 280, 20, { isStatic: true, restitution: 0.1 });

    // Dibujar chasis del robot asistente
    const robotChassis = this.add.rectangle(this.panelX + 220, tableY - 45, 180, 70, 0x0f172a);
    robotChassis.setStrokeStyle(2, 0x60a5fa);
    this.add.text(this.panelX + 220, tableY - 90, '🤖 ROBOT ASISTENTE M-4', { fontSize: '11px', color: '#93c5fd', fontStyle: 'bold' }).setOrigin(0.5);
  }

  private setupRoboticArm() {
    this.railY = 190;
    this.trolleyMinX = this.panelX - 260;
    this.trolleyMaxX = this.panelX + 260;
    this.trolleyX = this.panelX;
    this.targetClawX = this.panelX;
    this.targetClawY = this.panelY + 40;
    this.clawX = this.panelX;
    this.clawY = this.panelY + 40;
    this.prevClawX = this.panelX;
    this.prevClawY = this.panelY + 40;

    // Cuerpo sensor de Matter para la pinza
    this.clawBody = this.matter.add.circle(this.clawX, this.clawY, 16, {
      isSensor: true,
      isStatic: true,
      label: 'claw'
    });
  }

  private setupPartsAndSlots() {
    const tableLeftX = this.panelX - 240;
    const tableY = this.panelY + 115;
    const chassisX = this.panelX + 220;

    const configs = [
      {
        id: 1,
        name: '1. Procesador Central',
        expectedOrder: 1,
        color: 0x38bdf8,
        colorHex: '#38bdf8',
        width: 32,
        height: 32,
        startX: tableLeftX - 70,
        slotX: chassisX - 45,
        slotY: tableY - 70
      },
      {
        id: 2,
        name: '2. Batería de Plasma',
        expectedOrder: 2,
        color: 0x22c55e,
        colorHex: '#4ade80',
        width: 26,
        height: 42,
        startX: tableLeftX,
        slotX: chassisX,
        slotY: tableY - 70
      },
      {
        id: 3,
        name: '3. Placa de Blindaje',
        expectedOrder: 3,
        color: 0xf59e0b,
        colorHex: '#fbbf24',
        width: 44,
        height: 24,
        startX: tableLeftX + 70,
        slotX: chassisX + 45,
        slotY: tableY - 70
      }
    ];

    configs.forEach(c => {
      // 1. Ranura receptora en el chasis
      const slot = this.add.rectangle(c.slotX, c.slotY, c.width + 4, c.height + 4, 0x1e293b);
      slot.setStrokeStyle(1.5, c.color, 0.7);
      slot.setInteractive({ useHandCursor: true });
      this.add.text(c.slotX, c.slotY, `${c.id}`, { fontSize: '11px', color: c.colorHex, fontStyle: 'bold' }).setOrigin(0.5);

      // Clic directo en el slot receptor si el jugador ya sostiene la pieza adecuada
      slot.on('pointerdown', () => {
        if (this.heldPart && this.heldPart.id === c.id) {
          this.targetClawX = c.slotX;
          this.targetClawY = c.slotY - 15;
          this.releasePart();
          this.isClickLocked = false;
          this.isMagnetActive = false;
        }
      });

      // 2. Cuerpo físico de la pieza en la mesa
      const body = this.matter.add.rectangle(c.startX, tableY, c.width, c.height, {
        restitution: 0.05,
        friction: 0.3,
        density: 0.002,
        label: `part_${c.id}`
      });

      const g = this.add.graphics();
      this.drawPartGraphic(g, c.width, c.height, c.color);

      // Zona interactiva para clic directo sobre la pieza
      const hitZone = this.add.zone(c.startX, tableY, c.width + 16, c.height + 16).setInteractive({ useHandCursor: true });

      const partObj: RobotPart = {
        id: c.id,
        name: c.name,
        expectedOrder: c.expectedOrder,
        color: c.color,
        colorHex: c.colorHex,
        width: c.width,
        height: c.height,
        slotX: c.slotX,
        slotY: c.slotY,
        body,
        graphic: g,
        hitZone,
        installed: false,
        accuracy: 0
      };

      hitZone.on('pointerdown', () => {
        if (!partObj.installed) {
          if (!this.heldPart) {
            this.targetClawX = partObj.body.position.x;
            this.targetClawY = partObj.body.position.y - 12;
            this.grabPart(partObj);
            this.isClickLocked = true;
          }
        }
      });

      this.parts.push(partObj);
    });
  }

  private setupProgrammerConsole() {
    const consoleY = this.panelY + 162;

    // Caja de consola
    const bg = this.add.rectangle(this.panelX, consoleY, 800, 84, 0x090d16, 0.9);
    bg.setStrokeStyle(1.5, 0x334155);

    // Paleta de Instrucciones
    const blockDefs: { type: RobotInstruction; label: string; color: string; colorNum: number }[] = [
      { type: 'TO_PART', label: '◄ Ir a Pieza', color: '#38bdf8', colorNum: 0x0284c7 },
      { type: 'LOWER', label: '▼ Bajar', color: '#60a5fa', colorNum: 0x2563eb },
      { type: 'GRAB', label: '🧲 Agarrar', color: '#c084fc', colorNum: 0x7c3aed },
      { type: 'RAISE', label: '▲ Subir', color: '#60a5fa', colorNum: 0x2563eb },
      { type: 'TO_SLOT', label: '► Ir a Chasis', color: '#34d399', colorNum: 0x059669 },
      { type: 'RELEASE', label: '⚡ Soltar', color: '#f59e0b', colorNum: 0xd97706 },
      { type: 'WAIT', label: '⏱ Esperar', color: '#94a3b8', colorNum: 0x475569 }
    ];

    const paletteY = consoleY - 24;
    blockDefs.forEach((b, idx) => {
      const bx = this.panelX - 340 + (idx * 86);
      const btn = this.add.rectangle(bx, paletteY, 80, 24, 0x1e293b).setInteractive({ useHandCursor: true });
      btn.setStrokeStyle(1, b.colorNum);
      this.add.text(bx, paletteY, b.label, { fontSize: '10px', color: b.color, fontStyle: 'bold' }).setOrigin(0.5);

      btn.on('pointerdown', () => this.appendInstruction(b.type));
    });

    // Botones de ejecución y reset
    const actionY = consoleY + 18;
    this.executeBtn = this.add.rectangle(this.panelX + 290, actionY, 150, 28, 0x166534).setInteractive({ useHandCursor: true });
    this.executeBtn.setStrokeStyle(1.5, 0x22c55e);
    this.executeBtnText = this.add.text(this.executeBtn.x, actionY, '▶ EJECUTAR CÓDIGO', { fontSize: '11px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.executeBtn.on('pointerdown', () => this.executeProgrammedSequence());

    const clearBtn = this.add.rectangle(this.panelX + 180, actionY, 60, 28, 0x1e293b).setInteractive({ useHandCursor: true });
    clearBtn.setStrokeStyle(1, 0xef4444);
    this.add.text(clearBtn.x, actionY, '↺ Borrar', { fontSize: '10.5px', color: '#fca5a5', fontStyle: 'bold' }).setOrigin(0.5);
    clearBtn.on('pointerdown', () => this.clearProgrammedSequence());

    // Ranuras visuales de la cinta de programa (8 slots)
    const tapeStartX = this.panelX - 350;
    const slotSpacing = 62;
    for (let i = 0; i < 8; i++) {
      const sx = tapeStartX + (i * slotSpacing);
      const c = this.add.container(sx, actionY);

      const sBg = this.add.rectangle(0, 0, 58, 26, 0x1e293b);
      sBg.setStrokeStyle(1, 0x475569);
      sBg.setInteractive({ useHandCursor: true });

      const sTxt = this.add.text(0, 0, `${i + 1}`, { fontSize: '9.5px', color: '#64748b' }).setOrigin(0.5);

      c.add([sBg, sTxt]);

      const slotIdx = i;
      sBg.on('pointerdown', () => this.removeInstructionAt(slotIdx));

      this.sequenceSlotContainers.push(c);
    }
  }

  private appendInstruction(inst: RobotInstruction) {
    if (this.isExecutingProgram) return;
    if (this.programmedSequence.length >= 8) {
      this.cameras.main.shake(100, 0.003);
      return;
    }

    this.programmedSequence.push(inst);
    this.updateProgramTapeUI();
  }

  private removeInstructionAt(index: number) {
    if (this.isExecutingProgram) return;
    if (index < this.programmedSequence.length) {
      this.programmedSequence.splice(index, 1);
      this.updateProgramTapeUI();
    }
  }

  private clearProgrammedSequence() {
    if (this.isExecutingProgram) return;
    this.programmedSequence = [];
    this.updateProgramTapeUI();
  }

  private updateProgramTapeUI(executingIndex = -1) {
    const labelMap: { [key in RobotInstruction]: { txt: string; color: number } } = {
      TO_PART: { txt: '◄ Pieza', color: 0x0284c7 },
      LOWER: { txt: '▼ Bajar', color: 0x2563eb },
      GRAB: { txt: '🧲 Agarrar', color: 0x7c3aed },
      RAISE: { txt: '▲ Subir', color: 0x2563eb },
      TO_SLOT: { txt: '► Chasis', color: 0x059669 },
      RELEASE: { txt: '⚡ Soltar', color: 0xd97706 },
      WAIT: { txt: '⏱ Esperar', color: 0x475569 }
    };

    for (let i = 0; i < 8; i++) {
      const c = this.sequenceSlotContainers[i];
      const sBg = c.list[0] as Phaser.GameObjects.Rectangle;
      const sTxt = c.list[1] as Phaser.GameObjects.Text;

      if (i < this.programmedSequence.length) {
        const inst = this.programmedSequence[i];
        const info = labelMap[inst];
        sBg.setFillStyle(info.color, 0.9);
        sTxt.setText(info.txt);
        sTxt.setColor('#ffffff');

        if (i === executingIndex) {
          sBg.setStrokeStyle(2.5, 0xfacc15);
        } else {
          sBg.setStrokeStyle(1, 0xffffff);
        }
      } else {
        sBg.setFillStyle(0x1e293b, 0.8);
        sBg.setStrokeStyle(1, 0x475569);
        sTxt.setText(`${i + 1}`);
        sTxt.setColor('#64748b');
      }
    }
  }

  private executeProgrammedSequence() {
    if (this.isExecutingProgram) return;
    if (this.programmedSequence.length === 0) {
      this.cameras.main.shake(100, 0.004);
      return;
    }

    this.isExecutingProgram = true;
    this.programRunAttempts++;
    this.executeBtn.setFillStyle(0x854d0e);
    this.executeBtnText.setText('⚙ EJECUTANDO...');

    let stepIndex = 0;

    const stepInterval = () => {
      if (stepIndex >= this.programmedSequence.length) {
        // Fin de la secuencia
        this.isExecutingProgram = false;
        this.updateProgramTapeUI(-1);
        this.executeBtn.setFillStyle(0x166534);
        this.executeBtnText.setText('▶ EJECUTAR CÓDIGO');
        return;
      }

      const inst = this.programmedSequence[stepIndex];
      this.updateProgramTapeUI(stepIndex);
      this.totalInstructionsExecuted++;

      // Buscar siguiente pieza no instalada
      const targetPart = this.parts.find(p => !p.installed);

      switch (inst) {
        case 'TO_PART':
          if (targetPart) {
            this.targetClawX = targetPart.body.position.x;
            this.targetClawY = 260;
          }
          break;
        case 'LOWER':
          if (this.heldPart) {
            this.targetClawY = this.heldPart.slotY;
          } else if (targetPart) {
            this.targetClawY = targetPart.body.position.y - 10;
          } else {
            this.targetClawY = 390;
          }
          break;
        case 'GRAB':
          if (!this.heldPart && targetPart) {
            this.grabPart(targetPart);
            this.isClickLocked = true;
          }
          break;
        case 'RAISE':
          this.targetClawY = 260;
          break;
        case 'TO_SLOT':
          if (this.heldPart) {
            this.targetClawX = this.heldPart.slotX;
            this.targetClawY = 260;
          }
          break;
        case 'RELEASE':
          if (this.heldPart) {
            this.releasePart();
            this.isClickLocked = false;
            this.isMagnetActive = false;
          }
          break;
        case 'WAIT':
          // Pausa de sincronización
          break;
      }

      stepIndex++;
      this.time.delayedCall(650, stepInterval);
    };

    stepInterval();
  }

  private drawPartGraphic(g: Phaser.GameObjects.Graphics, width: number, height: number, color: number) {
    g.clear();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 4);
    g.lineStyle(1.5, 0xffffff, 0.9);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);
    g.lineStyle(1, 0xffffff, 0.35);
    g.strokeCircle(0, 0, Math.min(width, height) / 4);
  }

  private setupHUD() {
    const barY = this.panelY + this.panelHeight / 2 - 18;
    const startX = this.panelX - this.panelWidth / 2 + 40;

    this.statusText = this.add.text(startX, barY, 'Instaladas: 0 / 3', {
      fontSize: '11.5px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.accuracyText = this.add.text(startX + 180, barY, 'Precisión de Encaje: --', {
      fontSize: '11.5px',
      color: '#60a5fa',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.sequenceText = this.add.text(startX + 400, barY, 'Secuencia Lógica: Correcta', {
      fontSize: '11.5px',
      color: '#34d399',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.magnetStatusText = this.add.text(startX + 620, barY, 'Imán: Inactivo', {
      fontSize: '11.5px',
      color: '#94a3b8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });
  }

  private setupInputHandlers() {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isExecutingProgram) return;

      const clampedX = Phaser.Math.Clamp(pointer.x, this.panelX - this.panelWidth / 2 + 60, this.panelX + this.panelWidth / 2 - 60);
      const clampedY = Phaser.Math.Clamp(pointer.y, this.panelY - 60, this.panelY + 125);
      this.targetClawX = clampedX;
      this.targetClawY = clampedY;

      if (this.isMagnetActive && !this.heldPart) {
        this.checkAndGrabPart(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isExecutingProgram) return;

      if (this.heldPart && this.isClickLocked) {
        this.releasePart();
        this.isClickLocked = false;
        this.isMagnetActive = false;
        this.updateHUDText();
        return;
      }

      this.pointerDownTime = Date.now();
      this.pointerDownPos = { x: pointer.x, y: pointer.y };
      this.isMagnetActive = true;

      if (!this.heldPart) {
        this.checkAndGrabPart(pointer.x, pointer.y);
      }
      this.updateHUDText();
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isExecutingProgram) return;

      const duration = Date.now() - this.pointerDownTime;
      const distMoved = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.pointerDownPos.x, this.pointerDownPos.y);

      if (this.heldPart) {
        if (duration > 220 || distMoved > 12) {
          this.releasePart();
          this.isClickLocked = false;
          this.isMagnetActive = false;
        } else {
          this.isClickLocked = true;
          this.isMagnetActive = true;
        }
      } else {
        this.isMagnetActive = false;
        this.isClickLocked = false;
      }
      this.updateHUDText();
    });
  }

  private checkAndGrabPart(pointerX?: number, pointerY?: number) {
    if (this.heldPart) return;

    for (const part of this.parts) {
      if (part.installed) continue;

      const clawDist = Phaser.Math.Distance.Between(this.clawX, this.clawY, part.body.position.x, part.body.position.y);
      const pointerDist = (pointerX !== undefined && pointerY !== undefined)
        ? Phaser.Math.Distance.Between(pointerX, pointerY, part.body.position.x, part.body.position.y)
        : 999;

      if (clawDist <= 55 || pointerDist <= 45) {
        this.grabPart(part);
        break;
      }
    }
  }

  public grabPart(part: RobotPart) {
    this.heldPart = part;
    this.isMagnetActive = true;

    if (this.firstGrabDelaySec === 0) {
      this.firstGrabDelaySec = Math.max(0.1, (Date.now() - this.startTime) / 1000);
    }

    this.partGrabCounts[part.id] = (this.partGrabCounts[part.id] || 0) + 1;
    if (this.partGrabCounts[part.id] > 1) {
      this.regrabsCount++;
    }

    const f = this.add.circle(part.body.position.x, part.body.position.y, 22, 0x38bdf8, 0.8);
    this.tweens.add({
      targets: f,
      scale: 2.0,
      alpha: 0,
      duration: 250,
      onComplete: () => f.destroy()
    });

    this.updateHUDText();
  }

  public releasePart() {
    if (!this.heldPart) return;

    const part = this.heldPart;
    this.heldPart = null;

    const distToSlot = Phaser.Math.Distance.Between(part.body.position.x, part.body.position.y, part.slotX, part.slotY);

    if (distToSlot <= 50) {
      this.snapPartIntoSlot(part, distToSlot);
    } else {
      this.failedDropsCount++;
      this.matter.body.setStatic(part.body, false);
      this.matter.body.setVelocity(part.body, { x: 0, y: 1 });
    }

    this.updateHUDText();
  }

  private snapPartIntoSlot(part: RobotPart, distToSlot: number) {
    part.installed = true;
    part.hitZone.disableInteractive();
    this.installedOrder.push(part.expectedOrder);

    const accuracy = Math.max(70, Math.round(100 - (distToSlot * 0.6)));
    part.accuracy = accuracy;

    this.matter.body.setPosition(part.body, { x: part.slotX, y: part.slotY });
    this.matter.body.setAngle(part.body, 0);
    this.matter.body.setStatic(part.body, true);

    const f = this.add.circle(part.slotX, part.slotY, 26, part.color, 0.85);
    this.tweens.add({
      targets: f,
      scale: 2.2,
      alpha: 0,
      duration: 350,
      onComplete: () => f.destroy()
    });

    const installedCount = this.parts.filter(p => p.installed).length;
    this.statusText.setText(`Instaladas: ${installedCount} / ${this.totalParts}`);

    const avgAcc = Math.round(this.parts.filter(p => p.installed).reduce((acc, p) => acc + p.accuracy, 0) / installedCount);
    this.accuracyText.setText(`Precisión de Encaje: ${avgAcc}%`);

    const isSequential = this.installedOrder.every((val, idx) => val === idx + 1);
    if (!isSequential) {
      this.sequenceText.setText('Secuencia Lógica: Desordenada');
      this.sequenceText.setColor('#fbbf24');
    }

    if (installedCount >= this.totalParts) {
      this.time.delayedCall(700, () => {
        this.triggerVictory();
      });
    }
  }

  private updateHUDText() {
    if (this.isMagnetActive || this.heldPart) {
      this.magnetStatusText.setText(this.heldPart ? 'Imán: SUJETANDO PIEZA' : 'Imán: ACTIVO');
      this.magnetStatusText.setColor('#38bdf8');
    } else {
      this.magnetStatusText.setText('Imán: Inactivo');
      this.magnetStatusText.setColor('#94a3b8');
    }
  }

  // Cinemática Inversa Analítica de 2 Eslabones (2-Bone IK)
  public solveIK(targetX: number, targetY: number): { elbow: Phaser.Math.Vector2; claw: Phaser.Math.Vector2 } {
    const shoulderX = this.trolleyX;
    const shoulderY = this.railY + 16;

    const L1 = this.upperArmLength;
    const L2 = this.forearmLength;

    let dx = targetX - shoulderX;
    let dy = targetY - shoulderY;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      dist = 1;
      dy = 1;
    }

    const maxReach = L1 + L2 - 1.5;
    const minReach = Math.abs(L1 - L2) + 1.5;

    let clampedDist = Phaser.Math.Clamp(dist, minReach, maxReach);

    let effClawX = targetX;
    let effClawY = targetY;
    if (dist > maxReach) {
      effClawX = shoulderX + (dx / dist) * maxReach;
      effClawY = shoulderY + (dy / dist) * maxReach;
      dx = effClawX - shoulderX;
      dy = effClawY - shoulderY;
    }

    const angleToTarget = Math.atan2(dy, dx);
    const cosAlpha = (L1 * L1 + clampedDist * clampedDist - L2 * L2) / (2 * L1 * clampedDist);
    const clampedCosAlpha = Phaser.Math.Clamp(cosAlpha, -1, 1);
    const alpha = Math.acos(clampedCosAlpha);

    const theta1 = angleToTarget - alpha;
    const elbowX = shoulderX + L1 * Math.cos(theta1);
    const elbowY = shoulderY + L1 * Math.sin(theta1);

    return {
      elbow: new Phaser.Math.Vector2(elbowX, elbowY),
      claw: new Phaser.Math.Vector2(effClawX, effClawY)
    };
  }

  update(_time: number, delta: number) {
    const targetTrolley = Phaser.Math.Clamp(this.targetClawX, this.trolleyMinX, this.trolleyMaxX);
    const lerpTrolley = Phaser.Math.Clamp((delta / 1000) * 8.5, 0.05, 0.45);
    this.trolleyX = Phaser.Math.Linear(this.trolleyX, targetTrolley, lerpTrolley);

    const ik = this.solveIK(this.targetClawX, this.targetClawY);

    const lerpArm = Phaser.Math.Clamp((delta / 1000) * 12.0, 0.08, 0.65);
    this.elbowX = Phaser.Math.Linear(this.elbowX, ik.elbow.x, lerpArm);
    this.elbowY = Phaser.Math.Linear(this.elbowY, ik.elbow.y, lerpArm);
    this.clawX = Phaser.Math.Linear(this.clawX, ik.claw.x, lerpArm);
    this.clawY = Phaser.Math.Linear(this.clawY, ik.claw.y, lerpArm);

    if (this.clawBody) {
      this.matter.body.setPosition(this.clawBody, { x: this.clawX, y: this.clawY });
    }

    if (this.heldPart) {
      this.matter.body.setPosition(this.heldPart.body, { x: this.clawX, y: this.clawY + 16 });
      this.matter.body.setAngle(this.heldPart.body, 0);
      this.matter.body.setVelocity(this.heldPart.body, { x: 0, y: 0 });
    }

    for (const part of this.parts) {
      part.graphic.setPosition(part.body.position.x, part.body.position.y);
      part.graphic.setRotation(part.body.angle);
      part.hitZone.setPosition(part.body.position.x, part.body.position.y);
    }

    const clawSpeed = Phaser.Math.Distance.Between(this.clawX, this.clawY, this.prevClawX, this.prevClawY) / (delta / 1000);
    if (clawSpeed > 800) {
      this.roughMovesCount += delta / 1000;
    }
    this.prevClawX = this.clawX;
    this.prevClawY = this.clawY;

    this.renderRoboticArmVisuals();
  }

  private renderRoboticArmVisuals() {
    this.armGraphics.clear();
    const shoulderX = this.trolleyX;
    const shoulderY = this.railY + 16;

    // Riel y Carro
    this.armGraphics.fillStyle(0x334155, 1);
    this.armGraphics.fillRect(this.panelX - 280, this.railY - 6, 560, 12);
    this.armGraphics.lineStyle(1.5, 0x64748b, 0.9);
    this.armGraphics.strokeRect(this.panelX - 280, this.railY - 6, 560, 12);

    this.armGraphics.fillStyle(0x1e293b, 1);
    this.armGraphics.fillRoundedRect(this.trolleyX - 24, this.railY - 10, 48, 24, 4);
    this.armGraphics.lineStyle(2, 0x3b82f6, 1);
    this.armGraphics.strokeRoundedRect(this.trolleyX - 24, this.railY - 10, 48, 24, 4);

    // Eslabones del brazo
    this.armGraphics.lineStyle(10, 0x1e293b, 1);
    this.armGraphics.lineBetween(shoulderX, shoulderY, this.elbowX, this.elbowY);
    this.armGraphics.lineBetween(this.elbowX, this.elbowY, this.clawX, this.clawY);

    this.armGraphics.lineStyle(4, 0x60a5fa, 0.9);
    this.armGraphics.lineBetween(shoulderX, shoulderY, this.elbowX, this.elbowY);
    this.armGraphics.lineStyle(4, 0x93c5fd, 0.9);
    this.armGraphics.lineBetween(this.elbowX, this.elbowY, this.clawX, this.clawY);

    // Juntas circulares
    this.armGraphics.fillStyle(0x3b82f6, 1);
    this.armGraphics.fillCircle(shoulderX, shoulderY, 8);
    this.armGraphics.fillCircle(this.elbowX, this.elbowY, 7);

    // Pinza / Electroimán
    this.renderClaw(this.clawX, this.clawY);
  }

  private renderClaw(cx: number, cy: number) {
    this.armGraphics.fillStyle(0x0f172a, 1);
    this.armGraphics.fillRoundedRect(cx - 16, cy - 8, 32, 16, 3);
    this.armGraphics.lineStyle(2, this.isMagnetActive ? 0x38bdf8 : 0x64748b, 1);
    this.armGraphics.strokeRoundedRect(cx - 16, cy - 8, 32, 16, 3);

    const jawOffset = this.isMagnetActive ? 7 : 13;
    this.armGraphics.lineStyle(3, 0xe2e8f0, 1);
    this.armGraphics.lineBetween(cx - 12, cy + 8, cx - jawOffset, cy + 18);
    this.armGraphics.lineBetween(cx + 12, cy + 8, cx + jawOffset, cy + 18);

    if (this.isMagnetActive) {
      this.armGraphics.fillStyle(0x38bdf8, 1);
      this.armGraphics.fillCircle(cx, cy + 9, 4);
    } else {
      this.armGraphics.fillStyle(0x0f172a, 1);
      this.armGraphics.fillCircle(cx, cy + 9, 3);
    }
  }

  public triggerVictory() {
    const elapsedSeconds = Math.round((Date.now() - this.startTime) / 1000);

    const avgAccuracy = Math.round(this.parts.reduce((acc, p) => acc + p.accuracy, 0) / this.totalParts);
    const isSequential = this.installedOrder.every((val, idx) => val === idx + 1);
    const sequenceBonus = isSequential ? 15 : 0;
    const roughPenalty = Math.min(20, Math.round(this.roughMovesCount));

    const primaryDevScore = Math.max(50, Math.min(100, Math.round(
      (avgAccuracy * 0.6) + sequenceBonus + (25 - roughPenalty)
    )));

    const secondarySecScore = Math.max(55, Math.min(100, Math.round(
      (avgAccuracy * 0.7) + Math.max(0, 30 - roughPenalty)
    )));

    const grabDelay = this.firstGrabDelaySec > 0 ? this.firstGrabDelaySec : elapsedSeconds;
    const behavioralBonuses: Partial<VocationalScores> = {};
    if (grabDelay >= 3.5) {
      behavioralBonuses.data = 0.6;
    } else if (grabDelay <= 1.5) {
      behavioralBonuses.dev = 0.5;
    }

    if (this.programRunAttempts > 0) {
      behavioralBonuses.dev = (behavioralBonuses.dev || 0) + 0.5; // Pensamiento algorítmico y ejecución programada
    }

    if (this.failedDropsCount === 0) {
      behavioralBonuses.biz = 0.5;
    }

    const metrics: MinigameMetrics = {
      primaryScore: primaryDevScore,
      secondaryBranch: 'sec',
      secondaryScore: secondarySecScore,
      behavioralBonuses,
      details: {
        'Precisión Promedio': `${avgAccuracy}%`,
        'Orden Lógico': isSequential ? 'Secuencia Óptima (100%)' : 'Alternativo (75%)',
        'Programas Ejecutados': `${this.programRunAttempts}`,
        'Control Cinemático': `${Math.max(60, 100 - roughPenalty)}%`,
        'Tiempo de Montaje': `${elapsedSeconds} seg`,
        'Reintentos / Caídas': `${this.regrabsCount} / ${this.failedDropsCount}`
      },
      feedbackSummary: `Excelente capacidad de construcción lógica. Lograste un ${avgAccuracy}% de precisión de encaje y ${isSequential ? 'el orden ideal de compilación' : 'un montaje funcional'}.`
    };

    this.showCompletionModal(metrics);
  }

  private createCompletionModal() {
    this.completedModal = this.add.container(this.panelX, this.panelY);
    this.completedModal.setVisible(false);
    this.completedModal.setDepth(100);

    const mBg = this.add.rectangle(0, 0, 520, 320, 0x090d16, 0.98);
    mBg.setStrokeStyle(2, 0x3b82f6);

    const title = this.add.text(0, -115, '🤖 ¡ROBOT ASISTENTE ENSAMBLADO CON ÉXITO!', {
      fontSize: '17px',
      color: '#60a5fa',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    const details = this.add.text(0, -35, '', {
      fontSize: '13px',
      color: '#e2e8f0',
      align: 'center',
      fontFamily: 'sans-serif',
      lineSpacing: 8
    }).setOrigin(0.5);
    details.setName('detailsText');

    const scoreBadge = this.add.text(0, 50, '', {
      fontSize: '20px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
    scoreBadge.setName('scoreBadge');

    const finishBtn = this.add.rectangle(0, 110, 260, 42, 0x2563eb).setInteractive({ useHandCursor: true });
    finishBtn.setStrokeStyle(1, 0x60a5fa);
    const finishTxt = this.add.text(0, 110, 'Guardar y Continuar', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.completedModal.add([mBg, title, details, scoreBadge, finishBtn, finishTxt]);
  }

  private showCompletionModal(metrics: MinigameMetrics) {
    this.completedModal.setVisible(true);

    const detailsText = this.completedModal.getByName('detailsText') as Phaser.GameObjects.Text;
    const scoreBadge = this.completedModal.getByName('scoreBadge') as Phaser.GameObjects.Text;

    detailsText.setText(
      `Precisión de Ranura: ${metrics.details['Precisión Promedio']} | Montaje: ${metrics.details['Orden Lógico']}\n` +
      `Programas Ejecutados: ${metrics.details['Programas Ejecutados']} | Control de Inercia: ${metrics.details['Control Cinemático']}\n\n` +
      `${metrics.feedbackSummary}`
    );

    scoreBadge.setText(`Puntuación de Afinidad Técnica: ${metrics.primaryScore} / 100`);

    const finishBtn = this.completedModal.list[4] as Phaser.GameObjects.Rectangle;
    finishBtn.removeAllListeners('pointerdown');
    finishBtn.on('pointerdown', () => {
      this.closeMinigame(metrics);
    });
  }

  public closeMinigame(metrics?: MinigameMetrics) {
    if (metrics && this.onCompleteCallback) {
      this.onCompleteCallback(metrics);
    } else if (!metrics && this.onCancelCallback) {
      this.onCancelCallback();
    }
    this.scene.stop('RoboticsMinigameScene');
    this.scene.resume('SpaceShipScene');
  }
}
