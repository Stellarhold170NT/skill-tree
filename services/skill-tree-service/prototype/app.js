/**
 * SkillTree Prototype Application Engine
 * Implements Glicko-2, Ebbinghaus decay, CASE graph DAG traversal,
 * Frontier calculation, Interactive vis-network Mastery Graph & Class Heatmap.
 */

// --- 1. Glicko-2 & Ebbinghaus Cognitive Models ---
const GLICKO_SCALE = 173.7178;
const REFERENCE_RATING = 1500.0;
const REFERENCE_RD = 350.0;
const TAU = 0.5;

function _g(phi) {
  return 1.0 / Math.sqrt(1.0 + (3.0 * phi * phi) / (Math.PI * Math.PI));
}

function _expected(mu, opponentMu, g) {
  const z = -g * (mu - opponentMu);
  if (z > 50.0) return 0.0;
  if (z < -50.0) return 1.0;
  return 1.0 / (1.0 + Math.exp(z));
}

function sigmoidMastery(rating) {
  return 1.0 / (1.0 + Math.exp(-(rating - 1500.0) / GLICKO_SCALE));
}

function ebbinghausRetention(reviews, elapsedDays) {
  const stability = 3.0 + 7.0 * reviews;
  return Math.exp(-Math.max(0, elapsedDays) / stability);
}

function computeState(rating, rd, reviews, elapsedDays) {
  const m = sigmoidMastery(rating);
  const ret = ebbinghausRetention(reviews, elapsedDays);
  if (m < 0.40) return "red";
  if (ret < 0.70) return "rusty";
  if (m < 0.85) return "amber";
  return "green";
}

// Canonical Glicko-2 step against standard reference question
function rateAttempt(rating, rd, vol, isCorrect) {
  const mu = (rating - 1500.0) / GLICKO_SCALE;
  const phi = rd / GLICKO_SCALE;
  const oppMu = (REFERENCE_RATING - 1500.0) / GLICKO_SCALE;
  const oppPhi = REFERENCE_RD / GLICKO_SCALE;
  const g = _g(oppPhi);
  const exp = _expected(mu, oppMu, g);
  const score = isCorrect ? 1.0 : 0.0;

  const v = 1.0 / (g * g * exp * (1.0 - exp));
  const delta = v * g * (score - exp);
  const deltaSq = delta * delta;
  const a = Math.log(vol * vol);

  let lo = a - 30.0;
  let hi = a + 30.0;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2.0;
    const ex = Math.exp(mid);
    const num = ex * (deltaSq - phi * phi - v - ex);
    const den = 2.0 * Math.pow(phi * phi + v + ex, 2);
    const fMid = num / den - (mid - a) / (TAU * TAU);
    if (fMid > 0.0) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-10) break;
  }
  const newVol = Math.exp(((lo + hi) / 2.0) / 2.0);
  const phiStar = Math.sqrt(phi * phi + newVol * newVol);
  const newPhi = 1.0 / Math.sqrt(1.0 / (phiStar * phiStar) + 1.0 / v);
  const newMu = mu + newPhi * newPhi * g * (score - exp);

  return {
    rating: GLICKO_SCALE * newMu + 1500.0,
    rd: GLICKO_SCALE * newPhi,
    volatility: newVol
  };
}

// --- 2. Mock Knowledge Graph (CASE Standard: 10 Math Concepts) ---
const CONCEPTS = [
  {
    uri: "case:math:int_add",
    code: "TOAN-01",
    title: "Cộng số nguyên",
    desc: "Cộng hai số nguyên cùng dấu và khác dấu, quy tắc dấu ngoặc",
    prereqs: [],
    unlocks: ["case:math:int_sub", "case:math:int_mult"],
    quiz: {
      question: "Tính: (-15) + (+28) bằng bao nhiêu?",
      options: ["A. -13", "B. 13", "C. 43", "D. -43"],
      correct: 1
    }
  },
  {
    uri: "case:math:int_sub",
    code: "TOAN-02",
    title: "Trừ số nguyên",
    desc: "Quy tắc trừ số nguyên: cộng với số đối",
    prereqs: ["case:math:int_add"],
    unlocks: ["case:math:order_ops"],
    quiz: {
      question: "Tính: 12 - (-18) bằng bao nhiêu?",
      options: ["A. -6", "B. 6", "C. 30", "D. -30"],
      correct: 2
    }
  },
  {
    uri: "case:math:int_mult",
    code: "TOAN-03",
    title: "Nhân số nguyên",
    desc: "Quy tắc nhân dấu cùng dấu ra dương, khác dấu ra âm",
    prereqs: ["case:math:int_add"],
    unlocks: ["case:math:frac_mult", "case:math:order_ops"],
    quiz: {
      question: "Tính: (-7) × (-9) bằng bao nhiêu?",
      options: ["A. -63", "B. 63", "C. -16", "D. 16"],
      correct: 1
    }
  },
  {
    uri: "case:math:order_ops",
    code: "TOAN-04",
    title: "Thứ tự phép tính",
    desc: "Quy tắc ngoặc tròn, vuông, nhọn; nhân chia trước, cộng trừ sau",
    prereqs: ["case:math:int_sub", "case:math:int_mult"],
    unlocks: ["case:math:linear_eq"],
    quiz: {
      question: "Tính: 5 + 3 × (-2) bằng bao nhiêu?",
      options: ["A. -1", "B. -16", "C. 1", "D. 11"],
      correct: 0
    }
  },
  {
    uri: "case:math:frac_add",
    code: "TOAN-05",
    title: "Cộng phân số",
    desc: "Quy đồng mẫu số, rút gọn phân số tối giản",
    prereqs: ["case:math:int_add"],
    unlocks: ["case:math:frac_mult"],
    quiz: {
      question: "Tính: 1/3 + 1/6 bằng bao nhiêu?",
      options: ["A. 2/9", "B. 1/2", "C. 2/6", "D. 3/6"],
      correct: 1
    }
  },
  {
    uri: "case:math:frac_mult",
    code: "TOAN-06",
    title: "Nhân phân số",
    desc: "Tử nhân tử, mẫu nhân mẫu; chia là nhân nghịch đảo",
    prereqs: ["case:math:frac_add", "case:math:int_mult"],
    unlocks: ["case:math:linear_eq"],
    quiz: {
      question: "Tính: (2/5) × (15/4) bằng bao nhiêu?",
      options: ["A. 3/2", "B. 30/20", "C. 8/75", "D. 6/5"],
      correct: 0
    }
  },
  {
    uri: "case:math:linear_eq",
    code: "TOAN-07",
    title: "Phương trình bậc 1",
    desc: "Phương trình dạng ax + b = 0, chuyển vế đổi dấu",
    prereqs: ["case:math:order_ops", "case:math:frac_mult"],
    unlocks: ["case:math:quad_eq", "case:math:linear_func"],
    quiz: {
      question: "Giải phương trình: 3x - 9 = 0. Giá trị x là:",
      options: ["A. x = 2", "B. x = 3", "C. x = -3", "D. x = 6"],
      correct: 1
    }
  },
  {
    uri: "case:math:linear_func",
    code: "TOAN-08",
    title: "Hàm số bậc nhất",
    desc: "Đồ thị đường thẳng, hệ số góc, điểm cắt trục tung",
    prereqs: ["case:math:linear_eq"],
    unlocks: ["case:math:quad_func"],
    quiz: {
      question: "Hàm số y = -2x + 5 có hệ số góc bằng:",
      options: ["A. 5", "B. 2", "C. -2", "D. 2.5"],
      correct: 2
    }
  },
  {
    uri: "case:math:quad_eq",
    code: "TOAN-09",
    title: "Phương trình bậc 2",
    desc: "Công thức nghiệm Delta, nhẩm nghiệm Viete",
    prereqs: ["case:math:linear_eq"],
    unlocks: ["case:math:quad_func"],
    quiz: {
      question: "Biệt thức Delta của phương trình x² - 4x + 3 = 0 là:",
      options: ["A. 4", "B. -4", "C. 16", "D. 8"],
      correct: 0
    }
  },
  {
    uri: "case:math:quad_func",
    code: "TOAN-10",
    title: "Hàm số Parabol",
    desc: "Đỉnh parabol, trục đối xứng, bề lõm quay lên/quay xuống",
    prereqs: ["case:math:linear_func", "case:math:quad_eq"],
    unlocks: [],
    quiz: {
      question: "Đồ thị hàm số y = -3x² có bề lõm:",
      options: ["A. Quay lên trên", "B. Quay xuống dưới", "C. Sang bên phải", "D. Sang bên trái"],
      correct: 1
    }
  }
];

// --- 3. Initial Mock Students State ---
const STUDENTS = [
  {
    id: "stu-001",
    name: "Nguyễn Hoàng Minh",
    elapsedDays: 0,
    skills: {
      "case:math:int_add": { rating: 1720, rd: 85, vol: 0.06, reviews: 4 },
      "case:math:int_sub": { rating: 1680, rd: 90, vol: 0.06, reviews: 3 },
      "case:math:int_mult": { rating: 1650, rd: 95, vol: 0.06, reviews: 3 },
      "case:math:order_ops": { rating: 1580, rd: 110, vol: 0.06, reviews: 2 },
      "case:math:frac_add": { rating: 1610, rd: 105, vol: 0.06, reviews: 2 },
      "case:math:frac_mult": { rating: 1530, rd: 120, vol: 0.06, reviews: 1 },
      "case:math:linear_eq": { rating: 1470, rd: 135, vol: 0.06, reviews: 1 },
      "case:math:linear_func": { rating: 1380, rd: 200, vol: 0.06, reviews: 0 },
      "case:math:quad_eq": { rating: 1350, rd: 220, vol: 0.06, reviews: 0 },
      "case:math:quad_func": { rating: 1300, rd: 250, vol: 0.06, reviews: 0 }
    }
  },
  {
    id: "stu-002",
    name: "Trần Mai An",
    elapsedDays: 0,
    skills: {
      "case:math:int_add": { rating: 1800, rd: 70, vol: 0.06, reviews: 5 },
      "case:math:int_sub": { rating: 1750, rd: 75, vol: 0.06, reviews: 4 },
      "case:math:int_mult": { rating: 1760, rd: 75, vol: 0.06, reviews: 4 },
      "case:math:order_ops": { rating: 1710, rd: 85, vol: 0.06, reviews: 3 },
      "case:math:frac_add": { rating: 1740, rd: 80, vol: 0.06, reviews: 4 },
      "case:math:frac_mult": { rating: 1690, rd: 90, vol: 0.06, reviews: 3 },
      "case:math:linear_eq": { rating: 1660, rd: 95, vol: 0.06, reviews: 3 },
      "case:math:linear_func": { rating: 1620, rd: 105, vol: 0.06, reviews: 2 },
      "case:math:quad_eq": { rating: 1590, rd: 115, vol: 0.06, reviews: 2 },
      "case:math:quad_func": { rating: 1510, rd: 140, vol: 0.06, reviews: 1 }
    }
  },
  {
    id: "stu-003",
    name: "Lê Gia Bảo",
    elapsedDays: 0,
    skills: {
      "case:math:int_add": { rating: 1620, rd: 100, vol: 0.06, reviews: 2 },
      "case:math:int_sub": { rating: 1540, rd: 115, vol: 0.06, reviews: 1 },
      "case:math:int_mult": { rating: 1410, rd: 150, vol: 0.06, reviews: 1 },
      "case:math:order_ops": { rating: 1360, rd: 180, vol: 0.06, reviews: 0 },
      "case:math:frac_add": { rating: 1390, rd: 170, vol: 0.06, reviews: 0 },
      "case:math:frac_mult": { rating: 1320, rd: 220, vol: 0.06, reviews: 0 },
      "case:math:linear_eq": { rating: 1280, rd: 260, vol: 0.06, reviews: 0 },
      "case:math:linear_func": { rating: 1250, rd: 300, vol: 0.06, reviews: 0 },
      "case:math:quad_eq": { rating: 1250, rd: 300, vol: 0.06, reviews: 0 },
      "case:math:quad_func": { rating: 1200, rd: 320, vol: 0.06, reviews: 0 }
    }
  },
  {
    id: "stu-004",
    name: "Phạm Quỳnh Châu",
    elapsedDays: 0,
    skills: {
      "case:math:int_add": { rating: 1700, rd: 85, vol: 0.06, reviews: 4 },
      "case:math:int_sub": { rating: 1670, rd: 90, vol: 0.06, reviews: 3 },
      "case:math:int_mult": { rating: 1640, rd: 95, vol: 0.06, reviews: 3 },
      "case:math:order_ops": { rating: 1610, rd: 100, vol: 0.06, reviews: 2 },
      "case:math:frac_add": { rating: 1420, rd: 140, vol: 0.06, reviews: 1 },
      "case:math:frac_mult": { rating: 1380, rd: 170, vol: 0.06, reviews: 0 },
      "case:math:linear_eq": { rating: 1340, rd: 200, vol: 0.06, reviews: 0 },
      "case:math:linear_func": { rating: 1300, rd: 240, vol: 0.06, reviews: 0 },
      "case:math:quad_eq": { rating: 1280, rd: 260, vol: 0.06, reviews: 0 },
      "case:math:quad_func": { rating: 1250, rd: 280, vol: 0.06, reviews: 0 }
    }
  },
  {
    id: "stu-005",
    name: "Đỗ Minh Đức",
    elapsedDays: 0,
    skills: {
      "case:math:int_add": { rating: 1550, rd: 120, vol: 0.06, reviews: 1 },
      "case:math:int_sub": { rating: 1460, rd: 145, vol: 0.06, reviews: 1 },
      "case:math:int_mult": { rating: 1380, rd: 170, vol: 0.06, reviews: 0 },
      "case:math:order_ops": { rating: 1320, rd: 210, vol: 0.06, reviews: 0 },
      "case:math:frac_add": { rating: 1350, rd: 190, vol: 0.06, reviews: 0 },
      "case:math:frac_mult": { rating: 1290, rd: 240, vol: 0.06, reviews: 0 },
      "case:math:linear_eq": { rating: 1250, rd: 270, vol: 0.06, reviews: 0 },
      "case:math:linear_func": { rating: 1220, rd: 310, vol: 0.06, reviews: 0 },
      "case:math:quad_eq": { rating: 1200, rd: 320, vol: 0.06, reviews: 0 },
      "case:math:quad_func": { rating: 1180, rd: 340, vol: 0.06, reviews: 0 }
    }
  },
  {
    id: "stu-006",
    name: "Vũ Khánh Hoa",
    elapsedDays: 0,
    skills: {
      "case:math:int_add": { rating: 1750, rd: 75, vol: 0.06, reviews: 4 },
      "case:math:int_sub": { rating: 1710, rd: 80, vol: 0.06, reviews: 3 },
      "case:math:int_mult": { rating: 1680, rd: 90, vol: 0.06, reviews: 3 },
      "case:math:order_ops": { rating: 1640, rd: 95, vol: 0.06, reviews: 2 },
      "case:math:frac_add": { rating: 1670, rd: 90, vol: 0.06, reviews: 3 },
      "case:math:frac_mult": { rating: 1630, rd: 100, vol: 0.06, reviews: 2 },
      "case:math:linear_eq": { rating: 1590, rd: 110, vol: 0.06, reviews: 2 },
      "case:math:linear_func": { rating: 1450, rd: 150, vol: 0.06, reviews: 1 },
      "case:math:quad_eq": { rating: 1410, rd: 170, vol: 0.06, reviews: 1 },
      "case:math:quad_func": { rating: 1330, rd: 220, vol: 0.06, reviews: 0 }
    }
  }
];

// --- 4. Vis-Network Visual Palettes (Strictly DESIGN.md) ---
const VIS_PALETTES = {
  green: {
    background: "#E6F7EC",
    border: "#27A95F",
    highlight: { background: "#C7E9D5", border: "#145831" },
    font: { color: "#167F4D" }
  },
  amber: {
    background: "#FFF4D6",
    border: "#F5C453",
    highlight: { background: "#FFE8A8", border: "#8A4B00" },
    font: { color: "#8A4B00" }
  },
  red: {
    background: "#FDECEC",
    border: "#D9534F",
    highlight: { background: "#FCD1D1", border: "#B3261E" },
    font: { color: "#B3261E" }
  },
  rusty: {
    background: "#FFF0EB",
    border: "#C2410C",
    highlight: { background: "#FED7AA", border: "#9A3412" },
    font: { color: "#C2410C" }
  },
  locked: {
    background: "#F2F2F2",
    border: "#D4D8D6",
    highlight: { background: "#E5E7EB", border: "#6B7280" },
    font: { color: "#6B7280" }
  }
};

// Application State
let currentStudentId = "stu-001";
let activeQuizConceptUri = "case:math:linear_eq";
let selectedQuizOption = null;

// Vis Network Instances
let studentNetwork = null;
let teacherNetwork = null;

// Check unlocked status
function isConceptUnlocked(student, conceptUri) {
  const concept = CONCEPTS.find(c => c.uri === conceptUri);
  if (!concept || concept.prereqs.length === 0) return true;
  return concept.prereqs.every(prereqUri => {
    const s = student.skills[prereqUri];
    return s && computeState(s.rating, s.rd, s.reviews, student.elapsedDays) === "green";
  });
}

function getFrontierConcept(student) {
  for (const c of CONCEPTS) {
    const s = student.skills[c.uri];
    const state = computeState(s.rating, s.rd, s.reviews, student.elapsedDays);
    const unlocked = isConceptUnlocked(student, c.uri);
    if (unlocked && state !== "green") {
      return c;
    }
  }
  return CONCEPTS[CONCEPTS.length - 1];
}

// -------------------------------------------------------------
// RENDER VIS-NETWORK MASTERY GRAPH (STUDENT VIEW)
// -------------------------------------------------------------
function renderStudentMasteryGraph() {
  const container = document.getElementById("student-graph");
  if (!container || !window.vis) return;

  const student = STUDENTS.find(s => s.id === currentStudentId);
  const frontier = getFrontierConcept(student);

  // Build nodes
  const nodes = CONCEPTS.map(c => {
    const s = student.skills[c.uri];
    const unlocked = isConceptUnlocked(student, c.uri);
    let state = computeState(s.rating, s.rd, s.reviews, student.elapsedDays);
    if (!unlocked) state = "locked";

    const isFrontier = unlocked && c.uri === frontier.uri;
    const palette = VIS_PALETTES[state];

    // Circle radius proportional to Glicko Rating (1200 -> 18, 1800 -> 36)
    const normalizedSize = Math.max(16, Math.min(38, Math.round((s.rating - 1100) / 25)));

    return {
      id: c.uri,
      label: `${c.code}\n${c.title}${isFrontier ? '\n★ FRONTIER' : ''}`,
      title: `${c.title} — Rating: ${Math.round(s.rating)} pts · RD: ${Math.round(s.rd)}`,
      shape: "dot",
      size: normalizedSize,
      color: {
        background: palette.background,
        border: isFrontier ? "#167F4D" : palette.border,
        highlight: palette.highlight
      },
      borderWidth: isFrontier ? 3 : 2,
      font: {
        color: palette.font.color,
        face: "system-ui, sans-serif",
        size: 11,
        bold: isFrontier
      }
    };
  });

  // Build prerequisite edges
  const edges = [];
  CONCEPTS.forEach(c => {
    c.unlocks.forEach(targetUri => {
      edges.push({
        from: c.uri,
        to: targetUri,
        arrows: "to",
        color: { color: "#C7E9D5", highlight: "#27A95F" },
        width: 1.5,
        smooth: { type: "cubicBezier", roundness: 0.2 }
      });
    });
  });

  const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
  const options = {
    autoResize: true,
    layout: {
      hierarchical: {
        direction: "LR", // Left to Right flow (ClassroomMemory style)
        sortMethod: "directed",
        levelSeparation: 120,
        nodeSpacing: 80
      }
    },
    physics: {
      hierarchicalRepulsion: {
        nodeDistance: 90
      }
    },
    interaction: {
      hover: true,
      zoomView: true,
      dragView: true
    }
  };

  if (!studentNetwork) {
    studentNetwork = new vis.Network(container, data, options);
    studentNetwork.on("click", function(params) {
      if (params.nodes.length > 0) {
        const clickedNodeUri = params.nodes[0];
        loadConceptToQuiz(clickedNodeUri);
      }
    });
  } else {
    studentNetwork.setData(data);
  }
}

// -------------------------------------------------------------
// RENDER VIS-NETWORK CLASS HEATMAP GRAPH (TEACHER VIEW)
// -------------------------------------------------------------
function renderTeacherHeatmapGraph() {
  const container = document.getElementById("teacher-graph");
  if (!container || !window.vis) return;

  const nodes = CONCEPTS.map(c => {
    let totalRating = 0;
    let greenCount = 0;
    let redCount = 0;

    STUDENTS.forEach(student => {
      const s = student.skills[c.uri];
      totalRating += s.rating;
      const state = computeState(s.rating, s.rd, s.reviews, student.elapsedDays);
      if (state === "green") greenCount++;
      if (state === "red") redCount++;
    });

    const avgRating = Math.round(totalRating / STUDENTS.length);
    let classState = "amber";
    if (greenCount >= 4) classState = "green";
    else if (redCount >= 3) classState = "red";

    const palette = VIS_PALETTES[classState];

    return {
      id: c.uri,
      label: `${c.code}\n${c.title}\n(${avgRating} pts)`,
      title: `Trung bình lớp: ${avgRating} pts (${greenCount}/6 đạt Mastered)`,
      shape: "dot",
      size: 26,
      color: {
        background: palette.background,
        border: palette.border,
        highlight: palette.highlight
      },
      borderWidth: 2,
      font: {
        color: palette.font.color,
        face: "system-ui, sans-serif",
        size: 11
      }
    };
  });

  const edges = [];
  CONCEPTS.forEach(c => {
    c.unlocks.forEach(targetUri => {
      edges.push({
        from: c.uri,
        to: targetUri,
        arrows: "to",
        color: { color: "#D4D8D6", highlight: "#167F4D" },
        width: 1.5,
        smooth: { type: "cubicBezier", roundness: 0.2 }
      });
    });
  });

  const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
  const options = {
    autoResize: true,
    layout: {
      hierarchical: {
        direction: "LR",
        sortMethod: "directed",
        levelSeparation: 120,
        nodeSpacing: 80
      }
    },
    physics: false,
    interaction: {
      hover: true,
      zoomView: true,
      dragView: true
    }
  };

  if (!teacherNetwork) {
    teacherNetwork = new vis.Network(container, data, options);
  } else {
    teacherNetwork.setData(data);
  }
}

// -------------------------------------------------------------
// STUDENT VIEW LOGIC
// -------------------------------------------------------------
function renderStudentView() {
  const student = STUDENTS.find(s => s.id === currentStudentId);
  if (!student) return;

  // Header display
  let greenCount = 0, amberCount = 0, redCount = 0, rustyCount = 0;
  let totalRating = 0;

  CONCEPTS.forEach(c => {
    const s = student.skills[c.uri];
    totalRating += s.rating;
    const state = computeState(s.rating, s.rd, s.reviews, student.elapsedDays);
    if (state === "green") greenCount++;
    else if (state === "amber") amberCount++;
    else if (state === "red") redCount++;
    else if (state === "rusty") rustyCount++;
  });

  const avgRating = Math.round(totalRating / CONCEPTS.length);
  document.getElementById("student-glicko-display").innerText = `Rating trung bình: ${avgRating} · Đã làm chủ: ${greenCount}/10`;
  document.getElementById("cnt-green").innerText = greenCount;
  document.getElementById("cnt-amber").innerText = amberCount;
  document.getElementById("cnt-red").innerText = redCount;
  document.getElementById("cnt-rusty").innerText = rustyCount;
  document.getElementById("mastery-progress-bar").style.width = `${(greenCount / 10) * 100}%`;

  const frontier = getFrontierConcept(student);
  if (!activeQuizConceptUri) {
    loadConceptToQuiz(frontier.uri);
  } else {
    loadConceptToQuiz(activeQuizConceptUri);
  }

  // Render the Canvas Mastery Graph
  renderStudentMasteryGraph();
}

window.loadConceptToQuiz = function(uri) {
  activeQuizConceptUri = uri;
  selectedQuizOption = null;
  const concept = CONCEPTS.find(c => c.uri === uri);
  if (!concept) return;

  const student = STUDENTS.find(s => s.id === currentStudentId);
  const frontier = getFrontierConcept(student);
  const isFrontier = uri === frontier.uri;

  document.getElementById("quiz-frontier-tag").innerText = isFrontier ? "GỢI Ý BIÊN GIỚI TRI THỨC (FRONTIER)" : "KỸ NĂNG TỰ CHỌN";
  document.getElementById("quiz-question-text").innerText = `[${concept.code}] ${concept.quiz.question}`;

  const optsContainer = document.getElementById("quiz-options-container");
  optsContainer.innerHTML = "";

  concept.quiz.options.forEach((optText, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quiz-opt-btn";
    btn.innerText = optText;
    btn.onclick = () => {
      document.querySelectorAll(".quiz-opt-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedQuizOption = idx;
    };
    optsContainer.appendChild(btn);
  });

  const fb = document.getElementById("quiz-feedback");
  fb.className = "quiz-feedback";
  fb.style.display = "none";
};

// Handle Quiz Submission
document.getElementById("quiz-submit-btn").onclick = function() {
  if (selectedQuizOption === null) {
    alert("Vui lòng chọn một đáp án trước khi nộp bài!");
    return;
  }

  const student = STUDENTS.find(s => s.id === currentStudentId);
  const concept = CONCEPTS.find(c => c.uri === activeQuizConceptUri);
  const skill = student.skills[activeQuizConceptUri];
  const isCorrect = selectedQuizOption === concept.quiz.correct;

  // Run canonical Glicko-2
  const updated = rateAttempt(skill.rating, skill.rd, skill.vol, isCorrect);
  const oldRating = Math.round(skill.rating);
  skill.rating = updated.rating;
  skill.rd = updated.rd;
  skill.vol = updated.volatility;
  skill.reviews += 1;
  student.elapsedDays = 0;

  const newRating = Math.round(skill.rating);
  const delta = newRating - oldRating;

  const fb = document.getElementById("quiz-feedback");
  if (isCorrect) {
    fb.className = "quiz-feedback correct";
    fb.innerText = `Chính xác! Glicko-2 Rating: ${oldRating} ➔ ${newRating} (${delta > 0 ? '+' + delta : delta} pts). Đồ thị đã cập nhật!`;
  } else {
    fb.className = "quiz-feedback wrong";
    fb.innerText = `Chưa đúng! Glicko-2 Rating: ${oldRating} ➔ ${newRating} (${delta} pts). Hệ thống đã ghi nhận lỗ hổng vào đồ thị.`;
  }

  renderStudentView();
  renderTeacherView();
};

// -------------------------------------------------------------
// TEACHER DASHBOARD LOGIC
// -------------------------------------------------------------
function renderTeacherView() {
  // 1. Table Header
  const headerRow = document.getElementById("heatmap-header-row");
  headerRow.innerHTML = "<th>Học sinh</th>";
  CONCEPTS.forEach(c => {
    const th = document.createElement("th");
    th.className = "concept-col";
    th.innerText = c.code;
    th.title = c.title;
    headerRow.appendChild(th);
  });

  // 2. Table Body
  const tbody = document.getElementById("heatmap-body");
  tbody.innerHTML = "";

  STUDENTS.forEach(student => {
    const tr = document.createElement("tr");
    tr.onclick = () => openStudentDrawer(student.id);

    let cellsHtml = `<td><button class="student-link-btn">${student.name}</button></td>`;

    CONCEPTS.forEach(c => {
      const s = student.skills[c.uri];
      const unlocked = isConceptUnlocked(student, c.uri);
      let state = computeState(s.rating, s.rd, s.reviews, student.elapsedDays);
      if (!unlocked) state = "locked";

      cellsHtml += `
        <td class="hm-cell">
          <span class="hm-cell-badge ${state}">
            ${state === 'locked' ? '—' : Math.round(s.rating)}
          </span>
        </td>
      `;
    });

    tr.innerHTML = cellsHtml;
    tbody.appendChild(tr);
  });

  // 3. Contrastive Teaching Plan
  const planList = document.getElementById("teaching-plan-list");
  planList.innerHTML = "";

  const conceptGaps = CONCEPTS.map(c => {
    let strugglingCount = 0;
    let readyCount = 0;

    STUDENTS.forEach(student => {
      const s = student.skills[c.uri];
      const state = computeState(s.rating, s.rd, s.reviews, student.elapsedDays);
      const unlocked = isConceptUnlocked(student, c.uri);

      if (state === "red" || state === "amber" || state === "rusty") strugglingCount++;
      if (unlocked) readyCount++;
    });

    const unblockingPower = c.unlocks.length;
    const priorityScore = (strugglingCount * 1.5) + (readyCount * 1.0) + (unblockingPower * 2.0);

    return {
      concept: c,
      strugglingCount,
      readyCount,
      unblockingPower,
      priorityScore
    };
  });

  conceptGaps.sort((a, b) => b.priorityScore - a.priorityScore);

  conceptGaps.slice(0, 3).forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = `teaching-plan-item ${idx === 0 ? 'p1' : ''}`;
    li.innerHTML = `
      <b>Ưu tiên ${idx + 1}: ${item.concept.title} (${item.concept.code})</b>
      <p>
        ${item.strugglingCount}/${STUDENTS.length} học sinh đang hổng hoặc cần ôn tập.
        Sức mạnh khai phóng: mở khoá trực tiếp ${item.unblockingPower} kỹ năng tiếp theo.
      </p>
      <button class="plan-assign-btn" onclick="alert('Đã giao bài tập can thiệp kỹ năng: ${item.concept.title} tới các học sinh còn hổng!')">
        Giao bài can thiệp
      </button>
    `;
    planList.appendChild(li);
  });

  // Render Vis-network Heatmap
  renderTeacherHeatmapGraph();
}

// -------------------------------------------------------------
// CURRICULUM VIEW LOGIC
// -------------------------------------------------------------
function renderCurriculumView() {
  const container = document.getElementById("curriculum-list-container");
  container.innerHTML = "";

  CONCEPTS.forEach(c => {
    const card = document.createElement("div");
    card.className = "curriculum-card";
    const prereqTitles = c.prereqs.map(pUri => {
      const p = CONCEPTS.find(x => x.uri === pUri);
      return p ? p.code : pUri;
    }).join(", ") || "Không có (Gốc)";

    const unlockTitles = c.unlocks.map(uUri => {
      const u = CONCEPTS.find(x => x.uri === uUri);
      return u ? u.code : uUri;
    }).join(", ") || "Đỉnh đồ thị";

    card.innerHTML = `
      <div class="curr-code">${c.code}</div>
      <div class="curr-main">
        <h4>${c.title}</h4>
        <p>${c.desc}</p>
      </div>
      <div class="curr-meta">
        <div><b>Tiên quyết:</b> ${prereqTitles}</div>
        <div><b>Mở khoá:</b> ${unlockTitles}</div>
        <div><b>QTI Quiz:</b> 1 câu hỏi mẫu</div>
      </div>
    `;
    container.appendChild(card);
  });
}

// -------------------------------------------------------------
// DRAWER & NAVIGATION
// -------------------------------------------------------------
function openStudentDrawer(studentId) {
  const student = STUDENTS.find(s => s.id === studentId);
  if (!student) return;

  document.getElementById("drawer-student-name").innerText = `Hồ sơ: ${student.name}`;
  const content = document.getElementById("drawer-content");

  let html = `
    <div style="font-size: 13px; color: var(--st-neutral-500); margin-bottom: 16px;">
      Mã định danh: <code>${student.id}</code> · Trạng thái: <strong>Cognee Cloud Active</strong>
    </div>
    <h4 style="font-size: 14px; font-weight: 700; color: var(--st-ink); margin-bottom: 8px;">Chi tiết từng kỹ năng:</h4>
    <div style="display: flex; flex-direction: column; gap: 8px;">
  `;

  CONCEPTS.forEach(c => {
    const s = student.skills[c.uri];
    const unlocked = isConceptUnlocked(student, c.uri);
    let state = computeState(s.rating, s.rd, s.reviews, student.elapsedDays);
    if (!unlocked) state = "locked";

    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: var(--st-neutral-100); border-radius: var(--r-sm); font-size: 12px;">
        <div>
          <b>${c.code} - ${c.title}</b>
          <div style="color: var(--st-neutral-500); font-size: 11px;">Số lần ôn: ${s.reviews} · Độ lệch RD: ${Math.round(s.rd)}</div>
        </div>
        <span class="hm-cell-badge ${state}" style="width: auto; padding: 2px 8px;">${state === 'locked' ? 'Chưa mở' : Math.round(s.rating) + ' pts'}</span>
      </div>
    `;
  });

  html += `
    </div>
    <button class="btn-primary" style="margin-top: 16px; width: 100%;" onclick="currentStudentId='${student.id}'; document.getElementById('student-select').value='${student.id}'; renderStudentView(); closeDrawer(); switchTab('student');">
      Chuyển sang học sinh này
    </button>
  `;

  content.innerHTML = html;
  document.getElementById("drawer-backdrop").classList.add("open");
  document.getElementById("student-drawer").classList.add("open");
}

function closeDrawer() {
  document.getElementById("drawer-backdrop").classList.remove("open");
  document.getElementById("student-drawer").classList.remove("open");
}

document.getElementById("drawer-close-btn").onclick = closeDrawer;
document.getElementById("drawer-backdrop").onclick = closeDrawer;

function switchTab(viewId) {
  document.querySelectorAll(".navlink-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });
  document.querySelectorAll(".view-container").forEach(view => {
    view.classList.toggle("active", view.id === `view-${viewId}`);
  });
  if (viewId === "student" && studentNetwork) {
    setTimeout(() => studentNetwork.fit({ animation: false }), 200);
  }
  if (viewId === "teacher" && teacherNetwork) {
    setTimeout(() => teacherNetwork.fit({ animation: false }), 200);
  }
}

document.querySelectorAll(".navlink-btn").forEach(btn => {
  btn.onclick = () => switchTab(btn.dataset.view);
});

document.getElementById("hero-quick-quiz").onclick = () => {
  switchTab("student");
  const student = STUDENTS.find(s => s.id === currentStudentId);
  const frontier = getFrontierConcept(student);
  loadConceptToQuiz(frontier.uri);
};

document.getElementById("hero-view-heatmap").onclick = () => {
  switchTab("teacher");
};

document.getElementById("btn-fit-student-graph").onclick = () => {
  if (studentNetwork) studentNetwork.fit({ animation: true });
};

document.getElementById("btn-fit-teacher-graph").onclick = () => {
  if (teacherNetwork) teacherNetwork.fit({ animation: true });
};

// Populate Student Selector
const selectEl = document.getElementById("student-select");
STUDENTS.forEach(s => {
  const opt = document.createElement("option");
  opt.value = s.id;
  opt.innerText = s.name;
  selectEl.appendChild(opt);
});

selectEl.onchange = (e) => {
  currentStudentId = e.target.value;
  renderStudentView();
};

// Ebbinghaus Decay Button (+14 days)
document.getElementById("decay-btn").onclick = function() {
  STUDENTS.forEach(s => {
    s.elapsedDays += 14;
  });
  renderStudentView();
  renderTeacherView();
  alert("Đã tua nhanh thời gian +14 ngày! Một số kỹ năng trên Mastery Graph đã đổi màu sang trạng thái cần ôn (Rusty).");
};

// Ask Memory
document.getElementById("ask-student-btn").onclick = function() {
  const query = document.getElementById("ask-student-input").value.trim();
  const respEl = document.getElementById("ask-student-response");
  if (!query) return;

  const student = STUDENTS.find(s => s.id === currentStudentId);
  const frontier = getFrontierConcept(student);

  respEl.style.display = "block";
  respEl.innerHTML = `<strong>Phản hồi từ đồ thị trí nhớ của ${student.name}:</strong> Dựa trên dữ liệu học tập cá nhân, bạn đã làm chủ tốt các phép toán số nguyên cơ bản. Điểm bạn nên tập trung tiếp theo là <em>${frontier.title} (${frontier.code})</em> vì đây là mắt xích trực tiếp dẫn tới phương trình bậc nhất.`;
};

// Ask the Class
document.getElementById("class-ask-btn").onclick = function() {
  const query = document.getElementById("class-ask-input").value.trim();
  const respEl = document.getElementById("class-ask-response");
  if (!query) return;

  respEl.style.display = "block";
  respEl.innerHTML = `<strong>Kết quả quét trí nhớ toàn lớp:</strong> Có 2 học sinh đang gặp khó khăn ở kỹ năng <em>Nhân chia phân số</em> là Lê Gia Bảo và Đỗ Minh Đức. Khuyến nghị giáo viên tổ chức 1 buổi ôn tập 15 phút về quy tắc rút gọn phân số trước khi sang bài Phương trình bậc nhất.`;
};

// Initialize
renderStudentView();
renderTeacherView();
renderCurriculumView();
