import * as Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { VocationalScores } from '../types/vocational';
import { getTopCareerProfiles, TopCareerProfileResult } from '../data/careerProfiles';

export class ReportScene extends Phaser.Scene {
  private gameState = GameState.getInstance();
  private profilesContainer!: Phaser.GameObjects.Container;
  private telemetryContainer!: Phaser.GameObjects.Container;
  private tab1Btn!: Phaser.GameObjects.Rectangle;
  private tab1Text!: Phaser.GameObjects.Text;
  private tab2Btn!: Phaser.GameObjects.Rectangle;
  private tab2Text!: Phaser.GameObjects.Text;

  constructor() {
    super('ReportScene');
  }

  create() {
    const { width, height } = this.scale;

    // Fondo estelar
    this.add.rectangle(width / 2, height / 2, width, height, 0x050711);

    // Contenedor principal
    const panelW = Math.min(width * 0.96, 970);
    const panelH = Math.min(height * 0.95, 608);
    const panel = this.add.rectangle(width / 2, height / 2, panelW, panelH, 0x0f172a, 0.97);
    panel.setStrokeStyle(2, 0x38bdf8);

    // Título Principal
    this.add.text(width / 2, 26, '🎓 INFORME VOCACIONAL INTEGRAL EN TECNOLOGÍA', {
      fontSize: '18px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.add.text(width / 2, 47, 'Mapeo de tu talento espacial hacia el mundo profesional real y las carreras del futuro', {
      fontSize: '11px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    const scores = this.gameState.getPercentageScores();

    // Contenedores para las dos vistas
    this.profilesContainer = this.add.container(0, 0);
    this.telemetryContainer = this.add.container(0, 0);

    // Pestañas de navegación
    this.createTabButtons(width / 2, 74);

    // 1. Dibujar fichas de carreras y perfiles vocacionales (en profilesContainer)
    this.drawCareerProfiles(width, scores);

    // 2. Dibujar desglose vocacional y telemetría técnica (en telemetryContainer)
    this.drawVocationalBreakdown(width / 2 - 230, 102, scores);
    this.drawTelemetryPanel(width / 2 + 230, 102);

    // Por defecto mostrar 'profiles'
    this.switchTab('profiles');

    // 3. Botón inferior para reiniciar la Odisea
    const resetBtn = this.add.rectangle(width / 2, height - 28, 230, 32, 0x0284c7).setInteractive({ useHandCursor: true });
    resetBtn.setStrokeStyle(1.5, 0x38bdf8);
    this.add.text(width / 2, height - 28, '🔄 Volver a Explorar la Nave', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    resetBtn.on('pointerover', () => resetBtn.setFillStyle(0x0369a1));
    resetBtn.on('pointerout', () => resetBtn.setFillStyle(0x0284c7));

    resetBtn.on('pointerdown', () => {
      this.gameState.reset();
      this.scene.stop('ReportScene');
      this.scene.start('SpaceShipScene');
      this.scene.start('UIScene');
    });
  }

  private createTabButtons(centerX: number, tabY: number) {
    const tabWidth = 260;
    const tabHeight = 28;
    const spacing = 12;

    // Botón Tab 1: Perfiles Vocacionales y Carreras
    this.tab1Btn = this.add.rectangle(centerX - tabWidth / 2 - spacing / 2, tabY, tabWidth, tabHeight, 0x1e293b)
      .setInteractive({ useHandCursor: true });
    this.tab1Btn.setStrokeStyle(1.5, 0x38bdf8);
    this.tab1Text = this.add.text(this.tab1Btn.x, tabY, '🌟 Perfiles Vocacionales y Carreras', {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    // Botón Tab 2: Gráficos y Telemetría Técnica
    this.tab2Btn = this.add.rectangle(centerX + tabWidth / 2 + spacing / 2, tabY, tabWidth, tabHeight, 0x0f172a)
      .setInteractive({ useHandCursor: true });
    this.tab2Btn.setStrokeStyle(1, 0x475569);
    this.tab2Text = this.add.text(this.tab2Btn.x, tabY, '📊 Métricas y Desglose Técnico', {
      fontSize: '11px',
      color: '#94a3b8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.tab1Btn.on('pointerdown', () => this.switchTab('profiles'));
    this.tab2Btn.on('pointerdown', () => this.switchTab('telemetry'));
  }

  private switchTab(tab: 'profiles' | 'telemetry') {
    if (tab === 'profiles') {
      this.profilesContainer.setVisible(true);
      this.telemetryContainer.setVisible(false);

      this.tab1Btn.setFillStyle(0x0284c7);
      this.tab1Btn.setStrokeStyle(2, 0x38bdf8);
      this.tab1Text.setColor('#ffffff');

      this.tab2Btn.setFillStyle(0x1e293b);
      this.tab2Btn.setStrokeStyle(1, 0x475569);
      this.tab2Text.setColor('#94a3b8');
    } else {
      this.profilesContainer.setVisible(false);
      this.telemetryContainer.setVisible(true);

      this.tab1Btn.setFillStyle(0x1e293b);
      this.tab1Btn.setStrokeStyle(1, 0x475569);
      this.tab1Text.setColor('#94a3b8');

      this.tab2Btn.setFillStyle(0x0284c7);
      this.tab2Btn.setStrokeStyle(2, 0x38bdf8);
      this.tab2Text.setColor('#ffffff');
    }
  }

  /**
   * Dibuja las dos fichas explicativas para las dos ramas con mayor porcentaje de afinidad
   */
  private drawCareerProfiles(width: number, scores: VocationalScores) {
    const topProfiles: TopCareerProfileResult[] = getTopCareerProfiles(scores, 2);

    const cardWidth = 450;
    const cardHeight = 445;
    const cardY = 328;
    const cardPositions = [
      width / 2 - 232, // Ficha Top 1 (Izquierda)
      width / 2 + 232  // Ficha Top 2 (Derecha)
    ];

    topProfiles.forEach((topItem, index) => {
      const centerX = cardPositions[index];
      const profile = topItem.profile;
      const isFirst = topItem.rank === 1;

      // 1. Fondo de la tarjeta con borde temático
      const cardBg = this.add.rectangle(centerX, cardY, cardWidth, cardHeight, 0x0b1329, 0.96);
      cardBg.setStrokeStyle(2, profile.accentColorHex);
      this.profilesContainer.add(cardBg);

      // 2. Encabezado de la tarjeta con medalla e insignia
      const headerH = 34;
      const headerY = cardY - cardHeight / 2 + headerH / 2;
      const headerBg = this.add.rectangle(centerX, headerY, cardWidth, headerH, profile.accentColorHex, 0.18);
      headerBg.setStrokeStyle(1, profile.accentColorHex);
      this.profilesContainer.add(headerBg);

      const medal = isFirst ? '🥇' : '🥈';
      const rankTitle = isFirst ? 'RAMA PREDOMINANTE PRINCIPAL' : 'SEGUNDA AFINIDAD DESTACADA';
      const headerLabel = this.add.text(
        centerX,
        headerY,
        `${medal} ${rankTitle}  •  ${topItem.percent}% AFINIDAD`,
        {
          fontSize: '11px',
          color: profile.accentColor,
          fontStyle: 'bold',
          fontFamily: 'sans-serif'
        }
      ).setOrigin(0.5);
      this.profilesContainer.add(headerLabel);

      // 3. Nombre del Perfil
      let contentY = cardY - cardHeight / 2 + 48;
      const profileName = this.add.text(centerX, contentY, `${profile.badgeIcon} ${profile.profileName}`, {
        fontSize: '14.5px',
        color: '#facc15',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      }).setOrigin(0.5, 0);
      this.profilesContainer.add(profileName);

      contentY += 22;
      const branchSubtitle = this.add.text(centerX, contentY, `Área Profesional: ${profile.branchName}`, {
        fontSize: '11px',
        color: '#94a3b8',
        fontStyle: 'italic',
        fontFamily: 'sans-serif'
      }).setOrigin(0.5, 0);
      this.profilesContainer.add(branchSubtitle);

      // Separador sutil
      contentY += 20;
      const divLine1 = this.add.rectangle(centerX, contentY, cardWidth - 28, 1, 0x334155);
      this.profilesContainer.add(divLine1);

      // 4. Sección: ¿Qué harías en tu día a día laboral?
      contentY += 10;
      const dayTitle = this.add.text(centerX - cardWidth / 2 + 16, contentY, '☀️ ¿Qué harías en tu día a día laboral?', {
        fontSize: '11.5px',
        color: profile.accentColor,
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      });
      this.profilesContainer.add(dayTitle);

      contentY += 18;
      const dayDesc = this.add.text(centerX - cardWidth / 2 + 16, contentY, profile.dayToDay, {
        fontSize: '10.5px',
        color: '#e2e8f0',
        fontFamily: 'sans-serif',
        wordWrap: { width: cardWidth - 32 },
        lineSpacing: 3
      });
      this.profilesContainer.add(dayDesc);

      // Separador sutil
      contentY += 66;
      const divLine2 = this.add.rectangle(centerX, contentY, cardWidth - 28, 1, 0x334155);
      this.profilesContainer.add(divLine2);

      // 5. Sección: Carreras Reales Afines
      contentY += 10;
      const careersTitle = this.add.text(centerX - cardWidth / 2 + 16, contentY, '🎓 Carreras Reales Afines:', {
        fontSize: '11.5px',
        color: '#facc15',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      });
      this.profilesContainer.add(careersTitle);

      contentY += 18;
      profile.careers.forEach((career) => {
        const careerItem = this.add.text(centerX - cardWidth / 2 + 20, contentY, `▸  ${career}`, {
          fontSize: '10.5px',
          color: '#f1f5f9',
          fontStyle: 'bold',
          fontFamily: 'sans-serif'
        });
        this.profilesContainer.add(careerItem);
        contentY += 17;
      });

      // Separador sutil
      contentY += 4;
      const divLine3 = this.add.rectangle(centerX, contentY, cardWidth - 28, 1, 0x334155);
      this.profilesContainer.add(divLine3);

      // 6. Sección: Fortaleza Clave
      contentY += 9;
      const strengthTitle = this.add.text(centerX - cardWidth / 2 + 16, contentY, '🚀 Tu potencial diferencial:', {
        fontSize: '11px',
        color: '#34d399',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      });
      this.profilesContainer.add(strengthTitle);

      contentY += 16;
      const strengthDesc = this.add.text(centerX - cardWidth / 2 + 16, contentY, profile.strengths, {
        fontSize: '10px',
        color: '#94a3b8',
        fontFamily: 'sans-serif',
        wordWrap: { width: cardWidth - 32 },
        lineSpacing: 2
      });
      this.profilesContainer.add(strengthDesc);

      // 7. Mini cápsula informativa al pie
      const footerBg = this.add.rectangle(centerX, cardY + cardHeight / 2 - 20, cardWidth - 28, 26, 0x1e293b, 0.7);
      footerBg.setStrokeStyle(1, 0x334155);
      this.profilesContainer.add(footerBg);

      const footerText = this.add.text(
        centerX,
        cardY + cardHeight / 2 - 20,
        isFirst 
          ? '✨ Tu vocación principal: donde tu curiosidad natural y talento técnico convergen.' 
          : '💡 Tu complemento ideal: combina esta afinidad para un perfil profesional multidisciplinario.',
        {
          fontSize: '9.5px',
          color: '#cbd5e1',
          fontFamily: 'sans-serif'
        }
      ).setOrigin(0.5);
      this.profilesContainer.add(footerText);
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

    const titleText = this.add.text(centerX - barWidth / 2, currentY - 5, 'DISTRIBUCIÓN VOCACIONAL (% AFINIDAD)', {
      fontSize: '11px',
      color: '#94a3b8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });
    this.telemetryContainer.add(titleText);

    currentY += 26;

    branches.forEach((b, index) => {
      const isTop = index === 0;
      const titlePrefix = isTop ? '⭐ TOP: ' : '';

      // Título de la rama a la izquierda
      const nameText = this.add.text(centerX - barWidth / 2, currentY, `${titlePrefix}${b.name}`, {
        fontSize: isTop ? '13px' : '12px',
        color: b.color,
        fontStyle: isTop ? 'bold' : 'normal',
        fontFamily: 'sans-serif'
      });
      this.telemetryContainer.add(nameText);

      // Porcentaje a la derecha
      const percentText = this.add.text(centerX + barWidth / 2, currentY, `${b.percent}%`, {
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      }).setOrigin(1, 0);
      this.telemetryContainer.add(percentText);

      // Barra de fondo
      const barY = currentY + 24;
      const bgBar = this.add.rectangle(centerX, barY, barWidth, barHeight, 0x1e293b).setOrigin(0.5);
      bgBar.setStrokeStyle(1, 0x334155);
      this.telemetryContainer.add(bgBar);

      // Barra de progreso animada
      const fillW = Math.max(8, (b.percent / 100) * barWidth);
      const fillBar = this.add.rectangle(centerX - barWidth / 2, barY, 0, barHeight, b.colorHex).setOrigin(0, 0.5);
      this.telemetryContainer.add(fillBar);

      this.tweens.add({
        targets: fillBar,
        width: fillW,
        duration: 800 + (index * 120),
        ease: 'Cubic.easeOut'
      });

      // Descripción debajo de la barra de progreso
      const descText = this.add.text(centerX - barWidth / 2, currentY + 36, b.desc, {
        fontSize: '10px',
        color: '#94a3b8',
        fontFamily: 'sans-serif'
      });
      this.telemetryContainer.add(descText);

      currentY += 76;
    });
  }

  private drawTelemetryPanel(centerX: number, startY: number) {
    const cardWidth = 430;
    const cardHeight = 435;

    const bg = this.add.rectangle(centerX, startY + cardHeight / 2 - 10, cardWidth, cardHeight, 0x0b1120, 0.95);
    bg.setStrokeStyle(1.5, 0x1e293b);
    this.telemetryContainer.add(bg);

    const titleText = this.add.text(centerX, startY + 6, '📡 TELEMETRÍA Y MÉTRICAS TÉCNICAS', {
      fontSize: '12px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
    this.telemetryContainer.add(titleText);

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

      // Fondo sutil de fila
      const rowBg = this.add.rectangle(centerX, curY + 22, cardWidth - 20, 48, 0x0f172a, 0.7);
      rowBg.setStrokeStyle(1, 0x1e293b);
      this.telemetryContainer.add(rowBg);

      // Línea 1: Nombre de la estación (Izquierda)
      const stNameText = this.add.text(centerX - cardWidth / 2 + 18, curY + 4, `${sc.icon} ${sc.name}`, {
        fontSize: '12px',
        color: sc.color,
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      });
      this.telemetryContainer.add(stNameText);

      // Línea 1: Puntuaciones Primaria y Secundaria (Derecha)
      const scoreText = metrics 
        ? `Prim: ${metrics.primaryScore}%  |  Sec (${metrics.secondaryBranch?.toUpperCase()}): ${metrics.secondaryScore}%` 
        : 'No calibrado';

      const stScoreText = this.add.text(centerX + cardWidth / 2 - 18, curY + 4, scoreText, {
        fontSize: '10.5px',
        color: '#facc15',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      }).setOrigin(1, 0);
      this.telemetryContainer.add(stScoreText);

      // Línea 2: Detalles de métricas
      if (metrics && metrics.details) {
        const detailsArr = Object.entries(metrics.details).slice(0, 3);
        const detailStr = detailsArr.map(([k, v]) => `${k}: ${v}`).join('  •  ');
        const detailText = this.add.text(centerX - cardWidth / 2 + 18, curY + 25, detailStr, {
          fontSize: '9.5px',
          color: '#cbd5e1',
          fontFamily: 'sans-serif',
          wordWrap: { width: cardWidth - 36 }
        });
        this.telemetryContainer.add(detailText);
      }

      curY += 54;
    });

    // Párrafo de recomendación final
    const recommendationBg = this.add.rectangle(centerX, startY + cardHeight - 38, cardWidth - 30, 44, 0x1e293b, 0.6);
    recommendationBg.setStrokeStyle(1, 0x334155);
    this.telemetryContainer.add(recommendationBg);

    const recText = this.add.text(centerX, startY + cardHeight - 38, '💡 Consejo: Combina tu afinidad técnica primaria con habilidades\nprácticas para potenciar tu rol profesional.', {
      fontSize: '10px',
      color: '#94a3b8',
      align: 'center',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
    this.telemetryContainer.add(recText);
  }
}
