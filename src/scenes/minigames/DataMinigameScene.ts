import * as Phaser from 'phaser';
import { MinigameMetrics } from '../../types/vocational';

interface SampleSphere {
  body: MatterJS.BodyType;
  graphic: Phaser.GameObjects.Graphics;
  massValue: number;
}

export class DataMinigameScene extends Phaser.Scene {
  private panelWidth = 860;
  private panelHeight = 540;
  private panelX = 512;
  private panelY = 320;

  // Mecanismo de balanza basculante de Matter
  private fulcrumBody!: MatterJS.BodyType;
  private beamBody!: MatterJS.BodyType;
  private leftPanBody!: MatterJS.BodyType;
  private rightPanBody!: MatterJS.BodyType;
  private sliderWeightBody!: MatterJS.BodyType;

  private beamGraphic!: Phaser.GameObjects.Rectangle;
  private leftPanGraphic!: Phaser.GameObjects.Rectangle;
  private rightPanGraphic!: Phaser.GameObjects.Rectangle;
  private sliderGraphic!: Phaser.GameObjects.Rectangle;
  private cableGraphics!: Phaser.GameObjects.Graphics;

  // Muestras dosificadas
  private samples: SampleSphere[] = [];
  private totalSamplesDropped = 0;
  private targetWeight = 115; // Peso objetivo de los bio-sensores

  // Estabilidad
  private targetHoldSeconds = 3.0;
  private currentHoldSeconds = 0;
  private isBalanced = false;
  private startTime = 0;

  // UI
  private statusText!: Phaser.GameObjects.Text;
  private deviationText!: Phaser.GameObjects.Text;
  private holdProgressText!: Phaser.GameObjects.Text;
  private stabilityBarBg!: Phaser.GameObjects.Rectangle;
  private stabilityBarFill!: Phaser.GameObjects.Rectangle;
  private completedModal!: Phaser.GameObjects.Container;

  private onCompleteCallback?: (metrics: MinigameMetrics) => void;
  private onCancelCallback?: () => void;

  constructor() {
    super({
      key: 'DataMinigameScene',
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 0.8 },
          debug: false
        }
      }
    });
  }

  init(data: { onComplete?: (metrics: MinigameMetrics) => void; onCancel?: () => void }) {
    this.onCompleteCallback = data.onComplete;
    this.onCancelCallback = data.onCancel;
    this.samples = [];
    this.totalSamplesDropped = 0;
    this.currentHoldSeconds = 0;
    this.isBalanced = false;
  }

  create() {
    this.startTime = Date.now();
    const { width, height } = this.scale;

    // 1. Overlay oscuro
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.88);
    overlay.setInteractive();

    // 2. Chasis del Laboratorio
    const frame = this.add.rectangle(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 0x0f172a, 0.96);
    frame.setStrokeStyle(3, 0x8b5cf6);

    // Cabecera
    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 25, '📊 LABORATORIO DE CULTIVOS // BALANZA BIO-SENSORIAL', {
      fontSize: '17px',
      color: '#c084fc',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 50, 'Dosifica muestras de nutrientes y ajusta el contrapeso deslizante para equilibrar la balanza analítica.\nMantén el sistema dentro de la zona de correlación verde durante 3 segundos continuos.', {
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

    // 4. Crear la balanza física con pivote
    this.cableGraphics = this.add.graphics();
    this.setupScaleMechanism();

    // 5. Botones dosificadores de muestras
    this.setupDispensers();

    // 6. HUD y medidor de estabilidad
    this.setupHUD();

    // 7. Modal de finalización
    this.createCompletionModal();
  }

  private setupScaleMechanism() {
    const fulcrumX = this.panelX;
    const fulcrumY = this.panelY - 20;
    const beamLength = 460;

    // Fulcro / Soporte central (Triangular / Rectangular fijo)
    const fulcrumGraphic = this.add.triangle(fulcrumX, fulcrumY + 50, 0, 80, 30, 0, 60, 80, 0x334155);
    fulcrumGraphic.setStrokeStyle(2, 0x8b5cf6);

    this.fulcrumBody = this.matter.add.circle(fulcrumX, fulcrumY, 12, {
      isStatic: true
    });

    // Viga horizontal oscilante
    this.beamBody = this.matter.add.rectangle(fulcrumX, fulcrumY, beamLength, 16, {
      density: 0.003,
      frictionAir: 0.05,
      friction: 0.2,
      label: 'scale_beam'
    });

    this.beamGraphic = this.add.rectangle(fulcrumX, fulcrumY, beamLength, 16, 0x1e293b);
    this.beamGraphic.setStrokeStyle(2, 0xa855f7);

    // Pivote central fijo
    this.matter.add.constraint(this.fulcrumBody, this.beamBody, 0, 0.98, {
      pointA: { x: 0, y: 0 },
      pointB: { x: 0, y: 0 }
    });

    // Contrapeso deslizante en la viga (ajuste analítico fino)
    this.sliderWeightBody = this.matter.add.rectangle(fulcrumX, fulcrumY - 14, 30, 16, {
      density: 0.006,
      frictionAir: 0.08,
      label: 'slider_weight'
    });

    this.sliderGraphic = this.add.rectangle(fulcrumX, fulcrumY - 14, 30, 16, 0xfacc15);
    this.sliderGraphic.setStrokeStyle(1, 0xffffff);

    // Constraint que une el deslizador a la viga permitiendo desplazamiento
    this.matter.add.constraint(this.beamBody, this.sliderWeightBody, 14, 0.9, {
      pointA: { x: 0, y: -14 },
      pointB: { x: 0, y: 0 }
    });

    // Plato Izquierdo (Demanda Biológica Sensor - Peso de referencia predeterminado)
    const panY = fulcrumY + 110;
    const leftPanX = fulcrumX - 190;
    const rightPanX = fulcrumX + 190;

    this.leftPanBody = this.matter.add.rectangle(leftPanX, panY, 110, 16, {
      density: 0.004,
      frictionAir: 0.06,
      label: 'left_pan'
    });
    this.leftPanGraphic = this.add.rectangle(leftPanX, panY, 110, 16, 0x1e293b);
    this.leftPanGraphic.setStrokeStyle(2, 0x38bdf8);

    // Muestra objetivo dibujada en el plato izquierdo
    const refWeightG = this.add.rectangle(leftPanX, panY - 18, 50, 24, 0x0284c7);
    refWeightG.setStrokeStyle(1.5, 0x38bdf8);
    this.add.text(leftPanX, panY - 18, `OBJETIVO\n${this.targetWeight} mg`, { fontSize: '9px', color: '#e0f2fe', align: 'center', fontStyle: 'bold' }).setOrigin(0.5);

    // Plato Derecho (Dosificador de Mezcla)
    this.rightPanBody = this.matter.add.rectangle(rightPanX, panY, 110, 16, {
      density: 0.001,
      frictionAir: 0.06,
      label: 'right_pan'
    });
    this.rightPanGraphic = this.add.rectangle(rightPanX, panY, 110, 16, 0x1e293b);
    this.rightPanGraphic.setStrokeStyle(2, 0x10b981);
    this.add.text(rightPanX, panY + 20, 'DOSIFICADOR', { fontSize: '9px', color: '#6ee7b7', fontStyle: 'bold' }).setOrigin(0.5);

    // Unir platos a los extremos de la viga con varillas/constraints
    this.matter.add.constraint(this.beamBody, this.leftPanBody, 110, 0.85, {
      pointA: { x: -190, y: 0 },
      pointB: { x: 0, y: 0 },
      damping: 0.1
    });

    this.matter.add.constraint(this.beamBody, this.rightPanBody, 110, 0.85, {
      pointA: { x: 190, y: 0 },
      pointB: { x: 0, y: 0 },
      damping: 0.1
    });

    // Control del contrapeso con clic y arrastre en la viga
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.y >= fulcrumY - 45 && pointer.y <= fulcrumY + 30) {
        const offset = Phaser.Math.Clamp(pointer.x - fulcrumX, -160, 160);
        this.matter.body.setPosition(this.sliderWeightBody, {
          x: fulcrumX + offset,
          y: fulcrumY - 14
        });
      }
    });
  }

  private setupDispensers() {
    const rightPanX = this.panelX + 190;
    const dispenserY = this.panelY - 100;

    const btnWidth = 100;
    const btnHeight = 36;
    const startX = rightPanX - 110;

    const sampleTypes = [
      { name: '+15 Hidratación', mass: 15, color: 0x38bdf8, colorHex: '#38bdf8', size: 10 },
      { name: '+35 Nutrientes', mass: 35, color: 0x22c55e, colorHex: '#4ade80', size: 14 },
      { name: '+5 Minerales', mass: 5, color: 0xfacc15, colorHex: '#fde047', size: 7 }
    ];

    sampleTypes.forEach((s, idx) => {
      const btn = this.add.rectangle(startX + idx * (btnWidth + 10), dispenserY, btnWidth, btnHeight, 0x1e293b).setInteractive({ useHandCursor: true });
      btn.setStrokeStyle(1.5, s.color);

      this.add.text(btn.x, btn.y, s.name, {
        fontSize: '10px',
        color: s.colorHex,
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      }).setOrigin(0.5);

      btn.on('pointerdown', () => {
        this.dispenseSample(rightPanX + Phaser.Math.Between(-25, 25), dispenserY + 30, s.mass, s.color, s.size);
      });
    });

    this.add.text(rightPanX, dispenserY - 26, 'TOLVAS DISPENSADORAS DE MUESTRAS', {
      fontSize: '10px',
      color: '#cbd5e1',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private dispenseSample(x: number, y: number, massValue: number, color: number, radius: number) {
    this.totalSamplesDropped++;

    const body = this.matter.add.circle(x, y, radius, {
      restitution: 0.1,
      friction: 0.3,
      density: 0.001 * (massValue / 10),
      label: 'sample_sphere'
    });

    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, radius);
    g.lineStyle(1.5, 0xffffff, 0.8);
    g.strokeCircle(0, 0, radius);

    this.samples.push({
      body,
      graphic: g,
      massValue
    });
  }

  private setupHUD() {
    const barY = this.panelY + this.panelHeight / 2 - 35;
    const startX = this.panelX - this.panelWidth / 2 + 40;

    this.statusText = this.add.text(startX, barY, 'Muestras Usadas: 0', {
      fontSize: '13px',
      color: '#c084fc',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.deviationText = this.add.text(startX + 180, barY, 'Desviación: --', {
      fontSize: '13px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.holdProgressText = this.add.text(startX + 380, barY, 'Estabilidad Sostenida: 0.0s / 3.0s', {
      fontSize: '13px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    // Barra visual de estabilidad sostenida
    this.stabilityBarBg = this.add.rectangle(startX + 690, barY + 8, 120, 14, 0x1e293b).setOrigin(0, 0.5);
    this.stabilityBarBg.setStrokeStyle(1, 0x475569);
    this.stabilityBarFill = this.add.rectangle(startX + 690, barY + 8, 0, 14, 0x22c55e).setOrigin(0, 0.5);
  }

  update(_: number, delta: number) {
    // 1. Sincronizar posición gráfica de la balanza
    this.beamGraphic.setPosition(this.beamBody.position.x, this.beamBody.position.y);
    this.beamGraphic.setRotation(this.beamBody.angle);

    this.leftPanGraphic.setPosition(this.leftPanBody.position.x, this.leftPanBody.position.y);
    this.leftPanGraphic.setRotation(this.leftPanBody.angle);

    this.rightPanGraphic.setPosition(this.rightPanBody.position.x, this.rightPanBody.position.y);
    this.rightPanGraphic.setRotation(this.rightPanBody.angle);

    this.sliderGraphic.setPosition(this.sliderWeightBody.position.x, this.sliderWeightBody.position.y);

    // 2. Dibujar cuerdas de suspensión de los platos
    this.cableGraphics.clear();
    this.cableGraphics.lineStyle(2, 0x64748b, 0.8);

    const beamLeftX = this.beamBody.position.x - 190 * Math.cos(this.beamBody.angle);
    const beamLeftY = this.beamBody.position.y - 190 * Math.sin(this.beamBody.angle);
    this.cableGraphics.lineBetween(beamLeftX, beamLeftY, this.leftPanBody.position.x, this.leftPanBody.position.y);

    const beamRightX = this.beamBody.position.x + 190 * Math.cos(this.beamBody.angle);
    const beamRightY = this.beamBody.position.y + 190 * Math.sin(this.beamBody.angle);
    this.cableGraphics.lineBetween(beamRightX, beamRightY, this.rightPanBody.position.x, this.rightPanBody.position.y);

    // 3. Sincronizar muestras
    for (const s of this.samples) {
      s.graphic.setPosition(s.body.position.x, s.body.position.y);
      s.graphic.setRotation(s.body.angle);
    }

    // 4. Calcular ángulo e inclinación de la balanza
    const angleDegrees = Phaser.Math.RadToDeg(this.beamBody.angle);
    const absAngle = Math.abs(angleDegrees);

    this.statusText.setText(`Muestras Usadas: ${this.totalSamplesDropped}`);

    // Si la balanza está nivelada (ángulo menor a 2.5 grados)
    const inBalanceZone = absAngle <= 2.5 && this.samples.length > 0;

    if (inBalanceZone) {
      this.deviationText.setText(`Desviación: ±${absAngle.toFixed(1)}° (En Rango Óptimo)`);
      this.deviationText.setColor('#34d399');

      this.currentHoldSeconds += delta / 1000;
      const progress = Math.min(1, this.currentHoldSeconds / this.targetHoldSeconds);
      this.stabilityBarFill.width = progress * 120;
      this.holdProgressText.setText(`Estabilidad Sostenida: ${this.currentHoldSeconds.toFixed(1)}s / 3.0s`);

      if (this.currentHoldSeconds >= this.targetHoldSeconds && !this.isBalanced) {
        this.isBalanced = true;
        this.triggerVictory();
      }
    } else {
      this.deviationText.setText(`Desviación: ±${absAngle.toFixed(1)}°`);
      this.deviationText.setColor('#facc15');

      // Decaimiento suave si sale de la zona
      this.currentHoldSeconds = Math.max(0, this.currentHoldSeconds - (delta / 800));
      const progress = Math.min(1, this.currentHoldSeconds / this.targetHoldSeconds);
      this.stabilityBarFill.width = progress * 120;
      this.holdProgressText.setText(`Estabilidad Sostenida: ${this.currentHoldSeconds.toFixed(1)}s / 3.0s`);
    }
  }

  private triggerVictory() {
    const elapsedSeconds = Math.round((Date.now() - this.startTime) / 1000);

    const absAngle = Math.abs(Phaser.Math.RadToDeg(this.beamBody.angle));
    const accuracy = Math.max(75, Math.round(100 - (absAngle * 8)));
    const efficiencyPenalty = Math.max(0, (this.totalSamplesDropped - 5) * 3);

    const primaryDataScore = Math.max(50, Math.min(100, Math.round(
      (accuracy * 0.7) + (30 - efficiencyPenalty)
    )));

    const metrics: MinigameMetrics = {
      primaryScore: primaryDataScore,
      secondaryBranch: 'dev',
      secondaryScore: accuracy >= 95 ? 90 : 75,
      details: {
        'Precisión de Balanza': `${accuracy}%`,
        'Margen de Error Residual': `±${absAngle.toFixed(2)}°`,
        'Muestras Dosificadas': `${this.totalSamplesDropped}`,
        'Tiempo de Estabilización': `${elapsedSeconds} seg`
      },
      feedbackSummary: `Equilibrio analítico perfecto. Lograste estabilizar la balanza bio-sensorial en ${this.targetHoldSeconds}s con un margen de error menor al 2%.`
    };

    this.showCompletionModal(metrics);
  }

  private createCompletionModal() {
    this.completedModal = this.add.container(this.panelX, this.panelY);
    this.completedModal.setVisible(false);
    this.completedModal.setDepth(100);

    const mBg = this.add.rectangle(0, 0, 520, 320, 0x090d16, 0.98);
    mBg.setStrokeStyle(2, 0x8b5cf6);

    const title = this.add.text(0, -115, '📊 ¡EQUILIBRIO BIO-SENSORIAL ESTABLECIDO!', {
      fontSize: '17px',
      color: '#c084fc',
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

    const finishBtn = this.add.rectangle(0, 110, 260, 42, 0x7c3aed).setInteractive({ useHandCursor: true });
    finishBtn.setStrokeStyle(1, 0xc084fc);
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
      `Precisión Analítica: ${metrics.details['Precisión de Balanza']} | Error Residual: ${metrics.details['Margen de Error Residual']}\n` +
      `Muestras Utilizadas: ${metrics.details['Muestras Dosificadas']}\n\n` +
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
    this.scene.stop('DataMinigameScene');
    this.scene.resume('SpaceShipScene');
  }
}
