import * as Phaser from 'phaser';
import { GameState } from '../state/GameState';

export class UIScene extends Phaser.Scene {
  private gameState = GameState.getInstance();
  private missionBannerText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  
  // Soporte móvil: Botones virtuales
  private mobileControlsContainer!: Phaser.GameObjects.Container;
  public virtualJoystick = { x: 0, y: 0 };
  public isActionButtonPressed = false;

  constructor() {
    super('UIScene');
  }

  create() {
    const { width, height } = this.scale;

    // 1. Barra superior: Brújula y Progreso de la nave
    const topBar = this.add.rectangle(width / 2, 24, width, 48, 0x090d16, 0.85);
    topBar.setStrokeStyle(1, 0x1e293b);

    this.missionBannerText = this.add.text(20, 16, '🧭 Nave Estelar: Explora las 5 salas de la nave', {
      fontSize: '14px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.progressText = this.add.text(width - 20, 16, 'Estaciones: 0 / 5', {
      fontSize: '14px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(1, 0);

    // Botón / Instrucción de ayuda
    this.add.text(width / 2, 54, 'Controles: Teclado [WASD/Flechas] + [E o Espacio para hablar]', {
      fontSize: '11px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    // 2. Controles virtuales para pantallas táctiles / móviles
    this.createMobileTouchControls(width, height);

    // Escuchar cambios de tamaño
    this.scale.on('resize', this.handleResize, this);
  }

  public updateHUD(customBanner?: string) {
    const completed = this.gameState.getCompletedStationsCount();
    this.progressText.setText(`Estaciones: ${completed} / 5`);

    if (customBanner) {
      this.missionBannerText.setText(`🧭 ${customBanner}`);
    } else {
      if (completed === 5) {
        this.missionBannerText.setText('🚀 ¡Todas las áreas completadas! Ve al Puente Central.');
      } else {
        this.missionBannerText.setText(`🧭 Explora y asiste a los encargados (${5 - completed} restantes)`);
      }
    }
  }

  private createMobileTouchControls(width: number, height: number) {
    this.mobileControlsContainer = this.add.container(0, 0);

    // D-Pad Virtual (Izquierda inferior)
    const dpadX = 80;
    const dpadY = height - 80;

    const baseDpad = this.add.circle(dpadX, dpadY, 55, 0x1e293b, 0.5);
    baseDpad.setStrokeStyle(2, 0x38bdf8, 0.8);

    // 4 Botones direccionales
    const btnSize = 34;
    const makeDirBtn = (x: number, y: number, label: string, dx: number, dy: number) => {
      const btn = this.add.rectangle(x, y, btnSize, btnSize, 0x334155, 0.7).setInteractive();
      const txt = this.add.text(x, y, label, { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      
      btn.on('pointerdown', () => {
        btn.setFillStyle(0x0284c7);
        this.virtualJoystick.x = dx;
        this.virtualJoystick.y = dy;
      });
      btn.on('pointerup', () => {
        btn.setFillStyle(0x334155);
        this.virtualJoystick.x = 0;
        this.virtualJoystick.y = 0;
      });
      btn.on('pointerout', () => {
        btn.setFillStyle(0x334155);
        this.virtualJoystick.x = 0;
        this.virtualJoystick.y = 0;
      });
      return [btn, txt];
    };

    const up = makeDirBtn(dpadX, dpadY - 34, '▲', 0, -1);
    const down = makeDirBtn(dpadX, dpadY + 34, '▼', 0, 1);
    const left = makeDirBtn(dpadX - 34, dpadY, '◄', -1, 0);
    const right = makeDirBtn(dpadX + 34, dpadY, '►', 1, 0);

    // Botón de Acción / Hablar (Derecha inferior)
    const actionBtnX = width - 80;
    const actionBtnY = height - 80;
    const actionCircle = this.add.circle(actionBtnX, actionBtnY, 40, 0x0284c7, 0.7).setInteractive();
    actionCircle.setStrokeStyle(2, 0x38bdf8);
    const actionTxt = this.add.text(actionBtnX, actionBtnY, 'HABLAR', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    actionCircle.on('pointerdown', () => {
      actionCircle.setFillStyle(0x0369a1);
      this.isActionButtonPressed = true;
    });
    actionCircle.on('pointerup', () => {
      actionCircle.setFillStyle(0x0284c7);
      this.isActionButtonPressed = false;
    });
    actionCircle.on('pointerout', () => {
      actionCircle.setFillStyle(0x0284c7);
      this.isActionButtonPressed = false;
    });

    this.mobileControlsContainer.add([
      baseDpad,
      ...up, ...down, ...left, ...right,
      actionCircle, actionTxt
    ]);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    // Reajuste responsivo de la UI
    this.mobileControlsContainer.destroy();
    this.createMobileTouchControls(gameSize.width, gameSize.height);
  }
}
