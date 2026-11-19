FROM node:22-alpine
LABEL org.opencontainers.image.title="AIO-Streams&Subtitles-Greek" \
      org.opencontainers.image.description="Stremio addon: AI-translated Greek subtitles" \
      org.opencontainers.image.source="https://github.com/jfle/aio-streams-subtitles-greek" \
      org.opencontainers.image.licenses="MIT"
WORKDIR /app
COPY package.json server.js LICENSE ./
COPY src ./src
COPY public ./public
ENV PORT=7000 DATA_DIR=/data NODE_ENV=production
VOLUME /data
EXPOSE 7000
HEALTHCHECK --interval=60s --timeout=5s CMD wget -qO- http://127.0.0.1:7000/health || exit 1
CMD ["node", "server.js"]
