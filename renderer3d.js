/**
 * Real-Time 3D Pinball Cabinet & Playfield Renderer using Three.js
 */
class Pinball3DRenderer {
  constructor(threeCanvas, dmdCanvas, physics, gameState) {
    this.canvas = threeCanvas;
    this.dmdCanvas = dmdCanvas;
    this.dmdCtx = dmdCanvas.getContext('2d');
    this.physics = physics;
    this.game = gameState;
    this.frame = 0;
    this.scale = 0.025; // 560px -> 14 units, 960px -> 24 units
    this.cameraMode = 'FULL'; // 'FULL' | 'PLAYFIELD'

    this.initThree();
    this.buildRoomAndLights();
    this.buildCabinet();
    this.buildPlayfieldTexture();
    this.buildPlayfieldObjects();
    this.resize();

    window.addEventListener('resize', () => this.resize());
  }

  to3D(px, py, pz = 0) {
    return new THREE.Vector3(
      (px - 280) * this.scale,
      pz * this.scale,
      (py - 480) * this.scale
    );
  }

  initThree() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b080a);
    this.scene.fog = new THREE.FogExp2(0x0b080a, 0.012);

    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 150);
    this.applyCameraPreset();
  }

  applyCameraPreset() {
    if (this.cameraMode === 'FULL') {
      // Whole machine visible: legs, coin door, full playfield, and backbox/DMD
      this.camera.position.set(0, 22.5, 31.5);
      this.camera.lookAt(0, 11.2, -1.5);
    } else {
      // Closer playfield player view
      this.camera.position.set(0, 21.5, 19.5);
      this.camera.lookAt(0, 9.8, 1.5);
    }
  }

  toggleCamera() {
    this.cameraMode = this.cameraMode === 'FULL' ? 'PLAYFIELD' : 'FULL';
    this.applyCameraPreset();
    return this.cameraMode;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  buildRoomAndLights() {
    // Arcade Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x120d10, roughness: 0.85, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ambient & Warm Overhead Spotlight
    this.scene.add(new THREE.AmbientLight(0xffe6c2, 0.55));

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.25);
    keyLight.position.set(8, 36, 18);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 70;
    keyLight.shadow.camera.left = -18;
    keyLight.shadow.camera.right = 18;
    keyLight.shadow.camera.top = 22;
    keyLight.shadow.camera.bottom = -22;
    this.scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xff7b00, 1.2, 45);
    rimLight.position.set(-14, 22, -10);
    this.scene.add(rimLight);
  }

  buildCabinet() {
    this.machineGroup = new THREE.Group();
    this.scene.add(this.machineGroup);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x26140c, roughness: 0.6, metalness: 0.1 });
    const trimGoldMat = new THREE.MeshStandardMaterial({ color: 0xd99b26, roughness: 0.35, metalness: 0.75 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd0d5dd, roughness: 0.18, metalness: 0.92 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.5, metalness: 0.6 });

    // 4 Chrome Legs
    const legGeo = new THREE.CylinderGeometry(0.28, 0.22, 9.6, 12);
    [
      [-6.8, 4.8, 11.4],
      [6.8, 4.8, 11.4],
      [-6.8, 4.8, -11.4],
      [6.8, 4.8, -11.4]
    ].forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, chromeMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      this.machineGroup.add(leg);
    });

    // Main Cabinet Body (tilted 6.5 deg forward)
    this.playfieldGroup = new THREE.Group();
    this.playfieldGroup.position.set(0, 10.6, 0);
    this.playfieldGroup.rotation.x = 0.115; // Realistic 6.5 deg pinball slope!
    this.machineGroup.add(this.playfieldGroup);

    // Cabinet Box underneath playfield
    const cabBox = new THREE.Mesh(new THREE.BoxGeometry(14.8, 3.2, 24.8), woodMat);
    cabBox.position.set(0, -1.75, 0);
    cabBox.castShadow = true;
    cabBox.receiveShadow = true;
    this.playfieldGroup.add(cabBox);

    // Gold side decals on cabinet
    [-7.42, 7.42].forEach((sx) => {
      const decal = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 21), trimGoldMat);
      decal.position.set(sx, -1.7, 0);
      this.playfieldGroup.add(decal);
    });

    // Chrome Side Rails
    [-7.3, 7.3].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 24.6), chromeMat);
      rail.position.set(rx, 0.45, 0);
      this.playfieldGroup.add(rail);
    });

    // Chrome Lockdown Bar at front
    const lockdown = new THREE.Mesh(new THREE.BoxGeometry(15.0, 0.65, 1.0), chromeMat);
    lockdown.position.set(0, 0.35, 12.4);
    this.playfieldGroup.add(lockdown);

    // Coin Door at front of cabinet
    const coinDoor = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.3, 0.25), darkMetalMat);
    coinDoor.position.set(0, -1.8, 12.42);
    this.playfieldGroup.add(coinDoor);

    const coinBtnMat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff4400,
      emissiveIntensity: 0.9
    });
    [-0.9, 0.9].forEach((cx) => {
      const btn = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.32), coinBtnMat);
      btn.position.set(cx, -1.6, 12.45);
      this.playfieldGroup.add(btn);
    });

    // External Plunger Knob sticking out front-right
    this.plungerKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 16), chromeMat);
    this.plungerKnob.rotation.x = Math.PI / 2;
    this.plungerKnob.position.set((518 - 280) * this.scale, -1.2, 12.8);
    this.playfieldGroup.add(this.plungerKnob);

    // Glass Top Cover
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(14.2, 24.2),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.07,
        roughness: 0.05,
        metalness: 0.1
      })
    );
    glass.rotation.x = -Math.PI / 2;
    glass.position.set(0, 1.25, 0);
    this.playfieldGroup.add(glass);

    // Backbox (upright at back)
    const backbox = new THREE.Mesh(new THREE.BoxGeometry(15.2, 10.2, 2.8), woodMat);
    backbox.position.set(0, 16.5, -12.8);
    backbox.castShadow = true;
    this.machineGroup.add(backbox);

    // Backbox Gold Frame
    const bbFrame = new THREE.Mesh(new THREE.BoxGeometry(15.5, 10.5, 2.5), trimGoldMat);
    bbFrame.position.set(0, 16.5, -13.0);
    this.machineGroup.add(bbFrame);

    // Translite Banner Texture
    const transCanvas = document.createElement('canvas');
    transCanvas.width = 512;
    transCanvas.height = 256;
    const tctx = transCanvas.getContext('2d');
    const tg = tctx.createLinearGradient(0, 0, 0, 256);
    tg.addColorStop(0, '#3a1608');
    tg.addColorStop(0.5, '#7a2c0c');
    tg.addColorStop(1, '#1c0c04');
    tctx.fillStyle = tg;
    tctx.fillRect(0, 0, 512, 256);
    tctx.fillStyle = '#ffd24c';
    tctx.font = 'bold 46px Georgia, serif';
    tctx.textAlign = 'center';
    tctx.fillText('INDIANA JONES', 256, 115);
    tctx.fillStyle = '#ff9800';
    tctx.font = 'bold 20px sans-serif';
    tctx.fillText('THE PINBALL ADVENTURE', 256, 160);
    tctx.strokeStyle = '#ffd24c';
    tctx.lineWidth = 6;
    tctx.strokeRect(10, 10, 492, 236);

    const transTex = new THREE.CanvasTexture(transCanvas);
    const transMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(14.0, 6.2),
      new THREE.MeshBasicMaterial({ map: transTex })
    );
    transMesh.position.set(0, 18.1, -11.38);
    this.machineGroup.add(transMesh);

    // 3D Dot Matrix Display (DMD) on Backbox
    this.dmdTexture = new THREE.CanvasTexture(this.dmdCanvas);
    this.dmdTexture.minFilter = THREE.LinearFilter;
    const dmdMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(13.6, 3.2),
      new THREE.MeshBasicMaterial({ map: this.dmdTexture })
    );
    dmdMesh.position.set(0, 13.2, -11.36);
    this.machineGroup.add(dmdMesh);
  }

  buildPlayfieldTexture() {
    // Dynamic 560x960 canvas for playfield artwork & glowing inserts
    this.pfCanvas = document.createElement('canvas');
    this.pfCanvas.width = 560;
    this.pfCanvas.height = 960;
    this.pfCtx = this.pfCanvas.getContext('2d');
    this.pfTexture = new THREE.CanvasTexture(this.pfCanvas);

    const pfMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(14.0, 24.0),
      new THREE.MeshStandardMaterial({
        map: this.pfTexture,
        roughness: 0.35,
        metalness: 0.08
      })
    );
    pfMesh.rotation.x = -Math.PI / 2;
    pfMesh.receiveShadow = true;
    this.playfieldGroup.add(pfMesh);
  }

  buildPlayfieldObjects() {
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd9dee6, roughness: 0.15, metalness: 0.92 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b93a0, roughness: 0.3, metalness: 0.75 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5b942, roughness: 0.25, metalness: 0.8 });

    // 1. 3D Outer & Guide Walls
    for (const w of this.physics.walls) {
      const p1 = this.to3D(w.x1, w.y1, 0);
      const p2 = this.to3D(w.x2, w.y2, 0);
      const len = p1.distanceTo(p2);
      if (len < 0.01) continue;
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, len), wallMat);
      wallMesh.position.copy(p1).add(p2).multiplyScalar(0.5);
      wallMesh.position.y = 0.32;
      wallMesh.lookAt(p2.x, 0.32, p2.z);
      wallMesh.castShadow = true;
      this.playfieldGroup.add(wallMesh);
    }

    // 2. 3D Slingshots
    for (const sl of this.physics.slingshots) {
      const shape = new THREE.Shape();
      sl.pts.forEach(([x, y], idx) => {
        const vx = (x - 280) * this.scale;
        const vz = -(y - 480) * this.scale;
        if (idx === 0) shape.moveTo(vx, vz);
        else shape.lineTo(vx, vz);
      });
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: false });
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0x6e2612, roughness: 0.4, metalness: 0.3 })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.02;
      mesh.castShadow = true;
      this.playfieldGroup.add(mesh);
    }

    // 3. 3D Glowing Orange Pop Bumpers + PointLights
    this.bumperMeshes = [];
    for (const b of this.physics.bumpers) {
      const pos = this.to3D(b.x, b.y, 0);
      const grp = new THREE.Group();
      grp.position.set(pos.x, 0, pos.z);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.45, 20), chromeMat);
      base.position.y = 0.22;
      grp.add(base);

      const capMat = new THREE.MeshStandardMaterial({
        color: 0xff5500,
        emissive: 0xff4500,
        emissiveIntensity: 0.7,
        roughness: 0.2
      });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.52, 0.35, 24), capMat);
      cap.position.y = 0.55;
      cap.castShadow = true;
      grp.add(cap);

      const light = new THREE.PointLight(0xff6600, 0.5, 4.5);
      light.position.y = 1.1;
      grp.add(light);

      this.playfieldGroup.add(grp);
      this.bumperMeshes.push({ data: b, capMat, light, grp });
    }

    // 4. 3D Flippers
    this.flipperMeshes = [];
    for (const f of this.physics.flippers) {
      const pos = this.to3D(f.x, f.y, 0);
      const pivot = new THREE.Group();
      pivot.position.set(pos.x, 0.26, pos.z);

      const len = f.length * this.scale;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(len, 0.38, 0.32),
        new THREE.MeshStandardMaterial({ color: 0xf5b942, roughness: 0.3, metalness: 0.5 })
      );
      body.position.x = len / 2;
      body.castShadow = true;
      pivot.add(body);

      const rubber = new THREE.Mesh(
        new THREE.BoxGeometry(len + 0.05, 0.28, 0.38),
        new THREE.MeshStandardMaterial({ color: 0xc42118, roughness: 0.7 })
      );
      rubber.position.x = len / 2;
      pivot.add(rubber);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 16), chromeMat);
      pivot.add(cap);

      this.playfieldGroup.add(pivot);
      this.flipperMeshes.push({ data: f, pivot });
    }

    // 5. 3D Wireform Ramps
    for (const rm of this.physics.ramps) {
      const pts = rm.path.map(([x, y, z]) => this.to3D(x, y, z + 6));
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.11, 8, false);
      const tube = new THREE.Mesh(tubeGeo, chromeMat);
      tube.castShadow = true;
      this.playfieldGroup.add(tube);
    }

    // 6. 3D Path of Adventure Mini-Playfield (Upper Left)
    const poaBoard = new THREE.Mesh(
      new THREE.BoxGeometry(102 * this.scale, 0.2, 304 * this.scale),
      new THREE.MeshStandardMaterial({ color: 0x5c1810, roughness: 0.5 })
    );
    const poaCenter = this.to3D(83, 214, 16);
    poaBoard.position.copy(poaCenter);
    poaBoard.castShadow = true;
    this.playfieldGroup.add(poaBoard);

    for (const peg of this.physics.poaPegs) {
      const pPos = this.to3D(peg.x, peg.y, 20);
      const pegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.35, 12), goldMat);
      pegMesh.position.copy(pPos);
      this.playfieldGroup.add(pegMesh);
    }

    // 7. 3D Golden Idol (Right Side) + 3 Lock LEDs
    const idolPos = this.to3D(458, 425, 22);
    this.idolMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), goldMat);
    this.idolMesh.position.copy(idolPos);
    this.idolMesh.castShadow = true;
    this.playfieldGroup.add(this.idolMesh);

    this.idolLeds = [];
    for (let i = 0; i < 3; i++) {
      const ledPos = this.to3D(444 + i * 14, 455, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2200, emissiveIntensity: 0 });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), mat);
      led.position.copy(ledPos);
      this.playfieldGroup.add(led);
      this.idolLeds.push(mat);
    }

    // 8. 3D Suspended Planes (Biplane & Fighter Plane)
    this.biplaneProp = this.buildBiplane(this.to3D(278, 255, 58));
    this.fighterProp = this.buildFighterPlane(this.to3D(458, 178, 56));

    // 9. 3D Drop & Standup Targets
    this.targetMeshes = [];
    for (const t of this.physics.targets) {
      const pos = this.to3D(t.x, t.y, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: t.isDrop ? 0xffcc00 : 0xff3b1f,
        emissive: t.isDrop ? 0x664400 : 0x551100,
        emissiveIntensity: 0.4
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.32), mat);
      mesh.position.copy(pos);
      mesh.castShadow = true;
      this.playfieldGroup.add(mesh);
      this.targetMeshes.push({ data: t, mesh, mat });
    }

    // 10. Ball Pool (3D Chrome Spheres)
    this.ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.96
    });
    this.ballMeshes = [];
  }

  buildBiplane(pos) {
    const grp = new THREE.Group();
    grp.position.copy(pos);
    grp.rotation.y = 0.48;

    const wingMat = new THREE.MeshStandardMaterial({ color: 0xe2d8c5, roughness: 0.5 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xb02218, roughness: 0.4 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 1.8), bodyMat);
    body.castShadow = true;
    grp.add(body);

    const topWing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.55), wingMat);
    topWing.position.y = 0.28;
    topWing.castShadow = true;
    grp.add(topWing);

    const botWing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.5), wingMat);
    botWing.position.y = -0.1;
    grp.add(botWing);

    const prop = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.07, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8 })
    );
    prop.position.z = 0.95;
    grp.add(prop);

    this.playfieldGroup.add(grp);
    return prop;
  }

  buildFighterPlane(pos) {
    const grp = new THREE.Group();
    grp.position.copy(pos);
    grp.rotation.y = -0.55;

    const greenMat = new THREE.MeshStandardMaterial({ color: 0x566942, roughness: 0.55 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf2c12e, roughness: 0.4 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 1.9), greenMat);
    body.castShadow = true;
    grp.add(body);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.55), greenMat);
    wing.castShadow = true;
    grp.add(wing);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 12), yellowMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 1.1;
    grp.add(nose);

    const prop = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.07, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8 })
    );
    prop.position.z = 1.12;
    grp.add(prop);

    this.playfieldGroup.add(grp);
    return prop;
  }

  updatePlayfieldTexture() {
    const ctx = this.pfCtx;
    const W = 560;
    const H = 960;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#132116');
    bgGrad.addColorStop(0.35, '#1e2c1a');
    bgGrad.addColorStop(0.68, '#3d2410');
    bgGrad.addColorStop(1, '#1a0e07');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Sunburst & Indy Portrait
    const cx = 263;
    const cy = 740;
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI + (i * Math.PI) / 13;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 180, 35, 0.28)' : 'rgba(210, 80, 15, 0.18)';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 15);
      ctx.lineTo(cx + Math.cos(a - 0.08) * 165, cy + Math.sin(a - 0.08) * 165);
      ctx.lineTo(cx + Math.cos(a + 0.08) * 165, cy + Math.sin(a + 0.08) * 165);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#2d1a0e';
    ctx.beginPath();
    ctx.arc(cx, cy + 10, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5b942';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#e0ac7c';
    ctx.beginPath();
    ctx.arc(cx, cy + 16, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#6e4724';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#573619';
    ctx.fillRect(cx - 17, cy - 20, 34, 21);

    // Character Medallions
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

    // 12 Mode Inserts
    window.ADVENTURE_MODES.forEach((m, idx) => {
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
      ctx.fillRect(x - 48, y - 13, 96, 26);
      ctx.strokeRect(x - 48, y - 13, 96, 26);
      ctx.fillStyle = textCol;
      ctx.font = 'bold 8.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.name.toUpperCase(), x, y + 3);
    });

    // Multiplier & Eternal Life
    ctx.fillStyle = this.game.multiplier > 1 ? '#ffae00' : '#3a2210';
    ctx.beginPath();
    ctx.arc(263, 610, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffe07a';
    ctx.stroke();
    ctx.fillStyle = this.game.multiplier > 1 ? '#1a0a00' : '#f5b942';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${this.game.multiplier}X`, 263, 615);

    const blink = this.game.eternalLifeTimer > 0 && Math.floor(this.frame / 8) % 2 === 0;
    ctx.fillStyle = blink ? '#ff3b1f' : '#3d120c';
    ctx.beginPath();
    ctx.moveTo(263, 818);
    ctx.lineTo(240, 860);
    ctx.lineTo(286, 860);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffaa44';
    ctx.stroke();
    ctx.fillStyle = blink ? '#ffffff' : '#ffaa44';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('ETERNAL', 263, 845);
    ctx.fillText('LIFE', 263, 854);

    // I-N-D-Y Rollovers
    for (const ro of this.physics.rollovers) {
      ctx.fillStyle = ro.lit ? '#ffb703' : '#2a2016';
      ctx.beginPath();
      ctx.arc(ro.x, ro.y, ro.r - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffe07a';
      ctx.stroke();
      ctx.fillStyle = ro.lit ? '#1a0a00' : '#e0c692';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(ro.label, ro.x, ro.y + 4);
    }

    // Mode Start & Ramp Labels
    ctx.fillStyle = '#ffe07a';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('MODE START', 204, 345);
    ctx.fillText('JACKPOT / POA', 168, 305);
    ctx.fillText('DOGFIGHT RAMP', 416, 290);

    this.pfTexture.needsUpdate = true;
  }

  renderDMD() {
    const ctx = this.dmdCtx;
    const W = this.dmdCanvas.width;
    const H = this.dmdCanvas.height;

    ctx.fillStyle = '#090401';
    ctx.fillRect(0, 0, W, H);

    if (this.game.miniGame) {
      if (this.game.miniGame.type === 'grail') {
        ctx.fillStyle = '#ffd54f';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`CHOOSE WISELY! (${Math.ceil(this.game.miniGame.timer / 60)}s)`, W / 2, 26);
        [130, 256, 382].forEach((x, idx) => {
          const selected = this.game.miniGame.cursor === idx;
          ctx.strokeStyle = selected ? '#ffffff' : '#ff8c00';
          ctx.lineWidth = selected ? 3 : 1.5;
          ctx.strokeRect(x - 30, 38, 60, 56);
          ctx.fillStyle = selected ? '#ffd54f' : '#ff8c00';
          ctx.fillRect(x - 10, 48, 20, 22);
          ctx.fillRect(x - 3, 70, 6, 16);
        });
        ctx.fillStyle = '#ff9800';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('CTRL (LINKS) / PFEIL → (RECHTS)', W / 2, 116);
        this.dmdTexture.needsUpdate = true;
        return;
      } else if (this.game.miniGame.type === 'minecart') {
        ctx.fillStyle = '#ffd54f';
        ctx.font = 'bold 17px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`MINE CART (${this.game.miniGame.dodged}/5) - CTRL / PFEIL →`, W / 2, 22);
        const lanes = [150, 256, 362];
        ctx.strokeStyle = '#ff8c00';
        lanes.forEach((lx) => {
          ctx.beginPath();
          ctx.moveTo(lx, 32);
          ctx.lineTo(lx, 116);
          ctx.stroke();
        });
        const ox = lanes[this.game.miniGame.obstacleLane];
        const oy = 34 + this.game.miniGame.obstacleProgress * 76;
        ctx.fillStyle = '#ff3d00';
        ctx.beginPath();
        ctx.arc(ox, oy, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(lanes[this.game.miniGame.lane] - 16, 98, 32, 16);
        this.dmdTexture.needsUpdate = true;
        return;
      }
    }

    ctx.fillStyle = '#ff8c00';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.floor(this.game.score).toLocaleString('de-DE'), W / 2, 50);

    ctx.fillStyle = '#ffb74d';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`BALL ${this.game.ballNumber}/${this.game.maxBalls}`, 14, 24);
    ctx.textAlign = 'right';
    ctx.fillText(`${this.game.multiplier}X`, W - 14, 24);

    ctx.textAlign = 'center';
    if (this.game.dmdBanner.timer > 0) {
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 21px monospace';
      ctx.fillText(this.game.dmdBanner.title, W / 2, 86);
      ctx.fillStyle = '#ff9800';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(this.game.dmdBanner.subtitle, W / 2, 112);
    } else if (this.game.activeMode) {
      const m = this.game.activeMode;
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`${m.mode.name.toUpperCase()} (${Math.ceil(m.timer / 60)}s)`, W / 2, 86);
      ctx.fillStyle = '#ff9800';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`FORTSCHRITT: ${m.progress} / ${m.mode.goal}`, W / 2, 112);
    } else {
      ctx.fillStyle = '#ff9800';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('TRIFF MODE START ODER IDOL LOCK!', W / 2, 102);
    }

    this.dmdTexture.needsUpdate = true;
  }

  render(plungerPull = 0) {
    this.frame++;

    // Update Playfield & DMD Textures
    if (this.frame % 3 === 0) this.updatePlayfieldTexture();
    this.renderDMD();

    // Sync Flippers
    for (const fm of this.flipperMeshes) {
      fm.pivot.rotation.y = -fm.data.angle;
    }

    // Sync Bumpers
    for (const bm of this.bumperMeshes) {
      bm.capMat.emissiveIntensity = 0.6 + bm.data.flash * 2.5;
      bm.light.intensity = 0.4 + bm.data.flash * 3.0;
      bm.grp.position.y = -bm.data.flash * 0.08;
    }

    // Sync Targets
    for (const tm of this.targetMeshes) {
      if (tm.data.isDrop) {
        tm.mesh.visible = !tm.data.hit;
      }
      tm.mat.emissiveIntensity = 0.35 + tm.data.flash * 2.0;
    }

    // Sync Idol & Lock LEDs
    this.idolMesh.rotation.y += 0.015;
    for (let i = 0; i < 3; i++) {
      const lit = i < this.game.idolLocks || this.game.multiballActive;
      this.idolLeds[i].emissiveIntensity = lit ? 2.2 : 0;
    }

    // Spin Propellers
    this.biplaneProp.rotation.z += 0.45;
    this.fighterProp.rotation.z += 0.5;

    // Plunger Knob Pull
    this.plungerKnob.position.z = 12.8 + plungerPull * 1.1;

    // Sync 3D Balls
    while (this.ballMeshes.length < this.physics.balls.length) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(11 * this.scale, 24, 24),
        this.ballMat
      );
      sphere.castShadow = true;
      this.playfieldGroup.add(sphere);
      this.ballMeshes.push(sphere);
    }
    for (let i = 0; i < this.ballMeshes.length; i++) {
      const mesh = this.ballMeshes[i];
      const b = this.physics.balls[i];
      if (b) {
        mesh.visible = true;
        const pos = this.to3D(b.x, b.y, (b.z || 0) + 11);
        mesh.position.copy(pos);
      } else {
        mesh.visible = false;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.Pinball3DRenderer = Pinball3DRenderer;
