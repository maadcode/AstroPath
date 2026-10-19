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
    this.drawVocationalBreakdown(width / 2 - 225, 105, scores);

    // 2. Dibujar panel de métricas de telemetría a la derecha
    this.drawTelemetryPanel(width / 2 + 235, 105);

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

    const barWidth = 410;
    const barHeight = 10;
    let currentY = startY;

    this.add.text(centerX - barWidth / 2, currentY - 5, 'DISTRIBUCIÓN VOCACIONAL (% AFINIDAD)', {
      fontSize: '11px',
      color: '#94a3b8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    currentY += 26;

    branches.forEach((b, index) => {
      const isTop = index === 0;
      const titlePrefix = isTop ? '⭐ TOP: ' : '';

      // Título de la rama a la izquierda
      this.add.text(centerX - barWidth / 2, currentY, `${titlePrefix}${b.name}`, {
        fontSize: isTop ? '13px' : '12px',
        color: b.color,
        fontStyle: isTop ? 'bold' : 'normal',
        fontFamily: 'sans-serif'
      });

      // Porcentaje a la derecha
      this.add.text(centerX + barWidth / 2, currentY, `${b.percent}%`, {
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      }).setOrigin(1, 0);

      // Barra de fondo (posicionada limpiamente debajo del título)
      const barY = currentY + 24;
      const bgBar = this.add.rectangle(centerX, barY, barWidth, barHeight, 0x1e293b).setOrigin(0.5);
      bgBar.setStrokeStyle(1, 0x334155);

      // Barra de progreso animada
      const fillW = Math.max(8, (b.percent / 100) * barWidth);
      const fillBar = this.add.rectangle(centerX - barWidth / 2, barY, 0, barHeight, b.colorHex).setOrigin(0, 0.5);

      this.tweens.add({
        targets: fillBar,
        width: fillW,
        duration: 800 + (index * 120),
        ease: 'Cubic.easeOut'
      });

      // Descripción debajo de la barra de progreso
      this.add.text(centerX - barWidth / 2, currentY + 36, b.desc, {
        fontSize: '10px',
        color: '#94a3b8',
        fontFamily: 'sans-serif'
      });

      currentY += 76;
    });
  }

  private drawTelemetryPanel(centerX: number, startY: number) {
    const cardWidth = 430;
    const cardHeight = 435;

    const bg = this.add.rectangle(centerX, startY + cardHeight / 2 - 10, cardWidth, cardHeight, 0x0b1120, 0.95);
    bg.setStrokeStyle(1.5, 0x1e293b);

    this.add.text(centerX, startY + 6, '📡 TELEMETRÍA Y MÉTRICAS TÉCNICAS', {
      fontSize: '12px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    let curY = startY + 28;

    const stationCards = [
      { id: 'station_net', name: 'Torre de Antenas', icon: '📡', color: '#34d399' },
      { id: 'station_sec', name: 'Puesto de Vigilancia', icon: '🛡️', color: '#f87171' },
      { id: 'station_dev', name: 'Bahía de Ensamblaje', icon: '🤖', color: '#60a5fa' },
      { id: 'station_data', name: 'Laboratorio de Cultivos', icon: '🌱', color: '#c084fc' },
      { id: 'station_biz', name: 'Sala Común', icon: '📋', color: '#fbbf24' }
    ];

    stationCards.forEach(sc => {
      const station = this.gameState.getStation(sc.id);
      const metrics = station?.minigameMetrics;

      // Fondo sutil de fila para separar visualmente cada estación
      const rowBg = this.add.rectangle(centerX, curY + 22, cardWidth - 20, 48, 0x0f172a, 0.7);
      rowBg.setStrokeStyle(1, 0x1e293b);

      // Línea 1: Nombre de la estación (Izquierda)
      this.add.text(centerX - cardWidth / 2 + 18, curY + 4, `${sc.icon} ${sc.name}`, {
        fontSize: '12px',
        color: sc.color,
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      });

      // Línea 1: Puntuaciones Primaria y Secundaria (Derecha)
      const scoreText = metrics 
        ? `Prim: ${metrics.primaryScore}%  |  Sec (${metrics.secondaryBranch?.toUpperCase()}): ${metrics.secondaryScore}%` 
        : 'No calibrado';

      this.add.text(centerX + cardWidth / 2 - 18, curY + 4, scoreText, {
        fontSize: '10.5px',
        color: '#facc15',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      }).setOrigin(1, 0);

      // Línea 2: Detalles de métricas (con ancho restringido para evitar desbordes)
      if (metrics && metrics.details) {
        const detailsArr = Object.entries(metrics.details).slice(0, 3);
        const detailStr = detailsArr.map(([k, v]) => `${k}: ${v}`).join('  •  ');
        this.add.text(centerX - cardWidth / 2 + 18, curY + 25, detailStr, {
          fontSize: '9.5px',
          color: '#cbd5e1',
          fontFamily: 'sans-serif',
          wordWrap: { width: cardWidth - 36 }
        });
      }

      curY += 54;
    });

    // Párrafo de recomendación final
    const recommendationBg = this.add.rectangle(centerX, startY + cardHeight - 38, cardWidth - 30, 44, 0x1e293b, 0.6);
    recommendationBg.setStrokeStyle(1, 0x334155);

    this.add.text(centerX, startY + cardHeight - 38, '💡 Consejo: Combina tu afinidad técnica primaria con habilidades\nprácticas para potenciar tu rol profesional.', {
      fontSize: '10px',
      color: '#94a3b8',
      align: 'center',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
  }
}
