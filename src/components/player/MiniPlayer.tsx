// src/components/player/MiniPlayer.tsx
/**
 * Enhanced MiniPlayer - 改良されたミニプレイヤー
 * 
 * 機能:
 * - 48×48アート、楽曲情報、基本コントロール
 * - ボリューム操作、キーボードショートカット
 * - 波形表示（再生中のみ）、レスポンシブ対応
 * - アクセシビリティ完全対応
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { useMusicStore } from '../../stores/musicStore'
import { useMyPageStore } from '../../stores/myPageStore'
import WaveformVisualizer from '../visualization/WaveformVisualizer'

export const MiniPlayer: React.FC = () => {
  const { 
    currentTrack, 
    isPlaying, 
    currentTime,
    duration,
    volume,
    nextTrack,
    previousTrack,
    setVolume
  } = useMusicStore()
  
  const theme = useMyPageStore(state => state.theme)
  const [showControls, setShowControls] = useState(false)
  const [showWaveform, setShowWaveform] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(volume)
  const playerRef = useRef<HTMLDivElement>(null)

  // togglePlay の安全なラッパー
  const safeTogglePlay = useCallback(() => {
    const store = useMusicStore.getState()
    const player: any = playerRef?.current ?? store
    if (!player) return
    
    if (typeof store.togglePlay === 'function') {
      store.togglePlay()
      return
    }
    
    // HTMLAudioElement 互換フォールバック
    if (player instanceof HTMLAudioElement) {
      if (player.paused) { 
        player.play().catch(() => {}) 
      } else { 
        player.pause() 
      }
    }
  }, [])

  // キーボードショートカット
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // フォーカスがinput要素にある場合はスキップ
    if ((e.target as Element)?.tagName === 'INPUT') return

    switch (e.key) {
      case ' ':
        e.preventDefault()
        safeTogglePlay()
        break
      case 'ArrowLeft':
        e.preventDefault()
        previousTrack()
        break
      case 'ArrowRight':
        e.preventDefault()
        nextTrack()
        break
      case 'ArrowUp':
        e.preventDefault()
        setVolume(Math.min(100, Math.round(volume * 100) + 5) / 100)
        break
      case 'ArrowDown':
        e.preventDefault()
        setVolume(Math.max(0, Math.round(volume * 100) - 5) / 100)
        break
      case 'm':
      case 'M':
        e.preventDefault()
        handleMute()
        break
    }
  }, [safeTogglePlay, nextTrack, previousTrack, setVolume, volume])

  // ミュート切り替え
  const handleMute = useCallback(() => {
    if (isMuted) {
      setVolume(prevVolume || 0.5)
      setIsMuted(false)
    } else {
      setPrevVolume(volume)
      setVolume(0)
      setIsMuted(true)
    }
  }, [isMuted, volume, prevVolume, setVolume])

  // ボリューム変更監視
  useEffect(() => {
    setIsMuted(volume === 0)
  }, [volume])

  // キーボードイベント設定
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // 現在再生中の楽曲がない場合は表示しない
  if (!currentTrack) {
    return null
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div 
      ref={playerRef}
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md shadow-2xl transition-all duration-300"
      style={{ 
        backgroundColor: theme.backgroundColor + 'F5',
        borderTop: `1px solid ${theme.primaryColor}40`
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      role="region"
      aria-label="音楽プレイヤー"
      aria-live="polite"
    >
      {/* 波形ビジュアライザー（背景） */}
      {showWaveform && isPlaying && (
        <WaveformVisualizer 
          className="absolute inset-0 z-0" 
          height={80}
          opacity={0.15}
        />
      )}

      {/* メインプレイヤー */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center space-x-4">
          {/* アルバムアート */}
          <div className="flex-shrink-0">
            <img
              src={currentTrack.artworkUrl || 'https://via.placeholder.com/48x48?text=♪'}
              alt={`${currentTrack.title} のアートワーク`}
              className="w-12 h-12 rounded-lg object-cover shadow-md transition-transform hover:scale-105"
              loading="eager"
            />
          </div>

          {/* 楽曲情報 */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate" style={{ color: theme.textColor }}>
              {currentTrack.title}
            </h4>
            <p className="text-sm truncate opacity-75" style={{ color: theme.textColor }}>
              {currentTrack.artist}
            </p>
            {currentTrack.album && (
              <p className="text-xs truncate opacity-60" style={{ color: theme.textColor }}>
                {currentTrack.album}
              </p>
            )}
          </div>

          {/* プレイヤーコントロール */}
          <div className="flex items-center space-x-3">
            {/* 前の曲 */}
            <button
              onClick={previousTrack}
              className="p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              title="前の曲 (←キー)"
              aria-label="前の曲を再生"
            >
              <SkipBack size={20} style={{ color: theme.textColor }} />
            </button>
            
            {/* 再生/一時停止 */}
            <button
              onClick={safeTogglePlay}
              className="p-3 rounded-full hover:scale-110 transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
              style={{ backgroundColor: theme.primaryColor }}
              title={isPlaying ? '一時停止 (スペースキー)' : '再生 (スペースキー)'}
              aria-label={isPlaying ? '音楽を一時停止' : '音楽を再生'}
            >
              {isPlaying ? (
                <Pause size={20} className="text-white" fill="currentColor" />
              ) : (
                <Play size={20} className="text-white" fill="currentColor" />
              )}
            </button>
            
            {/* 次の曲 */}
            <button
              onClick={nextTrack}
              className="p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              title="次の曲 (→キー)"
              aria-label="次の曲を再生"
            >
              <SkipForward size={20} style={{ color: theme.textColor }} />
            </button>
          </div>

          {/* 進行バー＋時間 */}
          <div className="flex-1 max-w-xs flex items-center space-x-2">
            <span className="text-xs" style={{ color: theme.textColor + 'AA' }}>
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 group">
              <div className="w-full bg-gray-600 bg-opacity-30 rounded-full h-1 group-hover:h-2 transition-all duration-200">
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    backgroundColor: theme.primaryColor,
                    width: `${progressPercentage}%`
                  }}
                />
              </div>
            </div>
            <span className="text-xs" style={{ color: theme.textColor + 'AA' }}>
              {formatTime(duration)}
            </span>
          </div>

          {/* 音量コントロール */}
          <div className={`flex items-center space-x-2 transition-all duration-300 ${showControls || isMuted ? 'opacity-100' : 'opacity-60'}`}>
            <button
              onClick={handleMute}
              className="p-1 rounded hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              title={isMuted ? 'ミュート解除 (Mキー)' : 'ミュート (Mキー)'}
              aria-label={isMuted ? 'ミュートを解除' : '音声をミュート'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={18} style={{ color: theme.textColor }} />
              ) : (
                <Volume2 size={18} style={{ color: theme.textColor }} />
              )}
            </button>
            
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              onChange={(e) => {
                const newVolume = Number(e.target.value) / 100
                setVolume(newVolume)
                if (newVolume > 0 && isMuted) {
                  setIsMuted(false)
                }
              }}
              className="w-20 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: theme.primaryColor }}
              title="音量調節 (↑↓キー)"
              aria-label={`音量 ${Math.round(volume * 100)}%`}
            />
            
            <span className="text-xs w-8 text-right" style={{ color: theme.textColor }}>
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* 波形表示切り替え（デスクトップのみ） */}
          <div className="hidden lg:block">
            <button
              onClick={() => setShowWaveform(!showWaveform)}
              className={`p-2 rounded-full transition-all duration-200 ${
                showWaveform ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              title="波形表示切り替え"
              aria-label={showWaveform ? '波形表示を非表示' : '波形表示を表示'}
            >
              <div className="w-4 h-4 flex items-end justify-between space-x-px">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 bg-current transition-all duration-200 ${
                      showWaveform && isPlaying ? 'animate-wave-bars' : ''
                    }`}
                    style={{ 
                      color: theme.textColor,
                      height: `${20 + i * 10}%`,
                      animationDelay: `${i * 100}ms`
                    }}
                  />
                ))}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 拡張コントロール（ホバー時表示） */}
      {showControls && (
        <div 
          className="px-4 pb-2 border-t border-white/10"
          style={{ backgroundColor: theme.backgroundColor + '20' }}
        >
          <div className="max-w-7xl mx-auto flex justify-between items-center py-2">
            <div className="flex items-center space-x-4 text-xs" style={{ color: theme.textColor + 'CC' }}>
              <span>品質: 320kbps</span>
              <span>•</span>
              <span>形式: MP3</span>
              {currentTrack.externalUrl && (
                <>
                  <span>•</span>
                  <a 
                    href={currentTrack.externalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline focus:outline-none focus:underline"
                    aria-label="外部サービスで楽曲を開く"
                  >
                    外部で開く ↗
                  </a>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-xs opacity-60" style={{ color: theme.textColor }}>
                キーボード: スペース(再生), ←→(曲送り), ↑↓(音量), M(ミュート)
              </div>
              <div className="text-xs opacity-60" style={{ color: theme.textColor }}>
                🎵 Playme Player v2.0
              </div>
            </div>
          </div>
        </div>
      )}

      {/* スクリーンリーダー用ライブリージョン */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        現在再生中: {currentTrack.title} - {currentTrack.artist}
        {isPlaying ? '再生中' : '一時停止中'}
        {Math.round(volume * 100)}% 音量
      </div>
    </div>
  )
}