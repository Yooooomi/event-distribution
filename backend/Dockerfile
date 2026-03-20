# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies using pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

RUN pnpm build
RUN pnpm prune --prod

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3000

CMD ["npm", "start"]
