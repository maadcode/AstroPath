import * as Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { SpaceShipScene } from './scenes/SpaceShipScene';
import { DialogScene } from './scenes/DialogScene';
import { UIScene } from './scenes/UIScene';
import { ReportScene } from './scenes/ReportScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#050711',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 640
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [PreloadScene, SpaceShipScene, UIScene, DialogScene, ReportScene]
};

window.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(config);
});
