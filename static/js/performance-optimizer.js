/**
 * 性能优化系统
 * 优化网站加载速度和用户体验
 * 适用于Google AdSense审核要求
 */

class PerformanceOptimizer {
    constructor() {
        this.config = {
            // 性能监控阈值
            thresholds: {
                CLS: 0.1,        // 累积布局偏移
                LCP: 2500,       // 最大内容绘制 (毫秒)
                FID: 100,        // 首次输入延迟 (毫秒)
                FCP: 1800,       // 首次内容绘制 (毫秒)
                TTFB: 800        // 首字节时间 (毫秒)
            },
            // 资源优化配置
            resourceOptimization: {
                lazyLoadImages: true,
                deferNonCriticalJS: true,
                preloadCriticalResources: true,
                enableImageWebP: true,
                enableGzipCompression: true
            }
        };

        this.metrics = {};
        this.observers = {};

        this.init();
    }

    init() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupOptimizations());
        } else {
            this.setupOptimizations();
        }
    }

    setupOptimizations() {
        console.log('🚀 启动性能优化系统...');

        // 设置性能监控
        this.setupPerformanceMonitoring();

        // 优化图片加载
        this.optimizeImageLoading();

        // 优化JavaScript加载
        this.optimizeJavaScriptLoading();

        // 优化CSS加载
        this.optimizeCSSLoading();

        // 预加载关键资源
        this.preloadCriticalResources();

        // 优化字体加载
        this.optimizeFontLoading();

        // 设置资源缓存
        this.setupResourceCaching();

        // 启动持续监控
        this.startContinuousMonitoring();
    }

    // 性能监控系统
    setupPerformanceMonitoring() {
        // Web Vitals 监控
        if ('PerformanceObserver' in window) {
            this.monitorLCP();  // 最大内容绘制
            this.monitorFID();  // 首次输入延迟
            this.monitorCLS();  // 累积布局偏移
        }

        // 导航时间监控
        this.monitorNavigationTiming();

        // 资源加载监控
        this.monitorResourceTiming();
    }

    monitorLCP() {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];

            this.metrics.lcp = lastEntry.startTime;
            this.checkThreshold('LCP', lastEntry.startTime, this.config.thresholds.LCP);

            console.log(`📊 LCP: ${lastEntry.startTime.toFixed(2)}ms`);
        });

        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.lcp = observer;
    }

    monitorFID() {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                this.metrics.fid = entry.processingStart - entry.startTime;
                this.checkThreshold('FID', this.metrics.fid, this.config.thresholds.FID);

                console.log(`📊 FID: ${this.metrics.fid.toFixed(2)}ms`);
            });
        });

        observer.observe({ entryTypes: ['first-input'] });
        this.observers.fid = observer;
    }

    monitorCLS() {
        let clsValue = 0;

        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            });

            this.metrics.cls = clsValue;
            this.checkThreshold('CLS', clsValue, this.config.thresholds.CLS);

            console.log(`📊 CLS: ${clsValue.toFixed(4)}`);
        });

        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.cls = observer;
    }

    monitorNavigationTiming() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                const ttfb = navigation.responseStart - navigation.fetchStart;
                const domLoad = navigation.domContentLoadedEventEnd - navigation.fetchStart;
                const fullLoad = navigation.loadEventEnd - navigation.fetchStart;

                this.metrics.ttfb = ttfb;
                this.metrics.domLoad = domLoad;
                this.metrics.fullLoad = fullLoad;

                console.log(`📊 TTFB: ${ttfb.toFixed(2)}ms`);
                console.log(`📊 DOM Load: ${domLoad.toFixed(2)}ms`);
                console.log(`📊 Full Load: ${fullLoad.toFixed(2)}ms`);

                this.checkThreshold('TTFB', ttfb, this.config.thresholds.TTFB);
            }
        });
    }

    monitorResourceTiming() {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                if (entry.duration > 1000) { // 超过1秒的资源
                    console.warn(`⚠️ 慢速资源: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
                    this.reportSlowResource(entry);
                }
            });
        });

        observer.observe({ entryTypes: ['resource'] });
        this.observers.resource = observer;
    }

    checkThreshold(metric, value, threshold) {
        const status = value <= threshold ? '✅' : '❌';
        const performance = value <= threshold ? 'GOOD' : 'POOR';

        console.log(`${status} ${metric}: ${value.toFixed(2)} (${performance})`);

        if (value > threshold) {
            this.reportPerformanceIssue(metric, value, threshold);
        }
    }

    // 图片加载优化
    optimizeImageLoading() {
        if (!this.config.resourceOptimization.lazyLoadImages) return;

        // 原生懒加载支持
        const images = document.querySelectorAll('img:not([loading])');
        images.forEach(img => {
            img.loading = 'lazy';
        });

        // Intersection Observer 懒加载（后备方案）
        if ('IntersectionObserver' in window) {
            this.setupLazyLoading();
        }

        // 预加载首屏关键图片
        this.preloadCriticalImages();
    }

    setupLazyLoading() {
        const lazyImages = document.querySelectorAll('img[data-src]');

        if (lazyImages.length === 0) return;

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);

                    console.log(`🖼️ 懒加载图片: ${img.src}`);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    }

    preloadCriticalImages() {
        // 预加载首屏关键图片
        const criticalImages = [
            // Logo或重要图标
            '/static/favicon.ico',
            // 首屏重要图片可以在这里添加
        ];

        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    }

    // JavaScript 优化
    optimizeJavaScriptLoading() {
        if (!this.config.resourceOptimization.deferNonCriticalJS) return;

        // 延迟加载非关键脚本
        const nonCriticalScripts = document.querySelectorAll('script[data-defer]');

        window.addEventListener('load', () => {
            setTimeout(() => {
                nonCriticalScripts.forEach(script => {
                    const newScript = document.createElement('script');
                    newScript.src = script.dataset.src || script.src;
                    newScript.async = true;

                    if (script.dataset.onload) {
                        newScript.onload = new Function(script.dataset.onload);
                    }

                    document.head.appendChild(newScript);
                    console.log(`🔧 延迟加载JS: ${newScript.src}`);
                });
            }, 100);
        });

        // 代码分割和动态导入
        this.setupDynamicImports();
    }

    setupDynamicImports() {
        // 为大型功能模块设置动态导入
        window.loadModule = async (moduleName) => {
            try {
                const module = await import(`/static/js/modules/${moduleName}.js`);
                console.log(`📦 动态加载模块: ${moduleName}`);
                return module;
            } catch (error) {
                console.warn(`⚠️ 模块加载失败: ${moduleName}`, error);
                return null;
            }
        };
    }

    // CSS 优化
    optimizeCSSLoading() {
        // 内联关键CSS
        this.inlineCriticalCSS();

        // 异步加载非关键CSS
        this.loadNonCriticalCSS();

        // 预加载字体
        this.preloadFonts();
    }

    inlineCriticalCSS() {
        // 关键CSS应该已经内联在HTML中
        // 这里可以添加运行时关键CSS检测
        const criticalCSS = this.generateCriticalCSS();

        if (criticalCSS) {
            const style = document.createElement('style');
            style.textContent = criticalCSS;
            document.head.insertBefore(style, document.head.firstChild);
        }
    }

    generateCriticalCSS() {
        // 这里可以实现关键CSS提取逻辑
        // 对于静态网站，建议使用构建时工具
        return null;
    }

    loadNonCriticalCSS() {
        const nonCriticalStyles = document.querySelectorAll('link[data-async]');

        nonCriticalStyles.forEach(link => {
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = link.href;
            newLink.media = 'all';

            document.head.appendChild(newLink);
        });
    }

    // 字体优化
    optimizeFontLoading() {
        // 预加载关键字体
        const criticalFonts = [
            // 可以在这里添加关键字体
        ];

        criticalFonts.forEach(font => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'font';
            link.type = 'font/woff2';
            link.href = font;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });

        // 字体显示优化
        if ('fonts' in document) {
            this.optimizeFontDisplay();
        }
    }

    optimizeFontDisplay() {
        // 监听字体加载状态
        document.fonts.ready.then(() => {
            console.log('✅ 字体加载完成');
            document.body.classList.add('fonts-loaded');
        });

        // 字体加载超时处理
        setTimeout(() => {
            if (document.fonts.status !== 'loaded') {
                console.warn('⚠️ 字体加载超时，使用回退字体');
                document.body.classList.add('fonts-timeout');
            }
        }, 3000);
    }

    preloadFonts() {
        const fonts = document.querySelectorAll('link[rel="preload"][as="font"]');
        fonts.forEach(font => {
            if (!font.crossOrigin) {
                font.crossOrigin = 'anonymous';
            }
        });
    }

    // 预加载关键资源
    preloadCriticalResources() {
        if (!this.config.resourceOptimization.preloadCriticalResources) return;

        const criticalResources = [
            { href: '/static/js/adsense-optimizer.js', as: 'script' },
            { href: '/static/js/gdpr-compliance.js', as: 'script' }
        ];

        criticalResources.forEach(resource => {
            const existing = document.querySelector(`link[href="${resource.href}"]`);
            if (!existing) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.href = resource.href;
                link.as = resource.as;

                if (resource.as === 'script') {
                    link.crossOrigin = 'anonymous';
                }

                document.head.appendChild(link);
                console.log(`⚡ 预加载资源: ${resource.href}`);
            }
        });
    }

    // 资源缓存优化
    setupResourceCaching() {
        // Service Worker 缓存策略
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
        }

        // 本地存储缓存
        this.setupLocalCache();
    }

    registerServiceWorker() {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/static/js/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker 注册成功:', registration.scope);
                })
                .catch(error => {
                    console.log('❌ Service Worker 注册失败:', error);
                });
        });
    }

    setupLocalCache() {
        // 缓存频繁访问的数据
        const cacheManager = {
            set(key, data, ttl = 3600000) { // 默认1小时
                const item = {
                    data: data,
                    timestamp: Date.now(),
                    ttl: ttl
                };
                localStorage.setItem(`cache_${key}`, JSON.stringify(item));
            },

            get(key) {
                const item = localStorage.getItem(`cache_${key}`);
                if (!item) return null;

                const parsed = JSON.parse(item);
                if (Date.now() - parsed.timestamp > parsed.ttl) {
                    localStorage.removeItem(`cache_${key}`);
                    return null;
                }

                return parsed.data;
            }
        };

        window.cacheManager = cacheManager;
    }

    // 持续性能监控
    startContinuousMonitoring() {
        // 每30秒报告一次性能状况
        setInterval(() => {
            this.reportPerformanceStatus();
        }, 30000);

        // 页面可见性变化监控
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('👁️ 页面重新可见');
            } else {
                console.log('👁️ 页面隐藏');
            }
        });

        // 内存使用监控
        if ('memory' in performance) {
            this.monitorMemoryUsage();
        }
    }

    monitorMemoryUsage() {
        setInterval(() => {
            const memory = performance.memory;
            const used = Math.round(memory.usedJSHeapSize / 1048576); // MB
            const total = Math.round(memory.totalJSHeapSize / 1048576); // MB
            const limit = Math.round(memory.jsHeapSizeLimit / 1048576); // MB

            console.log(`🧠 内存使用: ${used}MB / ${total}MB (限制: ${limit}MB)`);

            if (used / limit > 0.9) {
                console.warn('⚠️ 内存使用过高，建议释放资源');
                this.cleanupResources();
            }
        }, 60000); // 每分钟检查一次
    }

    cleanupResources() {
        // 清理不必要的事件监听器
        // 清理缓存数据
        // 垃圾回收提示
        if (window.gc) {
            window.gc();
        }

        console.log('🧹 执行资源清理');
    }

    // 性能问题报告
    reportPerformanceIssue(metric, value, threshold) {
        const issue = {
            metric: metric,
            value: value,
            threshold: threshold,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // 发送到监控系统
        this.sendPerformanceData(issue);
    }

    reportSlowResource(resource) {
        const issue = {
            type: 'slow_resource',
            resource: resource.name,
            duration: resource.duration,
            size: resource.transferSize,
            timestamp: Date.now()
        };

        this.sendPerformanceData(issue);
    }

    reportPerformanceStatus() {
        const status = {
            metrics: this.metrics,
            timestamp: Date.now(),
            url: window.location.href
        };

        console.log('📊 性能状况报告:', status);

        // 可以发送到分析服务
        if (typeof gtag !== 'undefined') {
            Object.keys(this.metrics).forEach(metric => {
                gtag('event', 'performance_metric', {
                    'metric_name': metric,
                    'metric_value': this.metrics[metric],
                    'custom_parameter': 'performance_monitoring'
                });
            });
        }
    }

    sendPerformanceData(data) {
        // 发送性能数据到分析系统
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/performance', JSON.stringify(data));
        }

        // 本地记录
        const perfLogs = JSON.parse(localStorage.getItem('perfLogs') || '[]');
        perfLogs.push(data);

        // 只保留最近100条记录
        if (perfLogs.length > 100) {
            perfLogs.splice(0, perfLogs.length - 100);
        }

        localStorage.setItem('perfLogs', JSON.stringify(perfLogs));
    }

    // 页面离开时清理
    cleanup() {
        // 停止所有观察器
        Object.values(this.observers).forEach(observer => {
            if (observer && observer.disconnect) {
                observer.disconnect();
            }
        });

        console.log('🧹 性能监控系统清理完成');
    }

    // 获取性能报告
    getPerformanceReport() {
        return {
            metrics: this.metrics,
            config: this.config,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }
}

// 页面离开时清理资源
window.addEventListener('beforeunload', () => {
    if (window.performanceOptimizer) {
        window.performanceOptimizer.cleanup();
    }
});

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimizer;
} else {
    window.PerformanceOptimizer = PerformanceOptimizer;
}