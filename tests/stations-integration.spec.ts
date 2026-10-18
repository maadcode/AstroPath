import { test, expect } from '@playwright/test';

test('Exiting station challenge without completing restores player controls and allows re-entering', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
    const game = (window as any).__PHASER_GAME__;
    const spaceShip = game.scene.getScene('SpaceShipScene') as any;

    // 1. Teleport player to station_dev leader Mika at (880, 112)
    spaceShip.player.setPosition(880, 135);
    spaceShip.checkNPCProximity();

    // Verify nearby NPC is Mika
    const nearbyStation = spaceShip.nearbyNpc?.stationId;

    // 2. Open interaction with leader (should go directly to minigame prompt, no witnesses needed!)
    spaceShip.triggerInteraction(spaceShip.nearbyNpc);
    const dialogScene = game.scene.getScene('DialogScene') as any;

    const dialogTitle = dialogScene.titleText?.text;
    const isDialogVisible = dialogScene.isDialogVisible();

    // 3. Confirm dialog to launch RoboticsMinigameScene
    // Click Entendido button
    const entendidoBtn = dialogScene.optionButtons[0]?.list[0];
    if (entendidoBtn) {
      entendidoBtn.emit('pointerdown');
    }

    await new Promise(r => setTimeout(r, 500));

    // Robotics minigame is now active and SpaceShipScene is paused
    const roboticsActive = game.scene.isActive('RoboticsMinigameScene');
    const spaceShipPaused = spaceShip.scene.isPaused();

    // 4. Click 'Cerrar' in the minigame without completing
    const roboticsScene = game.scene.getScene('RoboticsMinigameScene') as any;
    roboticsScene.closeMinigame(); // cancel / exit

    await new Promise(r => setTimeout(r, 500));

    const roboticsActiveAfterCancel = game.scene.isActive('RoboticsMinigameScene');
    const spaceShipPausedAfterCancel = spaceShip.scene.isPaused();
    const isInteractingAfterCancel = spaceShip.isInteracting;

    // 5. Test player movement after cancel
    // Simulate pressing ArrowUp
    spaceShip.cursors.up.isDown = true;
    spaceShip.handlePlayerMovement();
    const velocityYAfterCancel = spaceShip.player.body.velocity.y;
    spaceShip.cursors.up.isDown = false;
    spaceShip.player.setVelocity(0, 0);

    // 6. Test re-entering: wait past interaction cooldown (350ms)
    await new Promise(r => setTimeout(r, 450));
    spaceShip.checkNPCProximity();
    spaceShip.triggerInteraction(spaceShip.nearbyNpc);
    const dialogReopened = dialogScene.isDialogVisible();

    return {
      nearbyStation,
      dialogTitle,
      isDialogVisible,
      roboticsActive,
      spaceShipPaused,
      roboticsActiveAfterCancel,
      spaceShipPausedAfterCancel,
      isInteractingAfterCancel,
      velocityYAfterCancel,
      dialogReopened
    };
  });

  expect(result.nearbyStation).toBe('station_dev');
  expect(result.isDialogVisible).toBe(true);
  expect(result.dialogTitle).toContain('Mika');
  expect(result.roboticsActive).toBe(true);
  expect(result.spaceShipPaused).toBe(true);
  expect(result.roboticsActiveAfterCancel).toBe(false);
  expect(result.spaceShipPausedAfterCancel).toBe(false);
  expect(result.isInteractingAfterCancel).toBe(false);
  expect(result.velocityYAfterCancel).toBeLessThan(0); // Player can move freely!
  expect(result.dialogReopened).toBe(true); // Player can re-enter challenge!
});

test('Only station_biz requires witness feedback before challenge', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
    const game = (window as any).__PHASER_GAME__;
    const spaceShip = game.scene.getScene('SpaceShipScene') as any;
    const dialogScene = game.scene.getScene('DialogScene') as any;

    // Test station_net (technical): should offer minigame directly
    spaceShip.player.setPosition(1232, 165);
    spaceShip.checkNPCProximity();
    spaceShip.triggerInteraction(spaceShip.nearbyNpc);
    const netDialogMsg = dialogScene.messageText?.text;
    dialogScene.close();
    spaceShip.endInteraction();

    // Test station_biz (social/management): should ask to listen to witnesses first!
    spaceShip.player.setPosition(1232, 615);
    spaceShip.checkNPCProximity();
    spaceShip.triggerInteraction(spaceShip.nearbyNpc);
    const bizDialogMsg = dialogScene.messageText?.text;
    dialogScene.close();
    spaceShip.endInteraction();

    return {
      netDialogMsg,
      bizDialogMsg
    };
  });

  // Technical station invites to simulator/dynamic directly
  expect(result.netDialogMsg).toContain('simulador físico');
  // Business/management station asks to listen to crew first
  expect(result.bizDialogMsg).toContain('Misión de Mediación');
});

test('Only station manager exists in technical stations, while station_biz has 3 NPCs', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);

  const counts = await page.evaluate(() => {
    const game = (window as any).__PHASER_GAME__;
    const spaceShip = game.scene.getScene('SpaceShipScene') as any;

    const npcsByStation: Record<string, number> = {};
    for (const npc of spaceShip.npcs) {
      npcsByStation[npc.stationId] = (npcsByStation[npc.stationId] || 0) + 1;
    }
    return npcsByStation;
  });

  expect(counts['station_dev']).toBe(1);
  expect(counts['station_net']).toBe(1);
  expect(counts['station_sec']).toBe(1);
  expect(counts['station_data']).toBe(1);
  expect(counts['station_biz']).toBe(3);
});
