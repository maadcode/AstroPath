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

  constructor() {
    super('SpaceShipScene');
  }

  private endInteraction() {
    this.isInteracting = false;
    this.lastInteractionEndTime = this.time.now;
  }

  create() {
    // 1. Configurar límites de la nave espacial (Mundo de 2400 x 1800)
    const worldWidth = 2400;
    const worldHeight = 1800;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 2. Dibujar la nave estelar (Salas, Pasillos y Estaciones)
    this.buildShipEnvironment(worldWidth, worldHeight);

    // 3. Crear al Jugador
    this.player = this.physics.add.sprite(worldWidth / 2, worldHeight / 2, 'player_sprite');
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1.4);
    if (this.player.body) {
      this.player.body.setSize(22, 22);
      this.player.body.setOffset(5, 5);
    }

    // 4. Configurar Cámara con seguimiento suave
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(1.1);

    // 5. Instanciar NPCs Jefes y Pasajeros en las 5 Estaciones
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

  private buildShipEnvironment(worldWidth: number, worldHeight: number) {
    const floorTiles = this.add.tileSprite(worldWidth / 2, worldHeight / 2, worldWidth, worldHeight, 'ship_floor');
    floorTiles.setDepth(-10);

    // Pasillo Central de Tránsito
    const hallway = this.add.rectangle(worldWidth / 2, worldHeight / 2, worldWidth * 0.85, 120, 0x111827, 0.5);
    hallway.setStrokeStyle(2, 0x38bdf8, 0.4);
    hallway.setDepth(-9);

    const verticalHallway = this.add.rectangle(worldWidth / 2, worldHeight / 2, 120, worldHeight * 0.85, 0x111827, 0.5);
    verticalHallway.setStrokeStyle(2, 0x38bdf8, 0.4);
    verticalHallway.setDepth(-9);

    // Muros perimetrales
    const wallThick = 32;
    const addWall = (x: number, y: number, w: number, h: number) => {
      const wall = this.add.tileSprite(x, y, w, h, 'ship_wall');
      this.physics.add.existing(wall, true);
    };

    addWall(worldWidth / 2, wallThick / 2, worldWidth, wallThick);
    addWall(worldWidth / 2, worldHeight - wallThick / 2, worldWidth, wallThick);
    addWall(wallThick / 2, worldHeight / 2, wallThick, worldHeight);
    addWall(worldWidth - wallThick / 2, worldHeight / 2, wallThick, worldHeight);

    // Crear las 5 Salas temáticas visibles
    const roomPositions = [
      { id: 'station_dev', x: 450, y: 380, name: 'TALLER DE CREACIÓN Y ROBÓTICA', color: 0x3b82f6 },
      { id: 'station_net', x: 1950, y: 380, name: 'SALA DE ENLACE Y SEÑALES', color: 0x10b981 },
      { id: 'station_sec', x: 450, y: 1420, name: 'ESTACIÓN DE VIGILANCIA Y BLINDAJE', color: 0xef4444 },
      { id: 'station_data', x: 1950, y: 1420, name: 'INVERNADERO Y SENSORES', color: 0x8b5cf6 },
      { id: 'station_biz', x: worldWidth / 2, y: worldHeight / 2 - 280, name: 'LOUNGE SOCIAL Y RECURSOS', color: 0xf59e0b }
    ];

    roomPositions.forEach(r => {
      // Piso delimitado de la sala
      const room = this.add.rectangle(r.x, r.y, 480, 360, 0x0f172a, 0.8);
      room.setStrokeStyle(3, r.color, 0.9);
      room.setDepth(-8);

      // Cartel luminoso de la sala
      this.add.text(r.x, r.y - 150, r.name, {
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#090d16',
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5).setDepth(-7);
    });

    // Puente Central de Control (Punto de inicio y final)
    const bridge = this.add.circle(worldWidth / 2, worldHeight / 2, 90, 0x1e293b, 0.7);
    bridge.setStrokeStyle(2, 0x38bdf8);
    bridge.setDepth(-8);
    this.add.text(worldWidth / 2, worldHeight / 2, 'PUENTE CENTRAL\nPunto de Inicio', {
      fontSize: '12px',
      color: '#38bdf8',
      align: 'center',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(-7);
  }

  private spawnStationNPCs() {
    const configs = [
      {
        stationId: 'station_dev',
        leaderX: 450, leaderY: 380,
        passengers: []
      },
      {
        stationId: 'station_net',
        leaderX: 1950, leaderY: 380,
        passengers: []
      },
      {
        stationId: 'station_sec',
        leaderX: 450, leaderY: 1420,
        passengers: []
      },
      {
        stationId: 'station_data',
        leaderX: 1950, leaderY: 1420,
        passengers: []
      },
      {
        stationId: 'station_biz',
        leaderX: 1200, leaderY: 620,
        passengers: [
          { pId: 'p_biz_1', x: 1090, y: 690 },
          { pId: 'p_biz_2', x: 1310, y: 690 }
        ]
      }
    ];

    configs.forEach(c => {
      const station = this.gameState.getStation(c.stationId);
      if (!station) return;

      // 1. NPC Jefe de la estación
      const leaderSprite = this.physics.add.sprite(c.leaderX, c.leaderY, 'npc_leader');
      leaderSprite.setScale(1.4);
      const ind = this.add.sprite(c.leaderX, c.leaderY - 32, 'quest_bubble').setScale(0.85);
      const name = this.add.text(c.leaderX, c.leaderY + 28, `${station.leaderNpcName}`, {
        fontSize: '11px',
        color: '#facc15',
        fontStyle: 'bold',
        backgroundColor: '#050711',
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
        pSprite.setScale(1.3);
        const pInd = this.add.sprite(pConf.x, pConf.y - 30, 'quest_bubble').setScale(0.75);
        const pName = this.add.text(pConf.x, pConf.y + 26, pData.name, {
          fontSize: '10px',
          color: '#cbd5e1',
          backgroundColor: '#050711',
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
      y: '-=6',
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
            intro: `${station.dilemmaText}\n\n📡 Consola de telecomunicaciones: rutea los cables elásticos entre terminales para restablecer el enlace con baja latencia.`
          },
          station_sec: {
            scene: 'SecurityMinigameScene',
            intro: `${station.dilemmaText}\n\n🛡️ Cámara de blindaje balístico: manipula las compuertas deflectoras para desviar el malware a cuarentena y proteger la bóveda.`
          },
          station_dev: {
            scene: 'RoboticsMinigameScene',
            intro: `${station.dilemmaText}\n\n🤖 Bahía de ensamblaje: utiliza el brazo articulado con la pinza magnética para encajar los componentes en el chasis del robot asistente.`
          },
          station_data: {
            scene: 'DataMinigameScene',
            intro: `${station.dilemmaText}\n\n🌱 Laboratorio de datos: equilibra la balanza analítica dosificando nutrientes para estabilizar los bio-sensores.`
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
