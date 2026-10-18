import { test, expect } from '@playwright/test';

test.describe('Player Walk and Idle Animation', () => {
  test('Procedural animations exist and play correctly on keyboard and joystick input', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(2000);

    const checkAnimations = await page.evaluate(async () => {
      const game = (window as any).__PHASER_GAME__;
      const spaceShip = game.scene.getScene('SpaceShipScene') as any;
      const anims = game.anims;

      // 1. Verify animations exist globally
      const walkDownExists = anims.exists('player_walk_down');
      const walkUpExists = anims.exists('player_walk_up');
      const walkLeftExists = anims.exists('player_walk_left');
      const walkRightExists = anims.exists('player_walk_right');
      const idleDownExists = anims.exists('player_idle_down');
      const idleUpExists = anims.exists('player_idle_up');

      // Initial state: idle down
      const initialAnim = spaceShip.player.anims.currentAnim?.key;

      // 2. Test movement DOWN with keyboard
      spaceShip.cursors.down.isDown = true;
      spaceShip.handlePlayerMovement();
      const movingDownAnim = spaceShip.player.anims.currentAnim?.key;
      const movingDownIsPlaying = spaceShip.player.anims.isPlaying;
      spaceShip.cursors.down.isDown = false;
      spaceShip.handlePlayerMovement();
      const stoppedDownAnim = spaceShip.player.anims.currentAnim?.key;

      // 3. Test movement UP with keyboard
      spaceShip.cursors.up.isDown = true;
      spaceShip.handlePlayerMovement();
      const movingUpAnim = spaceShip.player.anims.currentAnim?.key;
      spaceShip.cursors.up.isDown = false;
      spaceShip.handlePlayerMovement();
      const stoppedUpAnim = spaceShip.player.anims.currentAnim?.key;

      // 4. Test movement LEFT with keyboard (WASD A key)
      spaceShip.wasdKeys.A.isDown = true;
      spaceShip.handlePlayerMovement();
      const movingLeftAnim = spaceShip.player.anims.currentAnim?.key;
      spaceShip.wasdKeys.A.isDown = false;
      spaceShip.handlePlayerMovement();
      const stoppedLeftAnim = spaceShip.player.anims.currentAnim?.key;

      // 5. Test movement RIGHT with keyboard (WASD D key)
      spaceShip.wasdKeys.D.isDown = true;
      spaceShip.handlePlayerMovement();
      const movingRightAnim = spaceShip.player.anims.currentAnim?.key;
      spaceShip.wasdKeys.D.isDown = false;
      spaceShip.handlePlayerMovement();
      const stoppedRightAnim = spaceShip.player.anims.currentAnim?.key;

      // 6. Test Virtual Joystick input
      const uiScene = game.scene.getScene('UIScene') as any;
      // Simulate joystick push right
      uiScene.virtualJoystick = { x: 1, y: 0 };
      spaceShip.handlePlayerMovement();
      const joystickWalkRight = spaceShip.player.anims.currentAnim?.key;

      // Release joystick
      uiScene.virtualJoystick = { x: 0, y: 0 };
      spaceShip.handlePlayerMovement();
      const joystickStoppedRight = spaceShip.player.anims.currentAnim?.key;

      // Simulate joystick push up
      uiScene.virtualJoystick = { x: 0, y: -0.8 };
      spaceShip.handlePlayerMovement();
      const joystickWalkUp = spaceShip.player.anims.currentAnim?.key;

      // Release joystick
      uiScene.virtualJoystick = { x: 0, y: 0 };
      spaceShip.handlePlayerMovement();
      const joystickStoppedUp = spaceShip.player.anims.currentAnim?.key;

      return {
        walkDownExists,
        walkUpExists,
        walkLeftExists,
        walkRightExists,
        idleDownExists,
        idleUpExists,
        initialAnim,
        movingDownAnim,
        movingDownIsPlaying,
        stoppedDownAnim,
        movingUpAnim,
        stoppedUpAnim,
        movingLeftAnim,
        stoppedLeftAnim,
        movingRightAnim,
        stoppedRightAnim,
        joystickWalkRight,
        joystickStoppedRight,
        joystickWalkUp,
        joystickStoppedUp
      };
    });

    expect(checkAnimations.walkDownExists).toBe(true);
    expect(checkAnimations.walkUpExists).toBe(true);
    expect(checkAnimations.walkLeftExists).toBe(true);
    expect(checkAnimations.walkRightExists).toBe(true);
    expect(checkAnimations.idleDownExists).toBe(true);
    expect(checkAnimations.idleUpExists).toBe(true);

    expect(checkAnimations.initialAnim).toBe('player_idle_down');

    expect(checkAnimations.movingDownAnim).toBe('player_walk_down');
    expect(checkAnimations.movingDownIsPlaying).toBe(true);
    expect(checkAnimations.stoppedDownAnim).toBe('player_idle_down');

    expect(checkAnimations.movingUpAnim).toBe('player_walk_up');
    expect(checkAnimations.stoppedUpAnim).toBe('player_idle_up');

    expect(checkAnimations.movingLeftAnim).toBe('player_walk_left');
    expect(checkAnimations.stoppedLeftAnim).toBe('player_idle_left');

    expect(checkAnimations.movingRightAnim).toBe('player_walk_right');
    expect(checkAnimations.stoppedRightAnim).toBe('player_idle_right');

    expect(checkAnimations.joystickWalkRight).toBe('player_walk_right');
    expect(checkAnimations.joystickStoppedRight).toBe('player_idle_right');

    expect(checkAnimations.joystickWalkUp).toBe('player_walk_up');
    expect(checkAnimations.joystickStoppedUp).toBe('player_idle_up');
  });
});
