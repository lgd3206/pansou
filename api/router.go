package api

import (
	"strings"
	"github.com/gin-gonic/gin"
	"pansou/config"
	"pansou/service"
	"pansou/util"
)

// SetupRouter 设置路由
func SetupRouter(searchService *service.SearchService) *gin.Engine {
	// 设置搜索服务
	SetSearchService(searchService)
	
	// 设置为生产模式
	gin.SetMode(gin.ReleaseMode)
	
	// 创建默认路由
	r := gin.Default()
	
	// 添加中间件
	r.Use(CORSMiddleware())
	r.Use(LoggerMiddleware())
	r.Use(util.GzipMiddleware()) // 添加压缩中间件
	
	// 定义API路由组
	api := r.Group("/api")
	{
		// 搜索接口 - 支持POST和GET两种方式
		api.POST("/search", SearchHandler)
		api.GET("/search", SearchHandler) // 添加GET方式支持
		
		// 健康检查接口
		api.GET("/health", func(c *gin.Context) {
			// 根据配置决定是否返回插件信息
			pluginCount := 0
			pluginNames := []string{}
			pluginsEnabled := config.AppConfig.AsyncPluginEnabled
			
			if pluginsEnabled && searchService != nil && searchService.GetPluginManager() != nil {
				plugins := searchService.GetPluginManager().GetPlugins()
				pluginCount = len(plugins)
				for _, p := range plugins {
					pluginNames = append(pluginNames, p.Name())
				}
			}
			
			// 获取频道信息
			channels := config.AppConfig.DefaultChannels
			channelsCount := len(channels)
			
			response := gin.H{
				"status": "ok",
				"plugins_enabled": pluginsEnabled,
				"channels": channels,
				"channels_count": channelsCount,
			}
			
			// 只有当插件启用时才返回插件相关信息
			if pluginsEnabled {
				response["plugin_count"] = pluginCount
				response["plugins"] = pluginNames
			}
			
			c.JSON(200, response)
		})
	}
	
	// 静态文件服务 - 提供CSS、JS、图片等静态资源
	r.Static("/static", "./static")
	
	// 处理前端路由 - 所有非API请求都返回前端页面
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		
		// 如果是API请求但没有匹配到路由，返回404 JSON响应
		if strings.HasPrefix(path, "/api") {
			c.JSON(404, gin.H{
				"error": "API endpoint not found",
				"path": path,
				"available_endpoints": []string{
					"GET /api/health",
					"GET /api/search",
					"POST /api/search",
				},
			})
			return
		}
		
		// 如果是静态资源请求但文件不存在，返回404状态
		if strings.HasPrefix(path, "/static") {
			c.Status(404)
			return
		}
		
		// 处理特定的前端文件请求
		switch path {
		case "/", "/index.html":
			// 主页面
			c.File("./static/index.html")
		case "/favicon.ico":
			// 网站图标（如果有的话）
			c.File("./static/favicon.ico")
		case "/robots.txt":
			// 搜索引擎爬虫配置（如果有的话）
			c.File("./static/robots.txt")
		case "/sitemap.xml":
			// 网站地图（如果有的话）
			c.File("./static/sitemap.xml")
		default:
			// 所有其他请求都返回主页面（支持SPA路由）
			c.File("./static/index.html")
		}
	})
	
	return r
}
