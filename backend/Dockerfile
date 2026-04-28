FROM node:18-alpine

WORKDIR /app

# Устанавливаем PHP и необходимые расширения
RUN apk add --no-cache php php-gd php-common php-phar php-fileinfo \
    php-exif php-mbstring php-json

COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["node", "src/server.js"]