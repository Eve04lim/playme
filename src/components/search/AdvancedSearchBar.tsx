// src/components/search/AdvancedSearchBar.tsx
import { Clock, Filter, Heart, Music, Search, X, Zap } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { musicApi } from '../../api/music'
import { useMusicStore } from '../../stores/musicStore'
import { useMyPageStore } from '../../stores/myPageStore'
import type { Track } from '../../types'

// 拡張Track型（検索結果用）
interface ExtendedTrack extends Track {
  genre?: string[]
  mood?: string[]
}

interface SearchFilters {
  query: string
  genre: string[]
  mood: string[]
  bpmMin: number | null
  bpmMax: number | null
  energyMin: number | null
  energyMax: number | null
  yearMin: number | null
  yearMax: number | null
}

interface AdvancedSearchBarProps {
  onTrackSelect?: (track: Track) => void
  placeholder?: string
  className?: string
}

export const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({
  onTrackSelect,
  placeholder = "音楽を検索...",
  className = ""
}) => {
  const theme = useMyPageStore(state => state.theme)
  const { playTrack } = useMusicStore()
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [availableGenres, setAvailableGenres] = useState<string[]>([])
  const [availableMoods, setAvailableMoods] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<ExtendedTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    genre: [],
    mood: [],
    bpmMin: null,
    bpmMax: null,
    energyMin: null,
    energyMax: null,
    yearMin: null,
    yearMax: null
  })

  // デバウンス用のref
  const debounceRef = React.useRef<number | undefined>(undefined)

  // 検索履歴に追加（useCallbackで定義）
  const addToSearchHistory = useCallback((query: string) => {
    setSearchHistory(prev => {
      const newHistory = [query, ...prev.filter(item => item !== query)].slice(0, 10)
      localStorage.setItem('search-history', JSON.stringify(newHistory))
      return newHistory
    })
  }, [])

  // 初期データ読み込み
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [genres, moods] = await Promise.all([
          musicApi.getAvailableGenres(),
          musicApi.getAvailableMoods()
        ])
        setAvailableGenres(genres)
        setAvailableMoods(moods)
      } catch (error) {
        console.error('Failed to load search data:', error)
      }
    }

    loadInitialData()

    // ローカルストレージから検索履歴を読み込み
    const savedHistory = localStorage.getItem('search-history')
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory))
      } catch {
        // パース失敗時は無視
      }
    }
  }, [addToSearchHistory])

  // デバウンス検索
  const debouncedSearch = useCallback(async (searchFilters: SearchFilters) => {
    if (!searchFilters.query.trim() && searchFilters.genre.length === 0 && searchFilters.mood.length === 0) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const results = await musicApi.advancedSearch({
        query: searchFilters.query.trim() || undefined,
        genre: searchFilters.genre.length > 0 ? searchFilters.genre : undefined,
        mood: searchFilters.mood.length > 0 ? searchFilters.mood : undefined,
        bpmMin: searchFilters.bpmMin || undefined,
        bpmMax: searchFilters.bpmMax || undefined,
        energyMin: searchFilters.energyMin || undefined,
        energyMax: searchFilters.energyMax || undefined,
        yearMin: searchFilters.yearMin || undefined,
        yearMax: searchFilters.yearMax || undefined,
        limit: 20
      })

      setSearchResults(results.tracks)
      setShowResults(true)

      // 検索履歴に追加（テキスト検索のみ）
      if (searchFilters.query.trim()) {
        addToSearchHistory(searchFilters.query.trim())
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '検索に失敗しました')
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [addToSearchHistory])

  // 検索実行
  const performSearch = useCallback((searchFilters: SearchFilters) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      debouncedSearch(searchFilters)
    }, 300)
      }, [debouncedSearch])

  // 検索クエリ変更
  const handleQueryChange = (query: string) => {
    const newFilters = { ...filters, query }
    setFilters(newFilters)
    performSearch(newFilters)
  }

  // フィルター変更
  const handleFilterChange = (filterType: keyof SearchFilters, value: string | number | string[] | null) => {
    const newFilters = { ...filters, [filterType]: value }
    setFilters(newFilters)
    performSearch(newFilters)
  }

  // ジャンル・ムード選択
  const toggleArrayFilter = (filterType: 'genre' | 'mood', value: string) => {
    const currentArray = filters[filterType] as string[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value]
    
    handleFilterChange(filterType, newArray)
  }

  // 楽曲選択
  const handleTrackSelect = (track: ExtendedTrack) => {
    if (onTrackSelect) {
      onTrackSelect(track)
    } else {
      playTrack(track)
    }
    setShowResults(false)
    setIsExpanded(false)
  }

  // フィルターリセット
  const resetFilters = () => {
    setFilters({
      query: '',
      genre: [],
      mood: [],
      bpmMin: null,
      bpmMax: null,
      energyMin: null,
      energyMax: null,
      yearMin: null,
      yearMax: null
    })
    setSearchResults([])
    setShowResults(false)
  }

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsExpanded(true)
        document.getElementById('search-input')?.focus()
      }
      if (e.key === 'Escape') {
        setIsExpanded(false)
        setShowResults(false)
        setShowFilters(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={`relative ${className}`}>
      {/* メイン検索バー */}
      <div 
        className={`relative transition-all duration-300 ${
          isExpanded ? 'w-full' : 'w-full max-w-md'
        }`}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="search-input"
            type="text"
            value={filters.query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            className="w-full pl-10 pr-20 py-3 rounded-full border text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all"
            style={{ 
              backgroundColor: theme.backgroundColor + 'E6',
              borderColor: theme.primaryColor + '40'
            }}
            placeholder={placeholder}
          />
          
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {(filters.genre.length > 0 || filters.mood.length > 0 || 
              filters.bpmMin || filters.bpmMax || filters.energyMin || filters.energyMax) && (
              <button
                onClick={resetFilters}
                className="p-1 rounded-full hover:bg-gray-600 transition-colors"
                title="フィルターをリセット"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1 rounded-full transition-colors ${
                showFilters ? 'bg-gray-600' : 'hover:bg-gray-600'
              }`}
              title="フィルター"
            >
              <Filter className="w-4 h-4 text-gray-400" />
            </button>
            
            <span className="text-xs text-gray-500">Ctrl+K</span>
          </div>
        </div>

        {/* 拡張フィルター */}
        {showFilters && (
          <div 
            className="absolute top-full left-0 right-0 mt-2 p-6 rounded-2xl border shadow-2xl z-50"
            style={{
              backgroundColor: theme.backgroundColor + 'F5',
              borderColor: theme.primaryColor + '30'
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* ジャンルフィルター */}
              <div>
                <h4 className="font-medium mb-3" style={{ color: theme.textColor }}>
                  ジャンル
                </h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {availableGenres.map(genre => (
                    <button
                      key={genre}
                      onClick={() => toggleArrayFilter('genre', genre)}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        filters.genre.includes(genre)
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        backgroundColor: filters.genre.includes(genre) 
                          ? theme.primaryColor 
                          : theme.secondaryColor,
                        border: `1px solid ${filters.genre.includes(genre) 
                          ? theme.primaryColor 
                          : theme.primaryColor + '40'}`
                      }}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* ムードフィルター */}
              <div>
                <h4 className="font-medium mb-3" style={{ color: theme.textColor }}>
                  ムード
                </h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {availableMoods.map(mood => (
                    <button
                      key={mood}
                      onClick={() => toggleArrayFilter('mood', mood)}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        filters.mood.includes(mood)
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        backgroundColor: filters.mood.includes(mood) 
                          ? theme.primaryColor 
                          : theme.secondaryColor,
                        border: `1px solid ${filters.mood.includes(mood) 
                          ? theme.primaryColor 
                          : theme.primaryColor + '40'}`
                      }}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* BPM範囲 */}
              <div>
                <h4 className="font-medium mb-3" style={{ color: theme.textColor }}>
                  BPM範囲
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="最小"
                      value={filters.bpmMin || ''}
                      onChange={(e) => handleFilterChange('bpmMin', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-20 px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: theme.secondaryColor,
                        borderColor: theme.primaryColor + '40',
                        color: theme.textColor
                      }}
                      min="60"
                      max="200"
                    />
                    <span className="text-gray-400">~</span>
                    <input
                      type="number"
                      placeholder="最大"
                      value={filters.bpmMax || ''}
                      onChange={(e) => handleFilterChange('bpmMax', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-20 px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: theme.secondaryColor,
                        borderColor: theme.primaryColor + '40',
                        color: theme.textColor
                      }}
                      min="60"
                      max="200"
                    />
                  </div>
                </div>
              </div>

              {/* エネルギー範囲 */}
              <div>
                <h4 className="font-medium mb-3" style={{ color: theme.textColor }}>
                  エネルギー
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={filters.energyMin || 0}
                      onChange={(e) => handleFilterChange('energyMin', parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-400 w-8">
                      {((filters.energyMin || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">最小エネルギー</div>
                </div>
              </div>

              {/* 年代範囲 */}
              <div>
                <h4 className="font-medium mb-3" style={{ color: theme.textColor }}>
                  リリース年
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="2020"
                      value={filters.yearMin || ''}
                      onChange={(e) => handleFilterChange('yearMin', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-20 px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: theme.secondaryColor,
                        borderColor: theme.primaryColor + '40',
                        color: theme.textColor
                      }}
                      min="1900"
                      max="2030"
                    />
                    <span className="text-gray-400">~</span>
                    <input
                      type="number"
                      placeholder="2024"
                      value={filters.yearMax || ''}
                      onChange={(e) => handleFilterChange('yearMax', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-20 px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: theme.secondaryColor,
                        borderColor: theme.primaryColor + '40',
                        color: theme.textColor
                      }}
                      min="1900"
                      max="2030"
                    />
                  </div>
                </div>
              </div>

              {/* クイックプリセット */}
              <div>
                <h4 className="font-medium mb-3" style={{ color: theme.textColor }}>
                  クイック選択
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={() => handleFilterChange('mood', ['energetic', 'upbeat'])}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-700"
                    style={{ color: theme.textColor }}
                  >
                    <Zap className="w-4 h-4 inline mr-2" />
                    エネルギッシュ
                  </button>
                  <button
                    onClick={() => handleFilterChange('mood', ['peaceful', 'relaxing'])}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-700"
                    style={{ color: theme.textColor }}
                  >
                    <Heart className="w-4 h-4 inline mr-2" />
                    リラックス
                  </button>
                  <button
                    onClick={() => handleFilterChange('genre', ['J-Pop', 'Pop'])}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-700"
                    style={{ color: theme.textColor }}
                  >
                    <Music className="w-4 h-4 inline mr-2" />
                    ポップス
                  </button>
                </div>
              </div>
            </div>

            {/* フィルターアクション */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t" style={{ borderColor: theme.primaryColor + '20' }}>
              <div className="text-sm text-gray-400">
                {filters.genre.length + filters.mood.length > 0 && (
                  <span>
                    {filters.genre.length + filters.mood.length} フィルター適用中
                  </span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{ 
                    color: theme.textColor,
                    backgroundColor: theme.secondaryColor
                  }}
                >
                  リセット
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 rounded-lg text-sm text-white transition-colors"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  適用
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 検索結果 */}
        {showResults && (
          <div 
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl border shadow-2xl z-40 max-h-96 overflow-y-auto"
            style={{
              backgroundColor: theme.backgroundColor + 'F5',
              borderColor: theme.primaryColor + '30'
            }}
          >
            {loading && (
              <div className="p-6 text-center">
                <div className="inline-flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.primaryColor + ' transparent transparent transparent' }} />
                  <span style={{ color: theme.textColor }}>検索中...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-6">
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            )}

            {!loading && !error && searchResults.length === 0 && filters.query && (
              <div className="p-6 text-center">
                <p style={{ color: theme.textColor + '80' }}>検索結果が見つかりませんでした</p>
                {searchHistory.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm mb-2" style={{ color: theme.textColor }}>最近の検索:</p>
                    <div className="flex flex-wrap gap-2">
                      {searchHistory.slice(0, 5).map((item, index) => (
                        <button
                          key={index}
                          onClick={() => handleQueryChange(item)}
                          className="px-3 py-1 rounded-full text-sm transition-colors hover:bg-gray-700"
                          style={{ 
                            color: theme.textColor,
                            backgroundColor: theme.secondaryColor 
                          }}
                        >
                          <Clock className="w-3 h-3 inline mr-1" />
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!loading && !error && searchResults.length > 0 && (
              <div className="p-2">
                {searchResults.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handleTrackSelect(track)}
                    className="w-full p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] text-left group"
                    style={{ backgroundColor: theme.secondaryColor }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.primaryColor + '10'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.secondaryColor
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={track.artworkUrl || 'https://via.placeholder.com/48x48?text=♪'}
                        alt={track.title}
                        className="w-12 h-12 rounded-lg object-cover shadow-md group-hover:shadow-lg transition-shadow"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate group-hover:text-white transition-colors" style={{ color: theme.textColor }}>
                          {track.title}
                        </h4>
                        <p className="text-sm truncate" style={{ color: theme.textColor + 'CC' }}>
                          {track.artist}
                        </p>
                        {track.album && (
                          <p className="text-xs truncate" style={{ color: theme.textColor + '99' }}>
                            {track.album}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs" style={{ color: theme.textColor + '80' }}>
                          {Math.floor(track.duration / 60000)}:{String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}
                        </div>
                        {(track as ExtendedTrack).genre && (
                          <div className="text-xs mt-1" style={{ color: theme.primaryColor }}>
                            {(track as ExtendedTrack).genre![0]}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 背景オーバーレイ */}
      {(showResults || showFilters) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-30"
          onClick={() => {
            setShowResults(false)
            setShowFilters(false)
            setIsExpanded(false)
          }}
        />
      )}
    </div>
  )
}