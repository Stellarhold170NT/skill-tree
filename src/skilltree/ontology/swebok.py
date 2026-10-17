"""Stage C — Ontology SWEBOK cho C5 (rebuild với graph_model Pydantic).

Thiết kế theo review (Claude):
- Fault ≈ Defect ≈ Bug là MỘT khái niệm; FailureMode và HumanError RIÊNG (IEEE 610.12)
- EdgeType có OTHER làm lối thoát; tỷ lệ OTHER là chỉ số sức khỏe của ontology
- confidence 0-1 do LLM tự chấm, phải hiệu chỉnh theo mẫu audit trước khi dùng prune
- source_chunks là DANH SÁCH (một cạnh được nhiều chunk hỗ trợ)
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

NodeType = Literal[
    "KnowledgeArea", "Activity", "Task", "Technique", "Method",
    "Principle", "QualityAttribute", "Artifact", "Tool", "Metric",
    "Fault", "FailureMode", "HumanError", "Concept",
]

EdgeType = Literal[
    "PART_OF", "SUBTYPE_OF", "REQUIRES", "DEPENDS_ON", "CONSTRAINS",
    "VERIFIES", "VALIDATES", "MITIGATES", "CAUSES", "INJECTS",
    "PRODUCES", "CONSUMES", "MEASURED_BY", "USESTOOL", "OTHER",
]

PREDICATE_DOC: dict[str, str] = {
    "PART_OF": "B là bộ phận/bước cấu thành A (Activity thuộc KnowledgeArea, Task thuộc Activity)",
    "SUBTYPE_OF": "A là dạng con của B (phân loại khái niệm↔khái niệm, thay cho is_a)",
    "REQUIRES": "A cần B tồn tại trước để thực hiện",
    "DEPENDS_ON": "A phụ thuộc kết quả/cấu hình của B",
    "CONSTRAINS": "A ràng buộc/đặt giới hạn cho B",
    "VERIFIES": "A kiểm tra B có thỏa mãn đặc tả không (kỹ thuật kiểm tra artifact/property, KHÔNG kiểm tra activity)",
    "VALIDATES": "A xác nhận B đáp ứng nhu cầu người dùng/thực tế",
    "MITIGATES": "A làm giảm thiểu rủi ro/lỗi B",
    "CAUSES": "A gây ra B (Fault gây FailureMode)",
    "INJECTS": "HumanError đưa Fault vào artifact",
    "PRODUCES": "A tạo ra B (artifact đầu ra)",
    "CONSUMES": "A dùng B làm đầu vào",
    "MEASURED_BY": "A được đo bằng Metric B",
    "USESTOOL": "A sử dụng công cụ B",
    "OTHER": "Quan hệ thật nhưng không thuộc 13 loại trên — luôn được phép, và tỷ lệ rơi vào nó nếu >20% nghĩa là enum cần sửa",
}


class SWEBOKNode(BaseModel):
    name: str
    type: NodeType = "Concept"
    description: str = ""
    source_chunks: List[str] = Field(default_factory=list)


class SWEBOKEdge(BaseModel):
    source_name: str
    target_name: str
    relationship: EdgeType = "OTHER"
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    source_chunks: List[str] = Field(default_factory=list)


class SWEBOKGraph(BaseModel):
    summary: str = ""
    nodes: List[SWEBOKNode] = Field(default_factory=list)
    edges: List[SWEBOKEdge] = Field(default_factory=list)

    @field_validator("edges")
    @classmethod
    def _edge_names_nonempty(cls, v):
        for e in v:
            if not (e.source_name or "").strip() or not (e.target_name or "").strip():
                raise ValueError("edge source_name/target_name phải khác rỗng")
        return v

    @field_validator("nodes")
    @classmethod
    def _node_names_unique(cls, v):
        names = [n.name.strip().lower() for n in v]
        if len(names) != len(set(names)):
            raise ValueError("node name phải unique sau normalize")
        return v


CUSTOM_PROMPT_V2 = """Bạn trích xuất đồ thị tri thức từ đoạn tài liệu SWEBOK v4.

QUY TẮC CỨNG:
1. Node type CHỈ chọn trong: KnowledgeArea, Activity, Task, Technique, Method,
   Principle, QualityAttribute, Artifact, Tool, Metric, Fault, FailureMode,
   HumanError, Concept.
2. Quan hệ CHỈ chọn trong 13 loại + OTHER (đọc định nghĩa): PART_OF, SUBTYPE_OF,
   REQUIRES, DEPENDS_ON, CONSTRAINS, VERIFIES, VALIDATES, MITIGATES, CAUSES,
   INJECTS, PRODUCES, CONSUMES, MEASURED_BY, USESTOOL, OTHER.
   - VERIFIES chỉ dùng khi A là kỹ thuật/phương pháp kiểm tra B (artifact/property),
     KHÔNG BAO GIỜ dùng khi B là hoạt động (Activity).
3. THUẬT NGỮ CHUẨN (IEEE 610.12):
   - fault / defect / bug là CÙNG khái niệm → node "Fault" DUY NHẤT
   - failure (hiệu ứng quan sát được) → node "FailureMode" RIÊNG
   - error (nhầm lẫn của con người) → node "HumanError" RIÊNG
   - Chuỗi nhân quả: HumanError -[INJECTS]-> Fault -[CAUSES]-> FailureMode
4. TIÊU ĐỀ MỤC gộp nhiều khái niệm (vd "assertions, design by contract and
   defensive programming") PHẢI tách thành các leaf concept riêng
   (Assertions, Design by Contract, Defensive Programming), KHÔNG tạo node
   mang nguyên tiêu đề.
5. Mỗi cạnh có confidence 0.0–1.0 (độ chắc chắn theo ngữ cảnh văn bản).
6. Nếu quan hệ không thuộc 13 loại, dùng OTHER — KHÔNG bịa loại mới.
7. Node name unique; description 1 câu tiếng Việt nêu vai trò.
"""
