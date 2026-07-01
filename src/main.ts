import { Game } from './game/Game';
import { Renderer } from './renderer/Renderer';
import { InputManager } from './input/InputManager';
import { TouchHandler } from './input/TouchHandler';
import { loadConfig } from './config/config';

async function main(): Promise<void> {
  const config = await loadConfig();

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas element #game-canvas not found');

  const game = new Game(config);
  const renderer = new Renderer(canvas, config);
  const input = new InputManager(config);

  // Wire all game actions to input callbacks
  input.on('moveLeft', () => game.moveLeft());
  input.on('moveRight', () => game.moveRight());
  input.on('softDrop', () => game.softDrop());
  input.on('hardDrop', () => game.hardDrop());
  input.on('rotateCW', () => game.rotateCW());
  input.on('rotateCCW', () => game.rotateCCW());
  input.on('hold', () => game.hold());
  input.on('pause', () => game.togglePause());
  input.on('restart', () => game.restart());

  // Touch handler — always attached (handles idle→playing Start, playing controls, etc.)
  const touchHandler = new TouchHandler(canvas, () => game.state, input, config);
  touchHandler.attach();

  // Keyboard input — attached immediately (Game methods guard against non-playing states)
  input.attach();

  // Enter starts game from idle screen
  const handleIdleStart = (e: KeyboardEvent) => {
    if (e.code === 'Enter' && game.state === 'idle') {
      game.start();
      window.removeEventListener('keydown', handleIdleStart);
    }
  };
  window.addEventListener('keydown', handleIdleStart);

  // Enter restarts from game over
  const handleGameOverRestart = (e: KeyboardEvent) => {
    if (e.code === 'Enter' && game.state === 'gameOver') {
      game.restart();
    }
  };
  window.addEventListener('keydown', handleGameOverRestart);

  // Game loop
  let lastTime = performance.now();
  let prevState = game.state;

  // Trace UI
  const traceContainer = document.getElementById('trace-container') as HTMLElement;
  const traceOutput = document.getElementById('trace-output') as HTMLTextAreaElement;
  const traceCopy = document.getElementById('trace-copy') as HTMLButtonElement;

  traceCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(traceOutput.value);
    } catch {
      traceOutput.select();
      document.execCommand('copy');
    }
    traceCopy.textContent = 'COPIED';
    setTimeout(() => (traceCopy.textContent = 'COPY'), 1500);
  });

  function gameLoop(currentTime: number): void {
    const deltaTime = Math.min(currentTime - lastTime, 100); // cap to avoid spiral
    lastTime = currentTime;

    input.update(deltaTime);
    game.update(deltaTime);

    const traceText = game.state === 'gameOver' ? game.getTraceText() : undefined;

    renderer.render({
      board: game.board,
      currentPiece: game.currentPiece,
      ghostPosition: game.ghostPosition,
      state: game.state,
      scoreState: game.scoreState,
      holdInfo: game.holdInfo,
      nextQueue: game.nextQueue,
      traceText,
    });

    // Show/hide trace UI
    if (game.state === 'gameOver' && prevState !== 'gameOver') {
      traceOutput.value = game.getTraceText();
      traceContainer.style.display = 'block';
    } else if (game.state !== 'gameOver') {
      traceContainer.style.display = 'none';
    }
    prevState = game.state;

    requestAnimationFrame(gameLoop);
  }

  // Initial render (idle screen with "Press ENTER or Tap to start")
  renderer.render({
    board: game.board,
    currentPiece: game.currentPiece,
    ghostPosition: game.ghostPosition,
    state: game.state,
    scoreState: game.scoreState,
    holdInfo: game.holdInfo,
    nextQueue: game.nextQueue,
  });

  requestAnimationFrame(gameLoop);
}

main().catch(console.error);
