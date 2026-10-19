import * as Phaser from 'phaser';
import { MinigameMetrics, VocationalScores } from '../../types/vocational';

interface PacketItem {
  body: MatterJS.BodyType;
  shapeGraphic: Phaser.GameObjects.Graphics;
  badgeText?: Phaser.GameObjects.Text;
  isThreat: boolean;
  isAmbiguous: boolean;
  isScanned: boolean;
  resolved: boolean;
  spawnTime: number;
}

export class SecurityMinigameScene extends Phaser.Scene {
  private panelWidth = 860;
  private panelHeight = 540;
  private panelX = 512;
  private panelY = 320;

  // Deflector central único (sin hueco)
  private deflectorBody!: MatterJS.BodyType;
  private deflectorGraphic!: Phaser.GameObjects.Rectangle;
  private deflectorPivotGraphic!: Phaser.GameObjects.Arc;
  private targetDeflectorAngle = 0;
  private currentDeflectorAngle = 0;

  // Paquetes y oleadas
  private packets: PacketItem[] = [];
  private totalPacketsToSpawn = 16;
  private spawnedCount = 0;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  public currentWave = 1;

  // Mecánica de Escaneo de Paquetes Ambiguos
  private isScanning = false;
  private scanProgress = 0; // 0 a 1
  private scanBarBg!: Phaser.GameObjects.Rectangle;
  private scanBarFill!: Phaser.GameObjects.Rectangle;
  private scanStatusText!: Phaser.GameObjects.Text;
  private scannedAmbiguousCount = 0;
  private totalAmbiguousCount = 0;

  // Métricas
  private threatsBlocked = 0;
  private totalThreats = 0;
  private cleanDataSaved = 0;
  private totalCleanData = 0;
  private falsePositives = 0;
  private shieldIntegrity = 100;
  private startTime = 0;

  // Stealth Assessment (Landers 2024 / Shute 2011)
  private maxStreak = 0;
  private currentStreak = 0;
  private deflectorAdjustmentsCount = 0;
  private reactionTimesMs: number[] = [];

  // Controles
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;

  // UI
  private threatsText!: Phaser.GameObjects.Text;
  private cleanText!: Phaser.GameObjects.Text;
  private shieldText!: Phaser.GameObjects.Text;
  private fpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private completedModal!: Phaser.GameObjects.Container;

  private onCompleteCallback?: (metrics: MinigameMetrics) => void;
  private onCancelCallback?: () => void;

  constructor() {
    super({
      key: 'SecurityMinigameScene',
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 0.95 },
          debug: false
        }
      }
    });
  }

  init(data: { onComplete?: (metrics: MinigameMetrics) => void; onCancel?: () => void }) {
    this.onCompleteCallback = data.onComplete;
    this.onCancelCallback = data.onCancel;
    this.threatsBlocked = 0;
    this.totalThreats = 0;
    this.cleanDataSaved = 0;
    this.totalCleanData = 0;
    this.falsePositives = 0;
    this.shieldIntegrity = 100;
    this.spawnedCount = 0;
    this.packets = [];
    this.maxStreak = 0;
    this.currentStreak = 0;
    this.deflectorAdjustmentsCount = 0;
    this.reactionTimesMs = [];
    this.scannedAmbiguousCount = 0;
    this.totalAmbiguousCount = 0;
    this.targetDeflectorAngle = 0;
    this.currentDeflectorAngle = 0;
    this.currentWave = 1;
    this.isScanning = false;
    this.scanProgress = 0;
  }

  create() {
    this.startTime = Date.now();
    const { width, height } = this.scale;

    // 1. Overlay oscuro
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.88);
    overlay.setInteractive();

    // 2. Chasis de la estación de seguridad
    const frame = this.add.rectangle(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 0x0f172a, 0.96);
    frame.setStrokeStyle(3, 0xef4444);

    // Cabecera
    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 25, '🛡️ PUESTO DE VIGILANCIA // DEFLECTOR CENTRAL DE FLUJO', {
      fontSize: '17px',
      color: '#f87171',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 48, 'Inclina el deflector central [A / D] para desviar malware a Cuarentena (izq) y datos a Bóveda (der).\nUsa [ESPACIO] para escanear paquetes ambiguos [?] antes de clasificarlos.', {
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

    // 3. Límites físicos del panel
    const minX = this.panelX - this.panelWidth / 2 + 20;
    const maxX = this.panelX + this.panelWidth / 2 - 20;
    const minY = this.panelY - this.panelHeight / 2 + 85;
    const maxY = this.panelY + this.panelHeight / 2 - 40;
    this.matter.world.setBounds(minX, minY, maxX - minX, maxY - minY, 32, true, true, true, true);

    // 4. Configurar embudos, rampas y zonas receptoras
    this.setupChutesAndSensors();

    // 5. Deflector Central Unificado (sin hueco)
    this.setupCentralDeflector();

    // 6. HUD inferior y métricas en pantalla
    this.setupHUD();

    // 7. Configuración de controles (teclado y botones en pantalla)
    this.setupControls();

    // 8. Colisiones y sensores
    this.setupCollisionHandlers();

    // 9. Iniciar el flujo de paquetes por oleadas progresivas
    this.startProgressivePacketStream();

    // 10. Modal de finalización
    this.createCompletionModal();
  }

  private setupChutesAndSensors() {
    const bottomY = this.panelY + this.panelHeight / 2 - 80;
    const leftX = this.panelX - 230;
    const rightX = this.panelX + 230;

    // Cuarentena (Izquierda)
    const qZone = this.add.rectangle(leftX, bottomY, 200, 64, 0x3f1d1d, 0.75);
    qZone.setStrokeStyle(2, 0xef4444);
    this.add.text(leftX, bottomY - 14, '☣ CUARENTENA', { fontSize: '12px', color: '#fca5a5', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(leftX, bottomY + 10, 'Aislamiento de Amenazas', { fontSize: '10px', color: '#f87171' }).setOrigin(0.5);

    this.matter.add.rectangle(leftX, bottomY, 190, 56, {
      isStatic: true,
      isSensor: true,
      label: 'quarantine_sensor'
    });

    // Bóveda Segura (Derecha)
    const vZone = this.add.rectangle(rightX, bottomY, 200, 64, 0x1e3a5f, 0.75);
    vZone.setStrokeStyle(2, 0x38bdf8);
    this.add.text(rightX, bottomY - 14, '🔒 BÓVEDA SEGURA', { fontSize: '12px', color: '#7dd3fc', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(rightX, bottomY + 10, 'Recepción de Datos Limpios', { fontSize: '10px', color: '#38bdf8' }).setOrigin(0.5);

    this.matter.add.rectangle(rightX, bottomY, 190, 56, {
      isStatic: true,
      isSensor: true,
      label: 'vault_sensor'
    });

    // Embudo superior canalizador (embudo cerrado hacia el centro)
    const funnelLeft = this.matter.add.rectangle(this.panelX - 110, this.panelY - 100, 160, 14, {
      isStatic: true,
      angle: 0.45,
      restitution: 0.4,
      friction: 0.05
    });
    const funnelRight = this.matter.add.rectangle(this.panelX + 110, this.panelY - 100, 160, 14, {
      isStatic: true,
      angle: -0.45,
      restitution: 0.4,
      friction: 0.05
    });

    [funnelLeft, funnelRight].forEach(f => {
      const g = this.add.rectangle(f.position.x, f.position.y, 160, 14, 0x334155);
      g.setStrokeStyle(1, 0x64748b);
      g.setRotation(f.angle);
    });

    // Rampas laterales de recepción inferior
    // Rampa izquierda hacia Cuarentena
    const rampLeft = this.matter.add.rectangle(this.panelX - 180, this.panelY + 110, 140, 12, {
      isStatic: true,
      angle: 0.35,
      restitution: 0.3,
      friction: 0.05
    });
    // Rampa derecha hacia Bóveda
    const rampRight = this.matter.add.rectangle(this.panelX + 180, this.panelY + 110, 140, 12, {
      isStatic: true,
      angle: -0.35,
      restitution: 0.3,
      friction: 0.05
    });

    [rampLeft, rampRight].forEach(r => {
      const g = this.add.rectangle(r.position.x, r.position.y, 140, 12, 0x1e293b);
      g.setStrokeStyle(1, 0x475569);
      g.setRotation(r.angle);
    });

    // Colector inferior central de seguridad (si cae fuera, lo clasifica por defecto para evitar estancamiento)
    const floorDrain = this.matter.add.rectangle(this.panelX, bottomY + 20, 140, 20, {
      isStatic: true,
      isSensor: true,
      label: 'floor_drain'
    });
    this.add.rectangle(floorDrain.position.x, floorDrain.position.y, 140, 10, 0x1e1e2e, 0.5);
  }

  private setupCentralDeflector() {
    const gateY = this.panelY + 15;
    const deflectorWidth = 250;
    const deflectorHeight = 20;

    // Deflector físico único y central (sin hueco)
    this.deflectorBody = this.matter.add.rectangle(this.panelX, gateY, deflectorWidth, deflectorHeight, {
      isStatic: true,
      restitution: 0.75,
      friction: 0.08,
      angle: 0,
      label: 'deflector_gate'
    });

    this.deflectorGraphic = this.add.rectangle(this.panelX, gateY, deflectorWidth, deflectorHeight, 0x0284c7);
    this.deflectorGraphic.setStrokeStyle(2, 0x38bdf8);

    // Pivote central dorado
    this.deflectorPivotGraphic = this.add.circle(this.panelX, gateY, 8, 0xfacc15);
    this.deflectorPivotGraphic.setStrokeStyle(2, 0xffffff);
  }

  private setupHUD() {
    const hudY = this.panelY + this.panelHeight / 2 - 25;

    this.threatsText = this.add.text(this.panelX - 350, hudY, 'Amenazas Filtradas: 0', {
      fontSize: '12px',
      color: '#f87171',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.cleanText = this.add.text(this.panelX - 170, hudY, 'Datos Salvados: 0', {
      fontSize: '12px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.fpText = this.add.text(this.panelX + 10, hudY, 'Falsos Positivos: 0', {
      fontSize: '12px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.shieldText = this.add.text(this.panelX + 180, hudY, 'Blindaje del Núcleo: 100%', {
      fontSize: '12px',
      color: '#4ade80',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    // Indicador de oleada actual
    this.waveText = this.add.text(this.panelX, this.panelY - this.panelHeight / 2 + 82, 'OLEADA 1: Flujo Básico', {
      fontSize: '11px',
      color: '#93c5fd',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    // Barra de escaneo para paquetes ambiguos
    const scanY = this.panelY + 120;
    this.scanStatusText = this.add.text(this.panelX, scanY - 14, 'Mantén [ESPACIO] o botón de abajo para Escanear [?]', {
      fontSize: '10.5px',
      color: '#e2e8f0',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.scanBarBg = this.add.rectangle(this.panelX, scanY + 4, 220, 8, 0x1e293b);
    this.scanBarBg.setStrokeStyle(1, 0x64748b);
    this.scanBarFill = this.add.rectangle(this.panelX - 110, scanY + 4, 0, 8, 0xfacc15);
    this.scanBarFill.setOrigin(0, 0.5);
  }

  private setupControls() {
    const controlY = this.panelY + 155;

    // Botón Izquierda / Cuarentena
    const btnLeft = this.add.rectangle(this.panelX - 180, controlY, 150, 34, 0x1e293b).setInteractive({ useHandCursor: true });
    btnLeft.setStrokeStyle(1, 0xef4444);
    this.add.text(btnLeft.x, btnLeft.y, '◄ Cuarentena [A]', { fontSize: '11px', color: '#fca5a5', fontStyle: 'bold' }).setOrigin(0.5);

    btnLeft.on('pointerdown', () => this.tiltDeflector(-0.55));

    // Botón Centro
    const btnCenter = this.add.rectangle(this.panelX - 55, controlY, 80, 34, 0x1e293b).setInteractive({ useHandCursor: true });
    btnCenter.setStrokeStyle(1, 0x64748b);
    this.add.text(btnCenter.x, btnCenter.y, '● [W]', { fontSize: '11px', color: '#e2e8f0', fontStyle: 'bold' }).setOrigin(0.5);

    btnCenter.on('pointerdown', () => this.tiltDeflector(0));

    // Botón Escanear
    const btnScan = this.add.rectangle(this.panelX + 45, controlY, 95, 34, 0x312e81).setInteractive({ useHandCursor: true });
    btnScan.setStrokeStyle(1, 0x818cf8);
    this.add.text(btnScan.x, btnScan.y, '🔍 Escanear', { fontSize: '11px', color: '#c7d2fe', fontStyle: 'bold' }).setOrigin(0.5);

    btnScan.on('pointerdown', () => { this.isScanning = true; });
    btnScan.on('pointerup', () => { this.isScanning = false; });
    btnScan.on('pointerout', () => { this.isScanning = false; });

    // Botón Derecha / Bóveda
    const btnRight = this.add.rectangle(this.panelX + 180, controlY, 150, 34, 0x1e293b).setInteractive({ useHandCursor: true });
    btnRight.setStrokeStyle(1, 0x38bdf8);
    this.add.text(btnRight.x, btnRight.y, 'Bóveda [D] ►', { fontSize: '11px', color: '#7dd3fc', fontStyle: 'bold' }).setOrigin(0.5);

    btnRight.on('pointerdown', () => this.tiltDeflector(0.55));

    // Teclas de control
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
  }

  private tiltDeflector(angle: number) {
    if (this.targetDeflectorAngle !== angle) {
      this.deflectorAdjustmentsCount++;
    }
    this.targetDeflectorAngle = angle;
  }

  private startProgressivePacketStream() {
    let packetIndex = 0;

    const scheduleNextPacket = () => {
      if (packetIndex >= this.totalPacketsToSpawn) return;

      let delay = 1500;
      let isThreat = false;
      let isAmbiguous = false;

      // Oleada 1 (paquetes 0 a 4)
      if (packetIndex < 5) {
        this.currentWave = 1;
        this.waveText.setText('OLEADA 1/3: Filtrado Básico (Amenazas vs Datos)');
        this.waveText.setColor('#93c5fd');
        delay = 1500;
        isThreat = packetIndex % 2 === 0;
      }
      // Oleada 2 (paquetes 5 a 10)
      else if (packetIndex < 11) {
        this.currentWave = 2;
        this.waveText.setText('OLEADA 2/3: Tráfico Cifrado (Mantén Escanear en [?])');
        this.waveText.setColor('#facc15');
        delay = 1200;
        // Paquetes ambiguos aparecen aquí
        if (packetIndex % 2 === 1) {
          isAmbiguous = true;
          this.totalAmbiguousCount++;
          isThreat = Math.random() < 0.5;
        } else {
          isThreat = Math.random() < 0.5;
        }
      }
      // Oleada 3 (paquetes 11 a 15)
      else {
        this.currentWave = 3;
        this.waveText.setText('OLEADA 3/3: Ráfaga de Alta Frecuencia');
        this.waveText.setColor('#f87171');
        delay = 850;
        isThreat = Math.random() < 0.55;
      }

      if (isThreat) {
        this.totalThreats++;
      } else {
        this.totalCleanData++;
      }

      this.spawnPacket(isThreat, isAmbiguous);
      packetIndex++;

      this.spawnTimer = this.time.delayedCall(delay, scheduleNextPacket);
    };

    this.spawnTimer = this.time.delayedCall(1000, scheduleNextPacket);
  }

  private spawnPacket(isThreat: boolean, isAmbiguous: boolean) {
    this.spawnedCount++;
    // Spawn canalizado estrictamente en el embudo central
    const spawnX = this.panelX + Phaser.Math.Between(-15, 15);
    const spawnY = this.panelY - this.panelHeight / 2 + 95;

    const g = this.add.graphics();
    let body: MatterJS.BodyType;
    let badgeText: Phaser.GameObjects.Text | undefined;

    if (isAmbiguous) {
      // Paquete ambiguo: diamante amarillo con símbolo [?]
      body = this.matter.add.rectangle(spawnX, spawnY, 22, 22, {
        restitution: 0.65,
        friction: 0.05,
        density: 0.002,
        label: 'packet_ambiguous'
      });
      this.drawAmbiguousGraphic(g);
      badgeText = this.add.text(spawnX, spawnY, '?', {
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    } else if (isThreat) {
      // Malware: Cubo rojo con borde
      body = this.matter.add.rectangle(spawnX, spawnY, 22, 22, {
        restitution: 0.7,
        friction: 0.06,
        density: 0.002,
        label: 'packet_threat'
      });
      g.fillStyle(0xef4444, 1);
      g.fillRect(-11, -11, 22, 22);
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeRect(-11, -11, 22, 22);
    } else {
      // Datos limpios: Esfera cian suave
      body = this.matter.add.circle(spawnX, spawnY, 11, {
        restitution: 0.8,
        friction: 0.04,
        density: 0.0015,
        label: 'packet_clean'
      });
      g.fillStyle(0x38bdf8, 1);
      g.fillCircle(0, 0, 11);
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeCircle(0, 0, 11);
    }

    this.packets.push({
      body,
      shapeGraphic: g,
      badgeText,
      isThreat,
      isAmbiguous,
      isScanned: false,
      resolved: false,
      spawnTime: Date.now()
    });
  }

  private drawAmbiguousGraphic(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(0xf59e0b, 1);
    g.beginPath();
    g.moveTo(0, -12);
    g.lineTo(12, 0);
    g.lineTo(0, 12);
    g.lineTo(-12, 0);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0xffffff, 0.95);
    g.strokePath();
  }

  private setupCollisionHandlers() {
    this.matter.world.on('collisionstart', (event: any) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        this.handleSensorTrigger(bodyA, bodyB);
        this.handleSensorTrigger(bodyB, bodyA);
      }
    });
  }

  private handleSensorTrigger(sensor: MatterJS.BodyType, target: MatterJS.BodyType) {
    if (!sensor.label) return;

    const packet = this.packets.find(p => p.body === target && !p.resolved);
    if (!packet) return;

    const elapsedReaction = Date.now() - packet.spawnTime;
    this.reactionTimesMs.push(elapsedReaction);

    if (sensor.label === 'quarantine_sensor') {
      packet.resolved = true;
      if (packet.isThreat) {
        this.threatsBlocked++;
        this.currentStreak++;
        if (this.currentStreak > this.maxStreak) this.maxStreak = this.currentStreak;
        this.threatsText.setText(`Amenazas Filtradas: ${this.threatsBlocked}`);
        this.createFlashEffect(target.position.x, target.position.y, 0x22c55e);
      } else {
        this.falsePositives++;
        this.currentStreak = 0;
        this.fpText.setText(`Falsos Positivos: ${this.falsePositives}`);
        this.createFlashEffect(target.position.x, target.position.y, 0xfacc15);
      }
      this.destroyPacket(packet);
      this.checkCompletion();
    } else if (sensor.label === 'vault_sensor') {
      packet.resolved = true;
      if (!packet.isThreat) {
        this.cleanDataSaved++;
        this.currentStreak++;
        if (this.currentStreak > this.maxStreak) this.maxStreak = this.currentStreak;
        this.cleanText.setText(`Datos Salvados: ${this.cleanDataSaved}`);
        this.createFlashEffect(target.position.x, target.position.y, 0x38bdf8);
      } else {
        this.currentStreak = 0;
        this.shieldIntegrity = Math.max(0, this.shieldIntegrity - 20);
        this.shieldText.setText(`Blindaje del Núcleo: ${this.shieldIntegrity}%`);
        this.cameras.main.shake(180, 0.008);
        this.createFlashEffect(target.position.x, target.position.y, 0xef4444);
      }
      this.destroyPacket(packet);
      this.checkCompletion();
    } else if (sensor.label === 'floor_drain') {
      // Colector de seguridad para paquetes que cayeron fuera de ruta
      packet.resolved = true;
      if (packet.isThreat) {
        this.shieldIntegrity = Math.max(0, this.shieldIntegrity - 10);
        this.shieldText.setText(`Blindaje del Núcleo: ${this.shieldIntegrity}%`);
      }
      this.destroyPacket(packet);
      this.checkCompletion();
    }
  }

  private createFlashEffect(x: number, y: number, color: number) {
    const f = this.add.circle(x, y, 18, color, 0.85);
    this.tweens.add({
      targets: f,
      scale: 2.2,
      alpha: 0,
      duration: 320,
      onComplete: () => f.destroy()
    });
  }

  private destroyPacket(packet: PacketItem) {
    packet.shapeGraphic.destroy();
    if (packet.badgeText) {
      packet.badgeText.destroy();
    }
    this.matter.world.remove(packet.body);
  }

  private checkCompletion() {
    const resolvedCount = this.packets.filter(p => p.resolved).length;
    if (resolvedCount >= this.totalPacketsToSpawn) {
      this.time.delayedCall(700, () => {
        this.triggerVictory();
      });
    }
  }

  update(_time: number, delta: number) {
    // 1. Manejo de teclado para control del deflector
    if (this.keyA?.isDown || this.cursors?.left?.isDown) {
      this.tiltDeflector(-0.55);
    } else if (this.keyD?.isDown || this.cursors?.right?.isDown) {
      this.tiltDeflector(0.55);
    } else if (this.keyW?.isDown || this.cursors?.up?.isDown) {
      this.tiltDeflector(0);
    }

    // 2. Interpolación suave del ángulo del deflector físico
    this.currentDeflectorAngle = Phaser.Math.Linear(this.currentDeflectorAngle, this.targetDeflectorAngle, 0.18);
    this.matter.body.setAngle(this.deflectorBody, this.currentDeflectorAngle);
    this.deflectorGraphic.setRotation(this.currentDeflectorAngle);

    // 3. Mecánica de escaneo de paquetes ambiguos
    const wantsScan = this.isScanning || (this.keySpace && this.keySpace.isDown) || (this.cursors && this.cursors.down && this.cursors.down.isDown);
    
    // Buscar paquete ambiguo activo que no haya sido resuelto ni escaneado
    const unscannedPacket = this.packets.find(p => !p.resolved && p.isAmbiguous && !p.isScanned);

    if (wantsScan && unscannedPacket) {
      this.scanProgress = Math.min(1, this.scanProgress + (delta / 600)); // 0.6s para escanear
      this.scanBarFill.width = this.scanProgress * 220;
      this.scanStatusText.setText(`Escaneando paquete... ${Math.round(this.scanProgress * 100)}%`);
      this.scanStatusText.setColor('#facc15');

      if (this.scanProgress >= 1) {
        // Escaneo completado: revelar naturaleza real
        unscannedPacket.isScanned = true;
        this.scannedAmbiguousCount++;
        this.revealPacketIdentity(unscannedPacket);
        this.scanProgress = 0;
        this.scanBarFill.width = 0;
        this.scanStatusText.setText('¡Firma descifrada con éxito!');
        this.scanStatusText.setColor('#4ade80');
      }
    } else {
      if (!unscannedPacket) {
        this.scanProgress = 0;
        this.scanBarFill.width = 0;
        this.scanStatusText.setText('Canal libre. Esperando paquetes cifrados [?]');
        this.scanStatusText.setColor('#94a3b8');
      } else if (!wantsScan && this.scanProgress > 0) {
        this.scanProgress = Math.max(0, this.scanProgress - (delta / 400));
        this.scanBarFill.width = this.scanProgress * 220;
      }
    }

    // 4. Sincronizar gráficos de los paquetes con sus cuerpos Matter
    for (const p of this.packets) {
      if (!p.resolved) {
        p.shapeGraphic.setPosition(p.body.position.x, p.body.position.y);
        p.shapeGraphic.setRotation(p.body.angle);
        if (p.badgeText) {
          p.badgeText.setPosition(p.body.position.x, p.body.position.y);
        }
      }
    }
  }

  private revealPacketIdentity(packet: PacketItem) {
    if (packet.badgeText) {
      packet.badgeText.destroy();
      packet.badgeText = undefined;
    }

    packet.shapeGraphic.clear();
    if (packet.isThreat) {
      // Revelado: Malware rojo
      packet.shapeGraphic.fillStyle(0xef4444, 1);
      packet.shapeGraphic.fillRect(-11, -11, 22, 22);
      packet.shapeGraphic.lineStyle(2, 0xffffff, 0.9);
      packet.shapeGraphic.strokeRect(-11, -11, 22, 22);
      this.createFlashEffect(packet.body.position.x, packet.body.position.y, 0xef4444);
    } else {
      // Revelado: Datos limpios cian
      packet.shapeGraphic.fillStyle(0x38bdf8, 1);
      packet.shapeGraphic.fillCircle(0, 0, 11);
      packet.shapeGraphic.lineStyle(2, 0xffffff, 0.9);
      packet.shapeGraphic.strokeCircle(0, 0, 11);
      this.createFlashEffect(packet.body.position.x, packet.body.position.y, 0x38bdf8);
    }
  }

  private triggerVictory() {
    const elapsedSeconds = Math.round((Date.now() - this.startTime) / 1000);

    const threatRate = this.totalThreats > 0 ? (this.threatsBlocked / this.totalThreats) : 1;
    const cleanRate = this.totalCleanData > 0 ? (this.cleanDataSaved / this.totalCleanData) : 1;
    const fpPenalty = this.falsePositives * 5;

    const primarySecScore = Math.max(50, Math.min(100, Math.round(
      (threatRate * 50) + (cleanRate * 30) + ((this.shieldIntegrity / 100) * 20) - fpPenalty
    )));

    // Puntuación secundaria continua para 'net' en rango [55, 100]
    const secondaryNetScore = Math.max(55, Math.min(100, Math.round(
      (cleanRate * 50) + ((this.shieldIntegrity / 100) * 50)
    )));

    // Stealth Assessment (Landers 2024 / Shute 2011)
    const behavioralBonuses: Partial<VocationalScores> = {};

    // Si escaneó la mayoría de paquetes ambiguos -> perfil analítico (data)
    if (this.totalAmbiguousCount > 0 && (this.scannedAmbiguousCount / this.totalAmbiguousCount) >= 0.75) {
      behavioralBonuses.data = 0.8; // Diligencia e inspección profunda de datos
    }

    if (this.maxStreak >= 8) {
      behavioralBonuses.sec = 0.5; // Alta consistencia de blindaje
    }

    // Evaluación de serenidad vs agilidad en ajustes
    if (this.deflectorAdjustmentsCount <= 22 && primarySecScore >= 75) {
      behavioralBonuses.biz = 0.5; // Compostura y serenidad bajo presión de flujo
    } else if (this.deflectorAdjustmentsCount > 28) {
      behavioralBonuses.net = 0.5; // Reacción rápida y control dinámico continuo
    }

    const avgReaction = this.reactionTimesMs.length > 0
      ? Math.round(this.reactionTimesMs.reduce((a, b) => a + b, 0) / this.reactionTimesMs.length)
      : 800;

    const metrics: MinigameMetrics = {
      primaryScore: primarySecScore,
      secondaryBranch: 'net',
      secondaryScore: secondaryNetScore,
      behavioralBonuses,
      details: {
        'Amenazas Neutralizadas': `${this.threatsBlocked} / ${this.totalThreats}`,
        'Datos Limpios Salvados': `${this.cleanDataSaved} / ${this.totalCleanData}`,
        'Falsos Positivos': `${this.falsePositives}`,
        'Integridad del Blindaje': `${this.shieldIntegrity}%`,
        'Cifrados Escaneados': `${this.scannedAmbiguousCount} / ${this.totalAmbiguousCount}`,
        'Racha Máx Sin Error': `${this.maxStreak} seguidos`,
        'Ajustes de Deflector': `${this.deflectorAdjustmentsCount}`,
        'Tiempo de Reacción': `${avgReaction} ms`,
        'Tiempo de Filtrado': `${elapsedSeconds} seg`
      },
      feedbackSummary: `Blindaje exitoso. Lograste filtrar el tráfico con un ${Math.round(threatRate * 100)}% de efectividad, ${this.shieldIntegrity}% de integridad y ${this.scannedAmbiguousCount} paquetes cifrados inspeccionados.`
    };

    this.showCompletionModal(metrics);
  }

  private createCompletionModal() {
    this.completedModal = this.add.container(this.panelX, this.panelY);
    this.completedModal.setVisible(false);
    this.completedModal.setDepth(100);

    const mBg = this.add.rectangle(0, 0, 520, 320, 0x090d16, 0.98);
    mBg.setStrokeStyle(2, 0xef4444);

    const title = this.add.text(0, -115, '🛡️ ¡FILTRADO Y BLINDAJE COMPLETADO!', {
      fontSize: '17px',
      color: '#f87171',
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

    const finishBtn = this.add.rectangle(0, 110, 260, 42, 0xdc2626).setInteractive({ useHandCursor: true });
    finishBtn.setStrokeStyle(1, 0xf87171);
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
      `Amenazas Bloqueadas: ${metrics.details['Amenazas Neutralizadas']} | Datos Salvados: ${metrics.details['Datos Limpios Salvados']}\n` +
      `Falsos Positivos: ${metrics.details['Falsos Positivos']} | Blindaje: ${metrics.details['Integridad del Blindaje']}\n` +
      `Cifrados Escaneados: ${metrics.details['Cifrados Escaneados']} | Reacción Promedio: ${metrics.details['Tiempo de Reacción']}\n\n` +
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
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = null;
    }
    if (metrics && this.onCompleteCallback) {
      this.onCompleteCallback(metrics);
    } else if (!metrics && this.onCancelCallback) {
      this.onCancelCallback();
    }
    this.scene.stop('SecurityMinigameScene');
    this.scene.resume('SpaceShipScene');
  }
}
