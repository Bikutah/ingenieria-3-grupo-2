FROM node:20-alpine
WORKDIR /app

# instalar deps (rápido en dev)
COPY package*.json ./
RUN npm ci

# en dev montamos el código, no lo copiamos
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
