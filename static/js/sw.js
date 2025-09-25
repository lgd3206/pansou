/**
 * Service Worker
 * 缓存策略和离线支持
 * 提升网站加载速度
 */

const CACHE_NAME = 'ziyuanso-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
    '/',
    '/static/index.html',
    '/static/search-results.html',
    '/static/categories.html',
    '/static/search-tips.html',
    '/static/about.html',
    '/static/contact.html',
    '/static/help.html',
    '/static/privacy.html',
    '/static/terms.html',
    '/static/js/adsense-optimizer.js',
    '/static/js/gdpr-compliance.js',
    '/static/js/performance-optimizer.js'
];

// 网络优先资源
const NETWORK_FIRST = [
    '/api/',
    'pagead2.googlesyndication.com',
    'googletagmanager.com',
    'google-analytics.com'
];

// 缓存优先资源
const CACHE_FIRST = [
    '.css',
    '.js',
    '.woff2',
    '.woff',
    '.ttf',
    '.ico',
    '.png',
    '.jpg',
    '.jpeg',
    '.svg',
    '.webp'
];

// Service Worker 安装
self.addEventListener('install', event => {
    console.log('🔧 Service Worker 安装中...');

    event.waitUntil(
        Promise.all([
            // 缓存静态资源
            caches.open(STATIC_CACHE).then(cache => {
                console.log('📦 缓存静态资源...');
                return cache.addAll(STATIC_ASSETS);
            }),

            // 跳过等待，立即激活
            self.skipWaiting()
        ])
    );
});

// Service Worker 激活
self.addEventListener('activate', event => {
    console.log('✅ Service Worker 激活中...');

    event.waitUntil(
        Promise.all([
            // 清理旧缓存
            cleanupOldCaches(),

            // 立即接管所有客户端
            self.clients.claim()
        ])
    );
});

// 网络请求拦截
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // 只处理GET请求
    if (request.method !== 'GET') {
        return;
    }

    // 选择缓存策略
    if (shouldUseNetworkFirst(url)) {
        event.respondWith(networkFirstStrategy(request));
    } else if (shouldUseCacheFirst(url)) {
        event.respondWith(cacheFirstStrategy(request));
    } else {
        event.respondWith(staleWhileRevalidateStrategy(request));
    }
});

// 清理旧缓存
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name =>
        name !== CACHE_NAME &&
        name !== STATIC_CACHE &&
        name !== DYNAMIC_CACHE
    );

    await Promise.all(
        oldCaches.map(cacheName => {
            console.log(`🗑️ 删除旧缓存: ${cacheName}`);
            return caches.delete(cacheName);
        })
    );
}

// 判断是否使用网络优先策略
function shouldUseNetworkFirst(url) {
    return NETWORK_FIRST.some(pattern => url.href.includes(pattern));
}

// 判断是否使用缓存优先策略
function shouldUseCacheFirst(url) {
    return CACHE_FIRST.some(ext => url.pathname.includes(ext));
}

// 网络优先策略（适用于API和广告）
async function networkFirstStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE);

    try {
        // 先尝试网络请求
        const networkResponse = await fetch(request);

        // 如果成功，缓存响应并返回
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log(`🌐 网络请求失败，尝试缓存: ${request.url}`);

        // 网络失败，返回缓存
        const cachedResponse = await cache.match(request);
        return cachedResponse || createOfflineResponse(request);
    }
}

// 缓存优先策略（适用于静态资源）
async function cacheFirstStrategy(request) {
    // 先检查静态缓存
    let cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    // 缓存中没有，发起网络请求
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log(`❌ 资源加载失败: ${request.url}`);
        return createOfflineResponse(request);
    }
}

// 陈旧内容重新验证策略（默认策略）
async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE);

    // 同时开始缓存检查和网络请求
    const cachedResponsePromise = cache.match(request);
    const networkResponsePromise = fetch(request).then(response => {
        // 更新缓存
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => null);

    // 优先返回缓存，如果没有缓存则等待网络
    const cachedResponse = await cachedResponsePromise;

    if (cachedResponse) {
        // 有缓存，立即返回，同时在后台更新
        networkResponsePromise.catch(() => {
            // 网络更新失败，忽略错误
            console.log(`🔄 后台更新失败: ${request.url}`);
        });

        return cachedResponse;
    } else {
        // 没有缓存，等待网络响应
        const networkResponse = await networkResponsePromise;
        return networkResponse || createOfflineResponse(request);
    }
}

// 创建离线响应
function createOfflineResponse(request) {
    const url = new URL(request.url);

    // HTML 页面的离线响应
    if (request.headers.get('accept').includes('text/html')) {
        return new Response(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>网络连接失败 - 资源搜</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0;
                        color: white;
                        text-align: center;
                    }
                    .offline-container {
                        background: rgba(255,255,255,0.1);
                        padding: 40px;
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                        max-width: 400px;
                    }
                    .offline-icon {
                        font-size: 4rem;
                        margin-bottom: 20px;
                    }
                    h1 { margin-bottom: 20px; }
                    p { margin-bottom: 20px; opacity: 0.9; }
                    .retry-btn {
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: 2px solid rgba(255,255,255,0.3);
                        padding: 12px 24px;
                        border-radius: 25px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        font-size: 1rem;
                    }
                    .retry-btn:hover {
                        background: rgba(255,255,255,0.3);
                    }
                </style>
            </head>
            <body>
                <div class="offline-container">
                    <div class="offline-icon">📡</div>
                    <h1>网络连接失败</h1>
                    <p>请检查您的网络连接，然后重试</p>
                    <button class="retry-btn" onclick="window.location.reload()">重新尝试</button>
                </div>
            </body>
            </html>
        `, {
            status: 200,
            statusText: 'OK',
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store'
            }
        });
    }

    // API 请求的离线响应
    if (url.pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({
            error: 'offline',
            message: '网络连接失败，请稍后重试'
        }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });
    }

    // 其他资源的离线响应
    return new Response('资源暂时不可用', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    });
}

// 消息处理
self.addEventListener('message', event => {
    const { type, payload } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'GET_CACHE_STATUS':
            getCacheStatus().then(status => {
                event.ports[0].postMessage({ type: 'CACHE_STATUS', payload: status });
            });
            break;

        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
            });
            break;

        case 'PRECACHE_URLS':
            precacheUrls(payload.urls).then(() => {
                event.ports[0].postMessage({ type: 'PRECACHE_COMPLETE' });
            });
            break;

        default:
            console.log(`未知消息类型: ${type}`);
    }
});

// 获取缓存状态
async function getCacheStatus() {
    const cacheNames = await caches.keys();
    const status = {};

    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        status[cacheName] = requests.length;
    }

    return status;
}

// 清理所有缓存
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('🗑️ 所有缓存已清理');
}

// 预缓存URL列表
async function precacheUrls(urls) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(urls);
    console.log(`📦 预缓存完成: ${urls.length} 个资源`);
}

// 后台同步处理
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    // 执行后台同步任务
    console.log('🔄 执行后台同步...');

    // 可以在这里添加离线时积累的操作
    // 例如：发送离线时的分析数据
}

// 定期清理过期缓存
setInterval(async () => {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const requests = await cache.keys();

        // 删除超过7天的缓存
        const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);

        for (const request of requests) {
            const response = await cache.match(request);
            const dateHeader = response.headers.get('date');

            if (dateHeader) {
                const responseDate = new Date(dateHeader).getTime();
                if (responseDate < cutoffTime) {
                    await cache.delete(request);
                    console.log(`🗑️ 删除过期缓存: ${request.url}`);
                }
            }
        }
    } catch (error) {
        console.error('缓存清理失败:', error);
    }
}, 24 * 60 * 60 * 1000); // 每24小时执行一次