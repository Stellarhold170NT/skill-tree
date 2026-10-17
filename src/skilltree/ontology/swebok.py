"""Stage C — Ontology SWEBOK cho C5 (bản 2: tuân thủ contract graph_model của cognee 1.6.4).

Lịch sử:
- Bản 1: SWEBOKGraph(BaseModel) với cạnh name-based (source_name/target_name/relationship)
  BỊ cognee 1.6.4 từ chối ở add_data_points — integrate_chunk_graphs chỉ chấp nhận
  subclass của cognee.shared.data_models.KnowledgeGraph, còn lại graph bị nhét thẳng
  vào DocumentChunk.contains → ValidationError (18 errors) → cognify fail 2/2.
  Smoke run-00-c5smoke FAILED — bằng chứng: reports/evidence/c5-smoke-FAILED.json.
- Bản 2 (này) kế thừa Node/Edge/KnowledgeGraph của cognee để đi đúng đường
  construct_data_points_and_edges:
    * node  : id (slug của name), name, type (Literal 14 enum), description
    * edge  : source_node_id/target_node_id (tham chiếu id node),
              relationship_name (Literal 15 enum), description = "confidence=X.X | ..."
    * graph : nodes + edges (+ summary tuỳ chọn)

LƯU Ý NORMALIZE (áp dụng cho MỌI bước kiểm tra/audit về sau):
- cognee.modules.engine.utils.generate_edge_name LOWERCASES relationship_name khi
  lưu graph ("PART_OF" -> "part_of"); generate_node_name cũng lowercase node name.
  => Mọi check enum 15 quan hệ / 14 kiểu node phải CASE-INSENSITIVE (hoặc .upper()
  trước khi tra PREDICATE_DOC).
- confidence được nhúng ở ĐẦU edge.description, parse bằng CONFIDENCE_RE. Không có
  field riêng vì đường construct của cognee chỉ giữ relationship_name + edge_text.
- source_chunks: BỎ — cognee tự quản provenance chunk qua DocumentChunk.contains.
"""


import re
import unicodedata
from typing import Any, List, Literal, Optional, Tuple, get_args

from pydantic import Field, field_validator, model_validator

from cognee.shared.logging_utils import get_logger
from cognee.shared.data_models import Edge, KnowledgeGraph, Node


logger = get_logger("skilltree.ontology.swebok")


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


# Bảng normalize case-insensitive: LLM có thể xuất 'technique'/'KNOWLEDGEAREA' —
# tra về đúng giá trị Literal (CamelCase) trước khi pydantic so khớp.
_NODE_TYPE_LOOKUP = {t.lower(): t for t in get_args(NodeType)}
_EDGE_TYPE_LOOKUP = {t.lower(): t for t in get_args(EdgeType)}


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

# CẢNH BÁO NORMALIZE: cognee lưu relationship_name đã lowercase — khi dùng
# PREDICATE_DOC, hãy tra với predicate.upper().
PREDICATE_DOC_NOTE = (
    "relationship_name trong graph lưu bởi cognee đã bị lowercase "
    "(PART_OF -> part_of): luôn .upper() trước khi tra PREDICATE_DOC."
)


CONFIDENCE_RE = re.compile(
    r"^confidence\s*=\s*([0-9]+(?:\.[0-9]+)?)\s*\|\s*(.*)$", re.IGNORECASE | re.DOTALL
)


def slugify(name: str) -> str:
    """id mặc định cho node: name -> slug (bỏ dấu, chữ thường, gạch nối)."""
    text = unicodedata.normalize("NFKD", name or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "node"


def parse_confidence(edge_description: Optional[str]) -> Tuple[Optional[float], str]:
    """Tách "confidence=X.X | mô tả" từ edge description.

    Trả về (confidence hoặc None, phần mô tả còn lại).
    """
    if not edge_description:
        return None, ""
    match = CONFIDENCE_RE.match(edge_description.strip())
    if not match:
        return None, edge_description.strip()
    try:
        return float(match.group(1)), match.group(2).strip()
    except ValueError:
        return None, match.group(2).strip()


class SWEBOKNode(Node):
    """Node SWEBOK kế thừa Node của cognee (id/name/type/description).

    - id đặt default "" (Node của cognee là bắt buộc không default) để LLM thiếu id
      không giết cả lần extract: model_validator tự fill id = slugify(name).
    - type bị ép vào NodeType (14 enum) thay vì str tuỳ ý; before-validator
      uppercase trước khi so Literal để LLM xuất 'technique' vẫn pass.
    - description đặt default "" để một node thiếu mô tả không giết cả lần extract —
      chất lượng được kiểm ở bước verify.
    """

    id: str = ""
    type: NodeType = "Concept"
    description: str = ""

    @field_validator("type", mode="before")
    @classmethod
    def _upper_type(cls, v: Any) -> Any:
        if isinstance(v, str):
            return _NODE_TYPE_LOOKUP.get(v.strip().lower(), v.strip())
        return v

    @model_validator(mode="after")
    def _ensure_id(self) -> "SWEBOKNode":
        if not (self.id or "").strip() and (self.name or "").strip():
            self.id = slugify(self.name)
        return self


class SWEBOKEdge(Edge):
    """Cạnh SWEBOK kế thừa Edge của cognee (source_node_id/target_node_id/
    relationship_name/description); relationship_name bị ép vào EdgeType 15 enum
    (before-validator uppercase để LLM xuất 'part_of' vẫn pass).
    confidence được nhúng ở đầu description (CONFIDENCE_RE), không giữ field riêng
    vì đường construct của cognee chỉ lưu relationship_name + edge_text."""

    relationship_name: EdgeType = "OTHER"

    @field_validator("relationship_name", mode="before")
    @classmethod
    def _upper_relationship(cls, v: Any) -> Any:
        if isinstance(v, str):
            return _EDGE_TYPE_LOOKUP.get(v.strip().lower(), v.strip().upper())
        return v


class SWEBOKGraph(KnowledgeGraph):
    """Graph SWEBOK kế thừa KnowledgeGraph của cognee — điều kiện bắt buộc để
    integrate_chunk_graphs đi đúng đường construct_data_points_and_edges
    (issubclass(graph_model, KnowledgeGraph)) thay vì nhét graph vào chunk.contains."""

    summary: str = ""
    nodes: List[SWEBOKNode] = Field(default_factory=list)
    edges: List[SWEBOKEdge] = Field(default_factory=list)

    @model_validator(mode="after")
    def _normalize_graph(self) -> "SWEBOKGraph":
        # 1) id node: fill từ slug(name) khi thiếu; id trùng nhau → raise sớm để
        #    litellm validation retry cho LLM tự sửa (cognee cũng sẽ raise
        #    "Duplicate node id" ở construct — raise ở đây sớm với thông điệp rõ).
        by_key: dict[str, SWEBOKNode] = {}
        for node in self.nodes:
            if not (node.id or "").strip() and (node.name or "").strip():
                node.id = slugify(node.name)
            key = (node.id or "").strip().lower()
            if key in by_key:
                raise ValueError(
                    f"node id bị trùng: '{node.id}' (name='{node.name}') — id phải unique, "
                    f"đã trùng với node name='{by_key[key].name}'. Hãy dùng id khác (slug của name)."
                )
            by_key[key] = node

        # index phụ theo name (slug hoá) để cạnh tham chiếu bằng tên vẫn khớp.
        by_name: dict[str, str] = {}
        for node in self.nodes:
            key = slugify(node.name)
            if key and key not in by_name:
                by_name[key] = node.id.strip().lower()

        def resolve(raw: str) -> Optional[str]:
            value = (raw or "").strip().lower()
            if not value:
                return None
            if value in by_key:
                return value
            if value in by_name:
                return by_name[value]
            # LLM hay bỏ/sai quy ước gạch nối ("Software Architecture") — thử slug.
            slug = slugify(value)
            if slug in by_key:
                return slug
            return by_name.get(slug)

        # 2) edges: chuẩn hoá endpoint về id node (khớp id hoặc name,
        #    case-insensitive); cạnh tham chiếu node không tồn tại bị BỎ kèm
        #    cảnh báo (cognee cũng bỏ cạnh lơ lửng — bỏ sớm không tốn retry).
        kept: List[SWEBOKEdge] = []
        dropped: List[str] = []
        for edge in self.edges:
            src = resolve(edge.source_node_id)
            dst = resolve(edge.target_node_id)
            if src is None or dst is None:
                dropped.append(
                    f"{edge.source_node_id} -[{edge.relationship_name}]-> {edge.target_node_id}"
                )
                continue
            edge.source_node_id = src
            edge.target_node_id = dst
            kept.append(edge)
        if dropped:
            logger.warning(
                "[swebok] bỏ %d cạnh tham chiếu node không tồn tại, vd: %s",
                len(dropped),
                "; ".join(dropped[:5]),
            )
        self.edges = kept
        return self


CUSTOM_PROMPT_V2 = """Bạn trích xuất đồ thị tri thức từ đoạn tài liệu SWEBOK v4 theo schema JSON đã cho (nodes + edges).

QUY TẮC CỨNG:
1. NODE: mỗi node gồm id, name, type, description.
   - id là bản slug của name: chữ thường, bỏ dấu tiếng Việt, thay khoảng trắng/dấu câu bằng gạch nối (vd name "Software Architecture" → id "software-architecture").
   - name: tên hiển thị của khái niệm, UNIQUE trong toàn bộ kết quả.
   - type CHỈ chọn trong: KnowledgeArea, Activity, Task, Technique, Method, Principle, QualityAttribute, Artifact, Tool, Metric, Fault, FailureMode, HumanError, Concept.
   - description: 1 câu tiếng Việt nêu vai trò của khái niệm trong quy trình kỹ thuật phần mềm.
2. EDGE: mỗi cạnh gồm source_node_id, target_node_id, relationship_name, description.
   - source_node_id và target_node_id PHẢI là id của node đã liệt kê trong nodes (không bịa id ngoài danh sách).
   - relationship_name CHỈ chọn trong: PART_OF, SUBTYPE_OF, REQUIRES, DEPENDS_ON, CONSTRAINS, VERIFIES, VALIDATES, MITIGATES, CAUSES, INJECTS, PRODUCES, CONSUMES, MEASURED_BY, USESTOOL, OTHER.
   - VERIFIES chỉ dùng khi A là kỹ thuật/phương pháp kiểm tra B (artifact/property), KHÔNG BAO GIỜ dùng khi B là hoạt động (Activity).
   - description: BẮT ĐẦU bằng "confidence=X.X | " (X.X từ 0.0 đến 1.0 — độ chắc chắn theo ngữ cảnh văn bản), sau đó là 1 câu mô tả quan hệ.
3. THUẬT NGỮ CHUẨN (IEEE 610.12): fault/defect/bug là CÙNG khái niệm → node "Fault" DUY NHẤT; failure (hiệu ứng quan sát được) → node "FailureMode" RIÊNG; error (nhầm lẫn của con người) → node "HumanError" RIÊNG. Chuỗi nhân quả: HumanError -[INJECTS]-> Fault -[CAUSES]-> FailureMode.
4. TIÊU ĐỀ MỤC gộp nhiều khái niệm (vd "assertions, design by contract and defensive programming") PHẢI tách thành các leaf concept riêng (Assertions, Design by Contract, Defensive Programming), KHÔNG tạo node mang nguyên tiêu đề.
5. Nếu quan hệ không thuộc 13 loại trên, dùng OTHER — KHÔNG bịa loại mới.
"""
