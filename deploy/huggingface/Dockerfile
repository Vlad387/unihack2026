# Hugging Face Space (Docker SDK): runs the CityMind API straight from GitHub.
# Deploys the `main` branch. New code: Vladut merges dev -> main, then
# Space -> Settings -> "Factory rebuild" (re-clones the branch).
# Secrets (Space -> Settings -> Variables and secrets): DATABASE_URL, GEMINI_API_KEY,
# ORGANIZER_TOKEN, CORS_ORIGINS. See docs/DEPLOY.md.
FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /usr/local/bin/uv

# Hugging Face runs the container as uid 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    UV_CACHE_DIR=/home/user/.cache/uv \
    UV_LINK_MODE=copy \
    NUMBA_CACHE_DIR=/tmp/numba

ARG REPO=https://github.com/Vlad387/unihack2026.git
ARG BRANCH=main
RUN git clone --depth 1 --branch "$BRANCH" "$REPO" /home/user/app
WORKDIR /home/user/app/backend
RUN uv sync --frozen --no-dev

EXPOSE 7860
CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
