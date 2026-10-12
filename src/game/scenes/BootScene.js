import { Scene } from 'phaser';

export class BootScene extends Scene
{
    constructor ()
    {
        super('BootScene');
    }

    preload ()
    {
        // Draw black background
        const bg = this.add.graphics();
        bg.fillStyle(0x020712, 1);
        bg.fillRect(0, 0, 1024, 768);

        // Cybermatic title text for loading screen
        this.add.text(512, 300, 'LABORATORIO VOCACIONAL TECH', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '32px',
            color: '#00d2ff',
            fontWeight: 'bold',
            stroke: '#002244',
            strokeThickness: 5
        }).setOrigin(0.5);

        this.add.text(512, 340, 'INICIALIZANDO ESTACIÓN ESPACIAL...', {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '14px',
            color: '#a0a0c0'
        }).setOrigin(0.5);

        // A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 420, 468, 20).setStrokeStyle(1, 0x00d2ff);

        // This is the progress bar itself.
        const bar = this.add.rectangle(512 - 230, 420, 4, 16, 0x00ffcc);

        // Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress) => {
            bar.width = 4 + (460 * progress);
        });

        // Load the assets
        this.load.setPath('assets');
        this.load.image('space_station_bg', 'space_station_bg.jpg');
        this.load.image('bg', 'bg.png');
        this.load.image('colleague_avatar', 'colleague_avatar.jpg');
        this.load.image('logo', 'logo.png'); // Default Phaser logo as a backup asset
    }

    create ()
    {
        // Once assets are preloaded, start the welcome MenuScene
        this.scene.start('MenuScene');
    }
}
