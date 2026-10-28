import * as Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { DialogScene } from './DialogScene';
import { UIScene } from './UIScene';

interface InteractiveNPC {
  sprite: Phaser.GameObjects.Sprite;
  indicator: Phaser.GameObjects.Sprite;
  nameTag: Phaser.GameObjects.Text;
  stationId: string;
  isLeader: boolean;
  passengerId?: string;
  interacted: boolean;
}

export class SpaceShipScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { [key: string]: Phaser.Input.Keyboard.Key };
  private interactKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  private npcs: InteractiveNPC[] = [];
  private ambientEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private gameState = GameState.getInstance();
  private nearbyNpc: InteractiveNPC | null = null;
  private isInteracting = false;
  private lastInteractionEndTime = 0;
  private readonly INTERACTION_COOLDOWN_MS = 350;
  private currentDirection: 'down' | 'up' | 'left' | 'right' = 'down';

  private footstepsSound?: Phaser.Sound.BaseSound;

  private map!: Phaser.Tilemaps.Tilemap;
  private wallsLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
  private readonly TILE_SCALE = 4;

  constructor() {
    super('SpaceShipScene');
  }

  private endInteraction() {
    this.isInteracting = false;
    this.lastInteractionEndTime = this.time.now;
    const dialogScene = this.scene.get('DialogScene') as DialogScene;
    const isDialogActive = dialogScene ? dialogScene.isDialogVisible() : false;
    const uiScene = this.scene.get('UIScene') as UIScene;
    if (uiScene && !isDialogActive && !this.scene.isPaused('SpaceShipScene')) {
      uiScene.setRadarVisible(true);
    }
  }

  create() {
    // 1. Cargar el Tilemap y configurar el tamaño del mundo
    this.buildShipEnvironment();

    const worldWidth = this.map.widthInPixels * this.TILE_SCALE;
    const worldHeight = this.map.heightInPixels * this.TILE_SCALE;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 2. Crear al Jugador en el pasillo central del mapa (tile 33, 9)
    const startX = 464;
    const startY = 336;
    this.player = this.physics.add.sprite(startX, startY, 'player_down_idle');
    this.player.setCollideWorldBounds(true);
    this.player.setScale(0.95);
    if (this.player.body) {
      this.player.body.setSize(16, 16);
      this.player.body.setOffset(8, 12);
    }
    this.player.play('player_idle_down');

    // 3. Activar colisión sólida del jugador contra las paredes del mapa
    if (this.wallsLayer) {
      this.physics.add.collider(this.player, this.wallsLayer);
    }

    // 4. Configurar Cámara con seguimiento suave y zoom para pixel art
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(1.35);

    // 5. Instanciar NPCs Jefes y Pasajeros en las salas del mapa
    this.spawnStationNPCs();

    // 6. Partículas ambientales sutiles por zona temática
    this.createAmbientParticles();

    // 7. Controles por teclado
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
      this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // 7. Arrancar la escena de diálogos en paralelo
    if (!this.scene.isActive('DialogScene')) {
      this.scene.launch('DialogScene');
    }

    // 8. Asegurar liberación de controles al reanudar la escena y restaurar UI
    this.events.on('resume', () => {
      const dialogScene = this.scene.get('DialogScene') as DialogScene;
      if (!dialogScene || !dialogScene.isDialogVisible()) {
        this.endInteraction();
      }
      const uiScene = this.scene.get('UIScene') as UIScene;
      if (uiScene) {
        uiScene.refreshRadarStationStates();
        const isDialogActive = dialogScene ? dialogScene.isDialogVisible() : false;
        uiScene.setRadarVisible(!isDialogActive && !this.isInteracting);
      }
    });

    // 9. Configurar efectos de sonido (pasos)
    if (this.sound && this.cache.audio.exists('sfx_footsteps')) {
      this.footstepsSound = this.sound.add('sfx_footsteps', { loop: true, volume: 0.25 });
    }

    this.events.on('pause', () => {
      if (this.footstepsSound && this.footstepsSound.isPlaying) {
        this.footstepsSound.stop();
      }
      const uiScene = this.scene.get('UIScene') as UIScene;
      if (uiScene) {
        uiScene.setRadarVisible(false);
      }
    });

    this.events.on('shutdown', () => {
      if (this.footstepsSound) {
        this.footstepsSound.stop();
      }
    });

    // 10. Sincronizar posición y estado inicial del radar en UIScene
    const uiScene = this.scene.get('UIScene') as UIScene;
    if (uiScene) {
      uiScene.updatePlayerPosition(this.player.x, this.player.y);
      uiScene.refreshRadarStationStates();
      uiScene.setRadarVisible(true);
    }
  }

  update() {
    this.handlePlayerMovement();
    this.checkNPCProximity();
    this.handleInteractionInput();
    this.updateRadarSync();
  }

  private updateRadarSync() {
    const uiScene = this.scene.get('UIScene') as UIScene;
    if (!uiScene || !this.player) return;

    uiScene.updatePlayerPosition(this.player.x, this.player.y);

    const dialogScene = this.scene.get('DialogScene') as DialogScene;
    const isDialogActive = dialogScene ? dialogScene.isDialogVisible() : false;
    const isPaused = this.scene.isPaused('SpaceShipScene');
    const shouldShowRadar = !isDialogActive && !isPaused && !this.isInteracting;

    uiScene.setRadarVisible(shouldShowRadar);
  }

  private buildShipEnvironment() {
    // 1. Instanciar el mapa de baldosas exportado desde Tiled
    this.map = this.make.tilemap({ key: 'spaceship_map' });
    const tileset = this.map.addTilesetImage('wan', 'scifi_tiles');

    if (tileset) {
      // Capa 1: Suelo transitable
      const floorLayer = this.map.createLayer('suelo', tileset);
      if (floorLayer) {
        floorLayer.setScale(this.TILE_SCALE);
        floorLayer.setDepth(-10);
      }

      // Capa 2: Puertas
      const doorsLayer = this.map.createLayer('puertas', tileset);
      if (doorsLayer) {
        doorsLayer.setScale(this.TILE_SCALE);
        doorsLayer.setDepth(-9);
      }

      // Capa 3: Muros (Físicamente sólidos)
      const walls = this.map.createLayer('muros', tileset);
      if (walls) {
        walls.setScale(this.TILE_SCALE);
        walls.setDepth(-8);
        walls.setCollisionByExclusion([-1]);
        this.wallsLayer = walls;
      }

      // Capa 4: Decoraciones (consolas, computadoras, muebles)
      const decorLayer = this.map.createLayer('decoraciones', tileset);
      if (decorLayer) {
        decorLayer.setScale(this.TILE_SCALE);
        decorLayer.setDepth(-7);
      }
    }

    // Carteles luminosos temáticos para cada sala del mapa
    this.createStationLabels();
  }

  private createStationLabels() {
    const labels = [
      { x: 272, y: 55, name: 'BAHÍA DE ENSAMBLAJE', color: '#38bdf8' },
      { x: 688, y: 55, name: 'TORRE DE ANTENAS', color: '#34d399' },
      { x: 176, y: 195, name: 'PUESTO DE VIGILANCIA', color: '#f87171' },
      { x: 144, y: 470, name: 'LABORATORIO DE CULTIVOS', color: '#c084fc' },
      { x: 688, y: 590, name: 'SALA COMÚN', color: '#fbbf24' },
      { x: 464, y: 280, name: 'PASILLO CENTRAL', color: '#94a3b8' }
    ];

    labels.forEach(l => {
      this.add.text(l.x, l.y, l.name, {
        fontSize: '10px',
        color: l.color,
        fontStyle: 'bold',
        backgroundColor: '#090d16dd',
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5).setDepth(-6);
    });
  }

  private spawnStationNPCs() {
    // Coordenadas calculadas exactamente dentro de las salas del nuevo mapa
    const configs = [
      {
        stationId: 'station_dev',
        leaderX: 272, leaderY: 112, // Sala superior izquierda (Taller)
        passengers: []
      },
      {
        stationId: 'station_net',
        leaderX: 688, leaderY: 112, // Sala superior derecha (Redes)
        passengers: []
      },
      {
        stationId: 'station_sec',
        leaderX: 176, leaderY: 240, // Sala media izquierda (Seguridad)
        passengers: []
      },
      {
        stationId: 'station_data',
        leaderX: 144, leaderY: 528, // Sala lateral izquierda (Cultivos)
        passengers: []
      },
      {
        stationId: 'station_biz',
        leaderX: 688, leaderY: 640, // Sala inferior derecha (Lounge)
        passengers: [
          { pId: 'p_biz_1', x: 624, y: 688 },
          { pId: 'p_biz_2', x: 752, y: 688 }
        ]
      }
    ];

    configs.forEach(c => {
      const station = this.gameState.getStation(c.stationId);
      if (!station) return;

      // 1. NPC Jefe de la estación
      const leaderSprite = this.physics.add.sprite(c.leaderX, c.leaderY, 'npc_leader');
      leaderSprite.setScale(0.95);
      const ind = this.add.sprite(c.leaderX, c.leaderY - 26, 'quest_bubble').setScale(0.7);
      const name = this.add.text(c.leaderX, c.leaderY + 22, `${station.leaderNpcName}`, {
        fontSize: '10px',
        color: '#facc15',
        fontStyle: 'bold',
        backgroundColor: '#050711ee',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5);

      this.npcs.push({
        sprite: leaderSprite,
        indicator: ind,
        nameTag: name,
        stationId: c.stationId,
        isLeader: true,
        interacted: false
      });

      // 2. Pasajeros / Testigos
      c.passengers.forEach(pConf => {
        const pData = station.passengers.find((p: any) => p.id === pConf.pId);
        if (!pData) return;

        const pSprite = this.physics.add.sprite(pConf.x, pConf.y, 'npc_passenger');
        pSprite.setScale(0.9);
        const pInd = this.add.sprite(pConf.x, pConf.y - 24, 'quest_bubble').setScale(0.65);
        const pName = this.add.text(pConf.x, pConf.y + 20, pData.name, {
          fontSize: '9px',
          color: '#cbd5e1',
          backgroundColor: '#050711ee',
          padding: { x: 3, y: 1 }
        }).setOrigin(0.5);

        this.npcs.push({
          sprite: pSprite,
          indicator: pInd,
          nameTag: pName,
          stationId: c.stationId,
          isLeader: false,
          passengerId: pData.id,
          interacted: false
        });
      });
    });

    // Efecto flotante leve en los indicadores de misión
    this.tweens.add({
      targets: this.npcs.map(n => n.indicator),
      y: '-=5',
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createAmbientParticles() {
    // Delimitación exterior de la nave espacial (para evitar que cualquier partícula entre a las salas)
    const shipBounds = new Phaser.Geom.Rectangle(0, 0, 896, 864);

    // Fuente de emisión que genera puntos en todo el espacio exterior (arriba, abajo, izquierda y derecha)
    const spaceSource = {
      getRandomPoint: (point: Phaser.Types.Math.Vector2Like) => {
        let x = 0;
        let y = 0;
        while (true) {
          x = Phaser.Math.Between(10, 1910);
          y = Phaser.Math.Between(10, 1430);
          // Si el punto NO está dentro del casco de la nave, es espacio exterior válido
          if (!(x >= 0 && x <= 896 && y >= 0 && y <= 864)) {
            break;
          }
        }
        point.x = x;
        point.y = y;
        return point;
      }
    };

    // 1. Polvo estelar y estrellas tenues (Twinkling stardust)
    const starEmitter = this.add.particles(0, 0, 'particle_star', {
      emitZone: { type: 'random', source: spaceSource } as any,
      deathZone: {
        type: 'onEnter',
        source: shipBounds
      } as any,
      speed: { min: 3, max: 12 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.45, end: 1.0 },
      alpha: { start: 0.2, end: 0.8 },
      lifespan: { min: 3500, max: 6500 },
      frequency: 90,
      quantity: 1,
      maxAliveParticles: 48,
      advance: 5000,
      blendMode: 'ADD'
    });
    starEmitter.setDepth(-20);
    this.ambientEmitters.push(starEmitter);

    // 2. Chispas cósmicas y micro-destellos espaciales
    const sparkEmitter = this.add.particles(0, 0, 'particle_spark', {
      emitZone: { type: 'random', source: spaceSource } as any,
      deathZone: {
        type: 'onEnter',
        source: shipBounds
      } as any,
      speed: { min: 5, max: 18 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.85, end: 0.25 },
      alpha: { start: 0.7, end: 0 },
      lifespan: { min: 2500, max: 5000 },
      frequency: 110,
      quantity: 1,
      maxAliveParticles: 45,
      advance: 5000,
      blendMode: 'ADD'
    });
    sparkEmitter.setDepth(-20);
    this.ambientEmitters.push(sparkEmitter);

    // 3. Velo de nebulosa cósmica / esporas de energía espacial
    const nebulaEmitter = this.add.particles(0, 0, 'particle_spore', {
      emitZone: { type: 'random', source: spaceSource } as any,
      deathZone: {
        type: 'onEnter',
        source: shipBounds
      } as any,
      speed: { min: 2, max: 10 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 1.2 },
      alpha: { start: 0.15, end: 0.55 },
      lifespan: { min: 4000, max: 7500 },
      frequency: 120,
      quantity: 1,
      maxAliveParticles: 45,
      advance: 5000,
      blendMode: 'ADD'
    });
    nebulaEmitter.setDepth(-20);
    this.ambientEmitters.push(nebulaEmitter);

    // 4. Motas de polvo cósmico dorado profundo
    const dustEmitter = this.add.particles(0, 0, 'particle_dust', {
      emitZone: { type: 'random', source: spaceSource } as any,
      deathZone: {
        type: 'onEnter',
        source: shipBounds
      } as any,
      speed: { min: 3, max: 14 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.65, end: 0.3 },
      alpha: { start: 0.2, end: 0.65 },
      lifespan: { min: 3500, max: 6500 },
      frequency: 100,
      quantity: 1,
      maxAliveParticles: 48,
      advance: 5000,
      blendMode: 'ADD'
    });
    dustEmitter.setDepth(-20);
    this.ambientEmitters.push(dustEmitter);
  }

  private handlePlayerMovement() {
    if (this.isInteracting) {
      this.player.setVelocity(0, 0);
      this.player.play(`player_idle_${this.currentDirection}`, true);
      if (this.footstepsSound && this.footstepsSound.isPlaying) {
        this.footstepsSound.stop();
      }
      return;
    }

    const uiScene = this.scene.get('UIScene') as UIScene;
    const speed = 240;
    let vx = 0;
    let vy = 0;

    // Teclado
    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasdKeys.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasdKeys.S.isDown) vy += 1;

    // Joystick virtual móvil
    if (uiScene && uiScene.virtualJoystick) {
      if (uiScene.virtualJoystick.x !== 0) vx = uiScene.virtualJoystick.x;
      if (uiScene.virtualJoystick.y !== 0) vy = uiScene.virtualJoystick.y;
    }

    // Normalizar vector para evitar velocidad diagonal extra en teclado
    if (vx !== 0 && vy !== 0 && Math.abs(vx) === 1 && Math.abs(vy) === 1) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    this.player.setVelocity(vx * speed, vy * speed);

    const isMoving = Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05;
    if (isMoving) {
      // Determinar dirección predominante según vector de velocidad
      if (Math.abs(vx) > Math.abs(vy)) {
        this.currentDirection = vx < 0 ? 'left' : 'right';
      } else {
        this.currentDirection = vy < 0 ? 'up' : 'down';
      }

      this.player.play(`player_walk_${this.currentDirection}`, true);

      // Control de audio de pasos metálicos suaves
      if (this.footstepsSound && !this.footstepsSound.isPlaying) {
        this.footstepsSound.play();
      }
    } else {
      this.player.play(`player_idle_${this.currentDirection}`, true);

      if (this.footstepsSound && this.footstepsSound.isPlaying) {
        this.footstepsSound.stop();
      }
    }
  }

  private checkNPCProximity() {
    const interactRadius = 60;
    let foundNearby: InteractiveNPC | null = null;
    let closestDist = interactRadius;

    for (const npc of this.npcs) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        npc.sprite.x, npc.sprite.y
      );

      if (dist <= closestDist) {
        closestDist = dist;
        foundNearby = npc;
      }
    }

    this.nearbyNpc = foundNearby;
  }

  private handleInteractionInput() {
    if (this.isInteracting || !this.nearbyNpc) return;

    const uiScene = this.scene.get('UIScene') as UIScene;
    if (uiScene && uiScene.isWelcomeModalActive && uiScene.isWelcomeModalActive()) {
      return;
    }

    if (this.time.now - this.lastInteractionEndTime < this.INTERACTION_COOLDOWN_MS) {
      return;
    }

    const isMobileAction = uiScene ? uiScene.isActionButtonPressed : false;

    const isPressed = Phaser.Input.Keyboard.JustDown(this.interactKey) ||
                      Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
                      isMobileAction;

    if (isPressed) {
      if (uiScene) uiScene.isActionButtonPressed = false;
      this.triggerInteraction(this.nearbyNpc);
    }
  }

  private triggerInteraction(npc: InteractiveNPC) {
    this.isInteracting = true;
    const uiScene = this.scene.get('UIScene') as UIScene;
    if (uiScene) {
      uiScene.setRadarVisible(false);
    }
    this.player.setVelocity(0, 0);
    this.player.play(`player_idle_${this.currentDirection}`, true);
    if (this.footstepsSound && this.footstepsSound.isPlaying) {
      this.footstepsSound.stop();
    }
    if (this.sound && this.cache.audio.exists('sfx_dialog_open')) {
      this.sound.play('sfx_dialog_open', { volume: 0.35 });
    }

    const dialogScene = this.scene.get('DialogScene') as DialogScene;
    const station = this.gameState.getStation(npc.stationId);

    if (!station) {
      this.endInteraction();
      return;
    }

    // Si la estación ya fue resuelta
    if (station.completed) {
      dialogScene.showSimpleDialog(
        `${station.name} (Completada)`,
        `¡Todo marcha sobre ruedas por aquí! Gracias por tu valiosa ayuda.`,
        () => { this.endInteraction(); }
      );
      return;
    }

    // Caso 1: Pasajero / Testigo
    if (!npc.isLeader && npc.passengerId) {
      const passenger = station.passengers.find((p: any) => p.id === npc.passengerId);
      if (passenger) {
        passenger.visited = true;
        npc.indicator.setTexture('check_bubble');

        dialogScene.showSimpleDialog(
          `${passenger.name} (${passenger.role})`,
          `"${passenger.dialogue}"\n\n💡 Observación: ${passenger.hint}`,
          () => {
            this.endInteraction();
            if (station.id === 'station_biz') {
              uiScene.updateHUD(`Hablaste con ${passenger.name}. Reúne más testimonios o vuelve con la encargada.`);
            } else {
              uiScene.updateHUD(`Hablaste con ${passenger.name}. Dirígete al encargado ${station.leaderNpcName} para el desafío técnico.`);
            }
          }
        );
      }
      return;
    }

    // Caso 2: NPC Jefe de la estación
    if (npc.isLeader) {
      // Iniciar temporizador de la estación si no estaba activo
      this.gameState.startStationTimer(station.id);

      // Solo la estación de gestión y análisis (station_biz) requiere consultar pasajeros antes de resolver
      const requiresWitnesses = station.id === 'station_biz';
      const allWitnesses = !requiresWitnesses || this.gameState.allPassengersVisited(station.id);

      if (!allWitnesses) {
        // Explicación inicial del dilema (exclusivo de estación social/gestión)
        dialogScene.showSimpleDialog(
          `${station.leaderNpcName} - ${station.leaderTitle}`,
          `${station.dilemmaText}\n\n👉 Misión de Mediación: Acércate a los tripulantes cercanos en el salón con iconos amarillos para escuchar sus opiniones antes de definir una solución.`,
          () => {
            this.endInteraction();
            uiScene.updateHUD(`Misión activa: Escucha a los tripulantes en ${station.name}`);
          }
        );
      } else {
        const minigameMap: { [id: string]: { scene: string; intro: string } } = {
          station_net: {
            scene: 'NetworkMinigameScene',
            intro: `${station.dilemmaText}\n\n📡 Torre de antenas: rutea las señales a través de la matriz de nodos ópticos evitando la congestión de canal e interferencias.`
          },
          station_sec: {
            scene: 'SecurityMinigameScene',
            intro: `${station.dilemmaText}\n\n🛡️ Puesto de vigilancia: manipula el deflector central de flujo para desviar el malware a cuarentena, proteger la bóveda y escanear paquetes cifrados.`
          },
          station_dev: {
            scene: 'RoboticsMinigameScene',
            intro: `${station.dilemmaText}\n\n🤖 Bahía de ensamblaje: programa las secuencias algorítmicas del brazo articulado IK para encajar los componentes en el chasis del robot asistente.`
          },
          station_data: {
            scene: 'DataMinigameScene',
            intro: `${station.dilemmaText}\n\n🌱 Laboratorio de cultivos: modula los sensores ambientales (temperatura, humedad y luz) para calibrar las curvas de crecimiento de las especies vegetales.`
          },
          station_biz: {
            scene: 'BizMinigameScene',
            intro: `${station.dilemmaText}\n\n📋 Tablero de prioridades: organiza las actividades semanales en las dos franjas horarias equilibrando la satisfacción de familias, investigadores y jóvenes.`
          }
        };

        const mgConfig = minigameMap[station.id];

        // Función para procesar la resolución y preguntas de cierre
        const proceedToResolution = (minigameMetrics?: any) => {
          const optionsTexts = station.resolutionOptions.map((o: any) => o.text);
          dialogScene.showDecisionDialog(
            `Estrategia Final para ${station.name}`,
            `Has analizado la situación y calibrado el sistema. ¿Cuál consideras que es la mejor estrategia para sellar esta solución de forma permanente?`,
            optionsTexts,
            (selectedIndex: number) => {
              dialogScene.showEmotionQuestion((rating: number) => {
                const finalMetrics = minigameMetrics;

                this.gameState.completeStation(station.id, selectedIndex, rating, finalMetrics);
                if (this.sound && this.cache.audio.exists('sfx_station_complete')) {
                  this.sound.play('sfx_station_complete', { volume: 0.6 });
                }

                npc.indicator.setTexture('check_bubble');
                this.endInteraction();
                uiScene.updateStationStatus(station.id, true);
                uiScene.updateHUD();
                uiScene.showCompletionToast(station.name);

                // Si terminó las 5 estaciones, abrir informe final
                if (this.gameState.isGameComplete()) {
                  this.time.delayedCall(3000, () => {
                    this.scene.stop('UIScene');
                    this.scene.start('ReportScene');
                  });
                }
              });
            }
          );
        };

        // Si la estación tiene un minijuego y aún no tiene métricas
        if (mgConfig && !station.minigameMetrics) {
          const actionPrompt = station.id === 'station_biz' ? 'el tablero interactivo de mediación' : 'el simulador físico de la estación';
          dialogScene.showSimpleDialog(
            `${station.leaderNpcName} - ${station.leaderTitle}`,
            `${mgConfig.intro}\n\n⚙️ Presiona 'Entendido' para abrir ${actionPrompt}.`,
            () => {
              if (this.sound && this.cache.audio.exists('sfx_whoosh')) {
                this.sound.play('sfx_whoosh', { volume: 0.45 });
              }
              uiScene.setRadarVisible(false);
              this.scene.pause('SpaceShipScene');
              this.scene.launch(mgConfig.scene, {
                onComplete: (metrics: any) => {
                  if (this.sound && this.cache.audio.exists('sfx_whoosh')) {
                    this.sound.play('sfx_whoosh', { volume: 0.4 });
                  }
                  this.scene.resume('SpaceShipScene');
                  proceedToResolution(metrics);
                },
                onCancel: () => {
                  if (this.sound && this.cache.audio.exists('sfx_whoosh')) {
                    this.sound.play('sfx_whoosh', { volume: 0.4 });
                  }
                  this.scene.resume('SpaceShipScene');
                  this.endInteraction();
                  uiScene.updateHUD(`Desafío en pausa. Vuelve con ${station.leaderNpcName} cuando desees continuar.`);
                }
              });
            }
          );
        } else {
          // Estación de gestión o ya completó el minijuego
          proceedToResolution(station.minigameMetrics);
        }
      }
    }
  }
}
