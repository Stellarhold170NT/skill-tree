#!/bin/sh
# start-host.sh — DinD-safe direct docker run (bypasses broken compose path).
# Host networking; unique DB ports 5433..5440; cross-service URLs 127.0.0.1.
set -x
docker rm -f opencase-db quiz-db class-db analytics-db learner-model-db assignment-db document-db auth-db \
  opencase-service quiz-service class-service analytics-service learner-model-service assignment-service \
  document-service auth-service rag-service api-gateway latexml-service skill-tree-harness-v1 2>/dev/null || true

docker run -d --name opencase-db --restart unless-stopped -e POSTGRES_DB=opencase -e POSTGRES_USER=opencase -e POSTGRES_PASSWORD=opencase_dev -v opencase-data:/var/lib/postgresql/data postgres:16-alpine postgres -p 5433
docker run -d --name quiz-db --restart unless-stopped -e POSTGRES_DB=quiz -e POSTGRES_USER=quiz -e POSTGRES_PASSWORD=quiz_dev -v quiz-data:/var/lib/postgresql/data postgres:16-alpine postgres -p 5434
docker run -d --name class-db --restart unless-stopped -e POSTGRES_DB=class -e POSTGRES_USER=class -e POSTGRES_PASSWORD=class_dev -v class-data:/var/lib/postgresql/data postgres:16-alpine postgres -p 5435
docker run -d --name analytics-db --restart unless-stopped -e POSTGRES_DB=analytics -e POSTGRES_USER=analytics -e POSTGRES_PASSWORD=analytics_dev -v analytics-data:/var/lib/postgresql/data postgres:16-alpine postgres -p 5436
docker run -d --name learner-model-db --restart unless-stopped -e POSTGRES_DB=learner -e POSTGRES_USER=learner -e POSTGRES_PASSWORD=learner_dev -v learner-model-data:/var/lib/postgresql/data postgres:16-alpine postgres -p 5437
docker run -d --name assignment-db --restart unless-stopped -e POSTGRES_DB=assignment -e POSTGRES_USER=assignment -e POSTGRES_PASSWORD=assignment_dev -v assignment-data:/var/lib/postgresql/data postgres:16-alpine postgres -p 5438
docker run -d --name document-db --restart unless-stopped -e POSTGRES_DB=document -e POSTGRES_USER=document -e POSTGRES_PASSWORD=document_dev -v document-data:/var/lib/postgresql/data postgres:16-alpine postgres -p 5439
docker run -d --name auth-db --restart unless-stopped -e POSTGRES_DB=auth -e POSTGRES_USER=auth -e POSTGRES_PASSWORD=auth_dev -v auth-data:/var/lib/postgresql/data postgres:16-alpine postgres -p 5440

sleep 12

docker run -d --name opencase-service --restart unless-stopped \
  -e DATABASE_URL=postgresql+psycopg://opencase:opencase_dev@127.0.0.1:5433/opencase \
  -e CASE_BASE_URI=http://127.0.0.1:8101/api/v1/case \
  -v opencase-data:/var/lib/postgresql/data skill-tree/opencase-service:0.1.0
docker run -d --name quiz-service --restart unless-stopped \
  -e DATABASE_URL=postgresql+psycopg://quiz:quiz_dev@127.0.0.1:5434/quiz \
  -v quiz-data:/var/lib/postgresql/data skill-tree/quiz-service:0.1.0
docker run -d --name class-service --restart unless-stopped \
  -e DATABASE_URL=postgresql+psycopg://class:class_dev@127.0.0.1:5435/class \
  -v class-data:/var/lib/postgresql/data skill-tree/class-service:0.1.0
docker run -d --name analytics-service --restart unless-stopped \
  -e DATABASE_URL=postgresql+psycopg://analytics:analytics_dev@127.0.0.1:5436/analytics \
  -v analytics-data:/var/lib/postgresql/data skill-tree/analytics-service:0.1.0
docker run -d --name learner-model-service --restart unless-stopped \
  -e DATABASE_URL=postgresql+psycopg://learner:learner_dev@127.0.0.1:5437/learner \
  -e OPENCASE_BASE_URL=http://127.0.0.1:8101 \
  -e CLASS_BASE_URL=http://127.0.0.1:8103 \
  -v learner-model-data:/var/lib/postgresql/data skill-tree/learner-model-service:0.1.0
docker run -d --name assignment-service --restart unless-stopped \
  -e DATABASE_URL=postgresql+psycopg://assignment:assignment_dev@127.0.0.1:5438/assignment \
  -e LEARNER_BASE_URL=http://127.0.0.1:8105 \
  -e QUIZ_BASE_URL=http://127.0.0.1:8102 \
  -v assignment-data:/var/lib/postgresql/data skill-tree/assignment-service:0.1.0
docker run -d --name document-service --restart unless-stopped \
  -e DATABASE_URL=postgresql+psycopg://document:document_dev@127.0.0.1:5439/document \
  -v document-data:/var/lib/postgresql/data -v document-uploads:/srv/uploads skill-tree/document-service:0.1.0
docker run -d --name auth-service --restart unless-stopped \
  -e DATABASE_URL=postgresql+psycopg://auth:auth_dev@127.0.0.1:5440/auth \
  -e AUTH_SECRET=dev-secret-change-me -e AUTH_TOKEN_TTL=3600 \
  -v auth-data:/var/lib/postgresql/data skill-tree/auth-service:0.1.0
docker run -d --name rag-service --restart unless-stopped \
  -e LATEXML_BASE_URL=http://127.0.0.1:8110 \
  -e DOCUMENT_BASE_URL=http://127.0.0.1:8107 \
  -v rag-data:/srv/app/data skill-tree/rag-service:0.1.0
docker run -d --name api-gateway --restart unless-stopped \
  -e CASE_BASE_URL=http://127.0.0.1:8101 \
  -e QUIZ_BASE_URL=http://127.0.0.1:8102 \
  -e CLASS_BASE_URL=http://127.0.0.1:8103 \
  -e ANALYTICS_BASE_URL=http://127.0.0.1:8104 \
  -e LEARNER_BASE_URL=http://127.0.0.1:8105 \
  -e ASSIGNMENT_BASE_URL=http://127.0.0.1:8106 \
  -e DOCUMENT_BASE_URL=http://127.0.0.1:8107 \
  -e RAG_BASE_URL=http://127.0.0.1:8109 \
  -e AUTH_BASE_URL=http://127.0.0.1:8108 \
  skill-tree/api-gateway:0.1.0

# harness (UI 8104) — entrypoint in image already host-net patched (main c4f6234)
docker run -d --name skill-tree-harness-v1 --restart unless-stopped \
  --cap-add SYS_ADMIN --cap-add NET_ADMIN --security-opt seccomp:unconfined \
  -e NODE_ENV=production \
  -e EXTRA_TRUSTED_HOSTS=localhost:8104 127.0.0.1:8104 \
  -e SKILLTREE_GATEWAY_URL=http://127.0.0.1:8000 \
  -v stv1-data:/app/data -v stv1-logs:/app/data/logs -v stv1-workspace:/app/workspace -v stv1-dsh:/root/.dsh \
  -v /workspace/services/skill-tree-service/plugins:/app/plugins:ro \
  skilltree/harness:latest

sleep 5
docker ps --format '{{.Names}} | {{.Status}}'
