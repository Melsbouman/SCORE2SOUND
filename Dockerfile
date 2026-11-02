FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV AUDIVERIS=/opt/audiveris-pakket/opt/audiveris/bin/Audiveris
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg openjdk-17-jre-headless tesseract-ocr \
    && install -d -m 0755 /etc/apt/keyrings \
    && curl -fSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && groupadd --system node \
    && useradd --system --gid node --create-home node \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fSL https://github.com/Audiveris/audiveris/releases/download/5.11.0/Audiveris-5.11.0-ubuntu22.04-x86_64.deb -o /tmp/audiveris.deb

RUN dpkg-deb -x /tmp/audiveris.deb /opt/audiveris-pakket \
    && rm -f /tmp/audiveris.deb

RUN curl -fSL https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata -o "${TESSDATA_PREFIX}/eng.traineddata" \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --chown=node:node app/ ./
RUN npm ci --omit=dev
RUN mkdir -p /app/public/klankbank && chown node:node /app/public/klankbank

USER node
EXPOSE 5175
VOLUME ["/app/public/klankbank"]
CMD ["node", "server.mjs"]
