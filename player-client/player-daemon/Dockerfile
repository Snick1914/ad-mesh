FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Crear carpetas de almacenamiento local de forma explícita
RUN mkdir -p /app/data/media

EXPOSE 8080

CMD ["node", "server.js"]
