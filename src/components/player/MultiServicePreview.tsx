// src/components/player/MultiServicePreview.tsx
import { 
  Play, Pause, Volume2, VolumeX,
  Heart, Plus, ExternalLink, 
  Music, Clock, AlertCircle
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { musicApi } from '../../api/music'
import { useMyPageStore } from '../../stores/myPageStore'
import type { Track } from '../../types'

interface PreviewState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isLoading: boolean
  error?: string
  source?: 'spotify' | 'appleMusic' | 'mock'
}

interface MultiServicePreviewProps {
  track: Track
  autoPlay?: boolean
  showControls?: boolean
  showServiceInfo?: boolean
  className?: string
  onPlayToggle?: (isPlaying: boolean) => void
  onTrackEnd?: () => void
  onError?: (error: string) => void
}

export const MultiServicePreview: React.FC<MultiServicePreviewProps> = ({
  track,
  autoPlay = false,
  showControls = true,
  showServiceInfo = true,
  className = '',
  onPlayToggle,
  onTrackEnd,
  onError
}) => {
  const theme = useMyPageStore(state => state.theme)
  // Music store - not currently used but available for future playlist functionality
  // const { addToPlaylist } = useMusicStore()
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  
  const [previewState, setPreviewState] = useState<PreviewState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isMuted: false,
    isLoading: false
  })
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [serviceInfo, setServiceInfo] = useState<{
    service: string
    available: boolean
    quality: 'high' | 'medium' | 'low'
  } | null>(null)

  // プレビューURLとサービス情報の取得
  const fetchPreviewData = useCallback(async (track: Track) => {
    setPreviewState(prev => ({ ...prev, isLoading: true, error: undefined }))
    
    try {
      let previewSource: string | null = null
      let detectedService: 'spotify' | 'appleMusic' | 'mock' = 'mock'
      let quality: 'high' | 'medium' | 'low' = 'medium'

      // Spotify プレビューURL取得を試行
      if (track.spotifyId) {
        try {
          const spotifyTrack = await musicApi.serviceSpecificSearch({
            query: track.title,
            service: 'spotify',
            searchType: 'track',
            limit: 1
          })
          
          if (spotifyTrack.tracks && spotifyTrack.tracks.length > 0) {
            const foundTrack = spotifyTrack.tracks[0]
            if (foundTrack.previewUrl) {
              previewSource = foundTrack.previewUrl
              detectedService = 'spotify'
              quality = 'high'
            }
          }
        } catch (error) {
          console.warn('Spotify preview fetch failed:', error)
        }
      }

      // Apple Music プレビューURL取得を試行
      if (!previewSource && track.appleMusicId) {
        try {
          const appleMusicResult = await musicApi.serviceSpecificSearch({
            query: track.title,
            service: 'appleMusic',
            searchType: 'track',
            limit: 1
          })
          
          if (appleMusicResult.tracks && appleMusicResult.tracks.length > 0) {
            const foundTrack = appleMusicResult.tracks[0]
            if (foundTrack.previewUrl) {
              previewSource = foundTrack.previewUrl
              detectedService = 'appleMusic'
              quality = 'high'
            }
          }
        } catch (error) {
          console.warn('Apple Music preview fetch failed:', error)
        }
      }

      // フォールバック: 楽曲に含まれるプレビューURL
      if (!previewSource && track.previewUrl) {
        previewSource = track.previewUrl
        quality = 'low'
      }

      // モック実装: 実際のプレビューが利用できない場合
      if (!previewSource) {
        // 30秒間のサイレント音声を生成（実際の実装では楽曲のサンプルを使用）
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const buffer = audioContext.createBuffer(2, audioContext.sampleRate * 30, audioContext.sampleRate)
        
        // ホワイトノイズを生成（実際のプレビューの代替）
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const channelData = buffer.getChannelData(channel)
          for (let i = 0; i < channelData.length; i++) {
            channelData[i] = (Math.random() - 0.5) * 0.1 // 低音量のホワイトノイズ
          }
        }
        
        // Blobに変換してURLを作成
        const audioBlob = bufferToWaveBlob(buffer)
        previewSource = URL.createObjectURL(audioBlob)
        quality = 'low'
      }

      setPreviewUrl(previewSource)
      setServiceInfo({
        service: detectedService,
        available: !!previewSource,
        quality
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'プレビュー取得エラー'
      setPreviewState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
    } finally {
      setPreviewState(prev => ({ ...prev, isLoading: false }))
    }
  }, [onError])

  // AudioBuffer to Wave Blob変換（モック実装用）
  const bufferToWaveBlob = (buffer: AudioBuffer): Blob => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44
    const arrayBuffer = new ArrayBuffer(length)
    const view = new DataView(arrayBuffer)
    const channels = []
    let offset = 0
    let pos = 0

    // WAVEヘッダー書き込み
    function writeString(offset: number, string: string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(pos, 'RIFF'); pos += 4
    view.setUint32(pos, length - 8, true); pos += 4
    writeString(pos, 'WAVE'); pos += 4
    writeString(pos, 'fmt '); pos += 4
    view.setUint32(pos, 16, true); pos += 4
    view.setUint16(pos, 1, true); pos += 2
    view.setUint16(pos, buffer.numberOfChannels, true); pos += 2
    view.setUint32(pos, buffer.sampleRate, true); pos += 4
    view.setUint32(pos, buffer.sampleRate * 2 * buffer.numberOfChannels, true); pos += 4
    view.setUint16(pos, buffer.numberOfChannels * 2, true); pos += 2
    view.setUint16(pos, 16, true); pos += 2
    writeString(pos, 'data'); pos += 4
    view.setUint32(pos, length - pos - 4, true); pos += 4

    // チャンネルデータを交互配置
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i))
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        const sample = Math.max(-1, Math.min(1, channels[i][offset]))
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
        pos += 2
      }
      offset++
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  // 音声要素のイベントハンドラ
  const setupAudioEvents = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadStart = () => {
      setPreviewState(prev => ({ ...prev, isLoading: true }))
    }

    const handleCanPlay = () => {
      setPreviewState(prev => ({ 
        ...prev, 
        isLoading: false, 
        duration: audio.duration 
      }))
    }

    const handleTimeUpdate = () => {
      setPreviewState(prev => ({ 
        ...prev, 
        currentTime: audio.currentTime 
      }))
    }

    const handleEnded = () => {
      setPreviewState(prev => ({ ...prev, isPlaying: false }))
      onTrackEnd?.()
    }

    const handleError = () => {
      const errorMessage = 'プレビュー再生エラー'
      setPreviewState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        isLoading: false, 
        error: errorMessage 
      }))
      onError?.(errorMessage)
    }

    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [onTrackEnd, onError])

  // プレビューURL変更時の処理
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !previewUrl) return

    audio.src = previewUrl
    audio.volume = previewState.volume

    const cleanup = setupAudioEvents()

    if (autoPlay) {
      audio.play().catch(() => {
        // 自動再生失敗時は無視
      })
    }

    return cleanup
  }, [previewUrl, setupAudioEvents, autoPlay, previewState.volume])

  // 楽曲変更時の初期化
  useEffect(() => {
    const currentAudio = audioRef.current
    fetchPreviewData(track)
    
    return () => {
      // クリーンアップ: 再生停止とURL解放
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
      }
    }
  }, [track, fetchPreviewData])

  // 再生/一時停止切り替え
  const handlePlayPause = async () => {
    const audio = audioRef.current
    if (!audio || previewState.isLoading) return

    try {
      if (previewState.isPlaying) {
        audio.pause()
        setPreviewState(prev => ({ ...prev, isPlaying: false }))
        onPlayToggle?.(false)
      } else {
        await audio.play()
        setPreviewState(prev => ({ ...prev, isPlaying: true }))
        onPlayToggle?.(true)
      }
    } catch {
      const errorMessage = 'プレビュー再生に失敗しました'
      setPreviewState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
    }
  }

  // 音量調整
  const handleVolumeChange = (newVolume: number) => {
    const audio = audioRef.current
    if (!audio) return

    const volume = Math.max(0, Math.min(1, newVolume))
    audio.volume = volume
    setPreviewState(prev => ({ 
      ...prev, 
      volume, 
      isMuted: volume === 0 
    }))
  }

  // ミュート切り替え
  const handleMuteToggle = () => {
    const audio = audioRef.current
    if (!audio) return

    if (previewState.isMuted) {
      audio.volume = previewState.volume
      setPreviewState(prev => ({ ...prev, isMuted: false }))
    } else {
      audio.volume = 0
      setPreviewState(prev => ({ ...prev, isMuted: true }))
    }
  }

  // シーク操作
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    const progressBar = progressRef.current
    if (!audio || !progressBar || previewState.duration === 0) return

    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * previewState.duration

    audio.currentTime = newTime
    setPreviewState(prev => ({ ...prev, currentTime: newTime }))
  }

  // プレイリストに追加
  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation()
    // TODO: プレイリスト追加機能を実装
    console.log('Add to playlist:', track.title)
  }

  // 外部リンクを開く
  const handleOpenExternal = () => {
    if (track.externalUrl) {
      window.open(track.externalUrl, '_blank')
    }
  }

  // サービスアイコンの取得
  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'spotify': return Music
      case 'appleMusic': return Music
      default: return Music
    }
  }

  // 時間フォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = previewState.duration > 0 
    ? (previewState.currentTime / previewState.duration) * 100 
    : 0

  return (
    <div 
      className={`rounded-xl p-6 transition-all duration-300 ${className}`}
      style={{ backgroundColor: theme.secondaryColor }}
    >
      <audio ref={audioRef} />

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden">
            <img
              src={track.artworkUrl || 'https://via.placeholder.com/48x48?text=♪'}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 
              className="font-semibold text-lg truncate"
              style={{ color: theme.textColor }}
            >
              {track.title}
            </h3>
            <p 
              className="text-sm truncate"
              style={{ color: theme.textColor + 'CC' }}
            >
              {track.artist}
            </p>
            {track.album && (
              <p 
                className="text-xs truncate"
                style={{ color: theme.textColor + '99' }}
              >
                {track.album}
              </p>
            )}
          </div>
        </div>

        {/* サービス情報 */}
        {showServiceInfo && serviceInfo && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {React.createElement(getServiceIcon(serviceInfo.service), {
                className: "w-4 h-4",
                style: { color: theme.primaryColor }
              })}
              <span 
                className="text-xs font-medium"
                style={{ color: theme.primaryColor }}
              >
                {serviceInfo.service === 'spotify' && 'Spotify'}
                {serviceInfo.service === 'appleMusic' && 'Apple Music'}
                {serviceInfo.service === 'mock' && 'Preview'}
              </span>
            </div>
            <div 
              className={`px-2 py-1 rounded text-xs ${
                serviceInfo.quality === 'high' ? 'bg-green-500' :
                serviceInfo.quality === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'
              } text-white`}
            >
              {serviceInfo.quality.toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {previewState.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm">{previewState.error}</span>
        </div>
      )}

      {/* プログレスバー */}
      <div className="mb-4">
        <div 
          ref={progressRef}
          className="h-2 bg-gray-600 rounded-full cursor-pointer group"
          onClick={handleSeek}
        >
          <div 
            className="h-full rounded-full transition-all duration-300 group-hover:h-3"
            style={{ 
              backgroundColor: theme.primaryColor,
              width: `${progress}%`
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1" style={{ color: theme.textColor + '99' }}>
          <span>{formatTime(previewState.currentTime)}</span>
          <span>{formatTime(previewState.duration)}</span>
        </div>
      </div>

      {/* コントロールボタン */}
      {showControls && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* メイン再生ボタン */}
            <button
              onClick={handlePlayPause}
              disabled={previewState.isLoading || !serviceInfo?.available}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {previewState.isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : previewState.isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" fill="white" />
              )}
            </button>

            {/* 音量コントロール */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleMuteToggle}
                className="p-2 rounded-full hover:bg-gray-700 transition-colors"
              >
                {previewState.isMuted ? (
                  <VolumeX className="w-4 h-4" style={{ color: theme.textColor }} />
                ) : (
                  <Volume2 className="w-4 h-4" style={{ color: theme.textColor }} />
                )}
              </button>
              
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={previewState.isMuted ? 0 : previewState.volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${theme.primaryColor} 0%, ${theme.primaryColor} ${(previewState.isMuted ? 0 : previewState.volume) * 100}%, #4b5563 ${(previewState.isMuted ? 0 : previewState.volume) * 100}%, #4b5563 100%)`
                }}
              />
            </div>
          </div>

          {/* 追加アクション */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddToPlaylist}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
              title="プレイリストに追加"
            >
              <Plus className="w-4 h-4" style={{ color: theme.textColor }} />
            </button>

            <button
              onClick={() => {/* お気に入り機能 */}}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
              title="お気に入りに追加"
            >
              <Heart className="w-4 h-4" style={{ color: theme.textColor }} />
            </button>

            {track.externalUrl && (
              <button
                onClick={handleOpenExternal}
                className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                title="外部リンクで開く"
              >
                <ExternalLink className="w-4 h-4" style={{ color: theme.textColor }} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* プレビュー情報 */}
      <div className="mt-4 pt-4 border-t border-gray-600">
        <div className="flex items-center justify-between text-xs" style={{ color: theme.textColor + '99' }}>
          <div className="flex items-center space-x-4">
            <span>プレビュー: 30秒</span>
            {serviceInfo && (
              <span>
                品質: {serviceInfo.quality === 'high' ? '高音質' : serviceInfo.quality === 'medium' ? '標準' : '低音質'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-3 h-3" />
            <span>
              {Math.floor(track.duration / 60000)}:{String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}