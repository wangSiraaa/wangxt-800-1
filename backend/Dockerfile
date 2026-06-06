FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed 2>/dev/null || true && node dist/index.js"]
