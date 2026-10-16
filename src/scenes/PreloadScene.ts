import * as Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // 1. Cargar el mapa y tileset de Kenney
    this.load.image('scifi_tiles', 'assets/tilesets/colored_tilemap_packed.png');
    this.load.tilemapTiledJSON('spaceship_map', 'assets/maps/spaceship.json');

    // 2. Generar texturas vectoriales procedurales limpias para personajes y entorno
    this.createProceduralTextures();
  }

  create() {
    this.scene.start('SpaceShipScene');
    this.scene.start('UIScene');
  }

  private createProceduralTextures() {
    // 1. Textura del Jugador (Tripulante Novato con traje espacial azul-celeste)
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    // Sombra
    playerGraphics.fillStyle(0x000000, 0.3);
    playerGraphics.fillEllipse(16, 28, 20, 8);
    // Cuerpo / Traje
    playerGraphics.fillStyle(0x38bdf8, 1);
    playerGraphics.fillRoundedRect(6, 10, 20, 16, 4);
    // Casco
    playerGraphics.fillStyle(0xf8fafc, 1);
    playerGraphics.fillCircle(16, 10, 9);
    // Visor oscuro
    playerGraphics.fillStyle(0x0f172a, 1);
    playerGraphics.fillRoundedRect(11, 7, 10, 6, 2);
    // Mochila oxígeno
    playerGraphics.fillStyle(0x0284c7, 1);
    playerGraphics.fillRect(4, 12, 3, 10);
    playerGraphics.generateTexture('player_sprite', 32, 32);

    // 2. Textura para NPCs Jefes (Con capa/color distintivo dorado/blanco)
    const leaderGraphics = this.make.graphics({ x: 0, y: 0 });
    leaderGraphics.fillStyle(0x000000, 0.3);
    leaderGraphics.fillEllipse(16, 28, 20, 8);
    leaderGraphics.fillStyle(0xf59e0b, 1); // Capa dorada
    leaderGraphics.fillRoundedRect(5, 9, 22, 18, 4);
    leaderGraphics.fillStyle(0xffffff, 1); // Traje blanco
    leaderGraphics.fillRoundedRect(8, 11, 16, 15, 3);
    leaderGraphics.fillStyle(0xfde68a, 1); // Casco dorado
    leaderGraphics.fillCircle(16, 10, 9);
    leaderGraphics.fillStyle(0x1e1b4b, 1); // Visor
    leaderGraphics.fillRoundedRect(11, 7, 10, 6, 2);
    leaderGraphics.generateTexture('npc_leader', 32, 32);

    // 3. Textura para Pasajeros/Tripulantes
    const passengerGraphics = this.make.graphics({ x: 0, y: 0 });
    passengerGraphics.fillStyle(0x000000, 0.3);
    passengerGraphics.fillEllipse(16, 28, 20, 8);
    passengerGraphics.fillStyle(0xa855f7, 1); // Traje morado amigable
    passengerGraphics.fillRoundedRect(7, 10, 18, 16, 4);
    passengerGraphics.fillStyle(0xe2e8f0, 1); // Casco
    passengerGraphics.fillCircle(16, 10, 9);
    passengerGraphics.fillStyle(0x334155, 1); // Visor
    passengerGraphics.fillRoundedRect(11, 7, 10, 6, 2);
    passengerGraphics.generateTexture('npc_passenger', 32, 32);

    // 4. Baldosa de Piso de la Nave Espacial (Luminosa de alta tecnología)
    const floorTile = this.make.graphics({ x: 0, y: 0 });
    floorTile.fillStyle(0x1e293b, 1);
    floorTile.fillRect(0, 0, 32, 32);
    floorTile.lineStyle(1, 0x334155, 0.8);
    floorTile.strokeRect(0, 0, 32, 32);
    floorTile.fillStyle(0x475569, 0.4);
    floorTile.fillCircle(4, 4, 1.5);
    floorTile.fillCircle(28, 4, 1.5);
    floorTile.fillCircle(4, 28, 1.5);
    floorTile.fillCircle(28, 28, 1.5);
    floorTile.generateTexture('ship_floor', 32, 32);

    // 5. Baldosa de Pared / Mampara de la Nave
    const wallTile = this.make.graphics({ x: 0, y: 0 });
    wallTile.fillStyle(0x090d16, 1);
    wallTile.fillRect(0, 0, 32, 32);
    wallTile.lineStyle(2, 0x1e293b, 1);
    wallTile.strokeRect(1, 1, 30, 30);
    // Luces de neón de pared
    wallTile.fillStyle(0x06b6d4, 0.7);
    wallTile.fillRect(4, 14, 24, 4);
    wallTile.generateTexture('ship_wall', 32, 32);

    // 6. Icono de exclamación interactiva (Bubble indicator)
    const bubble = this.make.graphics({ x: 0, y: 0 });
    bubble.fillStyle(0xfacc15, 1);
    bubble.fillCircle(12, 12, 10);
    bubble.lineStyle(2, 0xffffff, 1);
    bubble.strokeCircle(12, 12, 10);
    bubble.fillStyle(0x000000, 1);
    bubble.fillRect(11, 5, 2, 8);
    bubble.fillRect(11, 15, 2, 2);
    bubble.generateTexture('quest_bubble', 24, 24);

    // 7. Check verde de completado
    const check = this.make.graphics({ x: 0, y: 0 });
    check.fillStyle(0x22c55e, 1);
    check.fillCircle(12, 12, 10);
    check.lineStyle(2, 0xffffff, 1);
    check.strokeCircle(12, 12, 10);
    check.lineStyle(2.5, 0xffffff, 1);
    check.beginPath();
    check.moveTo(7, 12);
    check.lineTo(10, 16);
    check.lineTo(17, 8);
    check.strokePath();
    check.generateTexture('check_bubble', 24, 24);
  }
}
