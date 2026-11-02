FROM node:24-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV AUDIVERIS=/usr/bin/audiveris
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl openjdk-17-jre-headless tesseract-ocr \
    && curl -fsSL https://github.com/Audiveris/audiveris/releases/download/5.11.0/Audiveris-5.11.0-ubuntu-22.04.deb -o /tmp/audiveris.deb \
    && apt-get install -y --no-install-recommends /tmp/audiveris.deb \
    && curl -fsSL https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata -o "${TESSDATA_PREFIX}/eng.traineddata" \
    && rm -f /tmp/audiveris.deb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --chown=node:node app/ ./
RUN npm ci --omit=dev
RUN mkdir -p /app/public/klankbank && chown node:node /app/public/klankbank

USER node
EXPOSE 5175
VOLUME ["/app/public/klankbank"]
CMD ["node", "server.mjs"]
