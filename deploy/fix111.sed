111c\
  su -s /bin/bash node -c 'exec 0</tmp/dsh-stdin; exec dsh --profile web --patch /app/plugins/patch.yml --port 3081 --no-open --trusted-host "localhost:3080" "127.0.0.1:3080" "localhost:3081" "127.0.0.1:3081" "127.0.0.1" "localhost" ${EXTRA_TRUSTED_HOSTS:-}'
