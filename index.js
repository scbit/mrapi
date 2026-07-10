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
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #111827;
      color: white;
    }

    header {
      padding: 18px 28px;
      background: #020617;
      border-bottom: 1px solid #334155;
    }

    h1 {
      margin: 0;
      font-size: 24px;
    }

    .layout {
      display: grid;
      grid-template-columns: 280px 1fr 320px;
      height: calc(100vh - 65px);
    }

    .panel {
      padding: 20px;
      border-right: 1px solid #334155;
      background: #0f172a;
    }

    .right {
      border-right: none;
      border-left: 1px solid #334155;
    }

    .viewer {
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle, #1e293b, #020617);
    }

    .disc {
      width: 360px;
      height: 360px;
      border: 3px solid #94a3b8;
      border-radius: 50%;
      position: relative;
      box-shadow: 0 0 40px rgba(148, 163, 184, 0.3);
    }

    .piece {
      position: absolute;
      width: 90px;
      height: 60px;
      background: #38bdf8;
      border-radius: 50% 45% 55% 40%;
      left: 130px;
      top: 145px;
      opacity: 0.85;
      border: 2px solid white;
    }

    button {
      width: 100%;
      padding: 12px;
      margin-bottom: 12px;
      border: none;
      border-radius: 8px;
      background: #2563eb;
      color: white;
      font-size: 15px;
      cursor: pointer;
    }

    button.secondary {
      background: #334155;
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
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #475569;
      background: #020617;
      color: white;
    }

    .status {
      margin-top: 20px;
      padding: 12px;
      border-radius: 8px;
      background: #064e3b;
      color: #d1fae5;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <header>
    <h1>MRAPI CAM Dental</h1>
  </header>

  <div class="layout">
    <aside class="panel">
      <h3>Proyecto</h3>
      <button>Importar STL</button>
      <button class="secondary">Guardar proyecto</button>

      <label>Material</label>
      <select>
        <option>Zirconio</option>
        <option>PMMA</option>
        <option>Cera</option>
        <option>Disilicato</option>
        <option>Titanio</option>
      </select>

      <label>Disco</label>
      <select>
        <option>98 mm x 20 mm</option>
        <option>98 mm x 16 mm</option>
        <option>98 mm x 25 mm</option>
      </select>

      <label>Máquina</label>
      <select>
        <option>Fresadora Dental 4 ejes</option>
        <option>Fresadora Dental 5 ejes</option>
      </select>

      <div class="status">
        Cloud Run funcionando correctamente.
      </div>
    </aside>

    <main class="viewer">
      <div class="disc">
        <div class="piece"></div>
      </div>
    </main>

    <aside class="panel right">
      <h3>Propiedades</h3>

      <label>Posición X</label>
      <input value="0.00 mm" />

      <label>Posición Y</label>
      <input value="0.00 mm" />

      <label>Rotación</label>
      <input value="0°" />

      <label>Herramienta</label>
      <select>
        <option>Fresa 2.0 mm</option>
        <option>Fresa 1.0 mm</option>
        <option>Fresa 0.6 mm</option>
      </select>

      <button style="margin-top: 20px;">Calcular trayectorias</button>
      <button class="secondary">Exportar G-code</button>
    </aside>
  </div>
</body>
</html>
  `);
});
