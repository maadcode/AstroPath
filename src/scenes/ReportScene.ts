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

    // Contenedor principal con scroll o centrado
    const panel = this.add.rectangle(width / 2, height / 2, Math.min(width * 0.95, 840), Math.min(height * 0.92, 600), 0x0f172a, 0.95);
    panel.setStrokeStyle(2, 0x38bdf8);

    // Título Principal
    this.add.text(width / 2, 45, '🎓 TU PERFIL VOCACIONAL EN TECNOLOGÍA', {
      fontSize: '22px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.add.text(width / 2, 75, 'Basado en cómo pensaste, decidiste y sentiste durante tu viaje por la nave', {
      fontSize: '13px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    const scores = this.gameState.getPercentageScores();

    // Dibujar gráfico y desglose
    this.drawVocationalBreakdown(width / 2, 110, scores);

    // Botón reiniciar Odisea
    const resetBtn = this.add.rectangle(width / 2, height - 40, 200, 42, 0x0284c7).setInteractive({ useHandCursor: true });
    resetBtn.setStrokeStyle(1, 0x38bdf8);
    this.add.text(width / 2, height - 40, '🔄 Volver a Explorar', {
      fontSize: '14px',
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
        desc: 'Te atrae construir cosas, entender la lógica y crear herramientas que resuelvan problemas.',
        color: '#38bdf8',
        colorHex: 0x38bdf8,
        percent: scores.dev
      },
      {
        key: 'net',
        name: 'Redes e Infraestructura',
        desc: 'Te gusta mantener los caminos abiertos, conectar sistemas y que todo viaje rápido y estable.',
        color: '#34d399',
        colorHex: 0x34d399,
        percent: scores.net
      },
      {
        key: 'sec',
        name: 'Seguridad Informática',
        desc: 'Tienes buen ojo para prevenir riesgos, proteger a las personas y asegurar la privacidad.',
        color: '#f87171',
        colorHex: 0xf87171,
        percent: scores.sec
      },
      {
        key: 'data',
        name: 'Ciencia de Datos e Inteligencia Artificial',
        desc: 'Disfrutas encontrar pistas en la información, descubrir patrones ocultos y anticipar el futuro.',
        color: '#c084fc',
        colorHex: 0xc084fc,
        percent: scores.data
      },
      {
        key: 'biz',
        name: 'Gestión y Análisis de Negocios en TI',
        desc: 'Tienes empatía para escuchar necesidades, coordinar equipos y elegir las mejores prioridades.',
        color: '#fbbf24',
        colorHex: 0xfbbf24,
        percent: scores.biz
      }
    ];

    // Ordenar de mayor a menor afinidad
    branches.sort((a, b) => b.percent - a.percent);

    const barHeight = 16;
    let currentY = startY;

    branches.forEach((b, index) => {
      // Indicador de puesto (Top 1 destacado)
      const isTop = index === 0;
      const titlePrefix = isTop ? '⭐ TU MAYOR AFINIDAD: ' : '';

      this.add.text(centerX - 350, currentY, `${titlePrefix}${b.name}`, {
        fontSize: isTop ? '16px' : '14px',
        color: b.color,
        fontStyle: isTop ? 'bold' : 'normal',
        fontFamily: 'sans-serif'
      });

      this.add.text(centerX + 350, currentY, `${b.percent}%`, {
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      }).setOrigin(1, 0);

      // Barra de progreso fondo
      const bgBar = this.add.rectangle(centerX, currentY + 24, 700, barHeight, 0x1e293b).setOrigin(0.5);
      bgBar.setStrokeStyle(1, 0x334155);

      // Barra rellena con animación tween
      const fillW = Math.max(8, (b.percent / 100) * 700);
      const fillBar = this.add.rectangle(centerX - 350, currentY + 24, 0, barHeight, b.colorHex).setOrigin(0, 0.5);

      this.tweens.add({
        targets: fillBar,
        width: fillW,
        duration: 800 + (index * 150),
        ease: 'Cubic.easeOut'
      });

      // Breve descripción amigable
      this.add.text(centerX - 350, currentY + 38, b.desc, {
        fontSize: '11px',
        color: '#94a3b8',
        fontFamily: 'sans-serif'
      });

      currentY += 72;
    });
  }
}
