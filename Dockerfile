# Base stage
FROM node:20-alpine as Base

ARG UID=65534
ARG GID=65534

WORKDIR /app

# COPY package*.json ./
# COPY tsconfig.json ./
COPY package.json ./

RUN npm install --force

COPY . .

RUN npm run build && chown -R ${UID}:${GID} ./entry-point.sh && chmod -R u=rx ./entry-point.sh

# Prod-ready stage
FROM node:20-alpine

ARG UID=65534
ARG GID=65534

WORKDIR /app

COPY --from=Base /app .

USER ${UID}:${GID}

RUN chmod +x entry-point.sh

EXPOSE 1445

ENTRYPOINT [ "./entry-point.sh" ]
