import * as Phaser from 'phaser';
import { MinigameMetrics } from '../../types/vocational';

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
  private targetClawX = 512;
  private targetClawY = 340;
  private clawX = 512;
  private clawY = 340;
  private elbowX = 512;
  private elbowY = 260;
  private prevClawX = 512;
  private prevClawY = 340;

  // Cuerpo físico de la pinza/imán
  private clawBody!: MatterJS.BodyType;
  private armGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;

  // Electroimán y agarre
  private isMagnetActive = false;
  private isClickLocked = false;
  private heldPart: RobotPart | null = null;
  private pointerDownTime = 0;
  private pointerDownPos = { x: 0, y: 0 };

  // Piezas y Chasis
  private parts: RobotPart[] = [];
  private installedOrder: number[] = [];
  private totalParts = 3;
  private roughMovesCount = 0;
  private startTime = 0;

  // UI
  private statusText!: Phaser.GameObjects.Text;
  private accuracyText!: Phaser.GameObjects.Text;
  private sequenceText!: Phaser.GameObjects.Text;
  private magnetStatusText!: Phaser.GameObjects.Text;
  private completedModal!: Phaser.GameObjects.Container;

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
    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 25, '🤖 BAHÍA DE ENSAMBLAJE // MONTAJE CINEMÁTICO DE PRECISIÓN', {
      fontSize: '17px',
      color: '#60a5fa',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 50, 'Guía el brazo articulado con el cursor para transportar los componentes al chasis del robot asistente.\nMantén pulsado el ratón (o haz clic) para activar el electroimán y encajar las piezas en sus ranuras.', {
      fontSize: '12px',
      color: '#94a3b8',
      fontFamily: 'sans-serif',
      lineSpacing: 4
    });

    // Botón Salir
    const cancelBtn = this.add.rectangle(this.panelX + this.panelWidth / 2 - 70, this.panelY - this.panelHeight / 2 + 30, 90, 30, 0x334155).setInteractive({ useHandCursor: true });
    cancelBtn.setStrokeStyle(1, 0x64748b);
    this.add.text(cancelBtn.x, cancelBtn.y, 'Cerrar', { fontSize: '12px', color: '#f1f5f9', fontStyle: 'bold' }).setOrigin(0.5);
    cancelBtn.on('pointerdown', () => this.closeMinigame());

    // 3. Establecer límites físicos
    const minX = this.panelX - this.panelWidth / 2 + 20;
    const maxX = this.panelX + this.panelWidth / 2 - 20;
    const minY = this.panelY - this.panelHeight / 2 + 100;
    const maxY = this.panelY + this.panelHeight / 2 - 60;
    this.matter.world.setBounds(minX, minY, maxX - minX, maxY - minY, 32, true, true, true, true);

    // 4. Mesa de trabajo y Soporte del chasis
    this.setupWorkbench();

    // 5. Crear el brazo cinemático y gráficos
    this.armGraphics = this.add.graphics();
    this.fxGraphics = this.add.graphics();
    this.setupRoboticArm();

    // 6. Crear las piezas físicas y slots
    this.setupPartsAndSlots();

    // 7. HUD
    this.setupHUD();

    // 8. Controles con puntero
    this.setupInputHandlers();

    // 9. Modal de finalización
    this.createCompletionModal();
  }

  private setupWorkbench() {
    const tableY = this.panelY + 140;

    // Mesa izquierda (Banco de Piezas)
    const tableLeft = this.add.rectangle(this.panelX - 240, tableY, 260, 24, 0x1e293b);
    tableLeft.setStrokeStyle(2, 0x475569);
    this.matter.add.rectangle(tableLeft.x, tableLeft.y, 260, 24, { isStatic: true, restitution: 0.1 });
    this.add.text(tableLeft.x, tableLeft.y + 24, 'BANCO DE PIEZAS', { fontSize: '10px', color: '#94a3b8', fontStyle: 'bold' }).setOrigin(0.5);

    // Mesa derecha (Chasis del robot)
    const tableRight = this.add.rectangle(this.panelX + 220, tableY, 280, 24, 0x1e293b);
    tableRight.setStrokeStyle(2, 0x3b82f6);
    this.matter.add.rectangle(tableRight.x, tableRight.y, 280, 24, { isStatic: true, restitution: 0.1 });

    // Dibujar chasis del robot asistente
    const robotChassis = this.add.rectangle(this.panelX + 220, tableY - 60, 180, 95, 0x0f172a);
    robotChassis.setStrokeStyle(2, 0x60a5fa);
    this.add.text(this.panelX + 220, tableY - 118, '🤖 ROBOT ASISTENTE M-4', { fontSize: '11px', color: '#93c5fd', fontStyle: 'bold' }).setOrigin(0.5);
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

  private drawPartGraphic(g: Phaser.GameObjects.Graphics, width: number, height: number, color: number) {
    g.clear();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 4);
    g.lineStyle(1.5, 0xffffff, 0.9);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);

    // Detalle estético interior de componente electrónico
    g.lineStyle(1, 0xffffff, 0.35);
    g.strokeCircle(0, 0, Math.min(width, height) / 4);
  }

  private setupHUD() {
    const barY = this.panelY + this.panelHeight / 2 - 35;
    const startX = this.panelX - this.panelWidth / 2 + 40;

    this.statusText = this.add.text(startX, barY, 'Instaladas: 0 / 3', {
      fontSize: '13px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.accuracyText = this.add.text(startX + 180, barY, 'Precisión de Encaje: --', {
      fontSize: '13px',
      color: '#60a5fa',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.sequenceText = this.add.text(startX + 400, barY, 'Secuencia Lógica: Correcta', {
      fontSize: '13px',
      color: '#34d399',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.magnetStatusText = this.add.text(startX + 620, barY, 'Imán: Inactivo', {
      fontSize: '13px',
      color: '#94a3b8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });
  }

  private setupInputHandlers() {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Movimiento libre en la bahía de ensamblaje
      const clampedX = Phaser.Math.Clamp(pointer.x, this.panelX - this.panelWidth / 2 + 60, this.panelX + this.panelWidth / 2 - 60);
      const clampedY = Phaser.Math.Clamp(pointer.y, this.panelY - 60, this.panelY + 135);
      this.targetClawX = clampedX;
      this.targetClawY = clampedY;

      // Si el imán está activo (arrastrando) y no lleva pieza, comprobar si toca una pieza
      if (this.isMagnetActive && !this.heldPart) {
        this.checkAndGrabPart(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Si ya teníamos una pieza sostenida mediante modo clic/tap, este clic la suelta
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

      // Intentar enganchar pieza cercana o sobre la que se hizo clic
      if (!this.heldPart) {
        this.checkAndGrabPart(pointer.x, pointer.y);
      }
      this.updateHUDText();
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const duration = Date.now() - this.pointerDownTime;
      const distMoved = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.pointerDownPos.x, this.pointerDownPos.y);

      if (this.heldPart) {
        // Si arrastró el ratón (más de 220ms o más de 12px de recorrido), se suelta al levantar el botón
        if (duration > 220 || distMoved > 12) {
          this.releasePart();
          this.isClickLocked = false;
          this.isMagnetActive = false;
        } else {
          // Fue un clic rápido: dejarla agarrada (modo sticky) para facilitar la accesibilidad
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

  private grabPart(part: RobotPart) {
    this.heldPart = part;
    this.isMagnetActive = true;

    // Destello de agarre magnético
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

  private releasePart() {
    if (!this.heldPart) return;

    const part = this.heldPart;
    this.heldPart = null;

    // Verificar si se soltó cerca de su ranura en el chasis (rango de 50px)
    const distToSlot = Phaser.Math.Distance.Between(part.body.position.x, part.body.position.y, part.slotX, part.slotY);

    if (distToSlot <= 50) {
      this.snapPartIntoSlot(part, distToSlot);
    } else {
      // Dejar caer libremente sobre la mesa con gravedad
      this.matter.body.setStatic(part.body, false);
      this.matter.body.setVelocity(part.body, { x: 0, y: 1 });
    }

    this.updateHUDText();
  }

  private snapPartIntoSlot(part: RobotPart, distToSlot: number) {
    part.installed = true;
    part.hitZone.disableInteractive();
    this.installedOrder.push(part.expectedOrder);

    // Precisión de encaje
    const accuracy = Math.max(70, Math.round(100 - (distToSlot * 0.6)));
    part.accuracy = accuracy;

    // Fijar sólidamente en el socket receptor
    this.matter.body.setPosition(part.body, { x: part.slotX, y: part.slotY });
    this.matter.body.setAngle(part.body, 0);
    this.matter.body.setStatic(part.body, true);

    // Destello de montaje exitoso
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

    // Verificar si el orden es correcto (1 -> 2 -> 3)
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
  private solveIK(targetX: number, targetY: number): { elbow: Phaser.Math.Vector2; claw: Phaser.Math.Vector2 } {
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

    // Ley de cosenos: L2^2 = L1^2 + clampedDist^2 - 2 * L1 * clampedDist * cos(alpha)
    const cosAlpha = (L1 * L1 + clampedDist * clampedDist - L2 * L2) / (2 * L1 * clampedDist);
    const clampedCosAlpha = Phaser.Math.Clamp(cosAlpha, -1, 1);
    const alpha = Math.acos(clampedCosAlpha);

    // Orientación del codo
    const theta1 = angleToTarget - alpha;

    const elbowX = shoulderX + L1 * Math.cos(theta1);
    const elbowY = shoulderY + L1 * Math.sin(theta1);

    return {
      elbow: new Phaser.Math.Vector2(elbowX, elbowY),
      claw: new Phaser.Math.Vector2(effClawX, effClawY)
    };
  }

  update(_time: number, delta: number) {
    // 1. El pórtico superior (trolley) sigue suavemente la posición X objetivo
    const targetTrolleyX = Phaser.Math.Clamp(this.targetClawX, this.trolleyMinX, this.trolleyMaxX);
    const lerpFactor = Math.min(1, (delta / 1000) * 14);
    this.trolleyX = Phaser.Math.Linear(this.trolleyX, targetTrolleyX, lerpFactor);

    // 2. Resolver cinemática inversa del brazo
    const ik = this.solveIK(this.targetClawX, this.targetClawY);
    this.clawX = ik.claw.x;
    this.clawY = ik.claw.y;
    this.elbowX = ik.elbow.x;
    this.elbowY = ik.elbow.y;

    // Sincronizar cuerpo físico de la pinza
    this.matter.body.setPosition(this.clawBody, { x: this.clawX, y: this.clawY });

    // Detección de movimientos bruscos para cálculo de destreza cinemática
    const clawSpeed = Phaser.Math.Distance.Between(this.clawX, this.clawY, this.prevClawX, this.prevClawY);
    if (clawSpeed > 24) {
      this.roughMovesCount += 0.05;
    }
    this.prevClawX = this.clawX;
    this.prevClawY = this.clawY;

    // 3. Si hay una pieza sujetada por el imán, transportarla rígidamente con la pinza
    if (this.heldPart) {
      const part = this.heldPart;
      const holdY = this.clawY + part.height / 2 + 10;
      this.matter.body.setPosition(part.body, { x: this.clawX, y: holdY });
      this.matter.body.setVelocity(part.body, { x: 0, y: 0 });
      this.matter.body.setAngle(part.body, 0);
      this.matter.body.setAngularVelocity(part.body, 0);
    }

    // 4. Sincronizar gráficos de las piezas
    for (const p of this.parts) {
      p.graphic.setPosition(p.body.position.x, p.body.position.y);
      p.graphic.setRotation(p.body.angle);
      p.hitZone.setPosition(p.body.position.x, p.body.position.y);
    }

    // 5. Renderizado visual del pórtico, riel, articulaciones y electroimán
    this.drawArmAndGantry();
  }

  private drawArmAndGantry() {
    this.armGraphics.clear();
    this.fxGraphics.clear();

    const railY = this.railY;
    const railMinX = this.panelX - 330;
    const railMaxX = this.panelX + 330;
    const sx = this.trolleyX;
    const sy = railY + 16;
    const ex = this.elbowX;
    const ey = this.elbowY;
    const cx = this.clawX;
    const cy = this.clawY;

    // A. Riel Horizontal Superior (Gantry Track)
    // Soportes de fijación al techo
    const bracketXPositions = [this.panelX - 260, this.panelX - 90, this.panelX + 90, this.panelX + 260];
    this.armGraphics.lineStyle(3, 0x1e293b, 1);
    bracketXPositions.forEach(bx => {
      this.armGraphics.lineBetween(bx, this.panelY - this.panelHeight / 2 + 80, bx, railY - 10);
      this.armGraphics.fillStyle(0x334155, 1);
      this.armGraphics.fillCircle(bx, railY - 10, 4);
    });

    // Viga principal del riel
    this.armGraphics.fillStyle(0x0f172a, 1);
    this.armGraphics.fillRect(railMinX, railY - 10, railMaxX - railMinX, 20);
    this.armGraphics.lineStyle(2, 0x334155, 1);
    this.armGraphics.strokeRect(railMinX, railY - 10, railMaxX - railMinX, 20);

    // Guías metálicas cromadas del riel
    this.armGraphics.lineStyle(3, 0x475569, 1);
    this.armGraphics.lineBetween(railMinX + 5, railY - 6, railMaxX - 5, railY - 6);
    this.armGraphics.lineBetween(railMinX + 5, railY + 6, railMaxX - 5, railY + 6);
    this.armGraphics.lineStyle(1.5, 0x94a3b8, 0.7);
    this.armGraphics.lineBetween(railMinX + 8, railY - 6, railMaxX - 8, railY - 6);

    // Topes de seguridad laterales
    this.armGraphics.fillStyle(0xef4444, 1);
    this.armGraphics.fillRect(railMinX - 4, railY - 12, 6, 24);
    this.armGraphics.fillRect(railMaxX - 2, railY - 12, 6, 24);

    // B. Carro Deslizante del Pórtico (Trolley)
    this.armGraphics.fillStyle(0x1e293b, 1);
    this.armGraphics.fillRoundedRect(sx - 30, railY - 14, 60, 28, 5);
    this.armGraphics.lineStyle(2, 0x3b82f6, 1);
    this.armGraphics.strokeRoundedRect(sx - 30, railY - 14, 60, 28, 5);

    // Ruedas/Rodamientos del carro
    const wheels = [
      { x: sx - 18, y: railY - 10 },
      { x: sx + 18, y: railY - 10 },
      { x: sx - 18, y: railY + 10 },
      { x: sx + 18, y: railY + 10 }
    ];
    this.armGraphics.fillStyle(0x64748b, 1);
    wheels.forEach(w => {
      this.armGraphics.fillCircle(w.x, w.y, 4.5);
      this.armGraphics.lineStyle(1, 0x94a3b8, 1);
      this.armGraphics.strokeCircle(w.x, w.y, 4.5);
    });

    // Indicador LED de estado en el carro
    this.armGraphics.fillStyle(this.isMagnetActive ? 0x38bdf8 : 0x10b981, 1);
    this.armGraphics.fillCircle(sx, railY - 4, 3.5);

    // Base del hombro conectada al carro
    this.armGraphics.fillStyle(0x334155, 1);
    this.armGraphics.fillRect(sx - 9, railY + 10, 18, 9);
    this.armGraphics.lineStyle(1.5, 0x60a5fa, 1);
    this.armGraphics.strokeRect(sx - 9, railY + 10, 18, 9);

    // C. Eslabón Superior (Húmero)
    this.armGraphics.lineStyle(15, 0x1e293b, 1);
    this.armGraphics.lineBetween(sx, sy, ex, ey);
    this.armGraphics.lineStyle(5, 0x2563eb, 0.95);
    this.armGraphics.lineBetween(sx, sy, ex, ey);
    this.armGraphics.lineStyle(2, 0x93c5fd, 0.85);
    this.armGraphics.lineBetween(sx, sy, ex, ey);

    // D. Eslabón Inferior (Antebrazo)
    this.armGraphics.lineStyle(13, 0x1e293b, 1);
    this.armGraphics.lineBetween(ex, ey, cx, cy);
    this.armGraphics.lineStyle(4, 0x38bdf8, 0.95);
    this.armGraphics.lineBetween(ex, ey, cx, cy);
    this.armGraphics.lineStyle(1.5, 0xe0f2fe, 0.85);
    this.armGraphics.lineBetween(ex, ey, cx, cy);

    // E. Articulaciones Rotativas
    // Hombro
    this.armGraphics.fillStyle(0x334155, 1);
    this.armGraphics.fillCircle(sx, sy, 11);
    this.armGraphics.lineStyle(2, 0x60a5fa, 1);
    this.armGraphics.strokeCircle(sx, sy, 11);
    this.armGraphics.fillStyle(0x93c5fd, 1);
    this.armGraphics.fillCircle(sx, sy, 4);

    // Codo
    this.armGraphics.fillStyle(0x334155, 1);
    this.armGraphics.fillCircle(ex, ey, 10);
    this.armGraphics.lineStyle(2, 0x60a5fa, 1);
    this.armGraphics.strokeCircle(ex, ey, 10);
    this.armGraphics.fillStyle(0x93c5fd, 1);
    this.armGraphics.fillCircle(ex, ey, 3.5);

    // Muñeca
    this.armGraphics.fillStyle(0x334155, 1);
    this.armGraphics.fillCircle(cx, cy, 8);
    this.armGraphics.lineStyle(2, 0x38bdf8, 1);
    this.armGraphics.strokeCircle(cx, cy, 8);

    // F. Cabezal del Electroimán
    const magnetColor = this.isMagnetActive ? 0x38bdf8 : 0x475569;
    this.armGraphics.fillStyle(0x1e293b, 1);
    this.armGraphics.fillRoundedRect(cx - 15, cy + 3, 30, 13, 3);
    this.armGraphics.lineStyle(1.5, magnetColor, 1);
    this.armGraphics.strokeRoundedRect(cx - 15, cy + 3, 30, 13, 3);

    // Polos magnéticos
    this.armGraphics.fillStyle(magnetColor, 1);
    this.armGraphics.fillRect(cx - 13, cy + 15, 6, 7);
    this.armGraphics.fillRect(cx + 7, cy + 15, 6, 7);

    // G. Efectos Visuales del Campo Magnético y Haz de Energía
    if (this.isMagnetActive) {
      // Núcleo brillante
      this.armGraphics.fillStyle(0x38bdf8, 1);
      this.armGraphics.fillCircle(cx, cy + 9, 4);
      this.armGraphics.fillStyle(0xffffff, 1);
      this.armGraphics.fillCircle(cx, cy + 9, 2);

      // Halo resplandeciente
      this.fxGraphics.fillStyle(0x38bdf8, 0.2);
      this.fxGraphics.fillCircle(cx, cy + 16, 28);
      this.fxGraphics.fillStyle(0x0284c7, 0.35);
      this.fxGraphics.fillCircle(cx, cy + 16, 16);
      this.fxGraphics.lineStyle(2, 0x38bdf8, 0.7);
      this.fxGraphics.strokeCircle(cx, cy + 16, 22);

      // Ondas de flujo magnético hacia abajo
      this.fxGraphics.lineStyle(2, 0x38bdf8, 0.85);
      this.fxGraphics.arc(cx, cy + 16, 13, Phaser.Math.DegToRad(35), Phaser.Math.DegToRad(145), false);
      this.fxGraphics.strokePath();
      this.fxGraphics.arc(cx, cy + 16, 22, Phaser.Math.DegToRad(45), Phaser.Math.DegToRad(135), false);
      this.fxGraphics.strokePath();

      // Haz que vincula el electroimán con la pieza transportada
      if (this.heldPart) {
        const partTopY = this.heldPart.body.position.y - this.heldPart.height / 2;
        this.fxGraphics.lineStyle(2.5, 0x7dd3fc, 0.95);
        this.fxGraphics.lineBetween(cx - 10, cy + 20, cx - 10, partTopY);
        this.fxGraphics.lineBetween(cx + 10, cy + 20, cx + 10, partTopY);
        this.fxGraphics.lineStyle(1.5, 0xffffff, 1);
        this.fxGraphics.lineBetween(cx, cy + 16, cx, partTopY);
      }
    } else {
      this.armGraphics.fillStyle(0x0f172a, 1);
      this.armGraphics.fillCircle(cx, cy + 9, 3);
    }
  }

  private triggerVictory() {
    const elapsedSeconds = Math.round((Date.now() - this.startTime) / 1000);

    const avgAccuracy = Math.round(this.parts.reduce((acc, p) => acc + p.accuracy, 0) / this.totalParts);
    const isSequential = this.installedOrder.every((val, idx) => val === idx + 1);
    const sequenceBonus = isSequential ? 15 : 0;
    const roughPenalty = Math.min(20, Math.round(this.roughMovesCount));

    const primaryDevScore = Math.max(50, Math.min(100, Math.round(
      (avgAccuracy * 0.6) + sequenceBonus + (25 - roughPenalty)
    )));

    const metrics: MinigameMetrics = {
      primaryScore: primaryDevScore,
      secondaryBranch: 'sec',
      secondaryScore: avgAccuracy >= 90 ? 88 : 72,
      details: {
        'Precisión Promedio': `${avgAccuracy}%`,
        'Orden Lógico': isSequential ? 'Secuencia Óptima (100%)' : 'Alternativo (75%)',
        'Control Cinemático': `${Math.max(60, 100 - roughPenalty)}%`,
        'Tiempo de Montaje': `${elapsedSeconds} seg`
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
      `Control de Inercia: ${metrics.details['Control Cinemático']}\n\n` +
      `${metrics.feedbackSummary}`
    );

    scoreBadge.setText(`Puntuación de Afinidad Técnica: ${metrics.primaryScore} / 100`);

    const finishBtn = this.completedModal.list[4] as Phaser.GameObjects.Rectangle;
    finishBtn.removeAllListeners('pointerdown');
    finishBtn.on('pointerdown', () => {
      this.closeMinigame(metrics);
    });
  }

  private closeMinigame(metrics?: MinigameMetrics) {
    if (metrics && this.onCompleteCallback) {
      this.onCompleteCallback(metrics);
    } else if (!metrics && this.onCancelCallback) {
      this.onCancelCallback();
    }
    this.scene.stop('RoboticsMinigameScene');
    this.scene.resume('SpaceShipScene');
  }
}
