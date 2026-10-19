import * as Phaser from 'phaser';
import { MinigameMetrics, VocationalScores } from '../../types/vocational';

interface PacketItem {
  body: MatterJS.BodyType;
  shapeGraphic: Phaser.GameObjects.Graphics;
  isThreat: boolean;
  resolved: boolean;
}

export class SecurityMinigameScene extends Phaser.Scene {
  private panelWidth = 860;
  private panelHeight = 540;
  private panelX = 512;
  private panelY = 320;

  // Compuertas deflectoras físicas
  private leftGateBody!: MatterJS.BodyType;
  private rightGateBody!: MatterJS.BodyType;
  private leftGateGraphic!: Phaser.GameObjects.Rectangle;
  private rightGateGraphic!: Phaser.GameObjects.Rectangle;

  // Paquetes
  private packets: PacketItem[] = [];
  private totalPacketsToSpawn = 14;
  private spawnedCount = 0;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;

  // Sensores y límites

  // Métricas
  private threatsBlocked = 0;
  private totalThreats = 0;
  private cleanDataSaved = 0;
  private totalCleanData = 0;
  private falsePositives = 0;
  private shieldIntegrity = 100;
  private startTime = 0;

  // Métricas de Stealth Assessment (Landers 2024 / Shute 2011)
  private maxStreak = 0;
  private currentStreak = 0;
  private gateAdjustmentsCount = 0;

  // UI
  private threatsText!: Phaser.GameObjects.Text;
  private cleanText!: Phaser.GameObjects.Text;
  private shieldText!: Phaser.GameObjects.Text;
  private fpText!: Phaser.GameObjects.Text;
  private completedModal!: Phaser.GameObjects.Container;

  private onCompleteCallback?: (metrics: MinigameMetrics) => void;
  private onCancelCallback?: () => void;

  constructor() {
    super({
      key: 'SecurityMinigameScene',
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 0.9 },
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
    this.gateAdjustmentsCount = 0;
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
    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 25, '🛡️ CÁMARA DE FILTRADO Y BLINDAJE // DEFLECTOR DE TRÁFICO', {
      fontSize: '17px',
      color: '#f87171',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 50, 'Mueve las compuertas deflectoras con el ratón o botones para desviar los bloques rojos (malware)\nhacia la Cuarentena (izquierda) y permitir que los orbes limpios (datos) caigan en la Bóveda (derecha).', {
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

    // 4. Crear zonas receptoras (Cuarentena y Bóveda)
    this.setupReceptorZones();

    // 5. Crear compuertas deflectoras
    this.setupDeflectorGates();

    // 6. HUD inferior
    this.setupHUD();

    // 7. Controles de rotación interactivos
    this.setupControls();

    // 8. Monitoreo de colisiones con los sensores
    this.setupCollisionHandlers();

    // 9. Iniciar el flujo de paquetes
    this.startPacketStream();

    // 10. Modal de finalización
    this.createCompletionModal();
  }

  private setupReceptorZones() {
    const bottomY = this.panelY + this.panelHeight / 2 - 100;
    const leftX = this.panelX - 220;
    const rightX = this.panelX + 220;

    // Cuarentena (Izquierda)
    const qZone = this.add.rectangle(leftX, bottomY, 200, 60, 0x3f1d1d, 0.7);
    qZone.setStrokeStyle(2, 0xef4444);
    this.add.text(leftX, bottomY - 12, '☣ CUARENTENA', { fontSize: '12px', color: '#fca5a5', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(leftX, bottomY + 10, 'Destrucción de Amenazas', { fontSize: '10px', color: '#f87171' }).setOrigin(0.5);

    this.matter.add.rectangle(leftX, bottomY, 180, 50, {
      isStatic: true,
      isSensor: true,
      label: 'quarantine_sensor'
    });

    // Bóveda Central (Derecha)
    const vZone = this.add.rectangle(rightX, bottomY, 200, 60, 0x1e3a5f, 0.7);
    vZone.setStrokeStyle(2, 0x38bdf8);
    this.add.text(rightX, bottomY - 12, '🔒 BÓVEDA SEGURA', { fontSize: '12px', color: '#7dd3fc', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(rightX, bottomY + 10, 'Recepción de Datos Limpios', { fontSize: '10px', color: '#38bdf8' }).setOrigin(0.5);

    this.matter.add.rectangle(rightX, bottomY, 180, 50, {
      isStatic: true,
      isSensor: true,
      label: 'vault_sensor'
    });

    // Embudo central superior para canalizar
    const funnelLeft = this.matter.add.rectangle(this.panelX - 140, this.panelY - 90, 160, 14, {
      isStatic: true,
      angle: 0.35,
      restitution: 0.8
    });
    const funnelRight = this.matter.add.rectangle(this.panelX + 140, this.panelY - 90, 160, 14, {
      isStatic: true,
      angle: -0.35,
      restitution: 0.8
    });

    [funnelLeft, funnelRight].forEach(f => {
      const g = this.add.rectangle(f.position.x, f.position.y, 160, 14, 0x334155);
      g.setStrokeStyle(1, 0x64748b);
      g.setRotation(f.angle);
    });
  }

  private setupDeflectorGates() {
    const gateY = this.panelY + 20;

    // Compuerta Izquierda
    this.leftGateGraphic = this.add.rectangle(this.panelX - 90, gateY, 140, 16, 0x0284c7);
    this.leftGateGraphic.setStrokeStyle(2, 0x38bdf8);
    this.leftGateBody = this.matter.add.rectangle(this.panelX - 90, gateY, 140, 16, {
      isStatic: true,
      restitution: 0.85,
      friction: 0.1,
      angle: -0.25
    });
    this.leftGateGraphic.setRotation(this.leftGateBody.angle);

    // Compuerta Derecha
    this.rightGateGraphic = this.add.rectangle(this.panelX + 90, gateY, 140, 16, 0x0284c7);
    this.rightGateGraphic.setStrokeStyle(2, 0x38bdf8);
    this.rightGateBody = this.matter.add.rectangle(this.panelX + 90, gateY, 140, 16, {
      isStatic: true,
      restitution: 0.85,
      friction: 0.1,
      angle: 0.25
    });
    this.rightGateGraphic.setRotation(this.rightGateBody.angle);

    // Ejes / Pivotes visuales
    this.add.circle(this.panelX - 90, gateY, 6, 0xfacc15);
    this.add.circle(this.panelX + 90, gateY, 6, 0xfacc15);
  }

  private setupControls() {
    // Control interactivo con botones o cursor
    const controlY = this.panelY + 115;

    // Botones rápidos para desviar a izquierda o derecha
    const btnLeft = this.add.rectangle(this.panelX - 160, controlY, 150, 36, 0x1e293b).setInteractive({ useHandCursor: true });
    btnLeft.setStrokeStyle(1, 0xef4444);
    this.add.text(btnLeft.x, btnLeft.y, '◄ Inclinar a Cuarentena', { fontSize: '11px', color: '#fca5a5', fontStyle: 'bold' }).setOrigin(0.5);

    btnLeft.on('pointerdown', () => {
      this.rotateGates(-0.6, 0.1);
    });

    const btnCenter = this.add.rectangle(this.panelX, controlY, 110, 36, 0x1e293b).setInteractive({ useHandCursor: true });
    btnCenter.setStrokeStyle(1, 0x64748b);
    this.add.text(btnCenter.x, btnCenter.y, '● Centrar', { fontSize: '11px', color: '#e2e8f0', fontStyle: 'bold' }).setOrigin(0.5);

    btnCenter.on('pointerdown', () => {
      this.rotateGates(-0.25, 0.25);
    });

    const btnRight = this.add.rectangle(this.panelX + 160, controlY, 150, 36, 0x1e293b).setInteractive({ useHandCursor: true });
    btnRight.setStrokeStyle(1, 0x38bdf8);
    this.add.text(btnRight.x, btnRight.y, 'Inclinar a Bóveda ►', { fontSize: '11px', color: '#7dd3fc', fontStyle: 'bold' }).setOrigin(0.5);

    btnRight.on('pointerdown', () => {
      this.rotateGates(-0.1, 0.6);
    });

    // También permitir rotación arrastrando el ratón en la zona central
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.y >= this.panelY - 70 && pointer.y <= this.panelY + 90) {
        const factor = (pointer.x - this.panelX) / 200;
        const clamped = Phaser.Math.Clamp(factor, -1, 1);
        this.rotateGates(-0.25 + clamped * 0.45, 0.25 + clamped * 0.45);
      }
    });
  }

  private rotateGates(angleLeft: number, angleRight: number) {
    this.gateAdjustmentsCount++;
    this.matter.body.setAngle(this.leftGateBody, angleLeft);
    this.leftGateGraphic.setRotation(angleLeft);

    this.matter.body.setAngle(this.rightGateBody, angleRight);
    this.rightGateGraphic.setRotation(angleRight);
  }

  private setupHUD() {
    const barY = this.panelY + this.panelHeight / 2 - 35;
    const startX = this.panelX - this.panelWidth / 2 + 40;

    this.threatsText = this.add.text(startX, barY, 'Amenazas Filtradas: 0', {
      fontSize: '13px',
      color: '#f87171',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.cleanText = this.add.text(startX + 210, barY, 'Datos Salvados: 0', {
      fontSize: '13px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.fpText = this.add.text(startX + 400, barY, 'Falsos Positivos: 0', {
      fontSize: '13px',
      color: '#fbbf24',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.shieldText = this.add.text(startX + 600, barY, 'Blindaje del Núcleo: 100%', {
      fontSize: '13px',
      color: '#34d399',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });
  }

  private startPacketStream() {
    let current = 0;
    this.spawnTimer = this.time.addEvent({
      delay: 1300,
      repeat: this.totalPacketsToSpawn - 1,
      callback: () => {
        // Alternar aleatoriamente entre amenaza y dato legítimo
        const isThreat = current % 2 === 0 || Math.random() < 0.5;
        if (isThreat) {
          this.totalThreats++;
        } else {
          this.totalCleanData++;
        }
        this.spawnPacket(isThreat);
        current++;
      }
    });
  }

  private spawnPacket(isThreat: boolean) {
    this.spawnedCount++;
    const spawnX = this.panelX + Phaser.Math.Between(-30, 30);
    const spawnY = this.panelY - this.panelHeight / 2 + 105;

    const g = this.add.graphics();
    let body: MatterJS.BodyType;

    if (isThreat) {
      // Bloque rojo con aristas
      body = this.matter.add.rectangle(spawnX, spawnY, 22, 22, {
        restitution: 0.8,
        friction: 0.05,
        density: 0.002,
        label: 'packet_threat'
      });
      g.fillStyle(0xef4444, 1);
      g.fillRect(-11, -11, 22, 22);
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeRect(-11, -11, 22, 22);
    } else {
      // Esfera cian suave
      body = this.matter.add.circle(spawnX, spawnY, 11, {
        restitution: 0.85,
        friction: 0.03,
        density: 0.001,
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
      isThreat,
      resolved: false
    });
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
        this.currentStreak = 0; // Rompe la racha de filtrado limpio
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
        // Malware impactó el núcleo
        this.currentStreak = 0; // Rompe la racha de filtrado limpio
        this.shieldIntegrity = Math.max(0, this.shieldIntegrity - 20);
        this.shieldText.setText(`Blindaje del Núcleo: ${this.shieldIntegrity}%`);
        this.cameras.main.shake(180, 0.008);
        this.createFlashEffect(target.position.x, target.position.y, 0xef4444);
      }
      this.destroyPacket(packet);
      this.checkCompletion();
    }
  }

  private createFlashEffect(x: number, y: number, color: number) {
    const f = this.add.circle(x, y, 16, color, 0.85);
    this.tweens.add({
      targets: f,
      scale: 2.2,
      alpha: 0,
      duration: 350,
      onComplete: () => f.destroy()
    });
  }

  private destroyPacket(packet: PacketItem) {
    packet.shapeGraphic.destroy();
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

  update() {
    // Sincronizar posición gráfica de paquetes
    for (const p of this.packets) {
      if (!p.resolved) {
        p.shapeGraphic.setPosition(p.body.position.x, p.body.position.y);
        p.shapeGraphic.setRotation(p.body.angle);
      }
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

    // Tarea 19: Puntuación secundaria continua para 'net' en rango [55, 100]
    const secondaryNetScore = Math.max(55, Math.min(100, Math.round(
      (cleanRate * 50) + ((this.shieldIntegrity / 100) * 50)
    )));

    // Tarea 21: Stealth Assessment (Landers 2024 / Shute 2011)
    const behavioralBonuses: Partial<VocationalScores> = {};
    if (this.maxStreak >= 8) {
      behavioralBonuses.data = 0.7; // Atención selectiva y concentración sostenida
    }
    if (this.gateAdjustmentsCount <= 18 && primarySecScore >= 75) {
      behavioralBonuses.biz = 0.5; // Compostura y serenidad bajo presión de flujo
    } else if (this.gateAdjustmentsCount > 28) {
      behavioralBonuses.net = 0.5; // Reacción rápida y control dinámico continuo
    }

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
        'Racha Máx Sin Error': `${this.maxStreak} seguidos`,
        'Ajustes de Deflector': `${this.gateAdjustmentsCount}`,
        'Tiempo de Filtrado': `${elapsedSeconds} seg`
      },
      feedbackSummary: `Blindaje exitoso. Lograste filtrar las amenazas con un ${Math.round(threatRate * 100)}% de efectividad y ${this.shieldIntegrity}% de integridad en el núcleo.`
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
      `Falsos Positivos: ${metrics.details['Falsos Positivos']} | Blindaje: ${metrics.details['Integridad del Blindaje']}\n\n` +
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
