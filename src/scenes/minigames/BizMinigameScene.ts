import * as Phaser from 'phaser';
import { MinigameMetrics } from '../../types/vocational';

export interface ActivityCard {
  id: string;
  name: string;
  icon: string;
  color: number;
  colorHex: string;
  desc: string;
  famImpact: number;
  invImpact: number;
  juvImpact: number;
  afternoonFamModifier?: number;
  nightInvModifier?: number;
  weekendJuvModifier?: number;
  nightJuvModifier?: number;
}

interface CalendarSlot {
  dayIndex: number;
  timeSlotIndex: number; // 0: Tarde, 1: Noche
  activityId: string | null;
  zone: Phaser.GameObjects.Zone;
  bgRect: Phaser.GameObjects.Rectangle;
  iconText: Phaser.GameObjects.Text;
  labelText: Phaser.GameObjects.Text;
  clearBtn: Phaser.GameObjects.Container;
}

export class BizMinigameScene extends Phaser.Scene {
  private panelWidth = 960;
  private panelHeight = 580;
  private panelX = 512;
  private panelY = 320;

  // Catálogo de actividades
  private activities: ActivityCard[] = [
    {
      id: 'cine',
      name: 'Cine',
      icon: '🎬',
      color: 0x3b82f6,
      colorHex: '#3b82f6',
      desc: 'Cine Comunitario: Ideal para familias por la tarde. Ruidoso para investigación de noche.',
      famImpact: 8,
      invImpact: -4,
      juvImpact: 6,
      afternoonFamModifier: 3,
      nightInvModifier: -5
    },
    {
      id: 'gym',
      name: 'Gimnasio',
      icon: '🏋️',
      color: 0x10b981,
      colorHex: '#10b981',
      desc: 'Fitness & Deporte: Desestrés activo. Muy valorado por jóvenes y adultos.',
      famImpact: 5,
      invImpact: 4,
      juvImpact: 7,
      weekendJuvModifier: 3
    },
    {
      id: 'silencio',
      name: 'Silencio',
      icon: '🤫',
      color: 0x8b5cf6,
      colorHex: '#8b5cf6',
      desc: 'Modo Silencio & Lectura: Imprescindible para investigadores nocturnos.',
      famImpact: -3,
      invImpact: 10,
      juvImpact: -5,
      nightInvModifier: 6,
      afternoonFamModifier: -3
    },
    {
      id: 'juegos',
      name: 'Juegos',
      icon: '🎲',
      color: 0xf59e0b,
      colorHex: '#f59e0b',
      desc: 'Torneo de Juegos: Diversión compartida para niños y jóvenes en horas diurnas.',
      famImpact: 9,
      invImpact: -3,
      juvImpact: 8,
      afternoonFamModifier: 4,
      nightInvModifier: -4
    },
    {
      id: 'musica',
      name: 'Música',
      icon: '🎵',
      color: 0xec4899,
      colorHex: '#ec4899',
      desc: 'Conciertos & Ensayos: Entusiasmo juvenil y social. Requiere aislamiento sonoro.',
      famImpact: 3,
      invImpact: -6,
      juvImpact: 10,
      weekendJuvModifier: 4,
      nightInvModifier: -5
    },
    {
      id: 'estudio',
      name: 'Estudio',
      icon: '📚',
      color: 0x06b6d4,
      colorHex: '#06b6d4',
      desc: 'Taller Científico: Aprendizaje y cálculo. Conecta a investigadores con familias.',
      famImpact: 6,
      invImpact: 9,
      juvImpact: 3,
      afternoonFamModifier: 3,
      nightInvModifier: 4
    },
    {
      id: 'fiesta',
      name: 'Fiesta',
      icon: '🎉',
      color: 0xf97316,
      colorHex: '#f97316',
      desc: 'Noche Social & Baile: Máxima energía juvenil en fin de semana. No recomendada en días laborales.',
      famImpact: -4,
      invImpact: -8,
      juvImpact: 12,
      weekendJuvModifier: 5,
      nightJuvModifier: 3,
      nightInvModifier: -6
    },
    {
      id: 'meditacion',
      name: 'Meditación',
      icon: '🧘',
      color: 0x14b8a6,
      colorHex: '#14b8a6',
      desc: 'Yoga & Descanso: Armonía mental y relajación profunda para todos los tripulantes.',
      famImpact: 6,
      invImpact: 7,
      juvImpact: 3,
      nightInvModifier: 3
    }
  ];

  private dayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  // Casilleros del calendario (7 días x 2 franjas = 14)
  private slots: CalendarSlot[] = [];

  // Satisfacción en tiempo real (0-100)
  private famScore = 40;
  private invScore = 40;
  private juvScore = 40;
  private readonly MIN_THRESHOLD = 50;

  // Elementos de UI de medidores
  private famBarFill!: Phaser.GameObjects.Rectangle;
  private invBarFill!: Phaser.GameObjects.Rectangle;
  private juvBarFill!: Phaser.GameObjects.Rectangle;
  private famPercentText!: Phaser.GameObjects.Text;
  private invPercentText!: Phaser.GameObjects.Text;
  private juvPercentText!: Phaser.GameObjects.Text;
  private famStatusIcon!: Phaser.GameObjects.Text;
  private invStatusIcon!: Phaser.GameObjects.Text;
  private juvStatusIcon!: Phaser.GameObjects.Text;

  private consensusText!: Phaser.GameObjects.Text;
  private consensusSubtext!: Phaser.GameObjects.Text;
  private statusBannerText!: Phaser.GameObjects.Text;
  private statusBannerBg!: Phaser.GameObjects.Rectangle;
  private approveBtn!: Phaser.GameObjects.Rectangle;
  private approveBtnText!: Phaser.GameObjects.Text;
  private tipText!: Phaser.GameObjects.Text;

  // Estado del drag
  private dragGhostContainer!: Phaser.GameObjects.Container;
  private dragGhostBg!: Phaser.GameObjects.Rectangle;
  private dragGhostIcon!: Phaser.GameObjects.Text;
  private dragGhostLabel!: Phaser.GameObjects.Text;
  private currentDraggedActivity: ActivityCard | null = null;
  private sourceSlotForDrag: CalendarSlot | null = null;

  // Modal final
  private completedModal!: Phaser.GameObjects.Container;
  private modalDetailsText!: Phaser.GameObjects.Text;
  private modalScoreBadge!: Phaser.GameObjects.Text;
  private modalFinishBtn!: Phaser.GameObjects.Rectangle;
  private startTime = 0;

  private onCompleteCallback?: (metrics: MinigameMetrics) => void;
  private onCancelCallback?: () => void;

  constructor() {
    super('BizMinigameScene');
  }

  init(data: { onComplete?: (metrics: MinigameMetrics) => void; onCancel?: () => void }) {
    this.onCompleteCallback = data.onComplete;
    this.onCancelCallback = data.onCancel;
    this.slots = [];
    this.famScore = 40;
    this.invScore = 40;
    this.juvScore = 40;
    this.currentDraggedActivity = null;
    this.sourceSlotForDrag = null;
  }

  create() {
    this.startTime = Date.now();
    const { width, height } = this.scale;

    // 1. Overlay oscuro de fondo
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.9);
    overlay.setInteractive();

    // 2. Chasis del Tablero de Negociación
    const frame = this.add.rectangle(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 0x0b1120, 0.98);
    frame.setStrokeStyle(3, 0xf59e0b);

    // 3. Encabezado
    this.createHeader();

    // 4. Medidores de satisfacción grupal
    this.createSatisfactionGauges();

    // 5. Matriz del Calendario (7x2)
    this.createCalendarGrid();

    // 6. Mesa de Tarjetas de Actividades (Bandeja inferior)
    this.createActivityCardTray();

    // 7. Área de Consejos y Pistas
    this.createInfoTipBar();

    // 8. Barra de Estado y Botones de Acción
    this.createControls();

    // 9. Elemento flotante para Drag & Drop
    this.createDragGhost();

    // 10. Modal de finalización
    this.createCompletionModal();

    // Configurar listeners globales de arrastre
    this.setupDragEvents();

    // Actualizar métricas iniciales
    this.recalculateSatisfaction();
  }

  private createHeader() {
    // Título
    this.add.text(this.panelX - this.panelWidth / 2 + 25, this.panelY - this.panelHeight / 2 + 18, '📋 SALA COMÚN // TABLERO DE PRIORIDADES Y MEDIACIÓN', {
      fontSize: '16px',
      color: '#fbbf24',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    // Subtítulo
    this.add.text(
      this.panelX - this.panelWidth / 2 + 25,
      this.panelY - this.panelHeight / 2 + 40,
      'Diseña el cronograma semanal en las 2 franjas horarias. Maximiza la satisfacción sin que ningún grupo baje del 50%.',
      {
        fontSize: '11px',
        color: '#94a3b8',
        fontFamily: 'sans-serif'
      }
    );

    // Botón Salir
    const exitBtn = this.add.rectangle(this.panelX + this.panelWidth / 2 - 50, this.panelY - this.panelHeight / 2 + 28, 70, 26, 0x334155, 0.8)
      .setInteractive({ useHandCursor: true });
    exitBtn.setStrokeStyle(1, 0x64748b);

    this.add.text(exitBtn.x, exitBtn.y, '✕ Salir', {
      fontSize: '12px',
      color: '#cbd5e1',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    exitBtn.on('pointerover', () => exitBtn.setFillStyle(0xd97706, 0.9));
    exitBtn.on('pointerout', () => exitBtn.setFillStyle(0x334155, 0.8));
    exitBtn.on('pointerdown', () => this.closeMinigame());
  }

  private createSatisfactionGauges() {
    const startY = this.panelY - this.panelHeight / 2 + 76;
    const cardWidth = 200;
    const cardHeight = 44;

    // Grupo 1: Familias
    const famX = this.panelX - 355;
    this.createGaugeCard(famX, startY, cardWidth, cardHeight, '👨‍👩‍👧 Familias', 0x38bdf8, 'fam');

    // Grupo 2: Investigadores
    const invX = this.panelX - 130;
    this.createGaugeCard(invX, startY, cardWidth, cardHeight, '🔬 Investigadores', 0xc084fc, 'inv');

    // Grupo 3: Jóvenes
    const juvX = this.panelX + 95;
    this.createGaugeCard(juvX, startY, cardWidth, cardHeight, '🎮 Jóvenes', 0x4ade80, 'juv');

    // Card 4: Consenso y Equilibrio
    const conX = this.panelX + 325;
    const conCard = this.add.rectangle(conX, startY, 195, cardHeight, 0x0f172a, 0.95);
    conCard.setStrokeStyle(1.5, 0xf59e0b);

    this.consensusText = this.add.text(conX, startY - 8, '⚖️ Consenso: 40%', {
      fontSize: '12px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.consensusSubtext = this.add.text(conX, startY + 10, 'Equilibrio: En ajuste', {
      fontSize: '10px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
  }

  private createGaugeCard(x: number, y: number, w: number, h: number, title: string, color: number, type: 'fam' | 'inv' | 'juv') {
    const bg = this.add.rectangle(x, y, w, h, 0x0f172a, 0.95);
    bg.setStrokeStyle(1.5, color);

    // Título y porcentaje
    this.add.text(x - w / 2 + 10, y - 11, title, {
      fontSize: '11px',
      color: '#f1f5f9',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    const percentText = this.add.text(x + w / 2 - 32, y - 11, '40%', {
      fontSize: '11px',
      color: '#f1f5f9',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(1, 0);

    const statusIcon = this.add.text(x + w / 2 - 14, y - 11, '⚠️', {
      fontSize: '11px',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0);

    // Barra de progreso
    const barW = w - 24;
    const barH = 9;
    const barY = y + 10;
    const barBg = this.add.rectangle(x, barY, barW, barH, 0x1e293b).setOrigin(0.5);
    barBg.setStrokeStyle(1, 0x334155);

    // Relleno de la barra
    const barFill = this.add.rectangle(x - barW / 2, barY, barW * 0.4, barH - 2, color).setOrigin(0, 0.5);

    // Marca de umbral mínimo (50%)
    const markerX = x;
    const marker = this.add.line(0, 0, markerX, barY - 6, markerX, barY + 6, 0xfacc15, 0.9);
    marker.setLineWidth(1.5);

    if (type === 'fam') {
      this.famBarFill = barFill;
      this.famPercentText = percentText;
      this.famStatusIcon = statusIcon;
    } else if (type === 'inv') {
      this.invBarFill = barFill;
      this.invPercentText = percentText;
      this.invStatusIcon = statusIcon;
    } else {
      this.juvBarFill = barFill;
      this.juvPercentText = percentText;
      this.juvStatusIcon = statusIcon;
    }
  }

  private createCalendarGrid() {
    const gridStartX = this.panelX - this.panelWidth / 2 + 130;
    const gridStartY = this.panelY - this.panelHeight / 2 + 118;

    const colWidth = 108;
    const colGap = 8;
    const slotHeight = 54;
    const rowGap = 8;

    // Encabezados de días
    this.dayNames.forEach((d, i) => {
      const cx = gridStartX + i * (colWidth + colGap) + colWidth / 2;
      const cy = gridStartY + 14;
      const isWeekend = i >= 4;

      const dayHeader = this.add.rectangle(cx, cy, colWidth, 22, isWeekend ? 0x1e1b4b : 0x1e293b);
      dayHeader.setStrokeStyle(1, isWeekend ? 0x818cf8 : 0x475569);

      this.add.text(cx, cy, d, {
        fontSize: '11px',
        color: isWeekend ? '#a5b4fc' : '#cbd5e1',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      }).setOrigin(0.5);
    });

    // Etiquetas de filas
    const rowY1 = gridStartY + 58;
    const rowY2 = gridStartY + 58 + slotHeight + rowGap;
    const labelX = gridStartX - 65;

    // Fila 1: Tarde
    const r1Bg = this.add.rectangle(labelX, rowY1, 105, slotHeight, 0x1e293b, 0.9);
    r1Bg.setStrokeStyle(1, 0x38bdf8);
    this.add.text(labelX, rowY1 - 8, '☀️ Tarde', {
      fontSize: '11px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
    this.add.text(labelX, rowY1 + 10, '14:00 - 18:00', {
      fontSize: '9px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    // Fila 2: Noche
    const r2Bg = this.add.rectangle(labelX, rowY2, 105, slotHeight, 0x1e293b, 0.9);
    r2Bg.setStrokeStyle(1, 0xc084fc);
    this.add.text(labelX, rowY2 - 8, '🌙 Noche', {
      fontSize: '11px',
      color: '#c084fc',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
    this.add.text(labelX, rowY2 + 10, '19:00 - 23:00', {
      fontSize: '9px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    // Crear los 14 casilleros
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const cx = gridStartX + dayIdx * (colWidth + colGap) + colWidth / 2;

      for (let timeIdx = 0; timeIdx < 2; timeIdx++) {
        const cy = timeIdx === 0 ? rowY1 : rowY2;

        const bgRect = this.add.rectangle(cx, cy, colWidth, slotHeight, 0x0f172a);
        bgRect.setStrokeStyle(1, 0x334155);

        // Zona interactiva de drop
        const zone = this.add.zone(cx, cy, colWidth, slotHeight).setRectangleDropZone(colWidth, slotHeight);
        (zone as any).slotData = { dayIndex: dayIdx, timeSlotIndex: timeIdx };

        // Contenedor visual del contenido asignado
        const iconText = this.add.text(cx - 24, cy, '', {
          fontSize: '18px',
          fontFamily: 'sans-serif'
        }).setOrigin(0.5);

        const labelText = this.add.text(cx + 10, cy, '+ Asignar', {
          fontSize: '11px',
          color: '#475569',
          fontFamily: 'sans-serif'
        }).setOrigin(0.5);

        // Botón de eliminar casilla asignada
        const clearBtn = this.add.container(cx + colWidth / 2 - 10, cy - slotHeight / 2 + 10);
        const clearCircle = this.add.circle(0, 0, 7, 0xef4444, 0.9);
        const clearX = this.add.text(0, 0, '✕', {
          fontSize: '8px',
          color: '#ffffff',
          fontStyle: 'bold',
          fontFamily: 'sans-serif'
        }).setOrigin(0.5);
        clearBtn.add([clearCircle, clearX]);
        clearBtn.setSize(16, 16);
        clearBtn.setInteractive({ useHandCursor: true });
        clearBtn.setVisible(false);

        const slotObj: CalendarSlot = {
          dayIndex: dayIdx,
          timeSlotIndex: timeIdx,
          activityId: null,
          zone,
          bgRect,
          iconText,
          labelText,
          clearBtn
        };

        clearBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          pointer.event.stopPropagation();
          this.clearSlot(slotObj);
        });

        // Hacer que el casillero también permita arrastrar su tarjeta a otra casilla
        bgRect.setInteractive({ useHandCursor: true });
        bgRect.on('pointerdown', () => {
          if (slotObj.activityId) {
            this.startDragFromSlot(slotObj);
          }
        });

        this.slots.push(slotObj);
      }
    }
  }

  private createActivityCardTray() {
    const trayY = this.panelY + 115;
    const startX = this.panelX - this.panelWidth / 2 + 30;

    // Encabezado de la bandeja
    this.add.text(startX, trayY - 48, '🗂️ BANDEJA DE ACTIVIDADES (Arrastra las tarjetas a los casilleros de arriba o haz clic para auto-asignar)', {
      fontSize: '11px',
      color: '#cbd5e1',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    const cardWidth = 105;
    const cardHeight = 64;
    const gap = 8;

    this.activities.forEach((act, idx) => {
      const cx = startX + idx * (cardWidth + gap) + cardWidth / 2;
      const cy = trayY;

      // Fondo de la tarjeta
      const cardBg = this.add.rectangle(cx, cy, cardWidth, cardHeight, 0x1e293b, 0.95);
      cardBg.setStrokeStyle(1.5, act.color);
      cardBg.setInteractive({ draggable: true, useHandCursor: true });

      // Emoji y Título
      this.add.text(cx, cy - 14, `${act.icon} ${act.name}`, {
        fontSize: '12px',
        color: '#f8fafc',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      }).setOrigin(0.5);

      // Mini tags de impacto
      const famSign = act.famImpact >= 0 ? `+${act.famImpact}` : `${act.famImpact}`;
      const invSign = act.invImpact >= 0 ? `+${act.invImpact}` : `${act.invImpact}`;
      const juvSign = act.juvImpact >= 0 ? `+${act.juvImpact}` : `${act.juvImpact}`;

      this.add.text(cx, cy + 12, `F:${famSign} I:${invSign} J:${juvSign}`, {
        fontSize: '9px',
        color: '#94a3b8',
        fontFamily: 'monospace'
      }).setOrigin(0.5);

      // Guardar referencia en el objeto
      (cardBg as any).activityData = act;

      // Tooltip y feedback al pasar el ratón
      cardBg.on('pointerover', () => {
        cardBg.setFillStyle(0x334155, 1);
        this.showActivityTip(act);
      });

      cardBg.on('pointerout', () => {
        cardBg.setFillStyle(0x1e293b, 0.95);
        this.resetActivityTip();
      });

      // Clic directo para auto-asignar al primer casillero libre
      cardBg.on('pointerdown', () => {
        // Si no inicia arrastre prolongado, asignar al primer slot vacío
        this.time.delayedCall(160, () => {
          if (!this.currentDraggedActivity) {
            this.assignToFirstEmptySlot(act);
          }
        });
      });
    });
  }

  private createInfoTipBar() {
    const tipY = this.panelY + 185;
    const tipBox = this.add.rectangle(this.panelX, tipY, this.panelWidth - 60, 32, 0x0f172a, 0.9);
    tipBox.setStrokeStyle(1, 0x334155);

    this.tipText = this.add.text(
      this.panelX,
      tipY,
      '💡 Consejo de Mediación: Pasa el cursor por cada actividad para ver sus efectos. Equilibra las demandas de los 3 colectivos.',
      {
        fontSize: '11px',
        color: '#94a3b8',
        fontFamily: 'sans-serif'
      }
    ).setOrigin(0.5);
  }

  private createControls() {
    const controlY = this.panelY + 238;

    // Banner de estado dinámico
    const bannerW = 520;
    const bannerH = 40;
    const bannerX = this.panelX - 160;

    this.statusBannerBg = this.add.rectangle(bannerX, controlY, bannerW, bannerH, 0x1e293b, 0.95);
    this.statusBannerBg.setStrokeStyle(1.5, 0x475569);

    this.statusBannerText = this.add.text(bannerX, controlY, 'ℹ️ Asigna al menos 10 franjas horarias y mantén a todos los grupos en ≥ 50%.', {
      fontSize: '11px',
      color: '#cbd5e1',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    // Botón Limpiar Todo
    const clearAllBtn = this.add.rectangle(this.panelX + 175, controlY, 110, bannerH, 0x334155, 0.9)
      .setInteractive({ useHandCursor: true });
    clearAllBtn.setStrokeStyle(1, 0x64748b);

    this.add.text(clearAllBtn.x, controlY, '🔄 Limpiar', {
      fontSize: '12px',
      color: '#e2e8f0',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    clearAllBtn.on('pointerover', () => clearAllBtn.setFillStyle(0x475569, 1));
    clearAllBtn.on('pointerout', () => clearAllBtn.setFillStyle(0x334155, 0.9));
    clearAllBtn.on('pointerdown', () => this.clearAllSlots());

    // Botón Aprobar Cronograma
    const approveW = 190;
    const approveX = this.panelX + 340;

    this.approveBtn = this.add.rectangle(approveX, controlY, approveW, bannerH, 0x334155, 0.9)
      .setInteractive({ useHandCursor: true });
    this.approveBtn.setStrokeStyle(1.5, 0x64748b);

    this.approveBtnText = this.add.text(approveX, controlY, '✓ Aprobar Cronograma', {
      fontSize: '13px',
      color: '#94a3b8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.approveBtn.on('pointerdown', () => this.handleApproveClick());
  }

  private createDragGhost() {
    this.dragGhostContainer = this.add.container(0, 0);
    this.dragGhostContainer.setDepth(150);
    this.dragGhostContainer.setVisible(false);

    this.dragGhostBg = this.add.rectangle(0, 0, 105, 54, 0x3b82f6, 0.95);
    this.dragGhostBg.setStrokeStyle(2, 0xffffff);

    this.dragGhostIcon = this.add.text(-22, 0, '🎬', {
      fontSize: '18px',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.dragGhostLabel = this.add.text(12, 0, 'Cine', {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.dragGhostContainer.add([this.dragGhostBg, this.dragGhostIcon, this.dragGhostLabel]);
  }

  private setupDragEvents() {
    // 1. Iniciar arrastre desde la bandeja
    this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: any) => {
      const act = gameObject.activityData as ActivityCard;
      if (act) {
        this.currentDraggedActivity = act;
        this.sourceSlotForDrag = null;
        this.updateDragGhost(act, pointer.x, pointer.y);
      }
    });

    // 2. Mover elemento durante el arrastre
    this.input.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (this.currentDraggedActivity) {
        this.dragGhostContainer.setPosition(pointer.x, pointer.y);
      }
    });

    // 3. Soltar sobre un casillero válido
    this.input.on('drop', (_pointer: Phaser.Input.Pointer, _gameObject: any, dropZone: Phaser.GameObjects.Zone) => {
      const slotData = (dropZone as any).slotData;
      if (slotData && this.currentDraggedActivity) {
        const targetSlot = this.slots.find(
          s => s.dayIndex === slotData.dayIndex && s.timeSlotIndex === slotData.timeSlotIndex
        );

        if (targetSlot) {
          // Si venía de otro casillero, limpiar el de origen si es distinto
          if (this.sourceSlotForDrag && this.sourceSlotForDrag !== targetSlot) {
            this.clearSlot(this.sourceSlotForDrag, false);
          }

          this.assignSlot(targetSlot, this.currentDraggedActivity);
        }
      }
    });

    // 4. Finalizar arrastre
    this.input.on('dragend', () => {
      this.dragGhostContainer.setVisible(false);
      this.currentDraggedActivity = null;
      this.sourceSlotForDrag = null;
    });

    // Manejo de puntero para arrastre originado en casilleros existentes
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.currentDraggedActivity && this.dragGhostContainer.visible) {
        this.dragGhostContainer.setPosition(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.sourceSlotForDrag && this.currentDraggedActivity) {
        // Verificar si soltó sobre algún casillero
        const hitSlot = this.slots.find(s => s.zone.getBounds().contains(pointer.x, pointer.y));
        if (hitSlot) {
          if (hitSlot !== this.sourceSlotForDrag) {
            this.clearSlot(this.sourceSlotForDrag, false);
            this.assignSlot(hitSlot, this.currentDraggedActivity);
          }
        } else {
          // Soltó fuera del calendario -> retirar tarjeta del casillero
          this.clearSlot(this.sourceSlotForDrag);
        }

        this.dragGhostContainer.setVisible(false);
        this.currentDraggedActivity = null;
        this.sourceSlotForDrag = null;
      }
    });
  }

  private startDragFromSlot(slot: CalendarSlot) {
    if (!slot.activityId) return;
    const act = this.activities.find(a => a.id === slot.activityId);
    if (!act) return;

    this.currentDraggedActivity = act;
    this.sourceSlotForDrag = slot;
    this.updateDragGhost(act, this.input.activePointer.x, this.input.activePointer.y);
  }

  private updateDragGhost(act: ActivityCard, x: number, y: number) {
    this.dragGhostBg.setFillStyle(act.color, 0.95);
    this.dragGhostIcon.setText(act.icon);
    this.dragGhostLabel.setText(act.name);
    this.dragGhostContainer.setPosition(x, y);
    this.dragGhostContainer.setVisible(true);
  }

  private assignSlot(slot: CalendarSlot, act: ActivityCard) {
    slot.activityId = act.id;
    slot.bgRect.setFillStyle(act.color, 0.85);
    slot.bgRect.setStrokeStyle(1.5, 0xffffff);

    slot.iconText.setText(act.icon);
    slot.iconText.setVisible(true);

    slot.labelText.setText(act.name);
    slot.labelText.setColor('#ffffff');
    slot.labelText.setFontStyle('bold');

    slot.clearBtn.setVisible(true);

    // Animación pop sutil en el casillero asignado
    this.tweens.add({
      targets: [slot.bgRect, slot.iconText, slot.labelText],
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeInOut'
    });

    this.recalculateSatisfaction();
  }

  private clearSlot(slot: CalendarSlot, recalculate = true) {
    slot.activityId = null;
    slot.bgRect.setFillStyle(0x0f172a);
    slot.bgRect.setStrokeStyle(1, 0x334155);

    slot.iconText.setText('');
    slot.iconText.setVisible(false);

    slot.labelText.setText('+ Asignar');
    slot.labelText.setColor('#475569');
    slot.labelText.setFontStyle('normal');

    slot.clearBtn.setVisible(false);

    if (recalculate) {
      this.recalculateSatisfaction();
    }
  }

  private clearAllSlots() {
    this.slots.forEach(s => this.clearSlot(s, false));
    this.recalculateSatisfaction();
  }

  private assignToFirstEmptySlot(act: ActivityCard) {
    const emptySlot = this.slots.find(s => s.activityId === null);
    if (emptySlot) {
      this.assignSlot(emptySlot, act);
    } else {
      // Todos llenos, reemplazar el primer slot
      this.assignSlot(this.slots[0], act);
    }
  }

  private showActivityTip(act: ActivityCard) {
    this.tipText.setText(`💡 ${act.icon} ${act.name}: ${act.desc}`);
    this.tipText.setColor(act.colorHex);
  }

  private resetActivityTip() {
    this.tipText.setText(
      '💡 Consejo de Mediación: Pasa el cursor por cada actividad para ver sus efectos. Equilibra las demandas de los 3 colectivos.'
    );
    this.tipText.setColor('#94a3b8');
  }

  private recalculateSatisfaction() {
    let deltaFam = 0;
    let deltaInv = 0;
    let deltaJuv = 0;
    let filledCount = 0;

    for (const slot of this.slots) {
      if (!slot.activityId) continue;
      filledCount++;

      const act = this.activities.find(a => a.id === slot.activityId);
      if (!act) continue;

      // Cálculo de aportes y modificadores por franja y día
      let famImpact = act.famImpact;
      let invImpact = act.invImpact;
      let juvImpact = act.juvImpact;

      // Franja horaria: Tarde (0) vs Noche (1)
      if (slot.timeSlotIndex === 0 && act.afternoonFamModifier) {
        famImpact += act.afternoonFamModifier;
      }
      if (slot.timeSlotIndex === 1 && act.nightInvModifier) {
        invImpact += act.nightInvModifier;
      }
      if (slot.timeSlotIndex === 1 && act.nightJuvModifier) {
        juvImpact += act.nightJuvModifier;
      }

      // Modificadores por fin de semana (Viernes, Sábado, Domingo: días 4, 5, 6)
      if (slot.dayIndex >= 4 && act.weekendJuvModifier) {
        juvImpact += act.weekendJuvModifier;
      }

      // Penalización extra si hay fiesta nocturna en días de semana laborales (Lunes a Jueves)
      if (slot.dayIndex < 4 && slot.timeSlotIndex === 1 && act.id === 'fiesta') {
        invImpact -= 4;
      }

      deltaFam += famImpact;
      deltaInv += invImpact;
      deltaJuv += juvImpact;
    }

    // Puntajes base normalizados sobre 100
    this.famScore = Math.max(0, Math.min(100, 40 + deltaFam));
    this.invScore = Math.max(0, Math.min(100, 40 + deltaInv));
    this.juvScore = Math.max(0, Math.min(100, 40 + deltaJuv));

    this.updateGaugesDisplay(filledCount);
  }

  private updateGaugesDisplay(filledCount: number) {
    const barWidth = 200 - 24;

    // Actualizar Familias
    this.famBarFill.width = (this.famScore / 100) * barWidth;
    this.famPercentText.setText(`${Math.round(this.famScore)}%`);
    const famOk = this.famScore >= this.MIN_THRESHOLD;
    this.famStatusIcon.setText(famOk ? '✅' : '⚠️');
    this.famPercentText.setColor(famOk ? '#38bdf8' : '#f87171');

    // Actualizar Investigadores
    this.invBarFill.width = (this.invScore / 100) * barWidth;
    this.invPercentText.setText(`${Math.round(this.invScore)}%`);
    const invOk = this.invScore >= this.MIN_THRESHOLD;
    this.invStatusIcon.setText(invOk ? '✅' : '⚠️');
    this.invPercentText.setColor(invOk ? '#c084fc' : '#f87171');

    // Actualizar Jóvenes
    this.juvBarFill.width = (this.juvScore / 100) * barWidth;
    this.juvPercentText.setText(`${Math.round(this.juvScore)}%`);
    const juvOk = this.juvScore >= this.MIN_THRESHOLD;
    this.juvStatusIcon.setText(juvOk ? '✅' : '⚠️');
    this.juvPercentText.setColor(juvOk ? '#4ade80' : '#f87171');

    // Consenso global
    const avgScore = Math.round((this.famScore + this.invScore + this.juvScore) / 3);
    const spread = Math.max(this.famScore, this.invScore, this.juvScore) - Math.min(this.famScore, this.invScore, this.juvScore);
    const balanceRating = spread <= 15 ? 'Óptimo' : spread <= 30 ? 'Aceptable' : 'Disparejo';

    this.consensusText.setText(`⚖️ Consenso: ${avgScore}%`);
    this.consensusSubtext.setText(`Equilibrio: ${balanceRating} (±${Math.round(spread / 2)}%)`);

    // Validar condiciones de aprobación
    const allThresholdsMet = famOk && invOk && juvOk;
    const minSlotsFilled = filledCount >= 10;

    if (!minSlotsFilled) {
      this.statusBannerBg.setFillStyle(0x1e293b, 0.95);
      this.statusBannerBg.setStrokeStyle(1.5, 0x475569);
      this.statusBannerText.setText(`⚠️ Faltan franjas por asignar (${filledCount}/14). Asigna al menos 10 casilleros.`);
      this.statusBannerText.setColor('#cbd5e1');

      this.approveBtn.setFillStyle(0x334155, 0.9);
      this.approveBtn.setStrokeStyle(1.5, 0x64748b);
      this.approveBtnText.setColor('#94a3b8');
    } else if (!allThresholdsMet) {
      const failing: string[] = [];
      if (!famOk) failing.push('Familias');
      if (!invOk) failing.push('Investigadores');
      if (!juvOk) failing.push('Jóvenes');

      this.statusBannerBg.setFillStyle(0x450a0a, 0.95);
      this.statusBannerBg.setStrokeStyle(1.5, 0xef4444);
      this.statusBannerText.setText(`⚠️ Conflicto: ${failing.join(', ')} están por debajo del umbral mínimo (< 50%).`);
      this.statusBannerText.setColor('#fca5a5');

      this.approveBtn.setFillStyle(0x334155, 0.9);
      this.approveBtn.setStrokeStyle(1.5, 0x64748b);
      this.approveBtnText.setColor('#94a3b8');
    } else {
      this.statusBannerBg.setFillStyle(0x064e3b, 0.95);
      this.statusBannerBg.setStrokeStyle(1.5, 0x10b981);
      this.statusBannerText.setText(`✅ ¡Pacto de Convivencia Armónico! Todos los grupos superan el 50% (${filledCount}/14 turnos).`);
      this.statusBannerText.setColor('#6ee7b7');

      this.approveBtn.setFillStyle(0x059669, 1);
      this.approveBtn.setStrokeStyle(1.5, 0x34d399);
      this.approveBtnText.setColor('#ffffff');
    }
  }

  private handleApproveClick() {
    const filledCount = this.slots.filter(s => s.activityId !== null).length;
    const famOk = this.famScore >= this.MIN_THRESHOLD;
    const invOk = this.invScore >= this.MIN_THRESHOLD;
    const juvOk = this.juvScore >= this.MIN_THRESHOLD;

    if (filledCount < 10) {
      this.cameras.main.shake(180, 0.005);
      this.statusBannerText.setText(`⚠️ Planificación incompleta. Asigna al menos 10 turnos antes de aprobar.`);
      return;
    }

    if (!famOk || !invOk || !juvOk) {
      this.cameras.main.shake(200, 0.006);
      return;
    }

    // ¡Éxito! Generar métricas dinámicas
    this.triggerVictory(filledCount);
  }

  private triggerVictory(filledCount: number) {
    const elapsedSeconds = Math.round((Date.now() - this.startTime) / 1000);
    const avgScore = (this.famScore + this.invScore + this.juvScore) / 3;
    const spread = Math.max(this.famScore, this.invScore, this.juvScore) - Math.min(this.famScore, this.invScore, this.juvScore);
    const balanceIndex = Math.max(0, 100 - spread * 1.1);

    // Contar sinergias analíticas óptimas (Rama Secundaria: Data)
    let synergyCount = 0;
    for (const slot of this.slots) {
      if (!slot.activityId) continue;
      // Silencio o Estudio de noche
      if (slot.timeSlotIndex === 1 && (slot.activityId === 'silencio' || slot.activityId === 'estudio')) synergyCount++;
      // Recreación familiar de tarde
      if (slot.timeSlotIndex === 0 && (slot.activityId === 'cine' || slot.activityId === 'juegos')) synergyCount++;
      // Actividades sociales juveniles en fin de semana
      if (slot.dayIndex >= 4 && (slot.activityId === 'musica' || slot.activityId === 'fiesta')) synergyCount++;
    }

    const synergyRatio = synergyCount / filledCount;

    // Métricas vocacionales:
    // Primaria: biz (organización, empatía, equilibrio de partes)
    const rawBiz = (avgScore * 0.5) + (balanceIndex * 0.35) + ((filledCount / 14) * 15);
    const primaryBizScore = Math.max(60, Math.min(100, Math.round(rawBiz)));

    // Secundaria: data (análisis de optimización y distribución matemática)
    const rawData = (synergyRatio * 50) + (avgScore * 0.5);
    const secondaryDataScore = Math.max(55, Math.min(100, Math.round(rawData)));

    const metrics: MinigameMetrics = {
      primaryScore: primaryBizScore,
      secondaryBranch: 'data',
      secondaryScore: secondaryDataScore,
      details: {
        'Satisfacción Familias': `${Math.round(this.famScore)}%`,
        'Satisfacción Investigadores': `${Math.round(this.invScore)}%`,
        'Satisfacción Jóvenes': `${Math.round(this.juvScore)}%`,
        'Consenso Global': `${Math.round(avgScore)}%`,
        'Índice de Equilibrio': `${Math.round(balanceIndex)}%`,
        'Franjas Planificadas': `${filledCount}/14`,
        'Tiempo de Negociación': `${elapsedSeconds} seg`
      },
      feedbackSummary: `Sobresaliente capacidad de mediación y análisis organizacional. Lograste un ${Math.round(avgScore)}% de satisfacción colectiva con un equilibrio armónico del ${Math.round(balanceIndex)}%, garantizando el descanso científico, la convivencia familiar y el esparcimiento juvenil.`
    };

    this.showCompletionModal(metrics);
  }

  private createCompletionModal() {
    this.completedModal = this.add.container(this.panelX, this.panelY);
    this.completedModal.setVisible(false);
    this.completedModal.setDepth(200);

    const mBg = this.add.rectangle(0, 0, 540, 360, 0x090d16, 0.98);
    mBg.setStrokeStyle(2.5, 0xf59e0b);

    const title = this.add.text(0, -135, '📋 ¡CONSENSO DE CONVIVENCIA ALCANZADO!', {
      fontSize: '16px',
      color: '#fbbf24',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.modalDetailsText = this.add.text(0, -35, '', {
      fontSize: '12px',
      color: '#e2e8f0',
      align: 'center',
      fontFamily: 'sans-serif',
      lineSpacing: 7
    }).setOrigin(0.5);

    this.modalScoreBadge = this.add.text(0, 75, '', {
      fontSize: '18px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.modalFinishBtn = this.add.rectangle(0, 130, 260, 42, 0xd97706).setInteractive({ useHandCursor: true });
    this.modalFinishBtn.setStrokeStyle(1.5, 0xfbbf24);
    const finishTxt = this.add.text(0, 130, 'Confirmar y Continuar', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.modalFinishBtn.on('pointerover', () => this.modalFinishBtn.setFillStyle(0xb45309));
    this.modalFinishBtn.on('pointerout', () => this.modalFinishBtn.setFillStyle(0xd97706));

    this.completedModal.add([mBg, title, this.modalDetailsText, this.modalScoreBadge, this.modalFinishBtn, finishTxt]);
  }

  private showCompletionModal(metrics: MinigameMetrics) {
    this.completedModal.setVisible(true);

    this.modalDetailsText.setText(
      `Familias: ${metrics.details['Satisfacción Familias']} | Investigadores: ${metrics.details['Satisfacción Investigadores']} | Jóvenes: ${metrics.details['Satisfacción Jóvenes']}\n` +
      `Consenso Promedio: ${metrics.details['Consenso Global']} | Índice de Equilibrio: ${metrics.details['Índice de Equilibrio']}\n` +
      `Turnos Asignados: ${metrics.details['Franjas Planificadas']} | Tiempo: ${metrics.details['Tiempo de Negociación']}\n\n` +
      `${metrics.feedbackSummary}`
    );

    this.modalScoreBadge.setText(`Afinidad en Negocios y Mediación: ${metrics.primaryScore} / 100`);

    this.modalFinishBtn.removeAllListeners('pointerdown');
    this.modalFinishBtn.on('pointerdown', () => {
      this.closeMinigame(metrics);
    });
  }

  private closeMinigame(metrics?: MinigameMetrics) {
    if (metrics && this.onCompleteCallback) {
      this.onCompleteCallback(metrics);
    } else if (!metrics && this.onCancelCallback) {
      this.onCancelCallback();
    }
    this.scene.stop('BizMinigameScene');
    this.scene.resume('SpaceShipScene');
  }
}
