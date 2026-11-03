#!/bin/sh
# fix-8104.sh — move analytics off 8104 (harness UI port) to 8111 on host-net.
LOG=/tmp/fix-8104.log
echo "=== fix-8104 $(date -u) ===" > $LOG
docker rm -f analytics-svc >> $LOG 2>&1
sleep 3
for i in 1 2 3 4 5 6 7 8; do
  st=$(docker inspect -f '{{.State.Status}}' analytics-svc2 2>/dev/null)
  if [ "$st" = "running" ]; then break; fi
  if [ -n "$st" ]; then docker start analytics-svc2 >> $LOG 2>&1; else
    docker run -d --name analytics-svc2 --restart unless-stopped \
      -e DATABASE_URL=postgresql+psycopg://analytics:analytics_dev@127.0.0.1:5436/analytics \
      skill-tree/analytics-service:0.1.0 uvicorn app.main:app --host 0.0.0.0 --port 8111 >> $LOG 2>&1
  fi
  sleep 6
done
docker rm -f gateway-svc >> $LOG 2>&1
sleep 2
for i in 1 2 3 4 5 6 7 8; do
  st=$(docker inspect -f '{{.State.Status}}' gateway-svc2 2>/dev/null)
  if [ "$st" = "running" ]; then break; fi
  if [ -n "$st" ]; then docker start gateway-svc2 >> $LOG 2>&1; else
    docker run -d --name gateway-svc2 --restart unless-stopped \
      -e CASE_BASE_URL=http://127.0.0.1:8101 -e QUIZ_BASE_URL=http://127.0.0.1:8102 \
      -e CLASS_BASE_URL=http://127.0.0.1:8103 -e ANALYTICS_BASE_URL=http://127.0.0.1:8111 \
      -e LEARNER_BASE_URL=http://127.0.0.1:8105 -e ASSIGNMENT_BASE_URL=http://127.0.0.1:8106 \
      -e DOCUMENT_BASE_URL=http://127.0.0.1:8107 -e RAG_BASE_URL=http://127.0.0.1:8109 \
      -e AUTH_BASE_URL=http://127.0.0.1:8108 skill-tree/api-gateway:0.1.0 >> $LOG 2>&1
  fi
  sleep 6
done
echo "=== done $(date -u) ===" >> $LOG
docker ps --format '{{.Names}} | {{.Status}}' >> $LOG
