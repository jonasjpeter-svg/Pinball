/**
 * Photorealistic 3D Pinball Cabinet & Playfield Renderer (Three.js PBR + Clearcoat + Chrome EnvMap)
 */
class Pinball3DRenderer {
  constructor(threeCanvas, dmdCanvas, physics, gameState) {
    this.canvas = threeCanvas;
    this.dmdCanvas = dmdCanvas;
    this.dmdCtx = dmdCanvas.getContext('2d');
    this.physics = physics;
    this.game = gameState;
    this.frame = 0;
    this.scale = 0.025;
    this.cameraMode = 'FULL';

    this.initThree();
    this.buildEnvironmentMap();
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
    this.renderer.toneMappingExposure = 1.18;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090708);
    this.scene.fog = new THREE.FogExp2(0x090708, 0.01);

    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 150);
    this.applyCameraPreset();
  }

  buildEnvironmentMap() {
    // Procedural arcade studio lightboxes for realistic chrome & clearcoat reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x1a120d);

    const panelGeo = new THREE.PlaneGeometry(18, 10);
    const warmPanel = new THREE.MeshBasicMaterial({ color: 0xffe4b5, side: THREE.DoubleSide });
    const coolPanel = new THREE.MeshBasicMaterial({ color: 0xdbeafe, side: THREE.DoubleSide });
    const amberPanel = new THREE.MeshBasicMaterial({ color: 0xff8c1a, side: THREE.DoubleSide });

    const top1 = new THREE.Mesh(panelGeo, warmPanel);
    top1.position.set(0, 14, 2);
    top1.rotation.x = Math.PI / 2;
    envScene.add(top1);

    const side1 = new THREE.Mesh(panelGeo, coolPanel);
    side1.position.set(-14, 6, 0);
    side1.rotation.y = Math.PI / 2;
    envScene.add(side1);

    const side2 = new THREE.Mesh(panelGeo, amberPanel);
    side2.position.set(14, 6, 0);
    side2.rotation.y = -Math.PI / 2;
    envScene.add(side2);

    this.envMap = pmrem.fromScene(envScene, 0.04).texture;
    this.scene.environment = this.envMap;
    pmrem.dispose();
  }

  applyCameraPreset() {
    if (this.cameraMode === 'FULL') {
      this.camera.position.set(0, 22.5, 31.5);
      this.camera.lookAt(0, 11.2, -1.5);
    } else {
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
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x100c0e, roughness: 0.85, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.scene.add(new THREE.AmbientLight(0xffe6c2, 0.5));

    const keyLight = new THREE.DirectionalLight(0xfff3dc, 1.35);
    keyLight.position.set(7, 36, 18);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 70;
    keyLight.shadow.camera.left = -18;
    keyLight.shadow.camera.right = 18;
    keyLight.shadow.camera.top = 22;
    keyLight.shadow.camera.bottom = -22;
    this.scene.add(keyLight);

    const warmSpot = new THREE.PointLight(0xff881a, 1.1, 45);
    warmSpot.position.set(0, 22, -4);
    this.scene.add(warmSpot);
  }

  buildCabinet() {
    this.machineGroup = new THREE.Group();
    this.scene.add(this.machineGroup);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x24130b, roughness: 0.45, metalness: 0.12 });
    const trimGoldMat = new THREE.MeshStandardMaterial({ color: 0xd99b26, roughness: 0.28, metalness: 0.82 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe6eaf0, roughness: 0.08, metalness: 0.98 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.4, metalness: 0.7 });

    // 4 Chrome Legs
    const legGeo = new THREE.CylinderGeometry(0.28, 0.22, 9.6, 16);
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
    this.playfieldGroup.rotation.x = 0.115;
    this.machineGroup.add(this.playfieldGroup);

    const cabBox = new THREE.Mesh(new THREE.BoxGeometry(14.8, 3.2, 24.8), woodMat);
    cabBox.position.set(0, -1.75, 0);
    cabBox.castShadow = true;
    cabBox.receiveShadow = true;
    this.playfieldGroup.add(cabBox);

    [-7.42, 7.42].forEach((sx) => {
      const decal = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 21), trimGoldMat);
      decal.position.set(sx, -1.7, 0);
      this.playfieldGroup.add(decal);
    });

    [-7.3, 7.3].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 24.6), chromeMat);
      rail.position.set(rx, 0.45, 0);
      this.playfieldGroup.add(rail);
    });

    const lockdown = new THREE.Mesh(new THREE.BoxGeometry(15.0, 0.65, 1.0), chromeMat);
    lockdown.position.set(0, 0.35, 12.4);
    this.playfieldGroup.add(lockdown);

    const coinDoor = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.3, 0.25), darkMetalMat);
    coinDoor.position.set(0, -1.8, 12.42);
    this.playfieldGroup.add(coinDoor);

    const coinBtnMat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff4400,
      emissiveIntensity: 1.0
    });
    [-0.9, 0.9].forEach((cx) => {
      const btn = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.32), coinBtnMat);
      btn.position.set(cx, -1.6, 12.45);
      this.playfieldGroup.add(btn);
    });

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
        opacity: 0.06,
        roughness: 0.04,
        metalness: 0.1,
        clearcoat: 1.0
      })
    );
    glass.rotation.x = -Math.PI / 2;
    glass.position.set(0, 1.35, 0);
    this.playfieldGroup.add(glass);

    // Backbox
    const backbox = new THREE.Mesh(new THREE.BoxGeometry(15.2, 10.2, 2.8), woodMat);
    backbox.position.set(0, 16.5, -12.8);
    backbox.castShadow = true;
    this.machineGroup.add(backbox);

    const bbFrame = new THREE.Mesh(new THREE.BoxGeometry(15.5, 10.5, 2.5), trimGoldMat);
    bbFrame.position.set(0, 16.5, -13.0);
    this.machineGroup.add(bbFrame);

    // Translite
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
    // High-res 1120x1920 playfield canvas (2x scale) for crisp 1:1 Williams artwork
    this.pfCanvas = document.createElement('canvas');
    this.pfCanvas.width = 1120;
    this.pfCanvas.height = 1920;
    this.pfCtx = this.pfCanvas.getContext('2d');
    this.pfCtx.scale(2, 2);
    this.pfTexture = new THREE.CanvasTexture(this.pfCanvas);
    this.pfTexture.anisotropy = 8;

    // Clearcoated lacquered wood material!
    const pfMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(14.0, 24.0),
      new THREE.MeshPhysicalMaterial({
        map: this.pfTexture,
        roughness: 0.16,
        metalness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.07
      })
    );
    pfMesh.rotation.x = -Math.PI / 2;
    pfMesh.receiveShadow = true;
    this.playfieldGroup.add(pfMesh);
  }

  buildPlayfieldObjects() {
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.07, metalness: 0.98 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x9aa2b0, roughness: 0.18, metalness: 0.85 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5b942, roughness: 0.22, metalness: 0.88 });

    // 1. 3D Outer & Guide Walls
    for (const w of this.physics.walls) {
      const p1 = this.to3D(w.x1, w.y1, 0);
      const p2 = this.to3D(w.x2, w.y2, 0);
      const len = p1.distanceTo(p2);
      if (len < 0.01) continue;
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.68, len), wallMat);
      wallMesh.position.copy(p1).add(p2).multiplyScalar(0.5);
      wallMesh.position.y = 0.34;
      wallMesh.lookAt(p2.x, 0.34, p2.z);
      wallMesh.castShadow = true;
      this.playfieldGroup.add(wallMesh);
    }

    // 2. 3D Slingshots with chrome posts & red rubber
    for (const sl of this.physics.slingshots) {
      const shape = new THREE.Shape();
      sl.pts.forEach(([x, y], idx) => {
        const vx = (x - 280) * this.scale;
        const vz = -(y - 480) * this.scale;
        if (idx === 0) shape.moveTo(vx, vz);
        else shape.lineTo(vx, vz);
      });
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.56, bevelEnabled: false });
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0x7a2610, roughness: 0.35, metalness: 0.25 })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.02;
      mesh.castShadow = true;
      this.playfieldGroup.add(mesh);

      // Chrome corner posts on slingshots
      sl.pts.forEach(([x, y]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.72, 12), chromeMat);
        const pos = this.to3D(x, y, 14);
        post.position.copy(pos);
        this.playfieldGroup.add(post);
      });
    }

    // 3. 3D Glowing Orange Pop Bumpers
    this.bumperMeshes = [];
    for (const b of this.physics.bumpers) {
      const pos = this.to3D(b.x, b.y, 0);
      const grp = new THREE.Group();
      grp.position.set(pos.x, 0, pos.z);

      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, 0.35, 24), chromeMat);
      skirt.position.y = 0.18;
      grp.add(skirt);

      const capMat = new THREE.MeshPhysicalMaterial({
        color: 0xff4d00,
        emissive: 0xff3b00,
        emissiveIntensity: 0.8,
        roughness: 0.12,
        clearcoat: 1.0
      });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.54, 0.38, 28), capMat);
      cap.position.y = 0.55;
      cap.castShadow = true;
      grp.add(cap);

      const light = new THREE.PointLight(0xff6600, 0.6, 5.0);
      light.position.y = 1.1;
      grp.add(light);

      this.playfieldGroup.add(grp);
      this.bumperMeshes.push({ data: b, capMat, light, grp });
    }

    // 4. 3D Flippers (flush with inlane guides, no protruding round step!)
    this.flipperMeshes = [];
    for (const f of this.physics.flippers) {
      const pos = this.to3D(f.x, f.y, 0);
      const pivot = new THREE.Group();
      pivot.position.set(pos.x, 0.28, pos.z);

      const len = f.length * this.scale;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(len, 0.4, 0.32),
        new THREE.MeshStandardMaterial({ color: 0xf5b942, roughness: 0.25, metalness: 0.45 })
      );
      body.position.x = len / 2;
      body.castShadow = true;
      pivot.add(body);

      const rubber = new THREE.Mesh(
        new THREE.BoxGeometry(len + 0.04, 0.3, 0.38),
        new THREE.MeshStandardMaterial({ color: 0xb81d13, roughness: 0.65 })
      );
      rubber.position.x = len / 2;
      pivot.add(rubber);

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.41, 16),
        new THREE.MeshStandardMaterial({ color: 0xf5b942, roughness: 0.25, metalness: 0.45 })
      );
      pivot.add(cap);

      this.playfieldGroup.add(pivot);
      this.flipperMeshes.push({ data: f, pivot });
    }

    // 5. Dual-Rail 3D Wireform Ramps (authentic parallel chrome wires!)
    for (const rm of this.physics.ramps) {
      [-5, 5].forEach((offset) => {
        const pts = rm.path.map(([x, y, z]) => this.to3D(x + offset, y, z + 6));
        const curve = new THREE.CatmullRomCurve3(pts);
        const tubeGeo = new THREE.TubeGeometry(curve, 44, 0.065, 8, false);
        const tube = new THREE.Mesh(tubeGeo, chromeMat);
        tube.castShadow = true;
        this.playfieldGroup.add(tube);
      });
    }

    // 6. 3D Path of Adventure Mini-Playfield (Upper Left)
    const poaBoard = new THREE.Mesh(
      new THREE.BoxGeometry(102 * this.scale, 0.22, 304 * this.scale),
      new THREE.MeshStandardMaterial({ color: 0x5c1810, roughness: 0.45 })
    );
    poaBoard.position.copy(this.to3D(83, 214, 16));
    poaBoard.castShadow = true;
    this.playfieldGroup.add(poaBoard);

    for (const peg of this.physics.poaPegs) {
      const pegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.36, 12), goldMat);
      pegMesh.position.copy(this.to3D(peg.x, peg.y, 20));
      this.playfieldGroup.add(pegMesh);
    }

    // 7. 3D Golden Idol (Right Side) + 3 Lock LEDs
    this.idolMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), goldMat);
    this.idolMesh.position.copy(this.to3D(458, 425, 22));
    this.idolMesh.castShadow = true;
    this.playfieldGroup.add(this.idolMesh);

    this.idolLeds = [];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2200, emissiveIntensity: 0 });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), mat);
      led.position.copy(this.to3D(444 + i * 14, 455, 6));
      this.playfieldGroup.add(led);
      this.idolLeds.push(mat);
    }

    // 8. 3D Biplane & Fighter Plane
    this.biplaneProp = this.buildBiplane(this.to3D(278, 255, 58));
    this.fighterProp = this.buildFighterPlane(this.to3D(458, 178, 56));

    // 9. 3D Drop & Standup Targets
    this.targetMeshes = [];
    for (const t of this.physics.targets) {
      const mat = new THREE.MeshStandardMaterial({
        color: t.isDrop ? 0xffcc00 : 0xff3b1f,
        emissive: t.isDrop ? 0x664400 : 0x551100,
        emissiveIntensity: 0.4
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.32), mat);
      mesh.position.copy(this.to3D(t.x, t.y, 8));
      mesh.castShadow = true;
      this.playfieldGroup.add(mesh);
      this.targetMeshes.push({ data: t, mesh, mat });
    }

    // 10. Chrome Steel Pinballs
    this.ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.05,
      metalness: 1.0
    });
    this.ballMeshes = [];
  }

  buildBiplane(pos) {
    const grp = new THREE.Group();
    grp.position.copy(pos);
    grp.rotation.y = 0.48;

    const wingMat = new THREE.MeshStandardMaterial({ color: 0xe2d8c5, roughness: 0.4 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xb02218, roughness: 0.35 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 1.85), bodyMat);
    body.castShadow = true;
    grp.add(body);

    const topWing = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.08, 0.55), wingMat);
    topWing.position.y = 0.3;
    topWing.castShadow = true;
    grp.add(topWing);

    const botWing = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.08, 0.5), wingMat);
    botWing.position.y = -0.1;
    grp.add(botWing);

    const prop = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.07, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9 })
    );
    prop.position.z = 0.98;
    grp.add(prop);

    this.playfieldGroup.add(grp);
    return prop;
  }

  buildFighterPlane(pos) {
    const grp = new THREE.Group();
    grp.position.copy(pos);
    grp.rotation.y = -0.55;

    const greenMat = new THREE.MeshStandardMaterial({ color: 0x566942, roughness: 0.45 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf2c12e, roughness: 0.35 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 1.9), greenMat);
    body.castShadow = true;
    grp.add(body);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.08, 0.55), greenMat);
    wing.castShadow = true;
    grp.add(wing);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 12), yellowMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 1.1;
    grp.add(nose);

    const prop = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.07, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9 })
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

    // Rich temple & jungle playfield base
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#162819');
    bgGrad.addColorStop(0.32, '#22331c');
    bgGrad.addColorStop(0.65, '#472810');
    bgGrad.addColorStop(1, '#1a0e06');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Jungle palm fronds along sides
    ctx.fillStyle = 'rgba(20, 74, 32, 0.55)';
    for (let y = 110; y < 740; y += 68) {
      ctx.beginPath();
      ctx.ellipse(38, y, 30, 11, 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(482, y, 30, 11, -0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Golden Sunburst behind Indy
    const cx = 263;
    const cy = 740;
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI + (i * Math.PI) / 15;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 195, 45, 0.34)' : 'rgba(215, 75, 15, 0.2)';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 18);
      ctx.lineTo(cx + Math.cos(a - 0.07) * 180, cy + Math.sin(a - 0.07) * 180);
      ctx.lineTo(cx + Math.cos(a + 0.07) * 180, cy + Math.sin(a + 0.07) * 180);
      ctx.closePath();
      ctx.fill();
    }

    // Detailed Shaded Indy Portrait
    ctx.fillStyle = '#26140a';
    ctx.beginPath();
    ctx.arc(cx, cy + 12, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5b942';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Face shading
    const faceGrad = ctx.createRadialGradient(cx - 5, cy + 12, 4, cx, cy + 16, 22);
    faceGrad.addColorStop(0, '#ecc194');
    faceGrad.addColorStop(1, '#b57b4c');
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.arc(cx, cy + 18, 21, 0, Math.PI * 2);
    ctx.fill();

    // Fedora Hat with brim shadow
    ctx.fillStyle = '#4a2c13';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 36, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6e4522';
    ctx.fillRect(cx - 18, cy - 20, 36, 22);
    ctx.fillStyle = '#261508';
    ctx.fillRect(cx - 18, cy - 4, 36, 4);

    // Eyes & Nose (realistic minimal shading, not smiley)
    ctx.fillStyle = '#2b180c';
    ctx.fillRect(cx - 9, cy + 13, 5, 2.5);
    ctx.fillRect(cx + 4, cy + 13, 5, 2.5);
    ctx.strokeStyle = '#7c4824';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 15);
    ctx.lineTo(cx - 1, cy + 23);
    ctx.lineTo(cx + 2, cy + 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 29);
    ctx.lineTo(cx + 6, cy + 29);
    ctx.stroke();

    // Character Medallions
    const chars = [
      { name: 'WILLIE', x: 204, y: 695, col: '#f2c96d' },
      { name: 'SALLAH', x: 263, y: 662, col: '#d9483b' },
      { name: 'MARION', x: 322, y: 695, col: '#b8683c' },
      { name: 'SHORTY', x: 196, y: 762, col: '#69b4e8' },
      { name: 'DR.JONES', x: 330, y: 762, col: '#8ca894' }
    ];
    chars.forEach((c) => {
      ctx.fillStyle = '#1b110a';
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

    // 12 Beveled Acrylic Mode Inserts
    window.ADVENTURE_MODES.forEach((m, idx) => {
      const isLeft = idx < 6;
      const row = isLeft ? idx : idx - 6;
      const x = isLeft ? 196 : 330;
      const y = 415 + row * 38;
      const isActive = this.game.activeMode && this.game.activeMode.mode.id === m.id;
      const isDone = this.game.completedModes.has(m.id);

      let fill = 'rgba(34, 22, 12, 0.9)';
      let stroke = '#a87c32';
      let textCol = '#e6d0a5';
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

    // Egyptian Winged Apron at bottom
    ctx.fillStyle = '#140c06';
    ctx.beginPath();
    ctx.moveTo(0, 845);
    ctx.lineTo(170, 930);
    ctx.lineTo(356, 930);
    ctx.lineTo(560, 845);
    ctx.lineTo(560, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d99b38';
    ctx.lineWidth = 3;
    ctx.stroke();

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

    if (this.frame % 3 === 0) this.updatePlayfieldTexture();
    this.renderDMD();

    for (const fm of this.flipperMeshes) {
      fm.pivot.rotation.y = -fm.data.angle;
    }

    for (const bm of this.bumperMeshes) {
      bm.capMat.emissiveIntensity = 0.6 + bm.data.flash * 2.8;
      bm.light.intensity = 0.5 + bm.data.flash * 3.2;
      bm.grp.position.y = -bm.data.flash * 0.08;
    }

    for (const tm of this.targetMeshes) {
      if (tm.data.isDrop) {
        tm.mesh.visible = !tm.data.hit;
      }
      tm.mat.emissiveIntensity = 0.35 + tm.data.flash * 2.0;
    }

    this.idolMesh.rotation.y += 0.015;
    for (let i = 0; i < 3; i++) {
      const lit = i < this.game.idolLocks || this.game.multiballActive;
      this.idolLeds[i].emissiveIntensity = lit ? 2.2 : 0;
    }

    this.biplaneProp.rotation.z += 0.45;
    this.fighterProp.rotation.z += 0.5;
    this.plungerKnob.position.z = 12.8 + plungerPull * 1.1;

    while (this.ballMeshes.length < this.physics.balls.length) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(11 * this.scale, 28, 28),
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
        mesh.position.copy(this.to3D(b.x, b.y, (b.z || 0) + 11));
      } else {
        mesh.visible = false;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.Pinball3DRenderer = Pinball3DRenderer;
