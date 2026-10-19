import * as Phaser from 'phaser';
import { MinigameMetrics, VocationalScores } from '../../types/vocational';

interface CableData {
  id: number;
  name: string;
  color: number;
  colorHex: string;
  sourceY: number;
  targetY: number;
  links: MatterJS.BodyType[];
  constraints: MatterJS.ConstraintType[];
  tipBody: MatterJS.BodyType;
  anchorBody: MatterJS.BodyType;
  connected: boolean;
  maxTensionRecorded: number;
  touchingInterference: boolean;
}

export class NetworkMinigameScene extends Phaser.Scene {
  private panelWidth = 860;
  private panelHeight = 540;
  private panelX = 512;
  private panelY = 320;

  private cables: CableData[] = [];
  private activeDragCable: CableData | null = null;
  private dragConstraint: MatterJS.ConstraintType | null = null;
  private mouseDummyBody!: MatterJS.BodyType;

  private graphics!: Phaser.GameObjects.Graphics;
  private interferenceBody!: MatterJS.BodyType;

  // Métricas numéricas
  private signalQuality = 100;
  private totalOverTension = 0;
  private connectionsCount = 0;
  private simulatedLatency = 38; // ms inicial
  private startTime = 0;

  // Métricas de Stealth Assessment (Landers 2024 / Shute 2011)
  private failedConnectAttempts = 0;
  private connectionOrder: number[] = [];

  // UI Texts
  private statusText!: Phaser.GameObjects.Text;
  private signalText!: Phaser.GameObjects.Text;
  private latencyText!: Phaser.GameObjects.Text;
  private tensionText!: Phaser.GameObjects.Text;
  private completedModal!: Phaser.GameObjects.Container;

  private onCompleteCallback?: (metrics: MinigameMetrics) => void;
  private onCancelCallback?: () => void;

  constructor() {
    super({
      key: 'NetworkMinigameScene',
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 0.4 },
          debug: false
        }
      }
    });
  }

  init(data: { onComplete?: (metrics: MinigameMetrics) => void; onCancel?: () => void }) {
    this.onCompleteCallback = data.onComplete;
    this.onCancelCallback = data.onCancel;
    this.signalQuality = 100;
    this.totalOverTension = 0;
    this.connectionsCount = 0;
    this.simulatedLatency = 38;
    this.cables = [];
    this.activeDragCable = null;
    this.dragConstraint = null;
    this.failedConnectAttempts = 0;
    this.connectionOrder = [];
  }

  create() {
    this.startTime = Date.now();
    const { width, height } = this.scale;

    // 1. Fondo oscurecido modal
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.88);
    overlay.setInteractive();

    // 2. Chasis del Rack de Redes
    const frame = this.add.rectangle(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 0x0f172a, 0.96);
    frame.setStrokeStyle(3, 0x10b981);

    // Cabecera holográfica
    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 25, '🖧 CONSOLA DE TELECOMUNICACIONES // ENLACE DE FIBRA', {
      fontSize: '17px',
      color: '#34d399',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 50, 'Arrastra las puntas de los 3 cables elásticos hacia sus puertos receptores correspondientes.\nEvita dar tirones excesivos y no toques la bobina de interferencia térmica central.', {
      fontSize: '12px',
      color: '#94a3b8',
      fontFamily: 'sans-serif',
      lineSpacing: 4
    });

    // Botón Salir / Cancelar
    const cancelBtn = this.add.rectangle(this.panelX + this.panelWidth / 2 - 70, this.panelY - this.panelHeight / 2 + 30, 90, 30, 0x334155).setInteractive({ useHandCursor: true });
    cancelBtn.setStrokeStyle(1, 0x64748b);
    cancelBtn.on('pointerdown', () => {
      this.closeMinigame();
    });

    // 3. Paneles de métricas en vivo en la parte inferior
    this.setupHUD();

    // 4. Gráficos para dibujar los cables elásticos
    this.graphics = this.add.graphics();

    // 5. Configurar límites físicos de la caja del minijuego
    const minX = this.panelX - this.panelWidth / 2 + 20;
    const maxX = this.panelX + this.panelWidth / 2 - 20;
    const minY = this.panelY - this.panelHeight / 2 + 100;
    const maxY = this.panelY + this.panelHeight / 2 - 60;

    // Paredes del rack
    this.matter.world.setBounds(minX, minY, maxX - minX, maxY - minY, 32, true, true, true, true);

    // 6. Obstáculos físicos internos (Postes guías y Bobina térmica)
    this.setupObstacles();

    // 7. Crear los 3 Cables con física de resortes y masa
    this.setupCables();

    // 8. Dummy body para arrastre suave con resorte al puntero
    this.mouseDummyBody = this.matter.add.circle(0, 0, 5, { isStatic: true, isSensor: true });

    // 9. Manejadores de Input de Ratón
    this.setupInputHandlers();

    // 10. Modal de finalización
    this.createCompletionModal();
  }

  private setupHUD() {
    const barY = this.panelY + this.panelHeight / 2 - 35;
    const startX = this.panelX - this.panelWidth / 2 + 40;

    this.statusText = this.add.text(startX, barY, 'Conectados: 0 / 3', {
      fontSize: '13px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.signalText = this.add.text(startX + 180, barY, 'Calidad Señal: 100%', {
      fontSize: '13px',
      color: '#34d399',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.latencyText = this.add.text(startX + 380, barY, 'Latencia: 38 ms', {
      fontSize: '13px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.tensionText = this.add.text(startX + 550, barY, 'Tensión Física: Estable', {
      fontSize: '13px',
      color: '#a7f3d0',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });
  }

  private setupObstacles() {
    const cx = this.panelX;
    const cy = this.panelY + 20;

    // Bobina de interferencia térmica en el centro
    const coilBg = this.add.rectangle(cx, cy, 64, 90, 0x7f1d1d, 0.7);
    coilBg.setStrokeStyle(2, 0xef4444);
    this.add.text(cx, cy - 25, '⚠\nCALOR', { fontSize: '10px', color: '#fca5a5', align: 'center', fontStyle: 'bold' }).setOrigin(0.5);

    this.interferenceBody = this.matter.add.rectangle(cx, cy, 64, 90, {
      isStatic: true,
      label: 'coil'
    });

    // Dos postes guías con fricción
    const pin1 = this.matter.add.circle(cx - 130, cy - 40, 14, { isStatic: true, label: 'guide' });
    const pin2 = this.matter.add.circle(cx + 130, cy + 40, 14, { isStatic: true, label: 'guide' });

    [pin1, pin2].forEach(p => {
      this.add.circle(p.position.x, p.position.y, 14, 0x334155).setStrokeStyle(2, 0x38bdf8);
      this.add.circle(p.position.x, p.position.y, 5, 0x0f172a);
    });
  }

  private setupCables() {
    const sourceX = this.panelX - this.panelWidth / 2 + 55;
    const targetX = this.panelX + this.panelWidth / 2 - 55;

    const configs = [
      { id: 1, name: 'Enlace Primario (Datos)', color: 0x3b82f6, colorHex: '#38bdf8', sourceY: this.panelY - 60, targetY: this.panelY - 60 },
      { id: 2, name: 'Canal Holográfico', color: 0x10b981, colorHex: '#34d399', sourceY: this.panelY + 15, targetY: this.panelY + 15 },
      { id: 3, name: 'Línea de Emergencia', color: 0xf59e0b, colorHex: '#fbbf24', sourceY: this.panelY + 90, targetY: this.panelY + 90 }
    ];

    configs.forEach((conf, idx) => {
      // 1. Dibujar Puertos en los marcos
      // Puerto Origen
      this.add.rectangle(sourceX - 10, conf.sourceY, 32, 28, 0x1e293b).setStrokeStyle(2, conf.color);
      this.add.text(sourceX - 35, conf.sourceY, `P${idx + 1}`, { fontSize: '10px', color: '#94a3b8', fontStyle: 'bold' }).setOrigin(0.5);

      // Puerto Destino
      this.add.rectangle(targetX + 10, conf.targetY, 32, 28, 0x1e293b).setStrokeStyle(2, conf.color);
      this.add.circle(targetX + 10, conf.targetY, 6, conf.color, 0.4);
      this.add.text(targetX + 35, conf.targetY, `N${idx + 1}`, { fontSize: '10px', color: conf.colorHex, fontStyle: 'bold' }).setOrigin(0.5);

      // 2. Crear Cuerpos de Matter para el cable elástico
      const group = this.matter.world.nextGroup(true); // Grupo negativo para evitar auto-colisión interna
      const anchor = this.matter.add.circle(sourceX, conf.sourceY, 8, {
        isStatic: true,
        collisionFilter: { group }
      });

      const segmentCount = 9;
      const segmentDistance = 14;
      const links: MatterJS.BodyType[] = [];
      const constraints: MatterJS.ConstraintType[] = [];

      let prevBody = anchor;

      for (let i = 0; i < segmentCount; i++) {
        const linkX = sourceX + (i + 1) * segmentDistance;
        const linkY = conf.sourceY + Math.sin(i * 0.4) * 6;
        const isTip = i === segmentCount - 1;

        const body = this.matter.add.circle(linkX, linkY, isTip ? 11 : 5, {
          mass: isTip ? 0.35 : 0.08,
          frictionAir: 0.06,
          restitution: 0.1,
          collisionFilter: { group },
          label: isTip ? `cable_tip_${conf.id}` : `cable_link_${conf.id}`
        });

        links.push(body);

        const constraint = this.matter.add.constraint(prevBody, body, segmentDistance, 0.85, {
          damping: 0.12
        });
        constraints.push(constraint);

        prevBody = body;
      }

      const tipBody = links[links.length - 1];

      this.cables.push({
        id: conf.id,
        name: conf.name,
        color: conf.color,
        colorHex: conf.colorHex,
        sourceY: conf.sourceY,
        targetY: conf.targetY,
        links,
        constraints,
        tipBody,
        anchorBody: anchor,
        connected: false,
        maxTensionRecorded: 0,
        touchingInterference: false
      });
    });
  }

  private setupInputHandlers() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.activeDragCable) return;

      // Buscar si hizo clic cerca de una de las puntas de cables no conectados
      for (const cable of this.cables) {
        if (cable.connected) continue;

        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, cable.tipBody.position.x, cable.tipBody.position.y);
        if (dist <= 26) {
          this.activeDragCable = cable;
          this.matter.body.setPosition(this.mouseDummyBody, { x: pointer.x, y: pointer.y });
          this.dragConstraint = this.matter.add.constraint(this.mouseDummyBody, cable.tipBody, 0, 0.25, {
            damping: 0.08
          });
          break;
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.activeDragCable && this.mouseDummyBody) {
        this.matter.body.setPosition(this.mouseDummyBody, { x: pointer.x, y: pointer.y });
      }
    });

    this.input.on('pointerup', () => {
      this.releaseCurrentDrag();
    });
  }

  private releaseCurrentDrag() {
    if (!this.activeDragCable) return;

    const cable = this.activeDragCable;

    if (this.dragConstraint) {
      this.matter.world.removeConstraint(this.dragConstraint);
      this.dragConstraint = null;
    }

    // Verificar si la punta está suficientemente cerca del puerto destino
    const targetX = this.panelX + this.panelWidth / 2 - 55;
    const targetY = cable.targetY;
    const distToTarget = Phaser.Math.Distance.Between(cable.tipBody.position.x, cable.tipBody.position.y, targetX, targetY);

    if (distToTarget <= 32) {
      // Conectar con éxito
      this.snapCableToTarget(cable, targetX, targetY);
    } else {
      // Stealth Assessment: Intento fallido de inserción
      this.failedConnectAttempts++;
    }

    this.activeDragCable = null;
  }

  private snapCableToTarget(cable: CableData, targetX: number, targetY: number) {
    cable.connected = true;
    this.connectionsCount++;
    this.connectionOrder.push(cable.id);

    // Bloquear físicamente en el puerto
    this.matter.body.setPosition(cable.tipBody, { x: targetX, y: targetY });
    this.matter.body.setStatic(cable.tipBody, true);

    // Efecto de destello de acople
    const flash = this.add.circle(targetX, targetY, 20, cable.color, 0.8);
    this.tweens.add({
      targets: flash,
      scale: 2.2,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy()
    });

    // Mejorar latencia con cada conexión
    this.simulatedLatency = Math.max(8, this.simulatedLatency - 10);
    this.latencyText.setText(`Latencia: ${this.simulatedLatency} ms`);
    this.statusText.setText(`Conectados: ${this.connectionsCount} / 3`);

    // Si conectó los 3, evaluar y mostrar victoria
    if (this.connectionsCount >= 3) {
      this.time.delayedCall(700, () => {
        this.triggerVictory();
      });
    }
  }

  update() {
    this.graphics.clear();

    let anyHighTension = false;

    // 1. Dibujar los 3 cables elásticos y monitorear tensión física
    for (const cable of this.cables) {
      const points: { x: number; y: number }[] = [
        { x: cable.anchorBody.position.x, y: cable.anchorBody.position.y }
      ];

      for (const link of cable.links) {
        points.push({ x: link.position.x, y: link.position.y });
      }

      // Medir estiramiento de constraints (tensión)
      let cableTensionAccum = 0;
      for (const c of cable.constraints) {
        if (c.bodyA && c.bodyB) {
          const pA = c.bodyA.position;
          const pB = c.bodyB.position;
          const curLen = Phaser.Math.Distance.Between(pA.x, pA.y, pB.x, pB.y);
          const stretch = Math.max(0, curLen - (c.length || 14));
          cableTensionAccum += stretch;
        }
      }

      if (cableTensionAccum > 25) {
        anyHighTension = true;
        this.totalOverTension += 0.2;
      }

      // Dibujar cable suave
      const strokeColor = cable.connected ? cable.color : (anyHighTension ? 0xef4444 : cable.color);
      this.graphics.lineStyle(cable.connected ? 4 : 3, strokeColor, 0.9);
      this.graphics.beginPath();
      this.graphics.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        this.graphics.lineTo(points[i].x, points[i].y);
      }
      this.graphics.strokePath();

      // Destello si está conectado
      if (cable.connected) {
        this.graphics.lineStyle(1.5, 0xffffff, 0.6);
        this.graphics.beginPath();
        this.graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          this.graphics.lineTo(points[i].x, points[i].y);
        }
        this.graphics.strokePath();
      }

      // Dibujar cabezal de la punta
      const tip = cable.tipBody.position;
      this.graphics.fillStyle(cable.connected ? 0x22c55e : 0xf8fafc, 1);
      this.graphics.fillCircle(tip.x, tip.y, 7);
      this.graphics.lineStyle(2, cable.color, 1);
      this.graphics.strokeCircle(tip.x, tip.y, 7);

      // Chequeo de colisión con bobina térmica
      const distToCoil = Phaser.Math.Distance.Between(tip.x, tip.y, this.interferenceBody.position.x, this.interferenceBody.position.y);
      if (distToCoil < 50 && !cable.connected) {
        this.signalQuality = Math.max(40, this.signalQuality - 0.25);
        this.signalText.setText(`Calidad Señal: ${Math.round(this.signalQuality)}%`);
      }
    }

    if (anyHighTension) {
      this.tensionText.setText('Tensión Física: ¡ALTA! (Ten cuidado)');
      this.tensionText.setColor('#f87171');
    } else {
      this.tensionText.setText('Tensión Física: Óptima');
      this.tensionText.setColor('#a7f3d0');
    }
  }

  private triggerVictory() {
    const elapsedSeconds = Math.round((Date.now() - this.startTime) / 1000);
    
    // Cálculo numérico de afinidad
    const tensionPenalty = Math.min(25, Math.round(this.totalOverTension));
    const signalScore = Math.round(this.signalQuality);
    const primaryNetScore = Math.max(50, Math.min(100, Math.round((signalScore * 0.6) + ((100 - tensionPenalty) * 0.4))));

    // Tarea 19 y 22: Puntuación secundaria continua para 'biz' en rango [55, 100]
    const secondaryBizScore = Math.max(55, Math.min(100, Math.round(
      (signalScore * 0.6) + ((100 - tensionPenalty) * 0.4)
    )));

    // Tarea 21: Stealth Assessment (Landers 2024 / Shute 2011)
    const behavioralBonuses: Partial<VocationalScores> = {};
    if (this.failedConnectAttempts === 0) {
      behavioralBonuses.sec = 0.6; // Alta compostura y rigor procedimental
    }
    if (this.connectionOrder.length > 0 && (this.connectionOrder[0] === 1 || this.connectionOrder[0] === 3)) {
      behavioralBonuses.biz = 0.6; // Priorización de líneas críticas antes de ocio
    }
    if (signalScore >= 90) {
      behavioralBonuses.net = 0.5; // Calidad de ruteo y aislamiento de bobina
    }

    const priorityLabel = this.connectionOrder.length > 0
      ? (this.connectionOrder[0] === 3 ? 'Emergencia Primero' : (this.connectionOrder[0] === 1 ? 'Datos Núcleo Primero' : 'Canal Secundario'))
      : 'Estándar';

    const metrics: MinigameMetrics = {
      primaryScore: primaryNetScore,
      secondaryBranch: 'biz',
      secondaryScore: secondaryBizScore,
      behavioralBonuses,
      details: {
        'Latencia Final': `${this.simulatedLatency} ms`,
        'Calidad de Enlace': `${signalScore}%`,
        'Cuidado de Tensión': `${100 - tensionPenalty}%`,
        'Tiempo de Parcheo': `${elapsedSeconds} seg`,
        'Fallos de Inserción': `${this.failedConnectAttempts}`,
        'Estrategia de Ruteo': priorityLabel
      },
      feedbackSummary: `Excelente ruteo físico. Lograste una latencia ultra baja de ${this.simulatedLatency}ms preservando el 100% de los canales sin cortes.`
    };

    this.showCompletionModal(metrics);
  }

  private createCompletionModal() {
    this.completedModal = this.add.container(this.panelX, this.panelY);
    this.completedModal.setVisible(false);
    this.completedModal.setDepth(100);

    const mBg = this.add.rectangle(0, 0, 520, 320, 0x090d16, 0.98);
    mBg.setStrokeStyle(2, 0x10b981);

    const title = this.add.text(0, -115, '✨ ¡ENLACE RESTABLECIDO CON ÉXITO!', {
      fontSize: '17px',
      color: '#34d399',
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

    const finishBtn = this.add.rectangle(0, 110, 260, 42, 0x059669).setInteractive({ useHandCursor: true });
    finishBtn.setStrokeStyle(1, 0x34d399);
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
      `Latencia Obtenida: ${metrics.details['Latencia Final']} | Calidad de Señal: ${metrics.details['Calidad de Enlace']}\n` +
      `Cuidado de Cableado: ${metrics.details['Cuidado de Tensión']}\n\n` +
      `${metrics.feedbackSummary}`
    );

    scoreBadge.setText(`Puntuación de Afinidad Técnica: ${metrics.primaryScore} / 100`);

    // Callback en el botón de guardar
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
    this.scene.stop('NetworkMinigameScene');
    this.scene.resume('SpaceShipScene');
  }
}
