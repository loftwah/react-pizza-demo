# Use the exact LTS image
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:24-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package*.json ./

RUN npm ci --omit=dev

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
