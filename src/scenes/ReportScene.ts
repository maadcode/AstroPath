import * as Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { VocationalScores } from '../types/vocational';

export class ReportScene extends Phaser.Scene {
  private gameState = GameState.getInstance();

  constructor() {
    super('ReportScene');
  }

  create() {
    const { width, height } = this.scale;

    // Fondo estelar
    this.add.rectangle(width / 2, height / 2, width, height, 0x050711);

    // Contenedor principal
    const panel = this.add.rectangle(width / 2, height / 2, Math.min(width * 0.96, 960), Math.min(height * 0.94, 600), 0x0f172a, 0.96);
    panel.setStrokeStyle(2, 0x38bdf8);

    // Título Principal
    this.add.text(width / 2, 40, '🎓 INFORME VOCACIONAL INTEGRAL EN TECNOLOGÍA', {
      fontSize: '20px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.add.text(width / 2, 65, 'Basado en tu desempeño técnico en los simuladores físicos, tus decisiones lógicas y tu afinidad emocional', {
      fontSize: '12px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    const scores = this.gameState.getPercentageScores();

    // 1. Dibujar gráfico y desglose a la izquierda
    this.drawVocationalBreakdown(width / 2 - 210, 105, scores);

    // 2. Dibujar panel de métricas de telemetría a la derecha
    this.drawTelemetryPanel(width / 2 + 250, 105);

    // 3. Botón reiniciar Odisea
    const resetBtn = this.add.rectangle(width / 2, height - 35, 220, 38, 0x0284c7).setInteractive({ useHandCursor: true });
    resetBtn.setStrokeStyle(1, 0x38bdf8);
    this.add.text(width / 2, height - 35, '🔄 Volver a Explorar la Nave', {
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    resetBtn.on('pointerdown', () => {
      this.gameState.reset();
      this.scene.stop('ReportScene');
      this.scene.start('SpaceShipScene');
      this.scene.start('UIScene');
    });
  }

  private drawVocationalBreakdown(
    centerX: number,
    startY: number,
    scores: { [K in keyof VocationalScores]: number }
  ) {
    const branches = [
      {
        key: 'dev',
        name: 'Desarrollo de Software',
        desc: 'Construcción lógica, cinemática y creación de herramientas.',
        color: '#38bdf8',
        colorHex: 0x38bdf8,
        percent: scores.dev
      },
      {
        key: 'net',
        name: 'Redes e Infraestructura',
        desc: 'Conexión de sistemas, ruteo elástico y flujos de datos rápidos.',
        color: '#34d399',
        colorHex: 0x34d399,
        percent: scores.net
      },
      {
        key: 'sec',
        name: 'Seguridad Informática',
        desc: 'Filtrado balístico de amenazas, control de accesos y blindaje.',
        color: '#f87171',
        colorHex: 0xf87171,
        percent: scores.sec
      },
      {
        key: 'data',
        name: 'Ciencia de Datos e Inteligencia Artificial',
        desc: 'Equilibrio de variables, bio-sensores y precisión analítica.',
        color: '#c084fc',
        colorHex: 0xc084fc,
        percent: scores.data
      },
      {
        key: 'biz',
        name: 'Gestión y Negocios en TI',
        desc: 'Organización, escucha activa y optimización de recursos humanos.',
        color: '#fbbf24',
        colorHex: 0xfbbf24,
        percent: scores.biz
      }
    ];

    branches.sort((a, b) => b.percent - a.percent);

    const barWidth = 440;
    const barHeight = 14;
    let currentY = startY;

    this.add.text(centerX - barWidth / 2, currentY - 5, 'DISTRIBUCIÓN VOCACIONAL (% AFINIDAD)', {
      fontSize: '11px',
      color: '#94a3b8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    currentY += 24;

    branches.forEach((b, index) => {
      const isTop = index === 0;
      const titlePrefix = isTop ? '⭐ TOP: ' : '';

      this.add.text(centerX - barWidth / 2, currentY, `${titlePrefix}${b.name}`, {
        fontSize: isTop ? '13px' : '12px',
        color: b.color,
        fontStyle: isTop ? 'bold' : 'normal',
        fontFamily: 'sans-serif'
      });

      this.add.text(centerX + barWidth / 2, currentY, `${b.percent}%`, {
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      }).setOrigin(1, 0);

      // Barra de fondo
      const bgBar = this.add.rectangle(centerX, currentY + 18, barWidth, barHeight, 0x1e293b).setOrigin(0.5);
      bgBar.setStrokeStyle(1, 0x334155);

      // Barra de progreso animada
      const fillW = Math.max(8, (b.percent / 100) * barWidth);
      const fillBar = this.add.rectangle(centerX - barWidth / 2, currentY + 18, 0, barHeight, b.colorHex).setOrigin(0, 0.5);

      this.tweens.add({
        targets: fillBar,
        width: fillW,
        duration: 800 + (index * 120),
        ease: 'Cubic.easeOut'
      });

      this.add.text(centerX - barWidth / 2, currentY + 30, b.desc, {
        fontSize: '10px',
        color: '#64748b',
        fontFamily: 'sans-serif'
      });

      currentY += 66;
    });
  }

  private drawTelemetryPanel(centerX: number, startY: number) {
    const cardWidth = 380;
    const cardHeight = 420;

    const bg = this.add.rectangle(centerX, startY + cardHeight / 2 - 10, cardWidth, cardHeight, 0x0b1120, 0.9);
    bg.setStrokeStyle(1.5, 0x1e293b);

    this.add.text(centerX, startY + 5, '📡 TELEMETRÍA Y MÉTRICAS FÍSICAS', {
      fontSize: '12px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    let curY = startY + 32;

    const stationCards = [
      { id: 'station_net', name: '🖧 Torre de Antenas: Patch Panel Elástico', color: '#34d399' },
      { id: 'station_sec', name: '🛡️ Puesto de Vigilancia: Deflector Balístico', color: '#f87171' },
      { id: 'station_dev', name: '🤖 Bahía de Ensamblaje: Brazo Cinemático', color: '#60a5fa' },
      { id: 'station_data', name: '📊 Laboratorio de Cultivos: Balanza Bio-Sensorial', color: '#c084fc' },
      { id: 'station_biz', name: '🤝 Sala Común: Mediación y Consenso', color: '#fbbf24' }
    ];

    stationCards.forEach(sc => {
      const station = this.gameState.getStation(sc.id);
      const metrics = station?.minigameMetrics;

      this.add.text(centerX - cardWidth / 2 + 16, curY, sc.name, {
        fontSize: '11px',
        color: sc.color,
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      });

      const scoreText = metrics ? `Puntaje: ${metrics.primaryScore}/100` : 'No calibrado';
      this.add.text(centerX + cardWidth / 2 - 16, curY, scoreText, {
        fontSize: '11px',
        color: '#facc15',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      }).setOrigin(1, 0);

      curY += 18;

      if (metrics && metrics.details) {
        const detailsArr = Object.entries(metrics.details).slice(0, 2);
        const detailStr = detailsArr.map(([k, v]) => `${k}: ${v}`).join('  |  ');
        this.add.text(centerX - cardWidth / 2 + 20, curY, detailStr, {
          fontSize: '10px',
          color: '#cbd5e1',
          fontFamily: 'sans-serif'
        });
      }

      curY += 46;
    });

    // Párrafo de recomendación final
    const recommendationBg = this.add.rectangle(centerX, startY + cardHeight - 45, cardWidth - 30, 50, 0x1e293b, 0.6);
    recommendationBg.setStrokeStyle(1, 0x334155);

    this.add.text(centerX, startY + cardHeight - 45, '💡 Consejo: Combina tu afinidad técnica primaria con habilidades\nprácticas para potenciar tu rol profesional.', {
      fontSize: '10px',
      color: '#94a3b8',
      align: 'center',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
  }
}
