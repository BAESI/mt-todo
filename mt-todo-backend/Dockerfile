FROM golang:1.22.2 AS builder
WORKDIR /app

# go.mod, go.sum 먼저 복사 → 의존성 먼저 다운로드
COPY src/go.mod src/go.sum ./
RUN go mod download

# 그 다음 소스 복사
COPY src/main.go .

# 빌드
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o todo main.go

# FROM scratch 를 지우고 FROM alpine 사용
FROM alpine:latest

# 1. 인증서 추가 설치
RUN apk add --no-cache ca-certificates

# 2. 실행 바이너리 복사
COPY --from=builder /app/todo /todo

EXPOSE 80
ENTRYPOINT ["/todo"]