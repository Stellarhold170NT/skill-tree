/**
 * Đề cương và nội dung bài học môn: Đại số tuyến tính ứng dụng
 * Cấu trúc ánh xạ 1-1 với khung chuẩn đầu ra MATH.LA.01 -> MATH.LA.10
 */

export const MATH_LA_CHANNELS = [
  { key: "all-math-la", kind: "feed", name: "Đại số tuyến tính ứng dụng (Tất cả)", unread: 10, total: 10 },
  { key: "ch-01", kind: "feed", name: "Chương 1: Ma trận & Hệ phương trình", unread: 3, total: 3 },
  { key: "ch-02", kind: "feed", name: "Chương 2: Định thức & Ma trận nghịch đảo", unread: 2, total: 2 },
  { key: "ch-03", kind: "feed", name: "Chương 3: Không gian vector Euclide", unread: 2, total: 2 },
  { key: "ch-04", kind: "feed", name: "Chương 4: Trị riêng & Vector riêng", unread: 2, total: 2 },
  { key: "ch-05", kind: "feed", name: "Chương 5: Phân tích SVD & Ứng dụng DS", unread: 1, total: 1 },
];

export const MATH_LA_LESSONS = {
  "MATH.LA.01": {
    key: "MATH.LA.01",
    channelKey: "ch-01",
    channelName: "Chương 1: Ma trận & Hệ phương trình",
    title: "MATH.LA.01: Ma trận, các phép toán ma trận và ma trận chuyển vị",
    summary: "Định nghĩa ma trận cấp m x n, phép cộng, phép nhân vô hướng, nhân ma trận và ma trận chuyển vị với các tính chất đại số cốt lõi.",
    publishedAt: Date.parse("2026-09-01T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=fNk_zzaMoSs",
    videoEmbedUrl: "https://www.youtube.com/embed/fNk_zzaMoSs",
    image: "https://img.youtube.com/vi/fNk_zzaMoSs/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.01: Ma trận, Các phép toán và Ma trận chuyển vị</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 1 (3 tiết lý thuyết + bài tập)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Nắm vững định nghĩa ma trận, điều kiện nhân hai ma trận, tính chất ma trận chuyển vị và ứng dụng biểu diễn bảng dữ liệu nhiều chiều (Feature Matrix) trong Machine Learning.</p>
  </div>

  <h2>1. Định nghĩa ma trận</h2>
  <p>Một ma trận thực cấp $m \\times n$ là một bảng hình chữ nhật gồm $m$ hàng và $n$ cột các số thực:</p>
  <div class="math-block">
    $$A = \\begin{bmatrix} a_{11} & a_{12} & \\dots & a_{1n} \\\\ a_{21} & a_{22} & \\dots & a_{2n} \\\\ \\vdots & \\vdots & \\ddots & \\vdots \\\\ a_{m1} & a_{m2} & \\dots & a_{mn} \\end{bmatrix} \\in \\mathbb{R}^{m \\times n}$$
  </div>

  <h2>2. Các phép toán ma trận cốt lõi</h2>
  <h3>2.1. Phép nhân ma trận (Matrix Multiplication)</h3>
  <p>Cho $A \\in \\mathbb{R}^{m \\times p}$ và $B \\in \\mathbb{R}^{p \\times n}$. Tích $C = AB \\in \\mathbb{R}^{m \\times n}$ có phần tử ở vị trí $(i, j)$ được tính theo công thức:</p>
  <div class="math-block">
    $$c_{ij} = \\sum_{k=1}^p a_{ik} b_{kj} = a_{i1}b_{1j} + a_{i2}b_{2j} + \\dots + a_{ip}b_{pj}$$
  </div>
  <p><em>Lưu ý quan trọng:</em> Phép nhân ma trận <strong>không có tính chất giao hoán</strong> ($AB \\neq BA$ nói chung).</p>

  <h3>2.2. Ma trận chuyển vị (Transpose)</h3>
  <p>Chuyển vị của ma trận $A$, ký hiệu là $A^T \\in \\mathbb{R}^{n \\times m}$, thu được bằng cách đổi hàng thành cột: $(A^T)_{ij} = a_{ji}$.</p>
  <p>Các tính chất then chốt:</p>
  <ul>
    <li>$(A + B)^T = A^T + B^T$</li>
    <li>$(cA)^T = c A^T$ với mọi vô hướng $c \\in \\mathbb{R}$</li>
    <li>$(AB)^T = B^T A^T$ (đổi thứ tự khi chuyển vị tích)</li>
    <li>Ma trận đối xứng nếu $A = A^T$; phản đối xứng nếu $A^T = -A$.</li>
  </ul>

  <h2>3. Ứng dụng trong Khoa học Dữ liệu</h2>
  <p>Trong học máy, tập dữ liệu gồm $N$ mẫu, mỗi mẫu có $D$ đặc trưng (features) được gom thành ma trận dữ liệu $X \\in \\mathbb{R}^{N \\times D}$. Ma trận hiệp phương sai mẫu (Covariance Matrix) được biểu diễn gọn gàng qua phép nhân chuyển vị:</p>
  <div class="math-block">
    $$\\Sigma = \\frac{1}{N} X^T X \\in \\mathbb{R}^{D \\times D}$$
  </div>
</div>
    `,
    explanationMarkdown: `## Trọng tâm cần nhớ

1. **Điều kiện nhân**: Số cột của ma trận đứng trước phải bằng số hàng của ma trận đứng sau: $(m \\times p) \\cdot (p \\times n) = (m \\times n)$.
2. **Quy tắc đảo ngược chuyển vị**: $(AB)^T = B^T A^T$. Khi mở rộng cho nhiều ma trận: $(A_1 A_2 \\dots A_k)^T = A_k^T \\dots A_2^T A_1^T$.
3. **Ý nghĩa hình học**: Mỗi ma trận $A \\in \\mathbb{R}^{m \\times n}$ biểu diễn một ánh xạ tuyến tính $T: \\mathbb{R}^n \\to \\mathbb{R}^m$.`
  },

  "MATH.LA.02": {
    key: "MATH.LA.02",
    channelKey: "ch-01",
    channelName: "Chương 1: Ma trận & Hệ phương trình",
    title: "MATH.LA.02: Phép biến đổi sơ cấp trên dòng và ma trận bậc thang",
    summary: "3 phép biến đổi sơ cấp dòng, ma trận bậc thang (REF), ma trận bậc thang rút gọn (RREF) và kỹ thuật tìm hệ số dẫn đầu (pivot).",
    publishedAt: Date.parse("2026-09-08T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=QVKj3LADCnA",
    videoEmbedUrl: "https://www.youtube.com/embed/QVKj3LADCnA",
    image: "https://img.youtube.com/vi/QVKj3LADCnA/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.02: Phép biến đổi sơ cấp trên dòng & Ma trận bậc thang</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 2 (3 tiết lý thuyết + bài tập)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Thành thạo áp dụng 3 phép biến đổi dòng để đưa ma trận về dạng bậc thang (Row Echelon Form - REF) và bậc thang rút gọn (RREF), xác định vị trí pivot và hạng (rank) của ma trận.</p>
  </div>

  <h2>1. Ba phép biến đổi sơ cấp trên dòng (Elementary Row Operations)</h2>
  <ol>
    <li><strong>Hoán đổi:</strong> Đổi chỗ hai dòng $i$ và $j$: $r_i \\leftrightarrow r_j$.</li>
    <li><strong>Nhân vô hướng:</strong> Nhân một dòng với số thực $c \\neq 0$: $r_i \\leftarrow c \\cdot r_i$.</li>
    <li><strong>Cộng dòng:</strong> Cộng vào dòng $i$ một bội số của dòng $j$: $r_i \\leftarrow r_i + c \\cdot r_j$.</li>
  </ol>

  <h2>2. Ma trận bậc thang (REF) và bậc thang rút gọn (RREF)</h2>
  <p>Một ma trận ở dạng <strong>bậc thang (REF)</strong> khi thỏa mãn:</p>
  <ul>
    <li>Các dòng gồm toàn số 0 nằm ở dưới cùng.</li>
    <li>Hệ số dẫn đầu (pivot - phần tử khác 0 đầu tiên) của một dòng luôn nằm lệch sang phải so với pivot của dòng phía trên nó.</li>
  </ul>
  <p>Một ma trận ở dạng <strong>bậc thang rút gọn (RREF)</strong> nếu thỏa mãn thêm:</p>
  <ul>
    <li>Mọi pivot đều bằng $1$.</li>
    <li>Pivot là phần tử khác 0 duy nhất trong cột chứa nó.</li>
  </ul>
  <div class="math-block">
    $$\\text{RREF}(A) = \\begin{bmatrix} 1 & 0 & * & 0 & * \\\\ 0 & 1 & * & 0 & * \\\\ 0 & 0 & 0 & 1 & * \\\\ 0 & 0 & 0 & 0 & 0 \\end{bmatrix}$$
  </div>

  <h2>3. Định lý về hạng của ma trận (Rank)</h2>
  <p><strong>Hạng (Rank)</strong> của ma trận $A$, ký hiệu $\\text{rank}(A)$, chính là số lượng pivot trong dạng bậc thang của $A$:</p>
  <div class="math-block">
    $$\\text{rank}(A) = \\text{số dòng khác 0 trong REF}(A)$$
  </div>
</div>
    `,
    explanationMarkdown: `## Thuật toán khử Gauss đưa về REF

1. Tìm cột khác 0 ngoài cùng bên trái (cột pivot).
2. Hoán đổi dòng nếu cần để phần tử đầu cột khác 0.
3. Dùng phép cộng dòng $r_i \\leftarrow r_i - \\frac{a_{i1}}{a_{11}} r_1$ để triệt tiêu toàn bộ các phần tử bên dưới pivot.
4. Lặp lại với ma trận con thu được bằng cách bỏ dòng và cột chứa pivot vừa xử lý.`
  },

  "MATH.LA.03": {
    key: "MATH.LA.03",
    channelKey: "ch-01",
    channelName: "Chương 1: Ma trận & Hệ phương trình",
    title: "MATH.LA.03: Hệ phương trình đại số tuyến tính & phương pháp khử Gauss-Jordan",
    summary: "Hệ phương trình tuyến tính tổng quát A x = b, ma trận bổ sung, định lý Kronecker-Capelli và thuật toán giải toàn diện Gauss-Jordan.",
    publishedAt: Date.parse("2026-09-15T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=2NzN_d_37jA",
    videoEmbedUrl: "https://www.youtube.com/embed/2NzN_d_37jA",
    image: "https://img.youtube.com/vi/2NzN_d_37jA/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.03: Hệ phương trình đại số tuyến tính & Khử Gauss-Jordan</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 3 – Tuần 4 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Biểu diễn hệ phương trình tuyến tính dưới dạng ma trận $A\\mathbf{x} = \\mathbf{b}$, áp dụng định lý Kronecker-Capelli để biện luận số nghiệm, và giải hệ bằng khử Gauss-Jordan.</p>
  </div>

  <h2>1. Biểu diễn ma trận của hệ phương trình tuyến tính</h2>
  <p>Hệ $m$ phương trình tuyến tính với $n$ ẩn số có dạng:</p>
  <div class="math-block">
    $$\\begin{cases} a_{11}x_1 + a_{12}x_2 + \\dots + a_{1n}x_n = b_1 \\\\ a_{21}x_1 + a_{22}x_2 + \\dots + a_{2n}x_n = b_2 \\\\ \\vdots \\\\ a_{m1}x_1 + a_{m2}x_2 + \\dots + a_{mn}x_n = b_m \\end{cases} \\iff A\\mathbf{x} = \\mathbf{b}$$
  </div>
  <p>Trong đó $A \\in \\mathbb{R}^{m \\times n}$ là ma trận hệ số, $\\mathbf{x} \\in \\mathbb{R}^n$ là vector ẩn, và $\\mathbf{b} \\in \\mathbb{R}^m$ là vector vế phải. Ma trận bổ sung được ký hiệu là $\\bar{A} = [A \\mid \\mathbf{b}]$.</p>

  <h2>2. Định lý Kronecker - Capelli (Điều kiện có nghiệm)</h2>
  <div class="theorem-box">
    <p><strong>Định lý:</strong> Hệ phương trình tuyến tính $A\\mathbf{x} = \\mathbf{b}$ có nghiệm khi và chỉ khi:</p>
    $$\\text{rank}(A) = \\text{rank}(\\bar{A})$$
    <ul>
      <li>Nếu $\\text{rank}(A) < \\text{rank}(\\bar{A})$: Hệ <strong>vô nghiệm</strong>.</li>
      <li>Nếu $\\text{rank}(A) = \\text{rank}(\\bar{A}) = n$ (số ẩn): Hệ có <strong>nghiệm duy nhất</strong>.</li>
      <li>Nếu $\\text{rank}(A) = \\text{rank}(\\bar{A}) = r < n$: Hệ có <strong>vô số nghiệm</strong>, phụ thuộc vào $n - r$ tham số tự do.</li>
    </ul>
  </div>

  <h2>3. Phương pháp khử Gauss - Jordan</h2>
  <p>Đưa ma trận bổ sung $[A \\mid \\mathbf{b}]$ về dạng bậc thang rút gọn $[\text{RREF}(A) \\mid \\mathbf{b}']$. Từ đó đọc trực tiếp nghiệm của các biến cơ sở (pivot variables) theo các biến tự do (free variables).</p>
</div>
    `,
    explanationMarkdown: `## Ứng dụng trong Kỹ thuật & Khoa học Máy tính

1. **Định tuyến mạng (Network Flow)**: Cân bằng lưu lượng dòng vào bằng dòng ra tại mỗi nút mạng biểu diễn bằng một hệ $A\\mathbf{x} = \\mathbf{0}$.
2. **Hồi quy tuyến tính (Linear Regression)**: Nghiệm xấp xỉ bình phương tối thiểu thỏa mãn phương trình pháp tuyến (Normal Equation):
   $$A^T A \\mathbf{x} = A^T \\mathbf{b}$$`
  },

  "MATH.LA.04": {
    key: "MATH.LA.04",
    channelKey: "ch-02",
    channelName: "Chương 2: Định thức & Ma trận nghịch đảo",
    title: "MATH.LA.04: Định thức (Determinant) và tính chất đại số",
    summary: "Ý nghĩa hình học của định thức, tỷ lệ phóng đại thể tích, công thức tính định thức qua khai triển Laplace và biến đổi sơ cấp.",
    publishedAt: Date.parse("2026-09-22T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=Ip3X9LOh2dk",
    videoEmbedUrl: "https://www.youtube.com/embed/Ip3X9LOh2dk",
    image: "https://img.youtube.com/vi/Ip3X9LOh2dk/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.04: Định thức (Determinant) & Tính chất đại số</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 5 – Tuần 6 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Hiểu bản chất hình học của định thức (hệ số co dãn diện tích/thể tích của phép biến đổi tuyến tính), tính toán định thức cấp $n$ và vận dụng các tính chất đại số.</p>
  </div>

  <h2>1. Ý nghĩa hình học của định thức</h2>
  <p>Với ma trận $A \\in \\mathbb{R}^{2 \\times 2}$, giá trị tuyệt đối $|\\det(A)|$ bằng <strong>diện tích hình bình hành</strong> tạo bởi hai vector cột của $A$. Trong không gian $\\mathbb{R}^3$, $|\\det(A)|$ bằng <strong>thể tích khối hộp song song</strong>.</p>
  <p>Dấu của $\\det(A)$ chỉ ra phép biến đổi có làm đảo chiều định hướng không gian (orientation) hay không.</p>

  <h2>2. Các tính chất đại số cơ bản</h2>
  <ul>
    <li>$\\det(I) = 1$ (ma trận đơn vị có định thức bằng 1).</li>
    <li>$\\det(A^T) = \\det(A)$ (chuyển vị không làm đổi định thức).</li>
    <li><strong>Tính chất nhân:</strong> $\\det(AB) = \\det(A) \\cdot \\det(B)$.</li>
    <li>$\\det(cA) = c^n \\det(A)$ với $A$ cấp $n \\times n$.</li>
    <li>Nếu $A$ có một dòng (hoặc cột) toàn số 0, hoặc có 2 dòng tỉ lệ nhau thì $\\det(A) = 0$.</li>
    <li>Đổi chỗ 2 dòng làm định thức đổi dấu.</li>
    <li>Cộng vào một dòng bội số của dòng khác <em>không làm thay đổi</em> định thức.</li>
  </ul>

  <h2>3. Khai triển Laplace</h2>
  <div class="math-block">
    $$\\det(A) = \\sum_{j=1}^n (-1)^{i+j} a_{ij} M_{ij}$$
  </div>
  <p>Trong đó $M_{ij}$ là định thức con cấp $n-1$ thu được bằng cách bỏ hàng $i$ và cột $j$.</p>
</div>
    `,
    explanationMarkdown: `## Mẹo tính định thức nhanh trong thực tế

- Đưa ma trận về dạng tam giác trên (hoặc tam giác dưới) bằng các phép biến đổi sơ cấp dòng loại 3 (không làm đổi $\\det$).
- Định thức ma trận tam giác bằng **tích các phần tử trên đường chéo chính**:
  $$\\det(U) = u_{11} \\cdot u_{22} \\dots u_{nn}$$`
  },

  "MATH.LA.05": {
    key: "MATH.LA.05",
    channelKey: "ch-02",
    channelName: "Chương 2: Định thức & Ma trận nghịch đảo",
    title: "MATH.LA.05: Ma trận nghịch đảo và phương pháp tìm nghịch đảo",
    summary: "Điều kiện khả nghịch det(A) ≠ 0, công thức ma trận phụ hợp và thuật toán tìm nghịch đảo Gauss-Jordan [A | I] -> [I | A^-1].",
    publishedAt: Date.parse("2026-09-29T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=FX4C-JpTFgY",
    videoEmbedUrl: "https://www.youtube.com/embed/FX4C-JpTFgY",
    image: "https://img.youtube.com/vi/FX4C-JpTFgY/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.05: Ma trận nghịch đảo & Phương pháp tìm nghịch đảo</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 7 (3 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Nắm vững định nghĩa ma trận khả nghịch, thành thạo tìm $A^{-1}$ bằng phương pháp Gauss-Jordan và phương pháp ma trận phụ hợp, áp dụng giải phương trình ma trận.</p>
  </div>

  <h2>1. Định nghĩa ma trận nghịch đảo</h2>
  <p>Cho ma trận vuông $A$ cấp $n$. Nếu tồn tại ma trận $B$ sao cho $AB = BA = I_n$ thì $A$ được gọi là <strong>khả nghịch (invertible / non-singular)</strong>, và $B$ được gọi là ma trận nghịch đảo của $A$, ký hiệu $A^{-1}$.</p>
  <div class="theorem-box">
    <p><strong>Điều kiện cần và đủ:</strong> Ma trận $A$ khả nghịch khi và chỉ khi:</p>
    $$\\det(A) \\neq 0 \\iff \\text{rank}(A) = n$$
  </div>

  <h2>2. Thuật toán tìm ma trận nghịch đảo Gauss - Jordan</h2>
  <p>Ghép ma trận đơn vị $I$ vào bên phải ma trận $A$ để lập ma trận khối $[A \\mid I_n]$. Dùng các phép biến đổi sơ cấp dòng đưa nửa bên trái về $I_n$:</p>
  <div class="math-block">
    $$[A \\mid I_n] \\xrightarrow{\\text{Row Operations}} [I_n \\mid A^{-1}]$$
  </div>
  <p>Nếu trong quá trình biến đổi, nửa bên trái xuất hiện một dòng toàn số 0 thì $A$ không khả nghịch.</p>

  <h2>3. Tính chất của ma trận nghịch đảo</h2>
  <ul>
    <li>$(A^{-1})^{-1} = A$</li>
    <li>$(AB)^{-1} = B^{-1} A^{-1}$ (đảo thứ tự khi nghịch đảo tích)</li>
    <li>$(A^T)^{-1} = (A^{-1})^T$</li>
    <li>$\\det(A^{-1}) = \\frac{1}{\\det(A)}$</li>
  </ul>
</div>
    `,
    explanationMarkdown: `## Công thức ma trận phụ hợp (Adjugate Formula)

$$A^{-1} = \\frac{1}{\\det(A)} \\text{adj}(A)$$

Với ma trận cấp $2 \\times 2$:
$$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}^{-1} = \\frac{1}{ad - bc} \\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix}$$`
  },

  "MATH.LA.06": {
    key: "MATH.LA.06",
    channelKey: "ch-03",
    channelName: "Chương 3: Không gian vector Euclide",
    title: "MATH.LA.06: Không gian vector R^n, tổ hợp tuyến tính và hệ độc lập tuyến tính",
    summary: "Không gian vector Euclid R^n, khái niệm Span (không gian sinh), tổ hợp tuyến tính và điều kiện độc lập tuyến tính / phụ thuộc tuyến tính.",
    publishedAt: Date.parse("2026-10-06T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=k7RM-ot2NWY",
    videoEmbedUrl: "https://www.youtube.com/embed/k7RM-ot2NWY",
    image: "https://img.youtube.com/vi/k7RM-ot2NWY/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.06: Không gian vector $\\mathbb{R}^n$, Tổ hợp tuyến tính & Độc lập tuyến tính</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 8 – Tuần 9 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Hiểu bản chất không gian vector $\\mathbb{R}^n$, kiểm tra hệ vector độc lập tuyến tính hay phụ thuộc tuyến tính bằng cách giải hệ thuần nhất $A\\mathbf{x} = \\mathbf{0}$.</p>
  </div>

  <h2>1. Tổ hợp tuyến tính (Linear Combination) và Bao tuyến tính (Span)</h2>
  <p>Cho tập các vector $\\{\\mathbf{v}_1, \\mathbf{v}_2, \\dots, \\mathbf{v}_k\\} \\subset \\mathbb{R}^n$. Một vector $\\mathbf{w}$ được gọi là <strong>tổ hợp tuyến tính</strong> của hệ nếu tồn tại các số thực $c_1, \\dots, c_k$ sao cho:</p>
  <div class="math-block">
    $$\\mathbf{w} = c_1 \\mathbf{v}_1 + c_2 \\mathbf{v}_2 + \\dots + c_k \\mathbf{v}_k$$
  </div>
  <p>Tập hợp tất cả các tổ hợp tuyến tính của hệ được gọi là <strong>không gian sinh (Span)</strong>:</p>
  <div class="math-block">
    $$\\text{Span}(\\mathbf{v}_1, \\dots, \\mathbf{v}_k) = \\left\\{ \\sum_{i=1}^k c_i \\mathbf{v}_i \\;\\middle|\\; c_i \\in \\mathbb{R} \\right\\}$$
  </div>

  <h2>2. Độc lập tuyến tính (Linear Independence)</h2>
  <p>Hệ vector $\\{\\mathbf{v}_1, \\dots, \\mathbf{v}_k\\}$ được gọi là <strong>độc lập tuyến tính</strong> nếu phương trình vectơ:</p>
  <div class="math-block">
    $$c_1 \\mathbf{v}_1 + c_2 \\mathbf{v}_2 + \\dots + c_k \\mathbf{v}_k = \\mathbf{0}$$
  </div>
  <p><strong>chỉ có nghiệm duy nhất</strong> $c_1 = c_2 = \\dots = c_k = 0$. Nếu tồn tại ít nhất một $c_i \\neq 0$ thỏa mãn phương trình trên thì hệ là <strong>phụ thuộc tuyến tính</strong>.</p>
</div>
    `,
    explanationMarkdown: `## Tiêu chuẩn ma trận kiểm tra độc lập tuyến tính

Xếp các vector thành các cột của ma trận $A = [\\mathbf{v}_1 \\mid \\mathbf{v}_2 \\mid \\dots \\mid \\mathbf{v}_k]$:
- Hệ **độc lập tuyến tính** $\\iff$ Hệ thuần nhất $A\\mathbf{c} = \\mathbf{0}$ chỉ có nghiệm tầm thường $\\mathbf{c} = \\mathbf{0} \\iff \\text{rank}(A) = k$ (mọi cột đều có pivot).
- Nếu số vector $k > n$ (số chiều không gian) thì hệ **chắc chắn phụ thuộc tuyến tính**.`
  },

  "MATH.LA.07": {
    key: "MATH.LA.07",
    channelKey: "ch-03",
    channelName: "Chương 3: Không gian vector Euclide",
    title: "MATH.LA.07: Cơ sở, số chiều (Dimension) và 4 không gian con cơ bản",
    summary: "Cơ sở của không gian vector, số chiều, định lý Rank-Nullity và 4 không gian con cơ bản của ma trận: C(A), N(A), C(A^T), N(A^T).",
    publishedAt: Date.parse("2026-10-13T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=nP390Vdc_Xg",
    videoEmbedUrl: "https://www.youtube.com/embed/nP390Vdc_Xg",
    image: "https://img.youtube.com/vi/nP390Vdc_Xg/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.07: Cơ sở, Số chiều & Bốn không gian con cơ bản</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 10 – Tuần 11 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Nắm vững khái niệm cơ sở và số chiều, xác định cơ sở của 4 không gian con cơ bản của ma trận theo định lý cơ bản của Gilbert Strang.</p>
  </div>

  <h2>1. Cơ sở (Basis) và Số chiều (Dimension)</h2>
  <p>Một tập vector $\\mathcal{B} = \\{\\mathbf{v}_1, \\dots, \\mathbf{v}_d\\}$ là một <strong>cơ sở</strong> của không gian vector $V$ nếu:</p>
  <ol>
    <li>$\\mathcal{B}$ độc lập tuyến tính.</li>
    <li>$\\text{Span}(\\mathcal{B}) = V$ (sinh ra toàn bộ $V$).</li>
  </ol>
  <p>Số lượng vector trong cơ sở được gọi là <strong>số chiều</strong> của $V$, ký hiệu $\\dim(V) = d$.</p>

  <h2>2. Bốn không gian con cơ bản của ma trận $A \\in \\mathbb{R}^{m \\times n}$</h2>
  <table class="math-table">
    <thead>
      <tr>
        <th>Không gian con</th>
        <th>Ký hiệu</th>
        <th>Không gian chứa</th>
        <th>Số chiều</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Không gian cột (Column Space)</td>
        <td>$C(A)$</td>
        <td>$\\mathbb{R}^m$</td>
        <td>$r = \\text{rank}(A)$</td>
      </tr>
      <tr>
        <td>Không gian dòng (Row Space)</td>
        <td>$C(A^T)$</td>
        <td>$\\mathbb{R}^n$</td>
        <td>$r = \\text{rank}(A)$</td>
      </tr>
      <tr>
        <td>Không gian nghiệm (Null Space)</td>
        <td>$N(A)$</td>
        <td>$\\mathbb{R}^n$</td>
        <td>$n - r$</td>
      </tr>
      <tr>
        <td>Không gian nghiệm trái (Left Null Space)</td>
        <td>$N(A^T)$</td>
        <td>$\\mathbb{R}^m$</td>
        <td>$m - r$</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Định lý Rank - Nullity</h2>
  <div class="math-block">
    $$\\dim(C(A)) + \\dim(N(A)) = \\text{rank}(A) + \\text{nullity}(A) = n$$
  </div>
  <p>Hơn nữa, $C(A^T) \\perp N(A)$ (không gian dòng trực giao với không gian nghiệm trong $\\mathbb{R}^n$), và $C(A) \\perp N(A^T)$ trong $\\mathbb{R}^m$.</p>
</div>
    `,
    explanationMarkdown: `## Ý nghĩa 4 không gian con

Mỗi phép nhân ma trận - vector $\\mathbf{x} \\mapsto A\\mathbf{x}$ biến đổi:
1. Thành phần của $\\mathbf{x}$ nằm trong $N(A)$ bị triệt tiêu về $\\mathbf{0}$.
2. Thành phần của $\\mathbf{x}$ nằm trong $C(A^T)$ được ánh xạ 1-1 sang $C(A)$.`
  },

  "MATH.LA.08": {
    key: "MATH.LA.08",
    channelKey: "ch-04",
    channelName: "Chương 4: Trị riêng & Vector riêng",
    title: "MATH.LA.08: Giá trị riêng, vector riêng (Eigenvalues & Eigenvectors) và bài toán chéo hóa",
    summary: "Phương trình đặc trưng det(A - λ I) = 0, tìm vector riêng tương ứng, điều kiện chéo hóa ma trận A = P D P^-1 và ứng dụng lũy thừa ma trận.",
    publishedAt: Date.parse("2026-10-20T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=PFDu9oVAE-g",
    videoEmbedUrl: "https://www.youtube.com/embed/PFDu9oVAE-g",
    image: "https://img.youtube.com/vi/PFDu9oVAE-g/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.08: Trị riêng, Vector riêng & Bài toán chéo hóa</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 12 – Tuần 13 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Tìm đa thức đặc trưng, tính trị riêng và không gian riêng (eigenspace), kiểm tra điều kiện chéo hóa ma trận và ứng dụng giải hệ phương trình vi phân / mô hình Markov.</p>
  </div>

  <h2>1. Định nghĩa Trị riêng & Vector riêng</h2>
  <p>Cho ma trận vuông $A \\in \\mathbb{R}^{n \\times n}$. Số vô hướng $\\lambda$ được gọi là <strong>giá trị riêng (eigenvalue)</strong> của $A$ nếu tồn tại vector khác không $\\mathbf{v} \\neq \\mathbf{0}$ sao cho:</p>
  <div class="math-block">
    $$A\\mathbf{v} = \\lambda \\mathbf{v} \\iff (A - \\lambda I)\\mathbf{v} = \\mathbf{0}$$
  </div>
  <p>Vector $\\mathbf{v}$ được gọi là <strong>vector riêng (eigenvector)</strong> ứng với trị riêng $\\lambda$.</p>

  <h2>2. Phương trình đặc trưng (Characteristic Equation)</h2>
  <p>Để hệ $(A - \\lambda I)\\mathbf{v} = \\mathbf{0}$ có nghiệm không tầm thường, ta phải có:</p>
  <div class="math-block">
    $$p(\\lambda) = \\det(A - \\lambda I) = 0$$
  </div>
  <p>Các nghiệm của phương trình trên chính là các giá trị riêng của $A$.</p>

  <h2>3. Chéo hóa ma trận (Diagonalization)</h2>
  <p>Ma trận $A$ <strong>chéo hóa được</strong> khi và chỉ khi $A$ có đủ $n$ vector riêng độc lập tuyến tính $\\{\\mathbf{v}_1, \\dots, \\mathbf{v}_n\\}$. Khi đó:</p>
  <div class="math-block">
    $$A = P D P^{-1}$$
  </div>
  <p>Trong đó $P = [\\mathbf{v}_1 \\mid \\dots \\mid \\mathbf{v}_n]$ là ma trận chứa các vector riêng ở các cột, và $D = \\text{diag}(\\lambda_1, \\dots, \\lambda_n)$ là ma trận đường chéo chứa các giá trị riêng tương ứng.</p>
  <p><em>Ứng dụng:</em> Tính lũy thừa ma trận cực nhanh: $A^k = P D^k P^{-1}$.</p>
</div>
    `,
    explanationMarkdown: `## Ứng dụng: Chuỗi Markov & Thuật toán PageRank

Trong chuỗi Markov, vector trạng thái xác suất tại bước $k+1$ tuân theo $\\mathbf{p}_{k+1} = P \\mathbf{p}_k$. Trạng thái dừng cân bằng $\\mathbf{p}_\\infty$ chính là vector riêng ứng với giá trị riêng $\\lambda = 1$:
$$P \\mathbf{p}_\\infty = \\mathbf{p}_\\infty$$`
  },

  "MATH.LA.09": {
    key: "MATH.LA.09",
    channelKey: "ch-04",
    channelName: "Chương 4: Trị riêng & Vector riêng",
    title: "MATH.LA.09: Trực giao hóa Gram-Schmidt và phân tích ma trận QR",
    summary: "Tích vô hướng trong R^n, hệ trực giao/trực chuẩn, thuật toán trực giao hóa Gram-Schmidt và phân tích ma trận A = Q R.",
    publishedAt: Date.parse("2026-10-27T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=Y_Ac6KiQ1t0",
    videoEmbedUrl: "https://www.youtube.com/embed/Y_Ac6KiQ1t0",
    image: "https://img.youtube.com/vi/Y_Ac6KiQ1t0/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.09: Trực giao hóa Gram - Schmidt & Phân tích ma trận QR</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 14 (3 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Biến đổi cơ sở bất kỳ thành cơ sở trực chuẩn (Orthonormal Basis) bằng thuật toán Gram-Schmidt, phân tích ma trận $A = QR$ ứng dụng giải bài toán bình phương cực tiểu.</p>
  </div>

  <h2>1. Hệ trực giao & Hệ trực chuẩn</h2>
  <p>Hai vector $\\mathbf{u}, \\mathbf{v} \\in \\mathbb{R}^n$ trực giao nhau nếu tích vô hướng bằng 0: $\\mathbf{u}^T \\mathbf{v} = 0$.</p>
  <p>Một hệ vector $\\{\\mathbf{q}_1, \\dots, \\mathbf{q}_k\\}$ là <strong>trực chuẩn (orthonormal)</strong> nếu:</p>
  <div class="math-block">
    $$\\mathbf{q}_i^T \\mathbf{q}_j = \\begin{cases} 1 & \\text{khi } i = j \\\\ 0 & \\text{khi } i \\neq j \\end{cases}$$
  </div>

  <h2>2. Thuật toán trực giao hóa Gram - Schmidt</h2>
  <p>Từ cơ sở $\\{\\mathbf{v}_1, \\dots, \\mathbf{v}_k\\}$, xây dựng cơ sở trực giao $\\{\\mathbf{u}_1, \\dots, \\mathbf{u}_k\\}$:</p>
  <div class="math-block">
    $$\\begin{aligned} \\mathbf{u}_1 &= \\mathbf{v}_1 \\\\ \\mathbf{u}_2 &= \\mathbf{v}_2 - \\frac{\\mathbf{u}_1^T \\mathbf{v}_2}{\\mathbf{u}_1^T \\mathbf{u}_1} \\mathbf{u}_1 \\\\ \\mathbf{u}_k &= \\mathbf{v}_k - \\sum_{j=1}^{k-1} \\frac{\\mathbf{u}_j^T \\mathbf{v}_k}{\\mathbf{u}_j^T \\mathbf{u}_j} \\mathbf{u}_j \\end{aligned}$$
  </div>
  <p>Sau đó chuẩn hóa từng vector: $\\mathbf{q}_i = \\frac{\\mathbf{u}_i}{\\|\\mathbf{u}_i\\|}$.</p>

  <h2>3. Phân tích ma trận $A = QR$</h2>
  <div class="math-block">
    $$A = Q R$$
  </div>
  <p>Trong đó $Q$ có các cột trực chuẩn ($Q^T Q = I$), và $R$ là ma trận tam giác trên khả nghịch. Bài toán bình phương tối thiểu $A\\mathbf{x} = \\mathbf{b}$ trở thành giải hệ tam giác:</p>
  <div class="math-block">
    $$R\\mathbf{x} = Q^T \\mathbf{b}$$
  </div>
</div>
    `,
    explanationMarkdown: `## Ưu điểm của phân tích QR

Thuật toán QR ổn định về mặt số học hơn nhiều so với việc tính trực tiếp ma trận nghịch đảo $(A^T A)^{-1}$, tránh hiện tượng ma trận bị xấu điều kiện (ill-conditioned matrix).`
  },

  "MATH.LA.10": {
    key: "MATH.LA.10",
    channelKey: "ch-05",
    channelName: "Chương 5: Phân tích SVD & Ứng dụng DS",
    title: "MATH.LA.10: Phân tích giá trị suy biến (Singular Value Decomposition - SVD) và ứng dụng thực tế",
    summary: "Định lý SVD: A = U Σ V^T, ý nghĩa hình học, xấp xỉ ma trận hạng thấp Eckart-Young, nén ảnh, lọc cộng tác và phân tích thành phần chính PCA.",
    publishedAt: Date.parse("2026-11-03T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=gXbThCXjZFM",
    videoEmbedUrl: "https://www.youtube.com/embed/gXbThCXjZFM",
    image: "https://img.youtube.com/vi/gXbThCXjZFM/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.10: Phân tích giá trị suy biến (SVD) & Ứng dụng</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 15 (Tổng kết chuyên đề Data Science)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Nắm vững định lý phân tích giá trị suy biến $A = U \\Sigma V^T$ cho ma trận hình chữ nhật bất kỳ, hiểu định lý Eckart-Young về xấp xỉ hạng thấp (Low-rank approximation) và ứng dụng nén ảnh, hệ gợi ý (Collaborative Filtering) và PCA.</p>
  </div>

  <h2>1. Định lý phân tích SVD</h2>
  <p>Mọi ma trận thực $A \\in \\mathbb{R}^{m \\times n}$ bất kỳ đều có thể phân tích thành tích của 3 ma trận:</p>
  <div class="math-block">
    $$A = U \\Sigma V^T$$
  </div>
  <p>Trong đó:</p>
  <ul>
    <li>$U \\in \\mathbb{R}^{m \\times m}$ là ma trận trực giao ($U^T U = I_m$), các cột $\\mathbf{u}_i$ là các <strong>left singular vectors</strong> (vector riêng của $AA^T$).</li>
    <li>$V \\in \\mathbb{R}^{n \\times n}$ là ma trận trực giao ($V^T V = I_n$), các cột $\\mathbf{v}_i$ là các <strong>right singular vectors</strong> (vector riêng của $A^T A$).</li>
    <li>$\\Sigma \\in \\mathbb{R}^{m \\times n}$ là ma trận đường chéo chữ nhật chứa các <strong>giá trị suy biến (singular values)</strong> được sắp xếp giảm dần:
      $$\\sigma_1 \\ge \\sigma_2 \\ge \\dots \\ge \\sigma_r > 0 = \\sigma_{r+1} = \\dots = 0$$
      với $\\sigma_i = \\sqrt{\\lambda_i(A^T A)}$.
    </li>
  </ul>

  <h2>2. Dạng phân rã tổng các ma trận hạng 1 (Dyadic Expansion)</h2>
  <div class="math-block">
    $$A = \\sum_{i=1}^r \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T = \\sigma_1 \\mathbf{u}_1 \\mathbf{v}_1^T + \\sigma_2 \\mathbf{u}_2 \\mathbf{v}_2^T + \\dots + \\sigma_r \\mathbf{u}_r \\mathbf{v}_r^T$$
  </div>
  <p>Mỗi số hạng $\\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T$ là một ma trận cấp $m \\times n$ có hạng đúng bằng 1.</p>

  <h2>3. Định lý Eckart - Young - Mirsky (Xấp xỉ hạng thấp)</h2>
  <div class="theorem-box">
    <p><strong>Định lý:</strong> Với số nguyên $k < r$, ma trận hạng $k$ xấp xỉ tốt nhất cho ma trận $A$ theo chuẩn Frobenius $\\|\\cdot\\|_F$ hoặc chuẩn Spectral $\\|\\cdot\\|_2$ là:</p>
    $$A_k = \\sum_{i=1}^k \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T$$
    $$\\min_{\\text{rank}(B) \\le k} \\|A - B\\|_F = \\|A - A_k\\|_F = \\sqrt{\\sum_{i=k+1}^r \\sigma_i^2}$$
  </div>

  <h2>4. Ứng dụng thực tế trong AI & Data Science</h2>
  <h3>4.1. Nén ảnh và Khử nhiễu (Image Compression & Denoising)</h3>
  <p>Một bức ảnh xám kích thước $m \\times n$ lưu trữ $m \\times n$ số thực. Thay vì lưu toàn bộ, ta chỉ lưu $k$ bộ $(\\mathbf{u}_i, \\sigma_i, \\mathbf{v}_i)$ với chi phí lưu trữ $k(m + n + 1)$. Với $k \\ll \\min(m, n)$, ta tiết kiệm tới 80-90% dung lượng mà vẫn giữ nguyên các đặc trưng trực quan của bức ảnh.</p>

  <h3>4.2. Giảm chiều dữ liệu PCA (Principal Component Analysis)</h3>
  <p>Với ma trận dữ liệu đã chuẩn hóa tâm $\\tilde{X} \\in \\mathbb{R}^{N \\times D}$, phân tích SVD $\\tilde{X} = U \\Sigma V^T$ cho ra ngay các trục thành phần chính (Principal Components) chính là các cột của $V$. Tọa độ của dữ liệu trên không gian $k$ chiều mới là $Z = \\tilde{X} V_k$.</p>
</div>
    `,
    explanationMarkdown: `## Tóm tắt công thức SVD

$$A = U \\Sigma V^T = \\sum_{i=1}^r \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T$$

- **Left singular vectors**: $A A^T \\mathbf{u}_i = \\sigma_i^2 \\mathbf{u}_i$
- **Right singular vectors**: $A^T A \\mathbf{v}_i = \\sigma_i^2 \\mathbf{v}_i$
- **Mối liên hệ chuyển giao**: $A \\mathbf{v}_i = \\sigma_i \\mathbf{u}_i$`
  }
};
