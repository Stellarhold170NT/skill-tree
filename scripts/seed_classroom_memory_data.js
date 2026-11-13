/**
 * Seed authentic student cohort and learning mastery states for class CC01
 * into class-service (M6), learner-model-service (M5), and analytics-service (M4).
 */

const PROXY_URL = 'http://localhost:8114/courseui/proxy';
const HEADERS = {
  'host': 'localhost:8114',
  'origin': 'http://localhost:8114',
  'content-type': 'application/json',
};

async function callProxy(method, path, body) {
  const payload = { method, path };
  if (body !== undefined) payload.body = body;

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!json.ok) {
    throw new Error(`API Error [${method} ${path}]: ${json.error || JSON.stringify(json)}`);
  }
  return json.data;
}

async function main() {
  console.log('--- 1. Fetching Course, Class and CASE Document ---');
  const courses = await callProxy('GET', 'class/courses');
  const course = courses.find(c => c.title.includes('Đại số tuyến tính'));
  if (!course) throw new Error('Course not found');

  const classes = await callProxy('GET', 'class/classes');
  const cls = classes.find(c => c.courseSourcedId === course.sourcedId);
  if (!cls) throw new Error('Class CC01 not found');
  console.log(`Class: "${cls.title}" (${cls.sourcedId})`);

  const docs = await callProxy('GET', 'case/documents');
  const doc = docs.find(d => d.title.includes('Đại số tuyến tính'));
  if (!doc) throw new Error('CASE Document not found');
  console.log(`CASE Document: "${doc.title}" (${doc.id})`);

  const items = await callProxy('GET', `case/documents/${doc.id}/items`);
  console.log(`Loaded ${items.length} competency items`);

  // Map code -> item URI (e.g. MATH.LA.01 -> http://...)
  const codeToUri = new Map();
  for (const it of items) {
    const code = it.humanCodingScheme || it.human_coding_scheme;
    if (code) codeToUri.set(code, it.identifier);
  }

  console.log('\n--- 2. Ensuring Student Roster in class-service ---');
  const targetStudents = [
    { name: 'Nguyễn Văn An', email: 'an.nguyen@example.edu.vn' },
    { name: 'Lại Xuân Hiếu', email: 'hieu@example.edu.vn' },
    { name: 'Trần Thị Bích', email: 'bich.tran@vnu.edu.vn' },
    { name: 'Lê Hoàng Cường', email: 'cuong.le@vnu.edu.vn' },
    { name: 'Phạm Minh Đức', email: 'duc.pham@vnu.edu.vn' },
    { name: 'Đỗ Mai Linh', email: 'linh.do@vnu.edu.vn' },
  ];

  const currentStudents = await callProxy('GET', `class/classes/${cls.sourcedId}/students`);
  const enrolledMap = new Map(currentStudents.map(s => [s.email, s]));

  const studentObjects = [];
  for (const s of targetStudents) {
    if (enrolledMap.has(s.email)) {
      const existing = enrolledMap.get(s.email);
      console.log(`  [ENROLLED] ${s.name} (${existing.sourcedId})`);
      studentObjects.push(existing);
    } else {
      // Create user
      const user = await callProxy('POST', 'class/users', {
        displayName: s.name,
        email: s.email,
        role: 'student',
      });
      // Enroll
      await callProxy('POST', 'class/enrollments', {
        userSourcedId: user.sourcedId,
        classSourcedId: cls.sourcedId,
        role: 'student',
      });
      console.log(`  [CREATED & ENROLLED] ${s.name} (${user.sourcedId})`);
      studentObjects.push(user);
    }
  }

  console.log('\n--- 3. Seeding Realistic Learning Attempts into learner-model-service ---');
  const now = new Date();
  const past25d = new Date(Date.now() - 25 * 86400 * 1000).toISOString();
  const past3d = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
  const today = now.toISOString();

  // Define learning profile for each student
  // [MATH.LA.xx, isCorrect, count, timestamp]
  const profiles = {
    // An: Khá giỏi, đã nắm vững 3 bài đầu, đang học bài 4-5
    'an.nguyen@example.edu.vn': [
      ['MATH.LA.01', true, 4, past3d],
      ['MATH.LA.02', true, 3, past3d],
      ['MATH.LA.03', true, 3, today],
      ['MATH.LA.04', true, 1, today],
      ['MATH.LA.05', false, 1, today],
    ],
    // Hiếu: Bị hổng nặng ở phép biến đổi sơ cấp LA.02 và hệ phương trình LA.03
    'hieu@example.edu.vn': [
      ['MATH.LA.01', true, 2, past3d],
      ['MATH.LA.02', false, 4, today],
      ['MATH.LA.03', false, 3, today],
    ],
    // Bích: Học từ tháng trước nhưng lâu không ôn -> Rusty ở LA.01 & LA.02, hổng LA.04
    'bich.tran@vnu.edu.vn': [
      ['MATH.LA.01', true, 3, past25d],
      ['MATH.LA.02', true, 2, past25d],
      ['MATH.LA.04', false, 3, today],
    ],
    // Cường: Xuất sắc, đã hoàn thành tới không gian con LA.07
    'cuong.le@vnu.edu.vn': [
      ['MATH.LA.01', true, 4, past3d],
      ['MATH.LA.02', true, 3, past3d],
      ['MATH.LA.03', true, 3, past3d],
      ['MATH.LA.04', true, 3, past3d],
      ['MATH.LA.05', true, 3, past3d],
      ['MATH.LA.06', true, 3, today],
      ['MATH.LA.07', true, 3, today],
      ['MATH.LA.08', false, 1, today],
    ],
    // Đức: Mới bắt đầu học, đang tiếp thu
    'duc.pham@vnu.edu.vn': [
      ['MATH.LA.01', true, 3, today],
      ['MATH.LA.02', true, 1, today],
      ['MATH.LA.02', false, 1, today],
    ],
    // Linh: Làm tốt ma trận, nhưng sai phần định thức Laplace
    'linh.do@vnu.edu.vn': [
      ['MATH.LA.01', true, 3, past3d],
      ['MATH.LA.02', true, 3, past3d],
      ['MATH.LA.04', false, 4, today],
    ],
  };

  for (const student of studentObjects) {
    const list = profiles[student.email] || [];
    console.log(`  Updating student: ${student.displayName} (${student.email})...`);
    for (const [code, isCorrect, count, ts] of list) {
      const uri = codeToUri.get(code);
      if (!uri) continue;
      for (let i = 0; i < count; i++) {
        await callProxy('POST', `learner/students/${student.sourcedId}/update`, {
          conceptUri: uri,
          isCorrect,
          occurredAt: ts,
        });
      }
    }
  }

  console.log('\n--- 4. Verifying Resulting Heatmap & Teaching Plan ---');
  const hm = await callProxy('GET', `learner/classes/${cls.sourcedId}/heatmap?documentId=${doc.id}`);
  console.log(`Heatmap loaded: ${hm.students.length} students, ${hm.concepts.length} concepts.`);

  // Count states across class
  let green = 0, amber = 0, red = 0, rusty = 0, none = 0;
  for (const sid of hm.students) {
    for (const cid of hm.concepts) {
      const st = hm.cells[sid][cid];
      if (st === 'green') green++;
      else if (st === 'amber') amber++;
      else if (st === 'red') red++;
      else if (st === 'rusty') rusty++;
      else none++;
    }
  }
  console.log(`Cell distribution: Green (Mastered): ${green} | Amber (Learning): ${amber} | Red (Gaps): ${red} | Rusty (Decay): ${rusty} | None: ${none}`);

  const plan = await callProxy('GET', `learner/classes/${cls.sourcedId}/teaching-plan?documentId=${doc.id}&topN=5`);
  console.log(`\nTeaching Plan Top ${plan.plan.length} Recommendations:`);
  for (const [idx, p] of plan.plan.entries()) {
    const item = items.find(it => it.identifier === p.conceptUri);
    const code = item ? (item.humanCodingScheme || item.human_coding_scheme) : p.conceptUri;
    const name = item ? item.fullStatement : '';
    console.log(`  ${idx + 1}. [${code}] ${name}`);
    console.log(`     -> ${p.redCount} red (gaps), ${p.rustyCount} rusty, unlocks ${p.unlocks.length} downstream topics.`);
    console.log(`     -> Pedagogical Reason: ${p.reason}`);
  }

  console.log('\n=== SUCCESS: Classroom Memory Sample Data Seeded! ===');
}

main().catch(err => {
  console.error('\nFAILED:', err);
  process.exit(1);
});
