import { MATERIALS, TOOLS, MACHINES, STRATEGIES, findMaterial, findTool, findMachine, findStrategy } from "./camConfig.js";

let ctx = null;
let camVisuals = null;
let camSimulation = null;
let camRuntimeStocks = null;
let camViewState = {
  showRapid: false,
  showRemovedVoxels: false,
  currentPreset: "simulation"
};
let camOperationCounter = 1;
const CAM_REMOVAL_PRECISION_MM = 0.1;
const CAM_MAX_SWEEP_SAMPLES = 9000;
const CAM_SIMULATION_POINTS_PER_FRAME = 10;

export function initCam(context) {
  ctx = context;
  camVisuals = context.camVisuals;
  camSimulation = context.camSimulation;
  camRuntimeStocks = context.camRuntimeStocks;
  camVisuals.heightmap = camVisuals.heightmap || [];
  camVisuals.tolerance = camVisuals.tolerance || [];
  camVisuals.voxelStock = camVisuals.voxelStock || null;
  camVisuals.overcutWarning = camVisuals.overcutWarning || null;
  setupCamControls();
  exposeCamWindowFunctions();
}

function setupCamControls() {
  populateMainMaterialAndMachineSelectors();
  const strategy = ctx.document.getElementById("camStrategy");
  if (strategy) {
    strategy.innerHTML = STRATEGIES.map(item => `<option value="${item.id}">${item.name}</option>`).join("");
    strategy.value = "roughing";
    strategy.onchange = () => applyStrategyDefaults(true);
  }

  const tool = ctx.document.getElementById("camTool");
  if (tool) {
    tool.innerHTML = TOOLS.map(item => `<option value="${item.id}">${item.name}</option>`).join("");
    tool.value = "flat_2_0";
    tool.onchange = () => updateDerivedCamInputs();
  }

  if (strategy && !ctx.document.getElementById("camTolerance")) {
    strategy.insertAdjacentHTML("afterend", '<label>Tolerancia mm</label><input id="camTolerance" type="number" value="0.50" step="0.01" min="0" onchange="updateCamPanel()" oninput="updateCamPanel()"/><label>StepOver %</label><input id="camStepOverPercent" type="number" value="70" step="1" min="1" max="100" onchange="updateDerivedCamInputs()" oninput="updateDerivedCamInputs()"/><label>StepOver mm</label><input id="camStepOver" type="number" value="1.40" step="0.05" min="0.05" onchange="updateCamPanel()" oninput="updateCamPanel()"/><label>StepDown mm</label><input id="camStepDown" type="number" value="1.50" step="0.05" min="0.05" onchange="updateCamPanel()" oninput="updateCamPanel()"/><label>RPM</label><input id="camRpm" type="number" value="28000" step="500" min="1000" onchange="updateCamPanel()" oninput="updateCamPanel()"/><label>Feed rate mm/min</label><input id="camFeedRate" type="number" value="800" step="10" min="1" onchange="updateCamPanel()" oninput="updateCamPanel()"/><label>Stock to leave mm</label><input id="camStockToLeave" type="number" value="0.50" step="0.01" min="0" onchange="updateCamPanel()" oninput="updateCamPanel()"/><div class="info-card" id="camDemoNotice">CAM demo visual: todavia no calcula mecanizado real. Las trayectorias actuales son aproximadas. El motor real se implementara con heightmap/voxel.</div>');
  }

  const camPanel = ctx.document.querySelector(".panel.right .cam-only");
  if (camPanel && !ctx.document.getElementById("camHeightmapResolution")) {
    camPanel.insertAdjacentHTML("afterbegin", '<div class="cam-workflow"><h3>CAM Dental</h3><div class="cam-primary-actions"><button class="success" onclick="prepareDentalCamStock()">Preparar stock</button><button class="success" onclick="runDentalRoughingOperation()">Desbastar stock</button><button class="secondary" onclick="simulateCurrentDentalOperation()">Simular</button><button class="secondary" onclick="showMachinedVoxelStock()">Ver remanente</button></div><div class="cam-view-tabs"><button class="secondary" onclick="setCamViewPreset(\'design\')">Objetivo</button><button class="secondary" onclick="setCamViewPreset(\'stock\')">Stock</button><button class="secondary" onclick="setCamViewPreset(\'toolpath\')">Trayectoria</button><button class="secondary" onclick="setCamViewPreset(\'machined\')">Remanente</button></div><div class="info-card"><h3>Operaciones</h3><div id="camOperationList" class="cam-operation-list"></div><button class="secondary" onclick="addDentalOperation()">Agregar operacion</button></div><label>Resolucion stock mm</label><input id="camVoxelSize" type="number" value="1.00" step="0.10" min="0.5" onchange="updateCamPanel()" oninput="updateCamPanel()"/><button class="secondary" onclick="toggleCamAdvancedPanel()">Ajustes avanzados</button></div><div id="camAdvancedPanel" class="cam-advanced-panel"><label>Vista CAM</label><button class="secondary" onclick="setCamViewPreset(\'simulation\')">Simulacion</button><label><input id="camShowRapidMoves" type="checkbox" onchange="toggleRapidMoves(this.checked)"> Mostrar rapid moves</label><button class="secondary" onclick="hideCamHelpers()">Ocultar ayudas CAM</button><label>Resolucion heightmap mm</label><input id="camHeightmapResolution" type="number" value="1.00" step="0.10" min="0.25" onchange="updateCamPanel()" oninput="updateCamPanel()"/><button class="secondary" onclick="generateHeightmapForSelectedPart()">Generar heightmap</button><button class="secondary" onclick="showHeightmap()">Mostrar heightmap</button><button class="secondary" onclick="showRoughingTolerance()">Mostrar tolerancia</button><button class="secondary" onclick="resetVoxelStock()">Reset stock voxel</button></div>');
  }

  relabelCamButtons();
  compactLegacyCamButtons();
  applyStrategyDefaults(true);
  renderCamOperationList();
}

function populateMainMaterialAndMachineSelectors() {
  const material = ctx.document.getElementById("material");
  if (material) {
    const current = material.value;
    material.innerHTML = MATERIALS.map(item => `<option value="${item.id}">${item.name}</option>`).join("");
    material.value = findMaterial(current).id;
    material.onchange = () => applyStrategyDefaults(false);
  }

  const machine = ctx.document.getElementById("machine");
  if (machine) {
    const current = machine.value;
    machine.innerHTML = MACHINES.map(item => `<option value="${item.id}">${item.name}</option>`).join("");
    machine.value = findMachine(current).id;
    machine.onchange = () => updateCamPanel();
  }
}

function relabelCamButtons() {
  const buttons = Array.from(ctx.document.querySelectorAll(".cam-only button"));
  buttons.forEach(button => {
    const action = button.getAttribute("onclick") || "";
    if (action.includes("generateDemoToolpath")) button.textContent = "Generar desbaste heightmap";
    if (action.includes("startCamSimulation")) button.textContent = "Simular desbaste";
    if (action.includes("showRemovedMaterialDemo")) button.textContent = "Ver material a remover";
    if (action.includes("showMachinedStockApproximation")) button.textContent = "Ver stock remanente real";
    if (action.includes("showDesignTarget")) button.textContent = "Mostrar diseno objetivo";
    if (action.includes("generateMachinedResultDemo")) {
      button.textContent = "Mostrar offset/tolerancia";
      button.setAttribute("onclick", "showToleranceOffsetDemo()");
    }
    if (action.includes("compare")) button.textContent = "Comparar remanente vs diseno";
  });
}

function compactLegacyCamButtons() {
  ctx.document.querySelectorAll(".panel.right .cam-only > button").forEach(button => {
    button.style.display = "none";
  });
  const heading = ctx.document.querySelector(".panel.right .cam-only > h2");
  if (heading) heading.style.display = "none";
  const advanced = ctx.document.getElementById("camAdvancedPanel");
  if (advanced) advanced.style.display = "none";
}

function exposeCamWindowFunctions() {
  Object.assign(ctx.window, {
    setAppMode,
    updateCamPanel,
    generateHeightmapForSelectedPart,
    generateHeightmapForPart,
    showHeightmap,
    showRoughingTolerance,
    showMaterialToRemoveFromHeightmap,
    showRemainingStockFromHeightmap,
    clearHeightmapVisuals,
    simulateHeightmapToolpath,
    createVoxelStockForSelectedPart,
    createVoxelStockForPart,
    classifyProtectedVoxels,
    showVoxelStock,
    hideVoxelStock,
    updateVoxelStockVisual,
    removeVoxelsByToolAtPoint,
    simulateVoxelToolpath,
    resetVoxelStock,
    showMachinedVoxelStock,
    prepareDentalCamStock,
    runDentalRoughingOperation,
    simulateCurrentDentalOperation,
    addDentalOperation,
    selectDentalOperation,
    setDentalOperationTool,
    setDentalOperationStrategy,
    acceptDentalOperation,
    skipDentalOperation,
    deleteDentalOperation,
    toggleCamAdvancedPanel,
    setCamViewPreset,
    toggleRapidMoves,
    hideCamHelpers,
    generateDemoToolpath,
    startCamSimulation,
    pauseCamSimulation,
    resumeCamSimulation,
    resetCamSimulation,
    clearCamSimulation,
    toggleCamVisibility,
    showDesignTarget,
    showRemovedMaterialDemo,
    showMachinedStockApproximation,
    showToleranceOffsetDemo,
    compareApproxMachinedStockToDesign,
    compareMachinedResultToDesignDemo: compareApproxMachinedStockToDesign,
    compareResultToDesignDemo: compareApproxMachinedStockToDesign,
    generateMachinedResultDemo: showToleranceOffsetDemo,
    generateFinalResultDemo: showToleranceOffsetDemo,
    updateDerivedCamInputs,
    getCamSettings,
    applyCamSettings
  });
}

function numberInput(id, fallback) {
  const el = ctx.document.getElementById(id);
  const value = el ? Number(el.value) : NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function textInput(id, fallback) {
  const el = ctx.document.getElementById(id);
  return el && el.value ? el.value : fallback;
}

function getToolDefinition() {
  return findTool(textInput("camTool", "flat_2_0"));
}

function getCamParameters() {
  const strategy = findStrategy(textInput("camStrategy", "roughing"));
  const tool = getToolDefinition();
  return {
    strategy: strategy.name,
    strategyId: strategy.id,
    tool,
    material: findMaterial(textInput("material", "zirconia")),
    machine: findMachine(textInput("machine", "dental_4x_demo")),
    tolerance: numberInput("camTolerance", strategy.tolerance),
    stepOverPercent: numberInput("camStepOverPercent", strategy.stepOverPercent),
    stepOver: numberInput("camStepOver", tool.diameter * strategy.stepOverPercent / 100),
    stepDown: numberInput("camStepDown", strategy.stepDown),
    rpm: numberInput("camRpm", tool.defaultRpm),
    feedRate: numberInput("camFeedRate", strategy.id === "finishing" ? findMaterial(textInput("material", "zirconia")).finishingFeed : findMaterial(textInput("material", "zirconia")).roughingFeed),
    stockToLeave: numberInput("camStockToLeave", strategy.stockToLeave || strategy.tolerance),
    protectedMethod: "heightmap_2_5d_demo"
  };
}

function applyStrategyDefaults(forceTool) {
  const strategy = findStrategy(textInput("camStrategy", "roughing"));
  const tool = ctx.document.getElementById("camTool");
  if (tool && forceTool) tool.value = strategy.defaultTool;

  const definition = getToolDefinition();
  const material = findMaterial(textInput("material", "zirconia"));
  const feed = strategy.id === "finishing" ? material.finishingFeed : material.roughingFeed;
  setInputValue("camTolerance", strategy.tolerance.toFixed(2));
  setInputValue("camStepOverPercent", String(strategy.stepOverPercent));
  setInputValue("camStepOver", (definition.diameter * strategy.stepOverPercent / 100).toFixed(2));
  setInputValue("camStepDown", strategy.stepDown.toFixed(2));
  setInputValue("camRpm", String(Math.min(definition.defaultRpm || material.defaultRpm, findMachine(textInput("machine", "dental_4x_demo")).spindleMaxRpm)));
  setInputValue("camFeedRate", String(feed));
  setInputValue("camStockToLeave", Number(strategy.stockToLeave || strategy.tolerance).toFixed(2));
  updateCamPanel();
}

function updateDerivedCamInputs() {
  const tool = getToolDefinition();
  const strategy = findStrategy(textInput("camStrategy", "roughing"));
  const percent = numberInput("camStepOverPercent", strategy.stepOverPercent);
  setInputValue("camStepOver", (tool.diameter * percent / 100).toFixed(2));
  updateCamPanel();
}

function setInputValue(id, value) {
  const input = ctx.document.getElementById(id);
  if (input) input.value = value;
}

function setCamText(id, value) {
  const el = ctx.document.getElementById(id);
  if (el) el.innerText = String(value);
}

function ensureCam(model) {
  if (!model.cam) model.cam = {};
  if (!Array.isArray(model.cam.toolpaths)) model.cam.toolpaths = [];
  if (!Array.isArray(model.cam.operations)) model.cam.operations = [];
  if (!model.cam.activeOperationId && model.cam.operations.length) model.cam.activeOperationId = model.cam.operations[0].id;
  if (!model.cam.simulation) model.cam.simulation = {};
  if (!model.cam.analysis) model.cam.analysis = {};
  if (!model.cam.result) model.cam.result = {};
  if (!model.cam.comparison) model.cam.comparison = {};
  if (!model.cam.voxelInfo) model.cam.voxelInfo = null;
  model.cam.simulation = Object.assign({
    removedMarkersCount: 0,
    status: "Sin trayectoria"
  }, model.cam.simulation);
  model.cam.analysis = Object.assign({
    possibleOvercut: false,
    comparisonReal: false,
    remainingMaterialDemo: true,
    heightmapResolution: 0,
    surfacePoints: 0,
    machinedPoints: 0,
    protectedPoints: 0,
    skippedProtectedPoints: 0,
    coverageDemo: 0,
    totalVoxels: 0,
    removedVoxels: 0,
    remainingVoxels: 0,
    protectedVoxels: 0,
    voxelSize: 0,
    status: "Demo CAM aproximado"
  }, model.cam.analysis);
  return model.cam;
}

export function applyAppMode() {
  ctx.document.querySelectorAll(".panel").forEach(panel => Array.from(panel.children).forEach(child => {
    if (!child.classList.contains("cam-only")) child.classList.add("cad-only");
  }));

  const cad = ctx.currentMode === "CAD";
  ctx.document.querySelectorAll(".cad-only").forEach(el => el.style.display = cad ? "" : "none");
  ctx.document.querySelectorAll(".cam-only").forEach(el => el.style.display = cad ? "none" : "block");
  ctx.document.getElementById("appTitle").innerText = "MRAPI CAM Dental | Modo: " + (cad ? "CAD / Preparacion" : "CAM / Fresado");
  ctx.document.getElementById("modeBadge").innerText = cad ? "Modo CAD" : "Modo CAM";
  ctx.document.getElementById("cadModeBtn").className = cad ? "active" : "secondary";
  ctx.document.getElementById("camModeBtn").className = cad ? "secondary" : "active";
  if (!cad && ctx.selectedModel) rebuildCamVisualsForModel(ctx.selectedModel);
  updateCamPanel();
  applyCamVisibility();
}

function setAppMode(mode) {
  ctx.currentMode = mode === "CAM" ? "CAM" : "CAD";
  applyAppMode();
  ctx.setStatus(ctx.currentMode === "CAM" ? "Modo CAM / Fresado activo. El STL azul es diseno objetivo protegido." : "Modo CAD / Preparacion activo.", "ok");
}

export function updateCamPanel() {
  const part = ctx.selectedModel;
  const params = getCamParameters();
  const cam = part ? ensureCam(part) : null;
  const active = cam && cam.toolpaths.length ? cam.toolpaths[cam.toolpaths.length - 1] : null;
  const analysis = cam ? cam.analysis : null;
  const sim = cam ? cam.simulation : null;

  const selectedPart = ctx.document.getElementById("camSelectedPart");
  if (selectedPart) selectedPart.value = part ? `${part.label} · ${part.fileName}` : "-";
  const material = ctx.document.getElementById("camMaterial");
  if (material) material.value = params.material.name;
  const machine = ctx.document.getElementById("camMachine");
  if (machine) machine.value = params.machine.name;
  const disc = ctx.document.getElementById("camDisc");
  if (disc) disc.value = `${ctx.discDiameter} x ${ctx.discHeight} mm`;

  setCamText("camPointCount", active ? `${active.points.length} total / ${active.cutPointCount || 0} corte / ${active.rapidPointCount || 0} rapid` : 0);
  setCamText("camLayerCount", active ? active.layers || 0 : 0);
  setCamText("camPathLength", active ? `${(active.cutLength || 0).toFixed(2)} corte / ${(active.rapidLength || 0).toFixed(2)} rapid mm` : "0.00 mm");
  setCamText("camActiveTool", `${params.tool.name} · ${params.rpm} rpm · F${params.feedRate}`);
  setCamText("camEstimatedTime", `${((active ? active.estimatedTime : 0) || 0).toFixed(1)} min`);
  setCamText("camRemovedState", `${sim ? sim.removedMarkersCount || 0 : 0} huellas / ${sim ? sim.removedCellsCount || 0 : 0} celdas`);
  setCamText("camRemovedCount", `${sim ? sim.remainingCellsCount || 0 : 0} celdas`);
  setCamText("camStatus", sim && sim.status ? sim.status : active ? active.status || "Trayectoria valida demo" : "Pendiente");
  setCamText("camCollisionRisk", `${params.strategy} · ${params.material.name} · ${params.machine.axes.join("")}`);
  setCamText("camOvercut", analysis && analysis.possibleOvercut ? "Si - invade zona protegida" : "No detectado");
  setCamText("camRemaining", `Tol ${params.tolerance.toFixed(2)} · SO ${params.stepOverPercent.toFixed(0)}%/${params.stepOver.toFixed(2)} mm · SD ${params.stepDown.toFixed(2)} · stock ${params.stockToLeave.toFixed(2)}`);
  setCamText("camMaxError", "Pendiente");
  setCamText("camAvgError", "Pendiente");
  setCamText("camComparisonStatus", analysis ? analysis.status : "Comparacion geometrica real pendiente");
  setCamText("camConceptNote", params.strategy === "Acabado" ? "Acabado demo: pasada fina pendiente de superficie real." : "Desbaste demo: deja tolerancia, requiere acabado.");
  updateVoxelMetrics();
  renderCamOperationList();
}

function createDentalOperation(name, strategyId, toolId) {
  return {
    id: `operation_${camOperationCounter++}`,
    name,
    strategyId,
    toolId,
    status: "Pendiente",
    removedVoxels: 0,
    possibleOvercut: false,
    createdAt: new Date().toISOString()
  };
}

function applyOperationSettings(operation) {
  if (!operation) return;
  const tool = ctx.document.getElementById("camTool");
  const strategy = ctx.document.getElementById("camStrategy");
  if (tool) tool.value = findTool(operation.toolId).id;
  if (strategy) strategy.value = findStrategy(operation.strategyId).id;
  applyStrategyDefaults(false);
}

function prepareDentalCamStock() {
  if (!ctx.requireModel()) return;
  ensureDentalOperations(ctx.selectedModel);
  generateHeightmapForPart(ctx.selectedModel);
  createVoxelStockForPart(ctx.selectedModel);
  showVoxelStock(true);
  setCamViewPreset("stock", true);
  renderCamOperationList();
  ctx.setStatus("Disco dental preparado como stock. Elegi herramienta/operacion y presiona Desbastar stock.", "ok");
}

function applyToolpathToVoxelStock(path) {
  const cam = ensureCam(ctx.selectedModel);
  const stock = cam.voxelStock || createVoxelStockForPart(ctx.selectedModel);
  const before = stock.removedVoxels || 0;
  const cutPoints = (path.points || []).filter(point => (point.moveType || "cut") === "cut");
  const totalLength = Math.max(path.cutLength || calculatePathLength(cutPoints), CAM_REMOVAL_PRECISION_MM);
  const precisionStep = Math.max(CAM_REMOVAL_PRECISION_MM, totalLength / CAM_MAX_SWEEP_SAMPLES);
  for (let i = 0; i < cutPoints.length; i += 1) {
    const previous = i > 0 ? cutPoints[i - 1] : cutPoints[i];
    removeVoxelsAlongToolMove(previous, cutPoints[i], path.tool, precisionStep, true);
  }
  updateVoxelInfoForPart(ctx.selectedModel);
  updateOvercutWarningVisual(stock);
  updateVoxelStockVisual(false);
  updateCamPanel();
  return {
    removedVoxels: Math.max(0, stock.removedVoxels - before),
    possibleOvercut: !!stock.possibleOvercut
  };
}

function toggleCamAdvancedPanel() {
  const panel = ctx.document.getElementById("camAdvancedPanel");
  if (!panel) return;
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

function ensureDentalOperations(model) {
  const cam = ensureCam(model);
  if (!cam.operations.length) cam.operations.push(createDentalOperation("Desbaste", "roughing", "flat_2_0"));
  if (!cam.activeOperationId) cam.activeOperationId = cam.operations[0].id;
  return cam.operations;
}

function renderCamOperationList() {
  const list = ctx.document.getElementById("camOperationList");
  if (!list) return;
  if (!ctx.selectedModel) {
    list.innerHTML = '<div class="empty-list">Importa y selecciona una pieza.</div>';
    return;
  }
  const cam = ensureCam(ctx.selectedModel);
  const operations = ensureDentalOperations(ctx.selectedModel);
  list.innerHTML = operations.map((operation, index) => {
    const tool = findTool(operation.toolId);
    const strategy = findStrategy(operation.strategyId);
    const active = operation.id === cam.activeOperationId;
    const statusClass = `${active ? "active" : ""} ${operation.possibleOvercut ? "bad" : operation.status === "Aplicada" ? "ok" : ""}`;
    const toolOptions = TOOLS.map(item => `<option value="${item.id}"${item.id === operation.toolId ? " selected" : ""}>${item.name}</option>`).join("");
    const strategyOptions = STRATEGIES.map(item => `<option value="${item.id}"${item.id === operation.strategyId ? " selected" : ""}>${item.name}</option>`).join("");
    return `<div class="cam-operation ${statusClass}" onclick="selectDentalOperation('${operation.id}')"><div><b>${index + 1}. ${operation.name}</b><span>${tool.name} - ${strategy.name}</span><div class="cam-operation-controls"><select onclick="event.stopPropagation()" onchange="setDentalOperationTool('${operation.id}',this.value)">${toolOptions}</select><select onclick="event.stopPropagation()" onchange="setDentalOperationStrategy('${operation.id}',this.value)">${strategyOptions}</select></div><div class="cam-operation-actions"><button class="secondary" onclick="event.stopPropagation();simulateCurrentDentalOperation('${operation.id}')">Simular</button><button class="success" onclick="event.stopPropagation();runDentalRoughingOperation('${operation.id}')">Aplicar</button><button class="secondary" onclick="event.stopPropagation();acceptDentalOperation('${operation.id}')">Aceptar</button><button class="secondary" onclick="event.stopPropagation();skipDentalOperation('${operation.id}')">Saltar</button><button class="danger" onclick="event.stopPropagation();deleteDentalOperation('${operation.id}')">Eliminar</button></div></div><strong>${operation.status}</strong></div>`;
  }).join("");
}

function activeDentalOperation(id) {
  if (!ctx.selectedModel) return null;
  const operations = ensureDentalOperations(ctx.selectedModel);
  const cam = ensureCam(ctx.selectedModel);
  if (id) cam.activeOperationId = id;
  return operations.find(operation => operation.id === cam.activeOperationId) || operations.find(operation => operation.status === "Pendiente") || operations[operations.length - 1];
}

function selectDentalOperation(id) {
  if (!ctx.selectedModel) return;
  const operation = activeDentalOperation(id);
  applyOperationSettings(operation);
  renderCamOperationList();
  updateCamPanel();
}

function setDentalOperationTool(id, toolId) {
  const operation = activeDentalOperation(id);
  if (!operation) return;
  operation.toolId = findTool(toolId).id;
  if (operation.status === "Aplicada") operation.status = "Pendiente";
  applyOperationSettings(operation);
  renderCamOperationList();
}

function setDentalOperationStrategy(id, strategyId) {
  const operation = activeDentalOperation(id);
  if (!operation) return;
  operation.strategyId = findStrategy(strategyId).id;
  if (operation.status === "Aplicada") operation.status = "Pendiente";
  applyOperationSettings(operation);
  renderCamOperationList();
}

function acceptDentalOperation(id) {
  const operation = activeDentalOperation(id);
  if (!operation) return;
  operation.status = "Aplicada";
  operation.possibleOvercut = false;
  moveToNextPendingOperation();
  renderCamOperationList();
}

function skipDentalOperation(id) {
  const operation = activeDentalOperation(id);
  if (!operation) return;
  operation.status = "Saltada";
  moveToNextPendingOperation();
  renderCamOperationList();
}

function deleteDentalOperation(id) {
  if (!ctx.selectedModel) return;
  const cam = ensureCam(ctx.selectedModel);
  cam.operations = ensureDentalOperations(ctx.selectedModel).filter(operation => operation.id !== id);
  if (!cam.operations.length) cam.operations.push(createDentalOperation("Desbaste", "roughing", "flat_2_0"));
  cam.activeOperationId = cam.operations[0].id;
  renderCamOperationList();
}

function moveToNextPendingOperation() {
  if (!ctx.selectedModel) return;
  const cam = ensureCam(ctx.selectedModel);
  const next = ensureDentalOperations(ctx.selectedModel).find(operation => operation.status === "Pendiente");
  if (next) cam.activeOperationId = next.id;
}

function runDentalRoughingOperation(id) {
  if (!ctx.requireModel()) return;
  const operation = activeDentalOperation(id);
  applyOperationSettings(operation);
  if (!ensureCam(ctx.selectedModel).voxelStock) prepareDentalCamStock();
  generateDemoToolpath();
  const path = selectedToolpath();
  if (!path) return;
  operation.status = "Aplicando";
  renderCamOperationList();
  const result = applyToolpathToVoxelStock(path);
  operation.status = result.possibleOvercut ? "Revisar" : "Aplicada";
  operation.removedVoxels = result.removedVoxels;
  operation.possibleOvercut = result.possibleOvercut;
  if (!result.possibleOvercut) moveToNextPendingOperation();
  showMachinedVoxelStock(true);
  renderCamOperationList();
  ctx.setStatus(result.possibleOvercut ? "Operacion aplicada con alerta: posible sobrecorte." : `Operacion aplicada: ${result.removedVoxels} voxels removidos.`, result.possibleOvercut ? "warning" : "ok");
}

function simulateCurrentDentalOperation(id) {
  if (!ctx.requireModel()) return;
  const operation = activeDentalOperation(id);
  applyOperationSettings(operation);
  if (!selectedToolpath()) generateDemoToolpath();
  if (!ensureCam(ctx.selectedModel).voxelStock) createVoxelStockForPart(ctx.selectedModel);
  setCamViewPreset("simulation", true);
  startCamSimulation();
}

function addDentalOperation() {
  if (!ctx.requireModel()) return;
  const cam = ensureCam(ctx.selectedModel);
  const next = ensureDentalOperations(ctx.selectedModel).length;
  const presets = [
    createDentalOperation("Desbaste", "roughing", "flat_2_0"),
    createDentalOperation("Semiacabado", "roughing", "flat_1_0"),
    createDentalOperation("Acabado", "finishing", "ball_0_6"),
    createDentalOperation("Detalle", "finishing", "ball_0_3")
  ];
  const operation = presets[Math.min(next, presets.length - 1)];
  cam.operations.push(operation);
  cam.activeOperationId = operation.id;
  renderCamOperationList();
}

function heightmapResolution() {
  return Math.max(0.25, numberInput("camHeightmapResolution", 1));
}

function generateHeightmapForSelectedPart() {
  if (!ctx.requireModel()) return null;
  const heightmap = generateHeightmapForPart(ctx.selectedModel);
  showHeightmap(true);
  updateCamPanel();
  updateHeightmapMetrics();
  ctx.setStatus(`Heightmap generado: ${heightmap.rows}x${heightmap.cols}, ${heightmap.surfacePoints} puntos de superficie.`, "ok");
  return heightmap;
}

function generateHeightmapForPart(part) {
  const params = getCamParameters();
  const cam = ensureCam(part);
  part.mesh.updateMatrixWorld(true);
  const box = new ctx.THREE.Box3().setFromObject(part.mesh);
  const resolution = heightmapResolution();
  const margin = Math.max(params.tool.diameter * 1.5, params.stepOver * 1.5, 2);
  const bounds = {
    minX: Number((box.min.x - margin).toFixed(3)),
    maxX: Number((box.max.x + margin).toFixed(3)),
    minY: Number((box.min.y - margin).toFixed(3)),
    maxY: Number((box.max.y + margin).toFixed(3)),
    minZ: Number(box.min.z.toFixed(3)),
    maxZ: Number(box.max.z.toFixed(3))
  };
  const cols = Math.max(1, Math.floor((bounds.maxX - bounds.minX) / resolution) + 1);
  const rows = Math.max(1, Math.floor((bounds.maxY - bounds.minY) / resolution) + 1);
  const cells = [];
  let surfacePoints = 0;

  for (let row = 0; row < rows; row += 1) {
    const y = bounds.minY + row * resolution;
    for (let col = 0; col < cols; col += 1) {
      const x = bounds.minX + col * resolution;
      const zSurface = raycastSurfaceZAtXY(part, x, y, bounds.maxZ + margin + params.tool.diameter);
      const hasSurface = Number.isFinite(zSurface);
      if (hasSurface) surfacePoints += 1;
      cells.push({
        row,
        col,
        x: Number(x.toFixed(3)),
        y: Number(y.toFixed(3)),
        zSurface: hasSurface ? Number(zSurface.toFixed(3)) : null,
        hasSurface,
        protectedZ: hasSurface ? Number((zSurface + params.stockToLeave).toFixed(3)) : null,
        roughingZ: null
      });
    }
  }

  const heightmap = {
    resolution,
    bounds,
    rows,
    cols,
    cells,
    surfacePoints,
    generatedAt: new Date().toISOString()
  };
  computeProtectedHeightmap(heightmap, params.stockToLeave);
  cam.heightmap = heightmap;
  cam.heightmapInfo = heightmapInfo(heightmap);
  cam.analysis.heightmapResolution = resolution;
  cam.analysis.surfacePoints = surfacePoints;
  cam.analysis.protectedPoints = surfacePoints;
  cam.analysis.status = "Heightmap 2.5D generado desde raycast vertical del STL.";
  return heightmap;
}

function raycastSurfaceZAtXY(part, x, y, originZ) {
  const raycaster = new ctx.THREE.Raycaster(
    new ctx.THREE.Vector3(x, y, originZ),
    new ctx.THREE.Vector3(0, 0, -1),
    0,
    Math.max(1, originZ + ctx.discHeight + 200)
  );
  const hits = raycaster.intersectObject(part.mesh, true);
  if (!hits.length) return null;
  hits.sort((a, b) => b.point.z - a.point.z);
  return hits[0].point.z;
}

function getNearestHeightmapCell(heightmap, x, y) {
  if (!heightmap || !heightmap.cells || !heightmap.cells.length) return null;
  const col = Math.max(0, Math.min(heightmap.cols - 1, Math.round((x - heightmap.bounds.minX) / heightmap.resolution)));
  const row = Math.max(0, Math.min(heightmap.rows - 1, Math.round((y - heightmap.bounds.minY) / heightmap.resolution)));
  return heightmap.cells[row * heightmap.cols + col] || null;
}

function computeProtectedHeightmap(heightmap, stockToLeave) {
  let protectedPoints = 0;
  heightmap.cells.forEach(cell => {
    if (!cell.hasSurface) return;
    protectedPoints += 1;
    cell.protectedZ = Number((cell.zSurface + stockToLeave).toFixed(3));
  });
  heightmap.protectedPoints = protectedPoints;
  heightmap.stockToLeave = stockToLeave;
  return heightmap;
}

function generateRoughingHeightmapToolpath(part) {
  const params = getCamParameters();
  const cam = ensureCam(part);
  const heightmap = cam.heightmap || generateHeightmapForPart(part);
  computeProtectedHeightmap(heightmap, params.stockToLeave);
  const cutSegments = [];
  const rapidSegments = [];
  const points = [];
  const removedKeys = new Set();
  let layers = 0;
  let skippedProtectedPoints = 0;
  const zTop = Math.min(ctx.discHeight / 2, heightmap.bounds.maxZ + params.tool.diameter + params.stepDown);
  const zBottom = Math.max(-ctx.discHeight / 2, heightmap.bounds.minZ);
  const clearanceZ = Math.min(ctx.discHeight / 2 + params.tool.diameter, heightmap.bounds.maxZ + 3);
  const xyStep = Math.max(heightmap.resolution, params.stepOver);
  let previousCutEnd = null;

  for (let z = zTop; z >= zBottom; z -= params.stepDown) {
    layers += 1;
    let direction = 1;
    for (let y = heightmap.bounds.minY; y <= heightmap.bounds.maxY; y += xyStep) {
      const samples = [];
      for (let x = heightmap.bounds.minX; x <= heightmap.bounds.maxX; x += xyStep) {
        const cell = getNearestHeightmapCell(heightmap, x, y);
        samples.push({ x, y, z, cell });
      }
      if (direction < 0) samples.reverse();
      const layer = buildCutAndRapidSegmentsForLayer(z, samples, clearanceZ, previousCutEnd);
      skippedProtectedPoints += layer.skippedProtectedPoints;
      layer.cutCells.forEach(key => removedKeys.add(key));
      layer.cutSegments.forEach(segment => cutSegments.push(segment));
      layer.rapidSegments.forEach(segment => rapidSegments.push(segment));
      layer.points.forEach(point => points.push(point));
      previousCutEnd = layer.lastCutEnd || previousCutEnd;
      direction *= -1;
    }
  }

  const path = makeHeightmapToolpath("Desbaste heightmap", params, heightmap, points, layers, false, "Desbaste heightmap 2.5D listo. Corte separado de movimientos rapid.");
  path.cutSegments = cutSegments;
  path.rapidSegments = rapidSegments;
  path.clearanceZ = Number(clearanceZ.toFixed(3));
  path.skippedProtectedPoints = skippedProtectedPoints;
  path.cutPointCount = points.filter(point => point.moveType === "cut").length;
  path.rapidPointCount = points.filter(point => point.moveType === "rapid").length;
  path.cutLength = Number(calculateSegmentLength(cutSegments).toFixed(3));
  path.rapidLength = Number(calculateSegmentLength(rapidSegments).toFixed(3));
  cam.toolpaths.push(path);
  updateHeightmapAnalysis(cam, heightmap, removedKeys.size, skippedProtectedPoints, false, path.status);
  return path;
}

function buildCutAndRapidSegmentsForLayer(layerZ, scanLineSamples, clearanceZ, previousCutEnd) {
  const cutSegments = [];
  const rapidSegments = [];
  const points = [];
  const cutCells = [];
  let currentCut = [];
  let lastCutEnd = previousCutEnd;
  let skippedProtectedPoints = 0;

  scanLineSamples.forEach(sample => {
    const cell = sample.cell;
    const protectedCell = cell && cell.hasSurface && layerZ <= cell.protectedZ;
    const cuttable = !protectedCell;
    const point = vectorData(new ctx.THREE.Vector3(sample.x, sample.y, layerZ));
    if (!cuttable) {
      skippedProtectedPoints += 1;
      if (currentCut.length) {
        cutSegments.push(currentCut);
        lastCutEnd = currentCut[currentCut.length - 1];
        currentCut = [];
      }
      return;
    }

    const cutPoint = Object.assign({}, point, { moveType: "cut" });
    if (!currentCut.length) {
      if (lastCutEnd) {
        const rapid = createRapidLink(lastCutEnd, point, clearanceZ);
        rapidSegments.push(rapid);
        rapid.forEach(rapidPoint => points.push(rapidPoint));
      }
      currentCut.push(cutPoint);
    } else {
      currentCut.push(cutPoint);
    }
    points.push(cutPoint);

    if (cell && cell.hasSurface) cutCells.push(`${cell.row}:${cell.col}`);
  });

  if (currentCut.length) {
    cutSegments.push(currentCut);
    lastCutEnd = currentCut[currentCut.length - 1];
  }
  return { cutSegments, rapidSegments, points, cutCells, skippedProtectedPoints, lastCutEnd };
}

function createRapidLink(fromPoint, toPoint, clearanceZ) {
  const from = vector(fromPoint);
  const to = vector(toPoint);
  return [
    vectorData(new ctx.THREE.Vector3(from.x, from.y, from.z)),
    Object.assign(vectorData(new ctx.THREE.Vector3(from.x, from.y, clearanceZ)), { moveType: "rapid" }),
    Object.assign(vectorData(new ctx.THREE.Vector3(to.x, to.y, clearanceZ)), { moveType: "rapid" }),
    Object.assign(vectorData(new ctx.THREE.Vector3(to.x, to.y, to.z)), { moveType: "rapid" })
  ].map(point => Object.assign(point, { moveType: "rapid" }));
}

function generateFinishingHeightmapToolpath(part) {
  const params = getCamParameters();
  const cam = ensureCam(part);
  const heightmap = cam.heightmap || generateHeightmapForPart(part);
  computeProtectedHeightmap(heightmap, Math.min(params.stockToLeave, 0.05));
  const points = [];
  let direction = 1;
  for (let row = 0; row < heightmap.rows; row += 1) {
    const rowCells = [];
    for (let col = 0; col < heightmap.cols; col += 1) {
      const cell = heightmap.cells[row * heightmap.cols + col];
      if (cell && cell.hasSurface) rowCells.push(vectorData(new ctx.THREE.Vector3(cell.x, cell.y, cell.protectedZ)));
    }
    if (direction < 0) rowCells.reverse();
    rowCells.forEach(point => points.push(point));
    direction *= -1;
  }
  const path = makeHeightmapToolpath("Acabado heightmap", params, heightmap, points, 1, false, "Acabado heightmap demo. No reemplaza calculo 3D real de superficie.");
  cam.toolpaths.push(path);
  updateHeightmapAnalysis(cam, heightmap, points.length, 0, false, path.status);
  return path;
}

function makeHeightmapToolpath(strategy, params, heightmap, points, layers, overcut, status) {
  const length = calculatePathLength(points);
  return {
    id: `heightmap_toolpath_${Date.now()}`,
    strategy,
    source: "heightmap_2_5d_demo",
    tool: params.tool,
    tolerance: params.tolerance,
    stockToLeave: params.stockToLeave,
    stepOver: params.stepOver,
    stepDown: params.stepDown,
    heightmapInfo: heightmapInfo(heightmap),
    points,
    layers,
    length: Number(length.toFixed(3)),
    estimatedTime: Number((length / Math.max(params.feedRate, 1)).toFixed(2)),
    possibleOvercut: overcut,
    status,
    createdAt: new Date().toISOString()
  };
}

function calculateSegmentLength(segments) {
  return segments.reduce((total, segment) => total + calculatePathLength(segment), 0);
}

function updateHeightmapAnalysis(cam, heightmap, machinedPoints, skippedProtectedPoints, possibleOvercut, status) {
  const removable = Math.max(1, heightmap.surfacePoints || 0);
  cam.heightmapInfo = heightmapInfo(heightmap);
  cam.simulation.removedCellsCount = machinedPoints;
  cam.simulation.remainingCellsCount = Math.max(0, removable - machinedPoints);
  cam.simulation.status = status;
  cam.analysis.heightmapResolution = heightmap.resolution;
  cam.analysis.surfacePoints = heightmap.surfacePoints;
  cam.analysis.protectedPoints = heightmap.protectedPoints || heightmap.surfacePoints;
  cam.analysis.machinedPoints = machinedPoints;
  cam.analysis.skippedProtectedPoints = skippedProtectedPoints;
  cam.analysis.coverageDemo = Math.min(100, machinedPoints / removable * 100);
  cam.analysis.possibleOvercut = !!possibleOvercut;
  cam.analysis.comparisonReal = false;
  cam.analysis.status = possibleOvercut ? "Posible sobrecorte detectado en heightmap." : status;
}

function heightmapInfo(heightmap) {
  return {
    resolution: Number(heightmap.resolution.toFixed(3)),
    rows: heightmap.rows,
    cols: heightmap.cols,
    bounds: heightmap.bounds,
    surfacePoints: heightmap.surfacePoints,
    generatedAt: heightmap.generatedAt
  };
}

function ensureHeightmapForSelectedPart() {
  if (!ctx.requireModel()) return null;
  const cam = ensureCam(ctx.selectedModel);
  return cam.heightmap || generateHeightmapForPart(ctx.selectedModel);
}

function sampledHeightmapPoints(heightmap, zSelector) {
  const points = [];
  const surfaceCells = heightmap.cells.filter(cell => cell.hasSurface);
  const max = 900;
  const step = Math.max(1, Math.ceil(surfaceCells.length / max));
  for (let i = 0; i < surfaceCells.length; i += step) {
    const cell = surfaceCells[i];
    points.push(new ctx.THREE.Vector3(cell.x, cell.y, zSelector(cell)));
  }
  return points;
}

function showHeightmap(silent) {
  const heightmap = ensureHeightmapForSelectedPart();
  if (!heightmap) return;
  removeVisualList(camVisuals.heightmap);
  const points = sampledHeightmapPoints(heightmap, cell => cell.zSurface);
  createMarkerCloud(points, Math.max(heightmap.resolution * 0.22, 0.12), 0x38bdf8, 0.55, camVisuals.heightmap);
  applyCamVisibility();
  if (!silent) ctx.setStatus("Heightmap visible: puntos detectados sobre la superficie STL.", "ok");
}

function showRoughingTolerance(silent) {
  const heightmap = ensureHeightmapForSelectedPart();
  if (!heightmap) return;
  removeVisualList(camVisuals.tolerance);
  computeProtectedHeightmap(heightmap, getCamParameters().stockToLeave);
  const points = sampledHeightmapPoints(heightmap, cell => cell.protectedZ);
  createMarkerCloud(points, Math.max(heightmap.resolution * 0.24, 0.14), 0xfacc15, 0.44, camVisuals.tolerance);
  applyCamVisibility();
  if (!silent) ctx.setStatus("Tolerancia de desbaste visible: STL + stock to leave.", "ok");
}

function showMaterialToRemoveFromHeightmap(silent) {
  const heightmap = ensureHeightmapForSelectedPart();
  if (!heightmap) return;
  clearRemovedMaterialVisuals();
  const params = getCamParameters();
  computeProtectedHeightmap(heightmap, params.stockToLeave);
  const zTop = Math.min(ctx.discHeight / 2, heightmap.bounds.maxZ + params.tool.diameter);
  const points = [];
  const surfaceCells = heightmap.cells.filter(cell => cell.hasSurface && cell.protectedZ < zTop);
  const step = Math.max(1, Math.ceil(surfaceCells.length / 700));
  for (let i = 0; i < surfaceCells.length; i += step) {
    const cell = surfaceCells[i];
    const z = Math.min(zTop, cell.protectedZ + Math.max(params.stockToLeave, params.stepDown * 0.5));
    points.push(new ctx.THREE.Vector3(cell.x, cell.y, z));
  }
  createMarkerCloud(points, Math.max(params.tool.diameter * 0.18, 0.12), 0xf97316, 0.42, camVisuals.removed);
  const cam = ensureCam(ctx.selectedModel);
  cam.simulation.removedMarkersCount = points.length;
  cam.simulation.removedCellsCount = points.length;
  cam.analysis.machinedPoints = Math.max(cam.analysis.machinedPoints || 0, points.length);
  cam.analysis.status = "Material a remover demo calculado por encima del heightmap protegido.";
  updateHeightmapMetrics();
  updateCamPanel();
  if (!silent) ctx.setStatus("Material a remover visible: solo por encima de protectedZ.", "ok");
}

function showRemainingStockFromHeightmap(silent) {
  return showMachinedVoxelStock(silent);
}

function simulateHeightmapToolpath() {
  return startCamSimulation();
}

function updateHeightmapMetrics() {
  const cam = ctx.selectedModel ? ensureCam(ctx.selectedModel) : null;
  if (!cam) return;
  const info = cam.heightmapInfo;
  const analysis = cam.analysis || {};
  if (info) {
    setCamText("camLayerCount", `${info.rows} x ${info.cols}`);
    setCamText("camMaxError", `Superficie ${analysis.surfacePoints || info.surfacePoints || 0}`);
    setCamText("camAvgError", `Resolucion ${(analysis.heightmapResolution || info.resolution || 0).toFixed(2)} mm`);
    setCamText("camComparisonStatus", analysis.status || "Comparacion real pendiente");
  }
}

function clearHeightmapVisuals() {
  removeVisualList(camVisuals.heightmap);
  removeVisualList(camVisuals.tolerance);
}

function voxelSizeInput() {
  return Math.max(0.5, numberInput("camVoxelSize", 1));
}

function createVoxelStockForSelectedPart() {
  if (!ctx.requireModel()) return null;
  const stock = createVoxelStockForPart(ctx.selectedModel);
  showVoxelStock(true);
  updateCamPanel();
  ctx.setStatus(`Disco voxel creado: ${stock.totalVoxels} voxels, ${stock.protectedVoxels} protegidos por piezas/soportes.`, stock.resolutionAdjusted ? "warning" : "ok");
  return stock;
}

function createVoxelStockForPart(part) {
  const cam = ensureCam(part);
  let voxelSize = voxelSizeInput();
  const maxVoxels = 160000;
  const discRadius = ctx.discDiameter / 2;
  const bounds = {
    minX: Number((-discRadius).toFixed(3)),
    maxX: Number(discRadius.toFixed(3)),
    minY: Number((-discRadius).toFixed(3)),
    maxY: Number(discRadius.toFixed(3)),
    minZ: Number((-ctx.discHeight / 2).toFixed(3)),
    maxZ: Number((ctx.discHeight / 2).toFixed(3))
  };
  let dims = voxelDimensions(bounds, voxelSize);
  let resolutionAdjusted = false;
  while (estimateDiscVoxelCount(discRadius, ctx.discHeight, voxelSize) > maxVoxels) {
    voxelSize = Number((voxelSize + 0.25).toFixed(2));
    dims = voxelDimensions(bounds, voxelSize);
    resolutionAdjusted = true;
  }

  const voxels = [];
  let id = 0;
  for (let iz = 0; iz < dims.nz; iz += 1) {
    const z = bounds.minZ + iz * voxelSize + voxelSize / 2;
    for (let iy = 0; iy < dims.ny; iy += 1) {
      const y = bounds.minY + iy * voxelSize + voxelSize / 2;
      for (let ix = 0; ix < dims.nx; ix += 1) {
        const x = bounds.minX + ix * voxelSize + voxelSize / 2;
        if (Math.sqrt(x * x + y * y) > discRadius) continue;
        voxels.push({
          id,
          ix,
          iy,
          iz,
          x: Number(x.toFixed(3)),
          y: Number(y.toFixed(3)),
          z: Number(z.toFixed(3)),
          occupied: true,
          protected: false,
          removed: false
        });
        id += 1;
      }
    }
  }

  cam.voxelStock = {
    voxelSize,
    bounds,
    dims,
    voxels,
    voxelIndex: new Map(voxels.map(voxel => [voxelKey(voxel), voxel])),
    totalVoxels: voxels.length,
    removedVoxels: 0,
    remainingVoxels: voxels.length,
    protectedVoxels: 0,
    possibleOvercut: false,
    resolutionAdjusted,
    generatedAt: new Date().toISOString()
  };
  classifyProtectedVoxels(part);
  updateVoxelInfoForPart(part);
  return cam.voxelStock;
}

function estimateDiscVoxelCount(radius, height, voxelSize) {
  return Math.ceil((Math.PI * radius * radius * height) / (voxelSize ** 3));
}

function voxelDimensions(bounds, voxelSize) {
  const nx = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / voxelSize));
  const ny = Math.max(1, Math.ceil((bounds.maxY - bounds.minY) / voxelSize));
  const nz = Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) / voxelSize));
  return { nx, ny, nz, total: nx * ny * nz };
}

function protectedGeometryTargets() {
  const params = getCamParameters();
  return ctx.models
    .filter(model => model && model.mesh)
    .map(model => {
      const heightmap = generateHeightmapForPart(model);
      computeProtectedHeightmap(heightmap, params.stockToLeave);
      return {
        model,
        heightmap,
        supports: Array.isArray(model.supports) ? model.supports : []
      };
    });
}

function classifyProtectedVoxels(part) {
  const cam = ensureCam(part);
  const stock = cam.voxelStock;
  if (!stock) return null;
  const targets = protectedGeometryTargets();
  let protectedVoxels = 0;
  stock.voxels.forEach(voxel => {
    voxel.protected = isVoxelProtectedByTargets(voxel, targets, stock.voxelSize);
    if (voxel.protected) protectedVoxels += 1;
  });
  stock.protectedVoxels = protectedVoxels;
  stock.protectedScope = "all_nested_parts_and_supports";
  stock.protectedPartCount = targets.length;
  stock.protectedSupportCount = targets.reduce((count, target) => count + target.supports.length, 0);
  updateVoxelInfoForPart(part);
  return stock;
}

function isVoxelProtectedByTargets(voxel, targets, voxelSize) {
  return targets.some(target => {
    const cell = getNearestHeightmapCell(target.heightmap, voxel.x, voxel.y);
    if (cell && cell.hasSurface && voxel.z <= cell.protectedZ) return true;
    return target.supports.some(support => isVoxelInsideSupportEnvelope(voxel, support, voxelSize));
  });
}

function isVoxelInsideSupportEnvelope(voxel, support, voxelSize) {
  if (!support) return false;
  const point = new ctx.THREE.Vector3(voxel.x, voxel.y, voxel.z);
  const start = support.startPoint ? vector(support.startPoint) : null;
  let end = support.endPoint ? vector(support.endPoint) : null;
  const direction = support.direction ? vector(support.direction) : null;
  const length = Number(support.length) || 0;
  if (!end && start && direction && length > 0) end = start.clone().add(direction.normalize().multiplyScalar(length));
  if (start && end) {
    const radius = Math.max((Number(support.diameter) || 2) / 2, voxelSize * 0.55);
    return distancePointToSegment(point, start, end) <= radius + voxelSize * 0.5;
  }
  if (support.mesh) {
    support.mesh.updateMatrixWorld(true);
    const box = new ctx.THREE.Box3().setFromObject(support.mesh);
    box.expandByScalar(voxelSize * 0.5);
    return box.containsPoint(point);
  }
  return false;
}

function distancePointToSegment(point, start, end) {
  const segment = new ctx.THREE.Vector3().subVectors(end, start);
  const lengthSq = segment.lengthSq();
  if (!lengthSq) return point.distanceTo(start);
  const t = Math.max(0, Math.min(1, new ctx.THREE.Vector3().subVectors(point, start).dot(segment) / lengthSq));
  const closest = start.clone().add(segment.multiplyScalar(t));
  return point.distanceTo(closest);
}

function showVoxelStock(silent) {
  if (!ctx.requireModel()) return;
  const cam = ensureCam(ctx.selectedModel);
  if (!cam.voxelStock) createVoxelStockForPart(ctx.selectedModel);
  updateVoxelStockVisual();
  showDesignTarget(true);
  if (!silent) ctx.setStatus("Stock inicial visible: disco dental completo con el diseno objetivo encima.", "ok");
}

function hideVoxelStock() {
  removeCamObject(camVisuals.voxelStock);
  camVisuals.voxelStock = null;
}

function updateVoxelStockVisual(showRemoved) {
  if (!ctx.selectedModel) return;
  const cam = ensureCam(ctx.selectedModel);
  const stock = cam.voxelStock;
  hideVoxelStock();
  if (!stock) return;
  const includeRemoved = showRemoved !== undefined ? showRemoved : camViewState.showRemovedVoxels;
  const group = new ctx.THREE.Group();
  group.userData.camVisual = true;
  const hasMachining = stock.voxels.some(v => v.removed);
  if (hasMachining) {
    addVoxelSurfaceMesh(group, stock.voxels.filter(v => v.occupied), stock, 0xd1d5db, 0.32);
  } else {
    addSmoothDiscStockMesh(group, stock, 0xd1d5db, 0.34);
  }
  if (includeRemoved) addVoxelInstances(group, stock.voxels.filter(v => v.removed), stock.voxelSize, 0xf97316, 0.40, 1800);
  ctx.scene.add(group);
  camVisuals.voxelStock = group;
  updateOvercutWarningVisual(stock);
  applyCamVisibility();
}

function addSmoothDiscStockMesh(parent, stock, color, opacity) {
  const radius = Math.max(ctx.discDiameter / 2, 0.1);
  const height = Math.max(ctx.discHeight, 0.1);
  const geometry = new ctx.THREE.CylinderGeometry(radius, radius, height, 128, 1, false);
  geometry.rotateX(Math.PI / 2);
  const material = new ctx.THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.68,
    metalness: 0.03,
    side: ctx.THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new ctx.THREE.Mesh(geometry, material);
  mesh.userData.camVisual = true;
  parent.add(mesh);

  const edges = new ctx.THREE.LineSegments(
    new ctx.THREE.EdgesGeometry(geometry),
    new ctx.THREE.LineBasicMaterial({ color: 0xe5e7eb, transparent: true, opacity: 0.45 })
  );
  edges.userData.camVisual = true;
  parent.add(edges);
}

function addVoxelSurfaceMesh(parent, voxels, stock, color, opacity) {
  if (!voxels.length) return;
  const voxelSet = new Set(voxels.map(voxelKey));
  const positions = [];
  const normals = [];
  const indices = [];
  const half = stock.voxelSize / 2;
  const faces = [
    { d: [1, 0, 0], n: [1, 0, 0], c: [[half, -half, -half], [half, half, -half], [half, half, half], [half, -half, half]] },
    { d: [-1, 0, 0], n: [-1, 0, 0], c: [[-half, half, -half], [-half, -half, -half], [-half, -half, half], [-half, half, half]] },
    { d: [0, 1, 0], n: [0, 1, 0], c: [[-half, half, -half], [half, half, -half], [half, half, half], [-half, half, half]] },
    { d: [0, -1, 0], n: [0, -1, 0], c: [[half, -half, -half], [-half, -half, -half], [-half, -half, half], [half, -half, half]] },
    { d: [0, 0, 1], n: [0, 0, 1], c: [[-half, -half, half], [half, -half, half], [half, half, half], [-half, half, half]] },
    { d: [0, 0, -1], n: [0, 0, -1], c: [[-half, half, -half], [half, half, -half], [half, -half, -half], [-half, -half, -half]] }
  ];
  voxels.forEach(voxel => {
    faces.forEach(face => {
      const neighbor = `${voxel.ix + face.d[0]}:${voxel.iy + face.d[1]}:${voxel.iz + face.d[2]}`;
      if (voxelSet.has(neighbor)) return;
      const base = positions.length / 3;
      face.c.forEach(corner => {
        positions.push(voxel.x + corner[0], voxel.y + corner[1], voxel.z + corner[2]);
        normals.push(face.n[0], face.n[1], face.n[2]);
      });
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
  });
  if (!positions.length) return;
  const geometry = new ctx.THREE.BufferGeometry();
  geometry.setAttribute("position", new ctx.THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new ctx.THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const material = new ctx.THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.72, metalness: 0.04, side: ctx.THREE.DoubleSide, depthWrite: false });
  const mesh = new ctx.THREE.Mesh(geometry, material);
  mesh.userData.camVisual = true;
  parent.add(mesh);
}

function voxelKey(voxel) {
  return `${voxel.ix}:${voxel.iy}:${voxel.iz}`;
}

function addVoxelInstances(parent, voxels, voxelSize, color, opacity, maxInstances) {
  if (!voxels.length) return;
  const count = Math.min(voxels.length, maxInstances);
  const step = Math.max(1, Math.ceil(voxels.length / count));
  const geometry = new ctx.THREE.BoxGeometry(voxelSize * 0.92, voxelSize * 0.92, voxelSize * 0.92);
  const material = new ctx.THREE.MeshStandardMaterial({ color, transparent: true, opacity, depthWrite: false });
  const mesh = new ctx.THREE.InstancedMesh(geometry, material, count);
  const matrix = new ctx.THREE.Matrix4();
  let index = 0;
  for (let i = 0; i < voxels.length && index < count; i += step) {
    matrix.makeTranslation(voxels[i].x, voxels[i].y, voxels[i].z);
    mesh.setMatrixAt(index, matrix);
    index += 1;
  }
  mesh.count = index;
  mesh.userData.camVisual = true;
  parent.add(mesh);
}

function removeVoxelsByToolAtPoint(point, tool, deferUpdate) {
  if (!ctx.selectedModel) return 0;
  const cam = ensureCam(ctx.selectedModel);
  const stock = cam.voxelStock || createVoxelStockForPart(ctx.selectedModel);
  const p = vector(point);
  const candidates = candidateVoxelsForTool(stock, p, tool);
  let removed = 0;
  let overcut = false;
  const overcutPoints = [];
  candidates.forEach(voxel => {
    if (!voxel.occupied) return;
    const insideTool = isBallTool(tool) ? isVoxelInsideBallTool(voxel, p, tool, stock.voxelSize) : isVoxelInsideFlatTool(voxel, p, tool, stock.voxelSize);
    if (!insideTool) return;
    if (voxel.protected) {
      overcut = true;
      if (overcutPoints.length < 80) overcutPoints.push(new ctx.THREE.Vector3(voxel.x, voxel.y, voxel.z));
      return;
    }
    voxel.occupied = false;
    voxel.removed = true;
    removed += 1;
  });
  if (overcut) {
    stock.possibleOvercut = true;
    stock.overcutPoints = (stock.overcutPoints || []).concat(overcutPoints).slice(-160);
  }
  stock.removedVoxels += removed;
  if (!deferUpdate) stock.remainingVoxels = stock.voxels.filter(v => v.occupied).length;
  cam.analysis.possibleOvercut = cam.analysis.possibleOvercut || overcut;
  if (!deferUpdate) {
    updateVoxelInfoForPart(ctx.selectedModel);
    if (overcut) updateOvercutWarningVisual(stock);
  }
  return removed;
}

function candidateVoxelsForTool(stock, point, tool) {
  if (!stock.voxelIndex) stock.voxelIndex = new Map(stock.voxels.map(voxel => [voxelKey(voxel), voxel]));
  const radius = tool.diameter / 2 + stock.voxelSize;
  const minX = Math.floor((point.x - radius - stock.bounds.minX) / stock.voxelSize);
  const maxX = Math.ceil((point.x + radius - stock.bounds.minX) / stock.voxelSize);
  const minY = Math.floor((point.y - radius - stock.bounds.minY) / stock.voxelSize);
  const maxY = Math.ceil((point.y + radius - stock.bounds.minY) / stock.voxelSize);
  const minZValue = isBallTool(tool) ? point.z - radius : point.z - stock.voxelSize;
  const maxZValue = isBallTool(tool) ? point.z + tool.diameter + stock.voxelSize : point.z + Math.max(Number(tool.fluteLength) || ctx.discHeight, stock.voxelSize) + stock.voxelSize;
  const minZ = Math.floor((minZValue - stock.bounds.minZ) / stock.voxelSize);
  const maxZ = Math.ceil((maxZValue - stock.bounds.minZ) / stock.voxelSize);
  const voxels = [];
  for (let iz = Math.max(0, minZ); iz <= Math.min(stock.dims.nz - 1, maxZ); iz += 1) {
    for (let iy = Math.max(0, minY); iy <= Math.min(stock.dims.ny - 1, maxY); iy += 1) {
      for (let ix = Math.max(0, minX); ix <= Math.min(stock.dims.nx - 1, maxX); ix += 1) {
        const voxel = stock.voxelIndex.get(`${ix}:${iy}:${iz}`);
        if (voxel) voxels.push(voxel);
      }
    }
  }
  return voxels;
}

function removeVoxelsAlongToolMove(fromPoint, toPoint, tool, precisionStep, deferUpdate) {
  const from = vector(fromPoint);
  const to = vector(toPoint);
  const distance = from.distanceTo(to);
  const samples = Math.max(1, Math.ceil(distance / Math.max(precisionStep || CAM_REMOVAL_PRECISION_MM, CAM_REMOVAL_PRECISION_MM)));
  let removed = 0;
  for (let i = 0; i <= samples; i += 1) {
    removed += removeVoxelsByToolAtPoint(from.clone().lerp(to, i / samples), tool, true);
  }
  if (!deferUpdate) {
    updateVoxelInfoForPart(ctx.selectedModel);
    updateVoxelStockVisual(false);
  }
  return removed;
}

function updateOvercutWarningVisual(stock) {
  removeCamObject(camVisuals.overcutWarning);
  camVisuals.overcutWarning = null;
  if (stock && stock.possibleOvercut) updateCamPanel();
}

function isBallTool(tool) {
  return String(tool.type || "").toLowerCase() === "ball" || String(tool.id || "").toLowerCase().includes("ball") || String(tool.name || "").toLowerCase().includes("esfer");
}

function isVoxelInsideFlatTool(voxel, point, tool, voxelSize) {
  const radius = tool.diameter / 2;
  const dx = voxel.x - point.x;
  const dy = voxel.y - point.y;
  const radial = Math.sqrt(dx * dx + dy * dy);
  const fluteLength = Math.max(Number(tool.fluteLength) || ctx.discHeight, voxelSize);
  return radial <= radius + voxelSize * 0.35 && voxel.z >= point.z - voxelSize * 0.5 && voxel.z <= point.z + fluteLength + voxelSize * 0.5;
}

function isVoxelInsideBallTool(voxel, point, tool, voxelSize) {
  const radius = tool.diameter / 2;
  const centerZ = point.z + radius;
  const dx = voxel.x - point.x;
  const dy = voxel.y - point.y;
  const dz = voxel.z - centerZ;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) <= radius + voxelSize * 0.35;
}

function simulateVoxelToolpath() {
  if (!ctx.requireModel()) return;
  if (!selectedToolpath()) generateDemoToolpath();
  if (!ensureCam(ctx.selectedModel).voxelStock) createVoxelStockForPart(ctx.selectedModel);
  showVoxelStock(true);
  startCamSimulation();
}

function resetVoxelStock() {
  if (!ctx.requireModel()) return;
  createVoxelStockForPart(ctx.selectedModel);
  updateVoxelStockVisual();
  updateCamPanel();
  ctx.setStatus("Stock voxel reseteado.", "ok");
}

function showMachinedVoxelStock(silent) {
  if (!ctx.requireModel()) return;
  if (!ensureCam(ctx.selectedModel).voxelStock) createVoxelStockForPart(ctx.selectedModel);
  removeCamObject(camVisuals.machined);
  camVisuals.machined = null;
  removeVisualList(camVisuals.removed);
  camViewState.showRemovedVoxels = false;
  updateVoxelStockVisual(false);
  showDesignTarget(true);
  setCamViewPreset("machined", true);
  const cam = ensureCam(ctx.selectedModel);
  cam.result = { type: "voxel_remaining_stock", status: "Stock remanente real: voxels ocupados despues del mecanizado acumulado." };
  updateCamPanel();
  const stock = ensureCam(ctx.selectedModel).voxelStock;
  if (!silent) ctx.setStatus(stock.possibleOvercut ? "Stock remanente real visible con advertencia de sobrecorte." : "Stock remanente real visible: material actual menos desbastado.", stock.possibleOvercut ? "warning" : "ok");
}

function setCamViewPreset(preset, silent) {
  camViewState.currentPreset = preset;
  if (preset === "design") {
    showDesignTargetOnly();
    if (!silent) ctx.setStatus("Vista CAM: diseno objetivo original visible.", "ok");
    return;
  }
  const showStock = preset === "stock" || preset === "simulation" || preset === "machined";
  const showToolpath = preset === "toolpath" || preset === "simulation";
  const showTool = preset === "simulation";
  camViewState.showRemovedVoxels = false;

  if (ctx.selectedModel) {
    showDesignTarget(true);
    prepareDesignMeshForCam(ctx.selectedModel, preset === "stock" || preset === "machined" ? 0.55 : 0.72, preset === "machined");
  }
  if (camVisuals.voxelStock) camVisuals.voxelStock.visible = showStock;
  if (showStock && ctx.selectedModel && ensureCam(ctx.selectedModel).voxelStock) updateVoxelStockVisual(camViewState.showRemovedVoxels);
  camVisuals.toolpaths.forEach(obj => obj.visible = showToolpath);
  camVisuals.removed.forEach(obj => obj.visible = preset === "simulation");
  camVisuals.heightmap.forEach(obj => obj.visible = false);
  camVisuals.tolerance.forEach(obj => obj.visible = false);
  if (camVisuals.machined) camVisuals.machined.visible = preset === "machined";
  if (camVisuals.tool) camVisuals.tool.visible = showTool;
  if (camVisuals.overcutWarning) camVisuals.overcutWarning.visible = preset !== "stock";
  applyToolpathMoveVisibility();
  if (!silent) ctx.setStatus(`Vista CAM: ${preset}`, "ok");
}

function showDesignTargetOnly() {
  ctx.camVisibility.design = true;
  ctx.camVisibility.stock = false;
  ctx.camVisibility.toolpath = false;
  ctx.camVisibility.tool = false;
  ctx.camVisibility.removed = false;
  ctx.camVisibility.machined = false;
  ctx.camVisibility.comparison = false;
  syncCamVisibilityCheckboxes();

  const renderableModels = ctx.models.filter(model => model.mesh && model.mesh.geometry && model.mesh.geometry.attributes && model.mesh.geometry.attributes.position && model.mesh.geometry.attributes.position.count > 0);
  if (!renderableModels.length) {
    ctx.setStatus("No hay STL cargado en memoria. Importa el STL y luego carga el JSON del proyecto.", "warning");
    return;
  }

  ctx.models.forEach(model => {
    if (!model.mesh) return;
    let parent = model.mesh.parent;
    while (parent) {
      parent.visible = true;
      parent = parent.parent;
    }
    model.mesh.visible = true;
    prepareDesignMeshForCam(model, 0.95, false);
  });
  if (ctx.selectedModel && ctx.selectedModel.mesh) ctx.selectedModel.mesh.visible = true;
  hideSceneBoxHelpers();
  if (camVisuals.voxelStock) camVisuals.voxelStock.visible = false;
  camVisuals.toolpaths.forEach(obj => obj.visible = false);
  camVisuals.removed.forEach(obj => obj.visible = false);
  camVisuals.overcut.forEach(obj => obj.visible = false);
  camVisuals.heightmap.forEach(obj => obj.visible = false);
  camVisuals.tolerance.forEach(obj => obj.visible = false);
  if (camVisuals.tool) camVisuals.tool.visible = false;
  if (camVisuals.machined) camVisuals.machined.visible = false;
  if (camVisuals.comparison) camVisuals.comparison.visible = false;
  if (camVisuals.stock) camVisuals.stock.visible = false;
  if (camVisuals.overcutWarning) camVisuals.overcutWarning.visible = false;
  camViewState.showRapid = false;
  const input = ctx.document.getElementById("camShowRapidMoves");
  if (input) input.checked = false;
}

function prepareDesignMeshForCam(model, opacity, wireframe) {
  if (!model || !model.mesh || !model.mesh.material) return;
  model.mesh.visible = true;
  model.mesh.frustumCulled = false;
  model.mesh.renderOrder = 50;
  model.mesh.material.color.setHex(0x3b82f6);
  model.mesh.material.transparent = true;
  model.mesh.material.opacity = opacity;
  model.mesh.material.wireframe = !!wireframe;
  model.mesh.material.visible = true;
  model.mesh.material.depthTest = false;
  model.mesh.material.depthWrite = false;
  model.mesh.material.side = ctx.THREE.DoubleSide;
  model.mesh.material.needsUpdate = true;
}

function syncCamVisibilityCheckboxes() {
  ctx.document.querySelectorAll(".cam-visibility input[type='checkbox']").forEach(input => {
    const action = input.getAttribute("onchange") || "";
    const match = action.match(/toggleCamVisibility\('([^']+)'/);
    if (match && Object.prototype.hasOwnProperty.call(ctx.camVisibility, match[1])) input.checked = !!ctx.camVisibility[match[1]];
  });
}

function hideSceneBoxHelpers() {
  ctx.scene.traverse(obj => {
    if (obj && (obj.type === "BoxHelper" || obj.isBoxHelper)) obj.visible = false;
  });
}

function toggleRapidMoves(show) {
  camViewState.showRapid = !!show;
  const input = ctx.document.getElementById("camShowRapidMoves");
  if (input) input.checked = camViewState.showRapid;
  applyToolpathMoveVisibility();
}

function hideCamHelpers() {
  clearHeightmapVisuals();
  camViewState.showRapid = false;
  const input = ctx.document.getElementById("camShowRapidMoves");
  if (input) input.checked = false;
  applyToolpathMoveVisibility();
  camVisuals.overcut.forEach(obj => obj.visible = false);
  if (camVisuals.comparison) camVisuals.comparison.visible = false;
  ctx.setStatus("Ayudas CAM ocultas. Se conserva el STL y el stock/resultados visibles.", "ok");
}

function applyToolpathMoveVisibility() {
  camVisuals.toolpaths.forEach(root => {
    if (!root.traverse) return;
    root.traverse(child => {
      if (child.userData && child.userData.moveType === "rapid") child.visible = camViewState.showRapid;
      if (child.userData && child.userData.moveType === "cut") child.visible = root.visible !== false;
    });
  });
}

function updateVoxelInfoForPart(part) {
  const cam = ensureCam(part);
  const stock = cam.voxelStock;
  if (!stock) return null;
  stock.removedVoxels = stock.voxels.filter(v => v.removed).length;
  stock.remainingVoxels = stock.voxels.filter(v => v.occupied).length;
  stock.protectedVoxels = stock.voxels.filter(v => v.protected).length;
  cam.voxelInfo = serializeVoxelInfoForPart(part);
  cam.analysis.totalVoxels = stock.totalVoxels;
  cam.analysis.removedVoxels = stock.removedVoxels;
  cam.analysis.remainingVoxels = stock.remainingVoxels;
  cam.analysis.protectedVoxels = stock.protectedVoxels;
  cam.analysis.voxelSize = stock.voxelSize;
  cam.analysis.coverageDemo = stock.totalVoxels ? stock.removedVoxels / stock.totalVoxels * 100 : cam.analysis.coverageDemo;
  cam.analysis.possibleOvercut = cam.analysis.possibleOvercut || stock.possibleOvercut;
  cam.analysis.status = stock.possibleOvercut ? "ALERTA: trayectoria toca zona protegida del STL" : `Stock voxel: ${stock.remainingVoxels} remanentes / ${stock.removedVoxels} removidos.`;
  return cam.voxelInfo;
}

function updateVoxelMetrics() {
  const cam = ctx.selectedModel ? ensureCam(ctx.selectedModel) : null;
  if (!cam || !cam.voxelInfo) return;
  const info = cam.voxelInfo;
  setCamText("camRemovedState", `${info.removedVoxels} removidos / ${info.totalVoxels} voxels`);
  setCamText("camRemovedCount", `${info.remainingVoxels} remanentes / ${info.protectedVoxels} protegidos`);
  setCamText("camOvercut", info.possibleOvercut ? "Si - voxel protegido tocado" : "No detectado");
  setCamText("camRemaining", `Voxel ${info.voxelSize.toFixed(2)} mm Â· cobertura ${info.coverageDemo.toFixed(1)}%`);
  setCamText("camStatus", info.possibleOvercut ? "Trayectoria invalida: sobrecorte detectado" : `Voxel CAM: ${info.totalVoxels} total / ${info.removedVoxels} removidos`);
  setCamText("camComparisonStatus", info.possibleOvercut ? "ALERTA: trayectoria toca zona protegida del STL" : info.status || "Stock voxel listo");
  setCamText("camConceptNote", info.possibleOvercut ? "ALERTA: trayectoria toca zona protegida del STL. Revisar altura Z, stock to leave o estrategia." : "Stock inicial: disco completo. Remanente: gris mecanizado; naranja removido.");
}

function serializeVoxelInfoForPart(part) {
  const stock = ensureCam(part).voxelStock;
  if (!stock) return ensureCam(part).voxelInfo || null;
  return {
    voxelSize: stock.voxelSize,
    totalVoxels: stock.totalVoxels,
    removedVoxels: stock.removedVoxels,
    remainingVoxels: stock.remainingVoxels,
    protectedVoxels: stock.protectedVoxels,
    possibleOvercut: !!stock.possibleOvercut,
    overcutWarningCount: stock.overcutPoints ? stock.overcutPoints.length : 0,
    coverageDemo: stock.totalVoxels ? Number((stock.removedVoxels / stock.totalVoxels * 100).toFixed(1)) : 0,
    bounds: stock.bounds,
    generatedAt: stock.generatedAt,
    stockType: "dental_disc",
    protectedScope: stock.protectedScope || "all_nested_parts_and_supports",
    protectedPartCount: stock.protectedPartCount || 0,
    protectedSupportCount: stock.protectedSupportCount || 0,
    discDiameter: ctx.discDiameter,
    discHeight: ctx.discHeight,
    status: stock.resolutionAdjusted ? "Resolucion voxel ajustada para representar el disco completo." : "Stock voxel del disco dental listo con piezas y soportes protegidos."
  };
}

function restoreVoxelInfoForPart(model, camData) {
  if (!camData || !camData.voxelInfo) return;
  const cam = ensureCam(model);
  cam.voxelInfo = camData.voxelInfo;
  cam.analysis.status = "Regenerar stock voxel para visualizar simulacion completa.";
}

function computeProtectedZoneDemo(part, tolerance, tool) {
  part.mesh.updateMatrixWorld(true);
  const box = new ctx.THREE.Box3().setFromObject(part.mesh);
  const center = box.getCenter(new ctx.THREE.Vector3());
  const size = box.getSize(new ctx.THREE.Vector3());
  const toolRadius = tool.diameter / 2;
  const padding = tolerance + toolRadius;
  return {
    method: "bbox_or_ellipse_demo",
    tolerance,
    toolRadius,
    padding,
    box,
    center,
    size,
    radiusX: size.x / 2 + padding,
    radiusY: size.y / 2 + padding,
    minZ: box.min.z - tolerance,
    maxZ: box.max.z + tolerance
  };
}

function isPointInsideProtectedZoneDemo(point, protectedZone) {
  const dx = (point.x - protectedZone.center.x) / Math.max(protectedZone.radiusX, 0.01);
  const dy = (point.y - protectedZone.center.y) / Math.max(protectedZone.radiusY, 0.01);
  const insideXY = dx * dx + dy * dy <= 1;
  const insideZ = point.z >= protectedZone.minZ && point.z <= protectedZone.maxZ;
  return insideXY && insideZ;
}

function isPointInsideStockDemo(point, stock) {
  const dx = (point.x - stock.center.x) / Math.max(stock.radiusX, 0.01);
  const dy = (point.y - stock.center.y) / Math.max(stock.radiusY, 0.01);
  return dx * dx + dy * dy <= 1 && point.z >= stock.minZ && point.z <= stock.maxZ;
}

function createStockLocalDemo(part, params) {
  const zone = computeProtectedZoneDemo(part, params.tolerance, params.tool);
  const margin = Math.max(params.tool.diameter * 4, 8);
  return {
    center: zone.center.clone(),
    radiusX: zone.radiusX + margin,
    radiusY: zone.radiusY + margin,
    minZ: Math.max(-ctx.discHeight / 2, zone.minZ - params.stepDown),
    maxZ: Math.min(ctx.discHeight / 2, zone.maxZ + params.stepDown),
    protectedZone: zone,
    margin
  };
}

function generateRoughingToolpathDemo(part) {
  const params = getCamParameters();
  const stock = createStockLocalDemo(part, params);
  const points = [];
  let layers = 0;
  let overcut = false;
  const yStart = stock.center.y - stock.radiusY;
  const yEnd = stock.center.y + stock.radiusY;
  const zTop = Math.min(ctx.discHeight / 2, stock.maxZ);
  const zBottom = Math.max(-ctx.discHeight / 2, stock.minZ);

  for (let z = zTop; z >= zBottom; z -= params.stepDown) {
    layers += 1;
    let direction = 1;
    for (let y = yStart; y <= yEnd; y += params.stepOver) {
      const normalizedY = (y - stock.center.y) / stock.radiusY;
      if (Math.abs(normalizedY) > 1) continue;
      const outerHalf = stock.radiusX * Math.sqrt(1 - normalizedY * normalizedY);
      const protectedTerm = 1 - ((y - stock.protectedZone.center.y) ** 2) / (stock.protectedZone.radiusY ** 2);
      const segments = [];
      const leftOuter = stock.center.x - outerHalf;
      const rightOuter = stock.center.x + outerHalf;

      if (protectedTerm > 0) {
        const protectedHalf = stock.protectedZone.radiusX * Math.sqrt(protectedTerm);
        const leftProtected = stock.protectedZone.center.x - protectedHalf;
        const rightProtected = stock.protectedZone.center.x + protectedHalf;
        if (leftOuter < leftProtected) segments.push([leftOuter, leftProtected]);
        if (rightProtected < rightOuter) segments.push([rightProtected, rightOuter]);
      } else {
        segments.push([leftOuter, rightOuter]);
      }

      segments.forEach(segment => {
        const a = new ctx.THREE.Vector3(direction > 0 ? segment[0] : segment[1], y, z);
        const b = new ctx.THREE.Vector3(direction > 0 ? segment[1] : segment[0], y, z);
        if (isPointInsideProtectedZoneDemo(a, stock.protectedZone) || isPointInsideProtectedZoneDemo(b, stock.protectedZone)) overcut = true;
        points.push(vectorData(a), vectorData(b));
        direction *= -1;
      });
    }
  }

  return makeToolpath("Desbaste", params, stock, points, layers, overcut, "Trayectoria de desbaste valida demo");
}

function generateFinishingToolpathDemo(part) {
  const params = getCamParameters();
  const stock = createStockLocalDemo(part, params);
  const zone = stock.protectedZone;
  const points = [];
  let layers = 0;

  for (let z = Math.min(zone.maxZ, ctx.discHeight / 2); z >= Math.max(zone.minZ, -ctx.discHeight / 2); z -= params.stepDown) {
    layers += 1;
    for (let a = 0; a <= Math.PI * 2; a += Math.max(0.08, params.stepOver / Math.max(zone.radiusX, zone.radiusY))) {
      points.push(vectorData(new ctx.THREE.Vector3(
        zone.center.x + Math.cos(a) * (zone.radiusX + params.tolerance),
        zone.center.y + Math.sin(a) * (zone.radiusY + params.tolerance),
        z
      )));
    }
  }

  return makeToolpath("Acabado", params, stock, points, layers, false, "Acabado demo fino: superficie real pendiente");
}

function makeToolpath(strategy, params, stock, points, layers, overcut, status) {
  const length = calculatePathLength(points);
  return {
    id: `toolpath_${Date.now()}`,
    strategy,
    tool: params.tool,
    tolerance: params.tolerance,
    stepOver: params.stepOver,
    stepDown: params.stepDown,
    protectedZone: {
      method: stock.protectedZone.method,
      tolerance: params.tolerance,
      padding: stock.protectedZone.padding,
      center: vectorData(stock.protectedZone.center),
      radiusX: Number(stock.protectedZone.radiusX.toFixed(3)),
      radiusY: Number(stock.protectedZone.radiusY.toFixed(3)),
      minZ: Number(stock.protectedZone.minZ.toFixed(3)),
      maxZ: Number(stock.protectedZone.maxZ.toFixed(3))
    },
    stock: {
      center: vectorData(stock.center),
      radiusX: Number(stock.radiusX.toFixed(3)),
      radiusY: Number(stock.radiusY.toFixed(3)),
      minZ: Number(stock.minZ.toFixed(3)),
      maxZ: Number(stock.maxZ.toFixed(3))
    },
    points,
    layers,
    length: Number(length.toFixed(3)),
    estimatedTime: Number((length / 120).toFixed(2)),
    possibleOvercut: overcut,
    status,
    createdAt: new Date().toISOString()
  };
}

export function generateDemoToolpath() {
  if (!ctx.requireModel()) return;
  clearCamVisualObjects(false);
  const part = ctx.selectedModel;
  const params = getCamParameters();
  const cam = ensureCam(part);
  const path = params.strategyId === "finishing" ? generateFinishingHeightmapToolpath(part) : generateRoughingHeightmapToolpath(part);
  cam.strategy = path.strategy;
  cam.tool = path.tool;
  cam.tolerance = path.tolerance;
  cam.stepOver = path.stepOver;
  cam.stepDown = path.stepDown;
  cam.protectedZone = path.heightmapInfo;
  cam.simulation.status = path.status;
  cam.analysis.possibleOvercut = !!path.possibleOvercut;
  cam.analysis.comparisonReal = false;
  cam.analysis.status = path.possibleOvercut ? "La herramienta invade la zona protegida del STL objetivo." : path.status;
  clearHeightmapVisuals();
  drawToolpath(path);
  showDesignTarget(true);
  updateCamPanel();
  updateHeightmapMetrics();
  ctx.setStatus(path.status, path.possibleOvercut ? "warning" : "ok");
}

function selectedToolpath() {
  const cam = ctx.selectedModel ? ensureCam(ctx.selectedModel) : null;
  return cam && cam.toolpaths.length ? cam.toolpaths[cam.toolpaths.length - 1] : null;
}

function drawToolpath(path) {
  if (!path || !path.points.length) return null;
  if (Array.isArray(path.cutSegments) || Array.isArray(path.rapidSegments)) {
    const group = new ctx.THREE.Group();
    drawCuttingSegments(path.cutSegments || [], group, path.possibleOvercut);
    drawRapidSegments(path.rapidSegments || [], group);
    group.userData.camVisual = true;
    ctx.scene.add(group);
    camVisuals.toolpaths.push(group);
    return group;
  }
  const geometry = new ctx.THREE.BufferGeometry().setFromPoints(path.points.map(vector));
  const line = new ctx.THREE.Line(geometry, new ctx.THREE.LineBasicMaterial({ color: path.possibleOvercut ? 0xef4444 : 0xfacc15 }));
  line.userData.camVisual = true;
  ctx.scene.add(line);
  camVisuals.toolpaths.push(line);
  return line;
}

function drawCuttingSegments(segments, parent, overcut) {
  const material = new ctx.THREE.LineBasicMaterial({ color: overcut ? 0xef4444 : 0xfacc15, transparent: true, opacity: 0.95 });
  segments.filter(segment => segment.length > 1).forEach(segment => {
    const geometry = new ctx.THREE.BufferGeometry().setFromPoints(segment.map(vector));
    const line = new ctx.THREE.Line(geometry, material);
    line.userData.camVisual = true;
    line.userData.moveType = "cut";
    parent.add(line);
  });
}

function drawRapidSegments(segments, parent) {
  const material = new ctx.THREE.LineDashedMaterial({ color: 0xe5e7eb, transparent: true, opacity: 0.38, dashSize: 1.2, gapSize: 0.8 });
  segments.filter(segment => segment.length > 1).forEach(segment => {
    const geometry = new ctx.THREE.BufferGeometry().setFromPoints(segment.map(vector));
    const line = new ctx.THREE.Line(geometry, material);
    line.computeLineDistances();
    line.userData.camVisual = true;
    line.userData.moveType = "rapid";
    line.visible = camViewState.showRapid;
    parent.add(line);
  });
}

function showDesignTarget(silent) {
  if (!ctx.selectedModel) return;
  prepareDesignMeshForCam(ctx.selectedModel, 0.72, false);
  applyCamVisibility();
  if (!silent) ctx.setStatus("Diseno objetivo visible en azul. Zona protegida: no mecanizar por dentro.", "ok");
}

function showToleranceOffsetDemo(silent) {
  if (!ctx.requireModel()) return;
  const params = getCamParameters();
  const stock = createStockLocalDemo(ctx.selectedModel, params);
  removeCamObject(camVisuals.comparison);
  const geometry = new ctx.THREE.SphereGeometry(1, 48, 24);
  geometry.scale(stock.protectedZone.radiusX, stock.protectedZone.radiusY, Math.max((stock.protectedZone.maxZ - stock.protectedZone.minZ) / 2, 0.1));
  const material = new ctx.THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.14, wireframe: true });
  const mesh = new ctx.THREE.Mesh(geometry, material);
  mesh.position.copy(stock.protectedZone.center);
  mesh.position.z = (stock.protectedZone.minZ + stock.protectedZone.maxZ) / 2;
  mesh.userData.camVisual = true;
  ctx.scene.add(mesh);
  camVisuals.comparison = mesh;
  applyCamVisibility();
  if (!silent) ctx.setStatus(`Offset/tolerancia visible: ${params.tolerance.toFixed(2)} mm`, "ok");
}

function showMaterialToRemoveDemo(silent) {
  if (!ctx.requireModel()) return;
  clearRemovedMaterialVisuals();
  const params = getCamParameters();
  const stock = createStockLocalDemo(ctx.selectedModel, params);
  const markers = [];
  const zStep = Math.max(params.stepDown, params.tool.diameter);
  const xyStep = Math.max(params.tool.diameter * 1.25, params.stepOver);

  for (let z = stock.minZ; z <= stock.maxZ; z += zStep) {
    for (let y = stock.center.y - stock.radiusY; y <= stock.center.y + stock.radiusY; y += xyStep) {
      for (let x = stock.center.x - stock.radiusX; x <= stock.center.x + stock.radiusX; x += xyStep) {
        const point = new ctx.THREE.Vector3(x, y, z);
        if (!isPointInsideStockDemo(point, stock) || isPointInsideProtectedZoneDemo(point, stock.protectedZone)) continue;
        markers.push(point);
      }
    }
  }

  createMarkerCloud(markers, Math.max(params.tool.diameter / 2, 0.25), 0xf97316, 0.28, camVisuals.removed);
  const cam = ensureCam(ctx.selectedModel);
  cam.simulation.removedMarkersCount = markers.length;
  cam.simulation.removedCellsCount = markers.length;
  cam.simulation.remainingCellsCount = Math.max(0, (cam.simulation.totalCells || markers.length * 2) - markers.length);
  cam.simulation.status = "Material a remover demo visible";
  updateCamPanel();
  if (!silent) ctx.setStatus("Material a remover visible: stock fuera del STL + tolerancia.", "ok");
}

function showRemovedMaterialDemo(silent) {
  return showMaterialToRemoveFromHeightmap(silent);
}

function showStockRemainingDemo(silent) {
  if (!ctx.requireModel()) return;
  const params = getCamParameters();
  const stock = createStockLocalDemo(ctx.selectedModel, params);
  removeCamObject(camVisuals.machined);
  const markers = [];
  const xyStep = Math.max(params.tool.diameter, params.stepOver);
  const zMid = (stock.protectedZone.minZ + stock.protectedZone.maxZ) / 2;
  for (let a = 0; a < Math.PI * 2; a += 0.18) {
    markers.push(new ctx.THREE.Vector3(
      stock.protectedZone.center.x + Math.cos(a) * stock.protectedZone.radiusX,
      stock.protectedZone.center.y + Math.sin(a) * stock.protectedZone.radiusY,
      zMid
    ));
  }
  for (let z = stock.protectedZone.minZ; z <= stock.protectedZone.maxZ; z += Math.max(params.stepDown, 0.5)) {
    for (let a = 0; a < Math.PI * 2; a += Math.max(0.16, xyStep / Math.max(stock.protectedZone.radiusX, stock.protectedZone.radiusY))) {
      markers.push(new ctx.THREE.Vector3(
        stock.protectedZone.center.x + Math.cos(a) * stock.protectedZone.radiusX,
        stock.protectedZone.center.y + Math.sin(a) * stock.protectedZone.radiusY,
        z
      ));
    }
  }
  const group = new ctx.THREE.Group();
  createMarkerCloud(markers, Math.max(params.tool.diameter / 3, 0.18), 0x94a3b8, 0.24, null, group);
  group.userData.camVisual = true;
  ctx.scene.add(group);
  camVisuals.machined = group;
  showDesignTarget(true);
  showToleranceOffsetDemo(true);
  const cam = ensureCam(ctx.selectedModel);
  cam.result = { type: "roughing_remaining_stock_demo", tolerance: params.tolerance, status: "Remanente aproximado, requiere acabado" };
  cam.analysis.status = "Remanente demo: requiere acabado para llegar al diseno final.";
  updateCamPanel();
  applyCamVisibility();
  if (!silent) ctx.setStatus("Stock remanente aproximado visible. Todavia falta acabado.", "warning");
}

function showMachinedStockApproximation(silent) {
  return showMachinedVoxelStock(silent);
}

function createMarkerCloud(points, radius, color, opacity, list, parent) {
  const container = parent || new ctx.THREE.Group();
  const max = Math.min(points.length, 1200);
  const step = Math.max(1, Math.ceil(points.length / max));
  for (let i = 0; i < points.length; i += step) {
    const mesh = new ctx.THREE.Mesh(
      new ctx.THREE.SphereGeometry(radius, 12, 8),
      new ctx.THREE.MeshStandardMaterial({ color, transparent: true, opacity, depthWrite: false })
    );
    mesh.position.copy(points[i]);
    mesh.userData.camVisual = true;
    if (list) {
      ctx.scene.add(mesh);
      list.push(mesh);
    } else {
      container.add(mesh);
    }
  }
  if (!parent && !list) ctx.scene.add(container);
  return container;
}

function createToolMesh(tool) {
  const group = new ctx.THREE.Group();
  const diameter = tool.diameter;
  const radius = diameter / 2;
  const bodyLength = Math.max(Number(tool.fluteLength) || 10, 8);
  const bodyGeometry = new ctx.THREE.CylinderGeometry(diameter / 2, diameter / 2, bodyLength, 32);
  bodyGeometry.rotateX(Math.PI / 2);
  const body = new ctx.THREE.Mesh(bodyGeometry, new ctx.THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.35, roughness: 0.32 }));
  body.position.set(0, 0, bodyLength / 2);
  group.add(body);
  if (isBallTool(tool)) {
    body.position.z = radius + bodyLength / 2;
    const tip = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(radius, 32, 16), new ctx.THREE.MeshStandardMaterial({ color: 0xff4fd8, emissive: 0x831843, emissiveIntensity: 0.25 }));
    tip.position.set(0, 0, radius);
    group.add(tip);
  } else {
    const endThickness = Math.max(0.08, diameter * 0.08);
    const endGeometry = new ctx.THREE.CylinderGeometry(radius, radius, endThickness, 32);
    endGeometry.rotateX(Math.PI / 2);
    const end = new ctx.THREE.Mesh(endGeometry, new ctx.THREE.MeshStandardMaterial({ color: 0xff4fd8, emissive: 0x831843, emissiveIntensity: 0.18 }));
    end.position.set(0, 0, endThickness / 2);
    group.add(end);
  }
  group.rotation.set(0, 0, 0);
  group.userData.camVisual = true;
  ctx.scene.add(group);
  return group;
}

function updateToolPosition(point) {
  if (!camVisuals.tool || !point) return;
  camVisuals.tool.position.copy(vector(point));
  camVisuals.tool.rotation.set(0, 0, 0);
}

export function startCamSimulation() {
  if (!ctx.requireModel()) return;
  const path = selectedToolpath();
  if (!path) {
    ctx.setStatus("Genera una trayectoria demo primero.", "warning");
    return;
  }
  stopCamSimulation("Simulacion reiniciada");
  clearRemovedMaterialVisuals();
  removeCamObject(camVisuals.tool);
  camVisuals.tool = createToolMesh(path.tool);
  camSimulation.pathPoints = path.points.map(point => Object.assign(vectorData(vector(point)), { moveType: point.moveType || "cut" }));
  camSimulation.currentIndex = 0;
  camSimulation.isRunning = true;
  camSimulation.isPaused = false;
  camSimulation.lastTime = 0;
  camSimulation.removalVisualStep = Math.max(1, Math.floor(camSimulation.pathPoints.length / 100));
  camSimulation.voxelVisualStep = Math.max(1, Math.floor(camSimulation.pathPoints.length / 40));
  camSimulation.lastCutPoint = null;
  updateToolPosition(camSimulation.pathPoints[0]);
  const cam = ensureCam(ctx.selectedModel);
  cam.simulation.status = `Simulacion ${path.strategy.toLowerCase()} en curso`;
  cam.simulation.removedMarkersCount = 0;
  updateCamPanel();
  ctx.setStatus(`Simulacion CAM iniciada con ${path.tool.name}: barrido de herramienta a ${CAM_REMOVAL_PRECISION_MM.toFixed(1)} mm.`, "ok");
}

export function stepCamAnimation() {
  if (!camSimulation.isRunning || camSimulation.isPaused || !camVisuals.tool || !camSimulation.pathPoints.length) return;
  const now = ctx.performance.now();
  if (now - camSimulation.lastTime < 16) return;
  camSimulation.lastTime = now;
  const path = selectedToolpath();
  const endIndex = Math.min(camSimulation.pathPoints.length, camSimulation.currentIndex + CAM_SIMULATION_POINTS_PER_FRAME);
  let point = camSimulation.pathPoints[camSimulation.currentIndex];
  while (camSimulation.currentIndex < endIndex) {
    point = camSimulation.pathPoints[camSimulation.currentIndex];
    if (path && point.moveType === "cut") {
      if (ctx.selectedModel && ensureCam(ctx.selectedModel).voxelStock) {
        removeVoxelsAlongToolMove(camSimulation.lastCutPoint || point, point, path.tool, CAM_REMOVAL_PRECISION_MM, true);
        camSimulation.lastCutPoint = point;
      }
    } else if (path && point.moveType === "rapid" && ctx.selectedModel) {
      camSimulation.lastCutPoint = null;
      ensureCam(ctx.selectedModel).simulation.status = "Movimiento rapid / enlace sin corte";
    }
    camSimulation.currentIndex += 1;
  }
  updateToolPosition(point);
  if (ctx.selectedModel && ensureCam(ctx.selectedModel).voxelStock && camSimulation.currentIndex % camSimulation.voxelVisualStep < CAM_SIMULATION_POINTS_PER_FRAME) {
    updateVoxelInfoForPart(ctx.selectedModel);
    updateVoxelStockVisual();
  }
  if (camSimulation.currentIndex >= camSimulation.pathPoints.length) {
    stopCamSimulation("Simulacion finalizada");
    if (ctx.selectedModel && ensureCam(ctx.selectedModel).voxelStock) updateVoxelStockVisual();
    showMachinedVoxelStock(true);
    compareApproxMachinedStockToDesign(true);
    ctx.setStatus("Simulacion CAM finalizada. Revisar remanente y acabado pendiente.", "ok");
  }
  updateCamPanel();
}

function addRemovedMaterialMarker(point, tool) {
  const cam = ctx.selectedModel ? ensureCam(ctx.selectedModel) : null;
  if (cam) {
    cam.simulation.removedMarkersCount = 0;
    cam.simulation.status = "Material removido durante simulacion";
  }
}

export function pauseCamSimulation() {
  if (!camSimulation.isRunning) return;
  camSimulation.isPaused = true;
  if (ctx.selectedModel) ensureCam(ctx.selectedModel).simulation.status = "Simulacion pausada";
  updateCamPanel();
}

export function resumeCamSimulation() {
  if (!camSimulation.isRunning) return;
  camSimulation.isPaused = false;
  if (ctx.selectedModel) ensureCam(ctx.selectedModel).simulation.status = "Simulacion en curso";
  updateCamPanel();
}

function stopCamSimulation(status) {
  camSimulation.isRunning = false;
  camSimulation.isPaused = false;
  if (ctx.selectedModel && status) ensureCam(ctx.selectedModel).simulation.status = status;
}

export function resetCamSimulation() {
  stopCamSimulation("Simulacion reseteada");
  camSimulation.currentIndex = 0;
  clearRemovedMaterialVisuals();
  if (ctx.selectedModel) {
    const cam = ensureCam(ctx.selectedModel);
    cam.simulation.removedMarkersCount = 0;
    cam.simulation.removedCellsCount = 0;
    cam.simulation.status = "Simulacion reseteada";
  }
  updateCamPanel();
}

export function clearCamSimulation() {
  if (!ctx.selectedModel) return;
  stopCamSimulation("Sin trayectoria");
  clearCamVisualObjects(true);
  delete camRuntimeStocks[ctx.selectedModel.id];
  ctx.selectedModel.cam = {
    toolpaths: [],
    simulation: { status: "Sin trayectoria", removedMarkersCount: 0 },
    analysis: { possibleOvercut: false, comparisonReal: false, status: "Demo CAM aproximado" },
    result: {},
    comparison: {},
    voxelInfo: null,
    voxelStock: null
  };
  ctx.applyPieceMaterial(ctx.selectedModel);
  updateCamPanel();
  ctx.setStatus("Simulacion CAM borrada. STL, disco y soportes se conservan.", "ok");
}

function compareApproxMachinedStockToDesign(silent) {
  if (!ctx.requireModel()) return;
  const cam = ensureCam(ctx.selectedModel);
  const params = getCamParameters();
  cam.comparison = {
    comparedAt: new Date().toISOString(),
    maxError: null,
    avgError: null,
    status: "Comparacion exacta requiere voxel/heightmap o malla mecanizada real."
  };
  cam.analysis.comparisonReal = false;
  cam.analysis.status = cam.analysis.possibleOvercut
    ? "La herramienta invade la zona protegida del STL objetivo."
    : `Comparacion geometrica real pendiente. Tolerancia ${params.tolerance.toFixed(2)} mm.`;
  updateCamPanel();
  if (!silent) ctx.setStatus(cam.analysis.status, cam.analysis.possibleOvercut ? "warning" : "ok");
}

export function rebuildCamVisualsForModel(model) {
  clearCamVisualObjects(false);
  if (!model) return;
  const cam = ensureCam(model);
  cam.toolpaths.forEach(drawToolpath);
  if (cam.result && cam.result.type && cam.voxelStock) showMachinedVoxelStock(true);
  if (cam.heightmap) showRoughingTolerance(true);
  applyCamVisibility();
  updateCamPanel();
}

function clearRemovedMaterialVisuals() {
  removeVisualList(camVisuals.removed);
  removeVisualList(camVisuals.overcut);
  if (ctx.selectedModel) {
    const cam = ensureCam(ctx.selectedModel);
    cam.simulation.removedMarkersCount = 0;
  }
}

function clearCamVisualObjects(resetTool) {
  removeVisualList(camVisuals.toolpaths);
  removeVisualList(camVisuals.removed);
  removeVisualList(camVisuals.overcut);
  removeVisualList(camVisuals.heightmap || []);
  removeVisualList(camVisuals.tolerance || []);
  removeCamObject(camVisuals.tool);
  removeCamObject(camVisuals.machined);
  removeCamObject(camVisuals.comparison);
  removeCamObject(camVisuals.stock);
  removeCamObject(camVisuals.voxelStock);
  removeCamObject(camVisuals.overcutWarning);
  camVisuals.tool = null;
  camVisuals.machined = null;
  camVisuals.comparison = null;
  camVisuals.stock = null;
  camVisuals.voxelStock = null;
  camVisuals.overcutWarning = null;
  if (resetTool !== false) {
    camSimulation.isRunning = false;
    camSimulation.isPaused = false;
    camSimulation.currentIndex = 0;
    camSimulation.pathPoints = [];
  }
}

function removeVisualList(list) {
  list.forEach(removeCamObject);
  list.length = 0;
}

function removeCamObject(obj) {
  if (!obj) return;
  ctx.scene.remove(obj);
  if (obj.traverse) {
    obj.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) obj.material.dispose();
}

function toggleCamVisibility(key, value) {
  ctx.camVisibility[key] = !!value;
  applyCamVisibility();
}

function applyCamVisibility() {
  if (ctx.disc) ctx.disc.visible = ctx.camVisibility.stock;
  ctx.models.forEach(model => {
    model.mesh.visible = ctx.camVisibility.design;
    model.supports.forEach(support => support.mesh.visible = ctx.camVisibility.supports);
  });
  camVisuals.toolpaths.forEach(obj => obj.visible = ctx.camVisibility.toolpath);
  camVisuals.removed.forEach(obj => obj.visible = ctx.camVisibility.removed);
  camVisuals.overcut.forEach(obj => obj.visible = ctx.camVisibility.comparison);
  (camVisuals.heightmap || []).forEach(obj => obj.visible = ctx.camVisibility.comparison);
  (camVisuals.tolerance || []).forEach(obj => obj.visible = ctx.camVisibility.comparison);
  if (camVisuals.tool) camVisuals.tool.visible = ctx.camVisibility.tool;
  if (camVisuals.machined) camVisuals.machined.visible = ctx.camVisibility.machined;
  if (camVisuals.comparison) camVisuals.comparison.visible = ctx.camVisibility.comparison;
  if (camVisuals.voxelStock) camVisuals.voxelStock.visible = ctx.camVisibility.stock || ctx.camVisibility.machined;
  if (camVisuals.overcutWarning) camVisuals.overcutWarning.visible = true;
  applyToolpathMoveVisibility();
}

function markOvercutPoints(path) {
  if (path) path.hasVisualOvercutMarkers = false;
}

function calculatePathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += vector(points[i]).distanceTo(vector(points[i - 1]));
  return total;
}

function vector(data) {
  return data && data.isVector3 ? data : new ctx.THREE.Vector3(Number(data && data.x) || 0, Number(data && data.y) || 0, Number(data && data.z) || 0);
}

function vectorData(v) {
  return { x: Number(v.x.toFixed(3)), y: Number(v.y.toFixed(3)), z: Number(v.z.toFixed(3)) };
}

export function exportCamForJson(model) {
  return serializeCamForPart(model);
}

export function getCamSettings() {
  const params = getCamParameters();
  return {
    materialId: params.material.id,
    machineId: params.machine.id,
    strategyId: params.strategyId,
    toolId: params.tool.id,
    tolerance: Number(params.tolerance.toFixed(3)),
    stepOverPercent: Number(params.stepOverPercent.toFixed(1)),
    stepOverMm: Number(params.stepOver.toFixed(3)),
    stepDown: Number(params.stepDown.toFixed(3)),
    rpm: Number(params.rpm),
    feedRate: Number(params.feedRate),
    stockToLeave: Number(params.stockToLeave.toFixed(3)),
    heightmapResolution: Number(heightmapResolution().toFixed(3)),
    voxelSize: Number(voxelSizeInput().toFixed(3))
  };
}

export function applyCamSettings(settings) {
  if (!settings) return;
  const material = ctx.document.getElementById("material");
  const machine = ctx.document.getElementById("machine");
  const strategy = ctx.document.getElementById("camStrategy");
  const tool = ctx.document.getElementById("camTool");
  if (material && settings.materialId) material.value = findMaterial(settings.materialId).id;
  if (machine && settings.machineId) machine.value = findMachine(settings.machineId).id;
  if (strategy && settings.strategyId) strategy.value = findStrategy(settings.strategyId).id;
  if (tool && settings.toolId) tool.value = findTool(settings.toolId).id;
  setInputValue("camTolerance", Number(settings.tolerance || findStrategy(settings.strategyId).tolerance).toFixed(2));
  setInputValue("camStepOverPercent", String(settings.stepOverPercent || findStrategy(settings.strategyId).stepOverPercent));
  setInputValue("camStepOver", Number(settings.stepOverMm || findTool(settings.toolId).diameter * findStrategy(settings.strategyId).stepOverPercent / 100).toFixed(2));
  setInputValue("camStepDown", Number(settings.stepDown || findStrategy(settings.strategyId).stepDown).toFixed(2));
  setInputValue("camRpm", String(settings.rpm || findTool(settings.toolId).defaultRpm));
  setInputValue("camFeedRate", String(settings.feedRate || findMaterial(settings.materialId).roughingFeed));
  setInputValue("camStockToLeave", Number(settings.stockToLeave || findStrategy(settings.strategyId).stockToLeave || 0).toFixed(2));
  if (settings.heightmapResolution) setInputValue("camHeightmapResolution", Number(settings.heightmapResolution).toFixed(2));
  if (settings.voxelSize) setInputValue("camVoxelSize", Number(settings.voxelSize).toFixed(2));
  updateCamPanel();
}

export function serializeCamForPart(model) {
  const cam = ensureCam(model);
  const settings = getCamSettings();
  return {
    strategy: cam.strategy || getCamParameters().strategy,
    tool: cam.tool || getToolDefinition(),
    tolerance: cam.tolerance || numberInput("camTolerance", 0.5),
    stepOver: cam.stepOver || numberInput("camStepOver", 1.4),
    stepDown: cam.stepDown || numberInput("camStepDown", 1.5),
    settings,
    operations: cam.operations || [],
    activeOperationId: cam.activeOperationId || null,
    protectedZone: cam.protectedZone || null,
    heightmapInfo: cam.heightmapInfo || (cam.heightmap ? heightmapInfo(cam.heightmap) : null),
    voxelInfo: serializeVoxelInfoForPart(model),
    toolpaths: serializeToolpaths(cam.toolpaths || []),
    simulation: {
      removedMarkersCount: cam.simulation.removedMarkersCount || 0,
      removedCellsCount: cam.simulation.removedCellsCount || 0,
      remainingCellsCount: cam.simulation.remainingCellsCount || 0,
      status: cam.simulation.status || "Sin trayectoria"
    },
    result: cam.result || {},
    comparison: cam.comparison || { status: "Comparacion geometrica real pendiente" },
    analysis: {
      possibleOvercut: !!cam.analysis.possibleOvercut,
      comparisonReal: false,
      remainingMaterialDemo: cam.analysis.remainingMaterialDemo !== false,
      heightmapResolution: cam.analysis.heightmapResolution || 0,
      surfacePoints: cam.analysis.surfacePoints || 0,
      machinedPoints: cam.analysis.machinedPoints || 0,
      protectedPoints: cam.analysis.protectedPoints || 0,
      skippedProtectedPoints: cam.analysis.skippedProtectedPoints || 0,
      coverageDemo: cam.analysis.coverageDemo || 0,
      totalVoxels: cam.analysis.totalVoxels || 0,
      removedVoxels: cam.analysis.removedVoxels || 0,
      remainingVoxels: cam.analysis.remainingVoxels || 0,
      protectedVoxels: cam.analysis.protectedVoxels || 0,
      voxelSize: cam.analysis.voxelSize || 0,
      status: cam.analysis.status || "Demo CAM aproximado"
    }
  };
}

function serializeToolpaths(toolpaths) {
  const maxSavedPoints = 5000;
  return toolpaths.map(path => {
    const points = Array.isArray(path.points) ? path.points : [];
    const saveFullPath = points.length <= maxSavedPoints;
    return Object.assign({}, path, {
      points: saveFullPath ? points : [],
      cutSegments: saveFullPath ? path.cutSegments || [] : [],
      rapidSegments: saveFullPath ? path.rapidSegments || [] : [],
      pointsOmitted: !saveFullPath,
      originalPointCount: points.length
    });
  });
}

export function hydrateCamFromJson(model, camData) {
  return restoreCamForPart(model, camData);
}

export function restoreCamForPart(model, camData) {
  model.cam = {
    strategy: camData && camData.strategy,
    tool: camData && camData.tool,
    tolerance: camData && camData.tolerance,
    stepOver: camData && camData.stepOver,
    stepDown: camData && camData.stepDown,
    protectedZone: camData && camData.protectedZone,
    operations: Array.isArray(camData && camData.operations) ? camData.operations : [],
    activeOperationId: camData && camData.activeOperationId,
    heightmapInfo: camData && camData.heightmapInfo,
    voxelInfo: camData && camData.voxelInfo,
    toolpaths: Array.isArray(camData && camData.toolpaths) ? camData.toolpaths : [],
    simulation: camData && camData.simulation ? camData.simulation : {},
    result: camData && camData.result ? camData.result : {},
    comparison: camData && camData.comparison ? camData.comparison : {},
    analysis: camData && camData.analysis ? camData.analysis : {}
  };
  ensureCam(model);
  if (model.cam.heightmapInfo && !model.cam.heightmap) {
    model.cam.analysis.status = "Regenere heightmap para visualizar trayectoria completa.";
  }
  restoreVoxelInfoForPart(model, camData);
  if (model === ctx.selectedModel && ctx.currentMode === "CAM") rebuildCamVisualsForModel(model);
}
