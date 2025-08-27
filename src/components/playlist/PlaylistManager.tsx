// src/components/playlist/PlaylistManager.tsx
import {
  Plus, Search, Filter, Grid, List, Play, Heart, MoreHorizontal,
  Clock, Music, Users, Calendar, Star, Trash2, Edit3, Share,
  Download, Shuffle, Eye, EyeOff, TrendingUp
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useMyPageStore } from '../../stores/myPageStore'
import { PlaylistGenerator, type PlaylistEntry } from '../../utils/playlistGenerator'
import { usePlaylistIntegration } from '../../hooks/usePlaylistIntegration'
import { PlaylistCreator } from './PlaylistCreator'
import { PlaylistEditModal } from './PlaylistEditModal'
import { musicApi } from '../../api/music'
import type { Track } from '../../types'

interface PlaylistManagerProps {
  className?: string
  onPlaylistPlay?: (playlist: PlaylistEntry) => void
  onTrackPlay?: (track: Track) => void
}

type SortOption = 'name' | 'created' | 'updated' | 'trackCount' | 'duration'
type FilterOption = 'all' | 'public' | 'private' | 'template' | 'custom'
type ViewMode = 'grid' | 'list'

export const PlaylistManager: React.FC<PlaylistManagerProps> = ({
  className = '',
  onPlaylistPlay,
  onTrackPlay
}) => {
  const theme = useMyPageStore(state => state.theme)
  
  // 状態管理
  const [currentView, setCurrentView] = useState<'manager' | 'creator'>('manager')
  const [editingPlaylist, setEditingPlaylist] = useState<PlaylistEntry | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('updated')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(false)
  
  // データ
  const [allTracks, setAllTracks] = useState<Track[]>([])
  const [playlistGenerator, setPlaylistGenerator] = useState<PlaylistGenerator | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // プレイリスト統合機能
  const playlistIntegration = usePlaylistIntegration(playlistGenerator, {
    onPlaylistUpdate: (playlist) => {
      console.log('Playlist updated:', playlist.name)
    }
  })

  // データ初期化
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true)
      try {
        const tracks = await musicApi.getTrendingTracks({ limit: 250 })
        setAllTracks(tracks)
        setPlaylistGenerator(new PlaylistGenerator(tracks))
      } catch (error) {
        console.error('Failed to initialize playlist manager:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeData()
  }, [])

  // フィルタリングとソート
  const filteredAndSortedPlaylists = React.useMemo(() => {
    let playlists = [...playlistIntegration.playlists]

    // 検索フィルター
    if (searchQuery) {
      playlists = playlists.filter(playlist =>
        playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        playlist.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        playlist.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // カテゴリフィルター
    switch (filterBy) {
      case 'public':
        playlists = playlists.filter(p => p.isPublic)
        break
      case 'private':
        playlists = playlists.filter(p => !p.isPublic)
        break
      case 'template':
        playlists = playlists.filter(p => !!p.templateId)
        break
      case 'custom':
        playlists = playlists.filter(p => !p.templateId)
        break
    }

    // ソート
    playlists.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'created':
          return b.createdAt.getTime() - a.createdAt.getTime()
        case 'updated':
          return b.updatedAt.getTime() - a.updatedAt.getTime()
        case 'trackCount':
          return b.tracks.length - a.tracks.length
        case 'duration':
          return b.totalDuration - a.totalDuration
        default:
          return 0
      }
    })

    return playlists
  }, [playlistIntegration.playlists, searchQuery, filterBy, sortBy])

  // 時間フォーマット
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}時間${minutes % 60}分`
    }
    return `${minutes}分`
  }

  // プレイリスト削除
  const handleDeletePlaylist = (playlistId: string) => {
    if (playlistGenerator?.deletePlaylist(playlistId)) {
      playlistIntegration.refreshPlaylists()
    }
  }

  // プレイリストカード（グリッドビュー用）
  const PlaylistCard: React.FC<{ playlist: PlaylistEntry }> = ({ playlist }) => (
    <div
      className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl"
      style={{ backgroundColor: theme.secondaryColor }}
    >
      {/* カバーアート */}
      <div 
        className="aspect-square relative overflow-hidden"
        style={{ background: playlist.coverArt || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        {/* プレイボタンオーバーレイ */}
        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={() => onPlaylistPlay?.(playlist)}
            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors transform hover:scale-110"
          >
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </button>
        </div>

        {/* 公開状態インジケーター */}
        <div className="absolute top-3 right-3">
          {playlist.isPublic ? (
            <Eye className="w-5 h-5 text-white drop-shadow-lg" />
          ) : (
            <EyeOff className="w-5 h-5 text-white drop-shadow-lg" />
          )}
        </div>

        {/* テンプレートバッジ */}
        {playlist.templateId && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-blue-500 rounded-full text-xs text-white font-medium">
            テンプレート
          </div>
        )}
      </div>

      {/* プレイリスト情報 */}
      <div className="p-4">
        <h3 
          className="font-bold text-lg mb-1 truncate"
          style={{ color: theme.textColor }}
        >
          {playlist.name}
        </h3>
        
        {playlist.description && (
          <p 
            className="text-sm mb-3 line-clamp-2"
            style={{ color: theme.textColor + 'CC' }}
          >
            {playlist.description}
          </p>
        )}

        {/* 統計情報 */}
        <div className="flex items-center justify-between text-sm mb-3" style={{ color: theme.textColor + '99' }}>
          <span className="flex items-center space-x-1">
            <Music className="w-4 h-4" />
            <span>{playlist.tracks.length}曲</span>
          </span>
          <span className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(playlist.totalDuration)}</span>
          </span>
        </div>

        {/* タグ */}
        {playlist.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {playlist.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs rounded-full"
                style={{ backgroundColor: theme.primaryColor + '20', color: theme.primaryColor }}
              >
                {tag}
              </span>
            ))}
            {playlist.tags.length > 3 && (
              <span className="text-xs" style={{ color: theme.textColor + '99' }}>
                +{playlist.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 最終更新日 */}
        <p className="text-xs" style={{ color: theme.textColor + '66' }}>
          {playlist.updatedAt.toLocaleDateString('ja-JP')}更新
        </p>
      </div>

      {/* アクションメニュー */}
      <div className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex flex-col space-y-1">
          <button
            onClick={() => setEditingPlaylist(playlist)}
            className="w-8 h-8 bg-black bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors"
            title="編集"
          >
            <Edit3 className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => handleDeletePlaylist(playlist.id)}
            className="w-8 h-8 bg-black bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors"
            title="削除"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  )

  // プレイリストリストアイテム（リストビュー用）
  const PlaylistListItem: React.FC<{ playlist: PlaylistEntry }> = ({ playlist }) => (
    <div
      className="group flex items-center p-4 rounded-lg transition-all duration-200 hover:shadow-md"
      style={{ backgroundColor: theme.secondaryColor }}
    >
      {/* カバーアート */}
      <div 
        className="w-16 h-16 rounded-lg flex items-center justify-center mr-4"
        style={{ background: playlist.coverArt || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <Music className="w-8 h-8 text-white" />
      </div>

      {/* プレイリスト情報 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <h3 className="font-semibold truncate" style={{ color: theme.textColor }}>
            {playlist.name}
          </h3>
          {playlist.isPublic ? (
            <Eye className="w-4 h-4" style={{ color: theme.textColor + '99' }} />
          ) : (
            <EyeOff className="w-4 h-4" style={{ color: theme.textColor + '99' }} />
          )}
          {playlist.templateId && (
            <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
              テンプレート
            </span>
          )}
        </div>

        {playlist.description && (
          <p className="text-sm mb-2 truncate" style={{ color: theme.textColor + 'CC' }}>
            {playlist.description}
          </p>
        )}

        <div className="flex items-center space-x-4 text-sm" style={{ color: theme.textColor + '99' }}>
          <span>{playlist.tracks.length}曲</span>
          <span>{formatDuration(playlist.totalDuration)}</span>
          <span>{playlist.updatedAt.toLocaleDateString('ja-JP')}</span>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onPlaylistPlay?.(playlist)}
          className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
          title="再生"
        >
          <Play className="w-5 h-5 text-white" fill="white" />
        </button>
        
        <button
          onClick={() => setEditingPlaylist(playlist)}
          className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
          title="編集"
        >
          <Edit3 className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={() => handleDeletePlaylist(playlist.id)}
          className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          title="削除"
        >
          <Trash2 className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center min-h-96`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" 
               style={{ borderColor: theme.primaryColor + '40', borderTopColor: theme.primaryColor }} />
          <p className="text-lg" style={{ color: theme.textColor }}>
            プレイリストを読み込み中...
          </p>
        </div>
      </div>
    )
  }

  if (currentView === 'creator') {
    return (
      <div className={className}>
        <div className="mb-6">
          <button
            onClick={() => setCurrentView('manager')}
            className="flex items-center space-x-2 text-sm hover:opacity-80 transition-opacity"
            style={{ color: theme.primaryColor }}
          >
            <span>← プレイリスト管理に戻る</span>
          </button>
        </div>
        
        <PlaylistCreator
          onPlaylistCreated={(playlist) => {
            setCurrentView('manager')
            playlistIntegration.refreshPlaylists()
          }}
        />
      </div>
    )
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: theme.textColor }}>
            プレイリスト管理
          </h1>
          <p className="text-lg" style={{ color: theme.textColor + 'CC' }}>
            {playlistIntegration.playlists.length}個のプレイリスト
          </p>
        </div>

        <button
          onClick={() => setCurrentView('creator')}
          className="px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2"
          style={{
            backgroundColor: theme.primaryColor,
            color: 'white'
          }}
        >
          <Plus className="w-5 h-5" />
          <span>新規作成</span>
        </button>
      </div>

      {/* 検索とフィルター */}
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        {/* 検索バー */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" 
                  style={{ color: theme.textColor + '99' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="プレイリストを検索..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border-0 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: theme.secondaryColor,
              color: theme.textColor,
              focusRingColor: theme.primaryColor
            }}
          />
        </div>

        {/* フィルターとソート */}
        <div className="flex space-x-3">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className="px-4 py-3 rounded-lg border-0 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: theme.secondaryColor,
              color: theme.textColor
            }}
          >
            <option value="all">すべて</option>
            <option value="public">公開</option>
            <option value="private">非公開</option>
            <option value="template">テンプレート</option>
            <option value="custom">カスタム</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-3 rounded-lg border-0 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: theme.secondaryColor,
              color: theme.textColor
            }}
          >
            <option value="updated">更新日順</option>
            <option value="created">作成日順</option>
            <option value="name">名前順</option>
            <option value="trackCount">楽曲数順</option>
            <option value="duration">再生時間順</option>
          </select>

          {/* 表示モード切り替え */}
          <div className="flex border rounded-lg" style={{ borderColor: theme.textColor + '20' }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 ${viewMode === 'grid' ? '' : 'opacity-50'}`}
              style={{ color: theme.textColor }}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 ${viewMode === 'list' ? '' : 'opacity-50'}`}
              style={{ color: theme.textColor }}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* プレイリスト一覧 */}
      <div>
        {filteredAndSortedPlaylists.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedPlaylists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedPlaylists.map((playlist) => (
                <PlaylistListItem key={playlist.id} playlist={playlist} />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <Music className="w-24 h-24 mx-auto mb-6 opacity-50" style={{ color: theme.textColor }} />
            <h2 className="text-2xl font-bold mb-4" style={{ color: theme.textColor }}>
              {searchQuery || filterBy !== 'all' 
                ? '条件に一致するプレイリストがありません' 
                : 'プレイリストがありません'}
            </h2>
            <p className="text-lg mb-6" style={{ color: theme.textColor + 'CC' }}>
              {searchQuery || filterBy !== 'all' 
                ? '検索条件やフィルターを変更してお試しください' 
                : '新しいプレイリストを作成しましょう'}
            </p>
            <button
              onClick={() => setCurrentView('creator')}
              className="px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2 mx-auto"
              style={{
                backgroundColor: theme.primaryColor,
                color: 'white'
              }}
            >
              <Plus className="w-5 h-5" />
              <span>プレイリストを作成</span>
            </button>
          </div>
        )}
      </div>

      {/* 編集モーダル */}
      <PlaylistEditModal
        playlist={editingPlaylist}
        isOpen={!!editingPlaylist}
        onClose={() => setEditingPlaylist(null)}
        onSave={(updatedPlaylist) => {
          if (playlistGenerator) {
            playlistGenerator.updatePlaylist(editingPlaylist!.id, updatedPlaylist)
            playlistIntegration.refreshPlaylists()
          }
          setEditingPlaylist(null)
        }}
        onDelete={handleDeletePlaylist}
        availableTracks={allTracks}
      />
    </div>
  )
}