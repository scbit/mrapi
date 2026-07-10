const functions = require("@google-cloud/functions-framework");

functions.http("helloHttp", async (req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");

  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>MRAPI CAM Dental</title>

  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; background: #020617; color: white; overflow: hidden; }
    header { height: 68px; padding: 18px 28px; background: #020617; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }
    h1 { margin: 0; font-size: 26px; letter-spacing: 0.3px; }
    .badge { background: #064e3b; color: #d1fae5; padding: 8px 12px; border-radius: 8px; font-size: 13px; }
    .layout { display: grid; grid-template-columns: 330px 1fr 390px; height: calc(100vh - 68px); }
    .panel { padding: 22px 16px; background: #111827; border-right: 1px solid #334155; overflow-y: auto; }
    .right { border-right: none; border-left: 1px solid #334155; }
    h2 { margin-top: 22px; margin-bottom: 16px; font-size: 22px; }
    h3 { margin-top: 0; font-size: 18px; }
    button, .upload-label { width: 100%; padding: 13px; margin-bottom: 12px; border: none; border-radius: 8px; background: #2563eb; color: white; font-size: 15px; cursor: pointer; text-align: center; display: block; }
    button.secondary { background: #374151; }
    button.danger { background: #7f1d1d; }
    button.success { background: #047857; }
    button.active { background: #0f766e; box-shadow: inset 0 0 0 1px #5eead4; }
    label { display: block; margin-top: 14px; margin-bottom: 6px; color: #cbd5e1; font-size: 14px; }
    select, input { width: 100%; padding: 11px; border-radius: 6px; border: 1px solid #475569; background: #020617; color: white; font-size: 14px; }
    input[type="file"] { display: none; }
    #viewer { width: 100%; height: 100%; background: radial-gradient(circle, #1e293b, #020617); position: relative; }
    #viewer.out-of-disc { box-shadow: inset 0 0 0 3px rgba(248, 113, 113, 0.75); }
    .viewer-toolbar { position: absolute; top: 14px; left: 14px; z-index: 10; display: flex; gap: 8px; }
    .viewer-toolbar button { width: auto; padding: 8px 12px; margin: 0; background: rgba(15, 23, 42, 0.85); border: 1px solid #475569; font-size: 13px; }
    .info-card { margin-top: 16px; padding: 13px; border-radius: 8px; background: #020617; border: 1px solid #334155; font-size: 14px; color: #cbd5e1; line-height: 1.45; }
    .status { margin-top: 20px; padding: 12px; border-radius: 8px; background: #064e3b; color: #d1fae5; font-size: 14px; }
    .warning { background: #78350f; color: #ffedd5; }
    .error { background: #7f1d1d; color: #fee2e2; }
    .metric { display: flex; justify-content: space-between; border-bottom: 1px solid #334155; padding: 8px 0; font-size: 14px; gap: 10px; }
    .metric span:first-child { color: #94a3b8; }
    .metric span:last-child { color: white; font-weight: bold; text-align: right; }
  </style>
</head>

<body>
  <header>
    <h1>MRAPI CAM Dental</h1>
    <div class="badge">Cloud Run activo · Nesting manual STL</div>
  </header>

  <div class="layout">
    <aside class="panel">
      <h2>Proyecto</h2>
      <label class="upload-label" for="stlInput">Importar STL</label>
      <input id="stlInput" type="file" accept=".stl" />
      <button class="success" onclick="saveProjectJSON()">Guardar proyecto JSON</button>
      <button class="secondary" onclick="triggerProjectLoad()">Cargar proyecto JSON</button>
      <input id="projectInput" type="file" accept=".json,application/json" />
      <button class="secondary" onclick="centerModel()">Centrar pieza</button>
      <button class="secondary" onclick="resetView()">Reset vista</button>
      <button class="danger" onclick="clearModel()">Eliminar STL</button>

      <label>Material</label>
      <select id="material"><option>Zirconio</option><option>PMMA</option><option>Cera</option><option>Disilicato</option><option>Titanio</option><option>CoCr</option></select>
      <label>Disco</label>
      <select id="discSize" onchange="updateDisc()"><option value="98,20">98 mm x 20 mm</option><option value="98,16">98 mm x 16 mm</option><option value="98,25">98 mm x 25 mm</option><option value="95,20">95 mm x 20 mm</option></select>
      <label>Máquina</label>
      <select id="machine"><option>Fresadora Dental 4 ejes</option><option>Fresadora Dental 5 ejes</option></select>
      <div id="statusBox" class="status">Listo para importar un STL dental.</div>
      <div class="info-card"><b>Etapa actual:</b><br>Nesting manual con selección, movimiento, rotación, validación y guardado JSON.</div>
    </aside>

    <main id="viewer">
      <div class="viewer-toolbar"><button onclick="viewTop()">Superior</button><button onclick="viewFront()">Frontal</button><button onclick="viewSide()">Lateral</button><button onclick="toggleWireframe()">Wireframe</button></div>
    </main>

    <aside class="panel right">
      <h2>Nesting</h2>
      <button id="moveModeBtn" class="active" onclick="setTransformMode('translate')">Modo mover</button>
      <button id="rotateModeBtn" class="secondary" onclick="setTransformMode('rotate')">Modo rotar</button>
      <button class="secondary" onclick="rotateModel(-15)">Rotar -15°</button>
      <button class="secondary" onclick="rotateModel(15)">Rotar +15°</button>
      <button class="secondary" onclick="rotateModel(-90)">Rotar Z -90°</button>
      <button class="secondary" onclick="rotateModel(90)">Rotar Z +90°</button>
      <button class="secondary" onclick="flipModel('x')">Voltear X 180°</button>
      <button class="secondary" onclick="flipModel('y')">Voltear Y 180°</button>
      <button class="secondary" onclick="supportCurrentModel()">Apoyar sobre disco</button>
      <label>Posición X</label><input id="posX" value="0.00 mm" readonly />
      <label>Posición Y</label><input id="posY" value="0.00 mm" readonly />
      <label>Posición Z</label><input id="posZ" value="0.00 mm" readonly />
      <label>Rotación Z</label><input id="rotationZ" value="0°" readonly />
      <label>Estado dentro del disco</label><input id="discState" value="-" readonly />
      <label>Herramienta</label><select><option>Fresa 2.0 mm</option><option>Fresa 1.0 mm</option><option>Fresa 0.6 mm</option><option>Fresa 0.3 mm</option></select>
      <div class="info-card"><h3>Medidas STL</h3><div class="metric"><span>Ancho X</span><span id="sizeX">-</span></div><div class="metric"><span>Profundidad Y</span><span id="sizeY">-</span></div><div class="metric"><span>Altura Z</span><span id="sizeZ">-</span></div><div class="metric"><span>Triángulos</span><span id="triangles">-</span></div><div class="metric"><span>Estado disco</span><span id="discCheck">-</span></div></div>
      <button class="success" style="margin-top: 20px;" onclick="fakeToolpath()">Calcular trayectorias</button>
      <button class="secondary" onclick="fakeExport()">Exportar G-code</button>
    </aside>
  </div>

  <script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>

  <script type="module">
    import * as THREE from "three";
    import { OrbitControls } from "three/addons/controls/OrbitControls.js";
    import { TransformControls } from "three/addons/controls/TransformControls.js";
    import { STLLoader } from "three/addons/loaders/STLLoader.js";

    let scene, camera, renderer, controls, transformControls;
    let model = null, disc = null, selectionBox = null, selectedModel = null;
    let discDiameter = 98, discHeight = 20, wireframe = false, currentMode = "translate", lockedZ = 0, loadedFileName = "";
    let modelStats = { size: { x: 0, y: 0, z: 0 }, triangles: 0 };
    const viewer = document.getElementById("viewer");
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    init();
    animate();

    function init() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020617);
      camera = new THREE.PerspectiveCamera(45, viewer.clientWidth / viewer.clientHeight, 0.1, 2000);
      camera.up.set(0, 0, 1);
      camera.position.set(120, 120, 120);
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(viewer.clientWidth, viewer.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      viewer.appendChild(renderer.domElement);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      transformControls = new TransformControls(camera, renderer.domElement);
      transformControls.setMode(currentMode);
      transformControls.setSpace("world");
      transformControls.size = 0.85;
      configureTransformAxes();
      scene.add(transformControls);
      transformControls.addEventListener("dragging-changed", function(event) { controls.enabled = !event.value; });
      transformControls.addEventListener("objectChange", function() {
        if (!model) return;
        supportModelOnDisc(model);
        updateModelStats();
        updatePlacementUI();
        checkDiscFit();
      });
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const dir1 = new THREE.DirectionalLight(0xffffff, 1.2); dir1.position.set(80, 120, 100); scene.add(dir1);
      const dir2 = new THREE.DirectionalLight(0xffffff, 0.6); dir2.position.set(-100, -80, 80); scene.add(dir2);
      const grid = new THREE.GridHelper(140, 28, 0x334155, 0x1e293b); grid.rotation.x = Math.PI / 2; scene.add(grid);
      scene.add(new THREE.AxesHelper(60));
      createDisc();
      window.addEventListener("resize", onResize);
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      document.getElementById("stlInput").addEventListener("change", loadSTL);
      document.getElementById("projectInput").addEventListener("change", loadProjectJSON);
    }

    function createDisc() {
      if (disc) {
        scene.remove(disc);
      }

      const group = new THREE.Group();

      const geometry = new THREE.CylinderGeometry(
        discDiameter / 2,
        discDiameter / 2,
        discHeight,
        128,
        1,
        true
      );

      // Three.js crea el cilindro con altura en Y.
      // Lo rotamos para que la altura quede en Z.
      geometry.rotateX(Math.PI / 2);

      const material = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide
      });

      const body = new THREE.Mesh(geometry, material);
      group.add(body);

      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xcbd5e1 });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      group.add(edges);

      // El disco queda centrado en Z, con mitad arriba y mitad abajo.
      group.position.set(0, 0, 0);

      disc = group;
      scene.add(disc);
    }

    function loadSTL(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const geometry = new STLLoader().parse(e.target.result);
          geometry.computeVertexNormals();
          geometry.computeBoundingBox();
          removeCurrentModel();
          const material = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x082f49, emissiveIntensity: 0.15, metalness: 0.1, roughness: 0.45 });
          model = new THREE.Mesh(geometry, material);
          loadedFileName = file.name;
          centerGeometry(model);
          scene.add(model);
          selectModel(model);
          setTransformMode("translate");
          updateModelStats();
          updatePlacementUI();
          checkDiscFit();
          setStatus("STL importado y seleccionado: " + file.name, "ok");
        } catch (err) {
          console.error(err);
          setStatus("Error al leer el STL. Revisá que el archivo sea válido.", "error");
        }
      };
      reader.readAsArrayBuffer(file);
    }

    function removeCurrentModel() {
      if (selectionBox) { scene.remove(selectionBox); selectionBox = null; }
      transformControls.detach();
      selectedModel = null;
      if (model) { scene.remove(model); model.geometry.dispose(); model.material.dispose(); model = null; }
    }

    function centerGeometry(mesh) {
      mesh.rotation.set(0, 0, 0);
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());
      mesh.position.x -= center.x;
      mesh.position.y -= center.y;
      mesh.position.z -= center.z;
      supportModelOnDisc(mesh);
      controls.target.set(0, 0, 0);
      controls.update();
    }

    function supportModelOnDisc(mesh = model) {
      if (!mesh) return;
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      const bottomZ = box.min.z;
      const discTopZ = discHeight / 2;
      mesh.position.z += discTopZ - bottomZ;
      mesh.updateMatrixWorld(true);
      lockedZ = mesh.position.z;
    }

    function normalizeDegrees(deg) {
      return ((deg % 360) + 360) % 360;
    }

    function selectModel(mesh) {
      selectedModel = mesh;
      if (!selectionBox) { selectionBox = new THREE.BoxHelper(mesh, 0xfacc15); scene.add(selectionBox); }
      selectionBox.setFromObject(mesh);
      selectionBox.visible = true;
      transformControls.attach(mesh);
      configureTransformAxes();
      if (mesh.material) { mesh.material.emissive.setHex(0x164e63); mesh.material.emissiveIntensity = 0.35; }
    }

    function onPointerDown(event) {
      if (!model || transformControls.dragging) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObject(model, true).length > 0) { selectModel(model); setStatus("STL seleccionado.", "ok"); }
    }

    function updateModelStats() {
      if (!model) return;
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      modelStats.size = { x: Number(size.x.toFixed(2)), y: Number(size.y.toFixed(2)), z: Number(size.z.toFixed(2)) };
      modelStats.triangles = Math.round(model.geometry.attributes.position.count / 3);
      document.getElementById("sizeX").innerText = modelStats.size.x.toFixed(2) + " mm";
      document.getElementById("sizeY").innerText = modelStats.size.y.toFixed(2) + " mm";
      document.getElementById("sizeZ").innerText = modelStats.size.z.toFixed(2) + " mm";
      document.getElementById("triangles").innerText = modelStats.triangles.toLocaleString("es-AR");
    }

    function updatePlacementUI() {
      if (!model) {
        document.getElementById("posX").value = "0.00 mm";
        document.getElementById("posY").value = "0.00 mm";
        document.getElementById("posZ").value = "0.00";
        document.getElementById("rotationZ").value = "0°";
        return;
      }
      document.getElementById("posX").value = model.position.x.toFixed(2) + " mm";
      document.getElementById("posY").value = model.position.y.toFixed(2) + " mm";
      document.getElementById("posZ").value = model.position.z.toFixed(2);
      document.getElementById("rotationZ").value = normalizeDegrees(THREE.MathUtils.radToDeg(model.rotation.z)).toFixed(1) + "°";
    }

    function checkDiscFit() {
      if (!model) return;
      model.updateMatrixWorld(true);
      const radiusLimit = discDiameter / 2;
      const position = model.geometry.attributes.position;
      const vertex = new THREE.Vector3();
      let maxRadius = 0, minZ = Infinity, maxZ = -Infinity;
      for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i).applyMatrix4(model.matrixWorld);
        const radius = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y);
        if (radius > maxRadius) maxRadius = radius;
        if (vertex.z < minZ) minZ = vertex.z;
        if (vertex.z > maxZ) maxZ = vertex.z;
      }
      const modelHeight = maxZ - minZ;
      const fits = maxRadius <= radiusLimit && modelHeight <= discHeight;
      const check = document.getElementById("discCheck");
      const state = document.getElementById("discState");
      if (fits) {
        check.innerText = "OK dentro del disco"; check.style.color = "#86efac"; state.value = "OK dentro del disco";
        viewer.classList.remove("out-of-disc");
        if (model.material) model.material.color.setHex(0x38bdf8);
        setDiscColor(0x64748b);
        setStatus("OK dentro del disco", "ok");
      } else {
        check.innerText = "Fuera del disco"; check.style.color = "#fca5a5"; state.value = "Fuera del disco";
        viewer.classList.add("out-of-disc");
        if (model.material) model.material.color.setHex(0xf97316);
        setDiscColor(0xb91c1c);
        setStatus("Fuera del disco: revisá diámetro o altura.", "warning");
      }
    }

    function setStatus(message, type) {
      const box = document.getElementById("statusBox");
      box.innerText = message;
      box.className = "status";
      if (type === "warning") box.classList.add("warning");
      if (type === "error") box.classList.add("error");
    }

    function setDiscColor(color) {
      if (!disc) return;
      disc.traverse(function(child) {
        if (child.isMesh && child.material && child.material.color) {
          child.material.color.setHex(color);
        }
      });
    }

    function configureTransformAxes() {
      if (!transformControls) return;
      if (currentMode === "translate") { transformControls.showX = true; transformControls.showY = true; transformControls.showZ = false; }
      else { transformControls.showX = false; transformControls.showY = false; transformControls.showZ = true; }
    }

    function onResize() { camera.aspect = viewer.clientWidth / viewer.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(viewer.clientWidth, viewer.clientHeight); }
    function animate() { requestAnimationFrame(animate); controls.update(); if (selectionBox && selectedModel) selectionBox.setFromObject(selectedModel); renderer.render(scene, camera); }

    window.updateDisc = function() { const parts = document.getElementById("discSize").value.split(","); discDiameter = Number(parts[0]); discHeight = Number(parts[1]); createDisc(); if (model) { supportModelOnDisc(model); updateModelStats(); updatePlacementUI(); } checkDiscFit(); };
    window.setTransformMode = function(mode) { currentMode = mode; if (transformControls) { transformControls.setMode(mode); configureTransformAxes(); } document.getElementById("moveModeBtn").className = mode === "translate" ? "active" : "secondary"; document.getElementById("rotateModeBtn").className = mode === "rotate" ? "active" : "secondary"; if (model && selectedModel !== model) selectModel(model); };
    window.rotateModel = function(degrees) { if (!model) { setStatus("Primero importá un STL.", "warning"); return; } model.rotation.z += THREE.MathUtils.degToRad(degrees); supportModelOnDisc(model); updateModelStats(); updatePlacementUI(); checkDiscFit(); selectModel(model); };
    window.flipModel = function(axis) { if (!model) { setStatus("Primero importá un STL.", "warning"); return; } if (axis === "x") model.rotation.x += Math.PI; if (axis === "y") model.rotation.y += Math.PI; supportModelOnDisc(model); updateModelStats(); updatePlacementUI(); checkDiscFit(); selectModel(model); };
    window.supportCurrentModel = function() { if (!model) { setStatus("Primero importá un STL.", "warning"); return; } supportModelOnDisc(model); updateModelStats(); updatePlacementUI(); checkDiscFit(); selectModel(model); setStatus("Pieza apoyada sobre la cara superior del disco.", "ok"); };
    window.setModelZFromInput = function() { if (!model) return; supportModelOnDisc(model); updateModelStats(); updatePlacementUI(); checkDiscFit(); };
    window.centerModel = function() { if (!model) { setStatus("Primero importá un STL.", "warning"); return; } centerGeometry(model); selectModel(model); updateModelStats(); updatePlacementUI(); checkDiscFit(); };
    window.clearModel = function() { removeCurrentModel(); loadedFileName = ""; modelStats = { size: { x: 0, y: 0, z: 0 }, triangles: 0 }; wireframe = false; document.getElementById("stlInput").value = ""; document.getElementById("sizeX").innerText = "-"; document.getElementById("sizeY").innerText = "-"; document.getElementById("sizeZ").innerText = "-"; document.getElementById("triangles").innerText = "-"; document.getElementById("discCheck").innerText = "-"; document.getElementById("discState").value = "-"; updatePlacementUI(); viewer.classList.remove("out-of-disc"); setStatus("Modelo eliminado.", "ok"); };
    window.resetView = function() { camera.position.set(120, 120, 120); controls.target.set(0, 0, 0); controls.update(); };
    window.viewTop = function() { camera.position.set(0, 0, 170); controls.target.set(0, 0, 0); controls.update(); };
    window.viewFront = function() { camera.position.set(0, -170, 35); controls.target.set(0, 0, 0); controls.update(); };
    window.viewSide = function() { camera.position.set(170, 0, 35); controls.target.set(0, 0, 0); controls.update(); };
    window.toggleWireframe = function() { if (!model) return; wireframe = !wireframe; model.material.wireframe = wireframe; };

    window.saveProjectJSON = function() {
      if (!model) { setStatus("Primero importá un STL para guardar el proyecto.", "warning"); return; }
      updateModelStats();
      const project = {
        projectName: "MRAPI CAM Project",
        createdAt: new Date().toISOString(),
        stl: { fileName: loadedFileName || "modelo.stl", size: { x: modelStats.size.x, y: modelStats.size.y, z: modelStats.size.z }, triangles: modelStats.triangles },
        disc: { diameter: discDiameter, height: discHeight },
        material: document.getElementById("material").value,
        machine: document.getElementById("machine").value,
        placement: { position: { x: Number(model.position.x.toFixed(3)), y: Number(model.position.y.toFixed(3)), z: Number(model.position.z.toFixed(3)) }, rotation: { x: Number(model.rotation.x.toFixed(6)), y: Number(model.rotation.y.toFixed(6)), z: Number(model.rotation.z.toFixed(6)) } }
      };
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "mrapi-cam-project.json"; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
      setStatus("Proyecto JSON descargado.", "ok");
    };

    window.triggerProjectLoad = function() { document.getElementById("projectInput").click(); };
    function loadProjectJSON(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const project = JSON.parse(e.target.result);
          if (!model) { setStatus("Primero importá el STL correspondiente", "warning"); return; }
          if (project.disc) { discDiameter = Number(project.disc.diameter) || discDiameter; discHeight = Number(project.disc.height) || discHeight; syncDiscSelect(); createDisc(); }
          if (project.material) setSelectValue("material", project.material);
          if (project.machine) setSelectValue("machine", project.machine);
          const placement = project.placement || {}, position = placement.position || {}, rotation = placement.rotation || {};
          model.position.set(Number(position.x) || 0, Number(position.y) || 0, Number(position.z) || 0);
          model.rotation.set(Number(rotation.x) || 0, Number(rotation.y) || 0, Number(rotation.z) || 0);
          supportModelOnDisc(model);
          selectModel(model); updateModelStats(); updatePlacementUI(); checkDiscFit(); setStatus("Proyecto JSON cargado sobre el STL actual y apoyado sobre el disco.", "ok");
        } catch (err) { console.error(err); setStatus("Error al cargar el JSON del proyecto.", "error"); }
        finally { event.target.value = ""; }
      };
      reader.readAsText(file);
    }
    function setSelectValue(id, value) { const select = document.getElementById(id); const option = Array.from(select.options).find(function(item) { return item.value === value || item.text === value; }); if (option) select.value = option.value; }
    function syncDiscSelect() { const select = document.getElementById("discSize"); const target = String(discDiameter) + "," + String(discHeight); const option = Array.from(select.options).find(function(item) { return item.value === target; }); if (option) select.value = option.value; }
    window.fakeToolpath = function() { if (!model) { setStatus("Primero importá un STL para calcular trayectorias.", "warning"); return; } setStatus("Próxima etapa: generar trayectorias reales sobre el STL.", "warning"); };
    window.fakeExport = function() { setStatus("Exportación G-code todavía no habilitada. Primero armamos el motor CAM.", "warning"); };
  </script>
</body>
</html>
  `);
});
