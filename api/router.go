package api

import (
	"os"
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
		
		// 临时调试端点 - 检查文件状态
		api.GET("/debug", func(c *gin.Context) {
			workingDir, _ := os.Getwd()
			
			// 检查静态目录
			staticDirInfo, staticDirErr := os.Stat("./static")
			staticDirExists := staticDirErr == nil
			
			// 检查index.html文件
			indexFileInfo, indexFileErr := os.Stat("./static/index.html")
			indexFileExists := indexFileErr == nil
			
			// 列出当前目录内容
			currentDirFiles := []string{}
			if files, err := os.ReadDir("."); err == nil {
				for _, file := range files {
					currentDirFiles = append(currentDirFiles, file.Name())
				}
			}
			
			// 列出static目录内容
			staticDirFiles := []string{}
			if files, err := os.ReadDir("./static"); err == nil {
				for _, file := range files {
					staticDirFiles = append(staticDirFiles, file.Name())
				}
			}
			
			response := gin.H{
				"working_directory": workingDir,
				"static_dir_exists": staticDirExists,
				"index_html_exists": indexFileExists,
				"current_dir_files": currentDirFiles,
				"static_dir_files": staticDirFiles,
			}
			
			if staticDirErr != nil {
				response["static_dir_error"] = staticDirErr.Error()
			} else {
				response["static_dir_info"] = gin.H{
					"name": staticDirInfo.Name(),
					"is_dir": staticDirInfo.IsDir(),
					"mode": staticDirInfo.Mode().String(),
				}
			}
			
			if indexFileErr != nil {
				response["index_file_error"] = indexFileErr.Error()
			} else {
				response["index_file_info"] = gin.H{
					"name": indexFileInfo.Name(),
					"size": indexFileInfo.Size(),
					"mode": indexFileInfo.Mode().String(),
				}
			}
			
			c.JSON(200, response)
		})
	}
	
	// 临时测试根路径 - 返回简单文本
	r.GET("/test", func(c *gin.Context) {
		c.String(200, "服务器工作正常！这是测试页面。")
	})
	
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
					"GET /api/debug",
				},
			})
			return
		}
		
		// 如果是静态资源请求但文件不存在，返回404状态
		if strings.HasPrefix(path, "/static") {
			c.Status(404)
			return
		}
		
		// 检查index.html是否存在，如果不存在返回错误信息
		if _, err := os.Stat("./static/index.html"); os.IsNotExist(err) {
			c.HTML(200, "", `
<!DOCTYPE html>
<html>
<head>
    <title>文件缺失</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .error { color: red; }
        .info { background: #f0f0f0; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>静态文件缺失</h1>
    <p class="error">./static/index.html 文件不存在</p>
    <div class="info">
        <p>请访问 <a href="/api/debug">/api/debug</a> 查看详细信息</p>
        <p>请访问 <a href="/test">/test</a> 测试服务器基本功能</p>
        <p>请访问 <a href="/api/health">/api/health</a> 检查API状态</p>
    </div>
    <p>当前请求路径: ` + path + `</p>
</body>
</html>`)
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
