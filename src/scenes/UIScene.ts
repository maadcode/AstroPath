import * as Phaser from 'phaser';
import { GameState } from '../state/GameState';

interface RadarStationMarker {
  id: string;
  container: Phaser.GameObjects.Container;
  halo: Phaser.GameObjects.Arc;
  dot: Phaser.GameObjects.Arc;
  pulseTween?: Phaser.Tweens.Tween;
  isCompleted: boolean;
}

export class UIScene extends Phaser.Scene {
  private gameState = GameState.getInstance();
  private missionBannerText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  
  private topBar!: Phaser.GameObjects.Rectangle;
  private muteBtnContainer!: Phaser.GameObjects.Container;
  private muteBtnBg!: Phaser.GameObjects.Rectangle;
  private muteBtnText!: Phaser.GameObjects.Text;

  // Radar / Minimapa de Navegación HUD
  private radarContainer!: Phaser.GameObjects.Container;
  private radarPlayerDot!: Phaser.GameObjects.Arc;
  private radarPlayerHalo!: Phaser.GameObjects.Arc;
  private radarPlayerPulseTween?: Phaser.Tweens.Tween;
  private radarMarkers: Map<string, RadarStationMarker> = new Map();
  private isRadarVisible = true;

  // Parámetros de proyección del mapa Kenney a radar
  private readonly SHIP_MIN_X = 720;
  private readonly SHIP_MAX_X = 1392;
  private readonly SHIP_MIN_Y = 20;
  private readonly SHIP_MAX_Y = 780;
  private readonly RADAR_INNER_W = 104;
  private readonly RADAR_INNER_H = 102;

  private readonly STATION_COORDS: { [id: string]: { x: number; y: number; name: string } } = {
    station_dev: { x: 880, y: 112, name: 'Taller' },
    station_net: { x: 1232, y: 144, name: 'Antenas' },
    station_sec: { x: 880, y: 304, name: 'Seguridad' },
    station_data: { x: 880, y: 464, name: 'Cultivos' },
    station_biz: { x: 1232, y: 592, name: 'Salón' }
  };

  // Soporte móvil: Botones virtuales
  private mobileControlsContainer!: Phaser.GameObjects.Container;
  public virtualJoystick = { x: 0, y: 0 };
  public isActionButtonPressed = false;

  private activeToastContainer: Phaser.GameObjects.Container | null = null;
  private activeToastTimer: Phaser.Time.TimerEvent | null = null;

  // Onboarding / Modal de Bienvenida Inicial
  private welcomeModalContainer: Phaser.GameObjects.Container | null = null;
  private welcomeBackdrop: Phaser.GameObjects.Rectangle | null = null;
  private isWelcomeModalVisible = false;
  private hasSeenWelcome = false;
  private welcomeSpaceKey: Phaser.Input.Keyboard.Key | null = null;

  constructor() {
    super('UIScene');
  }

  create() {
    const { width, height } = this.scale;

    // 1. Barra superior: Brújula y Progreso de la nave
    this.topBar = this.add.rectangle(width / 2, 24, width, 48, 0x090d16, 0.85);
    this.topBar.setStrokeStyle(1, 0x1e293b);

    this.missionBannerText = this.add.text(20, 16, '🧭 Nave Estelar: Explora las 5 salas de la nave', {
      fontSize: '14px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.progressText = this.add.text(width - 125, 16, 'Estaciones: 0 / 5', {
      fontSize: '14px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(1, 0);

    // Control de audio / Mute (Bonus)
    this.createMuteButton(width);

    if (this.input.keyboard) {
      const mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
      mKey.on('down', () => this.toggleMute());
    }

    // Botón / Instrucción de ayuda
    this.add.text(width / 2, 54, 'Controles: Teclado [WASD/Flechas] + [E o Espacio para hablar] + [M Silenciar]', {
      fontSize: '11px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    // 2. Minimapa / Radar de Navegación en esquina superior derecha
    this.createRadar(width);
    this.refreshRadarStationStates();

    // 3. Controles virtuales para pantallas táctiles / móviles
    this.createMobileTouchControls(width, height);

    // 4. Modal de Onboarding y Guía Rápida Inicial (solo al arrancar la nave por primera vez)
    if (!this.checkWelcomeSeen() && !this.gameState.hasSeenWelcome) {
      this.showWelcomeModal();
    }

    // Escuchar cambios de tamaño
    this.scale.on('resize', this.handleResize, this);
  }

  private worldToRadar(worldX: number, worldY: number): { x: number; y: number } {
    const normX = Phaser.Math.Clamp((worldX - this.SHIP_MIN_X) / (this.SHIP_MAX_X - this.SHIP_MIN_X), 0, 1);
    const normY = Phaser.Math.Clamp((worldY - this.SHIP_MIN_Y) / (this.SHIP_MAX_Y - this.SHIP_MIN_Y), 0, 1);

    const x = (normX - 0.5) * this.RADAR_INNER_W;
    const y = (normY - 0.5) * this.RADAR_INNER_H + 9;
    return { x, y };
  }

  private createRadar(width: number) {
    if (this.radarContainer) {
      this.destroyRadar();
    }

    const radarX = width - 76;
    const radarY = 135;
    this.radarContainer = this.add.container(radarX, radarY);
    this.radarContainer.setDepth(10);

    // 1. Marco exterior y fondo tecnológico de radar
    const radarW = 132;
    const radarH = 142;

    const shadow = this.add.rectangle(0, 2, radarW, radarH, 0x000000, 0.45);
    const bg = this.add.rectangle(0, 0, radarW, radarH, 0x090d16, 0.88);
    bg.setStrokeStyle(1.5, 0x0284c7);

    // Decoración de cabecera del radar
    const headerBar = this.add.rectangle(0, -radarH / 2 + 12, radarW - 8, 18, 0x0f172a, 0.9);
    headerBar.setStrokeStyle(1, 0x1e293b);

    const ledIndicator = this.add.circle(-radarW / 2 + 14, -radarH / 2 + 12, 3, 0x22c55e, 1);
    const titleText = this.add.text(-radarW / 2 + 22, -radarH / 2 + 12, 'RADAR NAV', {
      fontSize: '9px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'monospace'
    }).setOrigin(0, 0.5);

    // 2. Silueta vectorial esquemática de la nave y retícula de sonar
    const mapGraphics = this.add.graphics();

    // Retícula de radar tenue (círculos concéntricos y mira)
    mapGraphics.lineStyle(1, 0x0369a1, 0.22);
    mapGraphics.strokeCircle(0, 9, 48);
    mapGraphics.strokeCircle(0, 9, 28);
    mapGraphics.lineBetween(-48, 9, 48, 9);
    mapGraphics.lineBetween(0, -39, 0, 57);

    // Pasillo central de la nave
    const corridorCenter = this.worldToRadar(1072, 360);
    mapGraphics.fillStyle(0x132238, 0.7);
    mapGraphics.lineStyle(1, 0x1e3a5f, 0.85);
    mapGraphics.fillRect(corridorCenter.x - 7, corridorCenter.y - 32, 14, 66);
    mapGraphics.strokeRect(corridorCenter.x - 7, corridorCenter.y - 32, 14, 66);

    // Salas temáticas esquemáticas
    const roomDev = this.worldToRadar(880, 112);
    mapGraphics.fillRect(roomDev.x - 14, roomDev.y - 11, 28, 22);
    mapGraphics.strokeRect(roomDev.x - 14, roomDev.y - 11, 28, 22);

    const roomNet = this.worldToRadar(1232, 144);
    mapGraphics.fillRect(roomNet.x - 14, roomNet.y - 11, 28, 22);
    mapGraphics.strokeRect(roomNet.x - 14, roomNet.y - 11, 28, 22);

    const roomSec = this.worldToRadar(880, 304);
    mapGraphics.fillRect(roomSec.x - 14, roomSec.y - 10, 28, 20);
    mapGraphics.strokeRect(roomSec.x - 14, roomSec.y - 10, 28, 20);

    const roomData = this.worldToRadar(880, 464);
    mapGraphics.fillRect(roomData.x - 14, roomData.y - 10, 28, 20);
    mapGraphics.strokeRect(roomData.x - 14, roomData.y - 10, 28, 20);

    const roomBiz = this.worldToRadar(1232, 592);
    mapGraphics.fillRect(roomBiz.x - 16, roomBiz.y - 12, 32, 24);
    mapGraphics.strokeRect(roomBiz.x - 16, roomBiz.y - 12, 32, 24);

    // Pasillos conectores hacia las salas
    mapGraphics.lineBetween(corridorCenter.x - 7, roomDev.y, roomDev.x + 14, roomDev.y);
    mapGraphics.lineBetween(corridorCenter.x + 7, roomNet.y, roomNet.x - 14, roomNet.y);
    mapGraphics.lineBetween(corridorCenter.x - 7, roomSec.y, roomSec.x + 14, roomSec.y);
    mapGraphics.lineBetween(corridorCenter.x - 7, roomData.y, roomData.x + 14, roomData.y);
    mapGraphics.lineBetween(corridorCenter.x + 7, roomBiz.y, roomBiz.x - 16, roomBiz.y);

    this.radarContainer.add([shadow, bg, headerBar, ledIndicator, titleText, mapGraphics]);

    // 3. Crear los 5 iconos luminosos de las estaciones
    this.radarMarkers.clear();

    Object.entries(this.STATION_COORDS).forEach(([stationId, data]) => {
      const pos = this.worldToRadar(data.x, data.y);
      const station = this.gameState.getStation(stationId);
      const isCompleted = station ? station.completed : false;

      const markerContainer = this.add.container(pos.x, pos.y);

      // Halo exterior
      const halo = this.add.circle(0, 0, 7.5, isCompleted ? 0x22c55e : 0xfacc15, isCompleted ? 0.35 : 0.5);
      // Núcleo brillante
      const dot = this.add.circle(0, 0, 3.5, isCompleted ? 0x22c55e : 0xfacc15, 1);

      markerContainer.add([halo, dot]);

      let pulseTween: Phaser.Tweens.Tween | undefined;
      if (!isCompleted) {
        pulseTween = this.tweens.add({
          targets: halo,
          scale: { from: 0.8, to: 1.55 },
          alpha: { from: 0.65, to: 0.15 },
          duration: 750,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      this.radarContainer.add(markerContainer);

      this.radarMarkers.set(stationId, {
        id: stationId,
        container: markerContainer,
        halo,
        dot,
        pulseTween,
        isCompleted
      });
    });

    // 4. Punto cian pulsante: astronauta (jugador)
    const initialPlayerPos = this.worldToRadar(1072, 304);
    this.radarPlayerHalo = this.add.circle(initialPlayerPos.x, initialPlayerPos.y, 6.5, 0x00f0ff, 0.45);
    this.radarPlayerDot = this.add.circle(initialPlayerPos.x, initialPlayerPos.y, 3.5, 0x38bdf8, 1);

    this.radarPlayerPulseTween = this.tweens.add({
      targets: this.radarPlayerHalo,
      scale: { from: 0.75, to: 1.65 },
      alpha: { from: 0.7, to: 0.1 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.radarContainer.add([this.radarPlayerHalo, this.radarPlayerDot]);

    // 5. Leyenda inferior ultra compacta
    const legendText = this.add.text(0, radarH / 2 - 10, '🟡 Pendiente  🟢 Listo', {
      fontSize: '8px',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.radarContainer.add(legendText);
  }

  private destroyRadar() {
    if (this.radarPlayerPulseTween) {
      this.radarPlayerPulseTween.stop();
      this.radarPlayerPulseTween = undefined;
    }
    this.radarMarkers.forEach(m => {
      if (m.pulseTween) {
        m.pulseTween.stop();
        m.pulseTween = undefined;
      }
    });
    this.radarMarkers.clear();
    this.radarContainer.destroy();
  }

  public updatePlayerPosition(worldX: number, worldY: number) {
    if (!this.radarPlayerDot || !this.radarPlayerHalo || !this.radarContainer.active) return;
    const { x, y } = this.worldToRadar(worldX, worldY);
    this.radarPlayerDot.setPosition(x, y);
    this.radarPlayerHalo.setPosition(x, y);
  }

  public updateStationStatus(stationId: string, completed: boolean) {
    const marker = this.radarMarkers.get(stationId);
    if (!marker) return;

    if (completed && !marker.isCompleted) {
      marker.isCompleted = true;
      if (marker.pulseTween) {
        marker.pulseTween.stop();
        marker.pulseTween = undefined;
      }
      marker.halo.setScale(1);
      marker.halo.setAlpha(0.35);
      marker.halo.setFillStyle(0x22c55e);
      marker.dot.setFillStyle(0x22c55e);
    } else if (!completed && marker.isCompleted) {
      marker.isCompleted = false;
      marker.halo.setFillStyle(0xfacc15);
      marker.dot.setFillStyle(0xfacc15);
      if (!marker.pulseTween) {
        marker.pulseTween = this.tweens.add({
          targets: marker.halo,
          scale: { from: 0.8, to: 1.55 },
          alpha: { from: 0.65, to: 0.15 },
          duration: 750,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    }
  }

  public refreshRadarStationStates() {
    this.radarMarkers.forEach((_marker, stationId) => {
      const station = this.gameState.getStation(stationId);
      const isCompleted = station ? station.completed : false;
      this.updateStationStatus(stationId, isCompleted);
    });
  }

  public setRadarVisible(visible: boolean) {
    if (this.isRadarVisible === visible) return;
    this.isRadarVisible = visible;
    if (this.radarContainer && this.radarContainer.active) {
      this.radarContainer.setVisible(visible);
    }
  }

  public isRadarActive(): boolean {
    return this.isRadarVisible;
  }

  private createMuteButton(width: number) {
    if (this.muteBtnContainer) {
      this.muteBtnContainer.destroy();
    }
    const btnX = width - 58;
    const btnY = 24;
    this.muteBtnContainer = this.add.container(btnX, btnY);

    const isMuted = this.sound ? this.sound.mute : false;
    this.muteBtnBg = this.add.rectangle(0, 0, 84, 28, 0x1e293b, 0.9).setInteractive({ useHandCursor: true });
    this.muteBtnBg.setStrokeStyle(1, isMuted ? 0xef4444 : 0x38bdf8);

    this.muteBtnText = this.add.text(0, 0, isMuted ? '🔇 [M]' : '🔊 [M]', {
      fontSize: '12px',
      color: isMuted ? '#fca5a5' : '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.muteBtnBg.on('pointerover', () => {
      this.muteBtnBg.setFillStyle(0x334155);
    });
    this.muteBtnBg.on('pointerout', () => {
      this.muteBtnBg.setFillStyle(0x1e293b);
    });
    this.muteBtnBg.on('pointerdown', () => {
      this.toggleMute();
    });

    this.muteBtnContainer.add([this.muteBtnBg, this.muteBtnText]);
  }

  private isAudioMuted = false;

  public toggleMute() {
    if (!this.sound) return;
    this.isAudioMuted = !this.isAudioMuted;
    this.sound.mute = this.isAudioMuted;
    if ((this.sound as any).masterMuteNode) {
      (this.sound as any).masterMuteNode.gain.value = this.isAudioMuted ? 0 : 1;
    }

    if (this.muteBtnText && this.muteBtnBg) {
      this.muteBtnText.setText(this.isAudioMuted ? '🔇 [M]' : '🔊 [M]');
      this.muteBtnText.setColor(this.isAudioMuted ? '#fca5a5' : '#38bdf8');
      this.muteBtnBg.setStrokeStyle(1, this.isAudioMuted ? 0xef4444 : 0x38bdf8);
    }
    if (!this.isAudioMuted && this.cache.audio.exists('sfx_option_select')) {
      this.sound.play('sfx_option_select', { volume: 0.35 });
    }
  }

  public isMuted(): boolean {
    return this.isAudioMuted || (this.sound ? this.sound.mute : false);
  }

  public updateHUD(customBanner?: string) {
    const completed = this.gameState.getCompletedStationsCount();
    this.progressText.setText(`Estaciones: ${completed} / 5`);

    // Sincronizar dinámicamente los estados de las estaciones en el radar
    this.refreshRadarStationStates();

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

  public showCompletionToast(stationName: string) {
    if (this.activeToastTimer) {
      this.activeToastTimer.remove();
      this.activeToastTimer = null;
    }

    if (this.activeToastContainer) {
      this.tweens.killTweensOf(this.activeToastContainer);
      this.activeToastContainer.destroy();
      this.activeToastContainer = null;
    }

    const { width } = this.scale;
    const toastContainer = this.add.container(width / 2, -60);
    toastContainer.setDepth(100);

    const message = `✅ ${stationName}: ¡Misión cumplida!`;
    const toastText = this.add.text(0, 0, message, {
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    const bannerWidth = Math.max(340, toastText.width + 48);
    const bannerHeight = 44;

    const shadow = this.add.rectangle(0, 3, bannerWidth, bannerHeight, 0x000000, 0.4);
    const bg = this.add.rectangle(0, 0, bannerWidth, bannerHeight, 0x064e3b, 0.95);
    bg.setStrokeStyle(2, 0x10b981);

    toastContainer.add([shadow, bg, toastText]);
    toastContainer.setAlpha(0);

    this.activeToastContainer = toastContainer;

    // Animación de entrada suave desde arriba
    this.tweens.add({
      targets: toastContainer,
      y: 80,
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Permanece visible durante 2.5s
        this.activeToastTimer = this.time.delayedCall(2500, () => {
          if (!toastContainer.active) return;
          // Animación de salida hacia arriba con tween
          this.tweens.add({
            targets: toastContainer,
            y: -60,
            alpha: 0,
            duration: 350,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              toastContainer.destroy();
              if (this.activeToastContainer === toastContainer) {
                this.activeToastContainer = null;
              }
            }
          });
        });
      }
    });
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
    if (this.topBar) {
      this.topBar.setPosition(gameSize.width / 2, 24);
      this.topBar.setSize(gameSize.width, 48);
    }
    if (this.progressText) {
      this.progressText.setPosition(gameSize.width - 125, 16);
    }
    if (this.activeToastContainer && this.activeToastContainer.active) {
      this.activeToastContainer.setX(gameSize.width / 2);
    }
    if (this.radarContainer && this.radarContainer.active) {
      this.radarContainer.setPosition(gameSize.width - 76, 135);
    }
    this.createMuteButton(gameSize.width);

    this.mobileControlsContainer.destroy();
    this.createMobileTouchControls(gameSize.width, gameSize.height);

    if (this.welcomeBackdrop && this.welcomeBackdrop.active) {
      this.welcomeBackdrop.setPosition(gameSize.width / 2, gameSize.height / 2);
      this.welcomeBackdrop.setSize(gameSize.width, gameSize.height);
    }
    if (this.welcomeModalContainer && this.welcomeModalContainer.active) {
      this.welcomeModalContainer.setPosition(gameSize.width / 2, gameSize.height / 2);
    }
  }

  private checkWelcomeSeen(): boolean {
    if (this.hasSeenWelcome || this.gameState.hasSeenWelcome) return true;
    try {
      return sessionStorage.getItem('odisea_welcome_seen') === 'true';
    } catch {
      return false;
    }
  }

  private markWelcomeSeen(): void {
    this.hasSeenWelcome = true;
    this.gameState.hasSeenWelcome = true;
    try {
      sessionStorage.setItem('odisea_welcome_seen', 'true');
    } catch {
      // Ignorar errores de almacenamiento en contextos restringidos
    }
  }

  public isWelcomeModalActive(): boolean {
    return this.isWelcomeModalVisible;
  }

  public showWelcomeModal(force = false) {
    if (!force && this.checkWelcomeSeen()) {
      return;
    }

    if (this.welcomeModalContainer) {
      this.welcomeModalContainer.destroy();
      this.welcomeModalContainer = null;
    }
    if (this.welcomeBackdrop) {
      this.welcomeBackdrop.destroy();
      this.welcomeBackdrop = null;
    }

    const { width, height } = this.scale;
    this.isWelcomeModalVisible = true;

    // 1. Telón de fondo oscuro translúcido que enfoca la atención
    this.welcomeBackdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72);
    this.welcomeBackdrop.setDepth(200);
    this.welcomeBackdrop.setInteractive();
    this.welcomeBackdrop.on('pointerdown', () => this.closeWelcomeModal());

    // 2. Contenedor principal de la ventana modal compacta y elegante
    this.welcomeModalContainer = this.add.container(width / 2, height / 2);
    this.welcomeModalContainer.setDepth(201);

    const modalW = 630;
    const modalH = 430;

    // Sombra suave proyectada y panel tecnológico sci-fi
    const shadow = this.add.rectangle(0, 5, modalW, modalH, 0x000000, 0.55);
    const panelBg = this.add.rectangle(0, 0, modalW, modalH, 0x090f1d, 0.98);
    panelBg.setStrokeStyle(2, 0x38bdf8);
    panelBg.setInteractive(); // Bloquea clicks hacia el fondo exterior si se clickea dentro del panel

    // Acento luminoso superior
    const topAccent = this.add.rectangle(0, -modalH / 2 + 2, modalW - 4, 3, 0x38bdf8, 1);

    // Botón de cerrar de esquina (✖)
    const closeBtnBg = this.add.circle(modalW / 2 - 24, -modalH / 2 + 24, 13, 0x1e293b, 0.9).setInteractive({ useHandCursor: true });
    closeBtnBg.setStrokeStyle(1, 0x475569);
    const closeBtnTxt = this.add.text(modalW / 2 - 24, -modalH / 2 + 24, '✕', {
      fontSize: '12px',
      color: '#94a3b8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    closeBtnBg.on('pointerover', () => {
      closeBtnBg.setFillStyle(0xef4444);
      closeBtnTxt.setColor('#ffffff');
    });
    closeBtnBg.on('pointerout', () => {
      closeBtnBg.setFillStyle(0x1e293b);
      closeBtnTxt.setColor('#94a3b8');
    });
    closeBtnBg.on('pointerdown', () => this.closeWelcomeModal());

    // Cabecera institucional
    const headerTag = this.add.text(0, -modalH / 2 + 30, '🛰️ NAVE EXPLORADORA ODISEA • PROTOCOLO DE INDUCCIÓN', {
      fontSize: '10px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Título Principal
    const title = this.add.text(0, -modalH / 2 + 58, '¡Bienvenido Cadete a la Nave Odisea!', {
      fontSize: '20px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    // Subtítulo
    const subtitle = this.add.text(0, -modalH / 2 + 86, 'Completa tu misión de orientación vocacional en 3 sencillos pasos:', {
      fontSize: '12px',
      color: '#cbd5e1',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    const divider = this.add.rectangle(0, -modalH / 2 + 104, modalW - 64, 1, 0x1e293b, 0.9);

    // 3 Pasos sencillos en tarjetas visuales
    const stepCards: Phaser.GameObjects.GameObject[] = [];
    const stepsData = [
      {
        num: '1',
        title: 'Recorre los pasillos y visita las 5 estaciones de la nave.',
        desc: 'Explora Software, Redes, Ciberseguridad, Ciencia de Datos y Gestión TI.',
        color: 0x38bdf8,
        bgFill: 0x0c4a6e,
        y: -44
      },
      {
        num: '2',
        title: 'Resuelve los desafíos prácticos y dilemas de cada sector.',
        desc: 'Interactúa con los encargados de área y pon a prueba tus habilidades.',
        color: 0xfacc15,
        bgFill: 0x713f12,
        y: +26
      },
      {
        num: '3',
        title: 'Al finalizar, el sistema generará tu perfil de afinidad vocacional en TI.',
        desc: 'Conoce tus fortalezas, áreas de mayor afinidad y recomendaciones formativas.',
        color: 0x34d399,
        bgFill: 0x064e3b,
        y: +96
      }
    ];

    stepsData.forEach(step => {
      const cardW = modalW - 56;
      const cardH = 56;
      const cardBg = this.add.rectangle(0, step.y, cardW, cardH, 0x0f172a, 0.85);
      cardBg.setStrokeStyle(1, 0x1e3a5f);

      // Badge numérico
      const badge = this.add.circle(-cardW / 2 + 28, step.y, 15, step.bgFill, 0.9);
      badge.setStrokeStyle(1.5, step.color);

      const numTxt = this.add.text(-cardW / 2 + 28, step.y, step.num, {
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      }).setOrigin(0.5);

      // Textos del paso
      const stepTitle = this.add.text(-cardW / 2 + 54, step.y - 10, step.title, {
        fontSize: '12px',
        color: '#f8fafc',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      });

      const stepDesc = this.add.text(-cardW / 2 + 54, step.y + 7, step.desc, {
        fontSize: '10.5px',
        color: '#94a3b8',
        fontFamily: 'sans-serif'
      });

      stepCards.push(cardBg, badge, numTxt, stepTitle, stepDesc);
    });

    // Botón de acción principal: "¡Iniciar Exploración! [ESPACIO]"
    const btnY = modalH / 2 - 40;
    const btnW = 320;
    const btnH = 42;

    const btnBg = this.add.rectangle(0, btnY, btnW, btnH, 0x0284c7, 1);
    btnBg.setStrokeStyle(1.5, 0x7dd3fc);
    btnBg.setData('role', 'start-button');
    btnBg.setInteractive({ useHandCursor: true });

    const btnTxt = this.add.text(0, btnY, '¡Iniciar Exploración! [ESPACIO]', {
      fontSize: '13.5px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x0ea5e9);
      btnTxt.setScale(1.03);
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x0284c7);
      btnTxt.setScale(1);
    });
    btnBg.on('pointerdown', () => {
      this.closeWelcomeModal();
    });

    this.welcomeModalContainer.add([
      shadow,
      panelBg,
      topAccent,
      closeBtnBg,
      closeBtnTxt,
      headerTag,
      title,
      subtitle,
      divider,
      ...stepCards,
      btnBg,
      btnTxt
    ]);

    // Tecla Espacio para cerrar la bienvenida
    if (this.input.keyboard) {
      if (this.welcomeSpaceKey) {
        this.welcomeSpaceKey.removeAllListeners();
      }
      this.welcomeSpaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.welcomeSpaceKey.once('down', () => {
        this.closeWelcomeModal();
      });
    }

    // Animación de entrada suave
    this.welcomeBackdrop.setAlpha(0);
    this.welcomeModalContainer.setAlpha(0);
    this.welcomeModalContainer.setScale(0.88);

    this.tweens.add({
      targets: this.welcomeBackdrop,
      alpha: 0.72,
      duration: 250,
      ease: 'Sine.easeOut'
    });

    this.tweens.add({
      targets: this.welcomeModalContainer,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });

    if (this.sound && this.cache.audio.exists('sfx_dialog_open')) {
      this.sound.play('sfx_dialog_open', { volume: 0.35 });
    }
  }

  public closeWelcomeModal() {
    if (!this.isWelcomeModalVisible || !this.welcomeModalContainer) return;

    this.isWelcomeModalVisible = false;
    this.markWelcomeSeen();

    if (this.welcomeSpaceKey) {
      this.welcomeSpaceKey.removeAllListeners();
      this.welcomeSpaceKey = null;
    }

    if (this.sound && this.cache.audio.exists('sfx_option_select')) {
      this.sound.play('sfx_option_select', { volume: 0.4 });
    }

    const container = this.welcomeModalContainer;
    const backdrop = this.welcomeBackdrop;
    this.welcomeModalContainer = null;
    this.welcomeBackdrop = null;

    this.tweens.add({
      targets: [container, backdrop],
      alpha: 0,
      scale: 0.94,
      duration: 200,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (container) container.destroy();
        if (backdrop) backdrop.destroy();
      }
    });
  }
}
