import { test, expect } from '@playwright/test';

test('RoboticsMinigameScene reach, envelope, grabbing, installation and onCancel callback', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Wait for game to initialize
  await page.waitForFunction(() => !!(window as any).__PHASER_GAME__);

  const result = await page.evaluate(async () => {
    const game = (window as any).__PHASER_GAME__;
    let onCancelCalled = false;
    let onCompleteCalled = false;
    let finalMetrics: any = null;

    const runningScene = game.scene.getScenes(true)[0] || game.scene.scenes[0];
    const roboticsScene = game.scene.getScene('RoboticsMinigameScene') as any;

    runningScene.scene.launch('RoboticsMinigameScene', {
      onComplete: (metrics: any) => {
        onCompleteCalled = true;
        finalMetrics = metrics;
      },
      onCancel: () => {
        onCancelCalled = true;
      }
    });

    await new Promise(resolve => setTimeout(resolve, 400));

    // 1. Check workspace reach envelope: x from 180 to 800, y up to 450
    const envelopePoints = [
      { x: 180, y: 440 },
      { x: 202, y: 435 }, // Part 1
      { x: 272, y: 435 }, // Part 2
      { x: 342, y: 435 }, // Part 3
      { x: 512, y: 350 }, // Center
      { x: 687, y: 390 }, // Slot 1
      { x: 732, y: 390 }, // Slot 2
      { x: 777, y: 390 }, // Slot 3
      { x: 800, y: 440 }
    ];

    const envelopeReachable = envelopePoints.map(pt => {
      roboticsScene.targetClawX = pt.x;
      roboticsScene.targetClawY = pt.y;
      for (let i = 0; i < 20; i++) {
        roboticsScene.update(0, 50);
      }
      const ik = roboticsScene.solveIK(pt.x, pt.y);
      const dist = Math.hypot(ik.claw.x - pt.x, ik.claw.y - pt.y);
      return { pt, dist, reached: dist < 5 };
    });

    const allPointsReached = envelopeReachable.every(e => e.reached);

    // 2. Test click-to-hold picking up part 1
    const p1 = roboticsScene.parts.find((p: any) => p.id === 1);
    roboticsScene.targetClawX = p1.body.position.x;
    roboticsScene.targetClawY = p1.body.position.y - 10;
    for (let i = 0; i < 20; i++) roboticsScene.update(0, 50);

    // Click on hitZone
    p1.hitZone.emit('pointerdown', { x: p1.body.position.x, y: p1.body.position.y });
    const p1Grabbed = roboticsScene.heldPart?.id === 1 && roboticsScene.isClickLocked;

    // 3. Move with part and drop far from slot -> should release with gravity
    roboticsScene.targetClawX = 400;
    roboticsScene.targetClawY = 320;
    for (let i = 0; i < 20; i++) roboticsScene.update(0, 50);
    // Click in air to drop
    roboticsScene.releasePart();
    const p1DroppedInAir = roboticsScene.heldPart === null && !p1.installed;

    // 4. Install all 3 parts sequentially
    for (const part of roboticsScene.parts) {
      roboticsScene.targetClawX = part.body.position.x;
      roboticsScene.targetClawY = part.body.position.y - 10;
      for (let i = 0; i < 20; i++) roboticsScene.update(0, 50);

      roboticsScene.grabPart(part);
      roboticsScene.targetClawX = part.slotX;
      roboticsScene.targetClawY = part.slotY;
      for (let i = 0; i < 20; i++) roboticsScene.update(0, 50);

      roboticsScene.releasePart();
    }

    const allInstalled = roboticsScene.parts.every((p: any) => p.installed);

    // Wait for victory modal to show with polling
    let waited = 0;
    while (!roboticsScene.completedModal?.visible && waited < 3000) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waited += 100;
    }
    const modalVisible = roboticsScene.completedModal?.visible;

    // Close minigame with metrics to test completion callback
    roboticsScene.closeMinigame({ primaryScore: 95 } as any);

    // Now re-launch to test cancellation callback
    runningScene.scene.launch('RoboticsMinigameScene', {
      onCancel: () => {
        onCancelCalled = true;
      }
    });
    await new Promise(resolve => setTimeout(resolve, 300));
    const reloadedScene = game.scene.getScene('RoboticsMinigameScene') as any;
    reloadedScene.closeMinigame(); // without metrics (user clicked Cerrar)

    return {
      allPointsReached,
      p1Grabbed,
      p1DroppedInAir,
      allInstalled,
      modalVisible,
      onCompleteCalled,
      onCancelCalled
    };
  });

  expect(result.allPointsReached).toBe(true);
  expect(result.p1Grabbed).toBe(true);
  expect(result.p1DroppedInAir).toBe(true);
  expect(result.allInstalled).toBe(true);
  expect(result.modalVisible).toBe(true);
  expect(result.onCompleteCalled).toBe(true);
  expect(result.onCancelCalled).toBe(true);
});
