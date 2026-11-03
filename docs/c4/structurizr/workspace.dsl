// SkillTree Platform — C4 model for https://playground.structurizr.com/
// Paste this file into the playground (DSL tab) and the five views below render
// as selectable diagrams: L1 context, L2 containers, and three L3 component zooms.
//
// Source of truth: docs/c4/l1-context.md, l2-container.md, l3-component.md
// (PlantUML C4 versions, ground truth main@49c0ee2ebd).
// Tag "V1 planned" = designed but not yet implemented on main.
//
// Representation note: in the PlantUML L1 the cognee MCP server is drawn as an
// external system while L2 draws it inside the platform boundary. In this
// workspace it is modelled once as an external softwareSystem (Tag "External")
// so both the L1 and L2 views compile from the same model; the L2 view shows it
// outside the platform box, connected to the harness via MCP.

workspace {
    model {
        teacher = person "Teacher (GV)" "Owns classes; authors CASE concept graph, QTI quizzes, assignments; reads class heatmap and teaching plan"
        student = person "Student (HS)" "Learns: roadmap progress, adaptive quizzes, notebook RAG Q&A over own uploads"
        admin = person "Admin / Platform owner" "First registered user; operates accounts, roles and deployment"

        skilltree = softwareSystem "SkillTree Platform" "Graph RAG learning platform: standards-based microservices + DeepSeek-Harness agent UI on :8104 + single REST entry on :8000" {

            harness = container "skill-tree-harness (M4)" "Agent harness: web UI/API host :8104 -> container :3080; sessions, plugin loader (patch.yml), per-student workspace" "Node.js @deepseek-ai/dsh 0.1.5-rc.3, bwrap sandbox, iptables" {
                webui = component "DSH web UI/API" "Session UI + control API, token-gated (stable launch token)" "node :3080 (host :8104)"
                agentrt = component "Agent runtime + sandbox" "Runs agent turns isolated; firewall blocks metadata endpoints and LAN scan" "bwrap, iptables, node user 1000"
                loader = component "Plugin loader" "Insert and patch rows; plugins bound read-only; custom skill dirs" "plugins/patch.yml"
                mcpclient = component "MCP client (mcp-cognee-memory)" "streamable-http to cognee MCP :8021" "@deepseek-ai/dsh-mcp-client"
                bizTools = component "[V1 planned] skilltree business plugin" "Atomic tools: opencase_next_concepts, quiz_adaptive, cognee_ask (skeleton today)" "plugin pattern: lib/index.js + client/" {
                    tags "V1 planned"
                }
                brand = component "skilltree-brand plugin" "Green #27A95F rebrand + logo; legacy indigo #4136d6 retired by DESIGN.md" "theme token lib"
                sdk = component "dsh_web_sdk (out-of-band)" "open_session / submit_prompt / poll_session for e2e control" "Python async SDK"
            }

            gateway = container "api-gateway (M10)" "Single REST entry :8000; forwards prefix routes to upstream APIs under /api/v1; rate limit + optional bearer token" "FastAPI + httpx, stateless"

            opencase = container "opencase-service (M1)" "CASE v1.1 concept graph, packages, topological order :8101" "FastAPI + SQLAlchemy"
            opencaseDb = container "opencase-db" "CFDocument, CFItem, CFAssociation" "PostgreSQL 16" {
                tags "Database"
            }

            quiz = container "quiz-service (M2)" "QTI v3.0 item bank, test assembly, attempts :8102" "FastAPI + SQLAlchemy"
            quizDb = container "quiz-db" "Items, tests, attempts" "PostgreSQL 16" {
                tags "Database"
            }

            classSvc = container "class-service (M6)" "OneRoster subset: orgs, classes, pseudonymous users, enrollments :8103" "FastAPI + SQLAlchemy"
            classDb = container "class-db" "Orgs, classes, users, enrollments" "PostgreSQL 16" {
                tags "Database"
            }

            analytics = container "analytics-service (events)" "Caliper-aligned learning events, append-only :8104" "FastAPI + SQLAlchemy"
            analyticsDb = container "analytics-db" "Events (append-only)" "PostgreSQL 16" {
                tags "Database"
            }

            learner = container "learner-model-service (M5)" "Glicko-2 mastery, Ebbinghaus rusty states, frontier, class heatmap :8105" "FastAPI + SQLAlchemy"
            learnerDb = container "learner-model-db" "Mastery per student and concept" "PostgreSQL 16" {
                tags "Database"
            }

            assignment = container "assignment-service (M7)" "Targeted practice from Red/Rusty groups :8106" "FastAPI + SQLAlchemy"
            assignmentDb = container "assignment-db" "Assignments" "PostgreSQL 16" {
                tags "Database"
            }

            document = container "document-service (M3)" "LRMI documents, chunks, alignments, file store :8107" "FastAPI + SQLAlchemy"
            documentDb = container "document-db" "Documents, chunks, alignments" "PostgreSQL 16" {
                tags "Database"
            }

            latexml = container "latexml-service (M3 engine)" "LaTeX to ar5iv-style HTML; container :8103, host :8110; isolated on latexml-net" "FastAPI + LaTeXML (ar5ivist), stateless"

            auth = container "auth-service (M11)" "Accounts, JWT HS256, roles teacher/student/admin :8108" "FastAPI + SQLAlchemy"
            authDb = container "auth-db" "Accounts, roles" "PostgreSQL 16" {
                tags "Database"
            }

            rag = container "rag-service" "Student notebook RAG :8109: upload, parse, structure chunk, index, ask (design on branch agent-v1-rag-design)" "FastAPI + SQLite FTS5" {
                tags "V1 planned"
                ragApi = component "REST API" "upload (202 + jobId), jobs, documents CRUD, reingest, ask, metrics, health" "FastAPI /api/v1" {
                    tags "V1 planned"
                }
                ingest = component "Ingest worker" "store raw (sha256) -> parse -> chunk -> mirror -> index; job states; no LLM at ingest" "asyncio in-process" {
                    tags "V1 planned"
                }
                parsers = component "Parsers" ".tex/.tar.gz/.zip via latexml render; .md/.txt/.html direct" "latexml client + direct readers" {
                    tags "V1 planned"
                }
                chunker = component "Structure chunker" "ltx_section / h1-h6 headings -> sections; MAX/MIN section chars; paragraph split" "ToC tree builder (STAIR-inspired)" {
                    tags "V1 planned"
                }
                mirror = component "document-service mirror" "best-effort canonical copy of Document + chunks; failure recorded, not fatal" "REST client" {
                    tags "V1 planned"
                }
                retrieval = component "Retrieval" "bm25(heading 8, path 4, body 1) + section-path boost; section-path citations" "SQLite FTS5 BM25" {
                    tags "V1 planned"
                }
                answer = component "Answer mode" "NetMind chat with retry-on-empty; falls back to retrieval payload" "optional LLM synthesis" {
                    tags "V1 planned"
                }
                ragStore = component "SQLite store" "docs, sections, chunks, chunks_fts (external content), jobs" "SQLite + FTS5" {
                    tags "V1 planned, Database"
                }
            }

            teacherUi = container "skilltree-teacher-ui (plugin)" "Class dashboard inside the harness UI: classes, roster, Red/Amber/Green heatmap, concept graph, assignments" "DSH client plugin (pattern per roadmap-viewer)" {
                tags "V1 planned"
                views = component "Views" "Class dashboard: classes, roster, Red/Amber/Green heatmap, concept graph, assignments" "React (React.createElement)" {
                    tags "V1 planned"
                }
                state = component "State" "per-view data cache and selection state" "component state + cache" {
                    tags "V1 planned"
                }
                apiClient = component "API client" "typed calls from UI to host half" "client-half RPC wrapper" {
                    tags "V1 planned"
                }
                hostRpc = component "Host RPC half" "package-private RPC, e.g. skilltree.getClassHeatmap" "harness.handle methods" {
                    tags "V1 planned"
                }
                fetcher = component "Outbound fetcher" "server-side fetch to api-gateway :8000 (page never calls services directly)" "ctx.web.fetch" {
                    tags "V1 planned"
                }
            }
        }

        netmind = softwareSystem "NetMind LLM Gateway" "OpenAI-compatible chat completions (MiniMax-M3, GLM-5.3-Flash); embeddings endpoint is blocked; key via env only" {
            tags "External"
        }

        cogneeMcp = softwareSystem "cognee-memory (M8)" "Cognee graph + vector memory over MCP; per-student datasets (student-<candidateId>); currently dev host :8021" {
            tags "External"
        }

        // ---- L1: users <-> platform, platform <-> externals ----
        teacher -> skilltree "Teaches and monitors classes" "HTTPS :8104 (Harness UI)"
        student -> skilltree "Learns and asks questions" "HTTPS :8104 (Harness UI)"
        admin -> skilltree "Registers users, operates deployment" "HTTPS :8104 / :8000"
        skilltree -> netmind "Agent reasoning, practice generation, answer synthesis" "HTTPS chat completions, key via env only"
        skilltree -> cogneeMcp "Per-student memory ingest / ask" "MCP streamable-http :8021"

        // ---- L2: harness outbound ----
        harness -> opencase "Agent reads CASE graph, picks next concepts" "REST OPENCASE_URL /api/v1"
        harness -> quiz "Agent fetches QTI items, records attempts" "REST QUIZ_URL /api/v1"
        harness -> cogneeMcp "Student memory ingest / ask" "MCP streamable-http :8021"
        harness -> netmind "Agent LLM completions" "HTTPS, env-configured"

        // ---- L2: gateway prefix forwarding ----
        gateway -> opencase "Forwards /case/*" "HTTP /api/v1"
        gateway -> quiz "Forwards /quiz/*" "HTTP /api/v1"
        gateway -> classSvc "Forwards /class/*" "HTTP /api/v1"
        gateway -> analytics "Forwards /events/*" "HTTP /api/v1"
        gateway -> learner "Forwards /learner/*" "HTTP /api/v1"
        gateway -> assignment "Forwards /assignments/*" "HTTP /api/v1"
        gateway -> document "Forwards /documents/*" "HTTP /api/v1"
        gateway -> auth "[V1 planned] JWT verification wiring" "AUTH_BASE_URL env set; no auth prefix in UPSTREAMS yet"

        // ---- L2: service-to-service REST ----
        learner -> opencase "Reads concept graph for frontier" "HTTP OPENCASE_BASE_URL"
        learner -> classSvc "Resolves pseudonymous students" "HTTP CLASS_BASE_URL"
        assignment -> learner "Targets Red/Rusty groups" "HTTP LEARNER_BASE_URL"
        assignment -> quiz "Pulls practice items" "HTTP QUIZ_BASE_URL"

        // ---- L2: rag-service (planned) ----
        rag -> latexml "[V1 planned] Renders LaTeX uploads" "HTTP LATEXML_BASE_URL http://latexml-service:8103"
        rag -> document "[V1 planned] Mirrors canonical docs + chunks, best effort" "HTTP DOCUMENT_BASE_URL"
        rag -> netmind "[V1 planned] Optional answer synthesis" "HTTPS, retry-on-empty"

        // ---- L2: database ownership (DB-per-service) ----
        opencase -> opencaseDb "Owns" "TCP 5432, private net"
        quiz -> quizDb "Owns" "TCP 5432, private net"
        classSvc -> classDb "Owns" "TCP 5432, private net"
        analytics -> analyticsDb "Owns" "TCP 5432, private net"
        learner -> learnerDb "Owns" "TCP 5432, private net"
        assignment -> assignmentDb "Owns" "TCP 5432, private net"
        document -> documentDb "Owns" "TCP 5432, private net"
        auth -> authDb "Owns" "TCP 5432, private net"
        // note: rag's SQLite store is a component inside rag (see L3-Rag view),
        // so there is no container-level rag -> store relationship here.

        // ---- L3: harness internals ----
        webui -> agentrt "Serves UI, drives agent turns" "in-process"
        loader -> bizTools "Loads row skilltree" "patch.yml - insert:"
        loader -> brand "Loads row skilltree-brand" "patch.yml - insert:"
        loader -> mcpclient "Loads row mcp-cognee-memory" "patch.yml - insert:"
        mcpclient -> cogneeMcp "MCP calls" "streamable-http"
        bizTools -> opencase "opencase_next_concepts" "REST /api/v1"
        bizTools -> quiz "quiz_adaptive" "REST /api/v1"
        sdk -> webui "open_session / submit_prompt / poll" "HTTPS DSH_BASE_URL"

        // ---- L3: rag-service pipeline (planned) ----
        ragApi -> ingest "Enqueues ingest job" "202 jobId + statusUrl"
        ingest -> parsers "Parse uploaded source" "in-process"
        parsers -> latexml "Render LaTeX family" "HTTP POST /api/v1/render"
        parsers -> chunker "Parsed HTML / markdown" "in-process"
        chunker -> ragStore "Writes sections + chunks + fts" "SQL"
        ingest -> mirror "Mirror canonical data" "best effort"
        mirror -> document "POST documents + chunks" "REST /api/v1"
        ragApi -> retrieval "ask -> top-k citations" "in-process"
        retrieval -> ragStore "MATCH + bm25 rank" "SQL"
        ragApi -> answer "mode = answer" "optional"
        answer -> netmind "Chat completion" "HTTPS, retry-on-empty"

        // ---- L3: teacher-ui plugin internals (planned) ----
        views -> state "Reads and writes view state" "in-browser"
        views -> apiClient "Requests data" "in-browser"
        apiClient -> hostRpc "Package-private RPC" "host.call"
        hostRpc -> fetcher "RPC handler fetches" "ctx.web.fetch"
        fetcher -> gateway "REST /api/v1" "HTTP :8000"
    }

    views {
        systemContext skilltree "L1-Context" "C1 System Context (V1)" {
            include *
            autoLayout
        }

        container skilltree "L2-Container" "C2 Containers (V1) — [V1 planned] boxes are designed, not yet on main" {
            include *
            autoLayout
        }

        component harness "L3-Harness" "C3 — inside skill-tree-harness (M4, real code)" {
            include *
            autoLayout
        }

        component rag "L3-Rag" "C3 — inside rag-service ([V1 planned], design on agent-v1-rag-design)" {
            include *
            autoLayout
        }

        component teacherUi "L3-TeacherUi" "C3 — inside skilltree-teacher-ui plugin ([V1 planned])" {
            include *
            autoLayout
        }

        styles {
            element "Database" {
                shape cylinder
            }
            element "External" {
                background #959595
                color #ffffff
            }
            element "V1 planned" {
                border dashed
            }
        }
    }
}
