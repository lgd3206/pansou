/**
 * AdSense 智能优化系统
 * 功能：广告位性能优化、A/B测试、用户行为分析
 */

class AdSenseOptimizer {
    constructor(config) {
        this.config = {
            publisherId: 'ca-pub-4776426875987574',
            enableABTesting: true,
            enableAnalytics: true,
            enableAutoOptimization: true,
            minImpressions: 100, // A/B测试最小展示次数
            optimizationInterval: 24 * 60 * 60 * 1000, // 24小时
            ...config
        };

        this.stats = this.loadStats();
        this.abTests = this.loadABTests();
        this.currentExperiments = new Map();

        this.init();
    }

    init() {
        console.log('AdSense优化器初始化...');

        // 启动性能监控
        this.startPerformanceMonitoring();

        // 启动A/B测试
        if (this.config.enableABTesting) {
            this.startABTesting();
        }

        // 启动自动优化
        if (this.config.enableAutoOptimization) {
            this.startAutoOptimization();
        }

        // 绑定事件监听
        this.bindEventListeners();
    }

    // 性能监控系统
    startPerformanceMonitoring() {
        // 监控广告位可见性
        this.setupViewabilityTracking();

        // 监控页面性能
        this.monitorPagePerformance();

        // 监控用户交互
        this.trackUserInteractions();
    }

    // 设置可见性跟踪
    setupViewabilityTracking() {
        if (!('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const adSlot = entry.target.dataset.adSlot;
                if (!adSlot) return;

                if (entry.isIntersecting) {
                    // 广告进入可视区域
                    this.recordViewabilityStart(adSlot, entry.intersectionRatio);
                } else {
                    // 广告离开可视区域
                    this.recordViewabilityEnd(adSlot);
                }
            });
        }, {
            threshold: [0.1, 0.5, 0.9], // 多个阈值
            rootMargin: '0px'
        });

        // 观察所有广告容器
        document.querySelectorAll('[data-ad-slot]').forEach(ad => {
            observer.observe(ad);
        });
    }

    // 记录可见性开始
    recordViewabilityStart(adSlot, ratio) {
        const now = Date.now();
        this.stats.viewability = this.stats.viewability || {};
        this.stats.viewability[adSlot] = this.stats.viewability[adSlot] || {
            totalTime: 0,
            sessions: 0,
            maxRatio: 0
        };

        this.stats.viewability[adSlot].startTime = now;
        this.stats.viewability[adSlot].maxRatio = Math.max(
            this.stats.viewability[adSlot].maxRatio,
            ratio
        );

        console.log(`广告位 ${adSlot} 开始可见 (${Math.round(ratio * 100)}%)`);
    }

    // 记录可见性结束
    recordViewabilityEnd(adSlot) {
        const now = Date.now();
        const viewData = this.stats.viewability?.[adSlot];

        if (viewData && viewData.startTime) {
            const duration = now - viewData.startTime;
            viewData.totalTime += duration;
            viewData.sessions++;
            delete viewData.startTime;

            console.log(`广告位 ${adSlot} 可见时长: ${duration}ms`);
            this.saveStats();
        }
    }

    // 监控页面性能
    monitorPagePerformance() {
        // 监控CLS (Cumulative Layout Shift)
        this.monitorCLS();

        // 监控LCP (Largest Contentful Paint)
        this.monitorLCP();

        // 监控FID (First Input Delay)
        this.monitorFID();
    }

    monitorCLS() {
        if (!('PerformanceObserver' in window)) return;

        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }

            this.stats.performance = this.stats.performance || {};
            this.stats.performance.cls = clsValue;
        });

        observer.observe({entryTypes: ['layout-shift']});
    }

    monitorLCP() {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];

            this.stats.performance = this.stats.performance || {};
            this.stats.performance.lcp = lastEntry.startTime;
        });

        observer.observe({entryTypes: ['largest-contentful-paint']});
    }

    monitorFID() {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                this.stats.performance = this.stats.performance || {};
                this.stats.performance.fid = entry.processingStart - entry.startTime;
            }
        });

        observer.observe({entryTypes: ['first-input']});
    }

    // 用户交互跟踪
    trackUserInteractions() {
        // 跟踪点击事件
        document.addEventListener('click', (e) => {
            const adContainer = e.target.closest('[data-ad-slot]');
            if (adContainer) {
                const adSlot = adContainer.dataset.adSlot;
                this.recordAdClick(adSlot);
            }
        });

        // 跟踪滚动行为
        let scrollTimer;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                this.recordScrollBehavior();
            }, 150);
        });

        // 跟踪页面停留时间
        this.trackPageEngagement();
    }

    recordAdClick(adSlot) {
        this.stats.clicks = this.stats.clicks || {};
        this.stats.clicks[adSlot] = (this.stats.clicks[adSlot] || 0) + 1;

        console.log(`广告点击: ${adSlot}`);
        this.saveStats();

        // 触发Google Analytics事件
        if (typeof gtag !== 'undefined') {
            gtag('event', 'ad_click', {
                'ad_slot': adSlot,
                'page_location': window.location.href
            });
        }
    }

    recordScrollBehavior() {
        const scrollPercentage = Math.round(
            (window.pageYOffset / (document.body.scrollHeight - window.innerHeight)) * 100
        );

        this.stats.scrollBehavior = this.stats.scrollBehavior || [];
        this.stats.scrollBehavior.push({
            timestamp: Date.now(),
            percentage: scrollPercentage
        });

        // 只保留最近100条记录
        if (this.stats.scrollBehavior.length > 100) {
            this.stats.scrollBehavior = this.stats.scrollBehavior.slice(-100);
        }
    }

    trackPageEngagement() {
        const startTime = Date.now();
        let isActive = true;

        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                isActive = false;
            } else {
                isActive = true;
            }
        });

        // 页面离开时记录停留时间
        window.addEventListener('beforeunload', () => {
            if (isActive) {
                const engagementTime = Date.now() - startTime;
                this.stats.engagement = this.stats.engagement || [];
                this.stats.engagement.push({
                    duration: engagementTime,
                    timestamp: startTime,
                    url: window.location.href
                });
                this.saveStats();
            }
        });
    }

    // A/B测试系统
    startABTesting() {
        console.log('启动A/B测试系统...');

        // 检查当前实验
        this.checkActiveExperiments();

        // 创建新的实验
        this.createExperiments();
    }

    checkActiveExperiments() {
        Object.entries(this.abTests).forEach(([experimentId, experiment]) => {
            if (experiment.status === 'active' && this.shouldContinueExperiment(experiment)) {
                this.applyExperimentVariant(experimentId, experiment);
            } else if (experiment.status === 'active' && this.shouldEndExperiment(experiment)) {
                this.endExperiment(experimentId);
            }
        });
    }

    createExperiments() {
        // 示例实验：测试不同的广告位置
        if (!this.abTests.adPositionTest) {
            this.createAdPositionExperiment();
        }

        // 示例实验：测试不同的广告尺寸
        if (!this.abTests.adSizeTest) {
            this.createAdSizeExperiment();
        }
    }

    createAdPositionExperiment() {
        const experiment = {
            id: 'adPositionTest',
            name: '广告位置测试',
            status: 'active',
            startTime: Date.now(),
            variants: [
                { id: 'control', name: '原始位置', weight: 0.5 },
                { id: 'variant_a', name: '顶部位置', weight: 0.5 }
            ],
            metrics: ['ctr', 'viewability', 'revenue'],
            targetSlots: ['topBanner', 'bottomBanner']
        };

        this.abTests.adPositionTest = experiment;
        this.applyExperimentVariant('adPositionTest', experiment);
        this.saveABTests();
    }

    createAdSizeExperiment() {
        const experiment = {
            id: 'adSizeTest',
            name: '广告尺寸测试',
            status: 'active',
            startTime: Date.now(),
            variants: [
                { id: 'control', name: '自动尺寸', weight: 0.5 },
                { id: 'variant_a', name: '固定尺寸', weight: 0.5 }
            ],
            metrics: ['ctr', 'viewability', 'revenue'],
            targetSlots: ['featureAd']
        };

        this.abTests.adSizeTest = experiment;
        this.applyExperimentVariant('adSizeTest', experiment);
        this.saveABTests();
    }

    applyExperimentVariant(experimentId, experiment) {
        const variant = this.selectVariant(experiment);
        this.currentExperiments.set(experimentId, variant);

        console.log(`应用实验 ${experimentId} 变体: ${variant.id}`);

        // 根据实验类型应用变体
        switch (experimentId) {
            case 'adPositionTest':
                this.applyPositionVariant(variant, experiment.targetSlots);
                break;
            case 'adSizeTest':
                this.applySizeVariant(variant, experiment.targetSlots);
                break;
        }
    }

    selectVariant(experiment) {
        const random = Math.random();
        let cumulativeWeight = 0;

        for (const variant of experiment.variants) {
            cumulativeWeight += variant.weight;
            if (random <= cumulativeWeight) {
                return variant;
            }
        }

        return experiment.variants[0]; // fallback
    }

    applyPositionVariant(variant, targetSlots) {
        if (variant.id === 'variant_a') {
            // 将广告移动到页面顶部
            targetSlots.forEach(slotId => {
                const adElement = document.querySelector(`[data-ad-slot="${slotId}"]`);
                if (adElement) {
                    adElement.style.position = 'sticky';
                    adElement.style.top = '0';
                    adElement.style.zIndex = '1000';
                }
            });
        }
    }

    applySizeVariant(variant, targetSlots) {
        if (variant.id === 'variant_a') {
            // 设置固定广告尺寸
            targetSlots.forEach(slotId => {
                const adElement = document.querySelector(`[data-ad-slot="${slotId}"] .adsbygoogle`);
                if (adElement) {
                    adElement.style.width = '728px';
                    adElement.style.height = '90px';
                    adElement.setAttribute('data-ad-format', '');
                }
            });
        }
    }

    shouldContinueExperiment(experiment) {
        const daysSinceStart = (Date.now() - experiment.startTime) / (24 * 60 * 60 * 1000);
        return daysSinceStart < 14; // 运行14天
    }

    shouldEndExperiment(experiment) {
        const stats = this.getExperimentStats(experiment.id);
        return stats.totalImpressions > this.config.minImpressions * 2;
    }

    endExperiment(experimentId) {
        const experiment = this.abTests[experimentId];
        const results = this.analyzeExperimentResults(experimentId);

        experiment.status = 'completed';
        experiment.endTime = Date.now();
        experiment.results = results;

        console.log(`实验 ${experimentId} 已结束:`, results);
        this.saveABTests();

        // 应用获胜变体
        if (results.winner) {
            this.applyWinningVariant(experimentId, results.winner);
        }
    }

    analyzeExperimentResults(experimentId) {
        const experiment = this.abTests[experimentId];
        const stats = this.getExperimentStats(experimentId);

        // 简单的统计分析（实际项目中应该使用更严格的统计方法）
        let winner = null;
        let maxCTR = 0;

        experiment.variants.forEach(variant => {
            const variantStats = stats.variants[variant.id] || {};
            const ctr = variantStats.clicks / variantStats.impressions || 0;

            if (ctr > maxCTR) {
                maxCTR = ctr;
                winner = variant;
            }
        });

        return {
            winner,
            stats,
            confidence: this.calculateStatisticalSignificance(stats)
        };
    }

    calculateStatisticalSignificance(stats) {
        // 简化的统计显著性计算
        // 实际项目中应该使用更严格的统计方法，如卡方检验
        const totalImpressions = Object.values(stats.variants)
            .reduce((sum, variant) => sum + (variant.impressions || 0), 0);

        if (totalImpressions < this.config.minImpressions) {
            return 'insufficient_data';
        }

        return totalImpressions > this.config.minImpressions * 2 ? 'significant' : 'not_significant';
    }

    getExperimentStats(experimentId) {
        // 从存储的统计数据中提取实验相关的数据
        return this.stats.experiments?.[experimentId] || {
            totalImpressions: 0,
            variants: {}
        };
    }

    applyWinningVariant(experimentId, winner) {
        console.log(`应用获胜变体: ${experimentId} - ${winner.id}`);

        // 将获胜变体的配置应用为默认设置
        this.config.defaultVariants = this.config.defaultVariants || {};
        this.config.defaultVariants[experimentId] = winner.id;

        // 保存配置
        localStorage.setItem('adsenseOptimizerConfig', JSON.stringify(this.config));
    }

    // 自动优化系统
    startAutoOptimization() {
        console.log('启动自动优化系统...');

        // 定期运行优化
        setInterval(() => {
            this.runOptimization();
        }, this.config.optimizationInterval);

        // 页面加载时运行一次
        setTimeout(() => {
            this.runOptimization();
        }, 5000);
    }

    runOptimization() {
        console.log('运行广告优化...');

        // 优化广告位置
        this.optimizeAdPositions();

        // 优化加载时机
        this.optimizeLoadTiming();

        // 优化广告尺寸
        this.optimizeAdSizes();
    }

    optimizeAdPositions() {
        const viewabilityData = this.stats.viewability || {};

        Object.entries(viewabilityData).forEach(([adSlot, data]) => {
            const avgViewTime = data.totalTime / data.sessions;
            const viewabilityScore = data.maxRatio * (avgViewTime / 1000);

            if (viewabilityScore < 0.5) {
                console.log(`广告位 ${adSlot} 可见性较低，建议调整位置`);
                this.suggestPositionImprovement(adSlot, viewabilityScore);
            }
        });
    }

    suggestPositionImprovement(adSlot, currentScore) {
        const suggestions = {
            topBanner: '考虑移动到页面更靠上的位置',
            bottomBanner: '考虑移动到内容中间位置',
            featureAd: '考虑使用粘性定位',
            inContent: '考虑在更热门的内容段落后插入'
        };

        console.log(`${adSlot} 优化建议: ${suggestions[adSlot] || '调整位置以提高可见性'}`);
    }

    optimizeLoadTiming() {
        const performanceData = this.stats.performance || {};

        // 如果CLS过高，延迟广告加载
        if (performanceData.cls > 0.1) {
            console.log('CLS过高，延迟广告加载时机');
            this.config.lazyLoadDelay = Math.max(this.config.lazyLoadDelay || 1000, 2000);
        }

        // 如果LCP过慢，减少初始广告数量
        if (performanceData.lcp > 2500) {
            console.log('LCP过慢，减少初始广告加载');
            this.config.maxInitialAds = Math.min(this.config.maxInitialAds || 2, 1);
        }
    }

    optimizeAdSizes() {
        // 根据设备类型优化广告尺寸
        const isMobile = window.innerWidth <= 768;
        const adElements = document.querySelectorAll('.adsbygoogle');

        adElements.forEach(ad => {
            if (isMobile && !ad.hasAttribute('data-optimized')) {
                ad.setAttribute('data-ad-format', 'fluid');
                ad.setAttribute('data-full-width-responsive', 'true');
                ad.setAttribute('data-optimized', 'true');
            }
        });
    }

    // 事件绑定
    bindEventListeners() {
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                this.handleResize();
            }, 250);
        });

        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }

    handleResize() {
        console.log('窗口大小变化，重新优化广告布局');
        this.optimizeAdSizes();
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // 页面隐藏时暂停某些追踪
            console.log('页面隐藏，暂停性能监控');
        } else {
            // 页面重新可见时恢复追踪
            console.log('页面重新可见，恢复性能监控');
        }
    }

    // 数据管理
    loadStats() {
        try {
            return JSON.parse(localStorage.getItem('adsenseStats') || '{}');
        } catch (e) {
            console.error('加载统计数据失败:', e);
            return {};
        }
    }

    saveStats() {
        try {
            localStorage.setItem('adsenseStats', JSON.stringify(this.stats));
        } catch (e) {
            console.error('保存统计数据失败:', e);
        }
    }

    loadABTests() {
        try {
            return JSON.parse(localStorage.getItem('adsenseABTests') || '{}');
        } catch (e) {
            console.error('加载A/B测试数据失败:', e);
            return {};
        }
    }

    saveABTests() {
        try {
            localStorage.setItem('adsenseABTests', JSON.stringify(this.abTests));
        } catch (e) {
            console.error('保存A/B测试数据失败:', e);
        }
    }

    // 公共API
    getPerformanceReport() {
        return {
            stats: this.stats,
            experiments: this.abTests,
            recommendations: this.generateRecommendations()
        };
    }

    generateRecommendations() {
        const recommendations = [];

        // 基于统计数据生成建议
        const viewabilityData = this.stats.viewability || {};
        const clickData = this.stats.clicks || {};

        Object.keys(viewabilityData).forEach(adSlot => {
            const viewData = viewabilityData[adSlot];
            const clickCount = clickData[adSlot] || 0;
            const ctr = clickCount / (viewData.sessions || 1);

            if (ctr < 0.01) {
                recommendations.push({
                    type: 'low_ctr',
                    adSlot,
                    message: `广告位 ${adSlot} 点击率较低 (${(ctr * 100).toFixed(2)}%)，建议优化位置或样式`,
                    priority: 'medium'
                });
            }

            if (viewData.maxRatio < 0.5) {
                recommendations.push({
                    type: 'low_viewability',
                    adSlot,
                    message: `广告位 ${adSlot} 可见度较低 (${(viewData.maxRatio * 100).toFixed(1)}%)，建议调整位置`,
                    priority: 'high'
                });
            }
        });

        return recommendations;
    }

    // 清理数据
    clearOldData(daysToKeep = 30) {
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

        // 清理旧的滚动行为数据
        if (this.stats.scrollBehavior) {
            this.stats.scrollBehavior = this.stats.scrollBehavior.filter(
                entry => entry.timestamp > cutoffTime
            );
        }

        // 清理旧的参与度数据
        if (this.stats.engagement) {
            this.stats.engagement = this.stats.engagement.filter(
                entry => entry.timestamp > cutoffTime
            );
        }

        this.saveStats();
        console.log(`清理了 ${daysToKeep} 天前的旧数据`);
    }
}

// 导出优化器类
window.AdSenseOptimizer = AdSenseOptimizer;

// 自动初始化（如果有配置）
if (window.adsenseConfig && window.adsenseConfig.enableOptimizer !== false) {
    window.adsenseOptimizer = new AdSenseOptimizer(window.adsenseConfig);
}