// src/components/playlist/PlaylistEditModal.tsx
import {
  X, Save, Music, Play, Trash2, Plus, Search, Filter,
  GripVertical, Heart, Clock, Shuffle, MoreHorizontal,
  Volume2, Eye, EyeOff, Tag, Users, Calendar
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useMyPageStore } from '../../stores/myPageStore'
import { usePlaylistIntegration } from '../../hooks/usePlaylistIntegration'
import type { PlaylistEntry } from '../../utils/playlistGenerator'
import type { Track } from '../../types'

interface PlaylistEditModalProps {
  playlist: PlaylistEntry | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedPlaylist: PlaylistEntry) => void
  onDelete?: (playlistId: string) => void
  availableTracks?: Track[]
  className?: string
}

export const PlaylistEditModal: React.FC<PlaylistEditModalProps> = ({
  playlist,
  isOpen,
  onClose,
  onSave,
  onDelete,
  availableTracks = [],
  className = ''
}) => {
  const theme = useMyPageStore(state => state.theme)
  
  // 編集フォーム状態
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    isPublic: false,
    tags: [] as string[],
    tracks: [] as Track[]
  })
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddTracks, setShowAddTracks] = useState(false)
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState(false)

  // プレイリストデータの初期化
  useEffect(() => {
    if (playlist && isOpen) {
      setEditForm({
        name: playlist.name,
        description: playlist.description || '',
        isPublic: playlist.isPublic,
        tags: [...playlist.tags],
        tracks: [...playlist.tracks]
      })
      setUnsavedChanges(false)
    }
  }, [playlist, isOpen])

  // 変更検出
  useEffect(() => {
    if (!playlist) return
    
    const hasChanges = (
      editForm.name !== playlist.name ||
      editForm.description !== (playlist.description || '') ||
      editForm.isPublic !== playlist.isPublic ||
      JSON.stringify(editForm.tags.sort()) !== JSON.stringify(playlist.tags.sort()) ||
      JSON.stringify(editForm.tracks.map(t => t.id)) !== JSON.stringify(playlist.tracks.map(t => t.id))
    )
    
    setUnsavedChanges(hasChanges)
  }, [editForm, playlist])

  // モーダルが開かれていない場合は何も表示しない
  if (!isOpen || !playlist) return null

  // 時間フォーマット
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}時間${minutes % 60}分`
    }
    return `${minutes}分`
  }

  // 楽曲の検索フィルタリング
  const filteredAvailableTracks = availableTracks.filter(track => 
    !editForm.tracks.find(t => t.id === track.id) &&
    (searchQuery === '' || 
     track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     track.artist.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // 保存処理
  const handleSave = async () => {
    if (!playlist) return

    setIsLoading(true)
    try {
      const updatedPlaylist: PlaylistEntry = {
        ...playlist,
        name: editForm.name,
        description: editForm.description || undefined,
        isPublic: editForm.isPublic,
        tags: editForm.tags,
        tracks: editForm.tracks,
        updatedAt: new Date(),
        totalDuration: editForm.tracks.reduce((sum, track) => sum + track.duration, 0),
        averageEnergy: editForm.tracks.reduce((sum, track) => sum + (track as any).energy || 0.5, 0) / (editForm.tracks.length || 1),
        genres: [...new Set(editForm.tracks.flatMap(track => (track as any).genre || []))]
      }

      onSave(updatedPlaylist)
      setUnsavedChanges(false)
      onClose()
    } catch (error) {
      console.error('Failed to save playlist:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 削除処理
  const handleDelete = () => {
    if (!playlist || !onDelete) return
    
    if (confirm(`プレイリスト「${playlist.name}」を削除しますか？この操作は取り消せません。`)) {
      onDelete(playlist.id)
      onClose()
    }
  }

  // 楽曲追加
  const handleAddTrack = (track: Track) => {
    setEditForm(prev => ({
      ...prev,
      tracks: [...prev.tracks, track]
    }))
  }

  // 楽曲削除
  const handleRemoveTrack = (trackId: string) => {
    setEditForm(prev => ({
      ...prev,
      tracks: prev.tracks.filter(t => t.id !== trackId)
    }))
  }

  // ドラッグ&ドロップ処理
  const handleDragStart = (trackId: string, index: number) => {
    setDraggedTrackId(trackId)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (!draggedTrackId) return
    
    const dragIndex = editForm.tracks.findIndex(t => t.id === draggedTrackId)
    if (dragIndex === -1) return

    const newTracks = [...editForm.tracks]
    const draggedTrack = newTracks[dragIndex]
    
    // 元の位置から削除
    newTracks.splice(dragIndex, 1)
    // 新しい位置に挿入
    newTracks.splice(dropIndex, 0, draggedTrack)
    
    setEditForm(prev => ({ ...prev, tracks: newTracks }))
    setDraggedTrackId(null)
    setDragOverIndex(null)
  }

  // タグ管理
  const addTag = (tag: string) => {
    if (tag.trim() && !editForm.tags.includes(tag.trim())) {
      setEditForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // 楽曲アイテムコンポーネント
  const TrackItem: React.FC<{ track: Track; index: number; isInPlaylist?: boolean }> = ({ 
    track, 
    index, 
    isInPlaylist = false 
  }) => (
    <div
      className={`group flex items-center p-3 rounded-lg transition-all duration-200 ${
        dragOverIndex === index ? 'bg-blue-500/20' : ''
      } ${isInPlaylist ? 'cursor-move' : 'cursor-pointer'}`}
      style={{ backgroundColor: theme.secondaryColor }}
      draggable={isInPlaylist}
      onDragStart={() => isInPlaylist && handleDragStart(track.id, index)}
      onDragOver={(e) => isInPlaylist && handleDragOver(e, index)}
      onDrop={(e) => isInPlaylist && handleDrop(e, index)}
      onClick={() => !isInPlaylist && handleAddTrack(track)}
    >
      {/* ドラッグハンドル */}
      {isInPlaylist && (
        <GripVertical className="w-4 h-4 text-gray-400 mr-2 opacity-0 group-hover:opacity-100" />
      )}

      {/* 順番 */}
      <div className="w-8 text-sm text-center" style={{ color: theme.textColor + '99' }}>
        #{index + 1}
      </div>

      {/* アートワーク */}
      <img
        src={track.artworkUrl || `https://picsum.photos/48/48?random=${track.id}`}
        alt={track.title}
        className="w-12 h-12 rounded-lg object-cover ml-2"
      />

      {/* 楽曲情報 */}
      <div className="flex-1 ml-3 min-w-0">
        <h4 className="font-medium truncate" style={{ color: theme.textColor }}>
          {track.title}
        </h4>
        <p className="text-sm truncate" style={{ color: theme.textColor + 'CC' }}>
          {track.artist}
        </p>
      </div>

      {/* メタデータ */}
      <div className="flex items-center space-x-4 text-sm" style={{ color: theme.textColor + '99' }}>
        <span>{formatDuration(track.duration)}</span>
        {(track as any).genre && (
          <span className="hidden md:block">{(track as any).genre[0]}</span>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isInPlaylist ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleAddTrack(track)
            }}
            className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        ) : (
          <button
            onClick={() => handleRemoveTrack(track.id)}
            className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div 
        className={`${className} w-full max-w-6xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col`}
        style={{ backgroundColor: theme.backgroundColor }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.textColor + '20' }}>
          <div className="flex items-center space-x-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: playlist.coverArt || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: theme.textColor }}>
                プレイリスト編集
              </h2>
              <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                {editForm.tracks.length}曲 • {formatDuration(editForm.tracks.reduce((sum, t) => sum + t.duration, 0))}
              </p>
            </div>
          </div>

          {unsavedChanges && (
            <div className="hidden md:flex items-center space-x-2 text-sm" style={{ color: theme.primaryColor }}>
              <div className="w-2 h-2 bg-current rounded-full" />
              <span>未保存の変更があります</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-600/20 transition-colors"
            style={{ color: theme.textColor }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左側：基本情報編集 */}
          <div className="w-1/3 p-6 border-r overflow-y-auto" style={{ borderColor: theme.textColor + '20' }}>
            <div className="space-y-6">
              {/* 基本情報 */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textColor }}>
                  基本情報
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor }}>
                      プレイリスト名
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border-0 focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: theme.secondaryColor,
                        color: theme.textColor,
                        focusRingColor: theme.primaryColor
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor }}>
                      説明
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border-0 focus:outline-none focus:ring-2 resize-none"
                      style={{
                        backgroundColor: theme.secondaryColor,
                        color: theme.textColor
                      }}
                      rows={3}
                      placeholder="プレイリストの説明を入力..."
                    />
                  </div>

                  {/* 公開設定 */}
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: theme.secondaryColor }}>
                    <div className="flex items-center space-x-3">
                      {editForm.isPublic ? (
                        <Eye className="w-5 h-5" style={{ color: theme.primaryColor }} />
                      ) : (
                        <EyeOff className="w-5 h-5" style={{ color: theme.textColor + '99' }} />
                      )}
                      <div>
                        <p className="text-sm font-medium" style={{ color: theme.textColor }}>
                          公開プレイリスト
                        </p>
                        <p className="text-xs" style={{ color: theme.textColor + '99' }}>
                          他のユーザーが閲覧可能
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditForm(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        editForm.isPublic ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform absolute top-1 ${
                        editForm.isPublic ? 'translate-x-7' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* タグ管理 */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textColor }}>
                  タグ
                </h3>
                
                <div className="space-y-3">
                  {/* 現在のタグ */}
                  <div className="flex flex-wrap gap-2">
                    {editForm.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full text-xs flex items-center space-x-1"
                        style={{ backgroundColor: theme.primaryColor + '20', color: theme.primaryColor }}
                      >
                        <Tag className="w-3 h-3" />
                        <span>{tag}</span>
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:bg-red-500 hover:text-white rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* タグ追加 */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="新しいタグを追加..."
                      className="flex-1 px-3 py-2 rounded-lg text-sm border-0 focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: theme.secondaryColor,
                        color: theme.textColor
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addTag(e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 統計情報 */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textColor }}>
                  統計
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: theme.textColor + '99' }}>作成日</span>
                    <span style={{ color: theme.textColor }}>
                      {playlist.createdAt.toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: theme.textColor + '99' }}>最終更新</span>
                    <span style={{ color: theme.textColor }}>
                      {playlist.updatedAt.toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: theme.textColor + '99' }}>平均エネルギー</span>
                    <span style={{ color: theme.textColor }}>
                      {Math.round((editForm.tracks.reduce((sum, track) => sum + (track as any).energy || 0.5, 0) / (editForm.tracks.length || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右側：楽曲リスト */}
          <div className="flex-1 flex flex-col">
            {/* タブ切り替え */}
            <div className="flex border-b" style={{ borderColor: theme.textColor + '20' }}>
              <button
                onClick={() => setShowAddTracks(false)}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                  !showAddTracks ? 'border-b-2' : ''
                }`}
                style={{
                  color: !showAddTracks ? theme.primaryColor : theme.textColor + '99',
                  borderColor: !showAddTracks ? theme.primaryColor : 'transparent'
                }}
              >
                プレイリスト内楽曲 ({editForm.tracks.length})
              </button>
              <button
                onClick={() => setShowAddTracks(true)}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                  showAddTracks ? 'border-b-2' : ''
                }`}
                style={{
                  color: showAddTracks ? theme.primaryColor : theme.textColor + '99',
                  borderColor: showAddTracks ? theme.primaryColor : 'transparent'
                }}
              >
                楽曲を追加 ({availableTracks.length})
              </button>
            </div>

            {/* 楽曲検索（追加タブのみ） */}
            {showAddTracks && (
              <div className="p-4 border-b" style={{ borderColor: theme.textColor + '20' }}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: theme.textColor + '99' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="楽曲やアーティストを検索..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border-0 focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: theme.secondaryColor,
                      color: theme.textColor
                    }}
                  />
                </div>
              </div>
            )}

            {/* 楽曲リスト */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {!showAddTracks ? (
                  /* プレイリスト内楽曲 */
                  editForm.tracks.length > 0 ? (
                    editForm.tracks.map((track, index) => (
                      <TrackItem key={track.id} track={track} index={index} isInPlaylist />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Music className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: theme.textColor }} />
                      <p className="text-lg font-medium mb-2" style={{ color: theme.textColor }}>
                        楽曲がありません
                      </p>
                      <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                        右上の「楽曲を追加」タブから楽曲を追加してください
                      </p>
                    </div>
                  )
                ) : (
                  /* 追加可能楽曲 */
                  filteredAvailableTracks.length > 0 ? (
                    filteredAvailableTracks.map((track, index) => (
                      <TrackItem key={track.id} track={track} index={index} />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Search className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: theme.textColor }} />
                      <p className="text-lg font-medium mb-2" style={{ color: theme.textColor }}>
                        楽曲が見つかりません
                      </p>
                      <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                        検索条件を変更して再度お試しください
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between p-6 border-t" style={{ borderColor: theme.textColor + '20' }}>
          <div className="flex space-x-3">
            {onDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>削除</span>
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: theme.secondaryColor,
                color: theme.textColor
              }}
              disabled={isLoading}
            >
              キャンセル
            </button>
            
            <button
              onClick={handleSave}
              disabled={!unsavedChanges || isLoading || !editForm.name.trim()}
              className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              style={{
                backgroundColor: theme.primaryColor,
                color: 'white'
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>保存</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}