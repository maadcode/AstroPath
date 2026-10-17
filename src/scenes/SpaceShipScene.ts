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
  private gameState = GameState.getInstance();
  private nearbyNpc: InteractiveNPC | null = null;
  private isInteracting = false;
  private lastInteractionEndTime = 0;
  private readonly INTERACTION_COOLDOWN_MS = 350;

  private map!: Phaser.Tilemaps.Tilemap;
  private wallsLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
  private readonly TILE_SCALE = 4;

  constructor() {
    super('SpaceShipScene');
  }

  private endInteraction() {
    this.isInteracting = false;
    this.lastInteractionEndTime = this.time.now;
  }

  create() {
    // 1. Cargar el Tilemap y configurar el tamaño del mundo
    this.buildShipEnvironment();

    const worldWidth = this.map.widthInPixels * this.TILE_SCALE;
    const worldHeight = this.map.heightInPixels * this.TILE_SCALE;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 2. Crear al Jugador en el pasillo central del mapa (tile 33, 9)
    const startX = 1072;
    const startY = 304;
    this.player = this.physics.add.sprite(startX, startY, 'player_sprite');
    this.player.setCollideWorldBounds(true);
    this.player.setScale(0.95);
    if (this.player.body) {
      this.player.body.setSize(16, 16);
      this.player.body.setOffset(8, 12);
    }

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

    // 6. Controles por teclado
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

    // 8. Asegurar liberación de controles al reanudar la escena
    this.events.on('resume', () => {
      const dialogScene = this.scene.get('DialogScene') as DialogScene;
      if (!dialogScene || !dialogScene.isDialogVisible()) {
        this.endInteraction();
      }
    });
  }

  update() {
    this.handlePlayerMovement();
    this.checkNPCProximity();
    this.handleInteractionInput();
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
      { x: 880, y: 55, name: 'BAHÍA DE ENSAMBLAJE', color: '#38bdf8' },
      { x: 1232, y: 55, name: 'TORRE DE ANTENAS', color: '#34d399' },
      { x: 880, y: 245, name: 'PUESTO DE VIGILANCIA', color: '#f87171' },
      { x: 880, y: 410, name: 'LABORATORIO DE CULTIVOS', color: '#c084fc' },
      { x: 1232, y: 505, name: 'SALA COMÚN', color: '#fbbf24' },
      { x: 1072, y: 245, name: 'PASILLO CENTRAL', color: '#94a3b8' }
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
        leaderX: 880, leaderY: 112, // Sala superior izquierda (Taller)
        passengers: []
      },
      {
        stationId: 'station_net',
        leaderX: 1232, leaderY: 144, // Sala superior derecha (Redes)
        passengers: []
      },
      {
        stationId: 'station_sec',
        leaderX: 880, leaderY: 304, // Sala media izquierda (Seguridad)
        passengers: []
      },
      {
        stationId: 'station_data',
        leaderX: 880, leaderY: 464, // Sala inferior izquierda (Datos)
        passengers: []
      },
      {
        stationId: 'station_biz',
        leaderX: 1232, leaderY: 592, // Sala inferior derecha (Lounge)
        passengers: [
          { pId: 'p_biz_1', x: 1168, y: 624 },
          { pId: 'p_biz_2', x: 1264, y: 624 }
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

  private handlePlayerMovement() {
    if (this.isInteracting) {
      this.player.setVelocity(0, 0);
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

    // Normalizar vector para evitar velocidad diagonal extra
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    this.player.setVelocity(vx * speed, vy * speed);
  }

  private checkNPCProximity() {
    const interactRadius = 60;
    let foundNearby: InteractiveNPC | null = null;

    for (const npc of this.npcs) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        npc.sprite.x, npc.sprite.y
      );

      if (dist <= interactRadius) {
        foundNearby = npc;
        break;
      }
    }

    this.nearbyNpc = foundNearby;
  }

  private handleInteractionInput() {
    if (this.isInteracting || !this.nearbyNpc) return;

    if (this.time.now - this.lastInteractionEndTime < this.INTERACTION_COOLDOWN_MS) {
      return;
    }

    const uiScene = this.scene.get('UIScene') as UIScene;
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
    const dialogScene = this.scene.get('DialogScene') as DialogScene;
    const uiScene = this.scene.get('UIScene') as UIScene;
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
            intro: `${station.dilemmaText}\n\n📡 Torre de antenas: rutea los cables elásticos entre terminales para restablecer el enlace con baja latencia.`
          },
          station_sec: {
            scene: 'SecurityMinigameScene',
            intro: `${station.dilemmaText}\n\n🛡️ Puesto de vigilancia: manipula las compuertas deflectoras para desviar el malware a cuarentena y proteger la bóveda.`
          },
          station_dev: {
            scene: 'RoboticsMinigameScene',
            intro: `${station.dilemmaText}\n\n🤖 Bahía de ensamblaje: utiliza el brazo articulado con la pinza magnética para encajar los componentes en el chasis del robot asistente.`
          },
          station_data: {
            scene: 'DataMinigameScene',
            intro: `${station.dilemmaText}\n\n🌱 Laboratorio de cultivos: equilibra la balanza analítica dosificando nutrientes para estabilizar los bio-sensores.`
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
                let finalMetrics = minigameMetrics;
                // Si es la estación de gestión (negocios), registrar sus métricas de mediación
                if (station.id === 'station_biz' && !finalMetrics) {
                  finalMetrics = {
                    primaryScore: 92,
                    secondaryBranch: 'data',
                    secondaryScore: 85,
                    details: {
                      'Consenso de Pasajeros': '94%',
                      'Escucha Activa': '100%',
                      'Optimización de Horarios': '92%'
                    },
                    feedbackSummary: 'Sobresaliente capacidad de negociación y escucha para crear armonía entre grupos con intereses opuestos.'
                  };
                }

                this.gameState.completeStation(station.id, selectedIndex, rating, finalMetrics);
                npc.indicator.setTexture('check_bubble');
                this.endInteraction();
                uiScene.updateHUD();

                // Si terminó las 5 estaciones, abrir informe final
                if (this.gameState.isGameComplete()) {
                  this.time.delayedCall(1000, () => {
                    this.scene.stop('UIScene');
                    this.scene.start('ReportScene');
                  });
                }
              });
            }
          );
        };

        // Si la estación tiene un minijuego de física Matter y aún no tiene métricas
        if (mgConfig && !station.minigameMetrics) {
          dialogScene.showSimpleDialog(
            `${station.leaderNpcName} - ${station.leaderTitle}`,
            `${mgConfig.intro}\n\n⚙️ Presiona 'Entendido' para abrir el simulador físico de la estación.`,
            () => {
              this.scene.pause('SpaceShipScene');
              this.scene.launch(mgConfig.scene, {
                onComplete: (metrics: any) => {
                  this.scene.resume('SpaceShipScene');
                  proceedToResolution(metrics);
                },
                onCancel: () => {
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
