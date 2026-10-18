import { test, expect } from '@playwright/test';

test.describe('Biz Minigame (Sala Común - Dra. Valeria)', () => {
  test('Requires witnesses, launches BizMinigameScene, calculates dynamic metrics and completes station', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(2000);

    const testResult = await page.evaluate(async () => {
      const game = (window as any).__PHASER_GAME__;
      const spaceShip = game.scene.getScene('SpaceShipScene') as any;
      const dialogScene = game.scene.getScene('DialogScene') as any;
      const gameState = spaceShip.gameState;

      // 1. Initial State: Dra. Valeria at (1232, 592)
      spaceShip.player.setPosition(1232, 615);
      spaceShip.checkNPCProximity();
      spaceShip.triggerInteraction(spaceShip.nearbyNpc);

      const firstDialogTitle = dialogScene.titleText?.text;
      const firstDialogMsg = dialogScene.messageText?.text;
      const initialWitnessesVisited = gameState.allPassengersVisited('station_biz');

      // Close initial dialog
      const firstEntendido = dialogScene.optionButtons[0]?.list[0];
      if (firstEntendido) firstEntendido.emit('pointerdown');
      await new Promise(r => setTimeout(r, 400));

      // 2. Visit Witness 1: Lucía at (1168, 624)
      spaceShip.player.setPosition(1168, 640);
      spaceShip.checkNPCProximity();
      spaceShip.triggerInteraction(spaceShip.nearbyNpc);
      const luciaDialogMsg = dialogScene.messageText?.text;
      const luciaEntendido = dialogScene.optionButtons[0]?.list[0];
      if (luciaEntendido) luciaEntendido.emit('pointerdown');
      await new Promise(r => setTimeout(r, 400));

      // 3. Visit Witness 2: Braulio at (1264, 624)
      spaceShip.player.setPosition(1264, 640);
      spaceShip.checkNPCProximity();
      spaceShip.triggerInteraction(spaceShip.nearbyNpc);
      const braulioDialogMsg = dialogScene.messageText?.text;
      const braulioEntendido = dialogScene.optionButtons[0]?.list[0];
      if (braulioEntendido) braulioEntendido.emit('pointerdown');
      await new Promise(r => setTimeout(r, 400));

      const afterWitnessesVisited = gameState.allPassengersVisited('station_biz');
      console.log('luciaDialogMsg:', luciaDialogMsg, 'braulioDialogMsg:', braulioDialogMsg, 'afterWitnessesVisited:', afterWitnessesVisited);

      // 4. Return to Dra. Valeria at (1232, 592) -> Now should invite to BizMinigameScene!
      spaceShip.player.setPosition(1232, 615);
      spaceShip.checkNPCProximity();
      spaceShip.triggerInteraction(spaceShip.nearbyNpc);
      const readyDialogMsg = dialogScene.messageText?.text;

      // Click 'Entendido' to launch minigame
      const launchBtn = dialogScene.optionButtons[0]?.list[0];
      console.log('readyDialogMsg:', readyDialogMsg, 'hasLaunchBtn:', !!launchBtn);
      if (launchBtn) launchBtn.emit('pointerdown');
      await new Promise(r => setTimeout(r, 600));

      const isBizActive = game.scene.isActive('BizMinigameScene');
      const isSpaceShipPaused = spaceShip.scene.isPaused();
      const bizScene = game.scene.getScene('BizMinigameScene') as any;

      // Initial scores should be baseline 40
      const initialFam = bizScene.famScore;
      const initialInv = bizScene.invScore;
      const initialJuv = bizScene.juvScore;

      // Attempt to approve without filling slots -> should stay in minigame
      bizScene.handleApproveClick();
      const stillActiveAfterPrematureApprove = game.scene.isActive('BizMinigameScene');

      // Assign a balanced weekly schedule:
      // Mon: Tarde: estudio, Noche: silencio
      // Tue: Tarde: gym, Noche: meditacion
      // Wed: Tarde: juegos, Noche: silencio
      // Thu: Tarde: cine, Noche: estudio
      // Fri: Tarde: juegos, Noche: musica
      // Sat: Tarde: cine, Noche: fiesta
      // Sun: Tarde: meditacion, Noche: silencio
      const schedulePlan = [
        { day: 0, time: 0, act: 'estudio' },
        { day: 0, time: 1, act: 'silencio' },
        { day: 1, time: 0, act: 'gym' },
        { day: 1, time: 1, act: 'meditacion' },
        { day: 2, time: 0, act: 'juegos' },
        { day: 2, time: 1, act: 'silencio' },
        { day: 3, time: 0, act: 'cine' },
        { day: 3, time: 1, act: 'estudio' },
        { day: 4, time: 0, act: 'juegos' },
        { day: 4, time: 1, act: 'musica' },
        { day: 5, time: 0, act: 'cine' },
        { day: 5, time: 1, act: 'fiesta' },
        { day: 6, time: 0, act: 'meditacion' },
        { day: 6, time: 1, act: 'silencio' }
      ];

      for (const item of schedulePlan) {
        const slot = bizScene.slots.find((s: any) => s.dayIndex === item.day && s.timeSlotIndex === item.time);
        const act = bizScene.activities.find((a: any) => a.id === item.act);
        if (slot && act) {
          bizScene.assignSlot(slot, act);
        }
      }

      // Check balanced scores
      const balancedFam = bizScene.famScore;
      const balancedInv = bizScene.invScore;
      const balancedJuv = bizScene.juvScore;

      // Click Approve
      bizScene.handleApproveClick();
      await new Promise(r => setTimeout(r, 400));

      const modalVisible = bizScene.completedModal.visible;

      // Click Confirm in modal to return to SpaceShipScene with metrics
      const confirmBtn = bizScene.completedModal.list[4];
      confirmBtn.emit('pointerdown');
      await new Promise(r => setTimeout(r, 600));

      const bizActiveAfterFinish = game.scene.isActive('BizMinigameScene');
      const spaceShipPausedAfterFinish = spaceShip.scene.isPaused();

      // Decision dialog should now be visible in SpaceShipScene
      const decisionVisible = dialogScene.isDialogVisible();
      const decisionTitle = dialogScene.titleText?.text;

      // Choose option 0
      const option0Btn = dialogScene.optionButtons[0]?.list[0];
      if (option0Btn) option0Btn.emit('pointerdown');
      await new Promise(r => setTimeout(r, 400));

      // Emotion rating dialog (rating 5)
      const emotionBtn5 = dialogScene.optionButtons[4]?.list[0];
      if (emotionBtn5) emotionBtn5.emit('pointerdown');
      await new Promise(r => setTimeout(r, 400));

      // Station completed verification
      const station = gameState.getStation('station_biz');
      const isCompleted = station.completed;
      const recordedMetrics = station.minigameMetrics;
      const bizScore = gameState.totalScores.biz;
      const dataScore = gameState.totalScores.data;

      return {
        firstDialogTitle,
        firstDialogMsg,
        initialWitnessesVisited,
        luciaDialogMsg,
        braulioDialogMsg,
        afterWitnessesVisited,
        readyDialogMsg,
        isBizActive,
        isSpaceShipPaused,
        initialFam,
        initialInv,
        initialJuv,
        stillActiveAfterPrematureApprove,
        balancedFam,
        balancedInv,
        balancedJuv,
        modalVisible,
        bizActiveAfterFinish,
        spaceShipPausedAfterFinish,
        decisionVisible,
        decisionTitle,
        isCompleted,
        recordedMetrics,
        bizScore,
        dataScore
      };
    });

    // 1. Initial interaction: Dra. Valeria asks for witnesses
    expect(testResult.firstDialogTitle).toContain('Dra. Valeria');
    expect(testResult.firstDialogMsg).toContain('Misión de Mediación');
    expect(testResult.initialWitnessesVisited).toBe(false);

    // 2 & 3. Witness dialogues
    expect(testResult.luciaDialogMsg).toContain('niños');
    expect(testResult.braulioDialogMsg).toContain('cálculos');
    expect(testResult.afterWitnessesVisited).toBe(true);

    // 4. Return to Dra. Valeria: launches challenge
    expect(testResult.readyDialogMsg).toContain('Tablero de prioridades');
    expect(testResult.readyDialogMsg).toContain('tablero interactivo');
    expect(testResult.isBizActive).toBe(true);
    expect(testResult.isSpaceShipPaused).toBe(true);

    // 5. Minigame mechanics & satisfaction
    expect(testResult.initialFam).toBe(40);
    expect(testResult.initialInv).toBe(40);
    expect(testResult.stillActiveAfterPrematureApprove).toBe(true);

    // Balanced schedule achieves >= 50% for ALL groups
    expect(testResult.balancedFam).toBeGreaterThanOrEqual(50);
    expect(testResult.balancedInv).toBeGreaterThanOrEqual(50);
    expect(testResult.balancedJuv).toBeGreaterThanOrEqual(50);
    expect(testResult.modalVisible).toBe(true);

    // 6. Finishing minigame and completing station
    expect(testResult.bizActiveAfterFinish).toBe(false);
    expect(testResult.spaceShipPausedAfterFinish).toBe(false);
    expect(testResult.decisionVisible).toBe(true);
    expect(testResult.decisionTitle).toContain('Sala Común');

    // 7. Dynamic metrics in GameState
    expect(testResult.isCompleted).toBe(true);
    expect(testResult.recordedMetrics).toBeDefined();
    expect(testResult.recordedMetrics.secondaryBranch).toBe('data');
    expect(testResult.recordedMetrics.primaryScore).toBeGreaterThanOrEqual(60);
    expect(testResult.recordedMetrics.secondaryScore).toBeGreaterThanOrEqual(55);
    expect(testResult.recordedMetrics.details['Satisfacción Familias']).toBeDefined();
    expect(testResult.recordedMetrics.details['Satisfacción Investigadores']).toBeDefined();
    expect(testResult.recordedMetrics.details['Satisfacción Jóvenes']).toBeDefined();

    // Vocational scores added to GameState
    expect(testResult.bizScore).toBeGreaterThan(0);
    expect(testResult.dataScore).toBeGreaterThan(0);
  });
});
