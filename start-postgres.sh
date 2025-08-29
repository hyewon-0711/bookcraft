#!/bin/bash

# PostgreSQL Docker 컨테이너 시작 스크립트
# 사용자 제공 정보에 맞춰 설정됨

echo "PostgreSQL Docker 컨테이너를 시작합니다..."

# 기존 컨테이너가 실행 중이면 중지
docker stop postgres_local 2>/dev/null || true
docker rm postgres_local 2>/dev/null || true

# PostgreSQL 컨테이너 실행
docker run -d \
  --name postgres_local \
  -e POSTGRES_PASSWORD=lg20995192 \
  -e POSTGRES_USER=hyewon87 \
  -e POSTGRES_DB=gowthai \
  -p 5432:5432 \
  -v ~/postgres_data:/var/lib/postgresql/data \
  postgres:16

echo "PostgreSQL 컨테이너가 시작되었습니다."
echo "연결 정보:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: gowthai"
echo "  User: hyewon87"
echo "  Password: lg20995192"

echo ""
echo "컨테이너 상태 확인 중..."
sleep 3

# 컨테이너 상태 확인
if docker ps | grep -q postgres_local; then
    echo "✅ PostgreSQL 컨테이너가 성공적으로 실행되었습니다!"
    echo ""
    echo "데이터베이스 연결 테스트:"
    echo "docker exec -it postgres_local psql -U hyewon87 -d gowthai"
else
    echo "❌ PostgreSQL 컨테이너 시작에 실패했습니다."
    echo "로그 확인: docker logs postgres_local"
fi