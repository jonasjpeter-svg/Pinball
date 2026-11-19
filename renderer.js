/**
 * Detailed Canvas2D Playfield & DMD Renderer for Indiana Jones: The Pinball Adventure
 */
class PinballRenderer {
  constructor(playfieldCanvas, dmdCanvas, physics, gameState) {
    this.canvas = playfieldCanvas;
    this.ctx = playfieldCanvas.getContext('2d');
    this.dmdCanvas = dmdCanvas;
    this.dmdCtx = dmdCanvas.getContext('2d');
    this.physics = physics;
    this.game = gameState;
    this.frame = 0;
  }

  render(plungerPull = 0) {
    this.frame++;
    this.renderPlayfield(plungerPull);
    this.renderDMD();
  }

  renderPlayfield(plungerPull) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.clearRect(0, 0, W, H);

    // 1. Deep Temple / Jungle Playfield Base
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#132116');
    bgGrad.addColorStop(0.35, '#1e2c1a');
    bgGrad.addColorStop(0.68, '#3d2410');
    bgGrad.addColorStop(1, '#1a0e07');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle temple stone grid & jungle foliage accents
    this.drawJungleAndTempleArt(ctx, W, H);

    // 2. Center Golden Sunburst & Indy Portrait + Character Medallions
    this.drawIndyCenterArt(ctx);

    // 3. 12 Mode Inserts (Two Columns/Arcs)
    this.drawModeInserts(ctx);

    // 4. Eternal Life (Ball Save) & Multiplier Inserts
    this.drawStatusInserts(ctx);

    // 5. Path of Adventure Mini-Playfield (Upper Left)
    this.drawPathOfAdventure(ctx);

    // 6. Ramps & Wireform Habitrails (underneath planes)
    this.drawRamps(ctx);

    // 7. Upper I-N-D-Y Lanes & Rollovers
    this.drawRollovers(ctx);

    // 8. Saucers (Mode Start Ark & Golden Idol)
    this.drawSaucersAndIdol(ctx);

    // 9. Drop & Standup Targets
    this.drawTargets(ctx);

    // 10. 3 Glowing Orange Pop Bumpers
    this.drawBumpers(ctx);

    // 11. Slingshots & Inlane/Outlane Guides
    this.drawSlingshotsAndWalls(ctx);

    // 12. Plunger in Shooter Lane
    this.drawPlunger(ctx, plungerPull);

    // 13. Flippers
    this.drawFlippers(ctx);

    // 14. Balls (Main Playfield + Elevated Ramp Balls)
    this.drawBalls(ctx);

    // 15. Suspended Planes (Biplane & Fighter Plane) drawn above playfield!
    this.drawPlanes(ctx);

    // 16. Egyptian Wing Apron at bottom
    this.drawEgyptianApron(ctx, W, H);
  }

  drawJungleAndTempleArt(ctx, W, H) {
    ctx.save();
    // Jungle palm leaves along sides
    ctx.fillStyle = 'rgba(22, 82, 36, 0.45)';
    for (let y = 120; y < 740; y += 75) {
      ctx.beginPath();
      ctx.ellipse(36, y, 28, 12, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(484, y, 28, 12, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Temple arch outline
    ctx.strokeStyle = 'rgba(245, 185, 66, 0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(280, 220, 256, Math.PI, Math.PI * 2);
    ctx.stroke();

    // Shooter lane track
    ctx.fillStyle = '#120d09';
    ctx.fillRect(500, 220, 36, 705);
    ctx.strokeStyle = '#6c5438';
    ctx.lineWidth = 2;
    ctx.strokeRect(500, 220, 36, 705);
    ctx.restore();
  }

  drawIndyCenterArt(ctx) {
    ctx.save();
    const cx = 263;
    const cy = 740;

    // Golden Sunburst rays behind Indy
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI + (i * Math.PI) / 13;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 180, 35, 0.24)' : 'rgba(210, 80, 15, 0.16)';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 15);
      ctx.lineTo(cx + Math.cos(a - 0.08) * 165, cy + Math.sin(a - 0.08) * 165);
      ctx.lineTo(cx + Math.cos(a + 0.08) * 165, cy + Math.sin(a + 0.08) * 165);
      ctx.closePath();
      ctx.fill();
    }

    // Indy Portrait Circle
    ctx.fillStyle = '#2d1a0e';
    ctx.beginPath();
    ctx.arc(cx, cy + 10, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5b942';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Face
    ctx.fillStyle = '#e0ac7c';
    ctx.beginPath();
    ctx.arc(cx, cy + 16, 20, 0, Math.PI * 2);
    ctx.fill();

    // Fedora Hat
    ctx.fillStyle = '#6e4724';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#573619';
    ctx.beginPath();
    ctx.roundRect(cx - 17, cy - 20, 34, 21, 6);
    ctx.fill();
    ctx.fillStyle = '#2b190b';
    ctx.fillRect(cx - 17, cy - 4, 34, 4);

    // Eyes & Smile
    ctx.fillStyle = '#1d120a';
    ctx.fillRect(cx - 8, cy + 11, 4, 3);
    ctx.fillRect(cx + 4, cy + 11, 4, 3);
    ctx.beginPath();
    ctx.arc(cx, cy + 20, 7, 0.15, Math.PI - 0.15);
    ctx.strokeStyle = '#6e3d20';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 5 Character Medallions (Willie, Sallah, Marion, Shorty, Dr. Jones)
    const chars = [
      { name: 'WILLIE', x: 204, y: 695, col: '#f2c96d' },
      { name: 'SALLAH', x: 263, y: 662, col: '#d9483b' },
      { name: 'MARION', x: 322, y: 695, col: '#b8683c' },
      { name: 'SHORTY', x: 196, y: 762, col: '#69b4e8' },
      { name: 'DR.JONES', x: 330, y: 762, col: '#8ca894' }
    ];
    chars.forEach((c) => {
      ctx.fillStyle = '#20150d';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c.col;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = c.col;
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.name, c.x, c.y + 3);
    });

    ctx.restore();
  }

  drawModeInserts(ctx) {
    ctx.save();
    const modes = window.ADVENTURE_MODES;
    // Left column (0..5) and Right column (6..11) in center playfield
    modes.forEach((m, idx) => {
      const isLeft = idx < 6;
      const row = isLeft ? idx : idx - 6;
      const x = isLeft ? 196 : 330;
      const y = 415 + row * 38;

      const isActive = this.game.activeMode && this.game.activeMode.mode.id === m.id;
      const isDone = this.game.completedModes.has(m.id);

      let fill = 'rgba(40, 26, 14, 0.85)';
      let stroke = '#a87c32';
      let textCol = '#d8c298';

      if (isActive && Math.floor(this.frame / 10) % 2 === 0) {
        fill = '#ff7b00';
        stroke = '#fff2a6';
        textCol = '#140800';
      } else if (isDone) {
        fill = '#259648';
        stroke = '#a8ffbf';
        textCol = '#ffffff';
      }

      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x - 48, y - 13, 96, 26, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = textCol;
      ctx.font = 'bold 8.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.name.toUpperCase(), x, y + 3);
    });
    ctx.restore();
  }

  drawStatusInserts(ctx) {
    ctx.save();
    // Center "STREETS OF CAIRO" / Multiplier badge
    ctx.fillStyle = this.game.multiplier > 1 ? '#ffae00' : '#3a2210';
    ctx.strokeStyle = '#ffe07a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(263, 610, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.game.multiplier > 1 ? '#1a0a00' : '#f5b942';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.game.multiplier}X`, 263, 615);

    // Eternal Life (Ball Save) Triangle between flippers
    const blink = this.game.eternalLifeTimer > 0 && Math.floor(this.frame / 8) % 2 === 0;
    ctx.fillStyle = blink ? '#ff3b1f' : '#3d120c';
    ctx.strokeStyle = '#ffaa44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(263, 818);
    ctx.lineTo(240, 860);
    ctx.lineTo(286, 860);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = blink ? '#ffffff' : '#ffaa44';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('ETERNAL', 263, 845);
    ctx.fillText('LIFE', 263, 854);
    ctx.restore();
  }

  drawPathOfAdventure(ctx) {
    ctx.save();
    // Upper-left mini-playfield
    ctx.fillStyle = '#4a1510';
    ctx.strokeStyle = this.game.poaLit ? '#ffe07a' : '#b87b35';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(32, 62, 102, 304, 10);
    ctx.fill();
    ctx.stroke();

    // Inner gold pattern
    ctx.strokeStyle = 'rgba(245, 185, 66, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 72, 86, 284);

    ctx.fillStyle = '#ffe07a';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PATH OF', 83, 86);
    ctx.fillText('ADVENTURE', 83, 96);

    // Pegs
    for (const peg of this.physics.poaPegs) {
      ctx.fillStyle = '#f5b942';
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Center Extra Ball target at bottom of PoA
    ctx.fillStyle = '#ff9d00';
    ctx.beginPath();
    ctx.roundRect(62, 336, 42, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#1c0a00';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('EXTRA BALL', 83, 348);
    ctx.restore();
  }

  drawRamps(ctx) {
    ctx.save();
    // Draw Left & Right wireform habitrails
    this.physics.ramps.forEach((rm) => {
      // Ramp entrance sign
      ctx.fillStyle = this.game.multiballActive && this.game.jackpotLit ? '#ff4d00' : '#d89b38';
      ctx.beginPath();
      ctx.arc(rm.x, rm.y, rm.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff1b8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Wireform rails
      ctx.strokeStyle = 'rgba(205, 214, 224, 0.55)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      rm.path.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt[0], pt[1]);
        else ctx.lineTo(pt[0], pt[1]);
      });
      ctx.stroke();

      ctx.strokeStyle = 'rgba(60, 68, 78, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Ramp Arrow Inserts
    ctx.fillStyle = '#ffe07a';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('JACKPOT / POA', 168, 312);
    ctx.fillText('DOGFIGHT RAMP', 416, 296);
    ctx.restore();
  }

  drawRollovers(ctx) {
    ctx.save();
    for (const ro of this.physics.rollovers) {
      ctx.fillStyle = ro.lit ? '#ffb703' : '#2a2016';
      ctx.strokeStyle = '#ffe07a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ro.x, ro.y, ro.r - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = ro.lit ? '#1a0a00' : '#e0c692';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ro.label, ro.x, ro.y + 4);
    }
    ctx.restore();
  }

  drawSaucersAndIdol(ctx) {
    ctx.save();
    // Mode Start Ark Scoop
    const modeSc = this.physics.saucers[0];
    ctx.fillStyle = modeSc.flash > 0 ? '#fff2a6' : '#4a2b10';
    ctx.strokeStyle = '#ffae00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(modeSc.x, modeSc.y, modeSc.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffe07a';
    ctx.font = 'bold 7.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MODE', modeSc.x, modeSc.y - 1);
    ctx.fillText('START', modeSc.x, modeSc.y + 8);

    // Golden Idol (Right Side)
    const idolSc = this.physics.saucers[1];
    ctx.fillStyle = '#6c7078';
    ctx.strokeStyle = '#f5b942';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(idolSc.x, idolSc.y, idolSc.r + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = idolSc.flash > 0 ? '#ffffff' : '#d49a2a';
    ctx.beginPath();
    ctx.arc(idolSc.x, idolSc.y, idolSc.r - 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1b0f04';
    ctx.font = 'bold 7.5px sans-serif';
    ctx.fillText('IDOL', idolSc.x, idolSc.y + 2);

    // 3 Lock Indicator LEDs below Idol
    for (let i = 0; i < 3; i++) {
      const lit = i < this.game.idolLocks || this.game.multiballActive;
      ctx.fillStyle = lit ? '#ff3300' : '#2a1510';
      ctx.beginPath();
      ctx.arc(idolSc.x - 14 + i * 14, idolSc.y + 30, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f5b942';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTargets(ctx) {
    ctx.save();
    for (const t of this.physics.targets) {
      if (t.isDrop && t.hit) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r - 3, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.fillStyle = t.flash > 0 ? '#ffffff' : t.isDrop ? '#ffcc00' : '#ff4d2e';
      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBumpers(ctx) {
    ctx.save();
    for (const b of this.physics.bumpers) {
      const glow = 1 + b.flash * 0.18;
      // Outer orange glow
      const grad = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, b.r * 1.45);
      grad.addColorStop(0, b.flash > 0.2 ? '#fff8c9' : '#ffaa00');
      grad.addColorStop(0.65, '#ff4500');
      grad.addColorStop(1, 'rgba(255, 69, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 1.45, 0, Math.PI * 2);
      ctx.fill();

      // Bumper cap
      ctx.fillStyle = b.flash > 0.2 ? '#ffffff' : '#ff5e00';
      ctx.strokeStyle = '#ffe07a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * glow, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#330c00';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawSlingshotsAndWalls(ctx) {
    ctx.save();
    // Walls
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const w of this.physics.walls) {
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.stroke();
    }

    // Slingshots
    for (const sl of this.physics.slingshots) {
      ctx.fillStyle = sl.flash > 0.2 ? '#ffae00' : '#4a1d10';
      ctx.strokeStyle = '#f5b942';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sl.pts[0][0], sl.pts[0][1]);
      ctx.lineTo(sl.pts[1][0], sl.pts[1][1]);
      ctx.lineTo(sl.pts[2][0], sl.pts[2][1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPlunger(ctx, pull) {
    ctx.save();
    const x = 518;
    const baseY = 916;
    const tipY = 856 + pull * 45;

    // Spring coils
    ctx.strokeStyle = '#b8c0cc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const coils = 8;
    for (let i = 0; i <= coils; i++) {
      const cy = tipY + ((baseY - tipY) * i) / coils;
      const cx = x + (i % 2 === 0 ? -7 : 7);
      if (i === 0) ctx.moveTo(x, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Plunger head
    ctx.fillStyle = '#d83a24';
    ctx.fillRect(x - 10, tipY - 6, 20, 8);
    ctx.restore();
  }

  drawFlippers(ctx) {
    ctx.save();
    for (const f of this.physics.flippers) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);

      // Flipper body
      ctx.fillStyle = '#e5a93c';
      ctx.strokeStyle = '#fff2b2';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, f.baseRadius, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(f.length, 0, f.tipRadius, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rubber band
      ctx.fillStyle = '#b8251e';
      ctx.beginPath();
      ctx.roundRect(4, -4, f.length - 4, 8, 4);
      ctx.fill();

      // Pivot bolt
      ctx.fillStyle = '#2b2d33';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }

  drawBalls(ctx) {
    ctx.save();
    for (const b of this.physics.balls) {
      // Motion trail
      for (let i = 0; i < b.trail.length; i++) {
        const pt = b.trail[i];
        const alpha = ((i + 1) / b.trail.length) * 0.25;
        ctx.fillStyle = `rgba(255, 220, 140, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, b.r * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }

      // Chrome pinball
      const grad = ctx.createRadialGradient(b.x - 3.5, b.y - 3.5, 1.5, b.x, b.y, b.r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.45, '#cfd8e3');
      grad.addColorStop(0.85, '#68707d');
      grad.addColorStop(1, '#272a30');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPlanes(ctx) {
    ctx.save();
    const spin = (this.frame * 0.45) % (Math.PI * 2);

    // 1. Biplane (Doppeldecker) over upper-center bumpers
    ctx.save();
    ctx.translate(278, 255);
    ctx.rotate(-0.48);
    // Wings
    ctx.fillStyle = '#d9cfbc';
    ctx.strokeStyle = '#3b2b1d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-48, -12, 96, 20, 6);
    ctx.fill();
    ctx.stroke();
    // Fuselage
    ctx.fillStyle = '#a82218';
    ctx.beginPath();
    ctx.roundRect(-9, -32, 18, 62, 7);
    ctx.fill();
    ctx.stroke();
    // Tail
    ctx.fillStyle = '#d9cfbc';
    ctx.fillRect(-16, -30, 32, 8);
    // Spinning Propeller
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-Math.cos(spin) * 16, 32);
    ctx.lineTo(Math.cos(spin) * 16, 32);
    ctx.stroke();
    ctx.restore();

    // 2. Fighter Plane (Green/Yellow) over Right Ramp
    ctx.save();
    ctx.translate(458, 178);
    ctx.rotate(0.55);
    ctx.fillStyle = '#5c6e46';
    ctx.strokeStyle = '#1e2416';
    ctx.lineWidth = 1.5;
    // Wings
    ctx.beginPath();
    ctx.moveTo(-46, -6);
    ctx.lineTo(46, -6);
    ctx.lineTo(36, 12);
    ctx.lineTo(-36, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Fuselage
    ctx.fillStyle = '#4c5c38';
    ctx.beginPath();
    ctx.roundRect(-8, -34, 16, 66, 6);
    ctx.fill();
    ctx.stroke();
    // Yellow nose & tail
    ctx.fillStyle = '#f2c12e';
    ctx.beginPath();
    ctx.arc(0, 32, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-15, -32, 30, 8);
    ctx.restore();

    ctx.restore();
  }

  drawEgyptianApron(ctx, W, H) {
    ctx.save();
    // Bottom apron wings
    ctx.fillStyle = '#140c06';
    ctx.beginPath();
    ctx.moveTo(0, 835);
    ctx.lineTo(170, 930);
    ctx.lineTo(356, 930);
    ctx.lineTo(560, 835);
    ctx.lineTo(560, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#d99b38';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#f5b942';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CTRL (LINKS)', 85, 932);
    ctx.fillText('PFEIL → (RECHTS)', 440, 932);
    ctx.restore();
  }

  renderDMD() {
    const ctx = this.dmdCtx;
    const W = this.dmdCanvas.width;
    const H = this.dmdCanvas.height;

    ctx.fillStyle = '#090401';
    ctx.fillRect(0, 0, W, H);

    // Interactive Mini-Game overrides normal DMD view
    if (this.game.miniGame) {
      if (this.game.miniGame.type === 'grail') {
        this.renderGrailDMD(ctx, W, H);
        return;
      } else if (this.game.miniGame.type === 'minecart') {
        this.renderMineCartDMD(ctx, W, H);
        return;
      }
    }

    // Score & Ball Header
    ctx.fillStyle = '#ff8c00';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.floor(this.game.score).toLocaleString('de-DE'), W / 2, 50);

    // Ball & Multiplier corner info
    ctx.fillStyle = '#ffb74d';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`BALL ${this.game.ballNumber}/${this.game.maxBalls}`, 14, 24);
    ctx.textAlign = 'right';
    ctx.fillText(`${this.game.multiplier}X`, W - 14, 24);

    // Banner or Active Mode
    if (this.game.dmdBanner.timer > 0) {
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 21px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.game.dmdBanner.title, W / 2, 86);

      ctx.fillStyle = '#ff9800';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(this.game.dmdBanner.subtitle, W / 2, 112);
    } else if (this.game.activeMode) {
      const m = this.game.activeMode;
      const secs = Math.ceil(m.timer / 60);
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${m.mode.name.toUpperCase()} (${secs}s)`, W / 2, 86);
      ctx.fillStyle = '#ff9800';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`FORTSCHRITT: ${m.progress} / ${m.mode.goal}`, W / 2, 112);
    } else {
      ctx.fillStyle = '#ff9800';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TRIFF MODE START ODER IDOL LOCK!', W / 2, 102);
    }
  }

  renderGrailDMD(ctx, W, H) {
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`CHOOSE WISELY! (${Math.ceil(this.game.miniGame.timer / 60)}s)`, W / 2, 26);

    const xs = [130, 256, 382];
    xs.forEach((x, idx) => {
      const selected = this.game.miniGame.cursor === idx;
      ctx.strokeStyle = selected ? '#ffffff' : '#ff8c00';
      ctx.lineWidth = selected ? 3 : 1.5;
      ctx.strokeRect(x - 30, 38, 60, 56);

      // Chalice icon
      ctx.fillStyle = selected ? '#ffd54f' : '#ff8c00';
      ctx.beginPath();
      ctx.moveTo(x - 16, 48);
      ctx.lineTo(x + 16, 48);
      ctx.lineTo(x + 6, 70);
      ctx.lineTo(x - 6, 70);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x - 3, 70, 6, 14);
      ctx.fillRect(x - 12, 84, 24, 5);
    });

    ctx.fillStyle = '#ff9800';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('WÄHLE MIT CTRL (LINKS) / PFEIL → (RECHTS)', W / 2, 116);
  }

  renderMineCartDMD(ctx, W, H) {
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 17px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`MINE CART (${this.game.miniGame.dodged}/5) - CTRL / PFEIL →`, W / 2, 22);

    const lanes = [150, 256, 362];
    // Draw 3 tracks
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth = 2;
    lanes.forEach((lx) => {
      ctx.beginPath();
      ctx.moveTo(lx, 32);
      ctx.lineTo(lx, 116);
      ctx.stroke();
    });

    // Draw obstacle rock
    const ox = lanes[this.game.miniGame.obstacleLane];
    const oy = 34 + this.game.miniGame.obstacleProgress * 76;
    ctx.fillStyle = '#ff3d00';
    ctx.beginPath();
    ctx.arc(ox, oy, 11, 0, Math.PI * 2);
    ctx.fill();

    // Draw player mine cart
    const px = lanes[this.game.miniGame.lane];
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(px - 16, 98, 32, 16);
  }
}

window.PinballRenderer = PinballRenderer;
