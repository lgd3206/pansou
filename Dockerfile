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
# 添加这行来复制 ads.txt 文件
COPY --from=builder /app/ads.txt /app/ads.txt

WORKDIR /app
EXPOSE 8888

ENV ENABLED_PLUGINS=labi,zhizhen,shandian,duoduo,muou,wanou,hunhepan,jikepan,panwiki,pansearch,panta,qupansou,susu,xuexizhinan,panyq,ouge,huban,cyg,erxiao,miaoso,thepiratebay,nyaa \
    ASYNC_PLUGIN_ENABLED=true \
    CACHE_PATH=/app/cache \
    CACHE_ENABLED=true \
    TZ=Asia/Shanghai \
    ASYNC_RESPONSE_TIMEOUT=8 \
    ASYNC_MAX_BACKGROUND_WORKERS=30 \
    ASYNC_MAX_BACKGROUND_TASKS=150 \
    ASYNC_CACHE_TTL_HOURS=2 \
    ASYNC_LOG_ENABLED=true \
    CHANNELS=tgsearchers3,Aliyun_4K_Movies,bdbdndn11,yunpanx,bsbdbfjfjff,yp123pan,sbsbsnsqq,yunpanxunlei,tianyifc,BaiduCloudDisk,txtyzy,peccxinpd,gotopan,PanjClub,kkxlzy,baicaoZY,MCPH01,bdwpzhpd,ysxb48,jdjdn1111,yggpan,MCPH086,zaihuayun,Q66Share,Oscar_4Kmovies,ucwpzy,shareAliyun,alyp_1,dianyingshare,Quark_Movies,XiangxiuNBB,ydypzyfx,ucquark,xx123pan,yingshifenxiang123,zyfb123,tyypzhpd,tianyirigeng,cloudtianyi,hdhhd21,Lsp115,oneonefivewpfx,qixingzhenren,taoxgzy,Channel_Shares_115,tyysypzypd,vip115hot,wp123zy,yunpan139,yunpan189,yunpanuc,yydf_hzl,leoziyuan,pikpakpan,Q_dongman,yoyokuakeduanju,xingqiump4,yunpanqk,share_aliyun,NewAliPan,ypquark,alyp_TV,alyp_4K_Movies,NewQuark,kuakeyun,Maidanglaocom,tgsearchers115,alyp_Animation,alyp_JLP,AliyunDrive_Share_Channel,aliyunys,yunpanpan,Quark_Share_Channel,quarkshare,baiduyun,iAliyun,quanziyuanshe,StudyResource_Channel,EducationShare,CourseShare,ProgrammingShare,MovieHDShare,TVSeriesHD,AnimeShare_CN,KoreanDrama_HD,JapaneseDrama_HD,SoftwareShare_Pro,DesignResource

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
