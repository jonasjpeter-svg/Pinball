/**
 * Game Rules, 12 Adventure Modes, Multiball, Path of Adventure,
 * Interactive Mini-Games (Choose Wisely, Mine Cart), and Highscores.
 */
const ADVENTURE_MODES = [
  { id: 'cairo', name: 'Streets of Cairo', desc: 'Triff Rampen & Bumper um Marion zu finden!', goal: 4, reward: 5000000 },
  { id: 'well', name: 'Well of Souls', desc: '2-Ball Mini-Multiball! Triff Ziele & Bumper!', goal: 8, reward: 6500000, multiball: true },
  { id: 'monkey', name: 'Monkey Brains', desc: 'Schnelle Bumper- & Target-Treffer!', goal: 6, reward: 4500000 },
  { id: 'brunwald', name: 'Castle Brunwald', desc: 'Triff die Drop-Targets & rette Dr. Jones!', goal: 3, reward: 5500000 },
  { id: 'tank', name: 'Tank Chase', desc: 'Schieße linke & rechte Rampe abwechselnd!', goal: 4, reward: 6000000 },
  { id: 'minecart', name: 'Mine Cart', desc: 'Steuere mit CTRL (Links) & PFEIL → (Rechts)!', goal: 5, reward: 5500000, interactive: 'minecart' },
  { id: 'bridge', name: 'Rope Bridge', desc: 'Triff Targets & Rampen um die Seile zu kappen!', goal: 5, reward: 5000000 },
  { id: 'stones', name: 'Steal the Stones', desc: 'Sammle die 3 Sankara-Steine rechts!', goal: 3, reward: 6000000 },
  { id: 'challenges', name: 'Three Challenges', desc: '3 Schüsse: Atem, Wort & Pfad Gottes!', goal: 3, reward: 7500000 },
  { id: 'raven', name: 'Raven Bar', desc: 'Schießerei! Triff alle Ziele & Bumper!', goal: 7, reward: 5000000 },
  { id: 'dogfight', name: 'Dogfight', desc: 'Luftkampf! Triff die Flugzeug-Rampen!', goal: 4, reward: 6500000 },
  { id: 'grail', name: 'Choose Wisely', desc: 'Wähle den wahren Gral mit CTRL / PFEIL →!', goal: 1, reward: 10000000, interactive: 'grail' }
];

class IndyGameState {
  constructor(audio, physics) {
    this.audio = audio;
    this.physics = physics;
    this.highscores = this.loadHighscores();
    this.resetGame();
  }

  loadHighscores() {
    try {
      const raw = localStorage.getItem('indy_pinball_highscores');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      { name: 'INDY', score: 120000000 },
      { name: 'MARION', score: 85000000 },
      { name: 'SHORTY', score: 62000000 },
      { name: 'SALLAH', score: 45000000 },
      { name: 'HENRY', score: 25000000 }
    ];
  }

  saveHighscore(score) {
    if (score <= 0) return;
    this.highscores.push({ name: 'YOU', score: Math.floor(score) });
    this.highscores.sort((a, b) => b.score - a.score);
    this.highscores = this.highscores.slice(0, 5);
    try {
      localStorage.setItem('indy_pinball_highscores', JSON.stringify(this.highscores));
    } catch (e) {}
  }

  resetGame() {
    this.phase = 'ATTRACT'; // ATTRACT | PLAYING | GAMEOVER
    this.score = 0;
    this.ballNumber = 1;
    this.maxBalls = 3;
    this.extraBalls = 0;
    this.multiplier = 1;
    this.idolLocks = 0;
    this.multiballActive = false;
    this.jackpotLit = false;
    this.superJackpotLit = false;
    this.leftRampCount = 0;
    this.poaLit = false;
    this.kickbackLit = true;
    this.eternalLifeTimer = 0; // frames of ball save

    this.completedModes = new Set();
    this.activeMode = null; // { mode, progress, timer }
    this.nextModeIndex = 0;

    // Interactive DMD mini-game state
    this.miniGame = null;

    // DMD Banner Queue
    this.dmdBanner = {
      title: 'INDIANA JONES',
      subtitle: 'DRÜCKE START ODER LEERTASTE',
      timer: 999999
    };

    // Reset table state
    this.physics.balls = [];
    this.physics.tilted = false;
    this.physics.tiltWarnings = 0;
    this.physics.rollovers.forEach((r) => {
      if (r.id.startsWith('indy-')) r.lit = false;
    });
    this.physics.targets.forEach((t) => {
      t.hit = false;
    });
  }

  startGame() {
    this.resetGame();
    this.phase = 'PLAYING';
    this.spawnShooterBall();
    this.setBanner('BALL 1', 'ABZUG MIT LEERTASTE', 180);
    this.audio.modeStart();
  }

  spawnShooterBall() {
    this.physics.tilted = false;
    this.physics.tiltWarnings = 0;
    this.physics.spawnBall(518, 840, 0, 0, true);
  }

  setBanner(title, subtitle = '', frames = 130) {
    this.dmdBanner = { title, subtitle, timer: frames };
  }

  addScore(pts) {
    if (this.physics.tilted) return;
    this.score += pts * this.multiplier;
  }

  rotateIndyLanes(dir) {
    const lanes = this.physics.rollovers.filter((r) => r.id.startsWith('indy-'));
    const states = lanes.map((l) => l.lit);
    if (dir > 0) {
      const last = states.pop();
      states.unshift(last);
    } else {
      const first = states.shift();
      states.push(first);
    }
    lanes.forEach((l, i) => (l.lit = states[i]));
  }

  handleFlipperInput(side, pressed) {
    if (!pressed || this.phase !== 'PLAYING') return;
    this.rotateIndyLanes(side === 'left' ? -1 : 1);

    // Interactive DMD mini-games use Ctrl (left) and ArrowRight (right)
    if (this.miniGame) {
      if (this.miniGame.type === 'grail') {
        if (side === 'left') {
          this.miniGame.cursor = (this.miniGame.cursor + 2) % 3;
        } else {
          this.miniGame.cursor = (this.miniGame.cursor + 1) % 3;
        }
        this.audio.target();
      } else if (this.miniGame.type === 'minecart') {
        this.miniGame.lane = side === 'left'
          ? Math.max(0, this.miniGame.lane - 1)
          : Math.min(2, this.miniGame.lane + 1);
        this.audio.target();
      }
    }
  }

  handlePhysicsEvent(type, data) {
    if (this.phase !== 'PLAYING') return;

    switch (type) {
      case 'ball-entered-playfield':
        if (this.eternalLifeTimer === 0 && !this.multiballActive) {
          this.eternalLifeTimer = 60 * 12; // 12 seconds Eternal Life Ball Save
          this.setBanner('ETERNAL LIFE', 'BALL-SAVER AKTIV (12s)', 110);
        }
        break;

      case 'bumper':
        this.audio.bumper();
        this.addScore(35000);
        this.advanceModeProgress('bumper');
        break;

      case 'slingshot':
        this.audio.slingshot();
        this.addScore(15000);
        break;

      case 'target':
        if (data.target.isDrop) {
          this.audio.dropTarget();
          this.addScore(75000);
          const drops = this.physics.targets.filter((t) => t.isDrop);
          if (drops.every((d) => d.hit)) {
            setTimeout(() => drops.forEach((d) => (d.hit = false)), 700);
            this.addScore(350000);
            this.poaLit = true;
            this.setBanner('ADVENTURE KOMPLETT!', 'PATH OF ADVENTURE BELEUCHTET', 140);
            this.audio.idolLock();
          }
        } else {
          this.audio.target();
          this.addScore(50000);
        }
        this.advanceModeProgress('target');
        break;

      case 'rollover': {
        const ro = data.rollover;
        this.audio.target();
        if (ro.id.startsWith('indy-')) {
          ro.lit = true;
          this.addScore(40000);
          const lanes = this.physics.rollovers.filter((r) => r.id.startsWith('indy-'));
          if (lanes.every((l) => l.lit)) {
            lanes.forEach((l) => (l.lit = false));
            this.multiplier = Math.min(8, this.multiplier + 1);
            this.addScore(250000);
            this.setBanner(`BONUS ${this.multiplier}X!`, 'I-N-D-Y KOMPLETT', 120);
            this.audio.idolLock();
          }
        } else {
          this.addScore(25000);
        }
        break;
      }

      case 'ramp':
        this.audio.ramp();
        this.addScore(250000);
        if (this.multiballActive && this.jackpotLit) {
          this.addScore(5000000);
          this.audio.jackpot();
          this.setBanner('JACKPOT!!', '+5.000.000 PUNKTE!', 140);
          this.superJackpotLit = true;
        }
        if (data.ramp.id === 'left-ramp') {
          this.leftRampCount++;
          if (this.poaLit || this.leftRampCount % 3 === 0) {
            this.poaLit = false;
            data.ball.onRamp = false;
            data.ball.inPathOfAdventure = true;
            data.ball.x = 83;
            data.ball.y = 95;
            data.ball.vx = (Math.random() - 0.5) * 1.4;
            data.ball.vy = 1.2;
            this.setBanner('PATH OF ADVENTURE!', 'LENKE MIT CTRL & PFEIL →', 160);
            this.audio.modeStart();
          } else {
            this.setBanner('LINKE RAMPE', `NOCH ${3 - (this.leftRampCount % 3)}x FÜR PATH OF ADVENTURE`, 95);
          }
        } else {
          this.setBanner('RECHTE RAMPE', 'LUFTKAMPF-BONUS +250K', 95);
        }
        this.advanceModeProgress('ramp');
        break;

      case 'poa-peg':
        this.audio.target();
        this.addScore(100000);
        break;

      case 'poa-complete':
        if (data.centerHit) {
          this.extraBalls++;
          this.addScore(3000000);
          this.audio.jackpot();
          this.setBanner('EXTRA BALL!', 'PATH OF ADVENTURE GEMEISTERT!', 160);
        } else {
          this.addScore(1500000);
          this.audio.idolLock();
          this.setBanner('TEMPEL-SCHATZ!', '+1.500.000 PUNKTE', 130);
        }
        break;

      case 'saucer':
        if (data.saucer.id === 'mode-scoop') {
          this.triggerNextMode();
        } else if (data.saucer.id === 'idol-lock') {
          this.handleIdolLock();
        }
        break;

      case 'nudge-warning':
        this.audio.tilt();
        this.setBanner(`WARNUNG ${data.warnings}/3`, 'NICHT ZU STARK RÜTTELN!', 90);
        break;

      case 'tilt':
        this.audio.tilt();
        this.setBanner('TILT!', 'FLIPPER DEAKTIVIERT', 180);
        break;

      case 'drain':
        this.handleBallDrain();
        break;
    }
  }

  handleIdolLock() {
    if (this.multiballActive) {
      if (this.superJackpotLit) {
        this.addScore(15000000);
        this.superJackpotLit = false;
        this.audio.jackpot();
        this.setBanner('SUPER JACKPOT!!', '+15.000.000 PUNKTE!', 160);
      } else {
        this.addScore(1000000);
        this.audio.idolLock();
        this.setBanner('IDOL TREFFER', '+1.000.000 PUNKTE', 100);
      }
      return;
    }

    this.idolLocks++;
    this.addScore(400000);
    if (this.idolLocks < 3) {
      this.audio.idolLock();
      this.setBanner(`BALL ${this.idolLocks} GELOCKT!`, `NOCH ${3 - this.idolLocks} BIS IDOL MULTIBALL`, 140);
    } else {
      this.idolLocks = 0;
      this.multiballActive = true;
      this.jackpotLit = true;
      this.eternalLifeTimer = 60 * 15;
      this.audio.jackpot();
      this.setBanner('IDOL MULTIBALL!!', '3 BÄLLE - TRIFF RAMPEN FÜR JACKPOT!', 180);
      // Spawn 2 extra balls onto playfield
      this.physics.spawnBall(250, 140, -3.5, 2.5, false);
      this.physics.spawnBall(320, 140, 3.5, 2.5, false);
    }
  }

  triggerNextMode() {
    if (this.activeMode) {
      this.addScore(300000);
      this.audio.target();
      this.setBanner(this.activeMode.mode.name.toUpperCase(), 'MISSION LÄUFT NOCH!', 100);
      return;
    }

    // Pick next uncompleted mode (or cycle)
    const available = ADVENTURE_MODES.filter((m) => !this.completedModes.has(m.id));
    const mode = available.length > 0
      ? available[0]
      : ADVENTURE_MODES[this.nextModeIndex % ADVENTURE_MODES.length];
    this.nextModeIndex++;

    this.activeMode = {
      mode,
      progress: 0,
      timer: 60 * 35 // 35 seconds
    };
    this.audio.modeStart();
    this.setBanner(mode.name.toUpperCase(), mode.desc, 160);

    if (mode.multiball && this.physics.balls.length < 2) {
      this.physics.spawnBall(280, 130, (Math.random() - 0.5) * 4, 3, false);
    }

    if (mode.interactive === 'grail') {
      this.miniGame = {
        type: 'grail',
        cursor: 1,
        correct: Math.floor(Math.random() * 3),
        timer: 60 * 6 // 6 seconds to choose!
      };
    } else if (mode.interactive === 'minecart') {
      this.miniGame = {
        type: 'minecart',
        lane: 1,
        obstacleLane: Math.floor(Math.random() * 3),
        obstacleProgress: 0,
        dodged: 0,
        timer: 60 * 12
      };
    }
  }

  advanceModeProgress(source) {
    if (!this.activeMode) return;
    if (this.activeMode.mode.interactive) return;
    this.activeMode.progress++;
    if (this.activeMode.progress >= this.activeMode.mode.goal) {
      this.completeActiveMode();
    }
  }

  completeActiveMode() {
    if (!this.activeMode) return;
    const { mode } = this.activeMode;
    this.completedModes.add(mode.id);
    this.addScore(mode.reward);
    this.audio.jackpot();
    this.setBanner(`${mode.name.toUpperCase()} GELÖST!`, `+${mode.reward.toLocaleString('de-DE')} PUNKTE!`, 160);
    this.activeMode = null;
    this.miniGame = null;

    if (this.completedModes.size === ADVENTURE_MODES.length) {
      this.addScore(25000000);
      this.setBanner('HAND OF FATE!!', 'ALLE 12 MODI GELÖST! +25.000.000!', 220);
    }
  }

  handleBallDrain() {
    if (this.physics.balls.length > 0) {
      // Multiball still has balls on playfield
      if (this.physics.balls.length === 1) {
        this.multiballActive = false;
      }
      return;
    }

    this.multiballActive = false;

    // Eternal Life Ball Save!
    if (this.eternalLifeTimer > 0 && !this.physics.tilted) {
      this.eternalLifeTimer = 0;
      this.audio.ballSave();
      this.setBanner('ETERNAL LIFE!', 'BALL GERETTET - NEUER ABSCHUSS!', 150);
      this.spawnShooterBall();
      return;
    }

    this.audio.drain();
    this.activeMode = null;
    this.miniGame = null;

    if (this.extraBalls > 0) {
      this.extraBalls--;
      this.setBanner('EXTRA BALL!', 'WEITER GEHT\'S!', 150);
      this.spawnShooterBall();
      return;
    }

    if (this.ballNumber < this.maxBalls) {
      this.ballNumber++;
      this.multiplier = 1;
      this.setBanner(`BALL ${this.ballNumber}`, 'ABZUG MIT LEERTASTE', 150);
      this.spawnShooterBall();
    } else {
      this.phase = 'GAMEOVER';
      this.saveHighscore(this.score);
      this.setBanner('GAME OVER', `ENDSTAND: ${Math.floor(this.score).toLocaleString('de-DE')}`, 999999);
    }
  }

  update() {
    if (this.dmdBanner.timer > 0) this.dmdBanner.timer--;
    if (this.eternalLifeTimer > 0) this.eternalLifeTimer--;

    if (this.activeMode) {
      this.activeMode.timer--;
      if (this.activeMode.timer <= 0) {
        this.setBanner('ZEIT ABGELAUFEN', this.activeMode.mode.name.toUpperCase(), 120);
        this.activeMode = null;
        this.miniGame = null;
      }
    }

    // Update interactive DMD mini-games
    if (this.miniGame) {
      if (this.miniGame.type === 'grail') {
        this.miniGame.timer--;
        if (this.miniGame.timer <= 0) {
          if (this.miniGame.cursor === this.miniGame.correct) {
            this.setBanner('WEISE GEWÄHLT!', '+10.000.000 PUNKTE!', 160);
            this.completeActiveMode();
          } else {
            this.audio.drain();
            this.setBanner('SCHLECHT GEWÄHLT...', 'KEIN GRAL-BONUS', 130);
            this.activeMode = null;
            this.miniGame = null;
          }
        }
      } else if (this.miniGame.type === 'minecart') {
        this.miniGame.timer--;
        this.miniGame.obstacleProgress += 0.025;
        if (this.miniGame.obstacleProgress >= 1) {
          if (this.miniGame.lane !== this.miniGame.obstacleLane) {
            this.miniGame.dodged++;
            this.addScore(500000);
            this.audio.target();
            if (this.miniGame.dodged >= 5) {
              this.completeActiveMode();
              return;
            }
          } else {
            this.audio.bumper();
          }
          this.miniGame.obstacleProgress = 0;
          this.miniGame.obstacleLane = Math.floor(Math.random() * 3);
        }
      }
    }
  }
}

window.ADVENTURE_MODES = ADVENTURE_MODES;
window.IndyGameState = IndyGameState;
