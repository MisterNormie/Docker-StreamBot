FROM node:21-alpine3.18

WORKDIR /app

RUN mkdir /movies

COPY . .

RUN apk add --no-cache ffmpeg python3 py3-pip make gcc g++ git libc6-compat bash musl-dev

RUN npm install
RUN npm run build

ENV NODE_ENV production

CMD ["npm","run","start"]
