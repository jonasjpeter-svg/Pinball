/**
 * Main 3D Game Loop, Input Controller (Left Ctrl & Right Arrow), and Score HUD Sync
 */
document.addEventListener('DOMContentLoaded', () => {
  const threeCanvas = document.getElementById('three-canvas');
  const dmdCanvas = document.getElementById('dmd-canvas');

  const audio = new window.PinballAudio();
  const physics = new window.PinballPhysics(560, 960);
  const game = new window.IndyGameState(audio, physics);
  const renderer = new window.Pinball3DRenderer(threeCanvas, dmdCanvas, physics, game);

  physics.onEvent = (type, data) => game.handlePhysicsEvent(type, data);

  // DOM Elements
  const overlay = document.getElementById('overlay-screen');
  const overlayTitle = document.getElementById('overlay-title');
  const overlaySub = document.getElementById('overlay-subtitle');
  const overlayScore = document.getElementById('overlay-score');
  const btnStart = document.getElementById('btn-start');
  const btnSound = document.getElementById('btn-sound');
  const btnCamera = document.getElementById('btn-camera');
  const btnRestart = document.getElementById('btn-restart');
  const btnLaunch = document.getElementById('btn-launch');
  const btnLeftTouch = document.getElementById('btn-left-touch');
  const btnRightTouch = document.getElementById('btn-right-touch');

  const hudScore = document.getElementById('hud-score');
  const hudBall = document.getElementById('hud-ball');
  const hudMode = document.getElementById('hud-mode');
  const hudMult = document.getElementById('hud-mult');
  const hudLocks = document.getElementById('hud-locks');
  const hudModesDone = document.getElementById('hud-modes-done');
  const modesChecklist = document.getElementById('modes-checklist');
  const highscoreList = document.getElementById('highscore-list');

  let plungerPulling = false;
  let plungerPower = 0;

  function startNewGame() {
    audio.ensureCtx();
    game.startGame();
    overlay.classList.add('hidden');
    updateHUD();
  }

  function releasePlunger() {
    if (!plungerPulling) return;
    plungerPulling = false;
    const shooterBalls = physics.balls.filter((b) => b.inShooter && b.y > 760);
    if (shooterBalls.length > 0) {
      const power = Math.max(0.55, plungerPower);
      const launchVy = -(19.5 + power * 6.0 + Math.random() * 1.0);
      shooterBalls.forEach((b) => {
        b.vy = launchVy;
        b.vx = -0.15;
      });
      audio.launch();
    }
    plungerPower = 0;
  }

  function setLeftFlipper(down) {
    if (down) {
      audio.ensureCtx();
      if (!physics.flippers[0].pressed) audio.flipperUp();
    } else if (physics.flippers[0].pressed) {
      audio.flipperDown();
    }
    physics.setFlipper('left', down);
    game.handleFlipperInput('left', down);
  }

  function setRightFlipper(down) {
    if (down) {
      audio.ensureCtx();
      if (!physics.flippers[1].pressed) audio.flipperUp();
    } else if (physics.flippers[1].pressed) {
      audio.flipperDown();
    }
    physics.setFlipper('right', down);
    game.handleFlipperInput('right', down);
  }

  // Keyboard Controls:
  // Bottom-Left: ControlLeft (Left Ctrl)
  // Bottom-Right: ArrowRight (Right Arrow)
  window.addEventListener('keydown', (e) => {
    if (
      e.code === 'ControlLeft' ||
      e.code === 'ArrowRight' ||
      e.code === 'Space' ||
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown'
    ) {
      e.preventDefault();
    }
    if (e.repeat) return;

    if (e.code === 'ControlLeft') {
      setLeftFlipper(true);
    } else if (e.code === 'ArrowRight') {
      setRightFlipper(true);
    } else if (e.code === 'Space' || e.code === 'ArrowDown') {
      if (game.phase !== 'PLAYING') {
        startNewGame();
      } else {
        plungerPulling = true;
      }
    } else if (e.code === 'ArrowUp') {
      if (game.phase === 'PLAYING') {
        physics.nudge(0, -1);
      }
    } else if (e.code === 'KeyV') {
      const mode = renderer.toggleCamera();
      btnCamera.textContent = mode === 'FULL' ? '📷 KAMERA: GANZ (V)' : '📷 KAMERA: NAH (V)';
    } else if (e.code === 'KeyM') {
      const muted = audio.toggleMute();
      btnSound.textContent = muted ? '🔇 STUMM' : '🔊 SOUND AN';
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ControlLeft') {
      setLeftFlipper(false);
    } else if (e.code === 'ArrowRight') {
      setRightFlipper(false);
    } else if (e.code === 'Space' || e.code === 'ArrowDown') {
      releasePlunger();
    }
  });

  window.addEventListener('blur', () => {
    setLeftFlipper(false);
    setRightFlipper(false);
    plungerPulling = false;
    plungerPower = 0;
  });

  btnStart.addEventListener('click', startNewGame);
  btnRestart.addEventListener('click', startNewGame);
  btnCamera.addEventListener('click', () => {
    const mode = renderer.toggleCamera();
    btnCamera.textContent = mode === 'FULL' ? '📷 KAMERA: GANZ (V)' : '📷 KAMERA: NAH (V)';
  });
  btnSound.addEventListener('click', () => {
    const muted = audio.toggleMute();
    btnSound.textContent = muted ? '🔇 STUMM' : '🔊 SOUND AN';
  });

  btnLaunch.addEventListener('mousedown', () => {
    if (game.phase !== 'PLAYING') startNewGame();
    else plungerPulling = true;
  });
  btnLaunch.addEventListener('mouseup', releasePlunger);
  btnLaunch.addEventListener('mouseleave', releasePlunger);

  btnLeftTouch.addEventListener('mousedown', () => setLeftFlipper(true));
  btnLeftTouch.addEventListener('mouseup', () => setLeftFlipper(false));
  btnLeftTouch.addEventListener('mouseleave', () => setLeftFlipper(false));
  btnLeftTouch.addEventListener('touchstart', (e) => {
    e.preventDefault();
    setLeftFlipper(true);
  });
  btnLeftTouch.addEventListener('touchend', (e) => {
    e.preventDefault();
    setLeftFlipper(false);
  });

  btnRightTouch.addEventListener('mousedown', () => setRightFlipper(true));
  btnRightTouch.addEventListener('mouseup', () => setRightFlipper(false));
  btnRightTouch.addEventListener('mouseleave', () => setRightFlipper(false));
  btnRightTouch.addEventListener('touchstart', (e) => {
    e.preventDefault();
    setRightFlipper(true);
  });
  btnRightTouch.addEventListener('touchend', (e) => {
    e.preventDefault();
    setRightFlipper(false);
  });

  function updateHUD() {
    if (game.phase === 'GAMEOVER') {
      overlay.classList.remove('hidden');
      overlayTitle.textContent = 'GAME OVER';
      overlaySub.textContent = 'Drücke START oder Leertaste für eine neue Runde!';
      overlayScore.textContent = `ENDSTAND: ${Math.floor(game.score).toLocaleString('de-DE')}`;
      overlayScore.classList.remove('hidden');
    }

    hudScore.textContent = Math.floor(game.score).toLocaleString('de-DE');
    hudBall.textContent = `${game.ballNumber} / ${game.maxBalls}`;
    hudMode.textContent = game.activeMode
      ? `${game.activeMode.mode.name} (${game.activeMode.progress}/${game.activeMode.mode.goal})`
      : game.multiballActive
        ? 'IDOL MULTIBALL!'
        : game.phase === 'PLAYING'
          ? 'BEREIT'
          : 'START';

    hudMult.textContent = `${game.multiplier}x`;
    hudLocks.textContent = game.multiballActive ? 'MULTIBALL!' : `${game.idolLocks} / 3`;
    hudModesDone.textContent = `${game.completedModes.size} / 12`;

    modesChecklist.innerHTML = window.ADVENTURE_MODES.map((m) => {
      const isDone = game.completedModes.has(m.id);
      const isActive = game.activeMode && game.activeMode.mode.id === m.id;
      const cls = isActive ? 'active' : isDone ? 'done' : '';
      const icon = isDone ? '✔' : isActive ? '▶' : '•';
      return `<li class="${cls}"><span>${icon}</span><span>${m.name}</span></li>`;
    }).join('');

    highscoreList.innerHTML = game.highscores
      .map((h, i) => `<li><span>${i + 1}. ${h.name}</span><span>${h.score.toLocaleString('de-DE')}</span></li>`)
      .join('');
  }

  let hudTick = 0;
  function loop() {
    if (plungerPulling) {
      plungerPower = Math.min(1, plungerPower + 0.025);
    }

    if (game.phase === 'PLAYING') {
      physics.step(1);
      game.update();
    }

    renderer.render(plungerPower);

    hudTick++;
    if (hudTick % 6 === 0) {
      updateHUD();
    }

    requestAnimationFrame(loop);
  }

  updateHUD();
  requestAnimationFrame(loop);
});
