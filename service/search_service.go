package service

// Search 执行搜索 - 修改后支持分阶段搜索
func (s *SearchService) Search(keyword string, channels []string, concurrency int, forceRefresh bool, resultType string, sourceType string, plugins []string, cloudTypes []string, ext map[string]interface{}, searchPhase int) (model.SearchResponse, error) {
    // 现有的代码...
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
) (model.SearchResponse, error) {
	// 确保ext不为nil
	if ext == nil {
		ext = make(map[string]interface{})
	}
	
	// 根据搜索阶段决定策略
	switch searchPhase {
	case 0:
		// 第一阶段：3秒快速搜索，优先缓存和TG
		return s.quickSearch(keyword, channels, concurrency, forceRefresh, resultType, sourceType, plugins, cloudTypes, ext)
	case 1:
		// 第二阶段：6秒中等搜索，添加快速插件
		return s.mediumSearch(keyword, channels, concurrency, forceRefresh, resultType, sourceType, plugins, cloudTypes, ext)
	default:
		// 第三阶段：完整搜索（原有逻辑）
		return s.fullSearch(keyword, channels, concurrency, forceRefresh, resultType, sourceType, plugins, cloudTypes, ext)
	}
}

// quickSearch 快速搜索：3秒超时，优先缓存和TG
func (s *SearchService) quickSearch(keyword string, channels []string, concurrency int, forceRefresh bool, resultType string, sourceType string, plugins []string, cloudTypes []string, ext map[string]interface{}) (model.SearchResponse, error) {
	// 首先检查TG缓存
	tgCacheKey := cache.GenerateTGCacheKey(keyword, channels)
	if !forceRefresh && cacheInitialized && config.AppConfig.CacheEnabled {
		if enhancedTwoLevelCache != nil {
			if data, hit, err := enhancedTwoLevelCache.Get(tgCacheKey); err == nil && hit {
				var results []model.SearchResult
				if err := enhancedTwoLevelCache.GetSerializer().Deserialize(data, &results); err == nil {
					mergedLinks := mergeResultsByType(results, keyword, cloudTypes)
					response := model.SearchResponse{
						Total:        len(results),
						Results:      results,
						MergedByType: mergedLinks,
						HasMore:      true, // 表示还有更多结果
					}
					return filterResponseByType(response, resultType), nil
				}
			}
		}
	}
	
	// 如果没有缓存，快速搜索TG（3秒超时）
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	
	var tgResults []model.SearchResult
	if len(channels) > 0 {
		// 只搜索第一个频道，快速返回
		if result, err := s.searchChannelWithTimeout(ctx, keyword, channels[0]); err == nil {
			tgResults = result
		}
	}
	
	// 异步缓存TG结果
	if len(tgResults) > 0 && cacheInitialized && config.AppConfig.CacheEnabled {
		go func(res []model.SearchResult) {
			ttl := time.Duration(config.AppConfig.CacheTTLMinutes) * time.Minute
			if enhancedTwoLevelCache != nil {
				if data, err := enhancedTwoLevelCache.GetSerializer().Serialize(res); err == nil {
					enhancedTwoLevelCache.Set(tgCacheKey, data, ttl)
				}
			}
		}(tgResults)
	}
	
	// 排序和过滤
	sortResultsByTimeAndKeywords(tgResults)
	filteredForResults := make([]model.SearchResult, 0, len(tgResults))
	for _, result := range tgResults {
		source := getResultSource(result)
		pluginLevel := getPluginLevelBySource(source)
		if !result.Datetime.IsZero() || getKeywordPriority(result.Title) > 0 || pluginLevel <= 2 {
			filteredForResults = append(filteredForResults, result)
		}
	}
	
	mergedLinks := mergeResultsByType(tgResults, keyword, cloudTypes)
	var total int
	if resultType == "merged_by_type" {
		total = 0
		for _, links := range mergedLinks {
			total += len(links)
		}
	} else {
		total = len(filteredForResults)
	}
	
	response := model.SearchResponse{
		Total:        total,
		Results:      filteredForResults,
		MergedByType: mergedLinks,
		HasMore:      true, // 快速搜索，还有更多结果
	}
	
	return filterResponseByType(response, resultType), nil
}

// mediumSearch 中等搜索：6秒超时
func (s *SearchService) mediumSearch(keyword string, channels []string, concurrency int, forceRefresh bool, resultType string, sourceType string, plugins []string, cloudTypes []string, ext map[string]interface{}) (model.SearchResponse, error) {
	// 获取快速结果作为基础
	quickResp, _ := s.quickSearch(keyword, channels, concurrency, forceRefresh, resultType, sourceType, plugins, cloudTypes, ext)
	
	var allResults []model.SearchResult
	// 如果快速搜索有结果，使用它们作为基础
	if len(quickResp.Results) > 0 {
		allResults = append(allResults, quickResp.Results...)
	}
	
	// 添加部分插件搜索（6秒超时）
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	
	// 只搜索优先级高的插件
	if (sourceType == "all" || sourceType == "plugin") && config.AppConfig.AsyncPluginEnabled {
		highPriorityPlugins := s.getHighPriorityPlugins(plugins)
		if len(highPriorityPlugins) > 0 {
			pluginResults, _ := s.searchPluginsWithTimeout(ctx, keyword, highPriorityPlugins, forceRefresh, concurrency, ext)
			allResults = mergeSearchResults(allResults, pluginResults)
		}
	}
	
	// 搜索更多TG频道
	if len(channels) > 1 {
		for i := 1; i < len(channels) && i < 3; i++ { // 最多搜索3个频道
			if result, err := s.searchChannelWithTimeout(ctx, keyword, channels[i]); err == nil {
				allResults = mergeSearchResults(allResults, result)
			}
		}
	}
	
	// 排序和过滤
	sortResultsByTimeAndKeywords(allResults)
	filteredForResults := make([]model.SearchResult, 0, len(allResults))
	for _, result := range allResults {
		source := getResultSource(result)
		pluginLevel := getPluginLevelBySource(source)
		if !result.Datetime.IsZero() || getKeywordPriority(result.Title) > 0 || pluginLevel <= 2 {
			filteredForResults = append(filteredForResults, result)
		}
	}
	
	mergedLinks := mergeResultsByType(allResults, keyword, cloudTypes)
	var total int
	if resultType == "merged_by_type" {
		total = 0
		for _, links := range mergedLinks {
			total += len(links)
		}
	} else {
		total = len(filteredForResults)
	}
	
	response := model.SearchResponse{
		Total:        total,
		Results:      filteredForResults,
		MergedByType: mergedLinks,
		HasMore:      true, // 中等搜索，还有更多结果
	}
	
	return filterResponseByType(response, resultType), nil
}

// fullSearch 完整搜索：原有逻辑
func (s *SearchService) fullSearch(keyword string, channels []string, concurrency int, forceRefresh bool, resultType string, sourceType string, plugins []string, cloudTypes []string, ext map[string]interface{}) (model.SearchResponse, error) {
	// 参数预处理
	// 源类型标准化
	if sourceType == "" {
		sourceType = "all"
	}

	// 插件参数规范化处理
	if sourceType == "tg" {
		// 对于只搜索Telegram的请求，忽略插件参数
		plugins = nil
	} else if sourceType == "all" || sourceType == "plugin" {
		// 检查是否为空列表或只包含空字符串
		if plugins == nil || len(plugins) == 0 {
			plugins = nil
		} else {
			// 检查是否有非空元素
			hasNonEmpty := false
			for _, p := range plugins {
				if p != "" {
					hasNonEmpty = true
					break
				}
			}

			// 如果全是空字符串，视为未指定
			if !hasNonEmpty {
				plugins = nil
			} else {
				// 检查是否包含所有插件
				allPlugins := s.pluginManager.GetPlugins()
				allPluginNames := make([]string, 0, len(allPlugins))
				for _, p := range allPlugins {
					allPluginNames = append(allPluginNames, strings.ToLower(p.Name()))
				}

				// 创建请求的插件名称集合（忽略空字符串）
				requestedPlugins := make([]string, 0, len(plugins))
				for _, p := range plugins {
					if p != "" {
						requestedPlugins = append(requestedPlugins, strings.ToLower(p))
					}
				}

				// 如果请求的插件数量与所有插件数量相同，检查是否包含所有插件
				if len(requestedPlugins) == len(allPluginNames) {
					// 创建映射以便快速查找
					pluginMap := make(map[string]bool)
					for _, p := range requestedPlugins {
						pluginMap[p] = true
					}

					// 检查是否包含所有插件
					allIncluded := true
					for _, name := range allPluginNames {
						if !pluginMap[name] {
							allIncluded = false
							break
						}
					}

					// 如果包含所有插件，统一设为nil
					if allIncluded {
						plugins = nil
					}
				}
			}
		}
	}
	
	// 如果未指定并发数，使用配置中的默认值
	if concurrency <= 0 {
		concurrency = config.AppConfig.DefaultConcurrency
	}

	// 并行获取TG搜索和插件搜索结果
	var tgResults []model.SearchResult
	var pluginResults []model.SearchResult
	
	var wg sync.WaitGroup
	var tgErr, pluginErr error
	
	// 如果需要搜索TG
	if sourceType == "all" || sourceType == "tg" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			tgResults, tgErr = s.searchTG(keyword, channels, forceRefresh)
		}()
	}
	// 如果需要搜索插件（且插件功能已可用）
	if (sourceType == "all" || sourceType == "plugin") && config.AppConfig.AsyncPluginEnabled {
		wg.Add(1)
		go func() {
			defer wg.Done()
			// 对于插件搜索，我们总是希望获取最新的缓存数据
			// 因此，即使forceRefresh=false，我们也需要确保获取到最新的缓存
			pluginResults, pluginErr = s.searchPlugins(keyword, plugins, forceRefresh, concurrency, ext)
		}()
	}
	
	// 等待所有搜索完成
	wg.Wait()
	
	// 检查错误
	if tgErr != nil {
		return model.SearchResponse{}, tgErr
	}
	if pluginErr != nil {
		return model.SearchResponse{}, pluginErr
	}
	
	// 合并结果
	allResults := mergeSearchResults(tgResults, pluginResults)

	// 按照优化后的规则排序结果
	sortResultsByTimeAndKeywords(allResults)

	// 过滤结果，只保留有时间的结果或包含优先关键词的结果或高等级插件结果到Results中
	filteredForResults := make([]model.SearchResult, 0, len(allResults))
	for _, result := range allResults {
		source := getResultSource(result)
		pluginLevel := getPluginLevelBySource(source)
		
		// 有时间的结果或包含优先关键词的结果或高等级插件(1-2级)结果保留在Results中
		if !result.Datetime.IsZero() || getKeywordPriority(result.Title) > 0 || pluginLevel <= 2 {
			filteredForResults = append(filteredForResults, result)
		}
	}

	// 合并链接按网盘类型分组（使用所有过滤后的结果）
	mergedLinks := mergeResultsByType(allResults, keyword, cloudTypes)

	// 构建响应
	var total int
	if resultType == "merged_by_type" {
		// 计算所有类型链接的总数
		total = 0
		for _, links := range mergedLinks {
			total += len(links)
		}
	} else {
		// 只计算filteredForResults的数量
		total = len(filteredForResults)
	}

	response := model.SearchResponse{
		Total:        total,
		Results:      filteredForResults, // 使用进一步过滤的结果
		MergedByType: mergedLinks,
		HasMore:      false, // 完整搜索，没有更多结果
	}

	// 根据resultType过滤返回结果
	return filterResponseByType(response, resultType), nil
}

// getHighPriorityPlugins 获取高优先级插件
func (s *SearchService) getHighPriorityPlugins(plugins []string) []string {
	if s.pluginManager == nil {
		return nil
	}
	
	var highPriority []string
	allPlugins := s.pluginManager.GetPlugins()
	
	for _, p := range allPlugins {
		if p.Priority() <= 2 { // 只要优先级1和2的插件
			if plugins == nil || len(plugins) == 0 {
				// 如果没有指定插件，添加所有高优先级插件
				highPriority = append(highPriority, p.Name())
			} else {
				// 如果指定了插件，只添加指定的高优先级插件
				for _, requestedPlugin := range plugins {
					if strings.ToLower(p.Name()) == strings.ToLower(requestedPlugin) {
						highPriority = append(highPriority, requestedPlugin)
						break
					}
				}
			}
		}
	}
	
	return highPriority
}

// searchTGWithTimeout 带超时的TG搜索（用于快速搜索阶段）
func (s *SearchService) searchTGWithTimeout(ctx context.Context, keyword string, channels []string) ([]model.SearchResult, error) {
	var results []model.SearchResult
	
	// 使用工作池并行搜索多个频道
	tasks := make([]pool.Task, 0, len(channels))
	
	for _, channel := range channels {
		ch := channel // 创建副本，避免闭包问题
		tasks = append(tasks, func() interface{} {
			// 检查上下文是否已取消
			select {
			case <-ctx.Done():
				return nil
			default:
			}
			
			result, err := s.searchChannelWithTimeout(ctx, keyword, ch)
			if err != nil {
				return nil
			}
			return result
		})
	}
	
	// 根据剩余时间计算超时
	deadline, ok := ctx.Deadline()
	var timeout time.Duration
	if ok {
		timeout = time.Until(deadline)
		if timeout <= 0 {
			return nil, context.DeadlineExceeded
		}
	} else {
		timeout = 3 * time.Second
	}
	
	// 执行搜索任务
	taskResults := pool.ExecuteBatchWithTimeout(tasks, len(channels), timeout)
	
	// 合并所有频道的结果
	for _, result := range taskResults {
		if result != nil {
			channelResults := result.([]model.SearchResult)
			results = append(results, channelResults...)
		}
	}
	
	return results, nil
}
