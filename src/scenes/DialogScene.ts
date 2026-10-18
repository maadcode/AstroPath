import * as Phaser from 'phaser';

export class DialogScene extends Phaser.Scene {
  private dialogContainer!: Phaser.GameObjects.Container;
  private backgroundDim!: Phaser.GameObjects.Rectangle;
  private panelBg!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private optionButtons: Phaser.GameObjects.Container[] = [];
  private activeCloseCallback: (() => void) | null = null;
  private escKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
  private openedAt = 0;
  private readonly CLOSE_DEBOUNCE_MS = 250;
  private readonly SKIP_DEBOUNCE_MS = 60;

  // Typewriter effect state
  private readonly TYPEWRITER_DELAY_MS = 40; // 30-50ms por carácter
  private currentFullMessage = '';
  private displayedCharCount = 0;
  private isTyping = false;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private decisionButtonsPending = false;
  private lastDialogOpenSoundTime = 0;

  constructor() {
    super('DialogScene');
  }

  private playDialogOpenSound() {
    if (this.time.now - this.lastDialogOpenSoundTime < 250) {
      return;
    }
    if (this.sound && this.cache.audio.exists('sfx_dialog_open')) {
      this.sound.play('sfx_dialog_open', { volume: 0.35 });
    }
    this.lastDialogOpenSoundTime = this.time.now;
  }

  private playOptionSelectSound() {
    if (this.sound && this.cache.audio.exists('sfx_option_select')) {
      this.sound.play('sfx_option_select', { volume: 0.45 });
    }
  }

  create() {
    const { width, height } = this.scale;

    // Teclas para cerrar diálogo o interactuar
    if (this.input.keyboard) {
      this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }

    // Fondo oscurecido para enfocar la conversación
    this.backgroundDim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65);
    this.backgroundDim.setInteractive();

    // Contenedor principal de la caja de diálogo
    this.dialogContainer = this.add.container(width / 2, height / 2);

    // Panel estilizado futurista
    this.panelBg = this.add.rectangle(0, 0, Math.min(width * 0.9, 720), Math.min(height * 0.85, 480), 0x0f172a, 0.98);
    this.panelBg.setStrokeStyle(2, 0x38bdf8);
    this.panelBg.setInteractive();

    this.titleText = this.add.text(0, -this.panelBg.height / 2 + 25, '', {
      fontSize: '20px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.messageText = this.add.text(0, -this.panelBg.height / 2 + 75, '', {
      fontSize: '15px',
      color: '#f8fafc',
      fontFamily: 'sans-serif',
      wordWrap: { width: this.panelBg.width - 60 },
      fixedWidth: this.panelBg.width - 60,
      align: 'left',
      lineSpacing: 6
    }).setOrigin(0.5, 0);

    // Compatibilidad para inspección de texto completo
    Object.defineProperty(this.messageText, 'text', {
      get: () => this.currentFullMessage || (this.messageText as any)._text,
      set: (val: string) => {
        this.messageText.setText(val);
      },
      configurable: true
    });

    this.dialogContainer.add([this.panelBg, this.titleText, this.messageText]);
    this.dialogContainer.setVisible(false);
    this.backgroundDim.setVisible(false);

    // Saltar typewriter con clic en cualquier parte de la escena
    this.input.on('pointerdown', () => {
      if (this.dialogContainer.visible && this.isTyping) {
        this.finishTypewriter();
      }
    });
  }

  update() {
    if (!this.dialogContainer.visible) {
      return;
    }

    // Saltar typewriter al presionar Espacio o Enter
    if (this.isTyping) {
      if (this.time.now - this.openedAt < this.SKIP_DEBOUNCE_MS) {
        return;
      }
      if (
        Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
        Phaser.Input.Keyboard.JustDown(this.enterKey)
      ) {
        this.finishTypewriter();
        return;
      }
    }

    if (this.activeCloseCallback) {
      // Evitar que la misma pulsación que abrió el diálogo lo cierre inmediatamente
      if (this.time.now - this.openedAt < this.CLOSE_DEBOUNCE_MS) {
        return;
      }

      if (
        Phaser.Input.Keyboard.JustDown(this.escKey) ||
        Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
        Phaser.Input.Keyboard.JustDown(this.enterKey) ||
        Phaser.Input.Keyboard.JustDown(this.eKey)
      ) {
        const cb = this.activeCloseCallback;
        this.playOptionSelectSound();
        this.close();
        cb();
      }
    }
  }

  private startTypewriter(message: string, isDecision = false) {
    this.stopTypewriter();
    this.currentFullMessage = message;
    this.displayedCharCount = 0;
    this.isTyping = true;
    this.decisionButtonsPending = isDecision;

    this.messageText.setText('');

    if (!message || message.length === 0) {
      this.finishTypewriter();
      return;
    }

    this.typewriterTimer = this.time.addEvent({
      delay: this.TYPEWRITER_DELAY_MS,
      callback: () => {
        this.displayedCharCount++;
        const partial = this.currentFullMessage.slice(0, this.displayedCharCount);
        this.messageText.setText(partial);

        if (this.displayedCharCount >= this.currentFullMessage.length) {
          this.finishTypewriter();
        }
      },
      loop: true
    });
  }

  public finishTypewriter() {
    this.stopTypewriter();
    this.isTyping = false;
    this.displayedCharCount = this.currentFullMessage.length;
    this.messageText.setText(this.currentFullMessage);

    // Si había botones de decisión pendientes, mostrarlos ahora
    if (this.decisionButtonsPending) {
      this.decisionButtonsPending = false;
      this.optionButtons.forEach(btn => btn.setVisible(true));
    }
  }

  private stopTypewriter() {
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
      this.typewriterTimer = null;
    }
  }

  public isTypewriterActive(): boolean {
    return this.isTyping;
  }

  public getDisplayedText(): string {
    return (this.messageText as any)._text || '';
  }

  public completeTypewriter(): void {
    this.finishTypewriter();
  }

  public showSimpleDialog(title: string, message: string, onClose: () => void) {
    this.playDialogOpenSound();
    this.clearOptions();
    this.dialogContainer.setVisible(true);
    this.backgroundDim.setVisible(true);
    this.activeCloseCallback = onClose;
    this.openedAt = this.time.now;

    if (this.spaceKey) this.spaceKey.reset();
    if (this.enterKey) this.enterKey.reset();
    if (this.escKey) this.escKey.reset();
    if (this.eKey) this.eKey.reset();

    this.titleText.setText(title);
    this.startTypewriter(message, false);

    // Botón Continuar / Entendido (con pista de teclas)
    const btnContainer = this.add.container(0, this.panelBg.height / 2 - 35);
    const btnBg = this.add.rectangle(0, 0, 240, 40, 0x0284c7).setInteractive({ useHandCursor: true });
    btnBg.setStrokeStyle(1, 0x38bdf8);
    const btnText = this.add.text(0, 0, 'Entendido [ESPACIO / ESC]', {
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    btnBg.on('pointerdown', () => {
      this.playOptionSelectSound();
      this.close();
      onClose();
    });

    btnContainer.add([btnBg, btnText]);
    this.dialogContainer.add(btnContainer);
    this.optionButtons.push(btnContainer);
  }

  public showDecisionDialog(
    title: string,
    message: string,
    options: string[],
    onSelectOption: (index: number) => void
  ) {
    this.playDialogOpenSound();
    this.clearOptions();
    this.dialogContainer.setVisible(true);
    this.backgroundDim.setVisible(true);
    this.activeCloseCallback = null;
    this.openedAt = this.time.now;

    if (this.spaceKey) this.spaceKey.reset();
    if (this.enterKey) this.enterKey.reset();
    if (this.escKey) this.escKey.reset();
    if (this.eKey) this.eKey.reset();

    this.titleText.setText(title);
    this.startTypewriter(message, true);

    const startY = -40;
    const btnHeight = 44;
    const spacing = 10;

    options.forEach((optText, index) => {
      const y = startY + (index * (btnHeight + spacing));
      const btnContainer = this.add.container(0, y);
      // Los botones de decisión solo aparecen cuando el texto terminó de mostrarse
      btnContainer.setVisible(false);
      
      const btnBg = this.add.rectangle(0, 0, this.panelBg.width - 50, btnHeight, 0x1e293b).setInteractive({ useHandCursor: true });
      btnBg.setStrokeStyle(1, 0x475569);

      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(0x334155);
        btnBg.setStrokeStyle(1, 0x38bdf8);
      });
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(0x1e293b);
        btnBg.setStrokeStyle(1, 0x475569);
      });

      const text = this.add.text(- (this.panelBg.width - 70) / 2, 0, `${index + 1}. ${optText}`, {
        fontSize: '13px',
        color: '#e2e8f0',
        wordWrap: { width: this.panelBg.width - 70 },
        fontFamily: 'sans-serif'
      }).setOrigin(0, 0.5);

      btnBg.on('pointerdown', () => {
        this.playOptionSelectSound();
        this.close();
        onSelectOption(index);
      });

      btnContainer.add([btnBg, text]);
      this.dialogContainer.add(btnContainer);
      this.optionButtons.push(btnContainer);
    });
  }

  public showEmotionQuestion(onSelectRating: (rating: number) => void) {
    this.playDialogOpenSound();
    this.stopTypewriter();
    this.isTyping = false;
    this.decisionButtonsPending = false;
    this.clearOptions();
    this.dialogContainer.setVisible(true);
    this.backgroundDim.setVisible(true);

    this.titleText.setText('¡Estación Completada!');
    this.currentFullMessage = '¿Qué tanto te gustó o llamó la atención resolver este tipo de situación?';
    this.messageText.setText(this.currentFullMessage);

    const ratings = [
      { score: 1, label: '😕 Nada' },
      { score: 2, label: '😐 Poco' },
      { score: 3, label: '🙂 Normal' },
      { score: 4, label: '😃 Me gustó' },
      { score: 5, label: '🚀 ¡Me encantó!' }
    ];

    const btnWidth = 110;
    const startX = -((ratings.length - 1) * (btnWidth + 10)) / 2;
    const y = 20;

    ratings.forEach((r, idx) => {
      const x = startX + (idx * (btnWidth + 10));
      const btnContainer = this.add.container(x, y);

      const btnBg = this.add.rectangle(0, 0, btnWidth, 50, 0x1e293b).setInteractive({ useHandCursor: true });
      btnBg.setStrokeStyle(1, 0x38bdf8);

      const text = this.add.text(0, 0, r.label, {
        fontSize: '13px',
        color: '#f8fafc',
        fontStyle: 'bold',
        fontFamily: 'sans-serif'
      }).setOrigin(0.5);

      btnBg.on('pointerdown', () => {
        this.playOptionSelectSound();
        this.close();
        onSelectRating(r.score);
      });

      btnContainer.add([btnBg, text]);
      this.dialogContainer.add(btnContainer);
      this.optionButtons.push(btnContainer);
    });
  }

  private clearOptions() {
    this.optionButtons.forEach(btn => btn.destroy());
    this.optionButtons = [];
  }

  public isDialogVisible(): boolean {
    return this.dialogContainer ? this.dialogContainer.visible : false;
  }

  private close() {
    this.stopTypewriter();
    this.isTyping = false;
    this.decisionButtonsPending = false;
    this.activeCloseCallback = null;
    this.clearOptions();
    this.dialogContainer.setVisible(false);
    this.backgroundDim.setVisible(false);
  }
}

