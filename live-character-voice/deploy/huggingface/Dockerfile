# Live Character Voice engine on a Hugging Face Space (Docker SDK, free "CPU basic": 2 vCPU, 16 GB).
# The image builds the app from GitHub; start.sh pulls the latest commit on every start and the app
# restarts itself when GitHub has a newer commit (LCV_AUTO_UPDATE=1) — no manual redeploys.
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      git ffmpeg espeak-ng libsndfile1 sox curl ca-certificates build-essential make \
 && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/* \
 && pip install --no-cache-dir uv

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    LCV_REPO=https://github.com/manish12323423546/sd.git \
    LCV_BRANCH=claude/nice-ritchie-5s42u6 \
    LCV_HOSTED=1 \
    LCV_AUTO_UPDATE=1 \
    MALLOC_ARENA_MAX=2 \
    HF_HOME=/home/user/.cache/huggingface

WORKDIR /home/user
# bump CACHE_BUST to force a full rebuild (normally not needed: start.sh pulls updates)
ARG CACHE_BUST=1
RUN git clone --depth 50 --branch "$LCV_BRANCH" "$LCV_REPO" repo
WORKDIR /home/user/repo/live-character-voice
RUN make setup-python setup-web \
 && make download-models \
 && cd web && npm run build

EXPOSE 7860
CMD ["bash", "deploy/huggingface/start.sh"]
