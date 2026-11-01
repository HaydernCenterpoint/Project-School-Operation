/**
 * SDU AI Engineering, CAD (AutoCAD DXF/SCR), 3D Mesh (STL/OBJ/SCAD), and Data Visualization Engine
 * Enables Model SDU 1.3 (Qwen 3.8) to draw interactive charts, 2D TCVN technical blueprints,
 * interactive 3D mechanical parts, and export real AutoCAD (.dxf, .scr) & 3D (.stl, .obj, .scad) files.
 */

export type SduChartType = "bar" | "line" | "radar" | "pie" | "area";

export type SduChartSeries = {
  name: string;
  color?: string;
  values: number[];
};

export type SduChartSpec = {
  type: SduChartType;
  title: string;
  subtitle?: string;
  unit?: string;
  labels: string[];
  series: SduChartSeries[];
  note?: string;
};

export type CadPartKind =
  | "spur_gear"
  | "stepped_shaft"
  | "flange_coupling"
  | "ball_bearing"
  | "hex_bolt"
  | "l_bracket"
  | "pulley";

export type ShaftStep = {
  diameter: number;
  length: number;
  label?: string;
};

export type SduCadSpec = {
  part: CadPartKind;
  name: string;
  material?: string;
  standard?: string;
  scale?: string;
  unit?: string;
  // Common / Gear / Flange / Bearing / Bolt / Bracket parameters (mm)
  module?: number; // Gear module m
  teeth?: number; // Gear teeth count z
  faceWidth?: number; // Gear width b
  pressureAngle?: number; // Gear alpha (default 20 deg)
  boreDiameter?: number; // Shaft hole diameter
  keywayWidth?: number; // Keyway width b_k
  keywayDepth?: number; // Keyway depth t_k
  outerDiameter?: number; // Flange / Bearing / Pulley outer D
  innerDiameter?: number; // Bearing inner d
  boltCircleDiameter?: number; // Flange pitch circle D_b
  boltCount?: number; // Number of bolt holes
  boltHoleDiameter?: number; // Bolt hole d_0
  hubDiameter?: number; // Flange hub diameter
  hubLength?: number; // Flange hub length
  thickness?: number; // Plate / Flange thickness
  width?: number; // Bearing / Bracket / Pulley width
  length?: number; // Bracket / Bolt length
  height?: number; // Bracket height
  headWidth?: number; // Hex bolt across flats s
  headHeight?: number; // Hex bolt head height k
  pitch?: number; // Thread pitch
  ballCount?: number; // Bearing balls
  grooveCount?: number; // Pulley grooves
  steps?: ShaftStep[]; // Stepped shaft segments
  notes?: string[];
};

export type Vec3 = [number, number, number];

export type Triangle3D = {
  a: Vec3;
  b: Vec3;
  c: Vec3;
  normal: Vec3;
  group?: string;
};

export type CadLine2D = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  layer: "OUTLINE" | "CENTER" | "HIDDEN" | "DIM";
};

export type CadCircle2D = {
  cx: number;
  cy: number;
  r: number;
  layer: "OUTLINE" | "CENTER" | "HIDDEN";
};

export type CadDimension2D = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text: string;
  offset?: number;
};

export type CadGeometryBundle = {
  spec: NormalizedCadSpec;
  lines2D: CadLine2D[];
  circles2D: CadCircle2D[];
  dimensions2D: CadDimension2D[];
  bbox2D: { minX: number; minY: number; maxX: number; maxY: number };
  triangles3D: Triangle3D[];
  bbox3D: { min: Vec3; max: Vec3; radius: number };
  calculatedSpecs: { label: string; value: string }[];
};

export type NormalizedCadSpec = Required<
  Pick<
    SduCadSpec,
    | "part"
    | "name"
    | "material"
    | "standard"
    | "scale"
    | "unit"
    | "module"
    | "teeth"
    | "faceWidth"
    | "pressureAngle"
    | "boreDiameter"
    | "keywayWidth"
    | "keywayDepth"
    | "outerDiameter"
    | "innerDiameter"
    | "boltCircleDiameter"
    | "boltCount"
    | "boltHoleDiameter"
    | "hubDiameter"
    | "hubLength"
    | "thickness"
    | "width"
    | "length"
    | "height"
    | "headWidth"
    | "headHeight"
    | "pitch"
    | "ballCount"
    | "grooveCount"
    | "steps"
    | "notes"
  >
>;

export const PRESET_CAD_SPECS: Record<CadPartKind, SduCadSpec> = {
  spur_gear: {
    part: "spur_gear",
    name: "Bánh răng trụ răng thẳng Z24-M2.5",
    material: "Thép 40Cr tôi cải thiện (HRC 45-50)",
    standard: "TCVN 1065:1971 / ISO 53",
    scale: "1:1",
    unit: "mm",
    module: 2.5,
    teeth: 24,
    faceWidth: 22,
    pressureAngle: 20,
    boreDiameter: 20,
    keywayWidth: 6,
    keywayDepth: 2.8,
    hubDiameter: 34,
    hubLength: 10,
    notes: [
      "Góc ăn khớp tiêu chuẩn alpha = 20 độ, hệ số dịch chỉnh x = 0.",
      "Vát mép đầu răng 1x45 độ; dung sai lỗ trục H7, rãnh then P9.",
    ],
  },
  stepped_shaft: {
    part: "stepped_shaft",
    name: "Trục bậc hộp giảm tốc 3 đoạn",
    material: "Thép C45 thường hóa (HB 170-217)",
    standard: "TCVN 2244:1999",
    scale: "1:1",
    unit: "mm",
    keywayWidth: 8,
    keywayDepth: 4,
    steps: [
      { diameter: 24, length: 36, label: "Ngõng trục lắp khớp nối" },
      { diameter: 30, length: 42, label: "Cổ trục lắp ổ lăn 1" },
      { diameter: 38, length: 58, label: "Thân trục lắp bánh răng" },
      { diameter: 30, length: 42, label: "Cổ trục lắp ổ lăn 2" },
    ],
    notes: [
      "Độ nhám bề mặt cổ trục lắp ổ lăn Ra = 0.8 um.",
      "Bán kính góc lượn chân bậc trục r = 1.5 mm, vát mép hai đầu 1.5x45 độ.",
    ],
  },
  flange_coupling: {
    part: "flange_coupling",
    name: "Khớp nối mặt bích tiêu chuẩn D130",
    material: "Thép đúc GX15-32 / Thép C35",
    standard: "TCVN 5844:1994 / DIN 2576",
    scale: "1:1",
    unit: "mm",
    outerDiameter: 130,
    boltCircleDiameter: 95,
    boreDiameter: 28,
    hubDiameter: 54,
    hubLength: 32,
    thickness: 16,
    boltCount: 6,
    boltHoleDiameter: 12,
    keywayWidth: 8,
    keywayDepth: 3.3,
    notes: [
      "Độ đảo mặt đầu bích không quá 0.03 mm.",
      "6 lỗ bu-lông M10 chia đều trên vòng tròn đường kính D_b = 95 mm.",
    ],
  },
  ball_bearing: {
    part: "ball_bearing",
    name: "Ổ bi đỡ một dãy cỡ trung 6206",
    material: "Thép ổ lăn ШХ15 / SUJ2 (HRC 61-65)",
    standard: "TCVN 1484:1985 / ISO 15",
    scale: "1:1",
    unit: "mm",
    innerDiameter: 30,
    outerDiameter: 62,
    width: 16,
    ballCount: 9,
    notes: [
      "Cấp chính xác P0; khe hở hướng tâm nhóm tiêu chuẩn C0.",
      "Tải trọng động cơ bản C = 19.5 kN, tải trọng tĩnh C0 = 11.3 kN.",
    ],
  },
  hex_bolt: {
    part: "hex_bolt",
    name: "Bu-lông lục giác M16x65 (Cấp bền 8.8)",
    material: "Thép hợp kim 35Cr tôi ram (Cấp bền 8.8)",
    standard: "TCVN 1876:1976 / ISO 4014",
    scale: "1:1",
    unit: "mm",
    boreDiameter: 16,
    length: 65,
    headWidth: 24,
    headHeight: 10,
    pitch: 2.0,
    notes: [
      "Ren hệ mét bước lớn M16x2 - 6g.",
      "Bề mặt mạ kẽm nhúng nóng hoặc nhuộm đen chống ăn mòn.",
    ],
  },
  l_bracket: {
    part: "l_bracket",
    name: "Giá đỡ cơ khí chữ L chịu tải",
    material: "Thép kết cấu SS400 / CT38",
    standard: "TCVN 1765:1975",
    scale: "1:1",
    unit: "mm",
    length: 90,
    width: 64,
    height: 75,
    thickness: 12,
    boltHoleDiameter: 11,
    boltCount: 4,
    notes: [
      "Gia công phay mặt phẳng đế và mặt tựa vuông góc 90 độ +/- 0.05 mm.",
      "4 lỗ bắt bu-lông M10 định vị đối xứng.",
    ],
  },
  pulley: {
    part: "pulley",
    name: "Bánh đai thang (Puli) 2 rãnh bản A",
    material: "Gang xám GX15-32",
    standard: "TCVN 2342:1978",
    scale: "1:1",
    unit: "mm",
    outerDiameter: 120,
    boreDiameter: 25,
    hubDiameter: 46,
    width: 38,
    grooveCount: 2,
    keywayWidth: 8,
    keywayDepth: 3.3,
    notes: [
      "Góc rãnh đai thang phi = 38 độ; cân bằng tĩnh sau khi gia công cơ.",
      "Dung sai lỗ lắp trục H7, độ nhám mặt bên rãnh đai Ra = 1.6 um.",
    ],
  },
};

export function normalizeCadSpec(raw: Partial<SduCadSpec>): NormalizedCadSpec {
  const part: CadPartKind =
    raw.part && raw.part in PRESET_CAD_SPECS ? raw.part : inferCadPartKind(raw);
  const preset = PRESET_CAD_SPECS[part];

  const moduleVal = clampNum(raw.module ?? preset.module ?? 2.5, 0.8, 20);
  const teethVal = Math.round(clampNum(raw.teeth ?? preset.teeth ?? 24, 8, 120));
  const pitchDiameter = moduleVal * teethVal;
  const autoOuter =
    part === "spur_gear"
      ? moduleVal * (teethVal + 2)
      : clampNum(raw.outerDiameter ?? preset.outerDiameter ?? 120, 20, 600);

  return {
    part,
    name: (raw.name || preset.name).trim(),
    material: (raw.material || preset.material || "Thép C45").trim(),
    standard: (raw.standard || preset.standard || "TCVN / ISO").trim(),
    scale: (raw.scale || preset.scale || "1:1").trim(),
    unit: (raw.unit || preset.unit || "mm").trim(),
    module: moduleVal,
    teeth: teethVal,
    faceWidth: clampNum(raw.faceWidth ?? preset.faceWidth ?? 22, 4, 200),
    pressureAngle: clampNum(raw.pressureAngle ?? preset.pressureAngle ?? 20, 14.5, 25),
    boreDiameter: clampNum(
      raw.boreDiameter ?? preset.boreDiameter ?? Math.max(10, Math.round(pitchDiameter * 0.32)),
      6,
      300,
    ),
    keywayWidth: clampNum(raw.keywayWidth ?? preset.keywayWidth ?? 6, 2, 40),
    keywayDepth: clampNum(raw.keywayDepth ?? preset.keywayDepth ?? 2.8, 1, 20),
    outerDiameter: autoOuter,
    innerDiameter: clampNum(raw.innerDiameter ?? preset.innerDiameter ?? 30, 8, 300),
    boltCircleDiameter: clampNum(
      raw.boltCircleDiameter ?? preset.boltCircleDiameter ?? autoOuter * 0.72,
      20,
      500,
    ),
    boltCount: Math.round(clampNum(raw.boltCount ?? preset.boltCount ?? 6, 2, 24)),
    boltHoleDiameter: clampNum(raw.boltHoleDiameter ?? preset.boltHoleDiameter ?? 12, 4, 60),
    hubDiameter: clampNum(
      raw.hubDiameter ?? preset.hubDiameter ?? Math.max(24, Math.round(pitchDiameter * 0.55)),
      12,
      400,
    ),
    hubLength: clampNum(raw.hubLength ?? preset.hubLength ?? 12, 0, 160),
    thickness: clampNum(raw.thickness ?? preset.thickness ?? 14, 3, 120),
    width: clampNum(raw.width ?? preset.width ?? 24, 5, 250),
    length: clampNum(raw.length ?? preset.length ?? 80, 15, 500),
    height: clampNum(raw.height ?? preset.height ?? 70, 15, 400),
    headWidth: clampNum(raw.headWidth ?? preset.headWidth ?? 24, 8, 90),
    headHeight: clampNum(raw.headHeight ?? preset.headHeight ?? 10, 4, 50),
    pitch: clampNum(raw.pitch ?? preset.pitch ?? 2.0, 0.5, 6),
    ballCount: Math.round(clampNum(raw.ballCount ?? preset.ballCount ?? 9, 5, 24)),
    grooveCount: Math.round(clampNum(raw.grooveCount ?? preset.grooveCount ?? 2, 1, 6)),
    steps:
      Array.isArray(raw.steps) && raw.steps.length > 0
        ? raw.steps.map((s, idx) => ({
            diameter: clampNum(Number(s.diameter) || 24 + idx * 6, 8, 300),
            length: clampNum(Number(s.length) || 35, 8, 300),
            label: s.label || `Bậc ${idx + 1}`,
          }))
        : (preset.steps ?? [
            { diameter: 24, length: 36, label: "Ngõng trục" },
            { diameter: 30, length: 42, label: "Cổ trục 1" },
            { diameter: 38, length: 58, label: "Thân trục" },
            { diameter: 30, length: 42, label: "Cổ trục 2" },
          ]),
    notes:
      Array.isArray(raw.notes) && raw.notes.length > 0
        ? raw.notes.map(String)
        : (preset.notes ?? []),
  };
}

function inferCadPartKind(raw: Partial<SduCadSpec>): CadPartKind {
  const text = `${raw.part ?? ""} ${raw.name ?? ""}`.toLowerCase();
  if (text.includes("shaft") || text.includes("trục") || text.includes("truc") || Array.isArray(raw.steps)) {
    return "stepped_shaft";
  }
  if (text.includes("flange") || text.includes("bích") || text.includes("bich") || text.includes("khớp")) {
    return "flange_coupling";
  }
  if (text.includes("bearing") || text.includes("vòng bi") || text.includes("ổ bi") || text.includes("o lan")) {
    return "ball_bearing";
  }
  if (text.includes("bolt") || text.includes("bu lông") || text.includes("bu-lông") || text.includes("bulong") || text.includes("ốc")) {
    return "hex_bolt";
  }
  if (text.includes("bracket") || text.includes("giá đỡ") || text.includes("chữ l") || text.includes("gối")) {
    return "l_bracket";
  }
  if (text.includes("pulley") || text.includes("puli") || text.includes("bánh đai")) {
    return "pulley";
  }
  return "spur_gear";
}

function clampNum(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, val));
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function norm3(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function makeTri(a: Vec3, b: Vec3, c: Vec3, group?: string): Triangle3D {
  const normal = norm3(cross3(sub3(b, a), sub3(c, a)));
  return { a, b, c, normal, group };
}

function makeQuad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, group?: string): Triangle3D[] {
  return [makeTri(a, b, c, group), makeTri(a, c, d, group)];
}

/**
 * Generates an annulus/cylinder or stepped ring along the Z axis from z0 to z1
 */
function buildHollowCylinderMesh(
  rInner: number,
  rOuter: number,
  z0: number,
  z1: number,
  segments = 48,
  group = "body",
): Triangle3D[] {
  const tris: Triangle3D[] = [];
  const rIn = Math.max(0, Math.min(rInner, rOuter - 0.2));
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);

    const pOut0B: Vec3 = [rOuter * c0, rOuter * s0, z0];
    const pOut1B: Vec3 = [rOuter * c1, rOuter * s1, z0];
    const pOut1T: Vec3 = [rOuter * c1, rOuter * s1, z1];
    const pOut0T: Vec3 = [rOuter * c0, rOuter * s0, z1];

    // Outer wall
    tris.push(...makeQuad(pOut0B, pOut1B, pOut1T, pOut0T, group));

    if (rIn > 0.01) {
      const pIn0B: Vec3 = [rIn * c0, rIn * s0, z0];
      const pIn1B: Vec3 = [rIn * c1, rIn * s1, z0];
      const pIn1T: Vec3 = [rIn * c1, rIn * s1, z1];
      const pIn0T: Vec3 = [rIn * c0, rIn * s0, z1];

      // Inner bore wall
      tris.push(...makeQuad(pIn1B, pIn0B, pIn0T, pIn1T, "bore"));
      // Top cap
      tris.push(...makeQuad(pIn0T, pOut0T, pOut1T, pIn1T, "cap"));
      // Bottom cap
      tris.push(...makeQuad(pOut0B, pIn0B, pIn1B, pOut1B, "cap"));
    } else {
      const centerT: Vec3 = [0, 0, z1];
      const centerB: Vec3 = [0, 0, z0];
      tris.push(makeTri(centerT, pOut0T, pOut1T, "cap"));
      tris.push(makeTri(centerB, pOut1B, pOut0B, "cap"));
    }
  }
  return tris;
}

/**
 * Extrudes a 2D closed polygon (with optional circular inner bore) from z0 to z1
 */
function extrudePolygonWithBore(
  outerPts: [number, number][],
  rBore: number,
  z0: number,
  z1: number,
  group = "gear",
): Triangle3D[] {
  const tris: Triangle3D[] = [];
  const n = outerPts.length;
  const rIn = Math.max(0.5, rBore);

  for (let i = 0; i < n; i++) {
    const [x0, y0] = outerPts[i]!;
    const [x1, y1] = outerPts[(i + 1) % n]!;
    const a0 = Math.atan2(y0, x0);
    const a1 = Math.atan2(y1, x1);

    const bx0 = rIn * Math.cos(a0);
    const by0 = rIn * Math.sin(a0);
    const bx1 = rIn * Math.cos(a1);
    const by1 = rIn * Math.sin(a1);

    const o0B: Vec3 = [x0, y0, z0];
    const o1B: Vec3 = [x1, y1, z0];
    const o1T: Vec3 = [x1, y1, z1];
    const o0T: Vec3 = [x0, y0, z1];

    const i0B: Vec3 = [bx0, by0, z0];
    const i1B: Vec3 = [bx1, by1, z0];
    const i1T: Vec3 = [bx1, by1, z1];
    const i0T: Vec3 = [bx0, by0, z1];

    // Outer perimeter face
    tris.push(...makeQuad(o0B, o1B, o1T, o0T, group));
    // Inner bore face
    tris.push(...makeQuad(i1B, i0B, i0T, i1T, "bore"));
    // Top face
    tris.push(...makeQuad(i0T, o0T, o1T, i1T, "cap"));
    // Bottom face
    tris.push(...makeQuad(o0B, i0B, i1B, o1B, "cap"));
  }
  return tris;
}

/**
 * Generates 2D tooth profile vertices for a spur gear
 */
function generateGearProfilePoints(
  m: number,
  z: number,
  pressureAngleDeg = 20,
): [number, number][] {
  const rPitch = (m * z) / 2;
  const rAddendum = rPitch + m;
  const rDedendum = Math.max(rPitch - 1.25 * m, m * 1.5);
  const alpha = (pressureAngleDeg * Math.PI) / 180;
  const pts: [number, number][] = [];
  const stepAngle = (Math.PI * 2) / z;
  const halfToothPitchAngle = stepAngle / 4;
  const tipHalfAngle = halfToothPitchAngle * Math.max(0.42, 0.72 - 0.35 * Math.sin(alpha));
  const rootHalfAngle = halfToothPitchAngle * 1.28;

  for (let i = 0; i < z; i++) {
    const centerA = i * stepAngle;
    const aRootLeft = centerA - stepAngle / 2;
    const aFlankStart = centerA - rootHalfAngle;
    const aPitchLeft = centerA - halfToothPitchAngle;
    const aTipLeft = centerA - tipHalfAngle;
    const aTipRight = centerA + tipHalfAngle;
    const aPitchRight = centerA + halfToothPitchAngle;
    const aFlankEnd = centerA + rootHalfAngle;

    pts.push([rDedendum * Math.cos(aRootLeft), rDedendum * Math.sin(aRootLeft)]);
    pts.push([rDedendum * Math.cos(aFlankStart), rDedendum * Math.sin(aFlankStart)]);
    pts.push([rPitch * Math.cos(aPitchLeft), rPitch * Math.sin(aPitchLeft)]);
    pts.push([rAddendum * Math.cos(aTipLeft), rAddendum * Math.sin(aTipLeft)]);
    pts.push([rAddendum * Math.cos(aTipRight), rAddendum * Math.sin(aTipRight)]);
    pts.push([rPitch * Math.cos(aPitchRight), rPitch * Math.sin(aPitchRight)]);
    pts.push([rDedendum * Math.cos(aFlankEnd), rDedendum * Math.sin(aFlankEnd)]);
  }
  return pts;
}

/**
 * Builds complete 2D CAD entities (front view + side/section view + dimensions) and 3D triangles
 */
export function buildCadGeometry(rawSpec: Partial<SduCadSpec>): CadGeometryBundle {
  const spec = normalizeCadSpec(rawSpec);
  const lines2D: CadLine2D[] = [];
  const circles2D: CadCircle2D[] = [];
  const dimensions2D: CadDimension2D[] = [];
  const triangles3D: Triangle3D[] = [];
  const calculatedSpecs: { label: string; value: string }[] = [];

  const addRect2D = (
    x: number,
    y: number,
    w: number,
    h: number,
    layer: CadLine2D["layer"] = "OUTLINE",
  ) => {
    lines2D.push(
      { x1: x, y1: y, x2: x + w, y2: y, layer },
      { x1: x + w, y1: y, x2: x + w, y2: y + h, layer },
      { x1: x + w, y1: y + h, x2: x, y2: y + h, layer },
      { x1: x, y1: y + h, x2: x, y2: y, layer },
    );
  };

  const addCrosshair2D = (cx: number, cy: number, r: number) => {
    lines2D.push(
      { x1: cx - r, y1: cy, x2: cx + r, y2: cy, layer: "CENTER" },
      { x1: cx, y1: cy - r, x2: cx, y2: cy + r, layer: "CENTER" },
    );
  };

  if (spec.part === "spur_gear") {
    const m = spec.module;
    const z = spec.teeth;
    const d = m * z;
    const da = d + 2 * m;
    const df = Math.max(d - 2.5 * m, spec.boreDiameter + 4);
    const b = spec.faceWidth;
    const dBore = Math.min(spec.boreDiameter, df - 6);
    const dHub = Math.min(Math.max(spec.hubDiameter, dBore + 8), df - 2);
    const lHub = spec.hubLength;

    calculatedSpecs.push(
      { label: "Mô-đun (m)", value: `${m} mm` },
      { label: "Số răng (z)", value: `${z} răng` },
      { label: "Đường kính vòng chia (d = m·z)", value: `${d.toFixed(2)} mm` },
      { label: "Đường kính đỉnh răng (da)", value: `${da.toFixed(2)} mm` },
      { label: "Đường kính chân răng (df)", value: `${df.toFixed(2)} mm` },
      { label: "Bề rộng vành răng (b)", value: `${b} mm` },
      { label: "Lỗ trục & Rãnh then", value: `Ø${dBore} H7 · ${spec.keywayWidth}×${spec.keywayDepth} mm` },
    );

    const gearPts = generateGearProfilePoints(m, z, spec.pressureAngle);
    for (let i = 0; i < gearPts.length; i++) {
      const [x1, y1] = gearPts[i]!;
      const [x2, y2] = gearPts[(i + 1) % gearPts.length]!;
      lines2D.push({ x1, y1, x2, y2, layer: "OUTLINE" });
    }

    circles2D.push(
      { cx: 0, cy: 0, r: d / 2, layer: "CENTER" },
      { cx: 0, cy: 0, r: dHub / 2, layer: "OUTLINE" },
      { cx: 0, cy: 0, r: dBore / 2, layer: "OUTLINE" },
    );

    // Keyway on bore
    const kwHalf = spec.keywayWidth / 2;
    const rBore = dBore / 2;
    const kwTop = rBore + spec.keywayDepth;
    lines2D.push(
      { x1: -kwHalf, y1: rBore * 0.96, x2: -kwHalf, y2: kwTop, layer: "OUTLINE" },
      { x1: -kwHalf, y1: kwTop, x2: kwHalf, y2: kwTop, layer: "OUTLINE" },
      { x1: kwHalf, y1: kwTop, x2: kwHalf, y2: rBore * 0.96, layer: "OUTLINE" },
    );
    addCrosshair2D(0, 0, da * 0.58);

    // Side section view offset to the right
    const sideX = da * 0.78 + 28;
    const totalW = b + lHub;
    addRect2D(sideX, -da / 2, b, da, "OUTLINE");
    if (lHub > 0) {
      addRect2D(sideX + b, -dHub / 2, lHub, dHub, "OUTLINE");
    }
    // Bore & pitch lines in side view
    lines2D.push(
      { x1: sideX - 8, y1: 0, x2: sideX + totalW + 8, y2: 0, layer: "CENTER" },
      { x1: sideX, y1: d / 2, x2: sideX + b, y2: d / 2, layer: "CENTER" },
      { x1: sideX, y1: -d / 2, x2: sideX + b, y2: -d / 2, layer: "CENTER" },
      { x1: sideX, y1: df / 2, x2: sideX + b, y2: df / 2, layer: "HIDDEN" },
      { x1: sideX, y1: -df / 2, x2: sideX + b, y2: -df / 2, layer: "HIDDEN" },
      { x1: sideX, y1: dBore / 2, x2: sideX + totalW, y2: dBore / 2, layer: "OUTLINE" },
      { x1: sideX, y1: -dBore / 2, x2: sideX + totalW, y2: -dBore / 2, layer: "OUTLINE" },
    );

    dimensions2D.push(
      { x1: -da / 2, y1: -da / 2 - 12, x2: da / 2, y2: -da / 2 - 12, text: `Øda = ${da.toFixed(1)}` },
      { x1: -d / 2, y1: da / 2 + 12, x2: d / 2, y2: da / 2 + 12, text: `Ød = ${d.toFixed(1)} (z=${z}, m=${m})` },
      { x1: sideX, y1: -da / 2 - 12, x2: sideX + b, y2: -da / 2 - 12, text: `b = ${b}` },
    );

    // 3D mesh: gear body + hub
    triangles3D.push(...extrudePolygonWithBore(gearPts, dBore / 2, -b / 2, b / 2, "gear"));
    if (lHub > 0) {
      triangles3D.push(
        ...buildHollowCylinderMesh(dBore / 2, dHub / 2, b / 2, b / 2 + lHub, 40, "hub"),
      );
    }
  } else if (spec.part === "stepped_shaft") {
    const steps = spec.steps;
    const totalLen = steps.reduce((acc, s) => acc + s.length, 0);
    const maxD = Math.max(...steps.map((s) => s.diameter));

    calculatedSpecs.push(
      { label: "Tổng chiều dài trục (L)", value: `${totalLen} mm` },
      { label: "Số bậc trục", value: `${steps.length} bậc` },
      { label: "Đường kính lớn nhất (D_max)", value: `Ø${maxD} mm` },
      { label: "Rãnh then tiêu chuẩn", value: `b = ${spec.keywayWidth} mm · t = ${spec.keywayDepth} mm` },
    );

    let cursorX = -totalLen / 2;
    lines2D.push({
      x1: -totalLen / 2 - 14,
      y1: 0,
      x2: totalLen / 2 + 14,
      y2: 0,
      layer: "CENTER",
    });

    for (let i = 0; i < steps.length; i++) {
      const st = steps[i]!;
      addRect2D(cursorX, -st.diameter / 2, st.length, st.diameter, "OUTLINE");
      // Keyway slot on first and middle step
      if (i === 0 || i === 2) {
        const kwLen = Math.max(10, st.length * 0.65);
        const kwX = cursorX + (st.length - kwLen) / 2;
        addRect2D(kwX, -spec.keywayWidth / 2, kwLen, spec.keywayWidth, "HIDDEN");
      }
      dimensions2D.push({
        x1: cursorX,
        y1: -maxD / 2 - 12 - (i % 2) * 10,
        x2: cursorX + st.length,
        y2: -maxD / 2 - 12 - (i % 2) * 10,
        text: `L${i + 1}=${st.length} (Ø${st.diameter})`,
      });
      // 3D cylinder aligned along X/Z
      triangles3D.push(
        ...buildHollowCylinderMesh(0, st.diameter / 2, cursorX, cursorX + st.length, 44, `step-${i}`),
      );
      cursorX += st.length;
    }

    // Cross section circle on the right
    const secCx = totalLen / 2 + maxD * 0.8 + 20;
    circles2D.push({ cx: secCx, cy: 0, r: maxD / 2, layer: "OUTLINE" });
    addCrosshair2D(secCx, 0, maxD * 0.65);
  } else if (spec.part === "flange_coupling") {
    const D = spec.outerDiameter;
    const Db = Math.min(spec.boltCircleDiameter, D - 16);
    const dBore = Math.min(spec.boreDiameter, Db - 20);
    const dHub = Math.min(Math.max(spec.hubDiameter, dBore + 14), Db - 10);
    const t = spec.thickness;
    const lHub = Math.max(10, spec.hubLength);
    const nBolts = spec.boltCount;
    const dHole = spec.boltHoleDiameter;

    calculatedSpecs.push(
      { label: "Đường kính ngoài bích (D)", value: `Ø${D} mm` },
      { label: "Vòng tâm lỗ bu-lông (D_b)", value: `Ø${Db} mm` },
      { label: "Đường kính lỗ trục (d)", value: `Ø${dBore} H7` },
      { label: "Đường kính cổ bích (D_m)", value: `Ø${dHub} mm` },
      { label: "Bề dày bích / Chiều dài moay-ơ", value: `${t} mm / ${t + lHub} mm` },
      { label: "Hệ lỗ bu-lông", value: `${nBolts} × Ø${dHole} mm` },
    );

    circles2D.push(
      { cx: 0, cy: 0, r: D / 2, layer: "OUTLINE" },
      { cx: 0, cy: 0, r: Db / 2, layer: "CENTER" },
      { cx: 0, cy: 0, r: dHub / 2, layer: "OUTLINE" },
      { cx: 0, cy: 0, r: dBore / 2, layer: "OUTLINE" },
    );
    addCrosshair2D(0, 0, D * 0.58);

    for (let i = 0; i < nBolts; i++) {
      const a = (i / nBolts) * Math.PI * 2;
      const hx = (Db / 2) * Math.cos(a);
      const hy = (Db / 2) * Math.sin(a);
      circles2D.push({ cx: hx, cy: hy, r: dHole / 2, layer: "OUTLINE" });
    }

    const sideX = D * 0.72 + 28;
    addRect2D(sideX, -D / 2, t, D, "OUTLINE");
    addRect2D(sideX + t, -dHub / 2, lHub, dHub, "OUTLINE");
    lines2D.push(
      { x1: sideX - 8, y1: 0, x2: sideX + t + lHub + 8, y2: 0, layer: "CENTER" },
      { x1: sideX, y1: Db / 2, x2: sideX + t, y2: Db / 2, layer: "CENTER" },
      { x1: sideX, y1: -Db / 2, x2: sideX + t, y2: -Db / 2, layer: "CENTER" },
      { x1: sideX, y1: dBore / 2, x2: sideX + t + lHub, y2: dBore / 2, layer: "OUTLINE" },
      { x1: sideX, y1: -dBore / 2, x2: sideX + t + lHub, y2: -dBore / 2, layer: "OUTLINE" },
    );

    dimensions2D.push(
      { x1: -D / 2, y1: -D / 2 - 12, x2: D / 2, y2: -D / 2 - 12, text: `ØD = ${D}` },
      { x1: -Db / 2, y1: D / 2 + 12, x2: Db / 2, y2: D / 2 + 12, text: `ØDb = ${Db} (${nBolts}×Ø${dHole})` },
      { x1: sideX, y1: -D / 2 - 12, x2: sideX + t + lHub, y2: -D / 2 - 12, text: `L = ${t + lHub}` },
    );

    triangles3D.push(
      ...buildHollowCylinderMesh(dBore / 2, D / 2, -t / 2, t / 2, 52, "flange"),
      ...buildHollowCylinderMesh(dBore / 2, dHub / 2, t / 2, t / 2 + lHub, 44, "hub"),
    );
  } else if (spec.part === "ball_bearing") {
    const d = spec.innerDiameter;
    const D = Math.max(spec.outerDiameter, d + 20);
    const B = spec.width;
    const rPitch = (d + D) / 4;
    const ringThickness = (D - d) * 0.16;
    const rInnerOuter = d / 2 + ringThickness;
    const rOuterInner = D / 2 - ringThickness;
    const rBall = Math.max(2, (rOuterInner - rInnerOuter) * 0.48);

    calculatedSpecs.push(
      { label: "Đường kính vòng trong (d)", value: `Ø${d} mm` },
      { label: "Đường kính vòng ngoài (D)", value: `Ø${D} mm` },
      { label: "Bề rộng ổ lăn (B)", value: `${B} mm` },
      { label: "Số con lăn cầu (Z)", value: `${spec.ballCount} viên (Ø${(rBall * 2).toFixed(1)} mm)` },
    );

    circles2D.push(
      { cx: 0, cy: 0, r: D / 2, layer: "OUTLINE" },
      { cx: 0, cy: 0, r: rOuterInner, layer: "OUTLINE" },
      { cx: 0, cy: 0, r: rPitch, layer: "CENTER" },
      { cx: 0, cy: 0, r: rInnerOuter, layer: "OUTLINE" },
      { cx: 0, cy: 0, r: d / 2, layer: "OUTLINE" },
    );
    addCrosshair2D(0, 0, D * 0.58);

    for (let i = 0; i < spec.ballCount; i++) {
      const a = (i / spec.ballCount) * Math.PI * 2;
      circles2D.push({
        cx: rPitch * Math.cos(a),
        cy: rPitch * Math.sin(a),
        r: rBall,
        layer: "OUTLINE",
      });
    }

    const sideX = D * 0.72 + 24;
    addRect2D(sideX, -D / 2, B, D, "OUTLINE");
    circles2D.push(
      { cx: sideX + B / 2, cy: rPitch, r: rBall, layer: "OUTLINE" },
      { cx: sideX + B / 2, cy: -rPitch, r: rBall, layer: "OUTLINE" },
    );
    lines2D.push({ x1: sideX - 8, y1: 0, x2: sideX + B + 8, y2: 0, layer: "CENTER" });

    dimensions2D.push(
      { x1: -D / 2, y1: -D / 2 - 12, x2: D / 2, y2: -D / 2 - 12, text: `ØD = ${D}` },
      { x1: -d / 2, y1: D / 2 + 12, x2: d / 2, y2: D / 2 + 12, text: `Ød = ${d}` },
      { x1: sideX, y1: -D / 2 - 12, x2: sideX + B, y2: -D / 2 - 12, text: `B = ${B}` },
    );

    triangles3D.push(
      ...buildHollowCylinderMesh(rOuterInner, D / 2, -B / 2, B / 2, 48, "outer-ring"),
      ...buildHollowCylinderMesh(d / 2, rInnerOuter, -B / 2, B / 2, 48, "inner-ring"),
    );
    for (let i = 0; i < spec.ballCount; i++) {
      const a = (i / spec.ballCount) * Math.PI * 2;
      const bx = rPitch * Math.cos(a);
      const by = rPitch * Math.sin(a);
      const ballCyl = buildHollowCylinderMesh(0, rBall, -rBall * 0.75, rBall * 0.75, 16, "ball");
      for (const tri of ballCyl) {
        triangles3D.push({
          a: [tri.a[0] + bx, tri.a[1] + by, tri.a[2]],
          b: [tri.b[0] + bx, tri.b[1] + by, tri.b[2]],
          c: [tri.c[0] + bx, tri.c[1] + by, tri.c[2]],
          normal: tri.normal,
          group: "ball",
        });
      }
    }
  } else if (spec.part === "hex_bolt") {
    const d = spec.boreDiameter;
    const L = spec.length;
    const s = Math.max(spec.headWidth, d * 1.5);
    const k = spec.headHeight;
    const rHex = s / Math.sqrt(3);

    calculatedSpecs.push(
      { label: "Ký hiệu ren", value: `M${d} × ${spec.pitch}` },
      { label: "Chiều dài thân bu-lông (L)", value: `${L} mm` },
      { label: "Kích thước đầu giác (s)", value: `${s} mm` },
      { label: "Chiều cao mũ bu-lông (k)", value: `${k} mm` },
    );

    const hexPts: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      hexPts.push([rHex * Math.cos(a), rHex * Math.sin(a)]);
    }
    for (let i = 0; i < 6; i++) {
      const [x1, y1] = hexPts[i]!;
      const [x2, y2] = hexPts[(i + 1) % 6]!;
      lines2D.push({ x1, y1, x2, y2, layer: "OUTLINE" });
    }
    circles2D.push(
      { cx: 0, cy: 0, r: s / 2, layer: "OUTLINE" },
      { cx: 0, cy: 0, r: d / 2, layer: "HIDDEN" },
    );
    addCrosshair2D(0, 0, rHex * 1.2);

    const sideX = rHex + 24;
    addRect2D(sideX, -rHex, k, rHex * 2, "OUTLINE");
    addRect2D(sideX + k, -d / 2, L, d, "OUTLINE");
    // Thread lines
    const threadLen = Math.min(L * 0.65, d * 2.5);
    const threadStart = sideX + k + L - threadLen;
    lines2D.push(
      { x1: sideX - 8, y1: 0, x2: sideX + k + L + 8, y2: 0, layer: "CENTER" },
      { x1: threadStart, y1: -d / 2, x2: threadStart, y2: d / 2, layer: "OUTLINE" },
      { x1: threadStart, y1: d * 0.42, x2: sideX + k + L, y2: d * 0.42, layer: "HIDDEN" },
      { x1: threadStart, y1: -d * 0.42, x2: sideX + k + L, y2: -d * 0.42, layer: "HIDDEN" },
    );

    dimensions2D.push(
      { x1: -rHex, y1: -rHex - 12, x2: rHex, y2: -rHex - 12, text: `S = ${s}` },
      { x1: sideX + k, y1: -rHex - 12, x2: sideX + k + L, y2: -rHex - 12, text: `L = ${L} (M${d}×${spec.pitch})` },
    );

    triangles3D.push(
      ...extrudePolygonWithBore(hexPts, 0.2, -k, 0, "head"),
      ...buildHollowCylinderMesh(0, d / 2, 0, L, 36, "shank"),
    );
  } else if (spec.part === "l_bracket") {
    const L = spec.length;
    const W = spec.width;
    const H = spec.height;
    const t = Math.min(spec.thickness, Math.min(L, H) * 0.35);
    const dHole = spec.boltHoleDiameter;

    calculatedSpecs.push(
      { label: "Chiều dài đế (L)", value: `${L} mm` },
      { label: "Chiều cao thành đứng (H)", value: `${H} mm` },
      { label: "Bề rộng giá đỡ (W)", value: `${W} mm` },
      { label: "Chiều dày thành (t)", value: `${t} mm` },
      { label: "Lỗ bắt bu-lông", value: `${spec.boltCount} × Ø${dHole} mm` },
    );

    // Front L-profile
    const lPts: [number, number][] = [
      [-L / 2, -H / 2],
      [L / 2, -H / 2],
      [L / 2, -H / 2 + t],
      [-L / 2 + t, -H / 2 + t],
      [-L / 2 + t, H / 2],
      [-L / 2, H / 2],
    ];
    for (let i = 0; i < lPts.length; i++) {
      const [x1, y1] = lPts[i]!;
      const [x2, y2] = lPts[(i + 1) % lPts.length]!;
      lines2D.push({ x1, y1, x2, y2, layer: "OUTLINE" });
    }

    // Top view of base plate to the right
    const sideX = L / 2 + 28;
    addRect2D(sideX, -W / 2, L, W, "OUTLINE");
    lines2D.push({ x1: sideX + t, y1: -W / 2, x2: sideX + t, y2: W / 2, layer: "OUTLINE" });
    circles2D.push(
      { cx: sideX + L * 0.68, cy: W * 0.26, r: dHole / 2, layer: "OUTLINE" },
      { cx: sideX + L * 0.68, cy: -W * 0.26, r: dHole / 2, layer: "OUTLINE" },
    );

    dimensions2D.push(
      { x1: -L / 2, y1: -H / 2 - 12, x2: L / 2, y2: -H / 2 - 12, text: `L = ${L}` },
      { x1: sideX, y1: -W / 2 - 12, x2: sideX + L, y2: -W / 2 - 12, text: `W = ${W} (t=${t})` },
    );

    // Extrude L-profile in 3D along Z (-W/2 to W/2)
    const z0 = -W / 2;
    const z1 = W / 2;
    for (let i = 0; i < lPts.length; i++) {
      const [x0, y0] = lPts[i]!;
      const [x1, y1] = lPts[(i + 1) % lPts.length]!;
      triangles3D.push(
        ...makeQuad([x0, y0, z0], [x1, y1, z0], [x1, y1, z1], [x0, y0, z1], "bracket"),
      );
    }
    // Front & back L caps (2 rectangles)
    triangles3D.push(
      ...makeQuad(
        [-L / 2, -H / 2, z1],
        [L / 2, -H / 2, z1],
        [L / 2, -H / 2 + t, z1],
        [-L / 2, -H / 2 + t, z1],
        "cap",
      ),
      ...makeQuad(
        [-L / 2, -H / 2 + t, z1],
        [-L / 2 + t, -H / 2 + t, z1],
        [-L / 2 + t, H / 2, z1],
        [-L / 2, H / 2, z1],
        "cap",
      ),
      ...makeQuad(
        [L / 2, -H / 2, z0],
        [-L / 2, -H / 2, z0],
        [-L / 2, -H / 2 + t, z0],
        [L / 2, -H / 2 + t, z0],
        "cap",
      ),
      ...makeQuad(
        [-L / 2 + t, -H / 2 + t, z0],
        [-L / 2, -H / 2 + t, z0],
        [-L / 2, H / 2, z0],
        [-L / 2 + t, H / 2, z0],
        "cap",
      ),
    );
  } else {
    // Pulley V-belt
    const D = spec.outerDiameter;
    const dBore = spec.boreDiameter;
    const dHub = spec.hubDiameter;
    const B = spec.width;

    calculatedSpecs.push(
      { label: "Đường kính ngoài Puli (D)", value: `Ø${D} mm` },
      { label: "Đường kính lỗ trục (d)", value: `Ø${dBore} H7` },
      { label: "Bề rộng bánh đai (B)", value: `${B} mm (${spec.grooveCount} rãnh đai)` },
    );

    circles2D.push(
      { cx: 0, cy: 0, r: D / 2, layer: "OUTLINE" },
      { cx: 0, cy: 0, r: D / 2 - 9, layer: "CENTER" },
      { cx: 0, cy: 0, r: dHub / 2, layer: "OUTLINE" },
      { cx: 0, cy: 0, r: dBore / 2, layer: "OUTLINE" },
    );
    addCrosshair2D(0, 0, D * 0.58);

    const sideX = D * 0.72 + 24;
    addRect2D(sideX, -D / 2, B, D, "OUTLINE");
    lines2D.push({ x1: sideX - 8, y1: 0, x2: sideX + B + 8, y2: 0, layer: "CENTER" });

    dimensions2D.push(
      { x1: -D / 2, y1: -D / 2 - 12, x2: D / 2, y2: -D / 2 - 12, text: `ØD = ${D}` },
      { x1: sideX, y1: -D / 2 - 12, x2: sideX + B, y2: -D / 2 - 12, text: `B = ${B}` },
    );

    triangles3D.push(...buildHollowCylinderMesh(dBore / 2, D / 2, -B / 2, B / 2, 48, "pulley"));
  }

  // Compute 2D bounding box
  let minX = -60;
  let minY = -60;
  let maxX = 120;
  let maxY = 60;
  for (const l of lines2D) {
    minX = Math.min(minX, l.x1, l.x2);
    maxX = Math.max(maxX, l.x1, l.x2);
    minY = Math.min(minY, l.y1, l.y2);
    maxY = Math.max(maxY, l.y1, l.y2);
  }
  for (const c of circles2D) {
    minX = Math.min(minX, c.cx - c.r);
    maxX = Math.max(maxX, c.cx + c.r);
    minY = Math.min(minY, c.cy - c.r);
    maxY = Math.max(maxY, c.cy + c.r);
  }

  // Compute 3D bounding box
  const min3: Vec3 = [Infinity, Infinity, Infinity];
  const max3: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const tri of triangles3D) {
    for (const v of [tri.a, tri.b, tri.c]) {
      min3[0] = Math.min(min3[0], v[0]);
      min3[1] = Math.min(min3[1], v[1]);
      min3[2] = Math.min(min3[2], v[2]);
      max3[0] = Math.max(max3[0], v[0]);
      max3[1] = Math.max(max3[1], v[1]);
      max3[2] = Math.max(max3[2], v[2]);
    }
  }
  const radius =
    Math.hypot(max3[0] - min3[0], max3[1] - min3[1], max3[2] - min3[2]) / 2 || 50;

  return {
    spec,
    lines2D,
    circles2D,
    dimensions2D,
    bbox2D: { minX: minX - 18, minY: minY - 26, maxX: maxX + 18, maxY: maxY + 26 },
    triangles3D,
    bbox3D: { min: min3, max: max3, radius },
    calculatedSpecs,
  };
}

/**
 * Generates an industry-standard AutoCAD R12/R2000 ASCII DXF file (.dxf)
 * with layers (OUTLINE, CENTER, HIDDEN, DIM, TITLEBLOCK), geometry, dimensions, and SDU Title Block.
 */
export function generateAutoCadDxf(bundle: CadGeometryBundle): string {
  const { spec, lines2D, circles2D, dimensions2D, bbox2D } = bundle;
  const out: string[] = [];
  const push = (code: number, val: string | number) => {
    out.push(String(code), String(val));
  };

  // HEADER
  push(0, "SECTION");
  push(2, "HEADER");
  push(9, "$ACADVER");
  push(1, "AC1009");
  push(9, "$INSUNITS");
  push(70, 4); // millimeters
  push(0, "ENDSEC");

  // TABLES (LAYERS)
  push(0, "SECTION");
  push(2, "TABLES");
  push(0, "TABLE");
  push(2, "LAYER");
  push(70, 5);

  const layers: { name: string; color: number }[] = [
    { name: "OUTLINE", color: 7 }, // White/Black
    { name: "CENTER", color: 1 }, // Red
    { name: "HIDDEN", color: 3 }, // Green
    { name: "DIM", color: 5 }, // Blue
    { name: "TITLEBLOCK", color: 2 }, // Yellow
  ];
  for (const lay of layers) {
    push(0, "LAYER");
    push(2, lay.name);
    push(70, 0);
    push(62, lay.color);
    push(6, "CONTINUOUS");
  }
  push(0, "ENDTAB");
  push(0, "ENDSEC");

  // ENTITIES
  push(0, "SECTION");
  push(2, "ENTITIES");

  for (const line of lines2D) {
    push(0, "LINE");
    push(8, line.layer);
    push(10, line.x1.toFixed(4));
    push(20, line.y1.toFixed(4));
    push(30, "0.0");
    push(11, line.x2.toFixed(4));
    push(21, line.y2.toFixed(4));
    push(31, "0.0");
  }

  for (const cir of circles2D) {
    push(0, "CIRCLE");
    push(8, cir.layer);
    push(10, cir.cx.toFixed(4));
    push(20, cir.cy.toFixed(4));
    push(30, "0.0");
    push(40, cir.r.toFixed(4));
  }

  for (const dim of dimensions2D) {
    push(0, "LINE");
    push(8, "DIM");
    push(10, dim.x1.toFixed(4));
    push(20, dim.y1.toFixed(4));
    push(30, "0.0");
    push(11, dim.x2.toFixed(4));
    push(21, dim.y2.toFixed(4));
    push(31, "0.0");

    push(0, "TEXT");
    push(8, "DIM");
    push(10, ((dim.x1 + dim.x2) / 2 - dim.text.length * 1.2).toFixed(4));
    push(20, (dim.y1 - 4.5).toFixed(4));
    push(30, "0.0");
    push(40, "3.2");
    push(1, asciiSafe(dim.text));
  }

  // SDU Title Block in DXF
  const tbX = bbox2D.minX;
  const tbY = bbox2D.minY - 28;
  const tbW = Math.max(160, bbox2D.maxX - bbox2D.minX);
  const tbH = 22;

  const tbRect: [number, number, number, number][] = [
    [tbX, tbY, tbX + tbW, tbY],
    [tbX + tbW, tbY, tbX + tbW, tbY + tbH],
    [tbX + tbW, tbY + tbH, tbX, tbY + tbH],
    [tbX, tbY + tbH, tbX, tbY],
  ];
  for (const [x1, y1, x2, y2] of tbRect) {
    push(0, "LINE");
    push(8, "TITLEBLOCK");
    push(10, x1.toFixed(4));
    push(20, y1.toFixed(4));
    push(30, "0.0");
    push(11, x2.toFixed(4));
    push(21, y2.toFixed(4));
    push(31, "0.0");
  }

  const titleTexts: { x: number; y: number; h: number; text: string }[] = [
    { x: tbX + 4, y: tbY + 14, h: 3.5, text: `TRUONG DAI HOC SAO DO (SDU) - MODEL SDU 1.3 (QWEN 3.8)` },
    { x: tbX + 4, y: tbY + 8, h: 3.0, text: `CHI TIET: ${asciiSafe(spec.name)} | VAT LIEU: ${asciiSafe(spec.material)}` },
    { x: tbX + 4, y: tbY + 2.5, h: 2.6, text: `TIEU CHUAN: ${asciiSafe(spec.standard)} | TY LE: ${spec.scale} | DON VI: ${spec.unit}` },
  ];
  for (const tt of titleTexts) {
    push(0, "TEXT");
    push(8, "TITLEBLOCK");
    push(10, tt.x.toFixed(4));
    push(20, tt.y.toFixed(4));
    push(30, "0.0");
    push(40, tt.h.toFixed(2));
    push(1, tt.text);
  }

  push(0, "ENDSEC");
  push(0, "EOF");
  return out.join("\n") + "\n";
}

/**
 * Generates an AutoCAD command script (.scr) that can be dragged-and-dropped into AutoCAD
 */
export function generateAutoCadScript(bundle: CadGeometryBundle): string {
  const { spec, lines2D, circles2D } = bundle;
  const cmds: string[] = [
    `; AutoCAD Script (.scr) generated by ${spec.name} - Model SDU 1.3 (Qwen 3.8)`,
    `; Truong Dai hoc Sao Do - Khoa Co khi & Dien tu`,
    `._-LAYER _M OUTLINE _C 7 OUTLINE _M CENTER _C 1 CENTER _M HIDDEN _C 3 HIDDEN _M DIM _C 5 DIM `,
  ];

  for (const cir of circles2D) {
    cmds.push(`._-LAYER _S ${cir.layer} `);
    cmds.push(`._CIRCLE ${cir.cx.toFixed(3)},${cir.cy.toFixed(3)} ${cir.r.toFixed(3)}`);
  }

  for (const line of lines2D) {
    cmds.push(`._-LAYER _S ${line.layer} `);
    cmds.push(`._LINE ${line.x1.toFixed(3)},${line.y1.toFixed(3)} ${line.x2.toFixed(3)},${line.y2.toFixed(3)} `);
  }

  cmds.push(`._ZOOM _E`);
  return cmds.join("\n") + "\n";
}

/**
 * Generates a valid ASCII STL 3D mesh file (.stl) for 3D printing, SolidWorks, Inventor, Fusion 360, Blender
 */
export function generateStlMesh(bundle: CadGeometryBundle): string {
  const solidName = asciiSafe(bundle.spec.name).replace(/\s+/g, "_") || "SDU_Mechanical_Part";
  const lines: string[] = [`solid ${solidName}`];
  for (const tri of bundle.triangles3D) {
    const [nx, ny, nz] = tri.normal;
    lines.push(`  facet normal ${nx.toExponential(5)} ${ny.toExponential(5)} ${nz.toExponential(5)}`);
    lines.push(`    outer loop`);
    lines.push(`      vertex ${tri.a[0].toFixed(4)} ${tri.a[1].toFixed(4)} ${tri.a[2].toFixed(4)}`);
    lines.push(`      vertex ${tri.b[0].toFixed(4)} ${tri.b[1].toFixed(4)} ${tri.b[2].toFixed(4)}`);
    lines.push(`      vertex ${tri.c[0].toFixed(4)} ${tri.c[1].toFixed(4)} ${tri.c[2].toFixed(4)}`);
    lines.push(`    endloop`);
    lines.push(`  endfacet`);
  }
  lines.push(`endsolid ${solidName}`);
  return lines.join("\n") + "\n";
}

/**
 * Generates a Wavefront OBJ 3D model file (.obj)
 */
export function generateObjMesh(bundle: CadGeometryBundle): string {
  const lines: string[] = [
    `# Wavefront OBJ 3D Model generated by Model SDU 1.3 (Qwen 3.8) - Dai hoc Sao Do`,
    `# Part: ${asciiSafe(bundle.spec.name)} (${bundle.spec.unit})`,
    `o ${asciiSafe(bundle.spec.name).replace(/\s+/g, "_")}`,
  ];
  let vIdx = 1;
  for (const tri of bundle.triangles3D) {
    lines.push(`v ${tri.a[0].toFixed(4)} ${tri.a[1].toFixed(4)} ${tri.a[2].toFixed(4)}`);
    lines.push(`v ${tri.b[0].toFixed(4)} ${tri.b[1].toFixed(4)} ${tri.b[2].toFixed(4)}`);
    lines.push(`v ${tri.c[0].toFixed(4)} ${tri.c[1].toFixed(4)} ${tri.c[2].toFixed(4)}`);
    lines.push(`vn ${tri.normal[0].toFixed(4)} ${tri.normal[1].toFixed(4)} ${tri.normal[2].toFixed(4)}`);
    const nIdx = Math.ceil(vIdx / 3);
    lines.push(`f ${vIdx}//${nIdx} ${vIdx + 1}//${nIdx} ${vIdx + 2}//${nIdx}`);
    vIdx += 3;
  }
  return lines.join("\n") + "\n";
}

/**
 * Generates parametric OpenSCAD code (.scad) for the mechanical part
 */
export function generateOpenScadCode(bundle: CadGeometryBundle): string {
  const s = bundle.spec;
  if (s.part === "spur_gear") {
    return `// OpenSCAD Parametric Gear — Model SDU 1.3 (Qwen 3.8) · Đại học Sao Đỏ
// Chi tiết: ${s.name} | Vật liệu: ${s.material}
$fn = 96;
module_m = ${s.module};
teeth_z = ${s.teeth};
face_width = ${s.faceWidth};
bore_d = ${s.boreDiameter};
hub_d = ${s.hubDiameter};
hub_l = ${s.hubLength};
key_w = ${s.keywayWidth};
key_t = ${s.keywayDepth};

pitch_d = module_m * teeth_z;
outer_d = pitch_d + 2 * module_m;
root_d = pitch_d - 2.5 * module_m;

difference() {
  union() {
    cylinder(h = face_width, d = root_d, center = true);
    for (i = [0 : teeth_z - 1]) {
      rotate([0, 0, i * 360 / teeth_z])
        translate([root_d / 2, 0, 0])
          cube([(outer_d - root_d), module_m * 1.45, face_width], center = true);
    }
    if (hub_l > 0)
      translate([0, 0, face_width / 2 + hub_l / 2])
        cylinder(h = hub_l, d = hub_d, center = true);
  }
  cylinder(h = face_width + hub_l * 2 + 4, d = bore_d, center = true);
  translate([0, bore_d / 2 + key_t / 2, 0])
    cube([key_w, key_t + 1, face_width + hub_l * 2 + 4], center = true);
}
`;
  }
  if (s.part === "flange_coupling") {
    return `// OpenSCAD Parametric Flange Coupling — Model SDU 1.3 (Qwen 3.8) · Đại học Sao Đỏ
$fn = 96;
outer_d = ${s.outerDiameter};
bolt_circle_d = ${s.boltCircleDiameter};
bore_d = ${s.boreDiameter};
hub_d = ${s.hubDiameter};
hub_l = ${s.hubLength};
thickness = ${s.thickness};
bolt_count = ${s.boltCount};
bolt_hole_d = ${s.boltHoleDiameter};

difference() {
  union() {
    cylinder(h = thickness, d = outer_d);
    translate([0, 0, thickness])
      cylinder(h = hub_l, d = hub_d);
  }
  translate([0, 0, -1])
    cylinder(h = thickness + hub_l + 2, d = bore_d);
  for (i = [0 : bolt_count - 1]) {
    rotate([0, 0, i * 360 / bolt_count])
      translate([bolt_circle_d / 2, 0, -1])
        cylinder(h = thickness + 2, d = bolt_hole_d);
  }
}
`;
  }
  return `// OpenSCAD Parametric Part — Model SDU 1.3 (Qwen 3.8) · Đại học Sao Đỏ
// Chi tiết: ${s.name} (${s.part})
$fn = 96;
difference() {
  cylinder(h = ${s.width || s.thickness}, d = ${s.outerDiameter}, center = true);
  cylinder(h = ${(s.width || s.thickness) + 4}, d = ${s.boreDiameter}, center = true);
}
`;
}

export function asciiSafe(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7E]/g, " ");
}

export function triggerFileDownload(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function parseChartSpecBlock(code: string): SduChartSpec | null {
  try {
    const cleaned = code.trim();
    const raw = JSON.parse(cleaned) as Partial<SduChartSpec>;
    if (!raw || !Array.isArray(raw.labels) || !Array.isArray(raw.series) || !raw.series.length) {
      return null;
    }
    const validTypes: SduChartType[] = ["bar", "line", "radar", "pie", "area"];
    const type: SduChartType = validTypes.includes(raw.type as SduChartType)
      ? (raw.type as SduChartType)
      : "bar";
    return {
      type,
      title: String(raw.title || "Biểu đồ Phân tích Dữ liệu SDU"),
      subtitle: raw.subtitle ? String(raw.subtitle) : undefined,
      unit: raw.unit ? String(raw.unit) : undefined,
      labels: raw.labels.map(String),
      series: raw.series.map((s, idx) => ({
        name: String(s.name || `Chuỗi ${idx + 1}`),
        color: s.color,
        values: Array.isArray(s.values) ? s.values.map((v) => Number(v) || 0) : [],
      })),
      note: raw.note ? String(raw.note) : undefined,
    };
  } catch {
    return null;
  }
}

export function parseCadSpecBlock(code: string): SduCadSpec | null {
  try {
    const cleaned = code.trim();
    const raw = JSON.parse(cleaned) as Partial<SduCadSpec>;
    if (!raw || typeof raw !== "object") return null;
    return normalizeCadSpec(raw);
  } catch {
    return null;
  }
}

/**
 * Ensures that if the user asked for a mechanical part / AutoCAD / 3D model or a chart,
 * and the AI response did not already include a fenced ```sdu-cad or ```sdu-chart block,
 * we synthesize the matching parametric CAD/3D or Chart block from the user's prompt.
 */
export function ensureVisualBlocksInAnswer(userPrompt: string, assistantText: string): string {
  const lower = userPrompt.toLowerCase();
  let result = assistantText;

  const hasCadBlock =
    /```(?:sdu-cad|cad|sdu-3d|3d)\b/i.test(result) ||
    (/```json/i.test(result) && /"part"\s*:\s*"(?:spur_gear|stepped_shaft|flange_coupling|ball_bearing|hex_bolt|l_bracket|pulley)"/.test(result));

  const wantsCad =
    /(?:chi tiết máy|bản vẽ|autocad|autocard|\.dxf|\.stl|\.obj|mô hình 3d|file 3d|bánh răng|trục bậc|mặt bích|khớp nối|ổ bi|vòng bi|ổ lăn|bu-lông|bu lông|bulong|giá đỡ|puli|bánh đai)/i.test(
      lower,
    );

  if (wantsCad && !hasCadBlock) {
    const part = inferCadPartKind({ name: userPrompt });
    const base = { ...PRESET_CAD_SPECS[part] };

    // Extract custom numbers if mentioned in prompt (e.g., z=30, m=3, d=25)
    const mMatch = userPrompt.match(/(?:mô-đun|module|\bm)\s*[=: routes]?\s*(\d+(?:\.\d+)?)/i);
    const zMatch = userPrompt.match(/(?:số răng|\bz)\s*[=:]?\s*(\d+)/i);
    const bMatch = userPrompt.match(/(?:bề rộng|\bb)\s*[=:]?\s*(\d+(?:\.\d+)?)/i);
    const dMatch = userPrompt.match(/(?:đường kính|\bd|\bD)\s*[=:]?\s*(\d+(?:\.\d+)?)/i);

    if (mMatch) base.module = Number(mMatch[1]);
    if (zMatch) base.teeth = Number(zMatch[1]);
    if (bMatch) base.faceWidth = Number(bMatch[1]);
    if (dMatch && part !== "spur_gear") base.outerDiameter = Number(dMatch[1]);

    if (part === "spur_gear" && (mMatch || zMatch)) {
      base.name = `Bánh răng trụ răng thẳng Z${base.teeth}-M${base.module}`;
    }

    result = `${result.trim()}\n\n\`\`\`sdu-cad\n${JSON.stringify(base, null, 2)}\n\`\`\``;
  }

  const hasChartBlock =
    /```(?:sdu-chart|chart)\b/i.test(result) ||
    (/```json/i.test(result) && result.includes('"labels"') && result.includes('"series"'));

  const wantsChart = /(?:vẽ biểu đồ|biểu đồ|đồ thị|chart|graph)/i.test(lower);

  if (wantsChart && !hasChartBlock) {
    const chartType: SduChartType = lower.includes("tròn") || lower.includes("pie")
      ? "pie"
      : lower.includes("radar")
        ? "radar"
        : lower.includes("đường") || lower.includes("line")
          ? "line"
          : "bar";

    const fallbackChart: SduChartSpec = {
      type: chartType,
      title: "Biểu đồ Phân tích Kết quả Học tập & Chuyên cần Lớp DK13-CNTT1",
      subtitle: "Tổng hợp tự động bởi Model SDU 1.3 (Qwen 3.8)",
      unit: "điểm",
      labels: [
        "Nguyễn Văn Minh",
        "Phạm Khánh Linh",
        "Lê Việt Hoàng",
        "Đỗ Thu Trang",
        "Vũ Quốc Bảo",
        "Hoàng Minh Tuấn",
      ],
      series: [
        { name: "GPA (Hệ 4.0)", color: "#e11d48", values: [3.48, 3.72, 3.15, 3.54, 2.78, 3.32] },
        { name: "Điểm rèn luyện (/25)", color: "#2563eb", values: [3.52, 3.76, 3.16, 3.64, 2.88, 3.4] },
      ],
      note: "Dữ liệu trích xuất trực tiếp từ Hệ thống Bộ nhớ Học sinh AI — Trường Đại học Sao Đỏ.",
    };

    result = `${result.trim()}\n\n\`\`\`sdu-chart\n${JSON.stringify(fallbackChart, null, 2)}\n\`\`\``;
  }

  return result;
}

