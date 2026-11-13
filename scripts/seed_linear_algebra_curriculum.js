/**
 * Seed realistic, academic-grade curriculum data for "Đại số tuyến tính ứng dụng"
 * into OpenCASE M1 (via courseui/proxy on http://localhost:8114).
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

const COMPETENCIES = [
  {
    code: 'MATH.LA.01',
    statement: 'Ma trận, các phép toán ma trận và ma trận chuyển vị',
    description: 'Hiểu bản chất ánh xạ tuyến tính dưới dạng bảng số m x n; thực hiện thành thạo phép cộng, nhân vô hướng, nhân hai ma trận (Row-Column dot product) và vận dụng các tính chất cơ bản của phép chuyển vị ma trận.',
  },
  {
    code: 'MATH.LA.02',
    statement: 'Phép biến đổi sơ cấp trên dòng và ma trận bậc thang',
    description: 'Áp dụng ba phép biến đổi sơ cấp trên dòng để khử ma trận về dạng bậc thang (Row Echelon Form - REF) và bậc thang rút gọn (Reduced Row Echelon Form - RREF); xác định hạng (rank) của ma trận.',
  },
  {
    code: 'MATH.LA.03',
    statement: 'Hệ phương trình đại số tuyến tính & phương pháp khử Gauss-Jordan',
    description: 'Mô hình hóa hệ phương trình dạng Ax = b; áp dụng định lý Kronecker-Capelli để biện luận số nghiệm; tìm nghiệm tổng quát và nghiệm riêng bằng thuật toán khử Gauss-Jordan trên ma trận mở rộng [A|b].',
  },
  {
    code: 'MATH.LA.04',
    statement: 'Định thức (Determinant) và tính chất đại số',
    description: 'Tính định thức ma trận vuông cấp n thông qua khai triển Laplace và thuật toán tam giác hóa dòng; vận dụng công thức nhân định thức det(AB) = det(A)det(B) và kiểm tra tính khả nghịch det(A) != 0.',
  },
  {
    code: 'MATH.LA.05',
    statement: 'Ma trận nghịch đảo và phương pháp tìm nghịch đảo',
    description: 'Nắm vững điều kiện tồn tại ma trận nghịch đảo A^(-1); thực hiện thành thạo thuật toán tìm ma trận nghịch đảo bằng phương pháp ma trận phụ hợp (classical adjoint / adjugate) và thuật toán Gauss-Jordan ghép [A|I].',
  },
  {
    code: 'MATH.LA.06',
    statement: 'Không gian vector R^n, tổ hợp tuyến tính và hệ độc lập tuyến tính',
    description: 'Hiểu cấu trúc không gian vector Euclide R^n, bao tuyến tính (Span), khái niệm độc lập tuyến tính và phụ thuộc tuyến tính; thiết lập thuật toán ma trận để kiểm tra tính độc lập tuyến tính của họ vector.',
  },
  {
    code: 'MATH.LA.07',
    statement: 'Cơ sở, số chiều (Dimension) và 4 không gian con cơ bản',
    description: 'Xác định cơ sở và số chiều của không gian con; tìm cơ sở và số chiều cho 4 không gian con cơ bản sinh bởi ma trận A: Không gian dòng Col(A^T), Không gian cột Col(A), Không gian hạt nhân Null(A) và Null(A^T).',
  },
  {
    code: 'MATH.LA.08',
    statement: 'Giá trị riêng, vector riêng (Eigenvalues & Eigenvectors) và bài toán chéo hóa',
    description: 'Giải đa thức đặc trưng det(A - λI) = 0 để tìm trị riêng và không gian riêng tương ứng; xác định điều kiện ma trận chéo hóa được và áp dụng phân tích A = P D P^(-1) vào tính lũy thừa ma trận A^k.',
  },
  {
    code: 'MATH.LA.09',
    statement: 'Trực giao hóa Gram-Schmidt và phân tích ma trận QR',
    description: 'Nắm vững tích vô hướng trong R^n, chuẩn vector và góc giữa hai vector; áp dụng thuật toán trực giao hóa Gram-Schmidt để xây dựng họ vector trực chuẩn; triển khai phân tích A = QR phục vụ giải bài toán bình phương tối thiểu.',
  },
  {
    code: 'MATH.LA.10',
    statement: 'Phân tích giá trị suy biến (Singular Value Decomposition - SVD) và ứng dụng thực tế',
    description: 'Hiểu cấu trúc phân tích SVD A = U Σ V^T của ma trận chữ nhật bất kỳ; vận dụng SVD trong bài toán nén dữ liệu/hình ảnh số, xấp xỉ ma trận hạng thấp Eckart-Young và phân tích thành phần chính (PCA).',
  },
];

// Prerequisite dependencies: [prerequisite_code, target_code]
const PREREQUISITES = [
  ['MATH.LA.01', 'MATH.LA.02'], // Ma trận -> Phép biến đổi sơ cấp
  ['MATH.LA.02', 'MATH.LA.03'], // Biến đổi sơ cấp -> Hệ phương trình & Gauss
  ['MATH.LA.01', 'MATH.LA.04'], // Ma trận -> Định thức
  ['MATH.LA.02', 'MATH.LA.04'], // Biến đổi sơ cấp -> Định thức
  ['MATH.LA.02', 'MATH.LA.05'], // Biến đổi sơ cấp -> Ma trận nghịch đảo
  ['MATH.LA.04', 'MATH.LA.05'], // Định thức -> Ma trận nghịch đảo
  ['MATH.LA.03', 'MATH.LA.06'], // Hệ phương trình -> Không gian vector & Độc lập tuyến tính
  ['MATH.LA.06', 'MATH.LA.07'], // Không gian vector -> Cơ sở, số chiều & Không gian con
  ['MATH.LA.05', 'MATH.LA.08'], // Ma trận nghịch đảo/Định thức -> Giá trị riêng, vector riêng
  ['MATH.LA.07', 'MATH.LA.08'], // Cơ sở & Chiều -> Giá trị riêng & Chéo hóa
  ['MATH.LA.07', 'MATH.LA.09'], // Cơ sở & Chiều -> Trực giao Gram-Schmidt & QR
  ['MATH.LA.08', 'MATH.LA.10'], // Trị riêng & Chéo hóa -> Phân tích SVD
  ['MATH.LA.09', 'MATH.LA.10'], // Trực chuẩn QR -> Phân tích SVD
];

async function main() {
  console.log('--- 1. Fetching Courses from class-service ---');
  const courses = await callProxy('GET', 'class/courses');
  const targetCourse = courses.find(c => c.title.includes('Đại số tuyến tính'));
  if (!targetCourse) {
    throw new Error('Course "Đại số tuyến tính" not found in class-service');
  }
  console.log(`Found Course: "${targetCourse.title}" (ID: ${targetCourse.sourcedId})`);

  console.log('\n--- 2. Checking OpenCASE Documents ---');
  const docs = await callProxy('GET', 'case/documents');
  let targetDoc = docs.find(d => d.title.includes('Đại số tuyến tính') || d.identifier === `urn:course:${targetCourse.sourcedId}`);

  if (!targetDoc) {
    console.log('Creating new CASE CFDocument...');
    targetDoc = await callProxy('POST', 'case/documents', {
      title: targetCourse.title,
      creator: 'Khoa Toán - Tin học & Khoa học Máy tính',
      description: 'Khung chuẩn đầu ra (CLOs) và cây năng lực học phần Đại số tuyến tính ứng dụng chuẩn Outcome-Based Education (OBE) & CASE v1.1',
      version: '2026.1',
      language: 'vie',
    });
    console.log(`Created CFDocument: ${targetDoc.id}`);
  } else {
    console.log(`Using existing CFDocument: "${targetDoc.title}" (ID: ${targetDoc.id})`);
  }

  console.log('\n--- 3. Fetching existing Items in document ---');
  const existingItems = await callProxy('GET', `case/documents/${targetDoc.id}/items`);
  console.log(`Currently has ${existingItems.length} items`);

  // Map of code -> item
  const itemMap = new Map();
  for (const item of existingItems) {
    if (item.humanCodingScheme) {
      itemMap.set(item.humanCodingScheme, item);
    }
  }

  console.log('\n--- 4. Seeding Competencies (CLOs / Atomic Concepts) ---');
  for (const comp of COMPETENCIES) {
    if (itemMap.has(comp.code)) {
      console.log(`  [EXISTS] ${comp.code}: ${comp.statement}`);
      continue;
    }
    const created = await callProxy('POST', `case/documents/${targetDoc.id}/items`, {
      humanCodingScheme: comp.code,
      fullStatement: comp.statement,
      description: comp.description,
      language: 'vie',
      status: 'Active',
    });
    console.log(`  [CREATED] ${comp.code} (ID: ${created.id}): ${comp.statement}`);
    itemMap.set(comp.code, created);
  }

  console.log('\n--- 5. Checking existing Associations (Prerequisite DAG) ---');
  const existingAssocs = await callProxy('GET', `case/documents/${targetDoc.id}/associations`);
  console.log(`Currently has ${existingAssocs.length} associations`);

  const assocKey = (origin, dest) => `${origin}->${dest}`;
  const existingKeys = new Set(existingAssocs.map(a => assocKey(a.originItemId, a.destinationItemId)));

  console.log('\n--- 6. Seeding Prerequisite Associations (isPrerequisiteOf) ---');
  for (const [prereqCode, targetCode] of PREREQUISITES) {
    const originItem = itemMap.get(prereqCode);
    const destItem = itemMap.get(targetCode);
    if (!originItem || !destItem) {
      console.warn(`  [SKIP] Missing item for ${prereqCode} -> ${targetCode}`);
      continue;
    }

    const key = assocKey(originItem.id, destItem.id);
    if (existingKeys.has(key)) {
      console.log(`  [EXISTS] ${prereqCode} isPrerequisiteOf ${targetCode}`);
      continue;
    }

    await callProxy('POST', `case/documents/${targetDoc.id}/associations`, {
      associationType: 'isPrerequisiteOf',
      originItemId: originItem.id,
      destinationItemId: destItem.id,
      description: `Điều kiện tiên quyết: ${prereqCode} là nền tảng bắt buộc trước khi học ${targetCode}`,
    });
    console.log(`  [LINKED] ${prereqCode} -> isPrerequisiteOf -> ${targetCode}`);
  }

  console.log('\n--- 7. Verifying Resulting DAG & Graph Endpoint ---');
  const graph = await callProxy('GET', `case/documents/${targetDoc.id}/graph`);
  console.log(`Graph Nodes: ${graph.nodes.length}`);
  console.log(`Graph Edges: ${graph.edges.length}`);
  console.log('\nTopological Sample:');
  for (const node of graph.nodes) {
    const incoming = graph.edges.filter(e => e.target === node.id);
    const prereqCodes = incoming.map(e => {
      const srcNode = graph.nodes.find(n => n.id === e.source);
      return srcNode ? srcNode.humanCodingScheme : e.source;
    });
    console.log(`  - [${node.humanCodingScheme}] ${node.fullStatement} | Prereqs: [${prereqCodes.join(', ') || 'Root / Entry Level'}]`);
  }

  console.log('\n=== SUCCESS: Linear Algebra Curriculum Seeding Complete! ===');
}

main().catch(err => {
  console.error('\nFAILED:', err);
  process.exit(1);
});
