FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:generate && npm run prisma:migrate:deploy && npm run start:dev"]
