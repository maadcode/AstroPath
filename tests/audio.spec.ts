import { test, expect } from '@playwright/test';

test.describe('Efectos de sonido básicos y control de audio', () => {
  test('Carga de audios, reproducción de sfx y control de volumen/mute', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(2000);

    const testResult = await page.evaluate(async () => {
      const game = (window as any).__PHASER_GAME__;
      const spaceShip = game.scene.getScene('SpaceShipScene') as any;
      const dialogScene = game.scene.getScene('DialogScene') as any;
      const uiScene = game.scene.getScene('UIScene') as any;

      // 1. Verificar registro y existencia en cache de los 5 efectos de sonido
      const audioKeys = [
        'sfx_footsteps',
        'sfx_dialog_open',
        'sfx_option_select',
        'sfx_station_complete',
        'sfx_whoosh'
      ];
      const audioInCache = audioKeys.map(k => ({
        key: k,
        exists: game.cache.audio.exists(k)
      }));

      // 2. Control de mute y botón en UIScene (Bonus)
      const initialMuteState = game.sound.mute;
      uiScene.toggleMute();
      const muteAfterToggle = game.sound.mute;
      uiScene.toggleMute();
      const muteRestored = game.sound.mute;

      // 3. Simular pasos (caminar vs detenerse)
      // Al moverse con teclado, footstepsSound debe reproducirse
      spaceShip.cursors.right.isDown = true;
      spaceShip.update();
      const isFootstepsPlayingWhileWalking = spaceShip.footstepsSound ? spaceShip.footstepsSound.isPlaying : false;

      // Al detenerse, footstepsSound debe detenerse
      spaceShip.cursors.right.isDown = false;
      spaceShip.update();
      const isFootstepsPlayingWhenStopped = spaceShip.footstepsSound ? spaceShip.footstepsSound.isPlaying : false;

      // 4. Diálogo y opciones (dialog_open y option_select)
      let dialogClosed = false;
      let soundPlayedLog: string[] = [];
      const origPlay = game.sound.play.bind(game.sound);
      game.sound.play = (key: string, extra?: any) => {
        soundPlayedLog.push(key);
        return origPlay(key, extra);
      };

      // Abrir diálogo simple
      dialogScene.showSimpleDialog('Prueba Audio', 'Mensaje con audio', () => {
        dialogClosed = true;
      });
      const playedOnDialogOpen = soundPlayedLog.includes('sfx_dialog_open');

      // Seleccionar opción
      dialogScene.optionButtons[0].list[0].emit('pointerdown');
      const playedOnOptionSelect = soundPlayedLog.includes('sfx_option_select');

      const isWebAudioSupported = !!(game.sound && (game.sound as any).context);

      return {
        isWebAudioSupported,
        audioInCache,
        initialMuteState,
        muteAfterToggle,
        muteRestored,
        isFootstepsPlayingWhileWalking,
        isFootstepsPlayingWhenStopped,
        playedOnDialogOpen,
        playedOnOptionSelect,
        hasMuteButton: !!uiScene.muteBtnContainer
      };
    });

    // Validar control de mute y UI
    expect(testResult.initialMuteState).toBe(false);
    expect(testResult.muteAfterToggle).toBe(true);
    expect(testResult.muteRestored).toBe(false);
    expect(testResult.hasMuteButton).toBe(true);

    // Validar existencia de los 5 audios y reproducción en navegadores con WebAudio
    if (testResult.isWebAudioSupported) {
      testResult.audioInCache.forEach(a => {
        expect(a.exists).toBe(true);
      });
      // Validar loop de pasos metálicos suaves
      expect(testResult.isFootstepsPlayingWhileWalking).toBe(true);
      expect(testResult.isFootstepsPlayingWhenStopped).toBe(false);

      // Validar sonidos de diálogo
      expect(testResult.playedOnDialogOpen).toBe(true);
      expect(testResult.playedOnOptionSelect).toBe(true);
    }
  });
});
