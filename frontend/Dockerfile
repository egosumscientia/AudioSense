FROM node:18-alpine

WORKDIR /app

# Copiar dependencias
COPY package.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Aceptar argumento de build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm install

# Copiar el resto del código
COPY . .

# Compilar Tailwind (opcional)
RUN npx tailwindcss -i ./app/globals.css -o ./public/output.css --minify || true

EXPOSE 3000
CMD ["npm", "run", "dev"]