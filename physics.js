/**
 * High-Precision 960Hz Pinball Physics Engine (16 sub-steps/frame)
 * Zero-tunneling flippers with authentic Williams-style shot aiming,
 * elevated 3D ramps, Path of Adventure, and anti-stuck ball search.
 */
class PinballPhysics {
  constructor(width = 560, height = 960) {
    this.width = width;
    this.height = height;
    this.gravity = 0.23;
    this.maxSpeed = 27;
    this.subSteps = 16;

    this.balls = [];
    this.walls = [];
    this.oneWayGates = [];
    this.bumpers = [];
    this.slingshots = [];
    this.targets = [];
    this.rollovers = [];
    this.saucers = [];
    this.ramps = [];
    this.flippers = [];
    this.poaPegs = [];

    this.nudgeCooldown = 0;
    this.tiltWarnings = 0;
    this.tilted = false;

    this.onEvent = null;
    this.buildTableGeometry();
  }

  emit(type, data = {}) {
    if (this.onEvent) this.onEvent(type, data);
  }

  addWall(x1, y1, x2, y2, restitution = 0.45, tag = 'wall') {
    this.walls.push({ x1, y1, x2, y2, restitution, tag });
  }

  addPolyWalls(pts, closed = false, restitution = 0.45, tag = 'wall') {
    for (let i = 0; i < pts.length - 1; i++) {
      this.addWall(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], restitution, tag);
    }
    if (closed && pts.length > 2) {
      const last = pts[pts.length - 1];
      this.addWall(last[0], last[1], pts[0][0], pts[0][1], restitution, tag);
    }
  }

  addArcWalls(cx, cy, r, startAngle, endAngle, steps = 32, restitution = 0.45, tag = 'wall') {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + ((endAngle - startAngle) * i) / steps;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    this.addPolyWalls(pts, false, restitution, tag);
  }

  buildTableGeometry() {
    // Outer top arch
    this.addArcWalls(280, 220, 256, Math.PI, Math.PI * 2, 36, 0.35, 'arch');

    // Left outer wall
    this.addWall(24, 220, 24, 805, 0.4, 'wall');
    this.addWall(24, 805, 166, 920, 0.35, 'drain-wall');

    // Right outer wall (shooter lane outer boundary)
    this.addWall(536, 220, 536, 920, 0.4, 'shooter-wall');
    this.addWall(502, 920, 536, 920, 0.15, 'shooter-floor');

    // Shooter lane inner divider with angled cap
    this.addWall(500, 255, 500, 805, 0.4, 'divider');
    this.addWall(500, 255, 505, 265, 0.4, 'divider-cap');
    this.addWall(500, 805, 360, 920, 0.35, 'drain-wall');
    this.addWall(500, 805, 502, 920, 0.4, 'divider');

    // One-way gate at top of shooter lane
    this.oneWayGates.push({
      x1: 496,
      y1: 110,
      x2: 496,
      y2: 245,
      allowDirX: -1,
      allowDirY: 0
    });

    // Left Inlane / Outlane divider (smoothly feeds Left Flipper at 166, 868)
    this.addWall(64, 675, 64, 790, 0.35, 'inlane');
    this.addWall(64, 790, 162, 864, 0.22, 'inlane');

    // Right Inlane / Outlane divider (smoothly feeds Right Flipper at 360, 868)
    this.addWall(462, 675, 462, 790, 0.35, 'inlane');
    this.addWall(462, 790, 364, 864, 0.22, 'inlane');

    // Upper lane dividers (I-N-D-Y)
    this.addWall(250, 52, 250, 108, 0.5, 'lane-div');
    this.addWall(300, 44, 300, 104, 0.5, 'lane-div');
    this.addWall(350, 52, 350, 108, 0.5, 'lane-div');

    // Upper-left Path of Adventure outer border
    this.addWall(142, 130, 142, 255, 0.45, 'poa-wall');
    this.addWall(24, 372, 96, 372, 0.45, 'poa-wall');

    // Guide walls near ramps & Idol
    this.addWall(198, 225, 204, 295, 0.45, 'guide');
    this.addWall(375, 215, 385, 285, 0.45, 'guide');
    this.addWall(470, 355, 496, 380, 0.5, 'idol-guide');
    this.addWall(470, 490, 496, 468, 0.5, 'idol-guide');

    // Slingshots
    this.slingshots = [
      {
        id: 'left-sling',
        pts: [[94, 688], [94, 772], [148, 814]],
        kickX1: 94, kickY1: 688, kickX2: 148, kickY2: 814,
        kickNormalX: 0.85, kickNormalY: -0.52,
        flash: 0
      },
      {
        id: 'right-sling',
        pts: [[432, 688], [432, 772], [378, 814]],
        kickX1: 432, kickY1: 688, kickX2: 378, kickY2: 814,
        kickNormalX: -0.85, kickNormalY: -0.52,
        flash: 0
      }
    ];
    this.slingshots.forEach((s) => {
      this.addWall(s.pts[0][0], s.pts[0][1], s.pts[1][0], s.pts[1][1], 0.5, 'sling-back');
      this.addWall(s.pts[1][0], s.pts[1][1], s.pts[2][0], s.pts[2][1], 0.5, 'sling-bot');
    });

    // 3 Pop Bumpers
    this.bumpers = [
      { id: 'bumper-1', x: 235, y: 198, r: 23, flash: 0, color: '#ff5500' },
      { id: 'bumper-2', x: 335, y: 184, r: 23, flash: 0, color: '#ff5500' },
      { id: 'bumper-3', x: 288, y: 268, r: 23, flash: 0, color: '#ff6a00' }
    ];

    // Rollovers
    this.rollovers = [
      { id: 'indy-I', label: 'I', x: 225, y: 82, r: 14, lit: false, cooldown: 0 },
      { id: 'indy-N', label: 'N', x: 275, y: 74, r: 14, lit: false, cooldown: 0 },
      { id: 'indy-D', label: 'D', x: 325, y: 74, r: 14, lit: false, cooldown: 0 },
      { id: 'indy-Y', label: 'Y', x: 375, y: 82, r: 14, lit: false, cooldown: 0 },
      { id: 'inlane-L', label: 'L', x: 44, y: 740, r: 13, lit: true, cooldown: 0 },
      { id: 'inlane-R', label: 'R', x: 482, y: 740, r: 13, lit: true, cooldown: 0 }
    ];

    // Standup & Drop Targets
    this.targets = [
      { id: 'drop-1', label: 'A', x: 118, y: 425, r: 11, hit: false, isDrop: true, flash: 0 },
      { id: 'drop-2', label: 'D', x: 112, y: 462, r: 11, hit: false, isDrop: true, flash: 0 },
      { id: 'drop-3', label: 'V', x: 106, y: 499, r: 11, hit: false, isDrop: true, flash: 0 },
      { id: 'stand-1', label: 'S1', x: 438, y: 525, r: 11, hit: false, isDrop: false, flash: 0 },
      { id: 'stand-2', label: 'S2', x: 444, y: 562, r: 11, hit: false, isDrop: false, flash: 0 },
      { id: 'stand-3', label: 'S3', x: 450, y: 599, r: 11, hit: false, isDrop: false, flash: 0 }
    ];

    // Saucers / Scoops
    this.saucers = [
      { id: 'mode-scoop', label: 'MODE START', x: 204, y: 342, r: 17, cooldown: 0, flash: 0 },
      { id: 'idol-lock', label: 'IDOL LOCK', x: 458, y: 425, r: 19, cooldown: 0, flash: 0 }
    ];

    // Ramps with 3D height z
    this.ramps = [
      {
        id: 'left-ramp',
        x: 168,
        y: 278,
        r: 22,
        minVy: -1.8,
        cooldown: 0,
        path: [
          [168, 278, 0],
          [158, 175, 28],
          [125, 130, 36],
          [74, 240, 32],
          [70, 520, 18],
          [78, 695, 2]
        ]
      },
      {
        id: 'right-ramp',
        x: 416,
        y: 262,
        r: 22,
        minVy: -1.8,
        cooldown: 0,
        path: [
          [416, 262, 0],
          [432, 168, 28],
          [462, 145, 36],
          [480, 310, 30],
          [476, 540, 18],
          [448, 695, 2]
        ]
      }
    ];

    // Path of Adventure Mini-Playfield Pegs
    this.poaPegs = [
      { x: 64, y: 145, r: 7 },
      { x: 102, y: 145, r: 7 },
      { x: 48, y: 195, r: 7 },
      { x: 84, y: 195, r: 8 },
      { x: 118, y: 195, r: 7 },
      { x: 64, y: 245, r: 7 },
      { x: 102, y: 245, r: 7 },
      { x: 84, y: 292, r: 8 }
    ];

    // Main Flippers (tuned length & radius for crisp, reliable hits)
    this.flippers = [
      {
        id: 'left',
        x: 164,
        y: 868,
        length: 80,
        baseRadius: 12,
        tipRadius: 7,
        restAngle: 0.46,
        activeAngle: -0.58,
        angle: 0.46,
        prevAngle: 0.46,
        angularVel: 0,
        pressed: false,
        justFiredTimer: 0
      },
      {
        id: 'right',
        x: 362,
        y: 868,
        length: 80,
        baseRadius: 12,
        tipRadius: 7,
        restAngle: Math.PI - 0.46,
        activeAngle: Math.PI + 0.58,
        angle: Math.PI - 0.46,
        prevAngle: Math.PI - 0.46,
        angularVel: 0,
        pressed: false,
        justFiredTimer: 0
      }
    ];
  }

  spawnBall(x = 518, y = 840, vx = 0, vy = 0, inShooter = true) {
    const ball = {
      id: Math.random().toString(36).slice(2, 8),
      x,
      y,
      z: 0,
      vx,
      vy,
      r: 11,
      inShooter,
      onRamp: false,
      rampPoints: null,
      rampSeg: 0,
      rampT: 0,
      inPathOfAdventure: false,
      stuckFrames: 0,
      trail: []
    };
    this.balls.push(ball);
    return ball;
  }

  setFlipper(side, pressed) {
    if (this.tilted) pressed = false;
    const f = this.flippers.find((fl) => fl.id === side);
    if (f) {
      if (pressed && !f.pressed) {
        f.justFiredTimer = 10; // 10 frames active solenoid window
      }
      f.pressed = pressed;
    }
  }

  nudge(dirX = 0, dirY = -1) {
    if (this.nudgeCooldown > 0 || this.tilted) return false;
    this.nudgeCooldown = 22;
    this.tiltWarnings += 1;
    this.balls.forEach((b) => {
      if (!b.inShooter && !b.onRamp) {
        b.vx += dirX * 2.4 + (Math.random() - 0.5) * 1.4;
        b.vy += dirY * 2.2;
      }
    });
    if (this.tiltWarnings >= 3) {
      this.tilted = true;
      this.flippers.forEach((f) => (f.pressed = false));
      this.emit('tilt');
    } else {
      this.emit('nudge-warning', { warnings: this.tiltWarnings });
    }
    return true;
  }

  step(dtScale = 1) {
    if (this.nudgeCooldown > 0) this.nudgeCooldown--;

    this.bumpers.forEach((b) => (b.flash = Math.max(0, b.flash - 0.08)));
    this.slingshots.forEach((s) => (s.flash = Math.max(0, s.flash - 0.08)));
    this.targets.forEach((t) => (t.flash = Math.max(0, t.flash - 0.08)));
    this.saucers.forEach((s) => {
      s.flash = Math.max(0, s.flash - 0.06);
      if (s.cooldown > 0) s.cooldown--;
    });
    this.ramps.forEach((r) => {
      if (r.cooldown > 0) r.cooldown--;
    });
    this.rollovers.forEach((ro) => {
      if (ro.cooldown > 0) ro.cooldown--;
    });
    this.flippers.forEach((f) => {
      if (f.justFiredTimer > 0) f.justFiredTimer--;
    });

    const subDt = dtScale / this.subSteps;

    for (let s = 0; s < this.subSteps; s++) {
      for (const f of this.flippers) {
        f.prevAngle = f.angle;
        const target = f.pressed ? f.activeAngle : f.restAngle;
        // Max ~0.036 rad per substep -> tip moves <= 2.9px/substep (zero tunneling!)
        const maxStep = (f.pressed ? 0.42 : 0.24) * subDt;
        const diff = target - f.angle;
        if (Math.abs(diff) <= maxStep) {
          f.angle = target;
        } else {
          f.angle += Math.sign(diff) * maxStep;
        }
        f.angularVel = (f.angle - f.prevAngle) / subDt;
      }

      for (let i = this.balls.length - 1; i >= 0; i--) {
        const b = this.balls[i];

        if (b.onRamp) {
          this.stepRampBall(b, subDt);
          continue;
        }

        if (b.inPathOfAdventure) {
          this.stepPathOfAdventureBall(b, subDt);
          continue;
        }

        b.z = Math.max(0, b.z * 0.85);
        b.vy += this.gravity * subDt;
        b.x += b.vx * subDt;
        b.y += b.vy * subDt;

        b.vx *= 1 - 0.0007 * subDt;
        b.vy *= 1 - 0.0007 * subDt;

        if (b.inShooter && b.x < 490 && b.y < 230) {
          b.inShooter = false;
          this.emit('ball-entered-playfield', { ball: b });
        }

        const spd = Math.hypot(b.vx, b.vy);
        if (spd > this.maxSpeed) {
          b.vx = (b.vx / spd) * this.maxSpeed;
          b.vy = (b.vy / spd) * this.maxSpeed;
        }

        for (const w of this.walls) {
          this.resolveSegmentCollision(b, w.x1, w.y1, w.x2, w.y2, w.restitution);
        }

        for (const g of this.oneWayGates) {
          const dot = b.vx * g.allowDirX + b.vy * g.allowDirY;
          if (dot < 0 && !b.inShooter) {
            this.resolveSegmentCollision(b, g.x1, g.y1, g.x2, g.y2, 0.45);
          }
        }

        for (const f of this.flippers) {
          this.resolveFlipperCollision(b, f);
        }

        for (const sl of this.slingshots) {
          if (this.resolveSegmentCollision(b, sl.kickX1, sl.kickY1, sl.kickX2, sl.kickY2, 0.6)) {
            if (!this.tilted) {
              b.vx += sl.kickNormalX * 7.8;
              b.vy += sl.kickNormalY * 7.8;
              sl.flash = 1;
              this.emit('slingshot', { id: sl.id, ball: b });
            }
          }
        }

        for (const bmp of this.bumpers) {
          const dx = b.x - bmp.x;
          const dy = b.y - bmp.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b.r + bmp.r;
          if (dist < minDist && dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;
            b.x = bmp.x + nx * (minDist + 0.5);
            b.y = bmp.y + ny * (minDist + 0.5);
            if (!this.tilted) {
              const kick = 9.5;
              b.vx = nx * kick + (Math.random() - 0.5) * 1.2;
              b.vy = ny * kick + (Math.random() - 0.5) * 1.2;
              bmp.flash = 1;
              this.emit('bumper', { id: bmp.id, ball: b });
            } else {
              b.vx *= -0.5;
              b.vy *= -0.5;
            }
          }
        }

        for (const t of this.targets) {
          if (t.isDrop && t.hit) continue;
          const dx = b.x - t.x;
          const dy = b.y - t.y;
          const dist = Math.hypot(dx, dy);
          if (dist < b.r + t.r && dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;
            b.x = t.x + nx * (b.r + t.r + 0.5);
            b.y = t.y + ny * (b.r + t.r + 0.5);
            const vn = b.vx * nx + b.vy * ny;
            if (vn < 0) {
              b.vx -= 1.65 * vn * nx;
              b.vy -= 1.65 * vn * ny;
            }
            t.flash = 1;
            if (t.isDrop) t.hit = true;
            this.emit('target', { target: t, ball: b });
          }
        }

        for (const ro of this.rollovers) {
          if (ro.cooldown > 0) continue;
          const dist = Math.hypot(b.x - ro.x, b.y - ro.y);
          if (dist < ro.r + b.r * 0.5) {
            ro.cooldown = 45;
            this.emit('rollover', { rollover: ro, ball: b });
          }
        }

        for (const sc of this.saucers) {
          if (sc.cooldown > 0) continue;
          const dist = Math.hypot(b.x - sc.x, b.y - sc.y);
          if (dist < sc.r) {
            sc.cooldown = 90;
            sc.flash = 1;
            b.x = sc.x - (sc.id === 'idol-lock' ? 24 : 0);
            b.y = sc.y + sc.r + 6;
            b.vx = sc.id === 'idol-lock' ? -5.2 : (Math.random() - 0.5) * 3;
            b.vy = 5.6;
            this.emit('saucer', { saucer: sc, ball: b });
          }
        }

        for (const rm of this.ramps) {
          if (rm.cooldown > 0) continue;
          const dist = Math.hypot(b.x - rm.x, b.y - rm.y);
          if (dist < rm.r && b.vy < rm.minVy) {
            rm.cooldown = 80;
            b.onRamp = true;
            b.rampPoints = rm.path;
            b.rampSeg = 0;
            b.rampT = 0;
            this.emit('ramp', { ramp: rm, ball: b });
          }
        }

        if (b.y > this.height + 24) {
          this.balls.splice(i, 1);
          this.emit('drain', { ball: b });
        }
      }
    }

    for (const b of this.balls) {
      b.trail.push({ x: b.x, y: b.y, z: b.z });
      if (b.trail.length > 8) b.trail.shift();

      const atPlunger = b.inShooter && b.y > 780;
      if (!atPlunger && !b.onRamp) {
        const spd = Math.hypot(b.vx, b.vy);
        if (spd < 0.25) {
          b.stuckFrames++;
          if (b.stuckFrames > 75) {
            b.vx = (b.x > 280 ? -3.5 : 3.5) + (Math.random() - 0.5) * 2;
            b.vy = 3.5;
            b.stuckFrames = 0;
          }
        } else {
          b.stuckFrames = 0;
        }
      } else {
        b.stuckFrames = 0;
      }
    }
  }

  stepRampBall(b, subDt) {
    const pts = b.rampPoints;
    const p1 = pts[b.rampSeg];
    const p2 = pts[b.rampSeg + 1];
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const speed = 11.5;
    b.rampT += (speed * subDt) / Math.max(1, segLen);
    if (b.rampT >= 1) {
      b.rampSeg++;
      b.rampT = 0;
      if (b.rampSeg >= pts.length - 1) {
        b.onRamp = false;
        b.x = p2[0];
        b.y = p2[1];
        b.z = 0;
        b.vx = 0;
        b.vy = 3.8;
        return;
      }
    }
    const cur1 = pts[b.rampSeg];
    const cur2 = pts[b.rampSeg + 1];
    b.x = cur1[0] + (cur2[0] - cur1[0]) * b.rampT;
    b.y = cur1[1] + (cur2[1] - cur1[1]) * b.rampT;
    b.z = cur1[2] + (cur2[2] - cur1[2]) * b.rampT;
  }

  stepPathOfAdventureBall(b, subDt) {
    const leftPressed = this.flippers[0].pressed;
    const rightPressed = this.flippers[1].pressed;
    const steer = (rightPressed ? 0.22 : 0) - (leftPressed ? 0.22 : 0);

    b.z = 22;
    b.vx += steer * subDt;
    b.vy += 0.11 * subDt;
    b.vx *= 1 - 0.01 * subDt;
    b.x += b.vx * subDt;
    b.y += b.vy * subDt;

    if (b.x < 44) {
      b.x = 44;
      b.vx = Math.abs(b.vx) * 0.6;
    }
    if (b.x > 122) {
      b.x = 122;
      b.vx = -Math.abs(b.vx) * 0.6;
    }

    for (const peg of this.poaPegs) {
      const dx = b.x - peg.x;
      const dy = b.y - peg.y;
      const dist = Math.hypot(dx, dy);
      const minDist = b.r * 0.75 + peg.r;
      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        b.x = peg.x + nx * minDist;
        b.y = peg.y + ny * minDist;
        b.vx = nx * 3.2 + (Math.random() - 0.5) * 0.8;
        b.vy = ny * 3.2;
        this.emit('poa-peg', { ball: b });
      }
    }

    if (b.y > 350) {
      const centerHit = Math.abs(b.x - 83) < 22;
      b.inPathOfAdventure = false;
      b.z = 0;
      b.x = 88;
      b.y = 385;
      b.vx = 1.5;
      b.vy = 4.2;
      this.emit('poa-complete', { centerHit, ball: b });
    }
  }

  resolveSegmentCollision(b, x1, y1, x2, y2, restitution) {
    const abx = x2 - x1;
    const aby = y2 - y1;
    const abLenSq = abx * abx + aby * aby;
    if (abLenSq < 0.0001) return false;

    let t = ((b.x - x1) * abx + (b.y - y1) * aby) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    const cx = x1 + t * abx;
    const cy = y1 + t * aby;
    const dx = b.x - cx;
    const dy = b.y - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < b.r && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      b.x = cx + nx * (b.r + 0.1);
      b.y = cy + ny * (b.r + 0.1);

      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + restitution) * vn * nx;
        b.vy -= (1 + restitution) * vn * ny;
      }
      return true;
    }
    return false;
  }

  resolveFlipperCollision(b, f) {
    const x1 = f.x;
    const y1 = f.y;
    const x2 = f.x + Math.cos(f.angle) * f.length;
    const y2 = f.y + Math.sin(f.angle) * f.length;

    const abx = x2 - x1;
    const aby = y2 - y1;
    const abLenSq = abx * abx + aby * aby;
    let t = ((b.x - x1) * abx + (b.y - y1) * aby) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    const cx = x1 + t * abx;
    const cy = y1 + t * aby;
    const localR = f.baseRadius + (f.tipRadius - f.baseRadius) * t;
    const minDist = b.r + localR;

    const dx = b.x - cx;
    const dy = b.y - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < minDist && dist > 0.001) {
      const nx = dx / dist;
      const ny = dy / dist;
      b.x = cx + nx * (minDist + 0.4);
      b.y = cy + ny * (minDist + 0.4);

      const rx = cx - f.x;
      const ry = cy - f.y;
      const surfVx = -f.angularVel * ry;
      const surfVy = f.angularVel * rx;

      const relVx = b.vx - surfVx;
      const relVy = b.vy - surfVy;
      const relVn = relVx * nx + relVy * ny;

      if (relVn < 0) {
        const restitution = 0.55;
        b.vx -= (1 + restitution) * relVn * nx;
        b.vy -= (1 + restitution) * relVn * ny;
      }

      // Active flipper strike! Guarantee crisp, realistic upward shot
      const isSwingingUp = (f.id === 'left' && f.angularVel < -0.02) || (f.id === 'right' && f.angularVel > 0.02);
      if (isSwingingUp || (f.justFiredTimer > 0 && ny < 0.2)) {
        const power = 16.5 + t * 7.5; // 16.5 near base up to 24.0 at tip!
        // Realistic pinball shot angle: early hit (near base) shoots across, late hit (tip) shoots steeper
        const aimAngle = f.id === 'left'
          ? -Math.PI / 2 + (0.45 - t * 0.65)
          : -Math.PI / 2 - (0.45 - t * 0.65);
        b.vx = Math.cos(aimAngle) * power * 0.75 + (b.vx * 0.15);
        b.vy = Math.min(b.vy, -Math.abs(Math.sin(aimAngle) * power));
        f.justFiredTimer = 0;
      }
    }
  }
}

window.PinballPhysics = PinballPhysics;
