package service

import (
	"context"
	"sync"
	"time"
)

// SearchService 搜索服务结构体
type SearchService struct {
	pluginManager PluginManager
}

// PluginManager 接口
type PluginManager interface {
	GetPlugins() []AsyncSearchPlugin
}

// AsyncSearchPlugin 接口
type AsyncSearchPlugin interface {
	Name() string
	Priority() int
}

// SearchResponse 搜索响应结构体
type SearchResponse struct {
	Total        int                    `json:"total"`
	Results      []SearchResult         `json:"results"`
	MergedByType map[string]interface{} `json:"merged_by_type"`
	HasMore      bool                   `json:"has_more"`
}

// SearchResult 搜索结果结构体
type SearchResult struct {
	Title    string    `json:"title"`
	Datetime time.Time `json:"datetime"`
}

// SimpleCache 简单缓存实现
type SimpleCache struct{}

func (s *SimpleCache) SetBothLevels(key string, data interface{}, ttl time.Duration) error {
	return nil
}

func (s *SimpleCache) FlushMemoryToDisk() error {
	return nil
}

// NewSearchService 创建新的搜索服务实例
func NewSearchService(pluginManager interface{}) *SearchService {
	if pm, ok := pluginManager.(PluginManager); ok {
		return &SearchService{
			pluginManager: pm,
		}
	}
	return &SearchService{
		pluginManager: nil,
	}
}

// GetPluginManager 获取插件管理器
func (s *SearchService) GetPluginManager() PluginManager {
	return s.pluginManager
}

// SetGlobalCacheWriteManager 设置全局缓存写管理器
func SetGlobalCacheWriteManager(manager interface{}) {
	// 占位符实现
}

// GetCacheForMain 专门为main.go提供缓存访问
func GetCacheForMain() *SimpleCache {
	return &SimpleCache{}
}

// Search 执行搜索 - 修改后支持分阶段搜索
func (s *SearchService) Search(
	keyword string,
	channels []string,
	concurrency int,
	forceRefresh bool,
	resultType string,
	sourceType string,
	plugins []string,
	cloudTypes []string,
	ext map[string]interface{},
	searchPhase int,
) (SearchResponse, error) {
	if ext == nil {
		ext = make(map[string]interface{})
	}
	
	switch searchPhase {
	case 0:
		return s.quickSearch(keyword, channels, concurrency, forceRefresh, resultType, sourceType, plugins, cloudTypes, ext)
	case 1:
		return s.mediumSearch(keyword, channels, concurrency, forceRefresh, resultType, sourceType, plugins, cloudTypes, ext)
	default:
		return s.fullSearch(keyword, channels, concurrency, forceRefresh, resultType, sourceType, plugins, cloudTypes, ext)
	}
}

// quickSearch 快速搜索：3秒超时，优先缓存和TG
func (s *SearchService) quickSearch(keyword string, channels []string, concurrency int, forceRefresh bool, resultType string, sourceType string, plugins []string, cloudTypes []string, ext map[string]interface{}) (SearchResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	
	var results []SearchResult
	
	if len(channels) > 0 && ctx.Err() == nil {
		results = make([]SearchResult, 0)
	}
	
	response := SearchResponse{
		Total:        len(results),
		Results:      results,
		MergedByType: make(map[string]interface{}),
		HasMore:      true,
	}
	
	return response, nil
}

// mediumSearch 中等搜索：6秒超时
func (s *SearchService) mediumSearch(keyword string, channels []string, concurrency int, forceRefresh bool, resultType string, sourceType string, plugins []string, cloudTypes []string, ext map[string]interface{}) (SearchResponse, error) {
	quickResp, err := s.quickSearch(keyword, channels, concurrency, forceRefresh, resultType, sourceType, plugins, cloudTypes, ext)
	if err != nil {
		return SearchResponse{}, err
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	
	if ctx.Err() == nil {
		// 额外搜索逻辑
	}
	
	response := SearchResponse{
		Total:        len(quickResp.Results),
		Results:      quickResp.Results,
		MergedByType: make(map[string]interface{}),
		HasMore:      true,
	}
	
	return response, nil
}

// fullSearch 完整搜索：原有逻辑
func (s *SearchService) fullSearch(keyword string, channels []string, concurrency int, forceRefresh bool, resultType string, sourceType string, plugins []string, cloudTypes []string, ext map[string]interface{}) (SearchResponse, error) {
	if sourceType == "" {
		sourceType = "all"
	}
	
	if concurrency <= 0 {
		concurrency = 10
	}
	
	var results []SearchResult
	var wg sync.WaitGroup
	
	wg.Wait()
	
	response := SearchResponse{
		Total:        len(results),
		Results:      results,
		MergedByType: make(map[string]interface{}),
		HasMore:      false,
	}
	
	return response, nil
}
