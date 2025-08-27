// src/components/search/SearchWithPlaylistIntegration.tsx
import {
  Search, Filter, Plus, Music, Heart, Play, MoreHorizontal,
  List, Grid, Clock, Users, Album, TrendingUp, X, Check,
  PlayCircle, PlusCircle, ListPlus
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useMyPageStore } from '../../stores/myPageStore'
import { musicApi } from '../../api/music'
import { usePlaylistIntegration, usePlaylistSelector } from '../../hooks/usePlaylistIntegration'
import { PlaylistGenerator, type PlaylistEntry } from '../../utils/playlistGenerator'
import type { Track } from '../../types'

interface SearchResult {
  tracks: Track[]
  artists: any[]
  albums: any[]
  playlists: any[]
}

interface SearchWithPlaylistIntegrationProps {
  className?: string
  onTrackSelect?: (track: Track) => void
}

export const SearchWithPlaylistIntegration: React.FC<SearchWithPlaylistIntegrationProps> = ({
  className = '',
  onTrackSelect
}) => {
  const theme = useMyPageStore(state => state.theme)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult>({
    tracks: [],
    artists: [],
    albums: [],
    playlists: []
  })
  
  const [isSearching, setIsSearching] = useState(false)
  const [activeTab, setActiveTab] = useState<'tracks' | 'artists' | 'albums' | 'playlists'>('tracks')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  
  // プレイリスト統合
  const [allTracks, setAllTracks] = useState<Track[]>([])
  const [playlistGenerator, setPlaylistGenerator] = useState<PlaylistGenerator | null>(null)
  
  const playlistIntegration = usePlaylistIntegration(playlistGenerator, {
    onPlaylistUpdate: (playlist) => {
      console.log('Playlist updated:', playlist.name)
      setSelectedItems(new Set()) // 選択解除
    }
  })
  
  const playlistSelector = usePlaylistSelector(playlistIntegration.playlists)

  // 初期化
  useEffect(() => {
    const initializeData = async () => {
      try {
        const tracks = await musicApi.getTrendingTracks({ limit: 250 })
        setAllTracks(tracks)
        setPlaylistGenerator(new PlaylistGenerator(tracks))
      } catch (error) {
        console.error('Failed to initialize search:', error)
      }
    }

    initializeData()
  }, [])

  // 検索実行
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ tracks: [], artists: [], albums: [], playlists: [] })
      return
    }

    setIsSearching(true)
    try {
      const [tracks, artists, albums] = await Promise.all([
        musicApi.searchTracks(query),
        musicApi.searchArtists ? musicApi.searchArtists(query) : Promise.resolve([]),
        musicApi.searchAlbums ? musicApi.searchAlbums(query) : Promise.resolve([])
      ])

      setSearchResults({
        tracks: tracks || [],
        artists: artists || [],
        albums: albums || [],
        playlists: [] // 将来の実装用
      })
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults({ tracks: [], artists: [], albums: [], playlists: [] })
    } finally {
      setIsSearching(false)
    }
  }, [])

  // デバウンス検索
  useEffect(() => {
    const debounce = setTimeout(() => {
      handleSearch(searchQuery)
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchQuery, handleSearch])

  // アイテム選択切り替え
  const toggleSelection = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // 全選択/全解除
  const toggleSelectAll = () => {
    const currentItems = searchResults[activeTab]
    const currentIds = currentItems.map(item => item.id)
    
    if (selectedItems.size === 0 || !currentIds.every(id => selectedItems.has(id))) {
      setSelectedItems(new Set([...selectedItems, ...currentIds]))
    } else {
      const newSet = new Set(selectedItems)
      currentIds.forEach(id => newSet.delete(id))
      setSelectedItems(newSet)
    }
  }

  // プレイリストに追加
  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      const selectedTracks = searchResults.tracks.filter(track => selectedItems.has(track.id))
      if (selectedTracks.length === 0) return

      await playlistIntegration.addTracksToPlaylist(playlistId, selectedTracks)
      playlistSelector.setShowSelector(false)
    } catch (error) {
      console.error('Failed to add to playlist:', error)
    }
  }

  // 新規プレイリスト作成
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return

    try {
      const selectedTracks = searchResults.tracks.filter(track => selectedItems.has(track.id))
      const playlist = await playlistIntegration.createPlaylistFromSearch(
        newPlaylistName,
        selectedTracks,
        `検索結果「${searchQuery}」から作成されたプレイリスト`
      )
      
      setNewPlaylistName('')
      setShowCreatePlaylist(false)
      console.log('Created playlist:', playlist.name)
    } catch (error) {
      console.error('Failed to create playlist:', error)
    }
  }

  // タブ情報
  const tabs = [
    { id: 'tracks', label: '楽曲', icon: Music, count: searchResults.tracks.length },
    { id: 'artists', label: 'アーティスト', icon: Users, count: searchResults.artists.length },
    { id: 'albums', label: 'アルバム', icon: Album, count: searchResults.albums.length },
    { id: 'playlists', label: 'プレイリスト', icon: List, count: searchResults.playlists.length }
  ]

  // トラックアイテム
  const TrackItem: React.FC<{ track: Track; index: number }> = ({ track, index }) => {
    const isSelected = selectedItems.has(track.id)
    
    return (
      <div
        className={`group p-4 rounded-lg transition-all duration-200 ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-500/10' : ''
        }`}
        style={{ backgroundColor: theme.secondaryColor }}
      >
        <div className="flex items-center space-x-4">
          {/* 選択チェックボックス */}
          <button
            onClick={() => toggleSelection(track.id)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>

          {/* 順番 */}
          <span className="w-8 text-sm text-center" style={{ color: theme.textColor + '99' }}>
            {index + 1}
          </span>

          {/* アートワーク */}
          <img
            src={track.artworkUrl || `https://picsum.photos/48/48?random=${track.id}`}
            alt={track.title}
            className="w-12 h-12 rounded-lg object-cover"
          />

          {/* 楽曲情報 */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate" style={{ color: theme.textColor }}>
              {track.title}
            </h4>
            <p className="text-sm truncate" style={{ color: theme.textColor + 'CC' }}>
              {track.artist}
            </p>
          </div>

          {/* メタデータ */}
          <div className="hidden md:flex items-center space-x-4 text-sm" style={{ color: theme.textColor + '99' }}>
            <span>{track.album}</span>
            <span>{Math.floor(track.duration / 60000)}:{Math.floor((track.duration % 60000) / 1000).toString().padStart(2, '0')}</span>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onTrackSelect?.(track)}
              className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
              title="再生"
            >
              <Play className="w-4 h-4 text-white" fill="white" />
            </button>
            
            <button
              onClick={() => toggleSelection(track.id)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isSelected 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
              title={isSelected ? '選択解除' : 'プレイリストに追加'}
            >
              {isSelected ? (
                <X className="w-4 h-4 text-white" />
              ) : (
                <Plus className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* 検索ヘッダー */}
      <div className="space-y-4">
        {/* 検索バー */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" 
                  style={{ color: theme.textColor + '99' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="楽曲、アーティスト、アルバムを検索..."
            className="w-full pl-12 pr-4 py-4 rounded-xl text-lg border-0 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: theme.secondaryColor,
              color: theme.textColor,
              focusRingColor: theme.primaryColor
            }}
          />
          
          {isSearching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" 
                   style={{ borderColor: theme.primaryColor }} />
            </div>
          )}
        </div>

        {/* 結果サマリー */}
        {searchQuery && (
          <div className="flex items-center justify-between">
            <div className="text-sm" style={{ color: theme.textColor + 'CC' }}>
              「{searchQuery}」の検索結果: 
              <span className="font-medium ml-1" style={{ color: theme.textColor }}>
                {searchResults.tracks.length + searchResults.artists.length + searchResults.albums.length}件
              </span>
            </div>
            
            {selectedItems.size > 0 && (
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium" style={{ color: theme.primaryColor }}>
                  {selectedItems.size}件選択中
                </span>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => playlistSelector.setShowSelector(true)}
                    className="px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1"
                    style={{
                      backgroundColor: theme.primaryColor,
                      color: 'white'
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>プレイリストに追加</span>
                  </button>
                  
                  <button
                    onClick={() => setShowCreatePlaylist(true)}
                    className="px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1"
                    style={{
                      backgroundColor: theme.secondaryColor,
                      color: theme.textColor
                    }}
                  >
                    <ListPlus className="w-4 h-4" />
                    <span>新規作成</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* タブナビゲーション */}
      {searchQuery && (
        <div className="flex items-center justify-between">
          <div className="flex space-x-1 p-1 rounded-lg" style={{ backgroundColor: theme.secondaryColor }}>
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                  activeTab === id ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: activeTab === id ? theme.primaryColor : 'transparent',
                  color: activeTab === id ? 'white' : theme.textColor
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {count > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full" 
                        style={{ backgroundColor: activeTab === id ? 'rgba(255,255,255,0.2)' : theme.primaryColor + '20' }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 表示モード切り替え */}
          <div className="flex items-center space-x-2">
            {activeTab === 'tracks' && searchResults.tracks.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: theme.secondaryColor,
                  color: theme.textColor
                }}
              >
                {selectedItems.size === 0 || !searchResults.tracks.every(t => selectedItems.has(t.id))
                  ? '全選択' 
                  : '全解除'
                }
              </button>
            )}
            
            <div className="flex border rounded-lg" style={{ borderColor: theme.textColor + '20' }}>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? '' : 'opacity-50'}`}
                style={{ color: theme.textColor }}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? '' : 'opacity-50'}`}
                style={{ color: theme.textColor }}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 検索結果 */}
      {searchQuery && (
        <div className="space-y-4">
          {activeTab === 'tracks' && (
            <div className="space-y-2">
              {searchResults.tracks.length > 0 ? (
                searchResults.tracks.map((track, index) => (
                  <TrackItem key={track.id} track={track} index={index} />
                ))
              ) : (
                !isSearching && (
                  <div className="text-center py-12">
                    <Music className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: theme.textColor }} />
                    <p className="text-lg font-medium mb-2" style={{ color: theme.textColor }}>
                      楽曲が見つかりませんでした
                    </p>
                    <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                      検索キーワードを変更してお試しください
                    </p>
                  </div>
                )
              )}
            </div>
          )}

          {/* 他のタブのコンテンツ（未実装） */}
          {activeTab !== 'tracks' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 opacity-50 rounded-full flex items-center justify-center"
                   style={{ backgroundColor: theme.textColor + '10' }}>
                {tabs.find(t => t.id === activeTab)?.icon && 
                  React.createElement(tabs.find(t => t.id === activeTab)!.icon, 
                    { className: "w-8 h-8", style: { color: theme.textColor } }
                  )
                }
              </div>
              <p className="text-lg font-medium mb-2" style={{ color: theme.textColor }}>
                {tabs.find(t => t.id === activeTab)?.label}検索
              </p>
              <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                この機能は近日実装予定です
              </p>
            </div>
          )}
        </div>
      )}

      {/* プレイリスト選択モーダル */}
      {playlistSelector.showSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div 
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: theme.backgroundColor }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textColor }}>
              プレイリストに追加
            </h3>
            
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {playlistIntegration.playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => handleAddToPlaylist(playlist.id)}
                  className="w-full p-3 rounded-lg text-left hover:bg-opacity-80 transition-colors"
                  style={{ backgroundColor: theme.secondaryColor }}
                >
                  <div className="font-medium" style={{ color: theme.textColor }}>
                    {playlist.name}
                  </div>
                  <div className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                    {playlist.tracks.length}曲
                  </div>
                </button>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => playlistSelector.setShowSelector(false)}
                className="flex-1 py-2 px-4 rounded-lg transition-colors"
                style={{
                  backgroundColor: theme.secondaryColor,
                  color: theme.textColor
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規プレイリスト作成モーダル */}
      {showCreatePlaylist && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div 
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: theme.backgroundColor }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textColor }}>
              新規プレイリスト作成
            </h3>
            
            <div className="space-y-4">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="プレイリスト名を入力..."
                className="w-full px-3 py-2 rounded-lg border-0 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: theme.secondaryColor,
                  color: theme.textColor
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              />
              
              <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                選択した{selectedItems.size}曲でプレイリストを作成します
              </p>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreatePlaylist(false)}
                className="flex-1 py-2 px-4 rounded-lg transition-colors"
                style={{
                  backgroundColor: theme.secondaryColor,
                  color: theme.textColor
                }}
              >
                キャンセル
              </button>
              
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                className="flex-1 py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: theme.primaryColor,
                  color: 'white'
                }}
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}