FROM node:20-alpine

WORKDIR /app

# Copy package definition files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production || npm install --production

# Copy application files
COPY . .

# Ensure Database and Invoices directories exist
RUN mkdir -p Database Invoices

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "Java Script/server.js"]
