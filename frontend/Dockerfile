FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

# Set BACKEND_URL during build so next.config.ts compiles the correct rewrites
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=$BACKEND_URL

# Build the Next.js app
RUN npm run build

EXPOSE 3000

# Start in production mode
CMD ["npm", "start"]
