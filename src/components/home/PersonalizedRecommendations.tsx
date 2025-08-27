// src/components/home/PersonalizedRecommendations.tsx
import { ChevronLeft, ChevronRight, Heart, Play, Plus, RefreshCw, TrendingUp } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { musicApi } from '../../api/music'
import { useMusicStore } from '../../stores/musicStore'
import { useMyPageStore } from '../../stores/myPageStore'
import type { Track } from '../../types'

interface RecommendationSection {
  id: string
  title: string
  description: string
  icon: React.ElementType
  tracks: Track[]
  isLoading: boolean
  error?: string
  refreshable: boolean
  viewMore?: boolean
}

interface PersonalizedRecommendationsProps {
  className?: string
  sectionsPerRow?: number
  maxTracksPerSection?: number
  showRefreshButton?: boolean
}

export const PersonalizedRecommendations: React.FC<PersonalizedRecommendationsProps> = ({
  className = '',
  sectionsPerRow = 4,
  maxTracksPerSection = 6,
  showRefreshButton = true
}) => {
  const theme = useMyPageStore(state => state.theme)
  const { playTrack } = useMusicStore()
  
  const [sections, setSections] = useState<RecommendationSection[]>([])
  const [isLoadingAll, setIsLoadingAll] = useState(true)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date())

  // 推奨セクションの定義
  const createInitialSections = (): RecommendationSection[] => [
    {
      id: 'trending',
      title: 'トレンド楽曲',
      description: '今話題の人気楽曲',
      icon: TrendingUp,
      tracks: [],
      isLoading: true,
      refreshable: true,
      viewMore: true
    },
    {
      id: 'recent_jpop',
      title: '新着J-Pop',
      description: '最新のJ-Popヒット曲',
      icon: Heart,
      tracks: [],
      isLoading: true,
      refreshable: true,
      viewMore: true
    },
    {
      id: 'energetic_workout',
      title: 'ワークアウト向け',
      description: 'エネルギッシュな楽曲',
      icon: Play,
      tracks: [],
      isLoading: true,
      refreshable: true,
      viewMore: true
    },
    {
      id: 'chill_relaxing',
      title: 'チルアウト',
      description: 'リラックスできる楽曲',
      icon: Heart,
      tracks: [],
      isLoading: true,
      refreshable: true,
      viewMore: false
    },
    {
      id: 'electronic_edm',
      title: 'エレクトロニック',
      description: 'エレクトロニック・EDMセレクション',
      icon: Play,
      tracks: [],
      isLoading: true,
      refreshable: true,
      viewMore: true
    },
    {
      id: 'jazz_smooth',
      title: 'スムースジャズ',
      description: '上質なジャズセレクション',
      icon: Heart,
      tracks: [],
      isLoading: true,
      refreshable: true,
      viewMore: false
    }
  ]

  // セクションデータの取得
  const fetchSectionData = useCallback(async (section: RecommendationSection): Promise<Track[]> => {
    try {
      let tracks: Track[] = []
      
      switch (section.id) {
        case 'trending':
          tracks = await musicApi.getTrendingTracks({ limit: maxTracksPerSection })
          break
          
        case 'recent_jpop': {
          const jpopTracks = await musicApi.getTracksByGenre('J-Pop', maxTracksPerSection)
          tracks = jpopTracks.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          break
        }
          
        case 'energetic_workout': {
          const recommendations = await musicApi.getRecommendations({
            genres: ['Electronic', 'Rock', 'Hip-Hop'],
            targetEnergy: 0.8,
            targetDanceability: 0.7,
            limit: maxTracksPerSection
          })
          tracks = recommendations
          break
        }
          
        case 'chill_relaxing': {
          const chillTracks = await musicApi.getTracksByMood('relaxing', maxTracksPerSection)
          tracks = chillTracks
          break
        }
          
        case 'electronic_edm': {
          const electronicTracks = await musicApi.getTracksByGenre('Electronic', maxTracksPerSection)
          tracks = electronicTracks
          break
        }
          
        case 'jazz_smooth': {
          const jazzTracks = await musicApi.getTracksByGenre('Jazz', maxTracksPerSection)
          tracks = jazzTracks
          break
        }
          
        default:
          tracks = []
      }
      
      return tracks
    } catch (error) {
      console.error(`Failed to fetch ${section.id} data:`, error)
      throw error
    }
  }, [maxTracksPerSection])

  // 全セクション読み込み
  const loadAllSections = useCallback(async () => {
    setIsLoadingAll(true)
    const initialSections = createInitialSections()
    setSections(initialSections)
    
    const loadPromises = initialSections.map(async (section) => {
      try {
        const tracks = await fetchSectionData(section)
        
        setSections(prev => prev.map(s => 
          s.id === section.id 
            ? { ...s, tracks, isLoading: false, error: undefined }
            : s
        ))
      } catch (error) {
        setSections(prev => prev.map(s => 
          s.id === section.id 
            ? { ...s, tracks: [], isLoading: false, error: error instanceof Error ? error.message : '読み込みエラー' }
            : s
        ))
      }
    })

    await Promise.all(loadPromises)
    setIsLoadingAll(false)
    setLastRefreshTime(new Date())
  }, [fetchSectionData])

  // 特定セクションの更新
  const refreshSection = useCallback(async (sectionId: string) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, isLoading: true, error: undefined } : s
    ))
    
    const section = sections.find(s => s.id === sectionId)
    if (!section) return
    
    try {
      const tracks = await fetchSectionData(section)
      setSections(prev => prev.map(s => 
        s.id === sectionId 
          ? { ...s, tracks, isLoading: false, error: undefined }
          : s
      ))
    } catch (error) {
      setSections(prev => prev.map(s => 
        s.id === sectionId 
          ? { ...s, isLoading: false, error: error instanceof Error ? error.message : '更新エラー' }
          : s
      ))
    }
  }, [sections, fetchSectionData])

  // 初期読み込み
  useEffect(() => {
    loadAllSections()
  }, [loadAllSections])

  // 楽曲選択処理
  const handleTrackSelect = (track: Track) => {
    playTrack(track)
  }

  // プレイリスト追加処理
  const handleAddToPlaylist = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation()
    // TODO: プレイリスト追加機能を実装
    console.log('Add to playlist:', track.title)
  }

  // セクションコンポーネント
  const SectionComponent: React.FC<{ section: RecommendationSection }> = ({ section }) => {
    const [scrollPosition, setScrollPosition] = useState(0)
    const maxScroll = Math.max(0, section.tracks.length - sectionsPerRow)
    
    const SectionIcon = section.icon
    
    return (
      <div className="mb-8">
        {/* セクションヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: theme.primaryColor + '20' }}
            >
              <SectionIcon className="w-5 h-5" style={{ color: theme.primaryColor }} />
            </div>
            <div>
              <h2 
                className="text-xl font-semibold"
                style={{ color: theme.textColor }}
              >
                {section.title}
              </h2>
              <p 
                className="text-sm"
                style={{ color: theme.textColor + 'CC' }}
              >
                {section.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 更新ボタン */}
            {section.refreshable && (
              <button
                onClick={() => refreshSection(section.id)}
                disabled={section.isLoading}
                className="p-2 rounded-lg transition-colors hover:bg-gray-700"
                title="セクションを更新"
              >
                <RefreshCw 
                  className={`w-4 h-4 ${section.isLoading ? 'animate-spin' : ''}`}
                  style={{ color: theme.primaryColor }}
                />
              </button>
            )}
            
            {/* ナビゲーションボタン */}
            <button
              onClick={() => setScrollPosition(Math.max(0, scrollPosition - 1))}
              disabled={scrollPosition === 0}
              className="p-2 rounded-lg transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" style={{ color: theme.textColor }} />
            </button>
            
            <button
              onClick={() => setScrollPosition(Math.min(maxScroll, scrollPosition + 1))}
              disabled={scrollPosition >= maxScroll}
              className="p-2 rounded-lg transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" style={{ color: theme.textColor }} />
            </button>
          </div>
        </div>

        {/* セクションコンテンツ */}
        <div className="relative">
          {section.isLoading && (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: theme.primaryColor }} />
            </div>
          )}

          {section.error && (
            <div 
              className="p-6 rounded-xl text-center"
              style={{ backgroundColor: theme.secondaryColor }}
            >
              <p className="text-red-400 mb-3">{section.error}</p>
              <button
                onClick={() => refreshSection(section.id)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ 
                  backgroundColor: theme.primaryColor,
                  color: 'white'
                }}
              >
                再試行
              </button>
            </div>
          )}

          {!section.isLoading && !section.error && section.tracks.length > 0 && (
            <div 
              className="flex space-x-4 transition-transform duration-300"
              style={{
                transform: `translateX(-${scrollPosition * (100 / sectionsPerRow)}%)`
              }}
            >
              {section.tracks.map((track) => (
                <div
                  key={track.id}
                  className="flex-shrink-0 cursor-pointer group"
                  style={{ width: `${100 / sectionsPerRow}%` }}
                  onClick={() => handleTrackSelect(track)}
                >
                  <div 
                    className="relative rounded-xl p-4 transition-all duration-300 group-hover:scale-105"
                    style={{ backgroundColor: theme.secondaryColor }}
                  >
                    {/* アートワーク */}
                    <div className="relative mb-3">
                      <img
                        src={track.artworkUrl || 'https://via.placeholder.com/200x200?text=♪'}
                        alt={track.title}
                        className="w-full aspect-square rounded-lg object-cover shadow-lg"
                      />
                      
                      {/* ホバー時のプレイボタン */}
                      <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                        <Play 
                          className="w-8 h-8 text-white"
                          fill="white"
                        />
                      </div>

                      {/* プレイリスト追加ボタン */}
                      <button
                        onClick={(e) => handleAddToPlaylist(track, e)}
                        className="absolute top-2 right-2 w-8 h-8 bg-black bg-opacity-60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-opacity-80"
                      >
                        <Plus className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    {/* 楽曲情報 */}
                    <div>
                      <h3 
                        className="font-medium text-sm truncate mb-1"
                        style={{ color: theme.textColor }}
                      >
                        {track.title}
                      </h3>
                      <p 
                        className="text-xs truncate"
                        style={{ color: theme.textColor + 'CC' }}
                      >
                        {track.artist}
                      </p>
                      {track.album && (
                        <p 
                          className="text-xs truncate mt-1"
                          style={{ color: theme.textColor + '99' }}
                        >
                          {track.album}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!section.isLoading && !section.error && section.tracks.length === 0 && (
            <div 
              className="p-8 text-center rounded-xl"
              style={{ backgroundColor: theme.secondaryColor }}
            >
              <p style={{ color: theme.textColor + 'CC' }}>
                楽曲が見つかりませんでした
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: theme.textColor }}
          >
            あなたへのおすすめ
          </h1>
          <p 
            className="text-lg"
            style={{ color: theme.textColor + 'CC' }}
          >
            パーソナライズされた楽曲とプレイリスト
          </p>
        </div>
        
        {showRefreshButton && (
          <div className="flex items-center space-x-4">
            <div className="text-sm" style={{ color: theme.textColor + '99' }}>
              最終更新: {lastRefreshTime.toLocaleTimeString()}
            </div>
            <button
              onClick={loadAllSections}
              disabled={isLoadingAll}
              className="px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2"
              style={{
                backgroundColor: theme.primaryColor,
                color: 'white'
              }}
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingAll ? 'animate-spin' : ''}`} />
              <span>{isLoadingAll ? '更新中...' : 'すべて更新'}</span>
            </button>
          </div>
        )}
      </div>

      {/* セクション一覧 */}
      <div>
        {sections.map(section => (
          <SectionComponent key={section.id} section={section} />
        ))}
      </div>
    </div>
  )
}