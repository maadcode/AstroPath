import { Scene } from 'phaser';
import { ROLES_INFO } from '../data/questionsData';

export class ResultScene extends Scene
{
    constructor ()
    {
        super('ResultScene');
    }

    init(data) {
        this.scores = data.scores || {
            software: 2,
            seguridad: 1,
            datos_ia: 1,
            redes: 1,
            gestion: 1
        };

        this.calculateResults();
    }

    calculateResults() {
        const totalVotes = Object.values(this.scores).reduce((a, b) => a + b, 0) || 1;
        
        // Convert to array of roles with score and percentage
        const rolesList = Object.keys(ROLES_INFO).map(key => {
            const votes = this.scores[key] || 0;
            const pct = Math.round((votes / totalVotes) * 100);
            return {
                ...ROLES_INFO[key],
                votes,
                percentage: pct
            };
        });

        // Sort descending by votes
        rolesList.sort((a, b) => b.votes - a.votes);

        this.primaryRole = rolesList[0];
        this.secondaryRole = rolesList[1];
        this.allRolesScored = rolesList;
    }

    create ()
    {
        // 1. Background image
        const bg = this.add.image(512, 384, 'bg');
        bg.setDisplaySize(1024, 768);
        bg.setAlpha(0.2);

        // 2. Title header
        this.add.text(512, 40, 'DIAGNÓSTICO VOCACIONAL TECH', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '18px',
            color: '#a2ecc7',
            fontWeight: 'bold',
            stroke: '#155e3b',
            strokeThickness: 5
        }).setOrigin(0.5);

        // 3. Draw Split Panels (Left: Affinities breakdown, Right: Primary role report)
        const panelY = 360;
        const panelHeight = 540;

        // Left Panel (Affinities)
        const leftWidth = 380;
        const leftX = 220;
        const leftG = this.add.graphics();
        leftG.fillStyle(0x0a1426, 0.95);
        leftG.lineStyle(2, 0x00d2ff, 0.8);
        leftG.fillRoundedRect(leftX - leftWidth/2, panelY - panelHeight/2, leftWidth, panelHeight, 10);
        leftG.strokeRoundedRect(leftX - leftWidth/2, panelY - panelHeight/2, leftWidth, panelHeight, 10);
        this.drawLeftAffinities(leftX, panelY);

        // Right Panel (Main Recommendation)
        const rightWidth = 550;
        const rightX = 715;
        const rightG = this.add.graphics();
        rightG.fillStyle(0x0a1426, 0.95);
        rightG.lineStyle(2, 0x8beb46, 0.8);
        rightG.fillRoundedRect(rightX - rightWidth/2, panelY - panelHeight/2, rightWidth, panelHeight, 10);
        rightG.strokeRoundedRect(rightX - rightWidth/2, panelY - panelHeight/2, rightWidth, panelHeight, 10);
        this.drawRightRoleReport(rightX, panelY);

        // 4. Restart Button
        this.createRestartButton();
    }

    drawLeftAffinities(centerX, centerY) {
        // Section Header
        this.add.text(centerX, centerY - 235, 'TUS AFINIDADES', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '13px',
            color: '#00d2ff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        const subText = this.add.text(centerX, centerY - 205, 'Basado en tus decisiones en los 6 escenarios:', {
            fontFamily: 'Mulish, Arial, sans-serif',
            fontSize: '12px',
            color: '#8e9aaf',
            align: 'center'
        }).setOrigin(0.5);

        // Draw affinity bars for each of the 5 roles
        const startY = centerY - 160;
        const spacingY = 78;

        this.allRolesScored.forEach((role, idx) => {
            const y = startY + idx * spacingY;

            // Role Name
            this.add.text(centerX - 160, y - 10, role.name, {
                fontFamily: 'Mulish, Arial, sans-serif',
                fontSize: '13px',
                color: '#ffffff',
                fontWeight: 'bold'
            });

            // Percentage Text
            this.add.text(centerX + 160, y - 10, `${role.percentage}%`, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '11px',
                color: role.color,
                fontWeight: 'bold'
            }).setOrigin(1, 0);

            // Progress Bar Track
            const barW = 320;
            const barH = 16;
            const barX = centerX - 160;
            const barY = y + 14;

            const barGfx = this.add.graphics();
            // Background
            barGfx.fillStyle(0x050b14, 1);
            barGfx.lineStyle(1.5, 0x1f334d, 1);
            barGfx.fillRoundedRect(barX, barY, barW, barH, 4);
            barGfx.strokeRoundedRect(barX, barY, barW, barH, 4);

            // Fill
            const fillWidth = Math.max(8, (barW * role.percentage) / 100);
            const hexColor = parseInt(role.color.replace('#', '0x'), 16);
            barGfx.fillStyle(hexColor, 0.9);
            barGfx.fillRoundedRect(barX, barY, fillWidth, barH, 4);
        });

        // Summary footer quote
        this.add.text(centerX, centerY + 235, '💡 "Cada especialidad aporta un valor único\ny puedes combinarlas en tu carrera."', {
            fontFamily: 'Mulish, Arial, sans-serif',
            fontSize: '11px',
            color: '#7688a4',
            align: 'center',
            wordWrap: { width: 330 }
        }).setOrigin(0.5);
    }

    drawRightRoleReport(centerX, centerY) {
        // Main Recommendation Header
        const recBadge = this.add.graphics();
        recBadge.fillStyle(0x8beb46, 0.15);
        recBadge.lineStyle(1, 0x8beb46, 0.7);
        recBadge.fillRoundedRect(centerX - 245, centerY - 245, 230, 26, 4);
        recBadge.strokeRoundedRect(centerX - 245, centerY - 245, 230, 26, 4);

        this.add.text(centerX - 130, centerY - 232, '★ TU CAMINO RECOMENDADO ★', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: '#8beb46',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Role Name
        this.add.text(centerX - 245, centerY - 200, this.primaryRole.name.toUpperCase(), {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '16px',
            color: '#ffffff',
            fontWeight: 'bold'
        });

        // Subtitle badge
        this.add.text(centerX - 245, centerY - 170, `[ ${this.primaryRole.badge} ]`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: this.primaryRole.color,
            fontWeight: 'bold'
        });

        // Description
        this.add.text(centerX - 245, centerY - 145, this.primaryRole.desc, {
            fontFamily: 'Mulish, Arial, sans-serif',
            fontSize: '14px',
            color: '#cbd5e1',
            wordWrap: { width: 490 },
            lineSpacing: 5
        });

        // Divider
        const divG = this.add.graphics();
        divG.lineStyle(1, 0x1f334d, 0.8);
        divG.lineBetween(centerX - 245, centerY - 65, centerX + 245, centerY - 65);

        // Section: Tasks in Career
        this.add.text(centerX - 245, centerY - 50, '¿QUÉ HARÍAS EN TUS PROYECTOS?:', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: '#00d2ff',
            fontWeight: 'bold'
        });

        this.primaryRole.tasks.forEach((task, idx) => {
            const bulletY = centerY - 25 + idx * 24;
            this.add.text(centerX - 245, bulletY, `• ${task}`, {
                fontFamily: 'Mulish, Arial, sans-serif',
                fontSize: '13px',
                color: '#e2e8f0',
                wordWrap: { width: 480 },
                lineSpacing: 2
            });
        });

        // Divider 2
        divG.lineBetween(centerX - 245, centerY + 60, centerX + 245, centerY + 60);

        // Section: What to learn
        this.add.text(centerX - 245, centerY + 75, '¿QUÉ EMPEZAR A APRENDER HOY?:', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: '#8beb46',
            fontWeight: 'bold'
        });

        this.primaryRole.learningPath.forEach((item, idx) => {
            const itemY = centerY + 98 + idx * 22;
            this.add.text(centerX - 245, itemY, `→ ${item}`, {
                fontFamily: 'Mulish, Arial, sans-serif',
                fontSize: '12px',
                color: '#a0aec0',
                wordWrap: { width: 480 }
            });
        });

        // Divider 3
        divG.lineBetween(centerX - 245, centerY + 175, centerX + 245, centerY + 175);

        // Secondary Role Callout
        this.add.text(centerX - 245, centerY + 190, 'SEGUNDA OPCIÓN AFÍN:', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: '#8e9aaf'
        });

        this.add.text(centerX - 245, centerY + 212, `${this.secondaryRole.name} (${this.secondaryRole.badge})`, {
            fontFamily: 'Mulish, Arial, sans-serif',
            fontSize: '14px',
            color: '#ffa500',
            fontWeight: 'bold'
        });
    }

    createRestartButton() {
        const btnWidth = 360;
        const btnHeight = 46;
        const btnX = 512;
        const btnY = 690;

        const btnBg = this.add.graphics();
        const drawBtn = (color, textColor) => {
            btnBg.clear();
            btnBg.fillStyle(color, 1);
            btnBg.fillRoundedRect(btnX - btnWidth/2, btnY - btnHeight/2, btnWidth, btnHeight, 6);
            btnBg.lineStyle(2, 0x155e3b, 1);
            btnBg.strokeRoundedRect(btnX - btnWidth/2, btnY - btnHeight/2, btnWidth, btnHeight, 6);
        };

        drawBtn(0x8beb46, '#000000');

        const btnText = this.add.text(btnX, btnY, 'REPETIR TEST VOCACIONAL', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#000000',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        const zone = this.add.zone(btnX, btnY, btnWidth, btnHeight).setInteractive({ useHandCursor: true });

        zone.on('pointerdown', () => {
            this.cameras.main.flash(300, 139, 235, 70);
            this.time.delayedCall(300, () => {
                this.scene.start('MenuScene');
            });
        });

        zone.on('pointerover', () => {
            drawBtn(0x00ffcc, '#000000');
        });

        zone.on('pointerout', () => {
            drawBtn(0x8beb46, '#000000');
        });
    }
}
