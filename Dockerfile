# 构建阶段
FROM --platform=$BUILDPLATFORM golang:1.23-alpine AS builder
RUN apk add --no-cache git ca-certificates tzdata
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .

ARG VERSION=dev
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown
ARG TARGETARCH

RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} go build -ldflags="-s -w -extldflags '-static'" -o pansou .

# 运行阶段
FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
RUN mkdir -p /app/cache
COPY --from=builder /app/pansou /app/pansou
COPY --from=builder /app/static /app/static

WORKDIR /app
EXPOSE 8888

# ✅ 修改这里：移除硬编码，设置合理的默认值
ENV ENABLED_PLUGINS=labi,zhizhen,shandian,duoduo,muou,wanou,hunhepan,jikepan,panwiki,pansearch,panta,qupansou,susu,xuexizhinan,panyq,ouge,huban,cyg,erxiao,miaoso \
    ASYNC_PLUGIN_ENABLED=true
CACHE_PATH=/app/cache \
    CACHE_ENABLED=true \
    TZ=Asia/Shanghai \
    ASYNC_PLUGIN_ENABLED=true \
    ASYNC_RESPONSE_TIMEOUT=8 \
    ASYNC_MAX_BACKGROUND_WORKERS=30 \
    ASYNC_MAX_BACKGROUND_TASKS=150 \
    ASYNC_CACHE_TTL_HOURS=2 \
    ASYNC_LOG_ENABLED=true

# 🎯 关键修改：不设置 CHANNELS 和 ENABLED_PLUGINS 的默认值
# 这样 docker-compose.yml 中的配置就能生效

ARG VERSION=dev
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown

LABEL org.opencontainers.image.title="PanSou" \
      org.opencontainers.image.description="高性能网盘资源搜索API服务" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.url="https://github.com/fish2018/pansou" \
      org.opencontainers.image.source="https://github.com/fish2018/pansou" \
      maintainer="fish2018"

CMD ["/app/pansou"]
