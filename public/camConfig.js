export const MATERIALS = [
  {
    id: "zirconia",
    name: "Zirconio",
    defaultRpm: 28000,
    roughingFeed: 800,
    finishingFeed: 500,
    defaultRoughingTolerance: 0.5,
    defaultFinishingTolerance: 0.05,
    recommendedTools: ["flat_2_0", "ball_1_0", "ball_0_6"]
  },
  {
    id: "pmma",
    name: "PMMA",
    defaultRpm: 24000,
    roughingFeed: 1000,
    finishingFeed: 700,
    defaultRoughingTolerance: 0.35,
    defaultFinishingTolerance: 0.05,
    recommendedTools: ["flat_2_0", "ball_1_0", "ball_0_6"]
  },
  {
    id: "wax",
    name: "Cera",
    defaultRpm: 18000,
    roughingFeed: 1200,
    finishingFeed: 900,
    defaultRoughingTolerance: 0.4,
    defaultFinishingTolerance: 0.08,
    recommendedTools: ["flat_2_0", "flat_1_0", "ball_1_0"]
  },
  {
    id: "lithium_disilicate",
    name: "Disilicato",
    defaultRpm: 30000,
    roughingFeed: 450,
    finishingFeed: 300,
    defaultRoughingTolerance: 0.35,
    defaultFinishingTolerance: 0.04,
    recommendedTools: ["flat_1_0", "ball_0_6", "ball_0_3"]
  },
  {
    id: "titanium",
    name: "Titanio",
    defaultRpm: 18000,
    roughingFeed: 260,
    finishingFeed: 180,
    defaultRoughingTolerance: 0.3,
    defaultFinishingTolerance: 0.03,
    recommendedTools: ["flat_1_0", "ball_0_6"]
  },
  {
    id: "cocr",
    name: "CoCr",
    defaultRpm: 20000,
    roughingFeed: 220,
    finishingFeed: 160,
    defaultRoughingTolerance: 0.3,
    defaultFinishingTolerance: 0.03,
    recommendedTools: ["flat_1_0", "ball_0_6", "ball_0_3"]
  }
];

export const TOOLS = [
  {
    id: "flat_2_0",
    name: "Fresa plana 2.0 mm",
    type: "flat",
    diameter: 2.0,
    radius: 1.0,
    fluteLength: 10,
    totalLength: 35,
    shankDiameter: 3,
    defaultRpm: 28000,
    defaultFeed: 800,
    color: "gray"
  },
  {
    id: "flat_1_0",
    name: "Fresa plana 1.0 mm",
    type: "flat",
    diameter: 1.0,
    radius: 0.5,
    fluteLength: 8,
    totalLength: 35,
    shankDiameter: 3,
    defaultRpm: 30000,
    defaultFeed: 600,
    color: "gray"
  },
  {
    id: "ball_1_0",
    name: "Fresa esferica 1.0 mm",
    type: "ball",
    diameter: 1.0,
    radius: 0.5,
    fluteLength: 8,
    totalLength: 35,
    shankDiameter: 3,
    defaultRpm: 32000,
    defaultFeed: 500,
    color: "gray"
  },
  {
    id: "ball_0_6",
    name: "Fresa esferica 0.6 mm",
    type: "ball",
    diameter: 0.6,
    radius: 0.3,
    fluteLength: 6,
    totalLength: 35,
    shankDiameter: 3,
    defaultRpm: 36000,
    defaultFeed: 360,
    color: "gray"
  },
  {
    id: "ball_0_3",
    name: "Fresa esferica 0.3 mm",
    type: "ball",
    diameter: 0.3,
    radius: 0.15,
    fluteLength: 4,
    totalLength: 35,
    shankDiameter: 3,
    defaultRpm: 42000,
    defaultFeed: 180,
    color: "gray"
  }
];

export const MACHINES = [
  {
    id: "dental_3x_demo",
    name: "Fresadora Dental 3 ejes demo",
    axes: ["X", "Y", "Z"],
    spindleMaxRpm: 60000,
    toolChangerSlots: 6,
    workpieceType: "disc",
    discDiameter: 98,
    maxDiscHeight: 30,
    supports3Axis: true,
    supports4Axis: false,
    supports5Axis: false
  },
  {
    id: "dental_4x_demo",
    name: "Fresadora Dental 4 ejes demo",
    axes: ["X", "Y", "Z", "A"],
    spindleMaxRpm: 60000,
    toolChangerSlots: 8,
    workpieceType: "disc",
    discDiameter: 98,
    maxDiscHeight: 30,
    supports3Axis: true,
    supports4Axis: true,
    supports5Axis: false
  },
  {
    id: "dental_5x_demo",
    name: "Fresadora Dental 5 ejes demo",
    axes: ["X", "Y", "Z", "A", "B"],
    spindleMaxRpm: 60000,
    toolChangerSlots: 10,
    workpieceType: "disc",
    discDiameter: 98,
    maxDiscHeight: 30,
    supports3Axis: true,
    supports4Axis: true,
    supports5Axis: true
  }
];

export const STRATEGIES = [
  {
    id: "roughing",
    name: "Desbaste",
    defaultTool: "flat_2_0",
    tolerance: 0.5,
    stepOverPercent: 70,
    stepDown: 1.5,
    stockToLeave: 0.5
  },
  {
    id: "finishing",
    name: "Acabado",
    defaultTool: "ball_0_6",
    tolerance: 0.05,
    stepOverPercent: 20,
    stepDown: 0.3,
    stockToLeave: 0.05
  },
  {
    id: "support_cut",
    name: "Corte soportes",
    defaultTool: "flat_1_0",
    tolerance: 0.1,
    stepOverPercent: 40,
    stepDown: 0.5,
    stockToLeave: 0.1
  }
];

export function findMaterial(idOrName) {
  return MATERIALS.find(item => item.id === idOrName || item.name === idOrName) || MATERIALS[0];
}

export function findTool(id) {
  return TOOLS.find(item => item.id === id) || TOOLS[0];
}

export function findMachine(idOrName) {
  return MACHINES.find(item => item.id === idOrName || item.name === idOrName) || MACHINES[1];
}

export function findStrategy(idOrName) {
  return STRATEGIES.find(item => item.id === idOrName || item.name === idOrName) || STRATEGIES[0];
}
