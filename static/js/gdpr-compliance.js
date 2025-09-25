/**
 * GDPR 合规性支持系统
 * 功能：Cookie同意管理、数据隐私保护、用户权利管理
 */

class GDPRCompliance {
    constructor(config) {
        this.config = {
            // 基础配置
            showConsentBanner: true,
            language: 'zh-CN',
            companyName: '资源搜',

            // 合规级别
            strictMode: true, // 严格模式：需要明确同意才能使用cookies

            // Cookie分类
            cookieCategories: {
                necessary: {
                    name: '必要Cookie',
                    description: '这些Cookie对网站功能至关重要，无法禁用',
                    required: true,
                    cookies: ['session', 'csrf_token', 'language_preference']
                },
                analytics: {
                    name: '分析Cookie',
                    description: '帮助我们了解访客如何使用网站',
                    required: false,
                    cookies: ['_ga', '_gid', '_gat', 'adStats']
                },
                advertising: {
                    name: '广告Cookie',
                    description: 'Google AdSense用于展示相关广告',
                    required: false,
                    cookies: ['_gcl_*', '__gads', '__gpi', 'DSID']
                },
                functional: {
                    name: '功能Cookie',
                    description: '用于记住您的偏好设置',
                    required: false,
                    cookies: ['theme_preference', 'search_history']
                }
            },

            // 文本内容
            texts: {
                bannerTitle: 'Cookie使用通知',
                bannerMessage: '我们使用Cookie来改善您的浏览体验、提供个性化内容和广告。继续使用本网站即表示您同意我们的Cookie政策。',
                acceptAllButton: '接受所有',
                rejectAllButton: '拒绝非必要',
                customizeButton: '自定义设置',
                saveButton: '保存设置',
                privacyPolicyLink: '隐私政策',
                learnMoreLink: '了解更多'
            },

            // 样式配置
            styles: {
                position: 'bottom', // bottom, top, center
                theme: 'light', // light, dark
                primaryColor: '#667eea',
                backgroundColor: '#ffffff',
                textColor: '#333333'
            },

            // 回调函数
            onConsentGiven: null,
            onConsentRevoked: null,
            onPreferencesChanged: null,

            ...config
        };

        this.consentData = this.loadConsentData();
        this.isEUUser = this.detectEUUser();

        this.init();
    }

    init() {
        console.log('GDPR合规系统初始化...');

        // 如果不是EU用户且不是严格模式，跳过
        if (!this.isEUUser && !this.config.strictMode) {
            this.setDefaultConsent();
            return;
        }

        // 检查是否已有同意记录
        if (!this.hasValidConsent()) {
            this.showConsentBanner();
        } else {
            this.applyConsentSettings();
        }

        // 绑定事件监听器
        this.bindEventListeners();

        // 添加管理入口
        this.addPrivacyControls();
    }

    // 检测EU用户
    detectEUUser() {
        // 简化的EU检测，实际项目中应该使用更精确的IP地理定位服务
        const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];

        // 通过时区简单判断（不够准确，仅作示例）
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const isEuropeanTimezone = timezone.includes('Europe') || timezone.includes('GMT');

        return isEuropeanTimezone;
    }

    // 检查是否有有效的同意记录
    hasValidConsent() {
        if (!this.consentData || !this.consentData.timestamp) {
            return false;
        }

        // 检查同意记录是否在13个月内（GDPR建议定期重新确认）
        const thirteenMonthsAgo = Date.now() - (13 * 30 * 24 * 60 * 60 * 1000);
        return this.consentData.timestamp > thirteenMonthsAgo;
    }

    // 显示同意横幅
    showConsentBanner() {
        if (document.getElementById('gdpr-consent-banner')) {
            return; // 已存在
        }

        const banner = this.createConsentBanner();
        document.body.appendChild(banner);

        // 添加动画效果
        setTimeout(() => {
            banner.classList.add('gdpr-banner-show');
        }, 100);
    }

    // 创建同意横幅
    createConsentBanner() {
        const banner = document.createElement('div');
        banner.id = 'gdpr-consent-banner';
        banner.className = `gdpr-banner gdpr-banner-${this.config.styles.position} gdpr-theme-${this.config.styles.theme}`;

        banner.innerHTML = `
            <div class="gdpr-banner-content">
                <div class="gdpr-banner-text">
                    <h3 class="gdpr-banner-title">${this.config.texts.bannerTitle}</h3>
                    <p class="gdpr-banner-message">${this.config.texts.bannerMessage}</p>
                    <div class="gdpr-banner-links">
                        <a href="/static/privacy.html" target="_blank" class="gdpr-link">${this.config.texts.privacyPolicyLink}</a>
                    </div>
                </div>
                <div class="gdpr-banner-actions">
                    <button class="gdpr-btn gdpr-btn-secondary" onclick="gdprCompliance.showCustomizeModal()">${this.config.texts.customizeButton}</button>
                    <button class="gdpr-btn gdpr-btn-secondary" onclick="gdprCompliance.rejectAll()">${this.config.texts.rejectAllButton}</button>
                    <button class="gdpr-btn gdpr-btn-primary" onclick="gdprCompliance.acceptAll()">${this.config.texts.acceptAllButton}</button>
                </div>
            </div>
        `;

        // 添加样式
        this.injectStyles();

        return banner;
    }

    // 注入CSS样式
    injectStyles() {
        if (document.getElementById('gdpr-styles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'gdpr-styles';
        styles.textContent = `
            .gdpr-banner {
                position: fixed;
                left: 0;
                right: 0;
                z-index: 10000;
                background: ${this.config.styles.backgroundColor};
                color: ${this.config.styles.textColor};
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                transform: translateY(100%);
                transition: transform 0.3s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .gdpr-banner-bottom {
                bottom: 0;
            }

            .gdpr-banner-top {
                top: 0;
                transform: translateY(-100%);
            }

            .gdpr-banner-show {
                transform: translateY(0) !important;
            }

            .gdpr-banner-content {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
                flex-wrap: wrap;
            }

            .gdpr-banner-text {
                flex: 1;
                min-width: 300px;
            }

            .gdpr-banner-title {
                margin: 0 0 8px 0;
                font-size: 1.1rem;
                font-weight: 600;
                color: ${this.config.styles.primaryColor};
            }

            .gdpr-banner-message {
                margin: 0 0 8px 0;
                font-size: 0.9rem;
                line-height: 1.5;
            }

            .gdpr-banner-links {
                font-size: 0.85rem;
            }

            .gdpr-link {
                color: ${this.config.styles.primaryColor};
                text-decoration: none;
                margin-right: 15px;
            }

            .gdpr-link:hover {
                text-decoration: underline;
            }

            .gdpr-banner-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .gdpr-btn {
                padding: 10px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9rem;
                font-weight: 500;
                transition: all 0.2s ease;
            }

            .gdpr-btn-primary {
                background: ${this.config.styles.primaryColor};
                color: white;
            }

            .gdpr-btn-primary:hover {
                background: color-mix(in srgb, ${this.config.styles.primaryColor} 90%, black);
            }

            .gdpr-btn-secondary {
                background: transparent;
                color: ${this.config.styles.textColor};
                border: 1px solid #ddd;
            }

            .gdpr-btn-secondary:hover {
                background: rgba(0,0,0,0.05);
            }

            /* 自定义设置模态框 */
            .gdpr-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .gdpr-modal.show {
                opacity: 1;
                visibility: visible;
            }

            .gdpr-modal-content {
                background: white;
                border-radius: 12px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                transform: translateY(20px);
                transition: transform 0.3s ease;
            }

            .gdpr-modal.show .gdpr-modal-content {
                transform: translateY(0);
            }

            .gdpr-modal-header {
                padding: 24px 24px 16px;
                border-bottom: 1px solid #eee;
            }

            .gdpr-modal-title {
                margin: 0;
                font-size: 1.3rem;
                font-weight: 600;
                color: ${this.config.styles.primaryColor};
            }

            .gdpr-modal-body {
                padding: 24px;
            }

            .gdpr-category {
                margin-bottom: 24px;
                padding: 16px;
                border: 1px solid #eee;
                border-radius: 8px;
            }

            .gdpr-category-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .gdpr-category-name {
                font-weight: 600;
                font-size: 1rem;
                color: ${this.config.styles.textColor};
            }

            .gdpr-toggle {
                position: relative;
                width: 50px;
                height: 24px;
                background: #ccc;
                border-radius: 12px;
                cursor: pointer;
                transition: background 0.2s ease;
            }

            .gdpr-toggle.active {
                background: ${this.config.styles.primaryColor};
            }

            .gdpr-toggle-slider {
                position: absolute;
                top: 2px;
                left: 2px;
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 10px;
                transition: transform 0.2s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }

            .gdpr-toggle.active .gdpr-toggle-slider {
                transform: translateX(26px);
            }

            .gdpr-toggle.disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .gdpr-category-description {
                font-size: 0.9rem;
                color: #666;
                line-height: 1.4;
                margin-bottom: 8px;
            }

            .gdpr-cookies-list {
                font-size: 0.8rem;
                color: #888;
            }

            .gdpr-modal-footer {
                padding: 16px 24px 24px;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                border-top: 1px solid #eee;
            }

            /* 隐私控制入口 */
            .gdpr-privacy-control {
                position: fixed;
                left: 20px;
                bottom: 20px;
                z-index: 9999;
                background: ${this.config.styles.primaryColor};
                color: white;
                border: none;
                border-radius: 20px;
                padding: 8px 12px;
                font-size: 0.8rem;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                opacity: 0.8;
                transition: all 0.2s ease;
            }

            .gdpr-privacy-control:hover {
                opacity: 1;
                transform: translateY(-1px);
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                .gdpr-banner-content {
                    flex-direction: column;
                    text-align: center;
                }

                .gdpr-banner-actions {
                    justify-content: center;
                }

                .gdpr-modal-content {
                    margin: 20px;
                    max-height: calc(100vh - 40px);
                }
            }
        `;

        document.head.appendChild(styles);
    }

    // 接受所有Cookie
    acceptAll() {
        const consent = {};
        Object.keys(this.config.cookieCategories).forEach(category => {
            consent[category] = true;
        });

        this.saveConsent(consent);
        this.hideConsentBanner();
        this.applyConsentSettings();

        console.log('用户接受了所有Cookie类别');
    }

    // 拒绝非必要Cookie
    rejectAll() {
        const consent = {};
        Object.keys(this.config.cookieCategories).forEach(category => {
            const categoryConfig = this.config.cookieCategories[category];
            consent[category] = categoryConfig.required;
        });

        this.saveConsent(consent);
        this.hideConsentBanner();
        this.applyConsentSettings();

        console.log('用户拒绝了非必要Cookie');
    }

    // 显示自定义设置模态框
    showCustomizeModal() {
        if (document.getElementById('gdpr-customize-modal')) {
            document.getElementById('gdpr-customize-modal').classList.add('show');
            return;
        }

        const modal = this.createCustomizeModal();
        document.body.appendChild(modal);

        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
    }

    // 创建自定义设置模态框
    createCustomizeModal() {
        const modal = document.createElement('div');
        modal.id = 'gdpr-customize-modal';
        modal.className = 'gdpr-modal';

        let categoriesHTML = '';
        Object.entries(this.config.cookieCategories).forEach(([categoryId, category]) => {
            const isEnabled = this.consentData?.preferences?.[categoryId] !== false;
            const toggleClass = `gdpr-toggle ${isEnabled ? 'active' : ''} ${category.required ? 'disabled' : ''}`;

            categoriesHTML += `
                <div class="gdpr-category">
                    <div class="gdpr-category-header">
                        <div class="gdpr-category-name">${category.name}</div>
                        <div class="${toggleClass}" data-category="${categoryId}" onclick="gdprCompliance.toggleCategory('${categoryId}')">
                            <div class="gdpr-toggle-slider"></div>
                        </div>
                    </div>
                    <div class="gdpr-category-description">${category.description}</div>
                    <div class="gdpr-cookies-list">Cookie: ${category.cookies.join(', ')}</div>
                </div>
            `;
        });

        modal.innerHTML = `
            <div class="gdpr-modal-content">
                <div class="gdpr-modal-header">
                    <h2 class="gdpr-modal-title">Cookie设置</h2>
                </div>
                <div class="gdpr-modal-body">
                    ${categoriesHTML}
                </div>
                <div class="gdpr-modal-footer">
                    <button class="gdpr-btn gdpr-btn-secondary" onclick="gdprCompliance.hideCustomizeModal()">取消</button>
                    <button class="gdpr-btn gdpr-btn-primary" onclick="gdprCompliance.saveCustomSettings()">${this.config.texts.saveButton}</button>
                </div>
            </div>
        `;

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideCustomizeModal();
            }
        });

        return modal;
    }

    // 切换Cookie类别
    toggleCategory(categoryId) {
        const category = this.config.cookieCategories[categoryId];
        if (category.required) return; // 必要Cookie不能关闭

        const toggle = document.querySelector(`[data-category="${categoryId}"]`);
        const isActive = toggle.classList.contains('active');

        if (isActive) {
            toggle.classList.remove('active');
        } else {
            toggle.classList.add('active');
        }
    }

    // 保存自定义设置
    saveCustomSettings() {
        const consent = {};

        Object.keys(this.config.cookieCategories).forEach(categoryId => {
            const toggle = document.querySelector(`[data-category="${categoryId}"]`);
            const category = this.config.cookieCategories[categoryId];

            if (category.required) {
                consent[categoryId] = true;
            } else {
                consent[categoryId] = toggle.classList.contains('active');
            }
        });

        this.saveConsent(consent);
        this.hideCustomizeModal();
        this.hideConsentBanner();
        this.applyConsentSettings();

        console.log('用户保存了自定义Cookie设置:', consent);
    }

    // 隐藏自定义设置模态框
    hideCustomizeModal() {
        const modal = document.getElementById('gdpr-customize-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    // 隐藏同意横幅
    hideConsentBanner() {
        const banner = document.getElementById('gdpr-consent-banner');
        if (banner) {
            banner.classList.remove('gdpr-banner-show');
            setTimeout(() => {
                banner.remove();
            }, 300);
        }
    }

    // 保存用户同意设置
    saveConsent(preferences) {
        this.consentData = {
            timestamp: Date.now(),
            preferences: preferences,
            version: '1.0',
            userAgent: navigator.userAgent,
            language: navigator.language
        };

        try {
            localStorage.setItem('gdpr_consent', JSON.stringify(this.consentData));
        } catch (e) {
            console.error('保存GDPR同意数据失败:', e);
        }

        // 触发回调
        if (this.config.onConsentGiven) {
            this.config.onConsentGiven(preferences);
        }
    }

    // 加载同意设置
    loadConsentData() {
        try {
            const data = localStorage.getItem('gdpr_consent');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('加载GDPR同意数据失败:', e);
            return null;
        }
    }

    // 应用同意设置
    applyConsentSettings() {
        if (!this.consentData || !this.consentData.preferences) {
            return;
        }

        const preferences = this.consentData.preferences;

        // 应用分析Cookie设置
        if (preferences.analytics) {
            this.enableAnalytics();
        } else {
            this.disableAnalytics();
        }

        // 应用广告Cookie设置
        if (preferences.advertising) {
            this.enableAdvertising();
        } else {
            this.disableAdvertising();
        }

        // 应用功能Cookie设置
        if (preferences.functional) {
            this.enableFunctional();
        } else {
            this.disableFunctional();
        }

        console.log('应用了GDPR同意设置:', preferences);
    }

    // 启用分析功能
    enableAnalytics() {
        // 启用Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'analytics_storage': 'granted'
            });
        }

        // 允许本地分析统计
        localStorage.setItem('analytics_enabled', 'true');
    }

    // 禁用分析功能
    disableAnalytics() {
        // 禁用Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'analytics_storage': 'denied'
            });
        }

        // 清理分析数据
        localStorage.removeItem('adStats');
        localStorage.setItem('analytics_enabled', 'false');
    }

    // 启用广告功能
    enableAdvertising() {
        // 启用AdSense
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'ad_storage': 'granted',
                'ad_user_data': 'granted',
                'ad_personalization': 'granted'
            });
        }

        // 允许广告相关Cookie
        localStorage.setItem('advertising_enabled', 'true');

        // 重新加载广告（如果需要）
        if (window.adsbygoogle) {
            console.log('重新初始化AdSense...');
        }
    }

    // 禁用广告功能
    disableAdvertising() {
        // 禁用AdSense个性化
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied'
            });
        }

        localStorage.setItem('advertising_enabled', 'false');

        // 清理广告相关数据
        this.clearAdvertisingCookies();
    }

    // 启用功能Cookie
    enableFunctional() {
        localStorage.setItem('functional_enabled', 'true');
    }

    // 禁用功能Cookie
    disableFunctional() {
        localStorage.setItem('functional_enabled', 'false');

        // 清理功能相关存储
        localStorage.removeItem('theme_preference');
        localStorage.removeItem('search_history');
    }

    // 清理广告Cookie
    clearAdvertisingCookies() {
        const adCookies = ['_gcl_au', '_gcl_aw', '_gac_', '__gads', '__gpi', 'DSID'];

        adCookies.forEach(cookieName => {
            this.deleteCookie(cookieName);
            this.deleteCookie(cookieName, '.' + window.location.hostname);
            this.deleteCookie(cookieName, window.location.hostname);
        });
    }

    // 删除Cookie
    deleteCookie(name, domain = '') {
        const domainStr = domain ? `; domain=${domain}` : '';
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainStr}`;
    }

    // 设置默认同意（非EU用户）
    setDefaultConsent() {
        const consent = {};
        Object.keys(this.config.cookieCategories).forEach(category => {
            consent[category] = true; // 默认允许所有
        });

        this.saveConsent(consent);
        this.applyConsentSettings();

        console.log('设置了默认Cookie同意（非EU用户）');
    }

    // 添加隐私控制入口
    addPrivacyControls() {
        // 添加隐私设置按钮
        const controlButton = document.createElement('button');
        controlButton.className = 'gdpr-privacy-control';
        controlButton.innerHTML = '🍪 Cookie设置';
        controlButton.onclick = () => this.showCustomizeModal();

        document.body.appendChild(controlButton);
    }

    // 绑定事件监听器
    bindEventListeners() {
        // 监听存储变化（多标签页同步）
        window.addEventListener('storage', (e) => {
            if (e.key === 'gdpr_consent') {
                this.consentData = this.loadConsentData();
                this.applyConsentSettings();
            }
        });
    }

    // 公共API
    getConsentStatus() {
        return this.consentData;
    }

    hasConsent(category) {
        return this.consentData?.preferences?.[category] === true;
    }

    revokeConsent() {
        localStorage.removeItem('gdpr_consent');
        this.consentData = null;

        // 清理所有非必要数据
        this.disableAnalytics();
        this.disableAdvertising();
        this.disableFunctional();

        // 重新显示同意横幅
        this.showConsentBanner();

        if (this.config.onConsentRevoked) {
            this.config.onConsentRevoked();
        }

        console.log('用户撤销了Cookie同意');
    }

    // 导出用户数据（GDPR第15条 - 数据访问权）
    exportUserData() {
        const userData = {
            consent: this.consentData,
            analytics: JSON.parse(localStorage.getItem('adStats') || '{}'),
            preferences: {
                theme: localStorage.getItem('theme_preference'),
                language: localStorage.getItem('language_preference')
            },
            searchHistory: JSON.parse(localStorage.getItem('search_history') || '[]'),
            timestamp: Date.now()
        };

        // 下载为JSON文件
        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('用户数据已导出');
    }

    // 删除用户数据（GDPR第17条 - 删除权）
    deleteUserData() {
        // 清理本地存储
        const keysToRemove = [
            'gdpr_consent',
            'adStats',
            'adsenseStats',
            'adsenseABTests',
            'search_history',
            'theme_preference',
            'language_preference'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        // 清理所有Cookie
        this.clearAdvertisingCookies();

        // 重置状态
        this.consentData = null;

        console.log('用户数据已删除');
        alert('您的数据已成功删除。页面将重新加载。');

        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }
}

// 全局暴露
window.GDPRCompliance = GDPRCompliance;

// 自动初始化
if (typeof window !== 'undefined') {
    // 等待DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.gdprCompliance = new GDPRCompliance();
        });
    } else {
        window.gdprCompliance = new GDPRCompliance();
    }
}