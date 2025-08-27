// src/components/search/IntegratedSearchBar.tsx
import { Search, Loader, Music, Clock, X } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { musicApi } from '../../api/music'
import { useMusicStore } from '../../stores/musicStore'
import { useMyPageStore } from '../../stores/myPageStore'
import type { Track } from '../../types'

interface SearchService {
  id: 'unified' | 'spotify' | 'appleMusic'
  name: string
  icon: React.ElementType
  description: string
}

interface SearchSuggestion {
  id: string
  type: 'track' | 'artist' | 'album' | 'recent' | 'trending'
  title: string
  subtitle?: string
  imageUrl?: string
  data?: Track
}

interface IntegratedSearchBarProps {
  onTrackSelect?: (track: Track) => void
  placeholder?: string
  className?: string
  showServiceToggle?: boolean
  defaultService?: 'unified' | 'spotify' | 'appleMusic'
  maxSuggestions?: number
}

export const IntegratedSearchBar: React.FC<IntegratedSearchBarProps> = ({
  onTrackSelect,
  placeholder = "音楽を検索...",
  className = "",
  showServiceToggle = true,
  defaultService = 'unified',
  maxSuggestions = 8
}) => {
  const theme = useMyPageStore(state => state.theme)
  const { playTrack } = useMusicStore()
  
  const [query, setQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedService, setSelectedService] = useState<'unified' | 'spotify' | 'appleMusic'>(defaultService)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [, setSearchHistory] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<SearchSuggestion[]>([])
  
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<number | undefined>(undefined)
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([])

  // 検索サービス設定
  const searchServices: SearchService[] = [
    {
      id: 'unified',
      name: '統合検索',
      icon: Music,
      description: 'Spotify + Apple Music'
    },
    {
      id: 'spotify',
      name: 'Spotify',
      icon: Music,
      description: 'Spotify Web API'
    },
    {
      id: 'appleMusic',
      name: 'Apple Music',
      icon: Music,
      description: 'Apple MusicKit'
    }
  ]

  // 検索履歴の初期化
  useEffect(() => {
    const savedHistory = localStorage.getItem('integrated-search-history')
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory)
        setSearchHistory(history)
        
        // 最近の検索をサジェストに変換
        const recentSuggestions: SearchSuggestion[] = history.slice(0, 5).map((term: string, index: number) => ({
          id: `recent_${index}`,
          type: 'recent' as const,
          title: term,
          subtitle: '最近の検索'
        }))
        setRecentSearches(recentSuggestions)
      } catch {
        // パース失敗時は無視
      }
    }
  }, [])

  // 検索履歴に追加
  const addToSearchHistory = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return
    
    setSearchHistory(prev => {
      const newHistory = [searchTerm, ...prev.filter(term => term !== searchTerm)].slice(0, 20)
      localStorage.setItem('integrated-search-history', JSON.stringify(newHistory))
      return newHistory
    })
  }, [])

  // デバウンス検索の実装
  const performSearch = useCallback(async (searchQuery: string, service: string) => {
    if (!searchQuery.trim()) {
      setSuggestions(recentSearches)
      return
    }

    setIsLoading(true)
    
    try {
      let searchResults: Track[] = []
      
      // サービスに応じた検索実行
      if (service === 'unified') {
        const multiResult = await musicApi.multiServiceSearch({
          query: searchQuery,
          limit: maxSuggestions,
          mergeResults: true
        })
        searchResults = multiResult.tracks
      } else {
        const serviceResult = await musicApi.serviceSpecificSearch({
          query: searchQuery,
          service: service as 'spotify' | 'appleMusic',
          searchType: 'track',
          limit: maxSuggestions
        })
        searchResults = serviceResult.tracks || []
      }

      // 検索結果をサジェストに変換
      const trackSuggestions: SearchSuggestion[] = searchResults.map(track => ({
        id: track.id,
        type: 'track',
        title: track.title,
        subtitle: `${track.artist}${track.album ? ` • ${track.album}` : ''}`,
        imageUrl: track.artworkUrl,
        data: track
      }))

      // トレンドや人気楽曲も追加（モック実装）
      const trendingSuggestions: SearchSuggestion[] = []
      if (searchQuery.length <= 2) {
        const trendingTracks = await musicApi.getTrendingTracks({ limit: 3 })
        trendingSuggestions.push(...trendingTracks.map(track => ({
          id: `trending_${track.id}`,
          type: 'trending' as const,
          title: track.title,
          subtitle: `${track.artist} • トレンド`,
          imageUrl: track.artworkUrl,
          data: track
        })))
      }

      setSuggestions([...trackSuggestions, ...trendingSuggestions])
    } catch (error) {
      console.error('Search failed:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [maxSuggestions, recentSearches])

  // デバウンスされた検索実行
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim() === '') {
      setSuggestions(recentSearches)
      return
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      performSearch(query, selectedService)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, selectedService, performSearch, recentSearches])

  // 直接検索実行
  const handleDirectSearch = useCallback((searchQuery: string) => {
    addToSearchHistory(searchQuery.trim())
    performSearch(searchQuery, selectedService)
  }, [addToSearchHistory, performSearch, selectedService])

  // サジェスト選択処理
  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.data) {
      addToSearchHistory(suggestion.data.title)
      
      if (onTrackSelect) {
        onTrackSelect(suggestion.data)
      } else {
        playTrack(suggestion.data)
      }
    } else if (suggestion.type === 'recent') {
      setQuery(suggestion.title)
      performSearch(suggestion.title, selectedService)
    }
    
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }, [addToSearchHistory, onTrackSelect, playTrack, performSearch, selectedService])

  // キーボードナビゲーション
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
        
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
        
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionSelect(suggestions[selectedIndex])
        } else if (query.trim()) {
          handleDirectSearch(query)
        }
        break
        
      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }, [showSuggestions, suggestions, selectedIndex, query, handleDirectSearch, handleSuggestionSelect])

  // フォーカス処理
  const handleInputFocus = () => {
    setIsExpanded(true)
    setShowSuggestions(true)
    if (query.trim() === '' && recentSearches.length > 0) {
      setSuggestions(recentSearches)
    }
  }

  // グローバルキーボードショートカット
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsExpanded(true)
        setShowSuggestions(true)
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // 選択されたインデックスが変わった時のスクロール処理
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [selectedIndex])

  const currentService = searchServices.find(s => s.id === selectedService)
  const CurrentServiceIcon = currentService?.icon || Music

  return (
    <div className={`relative ${className}`}>
      {/* メイン検索バー */}
      <div 
        className={`relative transition-all duration-300 ${
          isExpanded ? 'w-full' : 'w-full max-w-2xl'
        }`}
      >
        <div className="relative">
          {/* 検索アイコン */}
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          
          {/* 検索入力フィールド */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            className="w-full pl-12 pr-32 py-4 rounded-2xl border text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all text-lg"
            style={{ 
              backgroundColor: theme.backgroundColor + 'E6',
              borderColor: theme.primaryColor + '40'
            }}
            placeholder={placeholder}
          />
          
          {/* 右側のコントロール */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-3">
            {/* ローディング表示 */}
            {isLoading && (
              <Loader className="w-5 h-5 animate-spin" style={{ color: theme.primaryColor }} />
            )}
            
            {/* クリアボタン */}
            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  setSuggestions(recentSearches)
                  inputRef.current?.focus()
                }}
                className="p-1 rounded-full hover:bg-gray-600 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            
            {/* サービス切り替え */}
            {showServiceToggle && (
              <div className="flex items-center space-x-1 bg-gray-700 rounded-lg px-2 py-1">
                <CurrentServiceIcon className="w-4 h-4" style={{ color: theme.primaryColor }} />
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value as 'unified' | 'spotify' | 'appleMusic')}
                  className="bg-transparent text-sm text-white border-none outline-none cursor-pointer"
                  style={{ color: theme.textColor }}
                >
                  {searchServices.map(service => (
                    <option key={service.id} value={service.id} className="bg-gray-800">
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* キーボードショートカット表示 */}
            <div className="hidden md:flex items-center space-x-1 text-xs text-gray-500">
              <span>⌘K</span>
            </div>
          </div>
        </div>

        {/* サジェスト表示 */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            className="absolute top-full left-0 right-0 mt-2 max-h-96 overflow-y-auto rounded-2xl border shadow-2xl z-50"
            style={{
              backgroundColor: theme.backgroundColor + 'F8',
              borderColor: theme.primaryColor + '30'
            }}
          >
            <div className="p-2">
              {/* サービス情報表示 */}
              <div className="px-3 py-2 text-xs text-gray-400 flex items-center justify-between">
                <span>検索結果: {currentService?.name}</span>
                {!isLoading && suggestions.length > 0 && (
                  <span>{suggestions.length}件の結果</span>
                )}
              </div>
              
              {/* サジェスト一覧 */}
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  ref={el => { suggestionRefs.current[index] = el }}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={`p-3 rounded-xl cursor-pointer transition-all duration-200 flex items-center space-x-3 ${
                    selectedIndex === index 
                      ? 'scale-[1.02]' 
                      : 'hover:scale-[1.01]'
                  }`}
                  style={{
                    backgroundColor: selectedIndex === index 
                      ? theme.primaryColor + '20' 
                      : theme.secondaryColor,
                    borderLeft: selectedIndex === index 
                      ? `3px solid ${theme.primaryColor}` 
                      : 'none'
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onMouseLeave={() => setSelectedIndex(-1)}
                >
                  {/* サジェストアイコン/画像 */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    {suggestion.imageUrl ? (
                      <img
                        src={suggestion.imageUrl}
                        alt={suggestion.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: theme.primaryColor + '30' }}
                      >
                        {suggestion.type === 'recent' ? (
                          <Clock className="w-5 h-5" style={{ color: theme.primaryColor }} />
                        ) : (
                          <Music className="w-5 h-5" style={{ color: theme.primaryColor }} />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* サジェスト詳細 */}
                  <div className="flex-1 min-w-0">
                    <h4 
                      className="font-medium truncate"
                      style={{ color: theme.textColor }}
                    >
                      {suggestion.title}
                    </h4>
                    {suggestion.subtitle && (
                      <p 
                        className="text-sm truncate mt-1"
                        style={{ color: theme.textColor + 'CC' }}
                      >
                        {suggestion.subtitle}
                      </p>
                    )}
                  </div>
                  
                  {/* サジェストタイプ表示 */}
                  <div className="flex-shrink-0">
                    {suggestion.type === 'trending' && (
                      <div className="px-2 py-1 rounded text-xs bg-red-500 text-white">
                        🔥 トレンド
                      </div>
                    )}
                    {suggestion.type === 'recent' && (
                      <div className="px-2 py-1 rounded text-xs" style={{ 
                        backgroundColor: theme.primaryColor + '20',
                        color: theme.primaryColor 
                      }}>
                        履歴
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 背景オーバーレイ */}
      {showSuggestions && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={() => {
            setShowSuggestions(false)
            setIsExpanded(false)
            setSelectedIndex(-1)
          }}
        />
      )}
    </div>
  )
}