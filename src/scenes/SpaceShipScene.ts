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

  constructor() {
    super('SpaceShipScene');
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
        passengers: [
          { pId: 'p_dev_1', x: 340, y: 460 },
          { pId: 'p_dev_2', x: 560, y: 460 }
        ]
      },
      {
        stationId: 'station_net',
        leaderX: 1950, leaderY: 380,
        passengers: [
          { pId: 'p_net_1', x: 1840, y: 460 },
          { pId: 'p_net_2', x: 2060, y: 460 }
        ]
      },
      {
        stationId: 'station_sec',
        leaderX: 450, leaderY: 1420,
        passengers: [
          { pId: 'p_sec_1', x: 340, y: 1500 },
          { pId: 'p_sec_2', x: 560, y: 1500 }
        ]
      },
      {
        stationId: 'station_data',
        leaderX: 1950, leaderY: 1420,
        passengers: [
          { pId: 'p_data_1', x: 1840, y: 1500 },
          { pId: 'p_data_2', x: 2060, y: 1500 }
        ]
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

    const uiScene = this.scene.get('UIScene') as UIScene;
    const isMobileAction = uiScene ? uiScene.isActionButtonPressed : false;

    const isPressed = Phaser.Input.Keyboard.JustDown(this.interactKey) ||
                      Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
                      isMobileAction;

    if (isPressed) {
      this.triggerInteraction(this.nearbyNpc);
    }
  }

  private triggerInteraction(npc: InteractiveNPC) {
    this.isInteracting = true;
    const dialogScene = this.scene.get('DialogScene') as DialogScene;
    const uiScene = this.scene.get('UIScene') as UIScene;
    const station = this.gameState.getStation(npc.stationId);

    if (!station) {
      this.isInteracting = false;
      return;
    }

    // Si la estación ya fue resuelta
    if (station.completed) {
      dialogScene.showSimpleDialog(
        `${station.name} (Completada)`,
        `¡Todo marcha sobre ruedas por aquí! Gracias por tu valiosa ayuda.`,
        () => { this.isInteracting = false; }
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
            this.isInteracting = false;
            uiScene.updateHUD(`Hablaste con ${passenger.name}. Reúne más testimonios o vuelve con el encargado.`);
          }
        );
      }
      return;
    }

    // Caso 2: NPC Jefe de la estación
    if (npc.isLeader) {
      // Iniciar temporizador de la estación si no estaba activo
      this.gameState.startStationTimer(station.id);

      // Comprobar si ya escuchó a los pasajeros
      const allWitnesses = this.gameState.allPassengersVisited(station.id);

      if (!allWitnesses) {
        // Explicación inicial del dilema
        dialogScene.showSimpleDialog(
          `${station.leaderNpcName} - ${station.leaderTitle}`,
          `${station.dilemmaText}\n\n👉 Misión: Acércate a los tripulantes cercanos con iconos amarillos para escuchar sus experiencias antes de proponer una solución.`,
          () => {
            this.isInteracting = false;
            uiScene.updateHUD(`Misión activa: Escucha a los tripulantes en ${station.name}`);
          }
        );
      } else {
        // Ya escuchó el feedback: Momento de tomar la decisión
        const optionsTexts = station.resolutionOptions.map((o: any) => o.text);
        dialogScene.showDecisionDialog(
          `Propuesta para ${station.name}`,
          `Has escuchado las necesidades de la tripulación. ¿Cuál consideras que es la mejor manera de resolver este problema?`,
          optionsTexts,
          (selectedIndex: number) => {
            // Pregunta de cómo se sintió (emoción)
            dialogScene.showEmotionQuestion((rating: number) => {
              this.gameState.completeStation(station.id, selectedIndex, rating);
              npc.indicator.setTexture('check_bubble');
              this.isInteracting = false;
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
      }
    }
  }
}
