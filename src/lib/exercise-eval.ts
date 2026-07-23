/**
 * Rule-based exercise evaluation (push-up, plank, jumping jacks, sit-up, pull-up).
 * Squat uses the ONNX models in client.pose.tsx — only rep helper exported here.
 */

export interface Kp {
  x: number;
  y: number;
  conf: number;
}

export type ExerciseMode = "squat" | "pushup" | "plank" | "jumping_jacks" | "situp" | "pullup";
("bicep_curl");
("lunge");
("shoulder_press");
("lateral_raise");
"tricep_extension" | "high_knees";
("glute_bridge");
("leg_raise");
"mountain_climbers" | "wall_sit";
("hammer_curl");

export const EXERCISE_OPTIONS: { id: ExerciseMode; label: string; usesOnnx: boolean }[] = [
  { id: "squat", label: "Squat", usesOnnx: true },
  { id: "pushup", label: "Push-up", usesOnnx: false },
  { id: "plank", label: "Plank", usesOnnx: false },
  { id: "jumping_jacks", label: "Jumping Jacks", usesOnnx: false },
  { id: "situp", label: "Sit Up", usesOnnx: false },
  { id: "pullup", label: "Pull-up", usesOnnx: false },
  { id: "bicep_curl", label: "Bicep Curl", usesOnnx: false },
  { id: "lunge", label: "Lunge", usesOnnx: false },
  { id: "shoulder_press", label: "Shoulder Press", usesOnnx: false },
  { id: "lateral_raise", label: "Lateral Raise", usesOnnx: false },
  { id: "tricep_extension", label: "Tricep Extension", usesOnnx: false },
  { id: "high_knees", label: "High Knees", usesOnnx: false },
  { id: "glute_bridge", label: "Glute Bridge", usesOnnx: false },
  { id: "leg_raise", label: "Leg Raise", usesOnnx: false },
  { id: "mountain_climbers", label: "Mountain Climbers", usesOnnx: false },
  { id: "wall_sit", label: "Wall Sit", usesOnnx: false },
  { id: "hammer_curl", label: "Hammer Curl", usesOnnx: false },
];

export type FormLabel = "Good" | "Bad" | "N/A";

export interface EvalResult {
  exercise: string;
  poseConf: number;
  form: FormLabel;
  formConf: number;
  reps: number;
  goodFrame: boolean;
  features: Record<string, number>;
}

const KP = {
  L_SHOULDER: 5,
  R_SHOULDER: 6,
  L_ELBOW: 7,
  R_ELBOW: 8,
  L_WRIST: 9,
  R_WRIST: 10,
  L_HIP: 11,
  R_HIP: 12,
  L_KNEE: 13,
  R_KNEE: 14,
  L_ANKLE: 15,
  R_ANKLE: 16,
} as const;

const MIN_CONF = 0.2;

function angle(a: [number, number], b: [number, number], c: [number, number]): number {
  const ba = [a[0] - b[0], a[1] - b[1]];
  const bc = [c[0] - b[0], c[1] - b[1]];
  const dot = ba[0] * bc[0] + ba[1] * bc[1];
  const m1 = Math.hypot(ba[0], ba[1]) + 1e-7;
  const m2 = Math.hypot(bc[0], bc[1]) + 1e-7;
  return (Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * 180) / Math.PI;
}

function ang(kps: Kp[], a: number, b: number, c: number): number | null {
  if (
    (kps[a]?.conf ?? 0) < MIN_CONF ||
    (kps[b]?.conf ?? 0) < MIN_CONF ||
    (kps[c]?.conf ?? 0) < MIN_CONF
  ) {
    return null;
  }
  return angle([kps[a].x, kps[a].y], [kps[b].x, kps[b].y], [kps[c].x, kps[c].y]);
}

function avg(...v: Array<number | null>): number | null {
  const xs = v.filter((x): x is number => x != null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function dist(a: Kp, b: Kp): number | null {
  if (a.conf < MIN_CONF || b.conf < MIN_CONF) return null;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function torso(kps: Kp[]): number {
  const d = dist(kps[KP.L_SHOULDER], kps[KP.L_HIP]) ?? dist(kps[KP.R_SHOULDER], kps[KP.R_HIP]);
  return d && d > 1 ? d : 80;
}

function conf(kps: Kp[], ids: number[]): number {
  const c = ids.map((i) => kps[i]?.conf ?? 0).filter((x) => x > MIN_CONF);
  return c.length ? c.reduce((a, b) => a + b, 0) / c.length : 0;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** Rep completes when angle returns to "up" after visiting "down". */
export class AngleRepCounter {
  count = 0;
  stage: "up" | "down" = "up";

  constructor(
    readonly up: number,
    readonly down: number,
  ) {}

  update(angle: number): boolean {
    let done = false;
    if (angle >= this.up) {
      if (this.stage === "down") {
        this.count++;
        done = true;
      }
      this.stage = "up";
    } else if (angle <= this.down) {
      this.stage = "down";
    }
    return done;
  }

  reset() {
    this.count = 0;
    this.stage = "up";
  }
}

export function exerciseUsesOnnx(mode: ExerciseMode): boolean {
  return mode === "squat";
}

export function exerciseLabel(mode: ExerciseMode): string {
  return EXERCISE_OPTIONS.find((o) => o.id === mode)?.label ?? mode;
}

export function createSquatRepCounter(): AngleRepCounter {
  return new AngleRepCounter(150, 100);
}

// ─── Per-exercise evaluators ───────────────────────────────────────────────────

function evalPushup(kps: Kp[], s: PushupState): EvalResult {
  const elbow = avg(
    ang(kps, KP.L_SHOULDER, KP.L_ELBOW, KP.L_WRIST),
    ang(kps, KP.R_SHOULDER, KP.R_ELBOW, KP.R_WRIST),
  );
  const body = avg(
    ang(kps, KP.L_SHOULDER, KP.L_HIP, KP.L_ANKLE) ?? ang(kps, KP.L_SHOULDER, KP.L_HIP, KP.L_KNEE),
    ang(kps, KP.R_SHOULDER, KP.R_HIP, KP.R_ANKLE) ?? ang(kps, KP.R_SHOULDER, KP.R_HIP, KP.R_KNEE),
  );
  const poseConf = conf(kps, [
    KP.L_SHOULDER,
    KP.R_SHOULDER,
    KP.L_ELBOW,
    KP.R_ELBOW,
    KP.L_WRIST,
    KP.R_WRIST,
  ]);

  if (elbow == null || body == null) {
    return na("Push-up", poseConf, s.count);
  }

  if (s.stage === "down") s.minElbow = Math.min(s.minElbow, elbow);

  if (elbow >= 150) {
    if (s.stage === "down") {
      s.count++;
      const depthOk = s.minElbow <= 100;
      const bodyOk = body >= 145;
      s.lastGood = depthOk && bodyOk;
    }
    s.stage = "up";
    s.minElbow = 180;
  } else if (elbow <= 105) {
    s.stage = "down";
    s.minElbow = elbow;
  }

  const formGood = s.stage === "down" ? s.minElbow <= 100 && body >= 145 : s.lastGood;

  return {
    exercise: "Push-up",
    poseConf,
    form: s.stage === "down" ? (formGood ? "Good" : "Bad") : "N/A",
    formConf: clamp01((150 - s.minElbow) / 50),
    reps: s.count,
    goodFrame: s.stage === "down" && formGood,
    features: { elbow, body, min_elbow: s.minElbow },
  };
}

function evalPlank(kps: Kp[], s: PlankState, nowMs: number): EvalResult {
  const body = avg(
    ang(kps, KP.L_SHOULDER, KP.L_HIP, KP.L_ANKLE) ?? ang(kps, KP.L_SHOULDER, KP.L_HIP, KP.L_KNEE),
    ang(kps, KP.R_SHOULDER, KP.R_HIP, KP.R_ANKLE) ?? ang(kps, KP.R_SHOULDER, KP.R_HIP, KP.R_KNEE),
  );
  const poseConf = conf(kps, [KP.L_SHOULDER, KP.R_SHOULDER, KP.L_HIP, KP.R_HIP]);
  const inPose = body != null && body >= 140;

  if (inPose) {
    if (!s.active) {
      s.active = true;
      s.startMs = nowMs;
    }
    s.holdSec = Math.floor((nowMs - s.startMs) / 1000);
  } else {
    s.active = false;
  }

  const formGood = inPose && body! >= 155;
  return {
    exercise: "Plank",
    poseConf,
    form: inPose ? (formGood ? "Good" : "Bad") : "N/A",
    formConf: body != null ? clamp01((body - 130) / 40) : 0,
    reps: s.holdSec,
    goodFrame: formGood,
    features: { body: body ?? 0, hold_sec: s.holdSec },
  };
}

function evalJumpingJacks(kps: Kp[], s: JackState): EvalResult {
  const t = torso(kps);
  const shW = dist(kps[KP.L_SHOULDER], kps[KP.R_SHOULDER]) ?? t * 0.35;
  const anW = dist(kps[KP.L_ANKLE], kps[KP.R_ANKLE]) ?? shW;
  const spread = anW / shW;

  const armL = (kps[KP.L_SHOULDER].y - kps[KP.L_WRIST].y) / t;
  const armR = (kps[KP.R_SHOULDER].y - kps[KP.R_WRIST].y) / t;
  const armsUp = armL > 0.22 && armR > 0.22;
  const armsDown = armL < 0.08 && armR < 0.08;
  const legsWide = spread > 1.4;
  const legsClosed = spread < 1.15;

  const isOpen = armsUp && legsWide;
  const isClosed = armsDown && legsClosed;

  if (isOpen) s.open = true;
  else if (isClosed && s.open) {
    s.count++;
    s.open = false;
  }

  const poseConf = conf(kps, [
    KP.L_WRIST,
    KP.R_WRIST,
    KP.L_ANKLE,
    KP.R_ANKLE,
    KP.L_SHOULDER,
    KP.R_SHOULDER,
  ]);
  const formGood = isOpen ? armsUp && legsWide : isClosed;

  return {
    exercise: "Jumping Jacks",
    poseConf,
    form: poseConf > 0.25 ? (formGood ? "Good" : "Bad") : "N/A",
    formConf: poseConf,
    reps: s.count,
    goodFrame: formGood && poseConf > 0.25,
    features: { spread, arm_l: armL, arm_r: armR },
  };
}

function evalSitup(kps: Kp[], s: SitupState): EvalResult {
  const hip = avg(
    ang(kps, KP.L_SHOULDER, KP.L_HIP, KP.L_KNEE),
    ang(kps, KP.R_SHOULDER, KP.R_HIP, KP.R_KNEE),
  );
  const poseConf = conf(kps, [
    KP.L_SHOULDER,
    KP.R_SHOULDER,
    KP.L_HIP,
    KP.R_HIP,
    KP.L_KNEE,
    KP.R_KNEE,
  ]);

  if (hip == null) return na("Sit Up", poseConf, s.count);

  if (hip <= 100) {
    s.stage = "crunched";
    s.minHip = Math.min(s.minHip, hip);
  } else if (hip >= 130) {
    if (s.stage === "crunched") s.count++;
    s.stage = "lying";
    s.minHip = 180;
  } else if (s.stage === "crunched") {
    s.minHip = Math.min(s.minHip, hip);
  }

  const formGood = s.stage === "crunched" && s.minHip <= 110;
  return {
    exercise: "Sit Up",
    poseConf,
    form: s.stage === "crunched" ? (formGood ? "Good" : "Bad") : "N/A",
    formConf: clamp01((120 - s.minHip) / 40),
    reps: s.count,
    goodFrame: formGood,
    features: { hip, min_hip: s.minHip },
  };
}

function evalPullup(kps: Kp[], s: PullupState): EvalResult {
  const elbow = avg(
    ang(kps, KP.L_SHOULDER, KP.L_ELBOW, KP.L_WRIST),
    ang(kps, KP.R_SHOULDER, KP.R_ELBOW, KP.R_WRIST),
  );
  const shY = avg(kps[KP.L_SHOULDER].y, kps[KP.R_SHOULDER].y);
  const wrY = avg(kps[KP.L_WRIST].y, kps[KP.R_WRIST].y);
  const chinUp = shY != null && wrY != null && wrY < shY + 40;
  const poseConf = conf(kps, [
    KP.L_SHOULDER,
    KP.R_SHOULDER,
    KP.L_ELBOW,
    KP.R_ELBOW,
    KP.L_WRIST,
    KP.R_WRIST,
  ]);

  if (elbow == null) return na("Pull-up", poseConf, s.rep.count);

  if (s.rep.stage === "down" && elbow <= 100) s.hadChinUp = chinUp ?? false;
  s.rep.update(elbow);

  const formGood = s.rep.stage === "down" && (s.hadChinUp || (chinUp ?? false));
  if (s.rep.stage === "up") s.hadChinUp = false;

  return {
    exercise: "Pull-up",
    poseConf,
    form: s.rep.stage === "down" ? (formGood ? "Good" : "Bad") : "N/A",
    formConf: clamp01((160 - elbow) / 70),
    reps: s.rep.count,
    goodFrame: formGood,
    features: { elbow, chin_up: chinUp ? 1 : 0 },
  };
}

// โครงสร้างสำหรับเก็บ State ของ Bicep Curl
interface BicepCurlState {
  rep: AngleRepCounter;
}

// ฟังก์ชันประเมินท่า Bicep Curl
function evalBicepCurl(kps: Kp[], s: BicepCurlState): EvalResult {
  // คำนวณมุมข้อศอกซ้าย และ ขวา (ไหล่ - ศอก - ข้อมือ)
  const elbow = avg(
    ang(kps, KP.L_SHOULDER, KP.L_ELBOW, KP.L_WRIST),
    ang(kps, KP.R_SHOULDER, KP.R_ELBOW, KP.R_WRIST),
  );

  // คำนวณค่า Pose Conf ของจุดที่ต้องใช้
  const poseConf = conf(kps, [
    KP.L_SHOULDER,
    KP.R_SHOULDER,
    KP.L_ELBOW,
    KP.R_ELBOW,
    KP.L_WRIST,
    KP.R_WRIST,
  ]);

  // ถ้าตรวจจับแขนไม่ได้ ให้คืนค่า N/A
  if (elbow == null) return na("Bicep Curl", poseConf, s.rep.count);

  // ส่งมุมข้อศอกเข้า AngleRepCounter (เหยียดสุด >= 155° / งอสุด <= 50°)
  s.rep.update(elbow);

  // ประเมินฟอร์ม: ถ้ากำลังงอแขนขึ้นมา ยิ่งมุมแคบลง ยิ่งถือว่าฟอร์มดี
  const formGood = elbow <= 60;

  return {
    exercise: "Bicep Curl",
    poseConf,
    form: poseConf > 0.3 ? (formGood ? "Good" : "Bad") : "N/A",
    formConf: clamp01((160 - elbow) / 110),
    reps: s.rep.count,
    goodFrame: formGood,
    features: { elbow },
  };
}

// 1. Shoulder Press (ดันดัมเบลขึ้นเหนือศีรษะ)
interface AngleState {
  rep: AngleRepCounter;
}
function evalShoulderPress(kps: Kp[], s: AngleState): EvalResult {
  const elbow = avg(
    ang(kps, KP.L_SHOULDER, KP.L_ELBOW, KP.L_WRIST),
    ang(kps, KP.R_SHOULDER, KP.R_ELBOW, KP.R_WRIST),
  );
  const poseConf = conf(kps, [KP.L_SHOULDER, KP.R_SHOULDER, KP.L_ELBOW, KP.R_ELBOW]);
  if (elbow == null) return na("Shoulder Press", poseConf, s.rep.count);
  s.rep.update(elbow); // งอศอกพักที่ <= 80° / ชูสุดที่ >= 155°
  const isGood = elbow >= 140;
  return {
    exercise: "Shoulder Press",
    poseConf,
    form: isGood ? "Good" : "Bad",
    formConf: 0.9,
    reps: s.rep.count,
    goodFrame: isGood,
    features: { elbow },
  };
}

// 2. Lateral Raise (กางแขนข้างลำตัว)
function evalLateralRaise(kps: Kp[], s: AngleState): EvalResult {
  // วัดมุมระหว่างลำตัว-ไหล่-แขน (Hip - Shoulder - Elbow)
  const armAngle = avg(
    ang(kps, KP.L_HIP, KP.L_SHOULDER, KP.L_ELBOW),
    ang(kps, KP.R_HIP, KP.R_SHOULDER, KP.R_ELBOW),
  );
  const poseConf = conf(kps, [KP.L_HIP, KP.R_HIP, KP.L_SHOULDER, KP.R_SHOULDER]);
  if (armAngle == null) return na("Lateral Raise", poseConf, s.rep.count);
  s.rep.update(armAngle); // แขนชิดตัว <= 25° / ยกขนานพื้น >= 80°
  const isGood = armAngle >= 75 && armAngle <= 105; // ไม่ยกสูงเกินไหล่
  return {
    exercise: "Lateral Raise",
    poseConf,
    form: isGood ? "Good" : "Bad",
    formConf: 0.85,
    reps: s.rep.count,
    goodFrame: isGood,
    features: { armAngle },
  };
}

// 3. Tricep Extension (เหนือศีรษะ)
function evalTricepExtension(kps: Kp[], s: AngleState): EvalResult {
  const elbow = avg(
    ang(kps, KP.L_SHOULDER, KP.L_ELBOW, KP.L_WRIST),
    ang(kps, KP.R_SHOULDER, KP.R_ELBOW, KP.R_WRIST),
  );
  const poseConf = conf(kps, [KP.L_ELBOW, KP.R_ELBOW, KP.L_WRIST, KP.R_WRIST]);
  if (elbow == null) return na("Tricep Extension", poseConf, s.rep.count);
  s.rep.update(elbow); // พับแขนหลังหัว <= 65° / ดันขึ้นตึงสุด >= 150°
  const isGood = elbow >= 140;
  return {
    exercise: "Tricep Extension",
    poseConf,
    form: isGood ? "Good" : "Bad",
    formConf: 0.9,
    reps: s.rep.count,
    goodFrame: isGood,
    features: { elbow },
  };
}

// 4. Hammer Curl (ยกดัมเบลแนวตั้ง - ใช้ Logic มุมศอกเดียวกับ Bicep Curl)
function evalHammerCurl(kps: Kp[], s: AngleState): EvalResult {
  const elbow = avg(
    ang(kps, KP.L_SHOULDER, KP.L_ELBOW, KP.L_WRIST),
    ang(kps, KP.R_SHOULDER, KP.R_ELBOW, KP.R_WRIST),
  );
  const poseConf = conf(kps, [KP.L_SHOULDER, KP.R_SHOULDER, KP.L_ELBOW, KP.R_ELBOW]);
  if (elbow == null) return na("Hammer Curl", poseConf, s.rep.count);
  s.rep.update(elbow);
  const isGood = elbow <= 60;
  return {
    exercise: "Hammer Curl",
    poseConf,
    form: isGood ? "Good" : "Bad",
    formConf: 0.9,
    reps: s.rep.count,
    goodFrame: isGood,
    features: { elbow },
  };
}

// 5. Lunge (ก้าวขา ย่อเข่า)
function evalLunge(kps: Kp[], s: AngleState): EvalResult {
  const knee = minValid(
    ang(kps, KP.L_HIP, KP.L_KNEE, KP.L_ANKLE),
    ang(kps, KP.R_HIP, KP.R_KNEE, KP.R_ANKLE),
  );
  const poseConf = conf(kps, [KP.L_HIP, KP.R_HIP, KP.L_KNEE, KP.R_KNEE]);
  if (knee == null) return na("Lunge", poseConf, s.rep.count);
  s.rep.update(knee); // ยืนตรง >= 160° / ย่อเข่าตั้งฉาก <= 95°
  const isGood = knee <= 100;
  return {
    exercise: "Lunge",
    poseConf,
    form: isGood ? "Good" : "Bad",
    formConf: 0.9,
    reps: s.rep.count,
    goodFrame: isGood,
    features: { knee },
  };
}

// 6. High Knees (วิ่งยกเข่าสูง)
function evalHighKnees(kps: Kp[], s: AngleState): EvalResult {
  const hipAngle = minValid(
    ang(kps, KP.L_SHOULDER, KP.L_HIP, KP.L_KNEE),
    ang(kps, KP.R_SHOULDER, KP.R_HIP, KP.R_KNEE),
  );
  const poseConf = conf(kps, [KP.L_HIP, KP.R_HIP, KP.L_KNEE, KP.R_KNEE]);
  if (hipAngle == null) return na("High Knees", poseConf, s.rep.count);
  s.rep.update(hipAngle); // ยืนขาตรง >= 160° / ยกเข่าสูงขนานพื้น <= 90°
  const isGood = hipAngle <= 95;
  return {
    exercise: "High Knees",
    poseConf,
    form: isGood ? "Good" : "Bad",
    formConf: 0.85,
    reps: s.rep.count,
    goodFrame: isGood,
    features: { hipAngle },
  };
}

// 7. Wall Sit (เกร็งขานั่งพิงกำแพง - จับเวลา)
interface HoldState {
  holdSec: number;
  active: boolean;
  startMs: number;
}
function evalWallSit(kps: Kp[], s: HoldState, nowMs: number): EvalResult {
  const knee = avg(
    ang(kps, KP.L_HIP, KP.L_KNEE, KP.L_ANKLE),
    ang(kps, KP.R_HIP, KP.R_KNEE, KP.R_ANKLE),
  );
  const poseConf = conf(kps, [KP.L_HIP, KP.R_HIP, KP.L_KNEE, KP.R_KNEE]);
  if (knee == null) return na("Wall Sit", poseConf, s.holdSec);

  const isSitting = knee >= 75 && knee <= 105; // เข่าทำมุมใกล้เคียง 90 องศา
  if (isSitting) {
    if (!s.active) {
      s.active = true;
      s.startMs = nowMs;
    }
    s.holdSec = Math.floor((nowMs - s.startMs) / 1000);
  } else {
    s.active = false;
  }
  return {
    exercise: "Wall Sit",
    poseConf,
    form: isSitting ? "Good" : "Bad",
    formConf: 0.9,
    reps: s.holdSec,
    goodFrame: isSitting,
    features: { knee },
  };
}

// 8. Glute Bridge (นอนยกสะโพก)
function evalGluteBridge(kps: Kp[], s: AngleState): EvalResult {
  const hip = avg(
    ang(kps, KP.L_SHOULDER, KP.L_HIP, KP.L_KNEE),
    ang(kps, KP.R_SHOULDER, KP.R_HIP, KP.R_KNEE),
  );
  const poseConf = conf(kps, [
    KP.L_SHOULDER,
    KP.R_SHOULDER,
    KP.L_HIP,
    KP.R_HIP,
    KP.L_KNEE,
    KP.R_KNEE,
  ]);
  if (hip == null) return na("Glute Bridge", poseConf, s.rep.count);
  s.rep.update(hip); // นอนราบสะโพกงอ <= 130° / ดันสะโพกเหยียดตรง >= 165°
  const isGood = hip >= 160;
  return {
    exercise: "Glute Bridge",
    poseConf,
    form: isGood ? "Good" : "Bad",
    formConf: 0.85,
    reps: s.rep.count,
    goodFrame: isGood,
    features: { hip },
  };
}

// 9. Leg Raise (นอนยกขา)
function evalLegRaise(kps: Kp[], s: AngleState): EvalResult {
  const hip = avg(
    ang(kps, KP.L_SHOULDER, KP.L_HIP, KP.L_ANKLE),
    ang(kps, KP.R_SHOULDER, KP.R_HIP, KP.R_ANKLE),
  );
  const poseConf = conf(kps, [
    KP.L_SHOULDER,
    KP.R_SHOULDER,
    KP.L_HIP,
    KP.R_HIP,
    KP.L_ANKLE,
    KP.R_ANKLE,
  ]);
  if (hip == null) return na("Leg Raise", poseConf, s.rep.count);
  s.rep.update(hip); // ขาชี้ราบพื้น >= 160° / ยกขาตั้งฉาก <= 100°
  const isGood = hip <= 105;
  return {
    exercise: "Leg Raise",
    poseConf,
    form: isGood ? "Good" : "Bad",
    formConf: 0.85,
    reps: s.rep.count,
    goodFrame: isGood,
    features: { hip },
  };
}

// 10. Mountain Climbers (แพลงก์แทงเข่า)
function evalMountainClimbers(kps: Kp[], s: AngleState): EvalResult {
  const hipAngle = minValid(
    ang(kps, KP.L_SHOULDER, KP.L_HIP, KP.L_KNEE),
    ang(kps, KP.R_SHOULDER, KP.R_HIP, KP.R_KNEE),
  );
  const poseConf = conf(kps, [KP.L_HIP, KP.R_HIP, KP.L_KNEE, KP.R_KNEE]);
  if (hipAngle == null) return na("Mountain Climbers", poseConf, s.rep.count);
  s.rep.update(hipAngle); // ขาเหยียดหลัง >= 155° / ดึงเข่าชิดอก <= 95°
  const isGood = hipAngle <= 100;
  return {
    exercise: "Mountain Climbers",
    poseConf,
    form: isGood ? "Good" : "Bad",
    formConf: 0.8,
    reps: s.rep.count,
    goodFrame: isGood,
    features: { hipAngle },
  };
}

function na(name: string, poseConf: number, reps: number): EvalResult {
  return {
    exercise: name,
    poseConf,
    form: "N/A",
    formConf: 0,
    reps,
    goodFrame: false,
    features: {},
  };
}

interface PushupState {
  count: number;
  stage: "up" | "down";
  minElbow: number;
  lastGood: boolean;
}
interface PlankState {
  holdSec: number;
  active: boolean;
  startMs: number;
}
interface JackState {
  count: number;
  open: boolean;
}
interface SitupState {
  count: number;
  stage: "lying" | "crunched";
  minHip: number;
}
interface PullupState {
  rep: AngleRepCounter;
  hadChinUp: boolean;
}

export class ExerciseEngine {
  private pushup: PushupState = { count: 0, stage: "up", minElbow: 180, lastGood: true };
  private plank: PlankState = { holdSec: 0, active: false, startMs: 0 };
  private jacks: JackState = { count: 0, open: false };
  private situp: SitupState = { count: 0, stage: "lying", minHip: 180 };
  private pullup: PullupState = { rep: new AngleRepCounter(155, 100), hadChinUp: false };
  private bicep_curl: BicepCurlState = { rep: new AngleRepCounter(155, 50) };
  ฃ;
  private lunge: AngleState = { rep: new AngleRepCounter(160, 95) };
  private shoulder_press: AngleState = { rep: new AngleRepCounter(155, 80) };
  private lateral_raise: AngleState = { rep: new AngleRepCounter(80, 25) };
  private tricep_extension: AngleState = { rep: new AngleRepCounter(150, 65) };
  private high_knees: AngleState = { rep: new AngleRepCounter(160, 90) };
  private wall_sit: HoldState = { holdSec: 0, active: false, startMs: 0 };
  private glute_bridge: AngleState = { rep: new AngleRepCounter(165, 130) };
  private leg_raise: AngleState = { rep: new AngleRepCounter(160, 100) };
  private mountain_climbers: AngleState = { rep: new AngleRepCounter(155, 95) };
  private hammer_curl: AngleState = { rep: new AngleRepCounter(155, 50) };

  reset() {
    this.pushup = { count: 0, stage: "up", minElbow: 180, lastGood: true };
    this.plank = { holdSec: 0, active: false, startMs: 0 };
    this.jacks = { count: 0, open: false };
    this.situp = { count: 0, stage: "lying", minHip: 180 };
    this.pullup = { rep: new AngleRepCounter(155, 100), hadChinUp: false };
    this.bicep_curl = { rep: new AngleRepCounter(155, 50) };
    this.lunge = { rep: new AngleRepCounter(160, 95) };
    this.shoulder_press = { rep: new AngleRepCounter(155, 80) };
    this.lateral_raise = { rep: new AngleRepCounter(80, 25) };
    this.tricep_extension = { rep: new AngleRepCounter(150, 65) };
    this.high_knees = { rep: new AngleRepCounter(160, 90) };
    this.wall_sit = { holdSec: 0, active: false, startMs: 0 };
    this.glute_bridge = { rep: new AngleRepCounter(165, 130) };
    this.leg_raise = { rep: new AngleRepCounter(160, 100) };
    this.mountain_climbers = { rep: new AngleRepCounter(155, 95) };
    this.hammer_curl = { rep: new AngleRepCounter(155, 50) };
  }

  evaluate(mode: ExerciseMode, kps: Kp[], nowMs = performance.now()): EvalResult {
    switch (mode) {
      case "pushup":
        return evalPushup(kps, this.pushup);
      case "plank":
        return evalPlank(kps, this.plank, nowMs);
      case "jumping_jacks":
        return evalJumpingJacks(kps, this.jacks);
      case "situp":
        return evalSitup(kps, this.situp);
      case "pullup":
        return evalPullup(kps, this.pullup);
      case "bicep_curl":
        return evalBicepCurl(kps, this.bicep_curl);
      case "lunge":
        return evalLunge(kps, this.lunge);
      case "shoulder_press":
        return evalShoulderPress(kps, this.shoulder_press);
      case "lateral_raise":
        return evalLateralRaise(kps, this.lateral_raise);
      case "tricep_extension":
        return evalTricepExtension(kps, this.tricep_extension);
      case "high_knees":
        return evalHighKnees(kps, this.high_knees);
      case "wall_sit":
        return evalWallSit(kps, this.wall_sit, nowMs);
      case "glute_bridge":
        return evalGluteBridge(kps, this.glute_bridge);
      case "leg_raise":
        return evalLegRaise(kps, this.leg_raise);
      case "mountain_climbers":
        return evalMountainClimbers(kps, this.mountain_climbers);
      case "hammer_curl":
        return evalHammerCurl(kps, this.hammer_curl);
      default:
        return na("Squat", 0, 0);
    }
  }

  getReps(mode: ExerciseMode): number {
    switch (mode) {
      case "pushup":
        return this.pushup.count;
      case "plank":
        return this.plank.holdSec;
      case "jumping_jacks":
        return this.jacks.count;
      case "situp":
        return this.situp.count;
      case "pullup":
        return this.pullup.rep.count;
      case "bicep_curl":
        return this.bicep_curl.rep.count;
      case "lunge":
        return this.lunge.rep.count;
      case "shoulder_press":
        return this.shoulder_press.rep.count;
      case "lateral_raise":
        return this.lateral_raise.rep.count;
      case "tricep_extension":
        return this.tricep_extension.rep.count;
      case "high_knees":
        return this.high_knees.rep.count;
      case "wall_sit":
        return this.wall_sit.holdSec;
      case "glute_bridge":
        return this.glute_bridge.rep.count;
      case "leg_raise":
        return this.leg_raise.rep.count;
      case "mountain_climbers":
        return this.mountain_climbers.rep.count;
      case "hammer_curl":
        return this.hammer_curl.rep.count;
      default:
        return 0;
    }
  }
}
