import { test, expect } from '@playwright/test';

test.describe('Rediseño de Minijuegos de Estaciones', () => {

  test('SecurityMinigameScene: deflector único central, escaneo de paquetes y emisión de métricas', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForFunction(() => !!(window as any).__PHASER_GAME__);

    const result = await page.evaluate(async () => {
      const game = (window as any).__PHASER_GAME__;
      let onCompleteCalled = false;
      let onCancelCalled = false;
      let receivedMetrics: any = null;

      const runningScene = game.scene.getScenes(true)[0] || game.scene.scenes[0];
      const secScene = game.scene.getScene('SecurityMinigameScene') as any;

      runningScene.scene.launch('SecurityMinigameScene', {
        onComplete: (m: any) => {
          onCompleteCalled = true;
          receivedMetrics = m;
        },
        onCancel: () => {
          onCancelCalled = true;
        }
      });

      await new Promise(r => setTimeout(r, 400));

      const isSecActive = game.scene.isActive('SecurityMinigameScene');

      // 1. Verificar inclinación del deflector
      secScene.tiltDeflector(-0.55);
      const angleLeft = secScene.targetDeflectorAngle;

      secScene.tiltDeflector(0.55);
      const angleRight = secScene.targetDeflectorAngle;

      secScene.tiltDeflector(0);
      const angleCenter = secScene.targetDeflectorAngle;

      // 2. Simular escaneo y triggerVictory
      secScene.triggerVictory();
      await new Promise(r => setTimeout(r, 200));

      const modalVisible = secScene.completedModal?.visible;

      // 3. Completar con métricas
      secScene.closeMinigame(receivedMetrics || {
        primaryScore: 90,
        secondaryBranch: 'net',
        secondaryScore: 85,
        details: { 'Integridad del Blindaje': '100%' },
        feedbackSummary: 'Test ok'
      });

      return {
        isSecActive,
        angleLeft,
        angleRight,
        angleCenter,
        modalVisible,
        onCompleteCalled
      };
    });

    expect(result.isSecActive).toBe(true);
    expect(result.angleLeft).toBe(-0.55);
    expect(result.angleRight).toBe(0.55);
    expect(result.angleCenter).toBe(0);
    expect(result.modalVisible).toBe(true);
    expect(result.onCompleteCalled).toBe(true);
  });

  test('DataMinigameScene: Analizador de curvas, modulación de sensores y avance de 3 ciclos', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForFunction(() => !!(window as any).__PHASER_GAME__);

    const result = await page.evaluate(async () => {
      const game = (window as any).__PHASER_GAME__;
      let onCompleteCalled = false;
      let receivedMetrics: any = null;

      const runningScene = game.scene.getScenes(true)[0] || game.scene.scenes[0];
      const dataScene = game.scene.getScene('DataMinigameScene') as any;

      runningScene.scene.launch('DataMinigameScene', {
        onComplete: (m: any) => {
          onCompleteCalled = true;
          receivedMetrics = m;
        }
      });

      await new Promise(r => setTimeout(r, 400));
      const isDataActive = game.scene.isActive('DataMinigameScene');

      // Ciclo 1: Algassus Primus (target: T=32, H=60, L=50)
      dataScene.paramT = 32;
      dataScene.paramH = 60;
      dataScene.paramL = 50;
      dataScene.onParameterChanged();
      dataScene.handleConfirmCycle();

      const cycleAfterFirst = dataScene.currentCycleIndex; // Debería ser 1

      // Ciclo 2: Fungus Lumina (target: T=22, H=80, L=25)
      dataScene.paramT = 22;
      dataScene.paramH = 80;
      dataScene.paramL = 25;
      dataScene.onParameterChanged();
      dataScene.handleConfirmCycle();

      const cycleAfterSecond = dataScene.currentCycleIndex; // Debería ser 2

      // Ciclo 3: Solanaceae Orbitalis (target: T=38, H=50, L=75)
      dataScene.paramT = 38;
      dataScene.paramH = 50;
      dataScene.paramL = 75;
      dataScene.onParameterChanged();
      dataScene.handleConfirmCycle();

      await new Promise(r => setTimeout(r, 300));
      const modalVisible = dataScene.completedModal?.visible;

      // Finalizar minijuego
      dataScene.closeMinigame({
        primaryScore: 92,
        secondaryBranch: 'dev',
        secondaryScore: 88,
        details: { 'Precisión Promedio': '92%' },
        feedbackSummary: 'Curvas calibradas'
      });

      return {
        isDataActive,
        cycleAfterFirst,
        cycleAfterSecond,
        modalVisible,
        onCompleteCalled
      };
    });

    expect(result.isDataActive).toBe(true);
    expect(result.cycleAfterFirst).toBe(1);
    expect(result.cycleAfterSecond).toBe(2);
    expect(result.modalVisible).toBe(true);
    expect(result.onCompleteCalled).toBe(true);
  });

  test('NetworkMinigameScene: Ruteo de red, detección de congestión y simulación de flujo', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForFunction(() => !!(window as any).__PHASER_GAME__);

    const result = await page.evaluate(async () => {
      const game = (window as any).__PHASER_GAME__;
      let onCompleteCalled = false;

      const runningScene = game.scene.getScenes(true)[0] || game.scene.scenes[0];
      const netScene = game.scene.getScene('NetworkMinigameScene') as any;

      runningScene.scene.launch('NetworkMinigameScene', {
        onComplete: () => {
          onCompleteCalled = true;
        }
      });

      await new Promise(r => setTimeout(r, 400));
      const isNetActive = game.scene.isActive('NetworkMinigameScene');

      // 1. Rutar canal Alfa por fila 0: nodos (col 0, row 0), (col 1, row 0), (col 2, row 0), (col 3, row 0)
      netScene.selectStream(0);
      const n0_0 = netScene.nodes.find((n: any) => n.col === 0 && n.row === 0);
      const n1_0 = netScene.nodes.find((n: any) => n.col === 1 && n.row === 0);
      const n2_0 = netScene.nodes.find((n: any) => n.col === 2 && n.row === 0);
      const n3_0 = netScene.nodes.find((n: any) => n.col === 3 && n.row === 0);

      netScene.handleNodeClicked(n0_0);
      netScene.handleNodeClicked(n1_0);
      netScene.handleNodeClicked(n2_0);
      netScene.handleNodeClicked(n3_0);
      netScene.handleReceiverClicked(0);

      const alphaConnected = netScene.streams[0].connected;

      // 2. Intentar usar el nodo n1_0 para el canal Beta -> debe detectar congestión
      netScene.selectStream(1);
      const conflictsBefore = netScene.congestionConflictsHit;
      netScene.handleNodeClicked(n1_0);
      const conflictsAfter = netScene.congestionConflictsHit;
      const detectedConflict = conflictsAfter > conflictsBefore;

      // 3. Trigger Victory y Modal
      netScene.triggerVictory();
      await new Promise(r => setTimeout(r, 200));
      const modalVisible = netScene.completedModal?.visible;

      netScene.closeMinigame({
        primaryScore: 90,
        secondaryBranch: 'sec',
        secondaryScore: 85,
        details: { 'Latencia Total': '38 ms' },
        feedbackSummary: 'Rutas establecidas'
      });

      return {
        isNetActive,
        alphaConnected,
        detectedConflict,
        modalVisible,
        onCompleteCalled
      };
    });

    expect(result.isNetActive).toBe(true);
    expect(result.alphaConnected).toBe(true);
    expect(result.detectedConflict).toBe(true);
    expect(result.modalVisible).toBe(true);
    expect(result.onCompleteCalled).toBe(true);
  });

  test('RoboticsMinigameScene: Secuenciador de instrucciones y ejecución programada', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForFunction(() => !!(window as any).__PHASER_GAME__);

    const result = await page.evaluate(async () => {
      const game = (window as any).__PHASER_GAME__;
      const runningScene = game.scene.getScenes(true)[0] || game.scene.scenes[0];
      const roboticsScene = game.scene.getScene('RoboticsMinigameScene') as any;

      runningScene.scene.launch('RoboticsMinigameScene', {});
      await new Promise(r => setTimeout(r, 400));

      // Agregar instrucciones a la cinta
      roboticsScene.appendInstruction('TO_PART');
      roboticsScene.appendInstruction('LOWER');
      roboticsScene.appendInstruction('GRAB');
      roboticsScene.appendInstruction('RAISE');
      roboticsScene.appendInstruction('TO_SLOT');
      roboticsScene.appendInstruction('RELEASE');

      const seqLength = roboticsScene.programmedSequence.length;

      // Borrar la última
      roboticsScene.removeInstructionAt(seqLength - 1);
      const seqAfterRemove = roboticsScene.programmedSequence.length;

      // Limpiar cinta
      roboticsScene.clearProgrammedSequence();
      const seqAfterClear = roboticsScene.programmedSequence.length;

      roboticsScene.closeMinigame();

      return {
        seqLength,
        seqAfterRemove,
        seqAfterClear
      };
    });

    expect(result.seqLength).toBe(6);
    expect(result.seqAfterRemove).toBe(5);
    expect(result.seqAfterClear).toBe(0);
  });

});
