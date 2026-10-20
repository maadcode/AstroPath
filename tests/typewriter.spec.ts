import { test, expect } from '@playwright/test';

test.describe('TAREA 4: Efecto typewriter en diálogos', () => {
  test('El texto aparece carácter por carácter, permite saltar con Espacio/clic y muestra botones solo al terminar', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(2000);

    const testResult = await page.evaluate(async () => {
      const game = (window as any).__PHASER_GAME__;
      const dialogScene = game.scene.getScene('DialogScene') as any;

      const longMessage = 'Esta es una transmisión de prueba interestelar con un texto suficientemente largo para verificar el efecto máquina de escribir letra por letra.';

      // --- TEST 1: Progresión letra por letra en showSimpleDialog ---
      let simpleClosed = false;
      dialogScene.showSimpleDialog('Transmisión de Prueba', longMessage, () => {
        simpleClosed = true;
      });

      // Inmediatamente tras abrir, el texto visual en pantalla debe estar vacío o con muy pocos caracteres (< longMessage.length)
      const initialDisplayedText = dialogScene.getDisplayedText();
      const isInitiallyTyping = dialogScene.isTypewriterActive();

      // Esperamos 120ms (unos 3-4 caracteres a 40ms/char)
      await new Promise(r => setTimeout(r, 120));
      const partialDisplayedText = dialogScene.getDisplayedText();

      // --- TEST 2: Saltar con Espacio ---
      // Simulamos presionar Espacio mientras escribe
      dialogScene.spaceKey.isDown = true;
      (dialogScene.spaceKey as any)._justDown = true;
      dialogScene.update();
      dialogScene.spaceKey.isDown = false;
      (dialogScene.spaceKey as any)._justDown = false;

      const textAfterSpaceSkip = dialogScene.getDisplayedText();
      const isTypingAfterSpaceSkip = dialogScene.isTypewriterActive();
      const wasClosedBySkip = simpleClosed; // El salto NO debe cerrar el diálogo

      // Esperar que pase CLOSE_DEBOUNCE_MS para poder cerrar
      await new Promise(r => setTimeout(r, 300));

      // Segundo Espacio ahora sí debe cerrarlo
      dialogScene.spaceKey.isDown = true;
      (dialogScene.spaceKey as any)._justDown = true;
      dialogScene.update();
      dialogScene.spaceKey.isDown = false;
      (dialogScene.spaceKey as any)._justDown = false;

      const isClosedAfterSecondSpace = simpleClosed && !dialogScene.isDialogVisible();

      // --- TEST 3: showDecisionDialog y botones de decisión solo al terminar ---
      let selectedOptionIndex = -1;
      const options = ['Opción A - Exploración', 'Opción B - Blindaje', 'Opción C - Protocolo'];
      dialogScene.showDecisionDialog('Decisión Crítica', longMessage, options, (idx: number) => {
        selectedOptionIndex = idx;
      });

      const isDecisionTypingInitially = dialogScene.isTypewriterActive();
      // Los botones de decisión NO deben estar visibles mientras se escribe el texto
      const areButtonsVisibleInitially = dialogScene.optionButtons.length > 0 && dialogScene.optionButtons.every((btn: any) => btn.visible);

      // --- TEST 4: Saltar con clic ---
      // Emitir pointerdown en la escena para saltar
      dialogScene.input.emit('pointerdown');

      const textAfterClickSkip = dialogScene.getDisplayedText();
      const isDecisionTypingAfterClick = dialogScene.isTypewriterActive();
      // Ahora que el texto terminó de mostrarse, los botones DEBEN ser visibles
      const areButtonsVisibleAfterFinish = dialogScene.optionButtons.length === options.length && dialogScene.optionButtons.every((btn: any) => btn.visible);

      // Cerrar seleccionando una opción
      dialogScene.optionButtons[1].list[0].emit('pointerdown');
      const selectedIndexResult = selectedOptionIndex;
      const isDecisionDialogClosed = !dialogScene.isDialogVisible();

      return {
        initialDisplayedTextLength: initialDisplayedText.length,
        isInitiallyTyping,
        partialDisplayedTextLength: partialDisplayedText.length,
        textAfterSpaceSkipMatches: textAfterSpaceSkip === longMessage,
        isTypingAfterSpaceSkip,
        wasClosedBySkip,
        isClosedAfterSecondSpace,
        isDecisionTypingInitially,
        areButtonsVisibleInitially,
        textAfterClickSkipMatches: textAfterClickSkip === longMessage,
        isDecisionTypingAfterClick,
        areButtonsVisibleAfterFinish,
        selectedIndexResult,
        isDecisionDialogClosed
      };
    });

    // Criterio 1: El texto aparece progresivamente carácter por carácter
    expect(testResult.isInitiallyTyping).toBe(true);
    expect(testResult.initialDisplayedTextLength).toBeLessThan(10);
    expect(testResult.partialDisplayedTextLength).toBeGreaterThan(0);
    expect(testResult.partialDisplayedTextLength).toBeLessThan(20);

    // Criterio 2: Presionar Espacio o clic muestra el texto completo de inmediato
    expect(testResult.textAfterSpaceSkipMatches).toBe(true);
    expect(testResult.isTypingAfterSpaceSkip).toBe(false);
    expect(testResult.wasClosedBySkip).toBe(false); // Saltar no cierra
    expect(testResult.isClosedAfterSecondSpace).toBe(true); // Siguiente espacio sí cierra

    // Criterio 3: Los botones de decisión solo aparecen cuando el texto terminó de mostrarse
    expect(testResult.isDecisionTypingInitially).toBe(true);
    expect(testResult.areButtonsVisibleInitially).toBe(false);
    expect(testResult.textAfterClickSkipMatches).toBe(true);
    expect(testResult.isDecisionTypingAfterClick).toBe(false);
    expect(testResult.areButtonsVisibleAfterFinish).toBe(true);
    expect(testResult.selectedIndexResult).toBe(1);
    expect(testResult.isDecisionDialogClosed).toBe(true);
  });
});
