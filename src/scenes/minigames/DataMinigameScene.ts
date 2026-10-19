import * as Phaser from 'phaser';
import { MinigameMetrics, VocationalScores } from '../../types/vocational';

interface CropSpecies {
  id: number;
  name: string;
  scientificName: string;
  description: string;
  targetT: number; // 10 a 45 °C
  targetH: number; // 20 a 90 %
  targetL: number; // 10 a 100 Klx
  curveType: 'gaussian' | 'sigmoid' | 'bimodal';
}

export class DataMinigameScene extends Phaser.Scene {
  private panelWidth = 860;
  private panelHeight = 540;
  private panelX = 512;
  private panelY = 320;

  // Especies y ciclos de cultivo
  private speciesList: CropSpecies[] = [
    {
      id: 1,
      name: 'Algassus Primus',
      scientificName: 'Bio-filtro de Oxígeno',
      description: 'Crecimiento unimodal simétrico. Requiere temperatura cálida y humedad moderada para florecer.',
      targetT: 32,
      targetH: 60,
      targetL: 50,
      curveType: 'gaussian'
    },
    {
      id: 2,
      name: 'Fungus Lumina',
      scientificName: 'Micelio Bio-Luminiscente',
      description: 'Crecimiento de fase lenta con saturación en meseta. Prospera en alta humedad y luz tenue.',
      targetT: 22,
      targetH: 80,
      targetL: 25,
      curveType: 'sigmoid'
    },
    {
      id: 3,
      name: 'Solanaceae Orbitalis',
      scientificName: 'Cultivo Nutritivo Hidropónico',
      description: 'Patrón bimodal complejo (fase diurna y nocturna). Exige balance crítico de radiación térmica y lumínica.',
      targetT: 38,
      targetH: 50,
      targetL: 75,
      curveType: 'bimodal'
    }
  ];

  private currentCycleIndex = 0;
  private cycleAccuracies: number[] = [];
  private cycleRmses: number[] = [];

  // Parámetros del jugador
  private paramT = 20; // Temperatura (°C) [10 - 45]
  private paramH = 40; // Humedad (%) [20 - 90]
  private paramL = 30; // Luz (Klx) [10 - 100]

  // Métricas y Stealth Assessment
  private startTime = 0;
  private cycleStartTime = 0;
  private firstAdjustmentTimeRecorded = false;
  private observationTimes: number[] = [];
  private totalAdjustments = 0;
  private usedStepButtonsCount = 0;

  // Gráficos y UI
  private graphBg!: Phaser.GameObjects.Rectangle;
  private graphGraphics!: Phaser.GameObjects.Graphics;
  private graphX = 330;
  private graphY = 320;
  private graphWidth = 420;
  private graphHeight = 270;

  // Textos del HUD
  private speciesTitleText!: Phaser.GameObjects.Text;
  private speciesDescText!: Phaser.GameObjects.Text;
  private cycleIndicatorText!: Phaser.GameObjects.Text;
  private correlationText!: Phaser.GameObjects.Text;
  private rmseText!: Phaser.GameObjects.Text;
  private confirmBtn!: Phaser.GameObjects.Rectangle;
  private confirmBtnText!: Phaser.GameObjects.Text;

  // Sliders UI Controllers
  private sliderTController?: { setVal: (val: number) => void };
  private sliderHController?: { setVal: (val: number) => void };
  private sliderLController?: { setVal: (val: number) => void };

  private completedModal!: Phaser.GameObjects.Container;
  private onCompleteCallback?: (metrics: MinigameMetrics) => void;
  private onCancelCallback?: () => void;

  constructor() {
    super({
      key: 'DataMinigameScene'
    });
  }

  init(data: { onComplete?: (metrics: MinigameMetrics) => void; onCancel?: () => void }) {
    this.onCompleteCallback = data.onComplete;
    this.onCancelCallback = data.onCancel;
    this.currentCycleIndex = 0;
    this.cycleAccuracies = [];
    this.cycleRmses = [];
    this.totalAdjustments = 0;
    this.usedStepButtonsCount = 0;
    this.observationTimes = [];
    this.firstAdjustmentTimeRecorded = false;
    this.paramT = 20;
    this.paramH = 40;
    this.paramL = 30;
  }

  create() {
    this.startTime = Date.now();
    this.cycleStartTime = Date.now();
    this.firstAdjustmentTimeRecorded = false;
    const { width, height } = this.scale;

    // 1. Overlay oscuro
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.88);
    overlay.setInteractive();

    // 2. Chasis del Laboratorio
    const frame = this.add.rectangle(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 0x0f172a, 0.96);
    frame.setStrokeStyle(3, 0x8b5cf6);

    // Cabecera
    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 25, '📊 LABORATORIO DE CULTIVOS // ANALIZADOR DE PATRONES DE CRECIMIENTO', {
      fontSize: '17px',
      color: '#c084fc',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 48, 'Modula los parámetros bio-ambientales (Temperatura, Humedad, Luz) para ajustar la curva del cultivo\nal patrón de referencia óptimo del bio-sensor. Alcanza un 82% de similitud para validar cada ciclo.', {
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

    // 3. Área de visualización gráfica (Izquierda)
    this.setupGraphArea();

    // 4. Panel de control con sliders y sensores (Derecha)
    this.setupControlSliders();

    // 5. Cargar datos del primer ciclo de cultivo
    this.loadCropCycle(0);

    // 6. Modal de finalización
    this.createCompletionModal();
  }

  private setupGraphArea() {
    // Fondo de la cuadrícula
    this.graphBg = this.add.rectangle(this.graphX, this.graphY, this.graphWidth, this.graphHeight, 0x0b1120);
    this.graphBg.setStrokeStyle(1.5, 0x334155);

    this.graphGraphics = this.add.graphics();

    // Etiquetas de los ejes
    this.add.text(this.graphX - this.graphWidth / 2 + 8, this.graphY - this.graphHeight / 2 + 6, '▲ Biomasa (%)', {
      fontSize: '10px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    });

    this.add.text(this.graphX + this.graphWidth / 2 - 14, this.graphY + this.graphHeight / 2 - 16, 'Días ▶', {
      fontSize: '10px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    }).setOrigin(1, 0);

    // Leyenda de curvas
    const legendY = this.graphY + this.graphHeight / 2 + 16;
    
    // Objetivo
    const l1 = this.add.rectangle(this.graphX - 140, legendY, 20, 3, 0xfacc15);
    this.add.text(l1.x + 16, legendY, 'Patrón Objetivo (Sensor)', { fontSize: '10.5px', color: '#facc15' }).setOrigin(0, 0.5);

    // Jugador
    const l2 = this.add.rectangle(this.graphX + 40, legendY, 20, 3, 0x38bdf8);
    this.add.text(l2.x + 16, legendY, 'Curva Calibrada (Actual)', { fontSize: '10.5px', color: '#38bdf8' }).setOrigin(0, 0.5);

    // HUD de correlación y error en tiempo real
    const metricY = this.graphY + this.graphHeight / 2 + 42;
    this.correlationText = this.add.text(this.graphX - 160, metricY, 'Similitud R²: 0.0%', {
      fontSize: '13px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.rmseText = this.add.text(this.graphX + 20, metricY, 'Error RMSE: 0.0', {
      fontSize: '13px',
      color: '#94a3b8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });
  }

  private setupControlSliders() {
    const startX = this.panelX + 130;
    const startY = this.panelY - 110;

    // Tarjeta informativa de la especie
    const cardBg = this.add.rectangle(startX + 105, startY + 15, 255, 75, 0x1e1b4b, 0.6);
    cardBg.setStrokeStyle(1, 0x6366f1);

    this.cycleIndicatorText = this.add.text(startX - 10, startY - 12, 'CICLO 1 / 3', {
      fontSize: '11px',
      color: '#a5b4fc',
      fontStyle: 'bold'
    });

    this.speciesTitleText = this.add.text(startX - 10, startY + 6, 'Algassus Primus', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    this.speciesDescText = this.add.text(startX - 10, startY + 26, 'Bio-filtro de Oxígeno', {
      fontSize: '10px',
      color: '#cbd5e1',
      wordWrap: { width: 235 }
    });

    // Controles de Deslizadores (Temperatura, Humedad, Luz)
    const sliderWidth = 140;
    const sliderBaseY = startY + 95;

    // 1. Slider Temperatura
    this.sliderTController = this.setupSingleSlider(
      startX, sliderBaseY, sliderWidth,
      '🌡️ Temperatura', '#f87171', 10, 45, '°C',
      this.paramT,
      (val) => { this.paramT = val; this.onParameterChanged(); }
    );

    // 2. Slider Humedad
    this.sliderHController = this.setupSingleSlider(
      startX, sliderBaseY + 58, sliderWidth,
      '💧 Humedad Relativa', '#60a5fa', 20, 90, '%',
      this.paramH,
      (val) => { this.paramH = val; this.onParameterChanged(); }
    );

    // 3. Slider Luz
    this.sliderLController = this.setupSingleSlider(
      startX, sliderBaseY + 116, sliderWidth,
      '☀️ Intensidad Lumínica', '#fbbf24', 10, 100, ' Klx',
      this.paramL,
      (val) => { this.paramL = val; this.onParameterChanged(); }
    );

    // Botón Confirmar Calibración
    const btnY = startY + 185;
    this.confirmBtn = this.add.rectangle(startX + 105, btnY, 255, 38, 0x4c1d95).setInteractive({ useHandCursor: true });
    this.confirmBtn.setStrokeStyle(1.5, 0x8b5cf6);

    this.confirmBtnText = this.add.text(startX + 105, btnY, 'Confirmar Calibración (Min 82%)', {
      fontSize: '12px',
      color: '#e9d5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.confirmBtn.on('pointerdown', () => this.handleConfirmCycle());
  }

  private setupSingleSlider(
    x: number, y: number, width: number,
    label: string, colorHex: string,
    min: number, max: number, unit: string,
    initialVal: number,
    onValueChange: (val: number) => void
  ): { setVal: (val: number) => void } {
    this.add.text(x - 10, y - 10, label, { fontSize: '11px', color: colorHex, fontStyle: 'bold' });

    const valText = this.add.text(x + width + 55, y + 8, `${Math.round(initialVal)}${unit}`, {
      fontSize: '11.5px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Botón Step [-]
    const btnMinus = this.add.rectangle(x + 2, y + 8, 22, 22, 0x1e293b).setInteractive({ useHandCursor: true });
    btnMinus.setStrokeStyle(1, 0x475569);
    this.add.text(btnMinus.x, btnMinus.y, '−', { fontSize: '13px', color: '#e2e8f0', fontStyle: 'bold' }).setOrigin(0.5);

    // Track
    const trackX = x + 24;
    const trackWidth = width;
    const trackBg = this.add.rectangle(trackX + trackWidth / 2, y + 8, trackWidth, 6, 0x1e293b);
    trackBg.setStrokeStyle(1, 0x334155);

    const fill = this.add.rectangle(trackX, y + 8, 0, 6, Phaser.Display.Color.HexStringToColor(colorHex).color);
    fill.setOrigin(0, 0.5);

    // Handle
    const handle = this.add.circle(trackX, y + 8, 8, 0xffffff);
    handle.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(colorHex).color);
    handle.setInteractive({ useHandCursor: true });

    // Botón Step [+]
    const btnPlus = this.add.rectangle(trackX + trackWidth + 14, y + 8, 22, 22, 0x1e293b).setInteractive({ useHandCursor: true });
    btnPlus.setStrokeStyle(1, 0x475569);
    this.add.text(btnPlus.x, btnPlus.y, '+', { fontSize: '13px', color: '#e2e8f0', fontStyle: 'bold' }).setOrigin(0.5);

    const updateFromNormalized = (norm: number, isStepButton = false, triggerChange = true) => {
      const clampedNorm = Phaser.Math.Clamp(norm, 0, 1);
      const val = min + (clampedNorm * (max - min));
      handle.x = trackX + (clampedNorm * trackWidth);
      fill.width = clampedNorm * trackWidth;
      valText.setText(`${Math.round(val)}${unit}`);
      if (isStepButton) this.usedStepButtonsCount++;
      if (triggerChange) onValueChange(val);
    };

    // Inicializar posición
    const initialNorm = (initialVal - min) / (max - min);
    updateFromNormalized(initialNorm, false, false);

    // Drag del handle
    this.input.setDraggable(handle);
    handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const norm = (dragX - trackX) / trackWidth;
      updateFromNormalized(norm);
    });

    trackBg.setInteractive({ useHandCursor: true });
    trackBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const norm = (pointer.x - trackX) / trackWidth;
      updateFromNormalized(norm);
    });

    btnMinus.on('pointerdown', () => {
      const step = (max - min) * 0.05;
      const currentNorm = (handle.x - trackX) / trackWidth;
      const currentVal = min + (currentNorm * (max - min));
      const newVal = Math.max(min, currentVal - step);
      updateFromNormalized((newVal - min) / (max - min), true);
    });

    btnPlus.on('pointerdown', () => {
      const step = (max - min) * 0.05;
      const currentNorm = (handle.x - trackX) / trackWidth;
      const currentVal = min + (currentNorm * (max - min));
      const newVal = Math.min(max, currentVal + step);
      updateFromNormalized((newVal - min) / (max - min), true);
    });

    return {
      setVal: (v: number) => {
        const n = (v - min) / (max - min);
        updateFromNormalized(n, false, false);
      }
    };
  }

  private onParameterChanged() {
    this.totalAdjustments++;
    if (!this.firstAdjustmentTimeRecorded) {
      this.firstAdjustmentTimeRecorded = true;
      const obsSeconds = (Date.now() - this.cycleStartTime) / 1000;
      this.observationTimes.push(obsSeconds);
    }
    this.renderCurves();
  }

  private loadCropCycle(cycleIdx: number) {
    this.currentCycleIndex = cycleIdx;
    this.cycleStartTime = Date.now();
    this.firstAdjustmentTimeRecorded = false;

    const crop = this.speciesList[cycleIdx];
    this.cycleIndicatorText.setText(`CICLO ${crop.id} / 3`);
    this.speciesTitleText.setText(crop.name);
    this.speciesDescText.setText(`${crop.scientificName}\n${crop.description}`);

    // Establecer parámetros iniciales alejados del óptimo para exigir calibración
    if (cycleIdx === 0) {
      this.paramT = 18;
      this.paramH = 35;
      this.paramL = 30;
    } else if (cycleIdx === 1) {
      this.paramT = 38;
      this.paramH = 40;
      this.paramL = 80;
    } else {
      this.paramT = 20;
      this.paramH = 80;
      this.paramL = 35;
    }

    this.sliderTController?.setVal(this.paramT);
    this.sliderHController?.setVal(this.paramH);
    this.sliderLController?.setVal(this.paramL);

    this.renderCurves();
  }

  // Evaluación de la curva matemática de crecimiento en el tiempo t (0 a 10 días)
  private evaluateCurve(crop: CropSpecies, t: number, T: number, H: number, L: number): number {
    if (crop.curveType === 'gaussian') {
      // Gaussian bell:
      // T controla amplitud de pico
      // H controla el día del pico
      // L controla el ancho / tolerancia
      const amplitude = (T / 35) * 85;
      const peakDay = (H / 100) * 8 + 1; // 1 a 9
      const spread = Math.max(0.8, (L / 100) * 3);
      return amplitude * Math.exp(-Math.pow(t - peakDay, 2) / (2 * spread * spread));
    } else if (crop.curveType === 'sigmoid') {
      // Sigmoid S-Curve (meseta de biomasa):
      const maxBiomass = (T / 25) * 88;
      const inflectionDay = 10 - ((H / 100) * 8); // Humedad acelera maduración
      const slope = Math.max(0.4, (100 - L) / 50);
      return maxBiomass / (1 + Math.exp(-slope * (t - inflectionDay)));
    } else {
      // Bimodal (dos picos de floración diurna/nocturna):
      const amp1 = (T / 40) * 70;
      const amp2 = (L / 80) * 60;
      const peak1 = (H / 100) * 4 + 1.5;
      const peak2 = peak1 + 4.2;
      const spread1 = 1.1;
      const spread2 = 1.3;
      return (amp1 * Math.exp(-Math.pow(t - peak1, 2) / (2 * spread1 * spread1))) +
             (amp2 * Math.exp(-Math.pow(t - peak2, 2) / (2 * spread2 * spread2)));
    }
  }

  private renderCurves() {
    this.graphGraphics.clear();

    const crop = this.speciesList[this.currentCycleIndex];
    const steps = 60;
    const originX = this.graphX - this.graphWidth / 2 + 35;
    const originY = this.graphY + this.graphHeight / 2 - 25;
    const plotWidth = this.graphWidth - 55;
    const plotHeight = this.graphHeight - 45;

    // 1. Dibujar líneas de cuadrícula tenue
    this.graphGraphics.lineStyle(1, 0x1e293b, 0.8);
    for (let i = 0; i <= 5; i++) {
      const y = originY - (i / 5) * plotHeight;
      this.graphGraphics.lineBetween(originX, y, originX + plotWidth, y);
    }
    for (let i = 0; i <= 10; i += 2) {
      const x = originX + (i / 10) * plotWidth;
      this.graphGraphics.lineBetween(x, originY, x, originY - plotHeight);
    }

    // 2. Calcular puntos y discrepancia
    let sumSquaredError = 0;
    const targetPoints: { x: number; y: number }[] = [];
    const playerPoints: { x: number; y: number }[] = [];

    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * 10; // Día 0 a 10
      const targetVal = this.evaluateCurve(crop, t, crop.targetT, crop.targetH, crop.targetL);
      const playerVal = this.evaluateCurve(crop, t, this.paramT, this.paramH, this.paramL);

      const px = originX + (s / steps) * plotWidth;
      const pyTarget = originY - Phaser.Math.Clamp(targetVal / 100, 0, 1) * plotHeight;
      const pyPlayer = originY - Phaser.Math.Clamp(playerVal / 100, 0, 1) * plotHeight;

      targetPoints.push({ x: px, y: pyTarget });
      playerPoints.push({ x: px, y: pyPlayer });

      const diff = playerVal - targetVal;
      sumSquaredError += diff * diff;
    }

    const rmse = Math.sqrt(sumSquaredError / (steps + 1));
    // Precisión escalada de 0 a 100
    const accuracy = Math.max(0, Math.min(100, Math.round((100 - rmse * 1.85) * 10) / 10));

    // 3. Dibujar Banda de Tolerancia Objetivo (halo dorado)
    this.graphGraphics.fillStyle(0xfacc15, 0.08);
    this.graphGraphics.beginPath();
    for (let i = 0; i <= steps; i++) {
      const pt = targetPoints[i];
      if (i === 0) this.graphGraphics.moveTo(pt.x, pt.y - 8);
      else this.graphGraphics.lineTo(pt.x, pt.y - 8);
    }
    for (let i = steps; i >= 0; i--) {
      const pt = targetPoints[i];
      this.graphGraphics.lineTo(pt.x, pt.y + 8);
    }
    this.graphGraphics.closePath();
    this.graphGraphics.fillPath();

    // 4. Dibujar Curva Objetivo (Línea punteada dorada)
    this.graphGraphics.lineStyle(2.5, 0xfacc15, 0.95);
    for (let i = 0; i < steps; i += 2) {
      const p1 = targetPoints[i];
      const p2 = targetPoints[i + 1];
      this.graphGraphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }

    // 5. Dibujar Curva del Jugador (Línea continua cian con brillo)
    const curveColor = accuracy >= 82 ? 0x22c55e : (accuracy >= 60 ? 0x38bdf8 : 0xec4899);
    this.graphGraphics.lineStyle(3, curveColor, 1);
    this.graphGraphics.beginPath();
    for (let i = 0; i <= steps; i++) {
      const pt = playerPoints[i];
      if (i === 0) this.graphGraphics.moveTo(pt.x, pt.y);
      else this.graphGraphics.lineTo(pt.x, pt.y);
    }
    this.graphGraphics.strokePath();

    // 6. Actualizar métricas visuales del HUD
    this.correlationText.setText(`Similitud R²: ${accuracy.toFixed(1)}%`);
    this.rmseText.setText(`Error RMSE: ${rmse.toFixed(2)}`);

    if (accuracy >= 82) {
      this.correlationText.setColor('#4ade80');
      this.confirmBtn.setFillStyle(0x166534);
      this.confirmBtn.setStrokeStyle(1.5, 0x4ade80);
      this.confirmBtnText.setText(`✓ Confirmar Ciclo ${this.currentCycleIndex + 1} (${accuracy.toFixed(1)}%)`);
      this.confirmBtnText.setColor('#ffffff');
    } else {
      this.correlationText.setColor(accuracy >= 60 ? '#facc15' : '#f87171');
      this.confirmBtn.setFillStyle(0x312e81);
      this.confirmBtn.setStrokeStyle(1.5, 0x6366f1);
      this.confirmBtnText.setText(`Calibrando... ${accuracy.toFixed(1)}% (Req: 82%)`);
      this.confirmBtnText.setColor('#c7d2fe');
    }
  }

  private handleConfirmCycle() {
    const crop = this.speciesList[this.currentCycleIndex];
    const steps = 60;
    let sumSquaredError = 0;

    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * 10;
      const targetVal = this.evaluateCurve(crop, t, crop.targetT, crop.targetH, crop.targetL);
      const playerVal = this.evaluateCurve(crop, t, this.paramT, this.paramH, this.paramL);
      const diff = playerVal - targetVal;
      sumSquaredError += diff * diff;
    }
    const rmse = Math.sqrt(sumSquaredError / (steps + 1));
    const accuracy = Math.max(0, Math.min(100, Math.round((100 - rmse * 1.85) * 10) / 10));

    if (accuracy < 82) {
      // Feedback de intento prematuro
      this.cameras.main.shake(120, 0.005);
      this.confirmBtnText.setText('¡Ajuste insuficiente! Requiere ≥ 82%');
      this.time.delayedCall(1200, () => {
        this.renderCurves();
      });
      return;
    }

    // Registrar resultados del ciclo
    this.cycleAccuracies.push(accuracy);
    this.cycleRmses.push(rmse);

    // Efecto visual de calibración exitosa
    this.createFlashEffect(this.graphX, this.graphY, 0x22c55e);

    if (this.currentCycleIndex < this.speciesList.length - 1) {
      // Pasar al siguiente ciclo
      this.loadCropCycle(this.currentCycleIndex + 1);
    } else {
      // Completó los 3 ciclos
      this.triggerVictory();
    }
  }

  private createFlashEffect(x: number, y: number, color: number) {
    const f = this.add.circle(x, y, 40, color, 0.7);
    this.tweens.add({
      targets: f,
      scale: 3.5,
      alpha: 0,
      duration: 400,
      onComplete: () => f.destroy()
    });
  }

  private triggerVictory() {
    const elapsedSeconds = Math.round((Date.now() - this.startTime) / 1000);

    const avgAccuracy = this.cycleAccuracies.length > 0
      ? Math.round(this.cycleAccuracies.reduce((a, b) => a + b, 0) / this.cycleAccuracies.length)
      : 85;

    const avgRmse = this.cycleRmses.length > 0
      ? (this.cycleRmses.reduce((a, b) => a + b, 0) / this.cycleRmses.length).toFixed(2)
      : '2.10';

    // Puntuación primaria vocacional de Ciencia de Datos [50 - 100]
    const primaryDataScore = Math.max(50, Math.min(100, Math.round(avgAccuracy)));

    // Puntuación secundaria continua para 'dev' (modelado matemático)
    const secondaryDevScore = Math.max(55, Math.min(100, Math.round(
      (avgAccuracy * 0.7) + (Math.min(30, this.usedStepButtonsCount * 2))
    )));

    // Stealth Assessment (Landers 2024 / Shute 2011)
    const behavioralBonuses: Partial<VocationalScores> = {};

    // 1. Alta precisión analítica
    if (avgAccuracy >= 90) {
      behavioralBonuses.data = 0.8; // Razonamiento inductivo y ajuste empírico riguroso
    }

    // 2. Tiempo de observación previa a la acción (analítico vs impulsivo)
    const avgObsTime = this.observationTimes.length > 0
      ? this.observationTimes.reduce((a, b) => a + b, 0) / this.observationTimes.length
      : 2;

    if (avgObsTime >= 3.0) {
      behavioralBonuses.biz = 0.5; // Planificación reflexiva y lectura previa de datos
    }

    // 3. Método de ajuste fino (uso de botones step +/- en vez de arrastre brusco)
    if (this.usedStepButtonsCount >= 8) {
      behavioralBonuses.dev = 0.5; // Calibración sistemática e incremental
    }

    const metrics: MinigameMetrics = {
      primaryScore: primaryDataScore,
      secondaryBranch: 'dev',
      secondaryScore: secondaryDevScore,
      behavioralBonuses,
      details: {
        'Precisión Promedio': `${avgAccuracy}%`,
        'Ciclos Completados': `${this.speciesList.length} / ${this.speciesList.length}`,
        'Error Residual RMSE': `${avgRmse}`,
        'Ajustes Totales': `${this.totalAdjustments}`,
        'Calibraciones Finas': `${this.usedStepButtonsCount}`,
        'Tiempo de Observación': `${avgObsTime.toFixed(1)}s prom`,
        'Tiempo de Calibración': `${elapsedSeconds} seg`
      },
      feedbackSummary: `Análisis de bio-patrones completado con éxito. Lograste un promedio de ajuste del ${avgAccuracy}% (RMSE ${avgRmse}) en los 3 ciclos de incubación orbital.`
    };

    this.showCompletionModal(metrics);
  }

  private createCompletionModal() {
    this.completedModal = this.add.container(this.panelX, this.panelY);
    this.completedModal.setVisible(false);
    this.completedModal.setDepth(100);

    const mBg = this.add.rectangle(0, 0, 520, 320, 0x090d16, 0.98);
    mBg.setStrokeStyle(2, 0x8b5cf6);

    const title = this.add.text(0, -115, '📊 ¡PATRONES DE CULTIVO CALIBRADOS!', {
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
      `Precisión de Ajuste: ${metrics.details['Precisión Promedio']} | Error RMSE: ${metrics.details['Error Residual RMSE']}\n` +
      `Ciclos Completados: ${metrics.details['Ciclos Completados']} | Ajustes Totales: ${metrics.details['Ajustes Totales']}\n` +
      `Observación Previa: ${metrics.details['Tiempo de Observación']} | Tiempo Total: ${metrics.details['Tiempo de Calibración']}\n\n` +
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
    this.scene.stop('DataMinigameScene');
    this.scene.resume('SpaceShipScene');
  }
}
