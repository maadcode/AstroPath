import { Scene } from 'phaser';
import { QUESTIONS_DATA } from '../data/questionsData';

export class GameScene extends Scene
{
    constructor ()
    {
        super('GameScene');
    }

    init() {
        this.currentQuestionIndex = 0;
        this.scores = {
            software: 0,
            seguridad: 0,
            datos_ia: 0,
            redes: 0,
            gestion: 0
        };
        this.isTransitioning = false;
    }

    create ()
    {
        // 1. Background image
        const bg = this.add.image(512, 384, 'bg');
        bg.setDisplaySize(1024, 768);
        bg.setAlpha(0.2);

        // 2. Top Header Bar
        this.createHeader();

        // 3. Question container
        this.questionContainer = this.add.container(0, 0);

        // 4. Render First Question
        this.renderQuestion(this.currentQuestionIndex);
    }

    createHeader() {
        const headerGfx = this.add.graphics();
        headerGfx.fillStyle(0x060c18, 0.95);
        headerGfx.fillRect(0, 0, 1024, 55);
        headerGfx.lineStyle(2, 0x1a2c47, 1);
        headerGfx.lineBetween(0, 55, 1024, 55);

        // Brand Title
        this.add.text(30, 28, 'RUTA TECH // DILEMAS VOCACIONALES', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#8beb46',
            fontWeight: 'bold'
        }).setOrigin(0, 0.5);

        // Progress Text
        this.progressLabel = this.add.text(994, 28, 'SITUACIÓN 1 DE 6', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '11px',
            color: '#00d2ff',
            fontWeight: 'bold'
        }).setOrigin(1, 0.5);

        // Progress dots
        this.dotsGfx = this.add.graphics();
        this.updateProgressDots();
    }

    updateProgressDots() {
        this.dotsGfx.clear();
        const total = QUESTIONS_DATA.length;
        const spacing = 18;
        const startX = 680;
        const y = 28;

        for (let i = 0; i < total; i++) {
            const x = startX + i * spacing;
            if (i < this.currentQuestionIndex) {
                // Completed
                this.dotsGfx.fillStyle(0x8beb46, 1);
                this.dotsGfx.fillCircle(x, y, 5);
            } else if (i === this.currentQuestionIndex) {
                // Active
                this.dotsGfx.fillStyle(0x00d2ff, 1);
                this.dotsGfx.fillCircle(x, y, 6);
                this.dotsGfx.lineStyle(1.5, 0xffffff, 0.8);
                this.dotsGfx.strokeCircle(x, y, 8);
            } else {
                // Pending
                this.dotsGfx.lineStyle(1.5, 0x3d4b66, 1);
                this.dotsGfx.strokeCircle(x, y, 5);
            }
        }
    }

    renderQuestion(index) {
        this.questionContainer.removeAll(true);
        const q = QUESTIONS_DATA[index];

        this.progressLabel.setText(`SITUACIÓN ${index + 1} DE ${QUESTIONS_DATA.length}`);
        this.updateProgressDots();

        // --- QUESTION CARD (TOP PANEL) ---
        const cardBg = this.add.graphics();
        cardBg.fillStyle(0x0a1426, 0.95);
        cardBg.lineStyle(2, 0x00d2ff, 0.8);
        cardBg.fillRoundedRect(40, 75, 944, 150, 10);
        cardBg.strokeRoundedRect(40, 75, 944, 150, 10);
        this.questionContainer.add(cardBg);

        // Situation Index Badge
        const badgeGfx = this.add.graphics();
        badgeGfx.fillStyle(0x00d2ff, 0.2);
        badgeGfx.lineStyle(1, 0x00d2ff, 0.6);
        badgeGfx.fillRoundedRect(65, 90, 140, 26, 6);
        badgeGfx.strokeRoundedRect(65, 90, 140, 26, 6);
        this.questionContainer.add(badgeGfx);

        const badgeText = this.add.text(135, 103, `ESCENARIO 0${index + 1}`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: '#00d2ff',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        this.questionContainer.add(badgeText);

        // Scenario Title
        const titleText = this.add.text(220, 103, q.title.toUpperCase(), {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0, 0.5);
        this.questionContainer.add(titleText);

        // Scenario Story
        const storyText = this.add.text(65, 140, q.story, {
            fontFamily: 'Mulish, Arial, sans-serif',
            fontSize: '17px',
            color: '#e2f0fb',
            wordWrap: { width: 890 },
            lineSpacing: 8
        });
        this.questionContainer.add(storyText);

        // Question Prompt Callout
        const calloutText = this.add.text(512, 240, '¿QUÉ OPCIÓN TE DA MÁS CURIOSIDAD O ENCAJA MEJOR CONTIGO?', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#8beb46',
            align: 'center'
        }).setOrigin(0.5);
        this.questionContainer.add(calloutText);

        // --- RENDER 5 INTERACTIVE CHOICES ---
        const startY = 265;
        const btnHeight = 78;
        const spacingY = 90;
        const btnWidth = 944;
        const btnX = 512;

        q.options.forEach((opt, optIdx) => {
            const y = startY + optIdx * spacingY;
            const letter = String.fromCharCode(65 + optIdx); // A, B, C, D, E

            // Button Graphic
            const btnBg = this.add.graphics();
            const drawBtn = (fillColor, borderColor, borderWidth = 2) => {
                btnBg.clear();
                // Drop shadow
                btnBg.fillStyle(0x020611, 0.8);
                btnBg.fillRoundedRect(btnX - btnWidth/2 + 2, y - btnHeight/2 + 2, btnWidth, btnHeight, 8);
                // Body
                btnBg.fillStyle(fillColor, 0.95);
                btnBg.lineStyle(borderWidth, borderColor, 1);
                btnBg.fillRoundedRect(btnX - btnWidth/2, y - btnHeight/2, btnWidth, btnHeight, 8);
                btnBg.strokeRoundedRect(btnX - btnWidth/2, y - btnHeight/2, btnWidth, btnHeight, 8);
            };

            drawBtn(0x0e1c31, 0x1d3656, 1.5);
            this.questionContainer.add(btnBg);

            // Letter Icon Box
            const letterBox = this.add.graphics();
            letterBox.fillStyle(0x132742, 1);
            letterBox.lineStyle(1.5, 0x00d2ff, 0.5);
            letterBox.fillRoundedRect(65, y - 22, 44, 44, 6);
            letterBox.strokeRoundedRect(65, y - 22, 44, 44, 6);
            this.questionContainer.add(letterBox);

            const letterText = this.add.text(87, y, letter, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '15px',
                color: '#00d2ff',
                fontWeight: 'bold'
            }).setOrigin(0.5);
            this.questionContainer.add(letterText);

            // Option Text
            const optText = this.add.text(125, y, opt.text, {
                fontFamily: 'Mulish, Arial, sans-serif',
                fontSize: '15px',
                color: '#cbd5e1',
                wordWrap: { width: 810 },
                lineSpacing: 5
            }).setOrigin(0, 0.5);
            this.questionContainer.add(optText);

            // Interactive Zone
            const zone = this.add.zone(btnX, y, btnWidth, btnHeight).setInteractive({ useHandCursor: true });
            this.questionContainer.add(zone);

            zone.on('pointerover', () => {
                if (this.isTransitioning) return;
                drawBtn(0x162c4d, 0x8beb46, 2.5);
                letterText.setColor('#8beb46');
                optText.setColor('#ffffff');
            });

            zone.on('pointerout', () => {
                if (this.isTransitioning) return;
                drawBtn(0x0e1c31, 0x1d3656, 1.5);
                letterText.setColor('#00d2ff');
                optText.setColor('#cbd5e1');
            });

            zone.on('pointerdown', () => {
                if (this.isTransitioning) return;
                this.handleOptionSelection(opt.role, btnBg, letterText, optText);
            });
        });

        // Entrance fade animation
        this.questionContainer.setAlpha(0);
        this.tweens.add({
            targets: this.questionContainer,
            alpha: 1,
            duration: 250
        });
    }

    handleOptionSelection(role, btnBg, letterText, optText) {
        this.isTransitioning = true;
        this.scores[role] = (this.scores[role] || 0) + 1;

        // Visual flash on selection
        btnBg.clear();
        btnBg.fillStyle(0x8beb46, 1);
        btnBg.fillRoundedRect(512 - 944/2, optText.y - 78/2, 944, 78, 8);
        letterText.setColor('#000000');
        optText.setColor('#000000');

        this.time.delayedCall(300, () => {
            this.tweens.add({
                targets: this.questionContainer,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    this.currentQuestionIndex++;
                    this.isTransitioning = false;

                    if (this.currentQuestionIndex < QUESTIONS_DATA.length) {
                        this.renderQuestion(this.currentQuestionIndex);
                    } else {
                        // Finish: Go to results
                        this.scene.start('ResultScene', { scores: this.scores });
                    }
                }
            });
        });
    }
}
