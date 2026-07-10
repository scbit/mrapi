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
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #020617;
      color: white;
      overflow: hidden;
    }

    header {
      height: 68px;
      padding: 18px 28px;
      background: #020617;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    h1 {
      margin: 0;
      font-size: 26px;
      letter-spacing: 0.3px;
    }

    .badge {
      background: #064e3b;
      color: #d1fae5;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
    }

    .layout {
      display: grid;
      grid-template-columns: 330px 1fr 390px;
      height: calc(100vh - 68px);
    }

    .panel {
      padding: 22px 16px;
      background: #111827;
      border-right: 1px solid #334155;
      overflow-y: auto;
    }

    .right {
      border-right: none;
      border-left: 1px solid #334155;
    }

    h2 {
      margin-top: 22px;
      margin-bottom: 16px;
      font-size: 22px;
    }

    h3 {
      margin-top: 0;
      font-size: 18px;
    }

    button, .upload-label {
      width: 100%;
      padding: 13px;
      margin-bottom: 12px;
      border: none;
      border-radius: 8px;
      background: #2563eb;
      color: white;
      font-size: 15px;
      cursor: pointer;
      text-align: center;
      display: block;
    }

    button.secondary {
      background: #374151;
    }

    button.danger {
      background: #7f1d1d;
    }

    button.success {
      background: #047857;
    }

    label {
      display: block;
      margin-top: 14px;
      margin-bottom: 6px;
      color: #cbd5e1;
      font-size: 14px;
    }

    select, input {
      width: 100%;
      padding: 11px;
      border-radius: 6px;
      border: 1px solid #475569;
      background: #020617;
      color: white;
      font-size: 14px;
    }

    input[type="file"] {
      display: none;
    }

    #viewer {
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, #1e293b, #020617);
      position: relative;
    }

    .viewer-toolbar {
      position: absolute;
      top: 14px;
      left: 14px;
      z-index: 10;
      display: flex;
      gap: 8px;
    }

    .viewer-toolbar button {
      width: auto;
      padding: 8px 12px;
      margin: 0;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid #475569;
      font-size: 13px;
    }

    .info-card {
      margin-top: 16px;
      padding: 13px;
      border-radius: 8px;
      background: #020617;
      border: 1px solid #334155;
      font-size: 14px;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .status {
      margin-top: 20px;
      padding: 12px;
      border-radius: 8px;
      background: #064e3b;
      color: #d1fae5;
      font-size: 14px;
    }

    .warning {
      background: #78350f;
      color: #ffedd5;
    }

    .error {
      background: #7f1d1d;
      color: #fee2e2;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #334155;
      padding: 8px 0;
      font-size: 14px;
    }

    .metric span:first-child {
      color: #94a3b8;
    }

    .metric span:last-child {
      color: white;
      font-weight: bold;
    }
  </style>
</head>

<body>
  <header>
    <h1>MRAPI CAM Dental</h1>
    <div class="badge">Cloud Run activo · Visualizador STL</div>
  </header>

  <div class="layout">
    <aside class="panel">
      <h2>Proyecto</h2>

      <label class="upload-label" for="stlInput">Importar STL</label>
      <input id="stlInput" type="file" accept=".stl" />

      <button class="secondary" onclick="centerModel()">Centrar modelo</button>
      <button class="secondary" onclick="resetView()">Reset vista</button>
      <button class="danger" onclick="clearModel()">Eliminar STL</button>

      <label>Material</label>
      <select id="material">
        <option>Zirconio</option>
        <option>PMMA</option>
        <option>Cera</option>
        <option>Disilicato</option>
        <option>Titanio</option>
        <option>CoCr</option>
      </select>

      <label>Disco</label>
      <select id="discSize" onchange="updateDisc()">
        <option value="98,20">98 mm x 20 mm</option>
        <option value="98,16">98 mm x 16 mm</option>
        <option value="98,25">98 mm x 25 mm</option>
        <option value="95,20">95 mm x 20 mm</option>
      </select>

      <label>Máquina</label>
      <select id="machine">
        <option>Fresadora Dental 4 ejes</option>
        <option>Fresadora Dental 5 ejes</option>
      </select>

      <div id="statusBox" class="status">
        Listo para importar un STL dental.
      </div>

      <div class="info-card">
        <b>Etapa actual:</b><br>
        Visualizador 3D real con STL, disco dental, cámara y mediciones.
      </div>
    </aside>

    <main id="viewer">
      <div class="viewer-toolbar">
        <button onclick="viewTop()">Superior</button>
        <button onclick="viewFront()">Frontal</button>
        <button onclick="viewSide()">Lateral</button>
        <button onclick="toggleWireframe()">Wireframe</button>
      </div>
    </main>

    <aside class="panel right">
      <h2>Propiedades</h2>

      <label>Posición X</label>
      <input id="posX" value="0.00 mm" readonly />

      <label>Posición Y</label>
      <input id="posY" value="0.00 mm" readonly />

      <label>Posición Z</label>
      <input id="posZ" value="0.00 mm" readonly />

      <label>Rotación</label>
      <input id="rotation" value="0°" readonly />

      <label>Herramienta</label>
      <select>
        <option>Fresa 2.0 mm</option>
        <option>Fresa 1.0 mm</option>
        <option>Fresa 0.6 mm</option>
        <option>Fresa 0.3 mm</option>
      </select>

      <div class="info-card">
        <h3>Medidas STL</h3>
        <div class="metric"><span>Ancho X</span><span id="sizeX">-</span></div>
        <div class="metric"><span>Profundidad Y</span><span id="sizeY">-</span></div>
        <div class="metric"><span>Altura Z</span><span id="sizeZ">-</span></div>
        <div class="metric"><span>Triángulos</span><span id="triangles">-</span></div>
        <div class="metric"><span>Estado disco</span><span id="discCheck">-</span></div>
      </div>

      <button class="success" style="margin-top: 20px;" onclick="fakeToolpath()">Calcular trayectorias</button>
      <button class="secondary" onclick="fakeExport()">Exportar G-code</button>
    </aside>
  </div>

  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
    }
  }
  </script>

  <script type="module">
    import * as THREE from "three";
    import { OrbitControls } from "three/addons/controls/OrbitControls.js";
    import { STLLoader } from "three/addons/loaders/STLLoader.js";

    let scene, camera, renderer, controls;
    let model = null;
    let disc = null;
    let discDiameter = 98;
    let discHeight = 20;
    let wireframe = false;

    const viewer = document.getElementById("viewer");

    init();
    animate();

    function init() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020617);

      camera = new THREE.PerspectiveCamera(
        45,
        viewer.clientWidth / viewer.clientHeight,
        0.1,
        2000
      );
      camera.position.set(120, 120, 120);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(viewer.clientWidth, viewer.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      viewer.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;

      const ambient = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambient);

      const dir1 = new THREE.DirectionalLight(0xffffff, 1.2);
      dir1.position.set(80, 120, 100);
      scene.add(dir1);

      const dir2 = new THREE.DirectionalLight(0xffffff, 0.6);
      dir2.position.set(-100, -80, 80);
      scene.add(dir2);

      const grid = new THREE.GridHelper(140, 28, 0x334155, 0x1e293b);
      grid.rotation.x = Math.PI / 2;
      scene.add(grid);

      const axes = new THREE.AxesHelper(60);
      scene.add(axes);

      createDisc();

      window.addEventListener("resize", onResize);
      document.getElementById("stlInput").addEventListener("change", loadSTL);
    }

    function createDisc() {
      if (disc) {
        scene.remove(disc);
      }

      const geometry = new THREE.CylinderGeometry(
        discDiameter / 2,
        discDiameter / 2,
        discHeight,
        128,
        1,
        true
      );

      const material = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide
      });

      disc = new THREE.Mesh(geometry, material);
      disc.rotation.x = Math.PI / 2;
      scene.add(disc);

      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xcbd5e1 });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edges.rotation.x = Math.PI / 2;
      disc.add(edges);
    }

    function loadSTL(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = function(e) {
        try {
          const loader = new STLLoader();
          const geometry = loader.parse(e.target.result);

          geometry.computeVertexNormals();
          geometry.computeBoundingBox();

          if (model) {
            scene.remove(model);
          }

          const material = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            metalness: 0.1,
            roughness: 0.45
          });

          model = new THREE.Mesh(geometry, material);

          centerGeometry(model);
          scene.add(model);

          updateMeasurements();
          checkDiscFit();

          setStatus("STL importado correctamente: " + file.name, "ok");
        } catch (err) {
          console.error(err);
          setStatus("Error al leer el STL. Revisá que el archivo sea válido.", "error");
        }
      };

      reader.readAsArrayBuffer(file);
    }

    function centerGeometry(mesh) {
      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());

      mesh.position.x -= center.x;
      mesh.position.y -= center.y;
      mesh.position.z -= center.z;

      const newBox = new THREE.Box3().setFromObject(mesh);
      const size = newBox.getSize(new THREE.Vector3());

      // Apoya la pieza en el centro del disco.
      mesh.position.z += size.z / 2;

      controls.target.set(0, 0, 0);
      controls.update();
    }

    function updateMeasurements() {
      if (!model) return;

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());

      document.getElementById("sizeX").innerText = size.x.toFixed(2) + " mm";
      document.getElementById("sizeY").innerText = size.y.toFixed(2) + " mm";
      document.getElementById("sizeZ").innerText = size.z.toFixed(2) + " mm";

      const triangles = model.geometry.attributes.position.count / 3;
      document.getElementById("triangles").innerText = Math.round(triangles).toLocaleString("es-AR");

      document.getElementById("posX").value = model.position.x.toFixed(2) + " mm";
      document.getElementById("posY").value = model.position.y.toFixed(2) + " mm";
      document.getElementById("posZ").value = model.position.z.toFixed(2) + " mm";
    }

    function checkDiscFit() {
      if (!model) return;

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());

      const maxXY = Math.max(size.x, size.y);
      const fitsDiameter = maxXY <= discDiameter;
      const fitsHeight = size.z <= discHeight;

      const check = document.getElementById("discCheck");

      if (fitsDiameter && fitsHeight) {
        check.innerText = "OK";
        check.style.color = "#86efac";
        setStatus("La pieza entra dentro del disco seleccionado.", "ok");
      } else {
        check.innerText = "No entra";
        check.style.color = "#fca5a5";
        setStatus("Atención: la pieza supera el diámetro o altura del disco.", "warning");
      }
    }

    function setStatus(message, type) {
      const box = document.getElementById("statusBox");
      box.innerText = message;
      box.className = "status";

      if (type === "warning") box.classList.add("warning");
      if (type === "error") box.classList.add("error");
    }

    function onResize() {
      camera.aspect = viewer.clientWidth / viewer.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(viewer.clientWidth, viewer.clientHeight);
    }

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    window.updateDisc = function() {
      const value = document.getElementById("discSize").value;
      const parts = value.split(",");
      discDiameter = Number(parts[0]);
      discHeight = Number(parts[1]);
      createDisc();
      checkDiscFit();
    }

    window.centerModel = function() {
      if (!model) {
        setStatus("Primero importá un STL.", "warning");
        return;
      }
      centerGeometry(model);
      updateMeasurements();
      checkDiscFit();
    }

    window.clearModel = function() {
      if (model) {
        scene.remove(model);
        model = null;
      }

      document.getElementById("sizeX").innerText = "-";
      document.getElementById("sizeY").innerText = "-";
      document.getElementById("sizeZ").innerText = "-";
      document.getElementById("triangles").innerText = "-";
      document.getElementById("discCheck").innerText = "-";

      setStatus("Modelo eliminado.", "ok");
    }

    window.resetView = function() {
      camera.position.set(120, 120, 120);
      controls.target.set(0, 0, 0);
      controls.update();
    }

    window.viewTop = function() {
      camera.position.set(0, 0, 170);
      controls.target.set(0, 0, 0);
      controls.update();
    }

    window.viewFront = function() {
      camera.position.set(0, -170, 35);
      controls.target.set(0, 0, 0);
      controls.update();
    }

    window.viewSide = function() {
      camera.position.set(170, 0, 35);
      controls.target.set(0, 0, 0);
      controls.update();
    }

    window.toggleWireframe = function() {
      if (!model) return;
      wireframe = !wireframe;
      model.material.wireframe = wireframe;
    }

    window.fakeToolpath = function() {
      if (!model) {
        setStatus("Primero importá un STL para calcular trayectorias.", "warning");
        return;
      }
      setStatus("Próxima etapa: generar trayectorias reales sobre el STL.", "warning");
    }

    window.fakeExport = function() {
      setStatus("Exportación G-code todavía no habilitada. Primero armamos el motor CAM.", "warning");
    }
  </script>
</body>
</html>
  `);
});
