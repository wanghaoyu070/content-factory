# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app

# 安装构建依赖（better-sqlite3 需要）
RUN apk add --no-cache python3 make g++

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm install --legacy-peer-deps

# 复制源代码
COPY . .

# 构建项目
RUN npm run build

# 运行阶段
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 安装运行时依赖（better-sqlite3 需要）
RUN apk add --no-cache python3 make g++

# 复制必要文件
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# 创建数据目录
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]
