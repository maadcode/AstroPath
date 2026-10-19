import * as Phaser from 'phaser';
import { MinigameMetrics, VocationalScores } from '../../types/vocational';

interface NetworkNode {
  id: number;
  col: number;
  row: number;
  x: number;
  y: number;
  isEMI: boolean; // Interferencia electromagnética
  occupiedByStream: number | null; // 0: Alfa, 1: Beta, 2: Gamma, null: Libre
  graphicCircle: Phaser.GameObjects.Arc;
  glowCircle?: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
}

interface StreamData {
  id: number;
  name: string;
  code: string;
  color: number;
  colorHex: string;
  isCritical: boolean; // Flujo Gamma es crítico
  emitterPos: { x: number; y: number };
  receiverPos: { x: number; y: number };
  path: number[]; // Lista de IDs de nodos por los que pasa
  connected: boolean;
  latencyMs: number;
  packetsDropped: number;
}

export class NetworkMinigameScene extends Phaser.Scene {
  private panelWidth = 860;
  private panelHeight = 540;
  private panelX = 512;
  private panelY = 320;

  // Nodos y Red
  private nodes: NetworkNode[] = [];
  private streams: StreamData[] = [];
  private selectedStreamId = 0; // 0, 1 o 2

  // Simulación y Gráficos
  private linesGraphics!: Phaser.GameObjects.Graphics;
  private packetsGraphics!: Phaser.GameObjects.Graphics;
  private isSimulating = false;
  private simulationProgress = 0;
  private simulationTimer = 0;
  private packetOffset = 0;

  // Métricas de desempeño y Stealth Assessment
  private startTime = 0;
  private totalReroutes = 0;
  private congestionConflictsHit = 0;
  private streamsFirstOrder: number[] = [];
  private totalLatency = 0;
  private signalIntegrity = 100;

  // UI
  private statusText!: Phaser.GameObjects.Text;
  private latencyText!: Phaser.GameObjects.Text;
  private signalText!: Phaser.GameObjects.Text;
  private streamButtons: Phaser.GameObjects.Rectangle[] = [];
  private streamButtonTexts: Phaser.GameObjects.Text[] = [];
  private transmitBtn!: Phaser.GameObjects.Rectangle;
  private transmitBtnText!: Phaser.GameObjects.Text;
  private completedModal!: Phaser.GameObjects.Container;

  private onCompleteCallback?: (metrics: MinigameMetrics) => void;
  private onCancelCallback?: () => void;

  constructor() {
    super({
      key: 'NetworkMinigameScene'
    });
  }

  init(data: { onComplete?: (metrics: MinigameMetrics) => void; onCancel?: () => void }) {
    this.onCompleteCallback = data.onComplete;
    this.onCancelCallback = data.onCancel;
    this.nodes = [];
    this.streams = [];
    this.selectedStreamId = 0;
    this.isSimulating = false;
    this.simulationProgress = 0;
    this.simulationTimer = 0;
    this.packetOffset = 0;
    this.totalReroutes = 0;
    this.congestionConflictsHit = 0;
    this.streamsFirstOrder = [];
    this.totalLatency = 0;
    this.signalIntegrity = 100;
  }

  create() {
    this.startTime = Date.now();
    const { width, height } = this.scale;

    // 1. Overlay oscuro
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.88);
    overlay.setInteractive();

    // 2. Chasis de la estación de redes
    const frame = this.add.rectangle(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 0x0f172a, 0.96);
    frame.setStrokeStyle(3, 0x0284c7);

    // Cabecera
    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 25, '📡 TORRE DE ANTENAS // PANEL DE RUTEO TOPOLÓGICO DE RED', {
      fontSize: '17px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    });

    this.add.text(this.panelX - this.panelWidth / 2 + 30, this.panelY - this.panelHeight / 2 + 48, 'Traza rutas punto a punto desde los emisores a sus receptores haciendo clic en los nodos intermedios.\nEvita la congestión de canal (nodos compartidos) y las zonas con interferencia electromagnética [⚡].', {
      fontSize: '11.5px',
      color: '#94a3b8',
      fontFamily: 'sans-serif',
      lineSpacing: 3
    });

    // Botón Salir
    const cancelBtn = this.add.rectangle(this.panelX + this.panelWidth / 2 - 70, this.panelY - this.panelHeight / 2 + 30, 90, 30, 0x334155).setInteractive({ useHandCursor: true });
    cancelBtn.setStrokeStyle(1, 0x64748b);
    this.add.text(cancelBtn.x, cancelBtn.y, 'Cerrar', { fontSize: '12px', color: '#f1f5f9', fontStyle: 'bold' }).setOrigin(0.5);
    cancelBtn.on('pointerdown', () => this.closeMinigame());

    // 3. Gráficos de conexiones y paquetes
    this.linesGraphics = this.add.graphics();
    this.packetsGraphics = this.add.graphics();

    // 4. Configurar flujos de datos
    this.setupStreams();

    // 5. Configurar matriz de nodos (4 columnas x 4 filas)
    this.setupNetworkNodes();

    // 6. Controles de selección de canal y HUD
    this.setupHUDAndControls();

    // 7. Modal de finalización
    this.createCompletionModal();

    // Render inicial
    this.redrawNetwork();
  }

  private setupStreams() {
    this.streams = [
      {
        id: 0,
        name: 'Canal Alfa (Comunicaciones)',
        code: 'ALFA',
        color: 0x38bdf8,
        colorHex: '#38bdf8',
        isCritical: false,
        emitterPos: { x: this.panelX - 320, y: this.panelY - 80 },
        receiverPos: { x: this.panelX + 320, y: this.panelY - 80 },
        path: [],
        connected: false,
        latencyMs: 0,
        packetsDropped: 0
      },
      {
        id: 1,
        name: 'Canal Beta (Telemetría de Nave)',
        code: 'BETA',
        color: 0xc084fc,
        colorHex: '#c084fc',
        isCritical: false,
        emitterPos: { x: this.panelX - 320, y: this.panelY },
        receiverPos: { x: this.panelX + 320, y: this.panelY },
        path: [],
        connected: false,
        latencyMs: 0,
        packetsDropped: 0
      },
      {
        id: 2,
        name: 'Canal Gamma (Soporte Vital Crítico)',
        code: 'GAMMA',
        color: 0x34d399,
        colorHex: '#34d399',
        isCritical: true,
        emitterPos: { x: this.panelX - 320, y: this.panelY + 80 },
        receiverPos: { x: this.panelX + 320, y: this.panelY + 80 },
        path: [],
        connected: false,
        latencyMs: 0,
        packetsDropped: 0
      }
    ];

    // Dibujar emisores a la izquierda y receptores a la derecha
    this.streams.forEach(s => {
      // Emisor
      const eBox = this.add.rectangle(s.emitterPos.x, s.emitterPos.y, 88, 36, 0x1e293b).setInteractive({ useHandCursor: true });
      eBox.setStrokeStyle(2, s.color);
      this.add.text(s.emitterPos.x, s.emitterPos.y - 6, `TX ${s.code}`, { fontSize: '11px', color: s.colorHex, fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(s.emitterPos.x, s.emitterPos.y + 8, 'Emisor', { fontSize: '9px', color: '#94a3b8' }).setOrigin(0.5);
      eBox.on('pointerdown', () => this.selectStream(s.id));

      // Receptor
      const rBox = this.add.rectangle(s.receiverPos.x, s.receiverPos.y, 88, 36, 0x1e293b).setInteractive({ useHandCursor: true });
      rBox.setStrokeStyle(2, s.color);
      this.add.text(s.receiverPos.x, s.receiverPos.y - 6, `RX ${s.code}`, { fontSize: '11px', color: s.colorHex, fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(s.receiverPos.x, s.receiverPos.y + 8, 'Receptor', { fontSize: '9px', color: '#94a3b8' }).setOrigin(0.5);
      rBox.on('pointerdown', () => this.handleReceiverClicked(s.id));
    });
  }

  private setupNetworkNodes() {
    const cols = 4;
    const rows = 4;
    const startX = this.panelX - 180;
    const spacingX = 120;
    const startY = this.panelY - 105;
    const spacingY = 70;

    let id = 0;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const nx = startX + (c * spacingX);
        const ny = startY + (r * spacingY);

        // Nodos con EMI (Interferencia Electromagnética)
        const isEMI = (c === 1 && r === 1) || (c === 2 && r === 2);

        // Círculo del nodo
        const circle = this.add.circle(nx, ny, 14, isEMI ? 0x451a03 : 0x0f172a);
        circle.setStrokeStyle(2, isEMI ? 0xf59e0b : 0x475569);
        circle.setInteractive({ useHandCursor: true });

        let glowCircle: Phaser.GameObjects.Arc | undefined;
        if (isEMI) {
          glowCircle = this.add.circle(nx, ny, 18, 0xf59e0b, 0.2);
        }

        const labelText = isEMI ? '⚡' : `${String.fromCharCode(65 + c)}${r + 1}`;
        const label = this.add.text(nx, ny, labelText, {
          fontSize: isEMI ? '12px' : '9.5px',
          color: isEMI ? '#fbbf24' : '#cbd5e1',
          fontStyle: 'bold'
        }).setOrigin(0.5);

        const nodeObj: NetworkNode = {
          id,
          col: c,
          row: r,
          x: nx,
          y: ny,
          isEMI,
          occupiedByStream: null,
          graphicCircle: circle,
          glowCircle,
          label
        };

        circle.on('pointerdown', () => this.handleNodeClicked(nodeObj));

        this.nodes.push(nodeObj);
        id++;
      }
    }
  }

  private setupHUDAndControls() {
    const controlY = this.panelY + 165;

    // Selector de Canal Activo
    const streamTabs = ['Canal Alfa (Comms)', 'Canal Beta (Telemetría)', 'Canal Gamma (Crítico)'];
    const colors = ['#38bdf8', '#c084fc', '#34d399'];
    const colorNums = [0x0284c7, 0x7c3aed, 0x059669];

    streamTabs.forEach((name, idx) => {
      const btnX = this.panelX - 250 + (idx * 180);
      const btn = this.add.rectangle(btnX, controlY, 160, 32, idx === 0 ? colorNums[idx] : 0x1e293b).setInteractive({ useHandCursor: true });
      btn.setStrokeStyle(1.5, Phaser.Display.Color.HexStringToColor(colors[idx]).color);

      const txt = this.add.text(btnX, controlY, name, {
        fontSize: '10.5px',
        color: idx === 0 ? '#ffffff' : colors[idx],
        fontStyle: 'bold'
      }).setOrigin(0.5);

      btn.on('pointerdown', () => this.selectStream(idx));

      this.streamButtons.push(btn);
      this.streamButtonTexts.push(txt);
    });

    // Botón Deshacer Ruta del canal actual
    const clearBtn = this.add.rectangle(this.panelX + 270, controlY, 90, 32, 0x1e293b).setInteractive({ useHandCursor: true });
    clearBtn.setStrokeStyle(1, 0xef4444);
    this.add.text(clearBtn.x, clearBtn.y, '↺ Deshacer', { fontSize: '11px', color: '#fca5a5', fontStyle: 'bold' }).setOrigin(0.5);
    clearBtn.on('pointerdown', () => this.clearCurrentStreamPath());

    // Botón Iniciar Transmisión
    const transmitY = this.panelY + 215;
    this.transmitBtn = this.add.rectangle(this.panelX, transmitY, 260, 36, 0x0f172a).setInteractive({ useHandCursor: true });
    this.transmitBtn.setStrokeStyle(1.5, 0x475569);

    this.transmitBtnText = this.add.text(this.panelX, transmitY, 'Conecta los 3 Canales para Transmitir', {
      fontSize: '11.5px',
      color: '#94a3b8',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.transmitBtn.on('pointerdown', () => this.toggleSimulation());

    // HUD de métricas
    const hudY = this.panelY + this.panelHeight / 2 - 20;
    this.statusText = this.add.text(this.panelX - 350, hudY, 'Estado: Ruteando canal Alfa', { fontSize: '11.5px', color: '#e2e8f0' });
    this.latencyText = this.add.text(this.panelX, hudY, 'Latencia Estimada: -- ms', { fontSize: '11.5px', color: '#38bdf8', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.signalText = this.add.text(this.panelX + 350, hudY, 'Integridad de Enlace: 100%', { fontSize: '11.5px', color: '#4ade80', fontStyle: 'bold' }).setOrigin(1, 0);
  }

  private selectStream(id: number) {
    this.selectedStreamId = id;
    if (!this.streamsFirstOrder.includes(id)) {
      this.streamsFirstOrder.push(id);
    }

    const colors = ['#38bdf8', '#c084fc', '#34d399'];
    const colorNums = [0x0284c7, 0x7c3aed, 0x059669];

    this.streamButtons.forEach((btn, idx) => {
      if (idx === id) {
        btn.setFillStyle(colorNums[idx]);
        this.streamButtonTexts[idx].setColor('#ffffff');
      } else {
        btn.setFillStyle(0x1e293b);
        this.streamButtonTexts[idx].setColor(colors[idx]);
      }
    });

    const activeStream = this.streams[id];
    this.statusText.setText(`Estado: Ruteando ${activeStream.name}`);
    this.redrawNetwork();
  }

  private handleNodeClicked(node: NetworkNode) {
    if (this.isSimulating) return;

    const stream = this.streams[this.selectedStreamId];

    // Si ya estaba conectado al receptor, no permite añadir sin desarmar
    if (stream.connected) {
      this.showFeedbackMessage('Canal ya conectado. Pulsa "Deshacer" si deseas re-rutear.', '#facc15');
      return;
    }

    // Comprobar si el nodo está ocupado por OTRO canal (Congestión / Colisión de Búfer)
    if (node.occupiedByStream !== null && node.occupiedByStream !== stream.id) {
      this.congestionConflictsHit++;
      this.cameras.main.shake(100, 0.004);
      this.showFeedbackMessage('⚠️ ¡Congestión! Nodo ocupado por otro flujo de datos.', '#ef4444');
      return;
    }

    // Si hace clic en el último nodo de su ruta actual -> deseleccionar (backtrack)
    if (stream.path.length > 0 && stream.path[stream.path.length - 1] === node.id) {
      stream.path.pop();
      node.occupiedByStream = null;
      this.redrawNetwork();
      return;
    }

    // Regla de adyacencia
    if (stream.path.length === 0) {
      // El primer nodo debe estar en la columna 0 (frente a los emisores)
      if (node.col !== 0) {
        this.showFeedbackMessage('El primer nodo debe estar en la primera columna (frente al emisor)', '#facc15');
        return;
      }
    } else {
      const lastNodeId = stream.path[stream.path.length - 1];
      const lastNode = this.nodes[lastNodeId];

      const colDiff = node.col - lastNode.col;
      const rowDiff = Math.abs(node.row - lastNode.row);

      // Solo puede avanzar hacia la derecha o en la misma columna (+1 o 0 en col, máx 1 en fila)
      if (colDiff < 0 || colDiff > 1 || rowDiff > 1 || (colDiff === 0 && rowDiff === 0)) {
        this.showFeedbackMessage('Solo puedes conectar nodos adyacentes en avance hacia el receptor', '#facc15');
        return;
      }
    }

    // Añadir nodo a la ruta
    stream.path.push(node.id);
    node.occupiedByStream = stream.id;

    if (node.isEMI) {
      this.showFeedbackMessage('⚡ Advertencia: Nodo con alta interferencia electromagnética', '#f59e0b');
    }

    this.redrawNetwork();
  }

  private handleReceiverClicked(streamId: number) {
    if (this.isSimulating) return;

    if (streamId !== this.selectedStreamId) {
      this.selectStream(streamId);
      return;
    }

    const stream = this.streams[streamId];
    if (stream.connected) return;

    if (stream.path.length === 0) {
      this.showFeedbackMessage('Traza primero la ruta a través de los nodos', '#facc15');
      return;
    }

    const lastNodeId = stream.path[stream.path.length - 1];
    const lastNode = this.nodes[lastNodeId];

    // Debe terminar en la última columna (col 3)
    if (lastNode.col !== 3) {
      this.showFeedbackMessage('La ruta debe llegar a la última columna para conectar el receptor', '#facc15');
      return;
    }

    // ¡Conectado con éxito!
    stream.connected = true;
    this.createFlashEffect(stream.receiverPos.x, stream.receiverPos.y, stream.color);
    this.showFeedbackMessage(`✓ ¡${stream.name} enlazado con éxito!`, '#4ade80');

    this.checkAllStreamsConnected();
    this.redrawNetwork();
  }

  private clearCurrentStreamPath() {
    if (this.isSimulating) return;

    const stream = this.streams[this.selectedStreamId];
    if (stream.path.length === 0 && !stream.connected) return;

    this.totalReroutes++;
    stream.path.forEach(nodeId => {
      this.nodes[nodeId].occupiedByStream = null;
    });
    stream.path = [];
    stream.connected = false;

    this.checkAllStreamsConnected();
    this.redrawNetwork();
    this.showFeedbackMessage(`Ruta de ${stream.code} liberada`, '#94a3b8');
  }

  private checkAllStreamsConnected() {
    const allConnected = this.streams.every(s => s.connected);

    if (allConnected) {
      this.transmitBtn.setFillStyle(0x15803d);
      this.transmitBtn.setStrokeStyle(1.5, 0x22c55e);
      this.transmitBtnText.setText('▶ Iniciar Transmisión de Paquetes');
      this.transmitBtnText.setColor('#ffffff');
    } else {
      const pendingCount = this.streams.filter(s => !s.connected).length;
      this.transmitBtn.setFillStyle(0x0f172a);
      this.transmitBtn.setStrokeStyle(1.5, 0x475569);
      this.transmitBtnText.setText(`Conecta los 3 Canales (${pendingCount} pendiente)`);
      this.transmitBtnText.setColor('#94a3b8');
    }
  }

  private toggleSimulation() {
    const allConnected = this.streams.every(s => s.connected);
    if (!allConnected) {
      this.cameras.main.shake(100, 0.004);
      this.showFeedbackMessage('Debes completar las rutas de los 3 canales primero', '#facc15');
      return;
    }

    this.isSimulating = true;
    this.simulationProgress = 0;
    this.simulationTimer = 0;
    this.transmitBtn.setFillStyle(0x047857);
    this.transmitBtnText.setText('⚡ Transmitiendo... Sincronizando búfers');
  }

  private showFeedbackMessage(msg: string, color: string) {
    this.statusText.setText(`Estado: ${msg}`);
    this.statusText.setColor(color);
  }

  private redrawNetwork() {
    this.linesGraphics.clear();

    // 1. Dibujar malla base de posibles conexiones tenues
    this.linesGraphics.lineStyle(1, 0x1e293b, 0.4);
    for (const n of this.nodes) {
      // Conectar con vecinos adyacentes a la derecha y diagonales
      const neighbors = this.nodes.filter(nb =>
        (nb.col === n.col + 1 && Math.abs(nb.row - n.row) <= 1)
      );
      for (const nb of neighbors) {
        this.linesGraphics.lineBetween(n.x, n.y, nb.x, nb.y);
      }
    }

    // 2. Dibujar rutas activas de cada stream
    let totalLatency = 0;
    let emiPenaltyCount = 0;

    this.streams.forEach(stream => {
      if (stream.path.length === 0) return;

      const isCurrent = stream.id === this.selectedStreamId;
      const alpha = isCurrent ? 1 : 0.8;
      const lineWidth = isCurrent ? 3.5 : 2.5;

      this.linesGraphics.lineStyle(lineWidth, stream.color, alpha);

      // Conexión desde el Emisor al primer nodo
      const firstNode = this.nodes[stream.path[0]];
      this.linesGraphics.lineBetween(stream.emitterPos.x + 44, stream.emitterPos.y, firstNode.x, firstNode.y);

      // Trayecto entre nodos
      for (let i = 0; i < stream.path.length - 1; i++) {
        const nA = this.nodes[stream.path[i]];
        const nB = this.nodes[stream.path[i + 1]];
        this.linesGraphics.lineBetween(nA.x, nA.y, nB.x, nB.y);
      }

      // Si está conectado, enlace al receptor
      if (stream.connected) {
        const lastNode = this.nodes[stream.path[stream.path.length - 1]];
        this.linesGraphics.lineBetween(lastNode.x, lastNode.y, stream.receiverPos.x - 44, stream.receiverPos.y);
      }

      // Cálculo de latencia del stream (8ms por salto + 15ms si pasa por EMI)
      let streamLatency = (stream.path.length + 1) * 8;
      stream.path.forEach(nId => {
        if (this.nodes[nId].isEMI) {
          streamLatency += 15;
          emiPenaltyCount++;
        }
      });
      stream.latencyMs = streamLatency;
      totalLatency += streamLatency;
    });

    this.totalLatency = totalLatency;
    this.signalIntegrity = Math.max(50, 100 - (emiPenaltyCount * 12));

    if (totalLatency > 0) {
      this.latencyText.setText(`Latencia Total: ${totalLatency} ms`);
      this.latencyText.setColor(totalLatency < 85 ? '#4ade80' : (totalLatency < 120 ? '#facc15' : '#f87171'));
      this.signalText.setText(`Integridad de Enlace: ${this.signalIntegrity}%`);
      this.signalText.setColor(this.signalIntegrity >= 85 ? '#4ade80' : '#facc15');
    }

    // 3. Actualizar aspecto visual de los nodos
    this.nodes.forEach(node => {
      if (node.occupiedByStream !== null) {
        const occStream = this.streams[node.occupiedByStream];
        node.graphicCircle.setFillStyle(occStream.color, 0.9);
        node.graphicCircle.setStrokeStyle(2, 0xffffff);
        node.label.setColor('#ffffff');
      } else {
        node.graphicCircle.setFillStyle(node.isEMI ? 0x451a03 : 0x0f172a);
        node.graphicCircle.setStrokeStyle(2, node.isEMI ? 0xf59e0b : 0x475569);
        node.label.setColor(node.isEMI ? '#fbbf24' : '#cbd5e1');
      }
    });
  }

  update(_time: number, delta: number) {
    if (!this.isSimulating) return;

    this.simulationTimer += delta;
    this.packetOffset = (this.simulationTimer / 45) % 100;
    this.simulationProgress = Math.min(1, this.simulationTimer / 2800); // 2.8s para completar simulación

    this.drawSimulatedPackets();

    if (this.simulationProgress >= 1) {
      this.isSimulating = false;
      this.triggerVictory();
    }
  }

  private drawSimulatedPackets() {
    this.packetsGraphics.clear();

    this.streams.forEach(stream => {
      if (!stream.connected || stream.path.length === 0) return;

      // Generar puntos continuos del camino
      const pts: { x: number; y: number }[] = [];
      pts.push({ x: stream.emitterPos.x + 44, y: stream.emitterPos.y });
      stream.path.forEach(nId => {
        pts.push({ x: this.nodes[nId].x, y: this.nodes[nId].y });
      });
      pts.push({ x: stream.receiverPos.x - 44, y: stream.receiverPos.y });

      // Dibujar 3 paquetes viajeros en este canal
      for (let p = 0; p < 3; p++) {
        const offset = ((this.packetOffset + (p * 33.3)) % 100) / 100;
        const totalSegments = pts.length - 1;
        const virtualIndex = offset * totalSegments;
        const segIndex = Math.min(totalSegments - 1, Math.floor(virtualIndex));
        const segRatio = virtualIndex - segIndex;

        const pA = pts[segIndex];
        const pB = pts[segIndex + 1];

        const px = Phaser.Math.Linear(pA.x, pB.x, segRatio);
        const py = Phaser.Math.Linear(pA.y, pB.y, segRatio);

        this.packetsGraphics.fillStyle(stream.color, 1);
        this.packetsGraphics.fillCircle(px, py, 6);
        this.packetsGraphics.fillStyle(0xffffff, 0.9);
        this.packetsGraphics.fillCircle(px, py, 3);
      }
    });
  }

  private createFlashEffect(x: number, y: number, color: number) {
    const f = this.add.circle(x, y, 20, color, 0.85);
    this.tweens.add({
      targets: f,
      scale: 2.4,
      alpha: 0,
      duration: 350,
      onComplete: () => f.destroy()
    });
  }

  private triggerVictory() {
    const elapsedSeconds = Math.round((Date.now() - this.startTime) / 1000);

    // Puntuación primaria de Redes [50 a 100]
    // Menor latencia y mayor integridad dan mejor puntuación
    const latencyFactor = Math.max(0, 100 - (this.totalLatency * 0.45));
    const primaryNetScore = Math.max(50, Math.min(100, Math.round(
      (this.signalIntegrity * 0.6) + (latencyFactor * 0.4) - (this.congestionConflictsHit * 4)
    )));

    // Puntuación secundaria continua para 'sec' (aislamiento e integridad de flujo)
    const secondarySecScore = Math.max(55, Math.min(100, Math.round(
      (this.signalIntegrity * 0.8) + (Math.max(0, 20 - (this.totalReroutes * 3)))
    )));

    // Stealth Assessment (Landers 2024 / Shute 2011)
    const behavioralBonuses: Partial<VocationalScores> = {};

    // 1. Priorización del canal crítico Gamma primero
    if (this.streamsFirstOrder.length > 0 && this.streamsFirstOrder[0] === 2) {
      behavioralBonuses.biz = 0.6; // Sentido estratégico de prioridades de emergencia
    }

    // 2. Ruteo limpio sin interferencias ni congestiones
    if (this.signalIntegrity >= 95 && this.congestionConflictsHit === 0) {
      behavioralBonuses.net = 0.8; // Topología óptima sin colisiones
    }

    // 3. Eficiencia en planificación (pocos re-ruteos)
    if (this.totalReroutes <= 2) {
      behavioralBonuses.sec = 0.5; // Precisión y arquitectura segura
    }

    const metrics: MinigameMetrics = {
      primaryScore: primaryNetScore,
      secondaryBranch: 'sec',
      secondaryScore: secondarySecScore,
      behavioralBonuses,
      details: {
        'Latencia Total': `${this.totalLatency} ms`,
        'Integridad de Red': `${this.signalIntegrity}%`,
        'Canales Operativos': `${this.streams.length} / ${this.streams.length}`,
        'Conflictos Evitados': `${this.congestionConflictsHit === 0 ? 'Sin Colisiones' : `${this.congestionConflictsHit} resueltos`}`,
        'Re-ruteos': `${this.totalReroutes}`,
        'Tiempo de Configuración': `${elapsedSeconds} seg`
      },
      feedbackSummary: `Topología de red restablecida con éxito. Lograste una latencia consolidada de ${this.totalLatency}ms y un ${this.signalIntegrity}% de integridad de señal sin congestión de paquetes.`
    };

    this.showCompletionModal(metrics);
  }

  private createCompletionModal() {
    this.completedModal = this.add.container(this.panelX, this.panelY);
    this.completedModal.setVisible(false);
    this.completedModal.setDepth(100);

    const mBg = this.add.rectangle(0, 0, 520, 320, 0x090d16, 0.98);
    mBg.setStrokeStyle(2, 0x0284c7);

    const title = this.add.text(0, -115, '📡 ¡ENLACE TRONCAL RESTABLECIDO!', {
      fontSize: '17px',
      color: '#38bdf8',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    const details = this.add.text(0, -35, '', {
      fontSize: '13px',
      color: '#e2e8f0',
      align: 'center',
      fontFamily: 'sans-serif',
      lineSpacing: 8
    }).setOrigin(0.5);
    details.setName('detailsText');

    const scoreBadge = this.add.text(0, 50, '', {
      fontSize: '20px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);
    scoreBadge.setName('scoreBadge');

    const finishBtn = this.add.rectangle(0, 110, 260, 42, 0x0284c7).setInteractive({ useHandCursor: true });
    finishBtn.setStrokeStyle(1, 0x38bdf8);
    const finishTxt = this.add.text(0, 110, 'Guardar y Continuar', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.completedModal.add([mBg, title, details, scoreBadge, finishBtn, finishTxt]);
  }

  private showCompletionModal(metrics: MinigameMetrics) {
    this.completedModal.setVisible(true);

    const detailsText = this.completedModal.getByName('detailsText') as Phaser.GameObjects.Text;
    const scoreBadge = this.completedModal.getByName('scoreBadge') as Phaser.GameObjects.Text;

    detailsText.setText(
      `Latencia Consolidada: ${metrics.details['Latencia Total']} | Integridad: ${metrics.details['Integridad de Red']}\n` +
      `Canales Ruteados: ${metrics.details['Canales Operativos']} | Conflictos: ${metrics.details['Conflictos Evitados']}\n\n` +
      `${metrics.feedbackSummary}`
    );

    scoreBadge.setText(`Puntuación de Afinidad Técnica: ${metrics.primaryScore} / 100`);

    const finishBtn = this.completedModal.list[4] as Phaser.GameObjects.Rectangle;
    finishBtn.removeAllListeners('pointerdown');
    finishBtn.on('pointerdown', () => {
      this.closeMinigame(metrics);
    });
  }

  public closeMinigame(metrics?: MinigameMetrics) {
    if (metrics && this.onCompleteCallback) {
      this.onCompleteCallback(metrics);
    } else if (!metrics && this.onCancelCallback) {
      this.onCancelCallback();
    }
    this.scene.stop('NetworkMinigameScene');
    this.scene.resume('SpaceShipScene');
  }
}
