// src/components/playlist/PlaylistCreator.tsx
import {
  Plus, Zap, BookOpen, Leaf, PartyPopper, Train, Moon,
  Music, Shuffle
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useMyPageStore } from '../../stores/myPageStore'
import { musicApi } from '../../api/music'
import { PlaylistGenerator, PRESET_TEMPLATES, type PlaylistTemplate, type PlaylistEntry } from '../../utils/playlistGenerator'
import type { Track } from '../../types'

interface PlaylistCreatorProps {
  className?: string
  onPlaylistCreated?: (playlist: PlaylistEntry) => void
}

export const PlaylistCreator: React.FC<PlaylistCreatorProps> = ({
  className = '',
  onPlaylistCreated
}) => {
  const theme = useMyPageStore(state => state.theme)
  
  const [isLoading, setIsLoading] = useState(true)
  const [allTracks, setAllTracks] = useState<Track[]>([])
  const [playlistGenerator, setPlaylistGenerator] = useState<PlaylistGenerator | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<PlaylistTemplate | null>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [availableGenres, setAvailableGenres] = useState<string[]>([])
  
  // カスタムプレイリスト作成フォーム
  const [customForm, setCustomForm] = useState({
    name: '',
    description: '',
    selectedGenres: [] as string[],
    trackCount: 20,
    energyLevel: 'any' as 'low' | 'medium' | 'high' | 'any'
  })

  // テンプレートアイコンマッピング
  const templateIcons = {
    workout: Zap,
    study: BookOpen,
    relax: Leaf,
    party: PartyPopper,
    commute: Train,
    sleep: Moon
  }

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [tracks, genres] = await Promise.all([
          musicApi.getTrendingTracks({ limit: 250 }),
          musicApi.getAvailableGenres()
        ])
        
        setAllTracks(tracks)
        setAvailableGenres(genres)
        setPlaylistGenerator(new PlaylistGenerator(tracks))
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // ワンクリックプレイリスト作成
  const handleQuickCreate = useCallback(async (template: PlaylistTemplate) => {
    if (!playlistGenerator) return

    setIsLoading(true)
    try {
      const playlist = playlistGenerator.generatePlaylist(template.id)
      onPlaylistCreated?.(playlist)
      
      // 成功メッセージ表示
      console.log(`Created playlist: ${playlist.name} (${playlist.tracks.length} tracks)`)
    } catch (error) {
      console.error('Failed to create playlist:', error)
    } finally {
      setIsLoading(false)
    }
  }, [playlistGenerator, onPlaylistCreated])

  // ジャンル別プレイリスト作成
  const handleGenrePlaylist = useCallback(async (genre: string) => {
    if (!playlistGenerator) return

    setIsLoading(true)
    try {
      const playlist = playlistGenerator.generateGenrePlaylist(genre, 25)
      onPlaylistCreated?.(playlist)
      
      console.log(`Created genre playlist: ${playlist.name}`)
    } catch (error) {
      console.error('Failed to create genre playlist:', error)
    } finally {
      setIsLoading(false)
    }
  }, [playlistGenerator, onPlaylistCreated])

  // カスタムプレイリスト作成
  const handleCustomCreate = useCallback(async () => {
    if (!playlistGenerator || !customForm.name.trim()) return

    setIsLoading(true)
    try {
      // カスタム条件でフィルタリング
      let filteredTracks = allTracks

      // ジャンルフィルター
      if (customForm.selectedGenres.length > 0) {
        filteredTracks = filteredTracks.filter(track =>
          (track as any).genre?.some((g: string) =>
            customForm.selectedGenres.some(selected =>
              g.toLowerCase().includes(selected.toLowerCase())
            )
          )
        )
      }

      // エネルギーレベルフィルター
      if (customForm.energyLevel !== 'any') {
        const energyRanges = {
          low: { min: 0.0, max: 0.4 },
          medium: { min: 0.4, max: 0.7 },
          high: { min: 0.7, max: 1.0 }
        }
        const range = energyRanges[customForm.energyLevel]
        filteredTracks = filteredTracks.filter(track => {
          const energy = (track as any).energy || 0.5
          return energy >= range.min && energy <= range.max
        })
      }

      // トラック数制限
      const selectedTracks = filteredTracks
        .sort((a, b) => ((b as any).popularity || 0) - ((a as any).popularity || 0))
        .slice(0, customForm.trackCount)

      const playlist = playlistGenerator.createCustomPlaylist(
        customForm.name,
        selectedTracks,
        customForm.description || undefined,
        ['custom', ...customForm.selectedGenres]
      )

      onPlaylistCreated?.(playlist)
      setShowCustomForm(false)
      setCustomForm({
        name: '',
        description: '',
        selectedGenres: [],
        trackCount: 20,
        energyLevel: 'any'
      })

      console.log(`Created custom playlist: ${playlist.name}`)
    } catch (error) {
      console.error('Failed to create custom playlist:', error)
    } finally {
      setIsLoading(false)
    }
  }, [playlistGenerator, customForm, allTracks, onPlaylistCreated])

  // テンプレートカード
  const TemplateCard: React.FC<{ template: PlaylistTemplate }> = ({ template }) => {
    const IconComponent = templateIcons[template.id as keyof typeof templateIcons] || Music

    return (
      <div
        className="group relative p-6 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl"
        style={{ backgroundColor: theme.secondaryColor }}
        onClick={() => handleQuickCreate(template)}
      >
        {/* アイコンとタイトル */}
        <div className="text-center mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl"
            style={{ backgroundColor: template.color + '20' }}
          >
            <IconComponent className="w-8 h-8" style={{ color: template.color }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: theme.textColor }}>
            {template.name}
          </h3>
          <p className="text-sm mb-4" style={{ color: theme.textColor + 'CC' }}>
            {template.description}
          </p>
        </div>

        {/* 詳細情報 */}
        <div className="space-y-2 text-xs" style={{ color: theme.textColor + '99' }}>
          <div className="flex justify-between">
            <span>楽曲数</span>
            <span>{template.trackCount.default}曲</span>
          </div>
          {template.criteria.genres && (
            <div className="flex justify-between">
              <span>ジャンル</span>
              <span>{template.criteria.genres.slice(0, 2).join('・')}</span>
            </div>
          )}
          {template.criteria.energy && (
            <div className="flex justify-between">
              <span>エネルギー</span>
              <span>{Math.round(template.criteria.energy.min * 100)}-{Math.round(template.criteria.energy.max * 100)}</span>
            </div>
          )}
        </div>

        {/* ホバーオーバーレイ */}
        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center">
          <div className="text-center text-white">
            <Plus className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm font-medium">作成</span>
          </div>
        </div>

        {/* ローディングオーバーレイ */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-60 rounded-xl flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-sm">作成中...</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ジャンルカード
  const GenreCard: React.FC<{ genre: string; index: number }> = ({ genre, index }) => {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'
    ]
    const color = colors[index % colors.length]

    return (
      <div
        className="group relative p-4 rounded-lg cursor-pointer transition-all duration-300 hover:scale-105"
        style={{ backgroundColor: color + '20' }}
        onClick={() => handleGenrePlaylist(genre)}
      >
        <div className="text-center">
          <Music className="w-8 h-8 mx-auto mb-2" style={{ color }} />
          <h4 className="font-medium text-sm" style={{ color: theme.textColor }}>
            {genre}
          </h4>
        </div>

        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
          <Plus className="w-6 h-6 text-white" />
        </div>
      </div>
    )
  }

  if (isLoading && !playlistGenerator) {
    return (
      <div className={`${className} flex items-center justify-center min-h-96`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" 
               style={{ borderColor: theme.primaryColor + '40', borderTopColor: theme.primaryColor }} />
          <p className="text-lg" style={{ color: theme.textColor }}>
            プレイリスト作成システムを初期化中...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} space-y-8`}>
      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4" style={{ color: theme.textColor }}>
          プレイリスト作成
        </h1>
        <p className="text-lg" style={{ color: theme.textColor + 'CC' }}>
          ワンクリックで最適なプレイリストを作成
        </p>
      </div>

      {/* テンプレート選択セクション */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold" style={{ color: theme.textColor }}>
            テンプレート選択
          </h2>
          <span className="text-sm" style={{ color: theme.textColor + '99' }}>
            {PRESET_TEMPLATES.length}種類のテンプレート
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRESET_TEMPLATES.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </div>

      {/* ジャンル別作成セクション */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold" style={{ color: theme.textColor }}>
            ジャンル別自動生成
          </h2>
          <span className="text-sm" style={{ color: theme.textColor + '99' }}>
            {availableGenres.length}ジャンル
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {availableGenres.slice(0, 12).map((genre, index) => (
            <GenreCard key={genre} genre={genre} index={index} />
          ))}
        </div>
      </div>

      {/* カスタム作成セクション */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold" style={{ color: theme.textColor }}>
            カスタム作成
          </h2>
          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            style={{
              backgroundColor: showCustomForm ? theme.primaryColor : theme.secondaryColor,
              color: showCustomForm ? 'white' : theme.textColor
            }}
          >
            <Plus className="w-4 h-4" />
            <span>詳細設定</span>
          </button>
        </div>

        {showCustomForm && (
          <div 
            className="p-6 rounded-xl space-y-6"
            style={{ backgroundColor: theme.secondaryColor }}
          >
            {/* 基本情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor }}>
                  プレイリスト名 *
                </label>
                <input
                  type="text"
                  value={customForm.name}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border-0 focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: theme.backgroundColor,
                    color: theme.textColor,
                    focusRingColor: theme.primaryColor
                  }}
                  placeholder="マイプレイリスト"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor }}>
                  楽曲数
                </label>
                <select
                  value={customForm.trackCount}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, trackCount: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 rounded-lg border-0 focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: theme.backgroundColor,
                    color: theme.textColor
                  }}
                >
                  <option value={10}>10曲</option>
                  <option value={15}>15曲</option>
                  <option value={20}>20曲</option>
                  <option value={30}>30曲</option>
                  <option value={50}>50曲</option>
                </select>
              </div>
            </div>

            {/* 説明 */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor }}>
                説明（任意）
              </label>
              <textarea
                value={customForm.description}
                onChange={(e) => setCustomForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border-0 focus:outline-none focus:ring-2 resize-none"
                style={{
                  backgroundColor: theme.backgroundColor,
                  color: theme.textColor
                }}
                rows={3}
                placeholder="プレイリストの説明を入力..."
              />
            </div>

            {/* エネルギーレベル */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor }}>
                エネルギーレベル
              </label>
              <div className="flex space-x-3">
                {[
                  { value: 'any', label: 'すべて', icon: Shuffle },
                  { value: 'low', label: '低', icon: Leaf },
                  { value: 'medium', label: '中', icon: Music },
                  { value: 'high', label: '高', icon: Zap }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setCustomForm(prev => ({ ...prev, energyLevel: value as any }))}
                    className={`flex-1 py-3 px-4 rounded-lg transition-colors flex flex-col items-center space-y-2 ${
                      customForm.energyLevel === value ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: customForm.energyLevel === value ? theme.primaryColor + '20' : theme.backgroundColor,
                      color: customForm.energyLevel === value ? theme.primaryColor : theme.textColor,
                      ringColor: theme.primaryColor
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ジャンル選択 */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor }}>
                ジャンル選択（複数選択可）
              </label>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                {availableGenres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => {
                      setCustomForm(prev => ({
                        ...prev,
                        selectedGenres: prev.selectedGenres.includes(genre)
                          ? prev.selectedGenres.filter(g => g !== genre)
                          : [...prev.selectedGenres, genre]
                      }))
                    }}
                    className={`py-2 px-3 rounded-lg text-xs transition-colors ${
                      customForm.selectedGenres.includes(genre) ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: customForm.selectedGenres.includes(genre) 
                        ? theme.primaryColor + '20' 
                        : theme.backgroundColor,
                      color: customForm.selectedGenres.includes(genre) 
                        ? theme.primaryColor 
                        : theme.textColor,
                      ringColor: theme.primaryColor
                    }}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* 作成ボタン */}
            <div className="flex space-x-3">
              <button
                onClick={handleCustomCreate}
                disabled={!customForm.name.trim() || isLoading}
                className="flex-1 py-3 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                style={{
                  backgroundColor: theme.primaryColor,
                  color: 'white'
                }}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>作成中...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>プレイリスト作成</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowCustomForm(false)}
                className="px-6 py-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: theme.backgroundColor,
                  color: theme.textColor
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}