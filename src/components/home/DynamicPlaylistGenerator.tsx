// src/components/home/DynamicPlaylistGenerator.tsx
import { 
  Clock, Cloud, Sun, CloudRain, CloudSnow, 
  Dumbbell, Coffee, Car, BookOpen, Moon, 
  Shuffle, Play, Save, RefreshCw, Zap,
  Calendar, MapPin
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { musicApi } from '../../api/music'
import { useMusicStore } from '../../stores/musicStore'
import { useMyPageStore } from '../../stores/myPageStore'
import type { Track } from '../../types'

interface PlaylistContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy'
  activity?: 'workout' | 'work' | 'drive' | 'study' | 'relax' | 'party'
  mood?: 'energetic' | 'calm' | 'happy' | 'focused' | 'romantic'
  location?: 'indoor' | 'outdoor' | 'commute'
}

interface GeneratedPlaylist {
  id: string
  name: string
  description: string
  tracks: Track[]
  context: PlaylistContext
  createdAt: Date
  isGenerating: boolean
}

interface WeatherData {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy'
  temperature: number
  location: string
}

interface DynamicPlaylistGeneratorProps {
  className?: string
  autoGenerate?: boolean
  maxTracksPerPlaylist?: number
}

export const DynamicPlaylistGenerator: React.FC<DynamicPlaylistGeneratorProps> = ({
  className = '',
  autoGenerate = true,
  maxTracksPerPlaylist = 20
}) => {
  const theme = useMyPageStore(state => state.theme)
  const { playTrack } = useMusicStore()
  
  const [currentContext, setCurrentContext] = useState<PlaylistContext>({
    timeOfDay: 'morning'
  })
  const [generatedPlaylists, setGeneratedPlaylists] = useState<GeneratedPlaylist[]>([])
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)

  // 時間帯の取得
  const getCurrentTimeOfDay = (): PlaylistContext['timeOfDay'] => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 22) return 'evening'
    return 'night'
  }

  // 天気情報取得（モック実装）
  const fetchWeatherData = useCallback(async (): Promise<WeatherData> => {
    // 実際の実装ではOpenWeatherMapなどのAPIを使用
    const conditions: WeatherData['condition'][] = ['sunny', 'cloudy', 'rainy', 'snowy']
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)]
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          condition: randomCondition,
          temperature: Math.floor(Math.random() * 30) + 5, // 5-35度
          location: '東京'
        })
      }, 1000)
    })
  }, [])

  // コンテキストベースプレイリスト生成アルゴリズム
  const generateContextualPlaylist = useCallback(async (context: PlaylistContext): Promise<Track[]> => {
    let genres: string[] = []
    let moods: string[] = []
    let targetEnergy = 0.5
    let targetDanceability = 0.5
    let targetValence = 0.5

    // 時間帯による調整
    switch (context.timeOfDay) {
      case 'morning':
        genres = ['Pop', 'Acoustic', 'Indie']
        moods = ['uplifting', 'energetic', 'positive']
        targetEnergy = 0.7
        targetValence = 0.8
        break
      case 'afternoon':
        genres = ['Pop', 'Rock', 'Electronic']
        moods = ['energetic', 'focused']
        targetEnergy = 0.8
        targetDanceability = 0.6
        break
      case 'evening':
        genres = ['Jazz', 'R&B', 'Soul']
        moods = ['relaxing', 'sophisticated']
        targetEnergy = 0.4
        targetValence = 0.6
        break
      case 'night':
        genres = ['Ambient', 'Chill', 'Jazz']
        moods = ['peaceful', 'dreamy']
        targetEnergy = 0.3
        targetValence = 0.5
        break
    }

    // 天気による調整
    if (context.weather) {
      switch (context.weather) {
        case 'sunny':
          moods.push('joyful', 'bright')
          targetValence = Math.min(1.0, targetValence + 0.2)
          break
        case 'rainy':
          genres.push('Jazz', 'Blues')
          moods.push('melancholic', 'thoughtful')
          targetEnergy = Math.max(0.2, targetEnergy - 0.2)
          break
        case 'cloudy':
          moods.push('calm', 'contemplative')
          break
        case 'snowy':
          genres.push('Classical', 'Ambient')
          moods.push('peaceful', 'serene')
          targetEnergy = Math.max(0.2, targetEnergy - 0.3)
          break
      }
    }

    // アクティビティによる調整
    if (context.activity) {
      switch (context.activity) {
        case 'workout':
          genres = ['Electronic', 'Hip-Hop', 'Rock']
          moods = ['energetic', 'powerful']
          targetEnergy = 0.9
          targetDanceability = 0.8
          break
        case 'work':
          genres = ['Ambient', 'Classical', 'Instrumental']
          moods = ['focused', 'calm']
          targetEnergy = 0.5
          targetDanceability = 0.3
          break
        case 'drive':
          genres = ['Rock', 'Pop', 'Country']
          moods = ['adventurous', 'free']
          targetEnergy = 0.7
          break
        case 'study':
          genres = ['Classical', 'Ambient', 'Lo-Fi']
          moods = ['focused', 'peaceful']
          targetEnergy = 0.3
          targetDanceability = 0.2
          break
        case 'relax':
          genres = ['Jazz', 'Soul', 'Acoustic']
          moods = ['relaxing', 'peaceful']
          targetEnergy = 0.3
          break
        case 'party':
          genres = ['Electronic', 'Pop', 'Hip-Hop']
          moods = ['energetic', 'joyful']
          targetEnergy = 0.9
          targetDanceability = 0.9
          targetValence = 0.9
          break
      }
    }

    // AIベースの楽曲推薦を実行
    const recommendations = await musicApi.getRecommendations({
      genres: genres.slice(0, 3),
      targetEnergy,
      targetDanceability,
      targetValence,
      limit: maxTracksPerPlaylist
    })

    return recommendations
  }, [maxTracksPerPlaylist])

  // プレイリスト名生成
  const generatePlaylistName = (context: PlaylistContext): string => {
    const timeNames = {
      morning: '朝の',
      afternoon: '午後の',
      evening: '夜の',
      night: '深夜の'
    }

    const weatherNames = {
      sunny: '晴れの日',
      cloudy: '曇り空',
      rainy: '雨の日',
      snowy: '雪の日'
    }

    const activityNames = {
      workout: 'ワークアウト',
      work: '仕事',
      drive: 'ドライブ',
      study: '勉強',
      relax: 'リラックス',
      party: 'パーティー'
    }

    let name = timeNames[context.timeOfDay]
    
    if (context.weather && Math.random() > 0.5) {
      name += weatherNames[context.weather]
    } else if (context.activity) {
      name += activityNames[context.activity]
    } else {
      name += 'ミュージック'
    }

    return name
  }

  // プレイリスト説明生成
  const generatePlaylistDescription = (context: PlaylistContext): string => {
    const descriptions = []
    
    if (context.timeOfDay === 'morning') {
      descriptions.push('新しい一日を気持ちよくスタート')
    } else if (context.timeOfDay === 'evening') {
      descriptions.push('一日の疲れを癒やす音楽')
    }
    
    if (context.weather) {
      const weatherDescriptions = {
        sunny: '太陽の下で聴きたくなる楽曲',
        rainy: '雨音と一緒に楽しむセレクション',
        cloudy: '空を見上げながら聴きたい音楽',
        snowy: '雪景色に合う美しいメロディー'
      }
      descriptions.push(weatherDescriptions[context.weather])
    }
    
    if (context.activity) {
      const activityDescriptions = {
        workout: 'エネルギーを高める楽曲たち',
        work: '集中力を高める背景音楽',
        drive: 'ドライブを楽しくする音楽',
        study: '勉強に集中できる落ち着いた楽曲',
        relax: '心を落ち着かせるリラックス音楽',
        party: 'みんなで盛り上がれる楽曲'
      }
      descriptions.push(activityDescriptions[context.activity])
    }
    
    return descriptions.join('。') || 'あなたの今の気分にぴったりな楽曲を集めました'
  }

  // 新しいプレイリスト生成
  const generateNewPlaylist = useCallback(async (context: PlaylistContext) => {
    const newPlaylist: GeneratedPlaylist = {
      id: `dynamic_${Date.now()}`,
      name: generatePlaylistName(context),
      description: generatePlaylistDescription(context),
      tracks: [],
      context,
      createdAt: new Date(),
      isGenerating: true
    }

    setGeneratedPlaylists(prev => [newPlaylist, ...prev.slice(0, 4)]) // 最大5個まで保持

    try {
      const tracks = await generateContextualPlaylist(context)
      
      setGeneratedPlaylists(prev => prev.map(playlist => 
        playlist.id === newPlaylist.id 
          ? { ...playlist, tracks, isGenerating: false }
          : playlist
      ))
    } catch (error) {
      console.error('Failed to generate playlist:', error)
      setGeneratedPlaylists(prev => prev.filter(playlist => playlist.id !== newPlaylist.id))
    }
  }, [generateContextualPlaylist])

  // 初期化
  useEffect(() => {
    const initializeContext = async () => {
      const timeOfDay = getCurrentTimeOfDay()
      
      // 天気情報取得
      setIsLoadingWeather(true)
      try {
        const weather = await fetchWeatherData()
        setWeatherData(weather)
        
        const initialContext: PlaylistContext = {
          timeOfDay,
          weather: weather.condition
        }
        setCurrentContext(initialContext)
        
        // 自動生成が有効な場合は初回プレイリストを生成
        if (autoGenerate) {
          generateNewPlaylist(initialContext)
        }
      } catch (error) {
        console.error('Failed to fetch weather:', error)
        setCurrentContext({ timeOfDay })
      } finally {
        setIsLoadingWeather(false)
      }
    }

    initializeContext()
  }, [autoGenerate, fetchWeatherData, generateNewPlaylist])

  // アクティビティ選択時のプレイリスト生成
  const handleActivitySelect = (activity: PlaylistContext['activity']) => {
    setSelectedActivity(activity || null)
    const newContext: PlaylistContext = {
      ...currentContext,
      activity
    }
    setCurrentContext(newContext)
    generateNewPlaylist(newContext)
  }

  // 手動プレイリスト生成
  const handleManualGenerate = () => {
    generateNewPlaylist(currentContext)
  }

  // プレイリスト再生
  const handlePlayPlaylist = (playlist: GeneratedPlaylist) => {
    if (playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0])
    }
  }

  // 天気アイコン
  const getWeatherIcon = (condition: WeatherData['condition']) => {
    switch (condition) {
      case 'sunny': return Sun
      case 'cloudy': return Cloud
      case 'rainy': return CloudRain
      case 'snowy': return CloudSnow
      default: return Cloud
    }
  }

  // アクティビティオプション
  const activityOptions = [
    { id: 'workout', name: 'ワークアウト', icon: Dumbbell, color: '#ef4444' },
    { id: 'work', name: '仕事', icon: Coffee, color: '#f97316' },
    { id: 'drive', name: 'ドライブ', icon: Car, color: '#3b82f6' },
    { id: 'study', name: '勉強', icon: BookOpen, color: '#10b981' },
    { id: 'relax', name: 'リラックス', icon: Moon, color: '#8b5cf6' },
    { id: 'party', name: 'パーティー', icon: Zap, color: '#f59e0b' }
  ]

  return (
    <div className={`${className}`}>
      {/* ヘッダー */}
      <div className="mb-8">
        <h2 
          className="text-2xl font-bold mb-2"
          style={{ color: theme.textColor }}
        >
          AIプレイリスト生成
        </h2>
        <p 
          className="text-lg"
          style={{ color: theme.textColor + 'CC' }}
        >
          現在の状況に最適化された楽曲をお届け
        </p>
      </div>

      {/* 現在のコンテキスト */}
      <div 
        className="rounded-2xl p-6 mb-8"
        style={{ backgroundColor: theme.secondaryColor }}
      >
        <h3 
          className="text-lg font-semibold mb-4 flex items-center space-x-2"
          style={{ color: theme.textColor }}
        >
          <Clock className="w-5 h-5" style={{ color: theme.primaryColor }} />
          <span>現在の状況</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 時間帯 */}
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5" style={{ color: theme.primaryColor }} />
            <div>
              <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>時間帯</p>
              <p 
                className="font-medium"
                style={{ color: theme.textColor }}
              >
                {currentContext.timeOfDay === 'morning' && '朝'}
                {currentContext.timeOfDay === 'afternoon' && '午後'}
                {currentContext.timeOfDay === 'evening' && '夕方'}
                {currentContext.timeOfDay === 'night' && '夜'}
              </p>
            </div>
          </div>

          {/* 天気 */}
          <div className="flex items-center space-x-3">
            {weatherData && (
              <>
                {React.createElement(getWeatherIcon(weatherData.condition), {
                  className: "w-5 h-5",
                  style: { color: theme.primaryColor }
                })}
                <div>
                  <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>天気</p>
                  <div className="flex items-center space-x-2">
                    <p 
                      className="font-medium"
                      style={{ color: theme.textColor }}
                    >
                      {weatherData.condition === 'sunny' && '晴れ'}
                      {weatherData.condition === 'cloudy' && '曇り'}
                      {weatherData.condition === 'rainy' && '雨'}
                      {weatherData.condition === 'snowy' && '雪'}
                    </p>
                    <span className="text-sm" style={{ color: theme.textColor + '99' }}>
                      {weatherData.temperature}°C
                    </span>
                  </div>
                </div>
              </>
            )}
            {isLoadingWeather && (
              <RefreshCw className="w-5 h-5 animate-spin" style={{ color: theme.primaryColor }} />
            )}
          </div>

          {/* 位置 */}
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5" style={{ color: theme.primaryColor }} />
            <div>
              <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>場所</p>
              <p 
                className="font-medium"
                style={{ color: theme.textColor }}
              >
                {weatherData?.location || '取得中...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* アクティビティ選択 */}
      <div className="mb-8">
        <h3 
          className="text-lg font-semibold mb-4"
          style={{ color: theme.textColor }}
        >
          今何をしていますか？
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {activityOptions.map((activity) => {
            const ActivityIcon = activity.icon
            const isSelected = selectedActivity === activity.id
            
            return (
              <button
                key={activity.id}
                onClick={() => handleActivitySelect(activity.id as PlaylistContext['activity'])}
                className={`p-4 rounded-xl transition-all duration-300 ${
                  isSelected ? 'scale-105 shadow-lg' : 'hover:scale-102'
                }`}
                style={{
                  backgroundColor: isSelected 
                    ? activity.color + '20' 
                    : theme.secondaryColor,
                  border: isSelected 
                    ? `2px solid ${activity.color}` 
                    : 'none'
                }}
              >
                <ActivityIcon 
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: isSelected ? activity.color : theme.primaryColor }}
                />
                <p 
                  className="text-sm font-medium"
                  style={{ 
                    color: isSelected ? activity.color : theme.textColor 
                  }}
                >
                  {activity.name}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 生成されたプレイリスト */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 
            className="text-lg font-semibold"
            style={{ color: theme.textColor }}
          >
            生成されたプレイリスト
          </h3>
          
          <button
            onClick={handleManualGenerate}
            className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            style={{
              backgroundColor: theme.primaryColor,
              color: 'white'
            }}
          >
            <Shuffle className="w-4 h-4" />
            <span>新しく生成</span>
          </button>
        </div>

        <div className="space-y-4">
          {generatedPlaylists.map(playlist => (
            <div
              key={playlist.id}
              className="rounded-xl p-6 transition-all duration-300 hover:scale-[1.02]"
              style={{ backgroundColor: theme.secondaryColor }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 
                    className="text-lg font-semibold"
                    style={{ color: theme.textColor }}
                  >
                    {playlist.name}
                  </h4>
                  <p 
                    className="text-sm mt-1"
                    style={{ color: theme.textColor + 'CC' }}
                  >
                    {playlist.description}
                  </p>
                  <p 
                    className="text-xs mt-2"
                    style={{ color: theme.textColor + '99' }}
                  >
                    {playlist.createdAt.toLocaleString()} • {playlist.tracks.length}曲
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePlayPlaylist(playlist)}
                    disabled={playlist.isGenerating || playlist.tracks.length === 0}
                    className="p-3 rounded-full transition-colors disabled:opacity-50"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {playlist.isGenerating ? (
                      <RefreshCw className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Play className="w-5 h-5 text-white" fill="white" />
                    )}
                  </button>

                  {!playlist.isGenerating && playlist.tracks.length > 0 && (
                    <button
                      onClick={() => {/* プレイリスト保存機能 */}}
                      className="p-3 rounded-full transition-colors hover:bg-gray-700"
                    >
                      <Save className="w-5 h-5" style={{ color: theme.textColor }} />
                    </button>
                  )}
                </div>
              </div>

              {/* 楽曲リスト */}
              {playlist.isGenerating && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-3" style={{ color: theme.primaryColor }} />
                  <span style={{ color: theme.textColor }}>プレイリストを生成中...</span>
                </div>
              )}

              {!playlist.isGenerating && playlist.tracks.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {playlist.tracks.slice(0, 5).map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => playTrack(track)}
                    >
                      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={track.artworkUrl || 'https://via.placeholder.com/40x40?text=♪'}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="font-medium truncate"
                          style={{ color: theme.textColor }}
                        >
                          {track.title}
                        </p>
                        <p 
                          className="text-sm truncate"
                          style={{ color: theme.textColor + 'CC' }}
                        >
                          {track.artist}
                        </p>
                      </div>
                      <div className="text-sm" style={{ color: theme.textColor + '99' }}>
                        {Math.floor(track.duration / 60000)}:{String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}
                      </div>
                    </div>
                  ))}
                  
                  {playlist.tracks.length > 5 && (
                    <div className="text-center py-2">
                      <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                        他 {playlist.tracks.length - 5} 曲
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {generatedPlaylists.length === 0 && (
            <div 
              className="text-center py-12 rounded-xl"
              style={{ backgroundColor: theme.secondaryColor }}
            >
              <Shuffle className="w-12 h-12 mx-auto mb-4" style={{ color: theme.primaryColor }} />
              <p 
                className="text-lg font-medium mb-2"
                style={{ color: theme.textColor }}
              >
                プレイリストを生成してみましょう
              </p>
              <p 
                className="mb-4"
                style={{ color: theme.textColor + 'CC' }}
              >
                アクティビティを選択するか、「新しく生成」ボタンを押してください
              </p>
              <button
                onClick={handleManualGenerate}
                className="px-6 py-3 rounded-xl font-medium transition-colors"
                style={{
                  backgroundColor: theme.primaryColor,
                  color: 'white'
                }}
              >
                プレイリスト生成
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}