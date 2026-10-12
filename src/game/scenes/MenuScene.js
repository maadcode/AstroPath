import { Scene } from 'phaser';

export class MenuScene extends Scene
{
    constructor ()
    {
        super('MenuScene');
    }

    create ()
    {
        // 1. Draw Space Cyberpunk Circuit Background
        const bg = this.add.image(512, 384, 'bg');
        bg.setDisplaySize(1024, 768);

        // 2. Draw Top Header Bar
        const header = this.add.graphics();
        // Background color for header (dark slate-blue/navy)
        header.fillStyle(0x131924, 0.95);
        header.fillRect(0, 0, 1024, 60);
        // Bottom border line
        header.lineStyle(2, 0x24334a, 1);
        header.lineBetween(0, 60, 1024, 60);

        // 3. Draw Monitor Icon inside the Header
        const monitorMatrix = [
            [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
            [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
            [1,1,2,2,2,2,2,2,2,2,2,2,2,2,1,1],
            [1,1,2,3,3,3,3,3,3,3,3,3,3,2,1,1],
            [1,1,2,3,2,2,2,2,2,2,2,2,3,2,1,1],
            [1,1,2,3,2,3,3,2,2,3,3,2,3,2,1,1],
            [1,1,2,3,2,3,2,3,2,3,2,2,3,2,1,1],
            [1,1,2,3,2,3,3,2,2,3,3,2,3,2,1,1],
            [1,1,2,3,2,2,2,2,2,2,2,2,3,2,1,1],
            [1,1,2,3,3,3,3,3,3,3,3,3,3,2,1,1],
            [1,1,2,2,2,2,2,2,2,2,2,2,2,2,1,1],
            [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
            [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
            [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0]
        ];

        const monitorColors = {
            1: 0xb2bec3, // Silver Gray bezel
            2: 0x0f172a, // Dark screen background
            3: 0x8beb46  // Bright green screen content
        };

        const headerGfx = this.add.graphics();
        this.drawColoredPixelArt(headerGfx, 25, 16, monitorMatrix, 2, monitorColors);

        // Header Title
        this.add.text(68, 30, 'RutaTech', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '20px',
            color: '#8beb46',
            fontWeight: 'bold'
        }).setOrigin(0, 0.5);

        // 4. Center Title: "Explora tu ruta tech"
        this.add.text(512, 180, 'Explora tu ruta tech', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '36px',
            color: '#a2ecc7',
            fontWeight: 'bold',
            align: 'center',
            stroke: '#155e3b',
            strokeThickness: 8,
            shadow: { color: '#8beb46', fill: true, blur: 20, offsetX: 0, offsetY: 0 }
        }).setOrigin(0.5);

        // 5. Description text block
        const descText = "Descubre cómo tu mente prefiere trabajar y solucionar problemas en el\n" +
                         "mundo digital. No necesitas conocimientos previos ni saber programar.\n" +
                         "A través de 6 situaciones cotidianas, exploraremos tus inclinaciones\n" +
                         "naturales para recomendarte la especialidad ideal para ti.";
        
        this.add.text(512, 310, descText, {
            fontFamily: 'Mulish, Arial, sans-serif',
            fontSize: '17px',
            color: '#cbd5e1',
            fontWeight: '600',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);

        // 6. Three Columns with Pixel-Art Icons and Uppercase Labels
        const eyeMatrix = [
            [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
            [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
            [0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0],
            [0,1,0,0,0,0,1,1,1,1,0,0,0,0,1,0],
            [1,0,0,0,0,1,1,0,0,1,1,0,0,0,0,1],
            [1,0,0,0,1,1,0,1,1,0,1,1,0,0,0,1],
            [1,0,0,0,1,1,0,1,1,0,1,1,0,0,0,1],
            [1,0,0,0,0,1,1,0,0,1,1,0,0,0,0,1],
            [0,1,0,0,0,0,1,1,1,1,0,0,0,0,1,0],
            [0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0],
            [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
            [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0]
        ];

        const boltMatrix = [
            [0,0,0,0,0,1,1,1],
            [0,0,0,0,1,1,1,0],
            [0,0,0,1,1,1,0,0],
            [0,0,1,1,1,0,0,0],
            [0,1,1,1,1,1,1,1],
            [0,0,0,0,1,1,1,0],
            [0,0,0,1,1,1,0,0],
            [0,0,1,1,1,0,0,0],
            [0,1,1,1,0,0,0,0],
            [0,1,1,0,0,0,0,0],
            [0,1,0,0,0,0,0,0]
        ];

        const mapMatrix = [
            [0,0,1,1,1,1,0,0,0,1,1,1,1,0,0,0,0,0],
            [0,1,1,0,0,1,1,0,1,1,0,0,1,1,0,0,0,0],
            [1,1,0,0,0,1,1,1,1,0,0,0,1,1,1,1,1,0],
            [1,1,0,1,0,1,1,1,1,0,1,0,1,1,0,0,1,1],
            [1,1,0,1,0,1,1,1,1,0,1,0,1,1,0,0,1,1],
            [1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1],
            [1,1,0,0,0,1,0,0,1,1,0,0,1,1,0,0,1,1],
            [0,1,1,0,0,1,0,0,1,1,0,0,1,1,0,0,1,1],
            [0,0,1,1,1,1,0,0,0,1,1,1,1,0,0,1,1,0]
        ];

        const colData = [
            {
                x: 250,
                label: 'SIN RESPUESTAS CORRECTAS',
                matrix: eyeMatrix,
                width: 16,
                height: 12,
                pixelSize: 4
            },
            {
                x: 512,
                label: 'INTUICIÓN PURA',
                matrix: boltMatrix,
                width: 8,
                height: 11,
                pixelSize: 4
            },
            {
                x: 774,
                label: 'TU PROPIA HOJA DE RUTA',
                matrix: mapMatrix,
                width: 18,
                height: 9,
                pixelSize: 4
            }
        ];

        const iconsGfx = this.add.graphics();

        colData.forEach(col => {
            // Draw Icon centered
            const iconX = col.x - (col.width * col.pixelSize) / 2;
            const iconY = 470 - (col.height * col.pixelSize) / 2;
            this.drawPixelArt(iconsGfx, iconX, iconY, col.matrix, col.pixelSize, 0x8beb46);

            // Draw Label
            this.add.text(col.x, 525, col.label, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '11px',
                color: '#f8f8f8',
                align: 'center',
                shadow: { color: '#000', fill: true, blur: 4, offsetX: 2, offsetY: 2 }
            }).setOrigin(0.5);
        });

        // 7. Interactive Start Button
        const btnWidth = 440;
        const btnHeight = 64;
        const btnX = 512;
        const btnY = 635;

        const btnBg = this.add.graphics();
        
        const drawButton = (color) => {
            btnBg.clear();
            // Solid Shadow (dark navy)
            btnBg.fillStyle(0x0a0f1d, 0.85);
            btnBg.fillRoundedRect(btnX - btnWidth / 2 + 4, btnY - btnHeight / 2 + 4, btnWidth, btnHeight, 8);
            
            // Button Body
            btnBg.fillStyle(color, 1);
            btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 8);
            
            // Border
            btnBg.lineStyle(3, 0x155e3b, 1);
            btnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 8);
        };

        // Initial button style (neon green)
        drawButton(0x8beb46);

        const btnText = this.add.text(btnX, btnY, 'INICIAR EXPLORACIÓN', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '16px',
            color: '#000000',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Hover/Interaction zone
        const zone = this.add.zone(btnX, btnY, btnWidth, btnHeight).setInteractive({ useHandCursor: true });

        zone.on('pointerdown', () => {
            // Flash screen in lime green/cyan and start game scene
            this.cameras.main.flash(400, 139, 235, 70); // Lime Green #8BEB46
            this.time.delayedCall(400, () => {
                this.scene.start('GameScene');
            });
        });

        zone.on('pointerover', () => {
            drawButton(0x00ffcc); // Cyan/green on hover
            
            this.tweens.add({
                targets: btnText,
                scale: 1.03,
                duration: 100
            });
        });

        zone.on('pointerout', () => {
            drawButton(0x8beb46); // Restore green
            btnText.setScale(1);
        });
    }

    // Helper to draw single color pixel art matrices
    drawPixelArt(graphics, x, y, matrix, pixelSize, color) {
        graphics.fillStyle(color, 1);
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] === 1) {
                    graphics.fillRect(x + c * pixelSize, y + r * pixelSize, pixelSize, pixelSize);
                }
            }
        }
    }

    // Helper to draw multi-color pixel art matrices
    drawColoredPixelArt(graphics, x, y, matrix, pixelSize, colorMap) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                const val = matrix[r][c];
                if (val !== 0 && colorMap[val] !== undefined) {
                    graphics.fillStyle(colorMap[val], 1);
                    graphics.fillRect(x + c * pixelSize, y + r * pixelSize, pixelSize, pixelSize);
                }
            }
        }
    }
}

