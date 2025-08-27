// src/hooks/useResumePlayback.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { PlaybackHistoryManager } from '../utils/playbackHistoryManager'
import type { Track } from '../types'

interface ResumePlaybackOptions {
  autoResume?: boolean
  resumeThreshold?: number // 最低再生位置（秒）
  maxResumeGap?: number // 最大再開可能時間（時間）
  onResumeStart?: (track: Track, position: number) => void
  onResumeComplete?: (track: Track) => void
}

interface ResumeSession {
  trackId: string
  sessionId: string
  startPosition: number
  isActive: boolean
}

interface UseResumePlaybackReturn {
  resumePosition: number
  canResume: boolean
  isResuming: boolean
  resumeProgress: number
  startResumePlayback: (track: Track) => Promise<void>
  stopResumePlayback: () => void
  updatePlaybackProgress: (currentTime: number) => void
  getResumeData: (trackId: string) => { position: number; canResume: boolean }
  clearResumeData: (trackId: string) => void
}

export const useResumePlayback = (
  options: ResumePlaybackOptions = {}
): UseResumePlaybackReturn => {
  const {
    autoResume = true,
    resumeThreshold = 30, // 30秒以上再生されている場合のみ続きから再生
    maxResumeGap = 24, // 24時間以内の場合のみ続きから再生
    onResumeStart,
    onResumeComplete
  } = options

  const [historyManager] = useState(() => new PlaybackHistoryManager())
  const [currentSession, setCurrentSession] = useState<ResumeSession | null>(null)
  const [resumePosition, setResumePosition] = useState(0)
  const [canResume, setCanResume] = useState(false)
  const [isResuming, setIsResuming] = useState(false)
  const [resumeProgress, setResumeProgress] = useState(0)

  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const progressUpdateTimeoutRef = useRef<number>()

  // オーディオ要素の取得/監視
  useEffect(() => {
    const findAudioElement = () => {
      const audioElement = document.querySelector('audio') as HTMLAudioElement
      if (audioElement && audioElement !== audioElementRef.current) {
        audioElementRef.current = audioElement
        setupAudioListeners(audioElement)
      }
    }

    // 定期的にオーディオ要素をチェック
    const interval = setInterval(findAudioElement, 1000)
    findAudioElement() // 初回実行

    return () => clearInterval(interval)
  }, [])

  // オーディオイベントリスナーの設定
  const setupAudioListeners = useCallback((audioElement: HTMLAudioElement) => {
    const handleTimeUpdate = () => {
      if (currentSession && currentSession.isActive) {
        const currentTime = audioElement.currentTime * 1000 // ミリ秒に変換
        historyManager.updatePlaybackProgress(
          currentSession.trackId,
          currentSession.sessionId,
          currentTime
        )
      }
    }

    const handleEnded = () => {
      if (currentSession && currentSession.isActive) {
        const finalPosition = audioElement.duration * 1000
        historyManager.endPlayback(
          currentSession.trackId,
          currentSession.sessionId,
          finalPosition,
          false
        )
        setCurrentSession(null)
        onResumeComplete?.(audioElement.src as any) // 簡易実装
      }
    }

    const handlePause = () => {
      if (currentSession && currentSession.isActive) {
        const currentTime = audioElement.currentTime * 1000
        historyManager.updatePlaybackProgress(
          currentSession.trackId,
          currentSession.sessionId,
          currentTime
        )
      }
    }

    // イベントリスナーの追加
    audioElement.addEventListener('timeupdate', handleTimeUpdate)
    audioElement.addEventListener('ended', handleEnded)
    audioElement.addEventListener('pause', handlePause)

    // クリーンアップ関数を返す
    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate)
      audioElement.removeEventListener('ended', handleEnded)
      audioElement.removeEventListener('pause', handlePause)
    }
  }, [currentSession, historyManager, onResumeComplete])

  // 続きから再生データの取得
  const getResumeData = useCallback((trackId: string) => {
    const history = historyManager.getHistory({
      limit: 1,
      filter: { playCountMin: 1 }
    })

    const entry = history.find(h => h.trackId === trackId)
    if (!entry) {
      return { position: 0, canResume: false }
    }

    const positionSeconds = entry.lastPosition / 1000
    const hoursSinceLastPlay = (Date.now() - entry.lastPlayedAt.getTime()) / (1000 * 60 * 60)
    
    const canResumeTrack = positionSeconds >= resumeThreshold && 
                          hoursSinceLastPlay <= maxResumeGap &&
                          entry.completionRate < 0.95 // 95%未満の場合のみ

    return {
      position: positionSeconds,
      canResume: canResumeTrack
    }
  }, [historyManager, resumeThreshold, maxResumeGap])

  // 続きから再生の開始
  const startResumePlayback = useCallback(async (track: Track) => {
    setIsResuming(true)
    
    try {
      const resumeData = getResumeData(track.id)
      
      if (!resumeData.canResume) {
        // 通常再生として開始
        const sessionId = historyManager.startPlayback(track, 'normal_playback')
        setCurrentSession({
          trackId: track.id,
          sessionId,
          startPosition: 0,
          isActive: true
        })
        setResumePosition(0)
        setCanResume(false)
        return
      }

      // 続きから再生として開始
      const sessionId = historyManager.startPlayback(track, 'resume_playback')
      const resumePositionMs = resumeData.position * 1000
      
      setCurrentSession({
        trackId: track.id,
        sessionId,
        startPosition: resumePositionMs,
        isActive: true
      })
      
      setResumePosition(resumeData.position)
      setCanResume(true)

      // オーディオ要素の再生位置を設定
      const waitForAudioAndSetPosition = () => {
        const audioElement = audioElementRef.current
        if (audioElement && audioElement.readyState >= 2) { // HAVE_CURRENT_DATA以上
          audioElement.currentTime = resumeData.position
          onResumeStart?.(track, resumeData.position)
        } else {
          // 準備ができるまで少し待つ
          setTimeout(waitForAudioAndSetPosition, 100)
        }
      }

      // 短い遅延後に位置を設定
      setTimeout(waitForAudioAndSetPosition, 200)

    } catch (error) {
      console.error('Failed to start resume playback:', error)
      // エラー時は通常再生にフォールバック
      const sessionId = historyManager.startPlayback(track, 'fallback_playback')
      setCurrentSession({
        trackId: track.id,
        sessionId,
        startPosition: 0,
        isActive: true
      })
    } finally {
      setIsResuming(false)
    }
  }, [getResumeData, historyManager, onResumeStart])

  // 再生停止
  const stopResumePlayback = useCallback(() => {
    if (currentSession && currentSession.isActive) {
      const audioElement = audioElementRef.current
      const currentTime = audioElement ? audioElement.currentTime * 1000 : 0
      
      historyManager.endPlayback(
        currentSession.trackId,
        currentSession.sessionId,
        currentTime,
        false
      )
      
      setCurrentSession(null)
      setResumePosition(0)
      setCanResume(false)
      setResumeProgress(0)
    }
  }, [currentSession, historyManager])

  // 再生進行状況の更新
  const updatePlaybackProgress = useCallback((currentTime: number) => {
    if (currentSession && currentSession.isActive) {
      const currentTimeMs = currentTime * 1000
      historyManager.updatePlaybackProgress(
        currentSession.trackId,
        currentSession.sessionId,
        currentTimeMs
      )

      // 進行率の計算
      const audioElement = audioElementRef.current
      if (audioElement && audioElement.duration > 0) {
        const progress = currentTime / audioElement.duration
        setResumeProgress(progress)
      }
    }
  }, [currentSession, historyManager])

  // 続きから再生データのクリア
  const clearResumeData = useCallback((trackId: string) => {
    // 履歴から該当トラックの最終位置をリセット
    const history = historyManager.getHistory({ limit: 1000 })
    const entry = history.find(h => h.trackId === trackId)
    
    if (entry) {
      // 最終位置を0にリセット
      entry.lastPosition = 0
      entry.completionRate = 0
    }
  }, [historyManager])

  // 自動続きから再生の実装
  useEffect(() => {
    if (!autoResume) return

    const handleAudioPlay = () => {
      const audioElement = audioElementRef.current
      if (!audioElement || !audioElement.src) return

      // 現在のトラック情報を取得（簡易実装）
      const currentTrackId = audioElement.getAttribute('data-track-id')
      if (!currentTrackId) return

      const resumeData = getResumeData(currentTrackId)
      if (resumeData.canResume && audioElement.currentTime < resumeThreshold) {
        // 自動的に続きから再生位置にシーク
        audioElement.currentTime = resumeData.position
      }
    }

    const audioElement = audioElementRef.current
    if (audioElement) {
      audioElement.addEventListener('play', handleAudioPlay)
      return () => audioElement.removeEventListener('play', handleAudioPlay)
    }
  }, [autoResume, getResumeData, resumeThreshold])

  // 進行状況の定期更新
  useEffect(() => {
    if (currentSession && currentSession.isActive) {
      const updateInterval = setInterval(() => {
        const audioElement = audioElementRef.current
        if (audioElement && !audioElement.paused) {
          updatePlaybackProgress(audioElement.currentTime)
        }
      }, 1000) // 1秒ごとに更新

      return () => clearInterval(updateInterval)
    }
  }, [currentSession, updatePlaybackProgress])

  return {
    resumePosition,
    canResume,
    isResuming,
    resumeProgress,
    startResumePlayback,
    stopResumePlayback,
    updatePlaybackProgress,
    getResumeData,
    clearResumeData
  }
}

// 続きから再生インジケーターコンポーネント
export const ResumePlaybackIndicator: React.FC<{
  trackId: string
  duration: number
  onResume?: () => void
  className?: string
}> = ({ trackId, duration, onResume, className = '' }) => {
  const { getResumeData } = useResumePlayback()
  const resumeData = getResumeData(trackId)

  if (!resumeData.canResume) return null

  const progressPercentage = (resumeData.position / (duration / 1000)) * 100
  const remainingTime = (duration / 1000) - resumeData.position

  return (
    <div className={`${className} flex items-center space-x-2 p-2 bg-blue-500/20 rounded-lg border border-blue-500/50`}>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-blue-400">続きから再生できます</span>
          <span className="text-xs text-blue-300">
            残り {Math.floor(remainingTime / 60)}:{Math.floor(remainingTime % 60).toString().padStart(2, '0')}
          </span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-1">
          <div 
            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      {onResume && (
        <button
          onClick={onResume}
          className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors"
        >
          続きから
        </button>
      )}
    </div>
  )
}