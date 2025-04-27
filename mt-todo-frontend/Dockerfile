# 1단계: 빌드
FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 환경변수 기반 빌드
RUN npm run build

# 2단계: Nginx로 정적파일 서빙
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

COPY --from=builder /app/dist .

# (필요시) 커스텀 Nginx 설정 추가 가능
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
