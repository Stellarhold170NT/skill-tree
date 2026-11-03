"""Tạo/kiểm tra question set vàng tiếng Việt cho Corpus SWEBOK v4 (idempotent).

Sử dụng: /opt/venv/bin/python src/skilltree/prep/build_questions.py [--check]

- Question set do người soạn trực tiếp (không gọi LLM), mỗi câu gắn đúng
  knowledge area (tên tiếng Anh) và source_section của SWEBOK v4.
- Script ghi `corpora/swebok-v4/questions.jsonl`, mỗi dòng:
  {"id", "ka", "question", "gold_answer", "source_section"}
  question + gold_answer = TIẾNG VIỆT; ka + source_section giữ tiếng Anh.
- Idempotent: ghi đè cùng tên file, nội dung deterministic.
- Validation: >=40 câu, id duy nhất, đủ 5 trường, >=8 knowledge area.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
CORPUS_DIR = REPO_ROOT / "corpora" / "swebok-v4"
QUESTIONS_NAME = "questions.jsonl"

# ---------------------------------------------------------------------------
# Question set vàng — soạn tay từ nội dung SWEBOK Guide v4.0 (Task 2).
# 40 câu / 15 knowledge areas. Xem reports/task-2-report.md để biết phân bố
# và kết quả spot-check 10 câu ngẫu nhiên (seed=42).
# ---------------------------------------------------------------------------
QUESTIONS: list[dict] = [
    # ------------------------- Software Requirements (6) -------------------
    {
        "id": "SWEBOK-Q01",
        "ka": "Software Requirements",
        "question": "Theo SWEBOK v4, định nghĩa chính thức của một yêu cầu phần mềm (software requirement) là gì?",
        "gold_answer": "Một yêu cầu phần mềm là: (1) điều kiện hoặc năng lực cần thiết cho người dùng để giải quyết một vấn đề hoặc đạt một mục tiêu; (2) điều kiện hoặc năng lực mà hệ thống hay thành phần hệ thống phải đáp ứng/thuộc có để thỏa mãn hợp đồng, tiêu chuẩn, đặc tả hoặc tài liệu chính thức khác; (3) biểu diễn được tài liệu hóa của điều kiện hoặc năng lực nêu trên.",
        "source_section": "Software Requirements — 1.1. Definition of a Software Requirement",
    },
    {
        "id": "SWEBOK-Q02",
        "ka": "Software Requirements",
        "question": "SWEBOK v4 nêu hai vấn đề liên quan đến yêu cầu phổ biến nhất của các dự án phần mềm thực tế là gì?",
        "gold_answer": "Hai vấn đề chính là: (1) không đầy đủ (incompleteness) — các yêu cầu của bên liên quan và chi tiết cần thiết tồn tại nhưng chưa được tiết lộ và truyền đạt cho kỹ sư phần mềm; (2) mơ hồ (ambiguity) — yêu cầu được truyền đạt theo cách mở cho nhiều cách diễn giải, trong khi chỉ có một cách hiểu là đúng.",
        "source_section": "Software Requirements — Introduction",
    },
    {
        "id": "SWEBOK-Q03",
        "ka": "Software Requirements",
        "question": "Yêu cầu chức năng (functional requirements) của phần mềm được định nghĩa như thế nào?",
        "gold_answer": "Yêu cầu chức năng chỉ định các hành vi quan sát được mà phần mềm phải cung cấp — tức các chính sách cần được thực thi và các quy trình cần được tiến hành. Ví dụ trong phần mềm ngân hàng: 'một tài khoản phải luôn có ít nhất một khách hàng là chủ sở hữu' và 'số dư tài khoản không bao giờ được âm'.",
        "source_section": "Software Requirements — 1.4. Functional Requirements",
    },
    {
        "id": "SWEBOK-Q04",
        "ka": "Software Requirements",
        "question": "Yêu cầu phi chức năng (nonfunctional requirements) được chia thành hai loại nào, và ràng buộc chất lượng dịch vụ (quality of service) có ví dụ nào?",
        "gold_answer": "Yêu cầu phi chức năng được chia thành: ràng buộc công nghệ (technology constraints) — bắt buộc hoặc cấm dùng công nghệ/hạ tầng cụ thể — và ràng buộc chất lượng dịch vụ (quality of service constraints). Ví dụ chất lượng dịch vụ: thời gian phản hồi (response time), thông lượng (throughput), độ chính xác (accuracy), độ tin cậy (reliability) và khả năng mở rộng (scalability).",
        "source_section": "Software Requirements — 1.5. Nonfunctional Requirements; 1.6. Technology Constraints; 1.7. Quality of Service Constraints",
    },
    {
        "id": "SWEBOK-Q05",
        "ka": "Software Requirements",
        "question": "Theo phân tích yêu cầu cơ bản, mỗi yêu cầu riêng lẻ nên có những thuộc tính đáng mong nào?",
        "gold_answer": "Mỗi yêu cầu nên: không mơ hồ (chỉ diễn giải được theo một cách), kiểm thử được (đã lượng hóa, chứng minh được đúng/sai), có tính ràng buộc (khách hàng sẵn sàng trả tiền và không muốn bỏ nó), nguyên tử (thể hiện một quyết định duy nhất), phản ánh nhu cầu thật của bên liên quan, dùng vốn từ của bên liên quan, và được mọi bên liên quan chấp nhận.",
        "source_section": "Software Requirements — 3.1. Basic Requirements Analysis",
    },
    {
        "id": "SWEBOK-Q06",
        "ka": "Software Requirements",
        "question": "Kỹ thuật '5-whys' trong phân tích yêu cầu dùng để làm gì và dừng lặp câu hỏi 'why' khi nào?",
        "gold_answer": "5-whys dùng khi phát biểu thu được thực chất là một giải pháp chứ không phải vấn đề thật, bằng cách hỏi đi hỏi lại 'Vì sao đây là yêu cầu?' để hội tụ về vấn đề đúng. Việc lặp dừng khi câu trả lời là: 'Nếu không làm điều đó, vấn đề của bên liên quan chưa được giải quyết'; thường đạt vấn đề thật sau hai đến ba vòng.",
        "source_section": "Software Requirements — 3.1. Basic Requirements Analysis",
    },
    # ------------------------- Software Architecture (4) -------------------
    {
        "id": "SWEBOK-Q07",
        "ka": "Software Architecture",
        "question": "Định nghĩa 'kiến trúc của một hệ thống' theo SWEBOK v4 là gì và chứa những ý chính nào?",
        "gold_answer": "Kiến trúc (của một hệ thống) là 'các khái niệm hoặc thuộc tính cơ bản của một hệ thống trong môi trường của nó, được thể hiện trong các phần tử, mối quan hệ giữa chúng, và trong các nguyên tắc thiết kế và tiến hóa của nó'. Hai ý chính: kiến trúc chỉ quan tâm điều gì là cơ bản (không phải mọi phần tử, liên kết hay giao diện), và kiến trúc xét hệ thống trong môi trường của nó — nhìn ra ngoài biên hệ thống gồm con người, tổ chức, phần mềm, phần cứng mà hệ thống tương tác.",
        "source_section": "Software Architecture — 1.1. The Senses of 'Architecture'",
    },
    {
        "id": "SWEBOK-Q08",
        "ka": "Software Architecture",
        "question": "Architecture view và architecture viewpoint khác nhau thế nào trong mô tả kiến trúc?",
        "gold_answer": "Architecture view biểu diễn một hoặc nhiều khía cạnh của kiến trúc để đáp ứng một hoặc nhiều concern — ví dụ logical view (thỏa mãn yêu cầu chức năng), process view (đồng thời/concurrency), physical view (triển khai), development view (chia nhỏ thành đơn vị cài đặt). Còn architecture viewpoint là các quy ước được tài liệu hóa hướng dẫn việc tạo, diễn giải và sử dụng các view — mỗi viewpoint nối các concern của nhóm bên liên quan với một tập quy ước.",
        "source_section": "Software Architecture — 2.1. Architecture Views and Viewpoints",
    },
    {
        "id": "SWEBOK-Q09",
        "ka": "Software Architecture",
        "question": "Architectural style khác architectural pattern như thế nào? Cho ví dụ mỗi loại.",
        "gold_answer": "Architectural style là cách thức xây dựng đặc thù tạo ra các đặc trưng của hệ thống phần mềm, thường thể hiện tổ chức quy mô lớn (ví dụ: layered, call-and-return, pipes and filters, blackboard, microservices). Architectural pattern là giải pháp chung cho một vấn đề tái diễn trong bối cảnh của hệ thống phần mềm và không nhất thiết áp dụng cho toàn hệ thống.",
        "source_section": "Software Architecture — 2.2. Architecture Patterns, Styles and Reference Architectures",
    },
    {
        "id": "SWEBOK-Q10",
        "ka": "Software Architecture",
        "question": "Định luật Conway (Conway's Law) phát biểu điều gì?",
        "gold_answer": "Conway's Law phát biểu rằng 'các tổ chức thiết kế hệ thống... bị ràng buộc để tạo ra các thiết kế vốn là bản sao của cấu trúc giao tiếp của chính các tổ chức đó'. Các nghiên cứu thực nghiệm cũng quan sát thấy kiến trúc hệ thống thường phản chiếu cấu trúc truyền thông của tổ chức xây dựng nó — điều này có thể là điểm mạnh hoặc điểm yếu tùy hệ thống và tổ chức.",
        "source_section": "Software Architecture — 1.3. Uses of Architecture",
    },
    # ------------------------- Software Design (3) -------------------------
    {
        "id": "SWEBOK-Q11",
        "ka": "Software Design",
        "question": "Thiết kế phần mềm diễn ra qua ba giai đoạn nào?",
        "gold_answer": "Ba giai đoạn: (1) thiết kế kiến trúc của hệ thống phần mềm (architectural design); (2) thiết kế cấp cao hoặc hướng bên ngoài của hệ thống và các thành phần (high-level or external-facing design); (3) thiết kế chi tiết hoặc hướng bên trong (detailed or internal-facing design). Thiết kế kiến trúc là một phần của quá trình architecting, được trình bày trong KA Software Architecture.",
        "source_section": "Software Design — Introduction",
    },
    {
        "id": "SWEBOK-Q12",
        "ka": "Software Design",
        "question": "Software Design Description (SDD) là gì và dùng để làm gì?",
        "gold_answer": "SDD là tài liệu ghi lại kết quả của thiết kế phần mềm — một biểu diễn của phần mềm được tạo ra để hỗ trợ phân tích, lập kế hoạch, triển khai và ra quyết định; SDD dùng làm phương tiện truyền đạt thông tin thiết kế và có thể xem như bản vẽ chi tiết (blueprint) hoặc mô hình của hệ thống, bao gồm việc tinh chỉnh phần mềm thành các thành phần, tổ chức các thành phần đó và định nghĩa giao diện giữa chúng và với bên ngoài.",
        "source_section": "Software Design — Introduction (Software Design Description)",
    },
    {
        "id": "SWEBOK-Q13",
        "ka": "Software Design",
        "question": "Nguyên lý Abstraction và nguyên lý Separation of Concerns (SoC) trong thiết kế phần mềm nghĩa là gì?",
        "gold_answer": "Abstraction là 'cái nhìn về một đối tượng tập trung vào thông tin liên quan đến một mục đích cụ thể và bỏ qua phần thông tin còn lại'. Separation of Concerns là xác định và tách các vùng quan tâm (concern) của thiết kế để có thể tập trung xử lý từng concern một cách độc lập; Dijkstra nhận định SoC 'dù không bao giờ hoàn hảo, vẫn là kỹ thuật duy nhất để sắp xếp tư duy một cách hiệu quả'.",
        "source_section": "Software Design — 1.4. Software Design Principles",
    },
    # ------------------------- Software Construction (3) -------------------
    {
        "id": "SWEBOK-Q14",
        "ka": "Software Construction",
        "question": "Software construction được định nghĩa gồm những hoạt động nào?",
        "gold_answer": "Software construction là việc tạo lập và bảo trì chi tiết phần mềm thông qua: lập trình (coding), xác minh (verification), kiểm thử đơn vị (unit testing), kiểm thử tích hợp (integration testing) và gỡ lỗi (debugging).",
        "source_section": "Software Construction — Introduction",
    },
    {
        "id": "SWEBOK-Q15",
        "ka": "Software Construction",
        "question": "Năm khái niệm nền tảng (fundamentals) của software construction là gì?",
        "gold_answer": "Năm khái niệm nền tảng: (1) giảm thiểu độ phức tạp (minimizing complexity); (2) dự đoán và đón nhận thay đổi (anticipating and embracing change); (3) xây dựng để có thể xác minh (constructing for verification); (4) tái sử dụng tài sản (reusing assets); (5) áp dụng chuẩn mực trong xây dựng (applying standards in construction).",
        "source_section": "Software Construction — 1. Software Construction Fundamentals",
    },
    {
        "id": "SWEBOK-Q16",
        "ka": "Software Construction",
        "question": "Assertion là gì và lập trình phòng thủ (defensive programming) nghĩa là gì?",
        "gold_answer": "Assertion là một vị từ khả thi (executable predicate) được đặt vào chương trình — thường là một routine hay macro — cho phép kiểm tra lúc chạy (runtime); chúng đặc biệt hữu ích trong chương trình độ tin cậy cao và thường được biên dịch ra khỏi mã bản phát hành để không ảnh hưởng hiệu năng. Defensive programming là bảo vệ một routine khỏi bị hỏng do đầu vào không hợp lệ, ví dụ kiểm tra giá trị mọi tham số đầu vào và quyết định cách xử lý đầu vào xấu.",
        "source_section": "Software Construction — 4.4. Assertions, Design by Contract, and Defensive Programming",
    },
    # ------------------------- Software Testing (6) ------------------------
    {
        "id": "SWEBOK-Q17",
        "ka": "Software Testing",
        "question": "SWEBOK v4 định nghĩa kiểm thử phần mềm bằng cụm từ nào và các từ khóa trong định nghĩa đó là gì?",
        "gold_answer": "Kiểm thử phần mềm là 'xác nhận động (dynamic validation) rằng một hệ thống đang kiểm thử (SUT) cung cấp các hành vi kỳ vọng trên một tập hữu hạn các test case được chọn thích hợp từ miền thực thi thường là vô hạn'. Các từ khóa: System Under Test, test case, dynamic, finite, selected, expected.",
        "source_section": "Software Testing — Introduction",
    },
    {
        "id": "SWEBOK-Q18",
        "ka": "Software Testing",
        "question": "Tại sao kiểm thử triệt để (exhaustive testing) là không khả thi trong thực tế?",
        "gold_answer": "Vì ngay cả với một SUT đơn giản, thực thi toàn bộ các test case có thể (kiểm thử vét cạn) có thể mất nhiều tháng hoặc nhiều năm. Do đó kiểm thử thực tế chỉ nhắm vào một tập con các test case được xác định theo các tiêu chí chọn khác nhau — luôn là sự đánh đổi giữa nguồn lực/tiến trình hữu hạn và yêu cầu kiểm thử vốn vô hạn.",
        "source_section": "Software Testing — Introduction",
    },
    {
        "id": "SWEBOK-Q19",
        "ka": "Software Testing",
        "question": "Phân biệt 'kiểm thử để xác nhận' (testing for validation) và 'kiểm thử để xác minh' (testing for verification).",
        "gold_answer": "Hành vi quan sát được của SUT được đối chiếu với nhu cầu người dùng thì gọi là testing for validation; nếu đối chiếu với đặc tả (specification) thì gọi là testing for verification. Ngoài ra có thể đối chiếu với hành vi dự kiến từ các yêu cầu ngầm định hoặc kỳ vọng.",
        "source_section": "Software Testing — Introduction",
    },
    {
        "id": "SWEBOK-Q20",
        "ka": "Software Testing",
        "question": "Kể các chiến lược kiểm thử tích hợp (integration testing) điển hình được nêu trong SWEBOK v4.",
        "gold_answer": "Các chiến lược tích hợp kiểm thử điển hình: top-down (từ trên xuống), bottom-up (từ dưới lên), mixed hay sandwiched (kết hợp hai chiều) và big bang. Kiểm thử tích hợp là hoạt động liên tục, có thể thực hiện ở mỗi giai đoạn phát triển, và có thể nhắm cả giao diện ngoài với ứng dụng/phần cứng/môi trường khác.",
        "source_section": "Software Testing — 2.1.2. Integration Testing",
    },
    {
        "id": "SWEBOK-Q21",
        "ka": "Software Testing",
        "question": "Kiểm thử hồi quy (regression testing) được định nghĩa thế nào và thường được thực hiện khi nào?",
        "gold_answer": "Regression testing là 'kiểm thử lại có chọn lọc một SUT để xác minh rằng các sửa đổi đã không gây ra các tác dụng ngoài ý muốn và SUT vẫn tuân thủ các yêu cầu đã đặc tả'; trên thực tế là chứng minh SUT vẫn vượt qua các test case đã từng vượt qua (nên còn gọi non-regression testing). Đây là hoạt động nền tảng của Agile, DevOps, TDD và phát triển liên tục, thường chạy sau kiểm thử tích hợp và trước khi triển khai vào production/operation.",
        "source_section": "Software Testing — 2.2.5. Regression Testing",
    },
    {
        "id": "SWEBOK-Q22",
        "ka": "Software Testing",
        "question": "Kỹ thuật equivalence partitioning và boundary value analysis hoạt động như thế nào?",
        "gold_answer": "Equivalence partitioning chia miền đầu vào thành các tập con (lớp tương đương) theo một tiêu chí nhất định — ví dụ phân biệt đầu vào hợp lệ và không hợp lệ — và thường lấy một test case đại diện từ mỗi lớp. Boundary value analysis chọn test case tại hoặc gần biên của miền đầu vào, vì nhiều lỗi có xu hướng tập trung gần các giá trị cực trị; bản mở rộng là robustness testing còn chọn cả giá trị ngoài miền đầu vào.",
        "source_section": "Software Testing — 3.1.1. Equivalence Partitioning; 3.1.2. Boundary Value Analysis",
    },
    # ----------------- Software Engineering Operations (1) ------------------
    {
        "id": "SWEBOK-Q23",
        "ka": "Software Engineering Operations",
        "question": "Software engineering operations là gì?",
        "gold_answer": "Software engineering operations là tập hợp các hoạt động và nhiệm vụ cần thiết để triển khai (deploy), vận hành (operate) và hỗ trợ (support) một ứng dụng hay hệ thống phần mềm trong khi bảo toàn tính toàn vẹn và ổn định của nó. Các hoạt động này gồm triển khai và cấu hình phần mềm trong môi trường vận hành mục tiêu, cùng giám sát và quản lý ứng dụng khi đang sử dụng cho đến khi ngừng hoạt động.",
        "source_section": "Software Engineering Operations — Introduction",
    },
    # ------------------------- Software Maintenance (2) --------------------
    {
        "id": "SWEBOK-Q24",
        "ka": "Software Maintenance",
        "question": "Mục tiêu của bảo trì phần mềm theo chuẩn ISO/IEC/IEEE 14764 là gì?",
        "gold_answer": "Theo ISO/IEC/IEEE 14764, mục tiêu của bảo trì phần mềm là sửa đổi phần mềm hiện có trong khi vẫn bảo toàn tính toàn vẹn (integrity) của nó. SWEBOK v4 còn định nghĩa bảo trì là tổng thể các hoạt động cần thiết để cung cấp hỗ trợ hiệu quả về chi phí cho phần mềm đang vận hành.",
        "source_section": "Software Maintenance — 1.1. Definitions and Terminology",
    },
    {
        "id": "SWEBOK-Q25",
        "ka": "Software Maintenance",
        "question": "Các nhóm bảo trì phần mềm được chuẩn hóa trong SWEBOK v4 gồm những loại nào?",
        "gold_answer": "Năm nhóm được chuẩn hóa để phân loại yêu cầu bảo trì: corrective (sửa các lỗi phát hiện sau bàn giao), preventive (sửa lỗi tiềm ẩn trước khi xảy ra trên hệ thống chạy thật), adaptive (giữ phần mềm dùng được trong môi trường tiến hóa), additive (bổ sung chức năng/tính năng mới) và perfective (tăng cường cho người dùng, cải thiện tài liệu và hiệu năng/tính bảo trì). ISO/IEC/IEEE 14764 còn định nghĩa nhóm thứ sáu — emergency maintenance (sửa tạm thời, không theo lịch, để giữ hệ thống vận hành).",
        "source_section": "Software Maintenance — 1.6. Categories of Software Maintenance",
    },
    # ---------------- Software Configuration Management (2) ----------------
    {
        "id": "SWEBOK-Q26",
        "ka": "Software Configuration Management",
        "question": "Software configuration management (SCM) được định nghĩa chính thức như thế nào?",
        "gold_answer": "SCM được định nghĩa chính thức là 'quy trình áp dụng quản lý cấu hình (CM) trong suốt vòng đời phần mềm để bảo đảm tính đầy đủ và đúng đắn của các configuration item (CI)'. CM là kỷ luật áp dụng chỉ đạo và giám sát kỹ thuật lẫn hành chính để nhận diện và ghi nhận đặc tính chức năng/vật lý của một CI, kiểm soát thay đổi các đặc tính đó, ghi nhận và báo cáo trạng thái xử lý thay đổi, và xác minh tuân thủ yêu cầu đã định.",
        "source_section": "Software Configuration Management — Introduction",
    },
    {
        "id": "SWEBOK-Q27",
        "ka": "Software Configuration Management",
        "question": "SCM kiểm soát điều gì và bao gồm những hoạt động chính nào?",
        "gold_answer": "SCM kiểm soát sự tiến hóa và tính toàn vẹn của sản phẩm bằng cách nhận diện các phần tử của sản phẩm (gọi là CI), quản lý và kiểm soát thay đổi, và xác minh, ghi nhận, báo cáo thông tin cấu hình. Các hoạt động chính gồm: quản lý và lập kế hoạch quy trình SCM, nhận diện cấu hình phần mềm, kiểm soát thay đổi cấu hình, kế toán trạng thái cấu hình (SCSA), kiểm toán cấu hình, và quản lý phát hành cùng bàn giao (release management and delivery).",
        "source_section": "Software Configuration Management — 1. Management of the SCM Process",
    },
    # ------------- Software Engineering Management (2) ---------------------
    {
        "id": "SWEBOK-Q28",
        "ka": "Software Engineering Management",
        "question": "Quản trị kỹ thuật phần mềm (software engineering management) bao gồm những hoạt động nào?",
        "gold_answer": "Software engineering management là tập hợp các hoạt động công việc liên quan đến lập kế hoạch, ước lượng, đo lường, kiểm soát, phối hợp, lãnh đạo và quản lý các yếu tố rủi ro của một dự án phần mềm, nhằm giúp các sản phẩm phần mềm và dịch vụ kỹ thuật phần mềm được bàn giao một cách hiệu quả, hiệu lực và mang lại lợi ích cho các bên liên quan.",
        "source_section": "Software Engineering Management — Introduction",
    },
    {
        "id": "SWEBOK-Q29",
        "ka": "Software Engineering Management",
        "question": "Work Breakdown Structure (WBS) là gì và có chứa các baseline chi phí/tiến độ không?",
        "gold_answer": "WBS là tài liệu quản lý dự án quan trọng, ứng dụng kỹ thuật chia nhỏ công việc thành các nhiệm vụ nhỏ hơn để công việc dễ quản lý và tiếp cận hơn; WBS ban đầu thường được phát triển trong hoạt động Khởi tạo và Định nghĩa phạm vi của dự án. WBS có thể dùng để tổ chức theo dõi chi phí và tiến độ, nhưng bản thân nó không chứa các baseline chi phí và tiến độ — kế hoạch tiến độ được phát triển trong hoạt động lập kế hoạch dự án tiếp theo.",
        "source_section": "Software Engineering Management — 1.2. Initiation and Scope Definition (Work Breakdown Structure)",
    },
    # ------------- Software Engineering Process (2) ------------------------
    {
        "id": "SWEBOK-Q30",
        "ka": "Software Engineering Process",
        "question": "Mô hình thác nước (waterfall model) có những đặc điểm gì?",
        "gold_answer": "Waterfall là một mô hình vòng đời dự đoán (predictive): các pha phát triển — concept, requirements, design, implementation, test, installation/checkout — được thực hiện theo thứ tự (có thể chồng lấn nhưng ít hoặc không lặp), và một pha không được bắt đầu cho tới khi pha trước hoàn thành. Đây là mô hình hướng tài liệu (document-driven), từng giúp hệ thống hóa việc phát triển phần mềm và ứng phó 'khủng hoảng phần mềm'; nhiều biến thể như V-model đã ra đời từ đó.",
        "source_section": "Software Engineering Process — 2.5. Development Life Cycle Models and Their Engineering Dimension",
    },
    {
        "id": "SWEBOK-Q31",
        "ka": "Software Engineering Process",
        "question": "Cách tiếp cận GQM (Goal-Question-Metric) dựa trên nguyên lý nào?",
        "gold_answer": "GQM dựa trên Quality Improvement Paradigm của Basili: đặt các mục tiêu có thể đo lường được, thay đổi một điều gì đó, rồi đánh giá tác động của thay đổi đó. Khi kết quả đánh giá là tích cực thì coi như đã có sự cải tiến.",
        "source_section": "Software Engineering Process — 3.2. Goal-Question-Metric (GQM)",
    },
    # ------------- Software Engineering Models and Methods (2) -------------
    {
        "id": "SWEBOK-Q32",
        "ka": "Software Engineering Models and Methods",
        "question": "Mô hình và phương pháp kỹ thuật phần mềm (models and methods) đóng vai trò gì?",
        "gold_answer": "Chúng áp đặt cấu trúc lên kỹ thuật phần mềm để làm cho nó có hệ thống, lặp lại được và hướng tới thành công hơn. Mô hình cung cấp cách tiếp cận giải quyết vấn đề, ký hiệu và quy trình để xây dựng và phân tích mô hình; phương pháp cung cấp cách tiếp cận có hệ thống để đặc tả, thiết kế, xây dựng, kiểm thử và xác minh phần mềm cùng các sản phẩm công việc đi kèm.",
        "source_section": "Software Engineering Models and Methods — Introduction",
    },
    {
        "id": "SWEBOK-Q33",
        "ka": "Software Engineering Models and Methods",
        "question": "Bốn nhóm phương pháp được trình bày trong chủ đề Software Engineering Methods là gì?",
        "gold_answer": "Bốn nhóm: heuristic methods (phương pháp kinh nghiệm/heuristic), formal methods (phương pháp hình thức), prototyping methods (phương pháp nguyên mẫu) và agile methods (phương pháp linh hoạt).",
        "source_section": "Software Engineering Models and Methods — 4. Software Engineering Methods",
    },
    # ------------- Software Quality (2) -------------------------------------
    {
        "id": "SWEBOK-Q34",
        "ka": "Software Quality",
        "question": "Phil Crosby và Watts Humphrey định nghĩa chất lượng như thế nào?",
        "gold_answer": "Phil Crosby định nghĩa chất lượng là 'sự tuân thủ yêu cầu' (conformance to requirements). Watts Humphrey coi chất lượng là đạt được các mức xuất sắc của 'fitness for use' (phù hợp để sử dụng). Còn IBM đặt ra cụm từ 'market-driven quality' với quan điểm 'khách hàng là người phán xét cuối cùng'.",
        "source_section": "Software Quality — Introduction",
    },
    {
        "id": "SWEBOK-Q35",
        "ka": "Software Quality",
        "question": "Phân biệt software quality và software quality requirements ('the -ilities').",
        "gold_answer": "Software quality requirements (tức Quality of Service Constraints trong KA Software Requirements) là các thuộc tính hay ràng buộc áp lên yêu cầu chức năng — nói lên hệ thống làm việc thế nào. Còn chất lượng phần mềm theo nghĩa rộng: chất lượng sản phẩm đạt được bằng việc tuân thủ mọi yêu cầu; và chất lượng phụ thuộc vào mức độ mà các yêu cầu đã lập phản ánh chính xác nhu cầu, mong muốn và kỳ vọng của các bên liên quan.",
        "source_section": "Software Quality — Introduction",
    },
    # ------------- Software Security (3) ------------------------------------
    {
        "id": "SWEBOK-Q36",
        "ka": "Software Security",
        "question": "Ba thuộc tính CIA trong an toàn thông tin được định nghĩa thế nào?",
        "gold_answer": "Confidentiality (tính bảo mật): bảo đảm thông tin không bị tiết lộ cho những cá nhân, thực thể hoặc tiến trình không được phép. Integrity (tính toàn vẹn): thuộc tính của tính chính xác và đầy đủ. Availability (tính sẵn sàng): thuộc tính có thể truy cập và sử dụng khi cần bởi một thực thể được cấp quyền.",
        "source_section": "Software Security — 1.2. Information Security",
    },
    {
        "id": "SWEBOK-Q37",
        "ka": "Software Security",
        "question": "Theo góc độ chất lượng sản phẩm, 'software security' trong SWEBOK v4 là gì?",
        "gold_answer": "Software security là một đặc tính chất lượng sản phẩm, biểu thị mức độ mà sản phẩm hay hệ thống bảo vệ thông tin và dữ liệu sao cho con người hoặc các sản phẩm/hệ thống khác chỉ truy cập dữ liệu phù hợp với kiểu và mức ủy quyền của chúng.",
        "source_section": "Software Security — 1.1. Software Security",
    },
    {
        "id": "SWEBOK-Q38",
        "ka": "Software Security",
        "question": "Chuẩn ISO/IEC 27001 quy định về điều gì?",
        "gold_answer": "ISO/IEC 27001:2022 quy định các yêu cầu để thiết lập, triển khai, duy trì và cải tiến liên tục một hệ thống quản lý an toàn thông tin (ISMS — Information Security Management System) trong bối cảnh tổ chức. ISMS là kế hoạch được tài liệu hóa để quản lý an toàn liên quan công nghệ của tổ chức.",
        "source_section": "Software Security — 2.2. Information Security Management System",
    },
    # ------------- Software Engineering Professional Practice (1) ----------
    {
        "id": "SWEBOK-Q39",
        "ka": "Software Engineering Professional Practice",
        "question": "'Professional practice' (thực hành nghề nghiệp) trong kỹ thuật phần mềm được hiểu thế nào?",
        "gold_answer": "Professional practice là cách thức tiến hành dịch vụ để đạt các tiêu chuẩn hay tiêu chí nhất định, áp dụng cả trong quá trình thực hiện dịch vụ lẫn sản phẩm cuối của dịch vụ. Các tiêu chuẩn này bao gồm cả khía cạnh kỹ thuật và phi kỹ thuật; khái niệm này đặc biệt gắn với nghề có thân tri thức được chấp nhận chung, bộ luật đạo đức và ứng xử nghề nghiệp với hình phạt cho vi phạm, quy trình kiểm định/chứng nhận/cấp phép, và các hội nghề nghiệp.",
        "source_section": "Software Engineering Professional Practice — Introduction",
    },
    # ------------- Software Engineering Economics (1) ----------------------
    {
        "id": "SWEBOK-Q40",
        "ka": "Software Engineering Economics",
        "question": "Theo SWEBOK v4, 'kinh tế học là khoa học của cái gì' và câu hỏi nền tảng của engineering economics là gì?",
        "gold_answer": "Kinh tế học là 'khoa học của sự lựa chọn, không phải khoa học của tiền' (the science of choice, not the science of money). Engineering economics là nhánh vi kinh tế học ứng dụng, đặt câu hỏi nền tảng: 'Việc đầu tư nguồn lực hữu hạn của doanh nghiệp vào nỗ lực kỹ thuật này có phục vụ tốt nhất lợi ích của doanh nghiệp hay không, hay cùng khoản đầu tư đó ở nơi khác sẽ sinh lợi nhuận cao hơn?'. Kỹ thuật được hiểu là 'tìm sự cân bằng giữa cái khả thi về kỹ thuật và cái chấp nhận được về kinh tế'.",
        "source_section": "Software Engineering Economics — Introduction",
    },
]


def validate(questions: list[dict]) -> list[str]:
    errs: list[str] = []
    ids = [q["id"] for q in questions]
    if len(ids) != len(set(ids)):
        errs.append("Trung lap id")
    if len(questions) < 40:
        errs.append(f"So cau {len(questions)} < 40")
    required = ("id", "ka", "question", "gold_answer", "source_section")
    for q in questions:
        for f in required:
            if not str(q.get(f, "")).strip():
                errs.append(f"{q.get('id', '?')}: thieu truong {f}")
    n_ka = len({q["ka"] for q in questions})
    if n_ka < 8:
        errs.append(f"Chi phu {n_ka} knowledge area (< 8)")
    return errs


def build(path: Path) -> dict:
    errs = validate(QUESTIONS)
    if errs:
        raise SystemExit("[build_questions] VALIDATION LOI:\n" + "\n".join(errs))
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for q in QUESTIONS:
            f.write(json.dumps(q, ensure_ascii=False) + "\n")

    dist = Counter(q["ka"] for q in QUESTIONS)
    stats = {
        "file": str(path.relative_to(REPO_ROOT)),
        "questions": len(QUESTIONS),
        "knowledge_areas": len(dist),
        "distribution": dict(sorted(dist.items(), key=lambda kv: -kv[1])),
    }
    print("[build_questions]", json.dumps(stats, ensure_ascii=False))
    for ka, n in stats["distribution"].items():
        print(f"  - {ka:<48} {n}")
    return stats


def main() -> int:
    ap = argparse.ArgumentParser(description="Tao questions.jsonl (question setvang tieng Viet)")
    ap.add_argument("--out", type=Path, default=CORPUS_DIR / QUESTIONS_NAME)
    ap.add_argument("--check", action="store_true",
                    help="Chi kiem tra file hien co trung khop voi tap cau hoi nhung trong code")
    args = ap.parse_args()

    if args.check:
        if not args.out.exists():
            print(f"[build_questions] LOI: khong thay {args.out}", file=sys.stderr)
            return 1
        existing = [json.loads(l) for l in args.out.read_text(encoding="utf-8").splitlines() if l.strip()]
        if existing == QUESTIONS:
            print(f"[build_questions] OK: {args.out} khop dung bo {len(QUESTIONS)} cau")
            return 0
        print(f"[build_questions] LOI: {args.out} KHONG khop bo cau hoi trong code", file=sys.stderr)
        return 1

    build(args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
