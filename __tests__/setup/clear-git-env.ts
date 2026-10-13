// git 훅이 넘긴 GIT_DIR·GIT_INDEX_FILE 등이 fixture git 명령을 실제 저장소로 향하게 하므로 제거함
for (const key of Object.keys(process.env)) {
  if (key.startsWith("GIT_")) delete process.env[key];
}
