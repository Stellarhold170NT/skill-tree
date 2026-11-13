/**
 * SkillTree Prototype Application Engine
 * Implements Glicko-2, Ebbinghaus decay, CASE graph DAG traversal,
 * Frontier calculation, Class Heatmap & Contrastive Teaching Plan in pure JS.
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

// Single-match Glicko-2 step against standard reference question
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

  // Bisection solver for new volatility
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
    title: "Phép cộng số nguyên",
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
    title: "Phép trừ số nguyên",
    desc: "Quy tắc trừ số nguyên: cộng với số đối của số trừ",
    prereqs: ["case:math:int_add"],
    unlocks: ["case:math:int_div"],
    quiz: {
      question: "Tính: 12 - (-8) bằng bao nhiêu?",
      options: ["A. 4", "B. -4", "C. 20", "D. -20"],
      correct: 2
    }
  },
  {
    uri: "case:math:int_mult",
    code: "TOAN-03",
    title: "Phép nhân số nguyên",
    desc: "Quy tắc nhân hai số nguyên cùng dấu (+), khác dấu (-)",
    prereqs: ["case:math:int_add"],
    unlocks: ["case:math:int_div", "case:math:powers"],
    quiz: {
      question: "Tính: (-7) × (-9) bằng bao nhiêu?",
      options: ["A. -63", "B. 63", "C. 16", "D. -16"],
      correct: 1
    }
  },
  {
    uri: "case:math:int_div",
    code: "TOAN-04",
    title: "Phép chia số nguyên",
    desc: "Chia hết trong tập số nguyên, dấu của thương",
    prereqs: ["case:math:int_sub", "case:math:int_mult"],
    unlocks: ["case:math:frac_concept"],
    quiz: {
      question: "Tính: (-72) ÷ 8 bằng bao nhiêu?",
      options: ["A. 9", "B. -8", "C. -9", "D. 8"],
      correct: 2
    }
  },
  {
    uri: "case:math:frac_concept",
    code: "TOAN-05",
    title: "Khái niệm phân số & Rút gọn",
    desc: "Phân số a/b (b khác 0), tính chất cơ bản và ước chung lớn nhất",
    prereqs: ["case:math:int_div"],
    unlocks: ["case:math:frac_add", "case:math:frac_mult"],
    quiz: {
      question: "Rút gọn phân số 18/24 về tối giản:",
      options: ["A. 9/12", "B. 3/4", "C. 6/8", "D. 2/3"],
      correct: 1
    }
  },
  {
    uri: "case:math:frac_add",
    code: "TOAN-06",
    title: "Cộng trừ phân số",
    desc: "Quy đồng mẫu số và cộng trừ phân số cùng mẫu",
    prereqs: ["case:math:frac_concept"],
    unlocks: ["case:math:linear_eq"],
    quiz: {
      question: "Tính: 1/3 + 2/5 bằng bao nhiêu?",
      options: ["A. 3/8", "B. 11/15", "C. 7/15", "D. 5/8"],
      correct: 1
    }
  },
  {
    uri: "case:math:frac_mult",
    code: "TOAN-07",
    title: "Phép nhân phân số",
    desc: "Nhân tử với tử, mẫu với mẫu và triệt tiêu trước khi nhân",
    prereqs: ["case:math:frac_concept"],
    unlocks: ["case:math:frac_div"],
    quiz: {
      question: "Tính: (3/4) × (8/9) bằng bao nhiêu?",
      options: ["A. 2/3", "B. 24/36", "C. 11/13", "D. 3/4"],
      correct: 0
    }
  },
  {
    uri: "case:math:frac_div",
    code: "TOAN-08",
    title: "Phép chia phân số",
    desc: "Quy tắc nghịch đảo phân số và chuyển về phép nhân",
    prereqs: ["case:math:frac_mult"],
    unlocks: ["case:math:linear_eq"],
    quiz: {
      question: "Tính: (2/5) ÷ (4/15) bằng bao nhiêu?",
      options: ["A. 8/75", "B. 3/2", "C. 2/3", "D. 1/2"],
      correct: 1
    }
  },
  {
    uri: "case:math:powers",
    code: "TOAN-09",
    title: "Lũy thừa số nguyên",
    desc: "Định nghĩa lũy thừa bậc n, nhân chia hai lũy thừa cùng cơ số",
    prereqs: ["case:math:int_mult"],
    unlocks: ["case:math:quadratic_eq"],
    quiz: {
      question: "Tính giá trị của (-3)^3:",
      options: ["A. 27", "B. -9", "C. -27", "D. 9"],
      correct: 2
    }
  },
  {
    uri: "case:math:linear_eq",
    code: "TOAN-10",
    title: "Phương trình bậc nhất 1 ẩn",
    desc: "Giải phương trình ax + b = 0 (a khác 0), quy tắc chuyển vế đổi dấu",
    prereqs: ["case:math:frac_add", "case:math:frac_div"],
    unlocks: ["case:math:quadratic_eq"],
    quiz: {
      question: "Nghiệm của phương trình 3x - 12 = 0 là:",
      options: ["A. x = -4", "B. x = 4", "C. x = 36", "D. x = 9"],
      correct: 1
    }
  }
];

// --- 3. Mock Roster (OneRoster Standard: Class 10A1) ---
let STUDENTS = [
  { id: "std_01", name: "Nguyễn Hoàng Minh (Bạn)", isCurrent: true },
  { id: "std_02", name: "Trần Thị Lan", isCurrent: false },
  { id: "std_03", name: "Lê Văn Tuấn", isCurrent: false },
  { id: "std_04", name: "Phạm Quỳnh Anh", isCurrent: false },
  { id: "std_05", name: "Vũ Đức Thắng", isCurrent: false },
  { id: "std_06", name: "Đặng Thu Hà", isCurrent: false }
];

// Student state database: student_id -> { conceptUri -> { rating, rd, vol, reviews, idleDays } }
let DB_MASTERY = {};

function initMockData() {
  STUDENTS.forEach((s) => {
    DB_MASTERY[s.id] = {};
  });

  // Minh (Current Student): Good on early, Amber on frac_mult, Rusty on int_sub
  setStudentConcept("std_01", "case:math:int_add", 1920, 180, 0.05, 4, 1); // GREEN
  setStudentConcept("std_01", "case:math:int_sub", 1820, 240, 0.06, 2, 9); // RUSTY (idle 9 days)
  setStudentConcept("std_01", "case:math:int_mult", 1880, 210, 0.05, 3, 2); // GREEN
  setStudentConcept("std_01", "case:math:int_div", 1840, 230, 0.06, 2, 1); // GREEN
  setStudentConcept("std_01", "case:math:frac_concept", 1810, 240, 0.06, 2, 1); // GREEN
  setStudentConcept("std_01", "case:math:frac_mult", 1660, 290, 0.06, 1, 0); // AMBER (Next frontier target)

  // Lan: Outstanding student (all GREEN)
  CONCEPTS.slice(0, 8).forEach(c => {
    setStudentConcept("std_02", c.uri, 1950, 160, 0.05, 5, 1);
  });

  // Tuấn: Struggling student (REDs)
  setStudentConcept("std_03", "case:math:int_add", 1820, 220, 0.05, 3, 1);
  setStudentConcept("std_03", "case:math:int_sub", 1320, 310, 0.06, 1, 0); // RED
  setStudentConcept("std_03", "case:math:int_mult", 1350, 300, 0.06, 1, 0); // RED

  // Quỳnh Anh: Inactive, multiple RUSTY
  setStudentConcept("std_04", "case:math:int_add", 1850, 200, 0.05, 2, 12); // RUSTY
  setStudentConcept("std_04", "case:math:int_sub", 1820, 210, 0.05, 2, 14); // RUSTY
  setStudentConcept("std_04", "case:math:int_mult", 1840, 210, 0.05, 2, 14); // RUSTY

  // Thắng: Average
  setStudentConcept("std_05", "case:math:int_add", 1850, 200, 0.05, 3, 1);
  setStudentConcept("std_05", "case:math:int_sub", 1680, 270, 0.06, 1, 2); // AMBER
  setStudentConcept("std_05", "case:math:int_mult", 1820, 220, 0.05, 2, 1); // GREEN

  // Hà: Stuck on frac_concept
  setStudentConcept("std_06", "case:math:int_add", 1820, 220, 0.05, 2, 1);
  setStudentConcept("std_06", "case:math:int_sub", 1800, 230, 0.05, 2, 1);
  setStudentConcept("std_06", "case:math:int_mult", 1800, 230, 0.05, 2, 1);
  setStudentConcept("std_06", "case:math:int_div", 1800, 230, 0.05, 2, 1);
  setStudentConcept("std_06", "case:math:frac_concept", 1310, 320, 0.06, 1, 0); // RED
}

function setStudentConcept(studentId, uri, rating, rd, vol, reviews, idleDays) {
  DB_MASTERY[studentId][uri] = { rating, rd, vol, reviews, idleDays };
}

function getStudentMastery(studentId, uri) {
  const rec = DB_MASTERY[studentId]?.[uri];
  if (!rec) return { rating: 1500, rd: 350, vol: 0.06, reviews: 0, idleDays: 0, state: "none", mastery: 0.5 };
  const state = computeState(rec.rating, rec.rd, rec.reviews, rec.idleDays);
  const mastery = sigmoidMastery(rec.rating);
  return { ...rec, state, mastery };
}

// --- 4. Frontier Algorithm for Student ---
function computeFrontierForStudent(studentId) {
  const candidates = [];
  CONCEPTS.forEach(c => {
    const cur = getStudentMastery(studentId, c.uri);
    // Frontier candidate cannot be already mastered (green) or rusty
    if (cur.state === "green" || cur.state === "rusty") return;

    // Transitive prerequisites gating: ALL prereqs must be GREEN
    const allPrereqsGreen = c.prereqs.every(pUri => {
      const pState = getStudentMastery(studentId, pUri).state;
      return pState === "green";
    });

    if (allPrereqsGreen) {
      candidates.push({
        concept: c,
        unlockValue: c.unlocks.length,
        mastery: cur.mastery,
        state: cur.state
      });
    }
  });

  // Rank by unlock value descending, then mastery descending
  candidates.sort((a, b) => {
    if (b.unlockValue !== a.unlockValue) return b.unlockValue - a.unlockValue;
    return b.mastery - a.mastery;
  });

  return candidates;
}

// --- 5. UI Rendering & Interactions ---
let currentRole = "student"; // "student" | "teacher" | "graph"
let activeQuizConcept = null;
let selectedOption = null;

document.addEventListener("DOMContentLoaded", () => {
  initMockData();
  setupNav();
  renderStudentView();
  renderTeacherView();
  renderGraphView();
});

function setupNav() {
  document.querySelectorAll(".role-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".role-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentRole = btn.dataset.role;

      document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
      document.getElementById(`view-${currentRole}`).classList.add("active");

      // Update avatar/user label
      const userLabel = document.getElementById("header-user-name");
      if (currentRole === "student") userLabel.textContent = "Học sinh: Nguyễn Hoàng Minh";
      else if (currentRole === "teacher") userLabel.textContent = "Giáo viên: Cô Trần Ngọc Hà";
      else userLabel.textContent = "Tổ trưởng Chuyên môn";
    });
  });

  document.querySelectorAll(".sub-nav-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".sub-nav-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
    });
  });
}

// Render Student Skill Tree
function renderStudentView() {
  const studentId = "std_01";
  const frontier = computeFrontierForStudent(studentId);
  const nextTarget = frontier[0];

  // Render Frontier Banner
  const banner = document.getElementById("student-frontier-banner");
  if (nextTarget) {
    banner.innerHTML = `
      <div class="frontier-info">
        <span class="frontier-tag">✨ Gợi ý tối ưu nhất (Unlock Value: +${nextTarget.unlockValue})</span>
        <h2 class="frontier-title">${nextTarget.concept.title}</h2>
        <p class="frontier-desc">Tất cả điều kiện tiên quyết đều đã vững vàng. Hoàn thành bài này sẽ <strong>mở khóa tiếp ${nextTarget.unlockValue} bài học tiếp theo</strong> trong chương trình.</p>
      </div>
      <button class="btn-primary-action" onclick="openQuizModal('${nextTarget.concept.uri}')">
        🚀 Học ngay bây giờ
      </button>
    `;
  }

  // Render Concept Cards Grid
  const grid = document.getElementById("student-concept-grid");
  grid.innerHTML = "";

  CONCEPTS.forEach(c => {
    const info = getStudentMastery(studentId, c.uri);
    const card = document.createElement("div");
    card.className = `concept-card state-${info.state}`;
    card.onclick = () => openQuizModal(c.uri);

    const percent = Math.round(info.mastery * 100);
    let stateLabel = "CHƯA HỌC";
    if (info.state === "green") stateLabel = "ĐÃ LÀM CHỦ (GREEN)";
    else if (info.state === "amber") stateLabel = "ĐANG HỌC (AMBER)";
    else if (info.state === "red") stateLabel = "CẦN HỌC LẠI (RED)";
    else if (info.state === "rusty") stateLabel = "MAI MỘT (RUSTY)";

    card.innerHTML = `
      <div>
        <div class="concept-header">
          <span class="concept-code">${c.code}</span>
          <span class="concept-badge badge-${info.state}">${stateLabel}</span>
        </div>
        <h3 class="concept-title">${c.title}</h3>
        <p style="font-size: 0.85rem; color: var(--ink-secondary);">${c.desc}</p>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${percent}%; background: var(--color-${info.state === 'none' ? 'locked' : info.state});"></div>
        </div>
      </div>
      <div class="concept-meta">
        <span>Trình độ: <strong>${Math.round(info.rating)}</strong> (±${Math.round(info.rd)})</span>
        <span>Xác suất: <strong>${percent}%</strong></span>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Render Teacher Heatmap & Contrastive Plan
function renderTeacherView() {
  renderHeatmapTable();
  renderTeachingPlan();
}

function renderHeatmapTable() {
  const container = document.getElementById("teacher-heatmap-container");
  let html = `
    <table class="heatmap-table">
      <thead>
        <tr>
          <th class="col-student">Học sinh / Khái niệm</th>
  `;
  CONCEPTS.forEach(c => {
    html += `<th><div title="${c.title}" style="max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.code}</div></th>`;
  });
  html += `</tr></thead><tbody>`;

  STUDENTS.forEach(s => {
    html += `<tr><td class="col-student"><a href="#" style="color: var(--primary-dark); font-weight: 600; text-decoration: none;" onclick="openDrillDown('${s.id}'); return false;">${s.name}</a></td>`;
    CONCEPTS.forEach(c => {
      const m = getStudentMastery(s.id, c.uri);
      const letter = m.state === "none" ? "—" : m.state[0].toUpperCase();
      html += `<td><span class="heatmap-cell cell-${m.state}" title="${s.name} - ${c.title}: ${m.state.toUpperCase()} (R=${Math.round(m.rating)})" onclick="openDrillDown('${s.id}')">${letter}</span></td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

function renderTeachingPlan() {
  const tbody = document.getElementById("teaching-plan-tbody");
  tbody.innerHTML = "";

  // Compute aggregated struggling stats per concept
  const stats = CONCEPTS.map(c => {
    let redCount = 0;
    let rustyCount = 0;
    let amberCount = 0;
    STUDENTS.forEach(s => {
      const st = getStudentMastery(s.id, c.uri).state;
      if (st === "red") redCount++;
      else if (st === "rusty") rustyCount++;
      else if (st === "amber") amberCount++;
    });
    return {
      concept: c,
      redCount,
      rustyCount,
      amberCount,
      unlocksCount: c.unlocks.length,
      priorityScore: (redCount + rustyCount) * 10 + c.unlocks.length
    };
  });

  // Sort by bottleneck priority
  stats.sort((a, b) => b.priorityScore - a.priorityScore);
  const topPlan = stats.slice(0, 4);

  topPlan.forEach((item, idx) => {
    const tr = document.createElement("tr");
    let reasonText = "";
    if (item.redCount > 0) {
      reasonText = `⚠️ Có <strong>${item.redCount} học sinh Đỏ</strong> (hổng kiến thức gốc) và ${item.rustyCount} học sinh quên. Dạy bài này trước sẽ <strong>giải phóng ${item.unlocksCount} bài tiếp theo</strong> cho cả lớp.`;
    } else if (item.rustyCount > 0) {
      reasonText = `⏳ Có <strong>${item.rustyCount} học sinh bị Mai một (Rusty)</strong>. Chỉ cần giao bài tập trắc nghiệm ngắn 5 phút, không cần giảng lại lý thuyết trên lớp.`;
    } else {
      reasonText = `✅ Lớp tiếp thu tốt. Mở khóa thêm ${item.unlocksCount} bài tiếp theo.`;
    }

    tr.innerHTML = `
      <td class="plan-rank">#${idx + 1}</td>
      <td>
        <strong>${item.concept.title}</strong> (${item.concept.code})
        <div class="plan-reason">${reasonText}</div>
      </td>
      <td style="text-align: center;"><span class="concept-badge badge-red">${item.redCount}</span></td>
      <td style="text-align: center;"><span class="concept-badge badge-rusty">${item.rustyCount}</span></td>
      <td style="text-align: center;"><span class="concept-badge badge-amber">${item.amberCount}</span></td>
      <td style="text-align: center;"><strong>+${item.unlocksCount}</strong></td>
      <td>
        <button class="btn-sm-action" onclick="assignIntervention('${item.concept.uri}', '${item.concept.title}')">
          📝 Giao bài can thiệp
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render OpenCASE Graph
function renderGraphView() {
  const container = document.getElementById("graph-viewer-container");
  let svgHtml = `
    <div style="background: var(--surface-alt); padding: 1.5rem; border-radius: var(--radius-md); border: 1px dashed var(--border);">
      <h3 style="margin-bottom: 1rem; color: var(--ink);">🗺️ Bản đồ liên kết tiên quyết (CASE isPrerequisiteOf)</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
  `;

  CONCEPTS.forEach(c => {
    const prereqNames = c.prereqs.map(p => CONCEPTS.find(x => x.uri === p)?.title).filter(Boolean);
    const unlockNames = c.unlocks.map(u => CONCEPTS.find(x => x.uri === u)?.title).filter(Boolean);

    svgHtml += `
      <div style="background: white; border: 1px solid var(--border); border-radius: 8px; padding: 1rem; display: flex; align-items: center; justify-content: space-between;">
        <div style="width: 250px;">
          <strong>${c.code}: ${c.title}</strong>
        </div>
        <div style="flex: 1; margin: 0 1rem; font-size: 0.85rem;">
          <div>⬅️ Cần học trước: <span style="color: var(--ink-secondary);">${prereqNames.length ? prereqNames.join(", ") : "<em>(Khái niệm gốc - Không có tiên quyết)</em>"}</span></div>
          <div style="margin-top: 4px;">➡️ Mở khóa tiếp: <span style="color: var(--primary-dark); font-weight: 600;">${unlockNames.length ? unlockNames.join(", ") : "<em>(Đích đến)</em>"}</span></div>
        </div>
        <span class="concept-badge badge-green" style="font-size: 0.8rem;">CASE v1.1 Node</span>
      </div>
    `;
  });

  svgHtml += `</div></div>`;
  container.innerHTML = svgHtml;
}

// --- 6. Interactive Quiz Modal Actions ---
function openQuizModal(conceptUri) {
  const concept = CONCEPTS.find(c => c.uri === conceptUri);
  if (!concept) return;

  activeQuizConcept = concept;
  selectedOption = null;

  document.getElementById("modal-concept-title").textContent = `Kiểm tra: ${concept.title}`;
  document.getElementById("modal-quiz-question").textContent = concept.quiz.question;

  const optContainer = document.getElementById("modal-quiz-options");
  optContainer.innerHTML = "";
  concept.quiz.options.forEach((optText, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = optText;
    btn.onclick = () => {
      document.querySelectorAll(".quiz-option").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedOption = idx;
    };
    optContainer.appendChild(btn);
  });

  document.getElementById("modal-result-box").style.display = "none";
  document.getElementById("btn-submit-quiz").style.display = "inline-block";
  document.getElementById("quiz-modal").classList.add("active");
}

function closeQuizModal() {
  document.getElementById("quiz-modal").classList.remove("active");
  activeQuizConcept = null;
}

function submitQuizAttempt() {
  if (selectedOption === null) {
    alert("Vui lòng chọn 1 đáp án!");
    return;
  }

  const isCorrect = selectedOption === activeQuizConcept.quiz.correct;
  const studentId = "std_01";
  const oldMastery = getStudentMastery(studentId, activeQuizConcept.uri);

  // Compute live Glicko-2 update
  const newGlicko = rateAttempt(oldMastery.rating, oldMastery.rd, oldMastery.vol, isCorrect);
  const newReviews = oldMastery.reviews + 1;
  const newIdle = 0; // Just reviewed

  setStudentConcept(studentId, activeQuizConcept.uri, newGlicko.rating, newGlicko.rd, newGlicko.volatility, newReviews, newIdle);

  const updated = getStudentMastery(studentId, activeQuizConcept.uri);
  const resultBox = document.getElementById("modal-result-box");
  resultBox.style.display = "block";
  document.getElementById("btn-submit-quiz").style.display = "none";

  if (isCorrect) {
    resultBox.innerHTML = `
      <div style="color: var(--primary-dark); font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem;">🎉 CHÍNH XÁC!</div>
      <p style="font-size: 0.9rem; line-height: 1.5;">
        Điểm Glicko-2 của bạn tăng từ <strong>${Math.round(oldMastery.rating)} ➔ ${Math.round(updated.rating)}</strong>.<br>
        Xác suất làm chủ: <strong>${Math.round(oldMastery.mastery * 100)}% ➔ ${Math.round(updated.mastery * 100)}%</strong>.<br>
        Trạng thái hiện tại: <span class="concept-badge badge-${updated.state}">${updated.state.toUpperCase()}</span>
      </p>
      <button class="btn-primary-action" style="margin-top: 1rem; width: 100%; justify-content: center;" onclick="closeQuizModal(); refreshAllViews();">
        Tiếp tục hành trình
      </button>
    `;
  } else {
    resultBox.innerHTML = `
      <div style="color: var(--color-red); font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem;">❌ CHƯA CHÍNH XÁC!</div>
      <p style="font-size: 0.9rem; line-height: 1.5;">
        Điểm Glicko-2: <strong>${Math.round(oldMastery.rating)} ➔ ${Math.round(updated.rating)}</strong>.<br>
        Xác suất làm chủ: <strong>${Math.round(updated.mastery * 100)}%</strong>.<br>
        Trạng thái: <span class="concept-badge badge-${updated.state}">${updated.state.toUpperCase()}</span> (Hệ thống đã ghi nhận để hỗ trợ bạn củng cố kiến thức).
      </p>
      <button class="btn-primary-action" style="margin-top: 1rem; width: 100%; justify-content: center; background: #FEF2F2; color: #991B1B;" onclick="closeQuizModal(); refreshAllViews();">
        Đóng lại và ôn tập
      </button>
    `;
  }
}

function refreshAllViews() {
  renderStudentView();
  renderTeacherView();
}

// --- 7. Drill Down Drawer & Class Ask ---
function openDrillDown(studentId) {
  const student = STUDENTS.find(s => s.id === studentId);
  if (!student) return;

  document.getElementById("drawer-student-name").textContent = student.name;
  const content = document.getElementById("drawer-content");

  let rowsHtml = "";
  CONCEPTS.forEach(c => {
    const m = getStudentMastery(studentId, c.uri);
    rowsHtml += `
      <div style="padding: 10px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 600; font-size: 0.85rem;">${c.title}</div>
          <div style="font-size: 0.75rem; color: var(--ink-secondary);">R=${Math.round(m.rating)} (±${Math.round(m.rd)}) | Đã ôn: ${m.reviews} lần</div>
        </div>
        <span class="concept-badge badge-${m.state}">${m.state.toUpperCase()}</span>
      </div>
    `;
  });

  content.innerHTML = rowsHtml;
  document.getElementById("drawer-overlay").classList.add("active");
  document.getElementById("drawer-panel").classList.add("active");
}

function closeDrillDown() {
  document.getElementById("drawer-overlay").classList.remove("active");
  document.getElementById("drawer-panel").classList.remove("active");
}

function assignIntervention(conceptUri, title) {
  alert(`✅ Đã tự động tạo bài tập can thiệp cho khái niệm [${title}]!\nĐề bài đã được gửi trực tiếp đến nhóm học sinh bị RED/RUSTY trong lớp.`);
}

function handleClassAsk() {
  const input = document.getElementById("class-ask-input");
  const query = input.value.trim().toLowerCase();
  const respBox = document.getElementById("class-ask-response");

  if (!query) return;

  respBox.style.display = "block";
  if (query.includes("gọi") || query.includes("ai") || query.includes("lên bảng")) {
    respBox.innerHTML = `<strong>🤖 Trợ giảng AI:</strong> Cô nên gọi em <strong>Lê Văn Tuấn</strong> hoặc <strong>Đặng Thu Hà</strong>. Cả hai em đều đang bị <span class="concept-badge badge-red">RED</span> ở khái niệm nền tảng và đã sai 2 lần liên tiếp.`;
  } else if (query.includes("hổng") || query.includes("yếu") || query.includes("đỏ")) {
    respBox.innerHTML = `<strong>🤖 Trợ giảng AI:</strong> Khái niệm bị hổng nhiều nhất lớp là <strong>Phép trừ số nguyên</strong> (2 em Red) và <strong>Phép nhân số nguyên</strong> (1 em Red). Nên dành 10 phút đầu giờ củng cố lại.`;
  } else {
    respBox.innerHTML = `<strong>🤖 Trợ giảng AI:</strong> Lớp 10A1 hiện có <strong>6 học sinh</strong>. Tỉ lệ làm chủ toàn khóa đạt <strong>68%</strong>. Khái niệm tối ưu nên dạy tiếp theo là <strong>Phép nhân phân số</strong> để giải phóng 2 bài học sau đó.`;
  }
}
