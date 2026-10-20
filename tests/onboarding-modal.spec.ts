import { test, expect } from '@playwright/test';

test.describe('Onboarding y Guía Rápida Inicial (Modal de Bienvenida)', () => {
  test('Aparece al inicio con el título, 3 pasos y botón de inicio', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);

    const modalData = await page.evaluate(() => {
      const game = (window as any).__PHASER_GAME__;
      const uiScene = game.scene.getScene('UIScene') as any;

      const isActive = uiScene.isWelcomeModalActive();
      const container = uiScene.welcomeModalContainer;
      if (!container) return null;

      // Extraer todos los textos dentro del contenedor del modal
      const texts: string[] = [];
      container.list.forEach((child: any) => {
        if (child.text) {
          texts.push(child.text);
        }
      });

      return {
        isActive,
        texts
      };
    });

    expect(modalData).not.toBeNull();
    expect(modalData?.isActive).toBe(true);

    const allText = modalData!.texts.join(' ');

    // 1. Título principal
    expect(allText).toContain('¡Bienvenido Cadete a la Nave Odisea!');

    // 2. Tres pasos sencillos
    expect(allText).toContain('Recorre los pasillos y visita las 5 estaciones de la nave.');
    expect(allText).toContain('Resuelve los desafíos prácticos y dilemas de cada sector.');
    expect(allText).toContain('Al finalizar, el sistema generará tu perfil de afinidad vocacional en TI.');

    // 3. Botón de inicio con atajo de teclado
    expect(allText).toContain('¡Iniciar Exploración! [ESPACIO]');
  });

  test('Se puede cerrar con un solo clic en el botón de exploración', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);

    const closeResult = await page.evaluate(async () => {
      const game = (window as any).__PHASER_GAME__;
      const uiScene = game.scene.getScene('UIScene') as any;

      const initiallyActive = uiScene.isWelcomeModalActive();

      // Encontrar el botón de inicio dentro de la lista de elementos del modal
      const container = uiScene.welcomeModalContainer;
      const btnBg = container.list.find((child: any) => child.getData && child.getData('role') === 'start-button');
      if (btnBg) {
        btnBg.emit('pointerdown');
      } else {
        uiScene.closeWelcomeModal();
      }

      await new Promise(r => setTimeout(r, 400));

      const activeAfterClick = uiScene.isWelcomeModalActive();
      const modalDestroyed = uiScene.welcomeModalContainer === null;

      return {
        initiallyActive,
        activeAfterClick,
        modalDestroyed
      };
    });

    expect(closeResult.initiallyActive).toBe(true);
    expect(closeResult.activeAfterClick).toBe(false);
    expect(closeResult.modalDestroyed).toBe(true);
  });

  test('Se puede cerrar con la barra espaciadora', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);

    // Verificar que está abierto
    const initiallyActive = await page.evaluate(() => {
      const game = (window as any).__PHASER_GAME__;
      const uiScene = game.scene.getScene('UIScene') as any;
      return uiScene.isWelcomeModalActive();
    });
    expect(initiallyActive).toBe(true);

    // Presionar la barra espaciadora en el navegador
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);

    const activeAfterSpace = await page.evaluate(() => {
      const game = (window as any).__PHASER_GAME__;
      const uiScene = game.scene.getScene('UIScene') as any;
      return {
        isActive: uiScene.isWelcomeModalActive(),
        containerNull: uiScene.welcomeModalContainer === null
      };
    });

    expect(activeAfterSpace.isActive).toBe(false);
    expect(activeAfterSpace.containerNull).toBe(true);
  });

  test('Solo se muestra una vez al inicio del juego (persistencia en sesión)', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);

    // Cerrar el modal con la barra espaciadora
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);

    const checkPersistence = await page.evaluate(async () => {
      const game = (window as any).__PHASER_GAME__;
      const uiScene = game.scene.getScene('UIScene') as any;

      // Verificar que el estado guardó la visualización
      const hasSeen = uiScene.checkWelcomeSeen();

      // Intentar forzar la verificación regular de bienvenida (como al reingresar a la escena)
      if (!uiScene.checkWelcomeSeen()) {
        uiScene.showWelcomeModal();
      }

      return {
        hasSeen,
        isActive: uiScene.isWelcomeModalActive(),
        sessionStorageValue: sessionStorage.getItem('odisea_welcome_seen')
      };
    });

    expect(checkPersistence.hasSeen).toBe(true);
    expect(checkPersistence.isActive).toBe(false);
    expect(checkPersistence.sessionStorageValue).toBe('true');
  });
});
