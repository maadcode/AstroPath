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

    // 3. Cargar efectos de sonido básicos (WebAudio)
    if (this.sound && (this.sound as any).context) {
      this.load.audio('sfx_footsteps', 'assets/audio/footsteps.wav');
      this.load.audio('sfx_dialog_open', 'assets/audio/dialog_open.wav');
      this.load.audio('sfx_option_select', 'assets/audio/option_select.wav');
      this.load.audio('sfx_station_complete', 'assets/audio/station_complete.wav');
      this.load.audio('sfx_whoosh', 'assets/audio/whoosh.wav');
    }
  }

  create() {
    this.createPlayerAnimations();
    this.scene.start('SpaceShipScene');
    this.scene.start('UIScene');
  }

  private createPlayerAnimations() {
    const directions = ['down', 'up', 'left', 'right'] as const;
    directions.forEach(dir => {
      // Animación de caminata cíclica: walk_1 -> idle -> walk_2 -> idle
      this.anims.create({
        key: `player_walk_${dir}`,
        frames: [
          { key: `player_${dir}_walk_1`, frame: '__BASE' },
          { key: `player_${dir}_idle`, frame: '__BASE' },
          { key: `player_${dir}_walk_2`, frame: '__BASE' },
          { key: `player_${dir}_idle`, frame: '__BASE' }
        ],
        frameRate: 7,
        repeat: -1
      });

      // Frame estático / animación idle por dirección
      this.anims.create({
        key: `player_idle_${dir}`,
        frames: [{ key: `player_${dir}_idle`, frame: '__BASE' }],
        frameRate: 1,
        repeat: -1
      });
    });
  }

  private drawPlayerFrame(
    g: Phaser.GameObjects.Graphics,
    dir: 'down' | 'up' | 'left' | 'right',
    frame: 'idle' | 'walk_1' | 'walk_2'
  ) {
    const SUIT_COLOR = 0x38bdf8;
    const BOOT_COLOR = 0x0284c7;
    const HELMET_COLOR = 0xf8fafc;
    const VISOR_COLOR = 0x0f172a;
    const VISOR_GLINT = 0x7dd3fc;
    const BACKPACK_COLOR = 0x0284c7;
    const BACKPACK_LIGHT = 0x38bdf8;
    const BELT_COLOR = 0x0369a1;

    // Sombra común en la base del personaje
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(16, 28, 18, 6.5);

    // Leve rebote vertical en frames de caminata para dar dinamismo
    const bob = (frame === 'walk_1' || frame === 'walk_2') ? -1 : 0;

    if (dir === 'down') {
      // 1. Piernas y Botas hacia el frente
      if (frame === 'idle') {
        g.fillStyle(SUIT_COLOR, 1);
        g.fillRect(9, 21, 5, 4);
        g.fillRect(18, 21, 5, 4);
        g.fillStyle(BOOT_COLOR, 1);
        g.fillRoundedRect(9, 24, 5, 4, 1.5);
        g.fillRoundedRect(18, 24, 5, 4, 1.5);
      } else if (frame === 'walk_1') {
        // Pierna izquierda adelante / abajo, pierna derecha atrás / arriba
        g.fillStyle(SUIT_COLOR, 1);
        g.fillRect(8, 21, 5, 4);
        g.fillRect(19, 20, 5, 3);
        g.fillStyle(BOOT_COLOR, 1);
        g.fillRoundedRect(8, 25, 6, 4, 1.5);
        g.fillRoundedRect(19, 22, 5, 3.5, 1.5);
      } else {
        // Pierna izquierda atrás / arriba, pierna derecha adelante / abajo
        g.fillStyle(SUIT_COLOR, 1);
        g.fillRect(8, 20, 5, 3);
        g.fillRect(19, 21, 5, 4);
        g.fillStyle(BOOT_COLOR, 1);
        g.fillRoundedRect(8, 22, 5, 3.5, 1.5);
        g.fillRoundedRect(18, 25, 6, 4, 1.5);
      }

      // 2. Mochila asomando por los laterales
      g.fillStyle(BACKPACK_COLOR, 1);
      g.fillRoundedRect(4, 12 + bob, 3, 9, 1);
      g.fillRoundedRect(25, 12 + bob, 3, 9, 1);

      // 3. Torso y traje espacial
      g.fillStyle(SUIT_COLOR, 1);
      g.fillRoundedRect(7, 11 + bob, 18, 12, 3);
      g.fillStyle(BELT_COLOR, 1);
      g.fillRect(8, 20 + bob, 16, 2);
      g.fillStyle(BACKPACK_COLOR, 1);
      g.fillRoundedRect(13, 14 + bob, 6, 4, 1);
      g.fillStyle(0x22c55e, 1);
      g.fillCircle(16, 16 + bob, 1);

      // 4. Casco y Visor
      g.fillStyle(HELMET_COLOR, 1);
      g.fillCircle(16, 9.5 + bob, 8.5);
      g.fillStyle(VISOR_COLOR, 1);
      g.fillRoundedRect(11, 7 + bob, 10, 6, 2);
      g.fillStyle(VISOR_GLINT, 0.9);
      g.fillRect(12, 8 + bob, 3, 2);
    } else if (dir === 'up') {
      // 1. Piernas y Botas de espaldas
      if (frame === 'idle') {
        g.fillStyle(SUIT_COLOR, 1);
        g.fillRect(9, 21, 5, 4);
        g.fillRect(18, 21, 5, 4);
        g.fillStyle(BOOT_COLOR, 1);
        g.fillRoundedRect(9, 24, 5, 4, 1.5);
        g.fillRoundedRect(18, 24, 5, 4, 1.5);
      } else if (frame === 'walk_1') {
        // Pierna izquierda en avance hacia arriba
        g.fillStyle(SUIT_COLOR, 1);
        g.fillRect(8, 19, 5, 4);
        g.fillRect(19, 21, 5, 4);
        g.fillStyle(BOOT_COLOR, 1);
        g.fillRoundedRect(8, 21, 5, 4, 1.5);
        g.fillRoundedRect(19, 25, 5, 4, 1.5);
      } else {
        // Pierna derecha en avance hacia arriba
        g.fillStyle(SUIT_COLOR, 1);
        g.fillRect(8, 21, 5, 4);
        g.fillRect(19, 19, 5, 4);
        g.fillStyle(BOOT_COLOR, 1);
        g.fillRoundedRect(8, 25, 5, 4, 1.5);
        g.fillRoundedRect(19, 21, 5, 4, 1.5);
      }

      // 2. Torso posterior
      g.fillStyle(SUIT_COLOR, 1);
      g.fillRoundedRect(7, 11 + bob, 18, 12, 3);
      g.fillStyle(BELT_COLOR, 1);
      g.fillRect(8, 20 + bob, 16, 2);

      // 3. Mochila de oxígeno prominente en la espalda
      g.fillStyle(BACKPACK_COLOR, 1);
      g.fillRoundedRect(10, 11 + bob, 12, 10, 2);
      g.fillStyle(BACKPACK_LIGHT, 0.9);
      g.fillRect(12, 13 + bob, 8, 2);
      g.fillRect(12, 17 + bob, 8, 2);

      // 4. Casco posterior (sin visor)
      g.fillStyle(HELMET_COLOR, 1);
      g.fillCircle(16, 9.5 + bob, 8.5);
      g.fillStyle(0xe2e8f0, 1);
      g.fillRect(12, 15 + bob, 8, 2);
    } else if (dir === 'left') {
      // 1. Piernas y Botas hacia la izquierda
      if (frame === 'idle') {
        g.fillStyle(SUIT_COLOR, 1);
        g.fillRect(13, 21, 6, 5);
        g.fillStyle(BOOT_COLOR, 1);
        g.fillRoundedRect(11, 24, 8, 4, 1.5);
      } else if (frame === 'walk_1') {
        // Pierna delantera da paso a la izquierda
        g.fillStyle(SUIT_COLOR, 0.85);
        g.fillRect(18, 20, 5, 4);
        g.fillStyle(BOOT_COLOR, 0.85);
        g.fillRoundedRect(18, 23, 5, 3.5, 1.5);

        g.fillStyle(SUIT_COLOR, 1);
        g.fillRect(10, 21, 6, 5);
        g.fillStyle(BOOT_COLOR, 1);
        g.fillRoundedRect(8, 25, 8, 4, 1.5);
      } else {
        // Pierna trasera avanza
        g.fillStyle(SUIT_COLOR, 1);
        g.fillRect(16, 21, 6, 5);
        g.fillStyle(BOOT_COLOR, 1);
        g.fillRoundedRect(16, 25, 7, 4, 1.5);

        g.fillStyle(SUIT_COLOR, 0.85);
        g.fillRect(10, 20, 5, 4);
        g.fillStyle(BOOT_COLOR, 0.85);
        g.fillRoundedRect(8, 23, 6, 3.5, 1.5);
      }

      // 2. Mochila a la derecha (espalda)
      g.fillStyle(BACKPACK_COLOR, 1);
      g.fillRoundedRect(20, 11 + bob, 5, 10, 2);
      g.fillStyle(BACKPACK_LIGHT, 0.9);
      g.fillRect(23, 13 + bob, 2, 6);

      // 3. Torso de perfil
      g.fillStyle(SUIT_COLOR, 1);
      g.fillRoundedRect(9, 11 + bob, 13, 12, 3);
      g.fillStyle(BOOT_COLOR, 1);
      g.fillRoundedRect(12, 13 + bob, 4, 7, 1.5);
      g.fillStyle(BELT_COLOR, 1);
      g.fillRect(9, 20 + bob, 12, 2);

      // 4. Casco y visor hacia la izquierda
      g.fillStyle(HELMET_COLOR, 1);
      g.fillCircle(15, 9.5 + bob, 8.5);
      g.fillStyle(VISOR_COLOR, 1);
      g.fillRoundedRect(7, 7 + bob, 8, 6, 2);
      g.fillStyle(VISOR_GLINT, 0.9);
      g.fillRect(8, 8 + bob, 2, 2);
    } else {
      // 1. Piernas y Botas hacia la derecha
      if (frame === 'idle') {
        g.fillStyle(SUIT_COLOR, 1);
        g.fillRect(13, 21, 6, 5);
        g.fillStyle(BOOT_COLOR, 1);
        g.fillRoundedRect(13, 24, 8, 4, 1.5);
      } else if (frame === 'walk_1') {
        // Pierna delantera da paso a la derecha
        g.fillStyle(SUIT_COLOR, 0.85);
        g.fillRect(9, 20, 5, 4);
        g.fillStyle(BOOT_COLOR, 0.85);
        g.fillRoundedRect(9, 23, 5, 3.5, 1.5);

        g.fillStyle(SUIT_COLOR, 1);
        g.fillRect(16, 21, 6, 5);
        g.fillStyle(BOOT_COLOR, 1);
        g.fillRoundedRect(16, 25, 8, 4, 1.5);
      } else {
        // Pierna contraria
        g.fillStyle(SUIT_COLOR, 1);
        g.fillRect(10, 21, 6, 5);
        g.fillStyle(BOOT_COLOR, 1);
        g.fillRoundedRect(9, 25, 7, 4, 1.5);

        g.fillStyle(SUIT_COLOR, 0.85);
        g.fillRect(17, 20, 5, 4);
        g.fillStyle(BOOT_COLOR, 0.85);
        g.fillRoundedRect(18, 23, 6, 3.5, 1.5);
      }

      // 2. Mochila a la izquierda (espalda)
      g.fillStyle(BACKPACK_COLOR, 1);
      g.fillRoundedRect(7, 11 + bob, 5, 10, 2);
      g.fillStyle(BACKPACK_LIGHT, 0.9);
      g.fillRect(7, 13 + bob, 2, 6);

      // 3. Torso de perfil
      g.fillStyle(SUIT_COLOR, 1);
      g.fillRoundedRect(10, 11 + bob, 13, 12, 3);
      g.fillStyle(BOOT_COLOR, 1);
      g.fillRoundedRect(16, 13 + bob, 4, 7, 1.5);
      g.fillStyle(BELT_COLOR, 1);
      g.fillRect(11, 20 + bob, 12, 2);

      // 4. Casco y visor hacia la derecha
      g.fillStyle(HELMET_COLOR, 1);
      g.fillCircle(17, 9.5 + bob, 8.5);
      g.fillStyle(VISOR_COLOR, 1);
      g.fillRoundedRect(17, 7 + bob, 8, 6, 2);
      g.fillStyle(VISOR_GLINT, 0.9);
      g.fillRect(21, 8 + bob, 2, 2);
    }
  }

  private createProceduralTextures() {
    // 1. Texturas direccionales procedurales del Jugador (Caminata e Idle)
    const directions: Array<'down' | 'up' | 'left' | 'right'> = ['down', 'up', 'left', 'right'];
    const frameTypes: Array<'idle' | 'walk_1' | 'walk_2'> = ['idle', 'walk_1', 'walk_2'];

    directions.forEach(dir => {
      frameTypes.forEach(frame => {
        const g = this.make.graphics({ x: 0, y: 0 });
        this.drawPlayerFrame(g, dir, frame);
        g.generateTexture(`player_${dir}_${frame}`, 32, 32);
        g.destroy();
      });
    });

    // Mantener 'player_sprite' como alias de 'player_down_idle' para compatibilidad
    const gDefault = this.make.graphics({ x: 0, y: 0 });
    this.drawPlayerFrame(gDefault, 'down', 'idle');
    gDefault.generateTexture('player_sprite', 32, 32);
    gDefault.destroy();

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
