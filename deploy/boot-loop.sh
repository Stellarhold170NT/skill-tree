#!/bin/sh
# boot-loop.sh — DinD-safe detached bootstrap: create/start every container until Up.
# Survives wrapper kill cycles because it runs in background (nohup).
LOG=/tmp/boot-loop.log
echo "=== boot-loop start $(date -u) ===" > $LOG

ensure() {
  name="$1"; image="$2"; shift 2
  for i in 1 2 3 4 5 6 7 8 9 10; do
    st=$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null)
    if [ "$st" = "running" ]; then echo "UP $name" >> $LOG; return 0; fi
    if [ -n "$st" ]; then docker start "$name" >> $LOG 2>&1; else
      docker run -d --name "$name" --restart unless-stopped "$@" "$image" >> $LOG 2>&1
    fi
    sleep 6
  done
  echo "FAIL $name" >> $LOG
}

ensure class-svc skill-tree/class-service:0.1.0 -e DATABASE_URL=postgresql+psycopg://class:class_dev@127.0.0.1:5435/class
ensure analytics-svc skill-tree/analytics-service:0.1.0 -e DATABASE_URL=postgresql+psycopg://analytics:analytics_dev@127.0.0.1:5436/analytics
ensure learner-svc skill-tree/learner-model-service:0.1.0 -e DATABASE_URL=postgresql+psycopg://learner:learner_dev@127.0.0.1:5437/learner -e OPENCASE_BASE_URL=http://127.0.0.1:8101 -e CLASS_BASE_URL=http://127.0.0.1:8103
ensure assignment-svc skill-tree/assignment-service:0.1.0 -e DATABASE_URL=postgresql+psycopg://assignment:assignment_dev@127.0.0.1:5438/assignment -e LEARNER_BASE_URL=http://127.0.0.1:8105 -e QUIZ_BASE_URL=http://127.0.0.1:8102
ensure document-svc skill-tree/document-service:0.1.0 -e DATABASE_URL=postgresql+psycopg://document:document_dev@127.0.0.1:5439/document -v document-uploads:/srv/uploads
ensure auth-svc skill-tree/auth-service:0.1.0 -e DATABASE_URL=postgresql+psycopg://auth:auth_dev@127.0.0.1:5440/auth -e AUTH_SECRET=dev-secret-change-me -e AUTH_TOKEN_TTL=3600
ensure rag-svc skill-tree/rag-service:0.1.0 -e LATEXML_BASE_URL=http://127.0.0.1:8110 -e DOCUMENT_BASE_URL=http://127.0.0.1:8107 -v rag-data:/srv/app/data
ensure gateway-svc skill-tree/api-gateway:0.1.0 -e CASE_BASE_URL=http://127.0.0.1:8101 -e QUIZ_BASE_URL=http://127.0.0.1:8102 -e CLASS_BASE_URL=http://127.0.0.1:8103 -e ANALYTICS_BASE_URL=http://127.0.0.1:8104 -e LEARNER_BASE_URL=http://127.0.0.1:8105 -e ASSIGNMENT_BASE_URL=http://127.0.0.1:8106 -e DOCUMENT_BASE_URL=http://127.0.0.1:8107 -e RAG_BASE_URL=http://127.0.0.1:8109 -e AUTH_BASE_URL=http://127.0.0.1:8108
ensure harness-svc skilltree/harness:latest --cap-add SYS_ADMIN --cap-add NET_ADMIN --security-opt seccomp:unconfined -e NODE_ENV=production -e EXTRA_TRUSTED_HOSTS=localhost:8104 -e SKILLTREE_GATEWAY_URL=http://127.0.0.1:8000 -v stv1-data:/app/data -v stv1-logs:/app/data/logs -v stv1-workspace:/app/workspace -v stv1-dsh:/root/.dsh -v /workspace/services/skill-tree-service/plugins:/app/plugins:ro

echo "=== boot-loop done $(date -u) ===" >> $LOG
docker ps --format '{{.Names}} | {{.Status}}' >> $LOG
