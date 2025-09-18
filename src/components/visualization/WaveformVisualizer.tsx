// src/components/visualization/WaveformVisualizer.tsx
/**
 * WaveformVisualizer - Canvas + Web Audio API による音声波形可視化
 * 
 * 機能:
 * - リアルタイム音声解析とバー表示（64バー、60fps）
 * - テーマ色連動の上→下透明グラデーション
 * - 再生状態に連動（停止時はアニメーション停止）
 * - レスポンシブ対応とパフォーマンス最適化
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useMusicStore } from '../../stores/musicStore'
import { useMyPageStore } from '../../stores/myPageStore'

interface WaveformVisualizerProps {
  className?: string
  height?: number
  bars?: number
  opacity?: number
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  className = '',
  height = 128,
  bars = 64,
  opacity = 0.3
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const runningRef = useRef(false)
  
  // Store state
  const { isPlaying, currentTrack } = useMusicStore()
  const theme = useMyPageStore(state => state.theme)

  // Canvas dimensions
  const [dimensions, setDimensions] = useState({ width: 800, height })

  // Web Audio API 初期化
  const initAudio = useCallback(async () => {
    if (!currentTrack || audioContextRef.current) return

    try {
      // AudioContext 作成
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // AnalyserNode 作成
      const analyser = audioContextRef.current.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      
      analyserRef.current = analyser
      
      // データ配列初期化
      const bufferLength = analyser.frequencyBinCount
      dataArrayRef.current = new Uint8Array(bufferLength)

      // 既存の音声要素を取得（実装されている場合）
      const audioElements = document.querySelectorAll('audio')
      if (audioElements.length > 0) {
        const audioElement = audioElements[0]
        if (audioElement && audioContextRef.current) {
          const source = audioContextRef.current.createMediaElementSource(audioElement)
          source.connect(analyser)
          analyser.connect(audioContextRef.current.destination)
        }
      } else {
        // フォールバック: モック データで動作
        console.warn('Audio element not found, using mock visualization data')
      }
    } catch (error) {
      console.error('Web Audio API initialization failed:', error)
      setIsSupported(false)
    }
  }, [currentTrack])

  // Canvas resize handling with RAF batching
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Use RAF batching to prevent excessive updates
    requestAnimationFrame(() => {
      const rect = canvas.getBoundingClientRect()
      const devicePixelRatio = window.devicePixelRatio || 1
      
      const newWidth = rect.width * devicePixelRatio
      const newHeight = height * devicePixelRatio
      
      // Only update if dimensions actually changed to prevent micro-updates
      setDimensions(prev => {
        if (Math.abs(prev.width - newWidth) < 2 && Math.abs(prev.height - newHeight) < 2) {
          return prev
        }
        return { width: newWidth, height: newHeight }
      })
    })
  }, [height])

  // モック データ生成（Web Audio API が利用できない場合のフォールバック）
  const generateMockData = useCallback(() => {
    if (!dataArrayRef.current) return

    const data = dataArrayRef.current
    for (let i = 0; i < data.length; i++) {
      // 疑似ランダムな波形データを生成
      const baseValue = Math.sin(Date.now() * 0.001 + i * 0.1) * 50 + 100
      const variation = Math.sin(Date.now() * 0.005 + i * 0.2) * 30
      data[i] = Math.max(0, Math.min(255, baseValue + variation))
    }
  }, [])

  // 描画ループ
  const draw = useCallback(() => {
    if (!runningRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // Canvas クリア
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!isPlaying || !currentTrack) {
      // 停止時は空の状態を描画
      return
    }

    // 音声データ取得
    if (analyserRef.current && dataArrayRef.current) {
      if (isSupported) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
      } else {
        generateMockData()
      }
    } else {
      // 初期化されていない場合はモックデータを生成
      if (!dataArrayRef.current) {
        dataArrayRef.current = new Uint8Array(bars)
      }
      generateMockData()
    }

    const dataArray = dataArrayRef.current
    if (!dataArray) return
    const barWidth = canvas.width / bars
    const barSpacing = barWidth * 0.1

    // グラデーション作成 (上→下の透明グラデーション)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, theme.primaryColor)
    gradient.addColorStop(0.7, theme.primaryColor + '80')
    gradient.addColorStop(1, theme.primaryColor + '20')

    ctx.fillStyle = gradient

    // バー描画
    for (let i = 0; i < bars; i++) {
      // データ配列からサンプリング
      const dataIndex = Math.floor((i / bars) * dataArray.length)
      const dataValue = dataArray[dataIndex]
      if (dataValue === undefined) continue
      const barHeight = (dataValue / 255) * canvas.height

      const x = i * barWidth + barSpacing / 2
      const y = canvas.height - barHeight
      const width = barWidth - barSpacing

      // バー描画（角丸）
      ctx.beginPath()
      ctx.roundRect(x, y, width, barHeight, [2, 2, 0, 0])
      ctx.fill()
    }

    // アニメーションループ継続
    if (runningRef.current) {
      animationRef.current = requestAnimationFrame(draw)
    }
  }, [isPlaying, currentTrack, theme.primaryColor, bars, generateMockData, isSupported])

  // 初期化と cleanup
  useEffect(() => {
    if (currentTrack && isPlaying) {
      initAudio()
    }
    
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [currentTrack, initAudio, isPlaying])

  // 再生状態変更時の処理
  useEffect(() => {
    const start = () => {
      if (runningRef.current) return
      runningRef.current = true
      animationRef.current = requestAnimationFrame(draw)
    }
    
    const stop = () => {
      runningRef.current = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = undefined
      }
    }

    const onVis = () => (document.visibilityState === 'visible' ? start() : stop())
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const onReduced = () => (prefersReduced.matches ? stop() : start())

    // 音源がない/タブ非表示/ReducedMotion なら停止
    if (isPlaying && currentTrack) {
      onVis()
      onReduced()
    } else {
      stop()
      
      // Canvas をクリア
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    document.addEventListener('visibilitychange', onVis)
    prefersReduced?.addEventListener?.('change', onReduced)
    
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      prefersReduced?.removeEventListener?.('change', onReduced)
      stop()
    }
  }, [isPlaying, currentTrack, draw])

  // リサイズ監視
  useEffect(() => {
    updateCanvasDimensions()
    
    const resizeObserver = new ResizeObserver(updateCanvasDimensions)
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [updateCanvasDimensions])

  // Canvas サイズ更新
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = dimensions.width
    canvas.height = dimensions.height
  }, [dimensions])

  // 楽曲なしまたは停止時は非表示
  if (!currentTrack) {
    return null
  }

  return (
    <div 
      className={`relative ${className}`} 
      style={{ opacity }}
      role="img"
      aria-label={isPlaying ? '音楽の波形を表示中' : '音楽の再生が停止中'}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ height: `${height}px` }}
        aria-hidden="true"
      />
      
      {/* Accessibility: スクリーンリーダー向け情報 */}
      <div className="sr-only">
        {currentTrack.title} の音楽波形ビジュアライザー。
        {isPlaying ? '再生中' : '一時停止中'}
      </div>
      
      {/* フォールバック表示（Web Audio API 非対応時） */}
      {!isSupported && (
        <div 
          className="absolute inset-0 flex items-center justify-center text-sm opacity-60"
          style={{ color: theme.textColor }}
        >
          <span className="bg-black/50 px-2 py-1 rounded">
            音声可視化は対応していません
          </span>
        </div>
      )}
    </div>
  )
}

// メモ化で再レンダリング最適化
export default React.memo(WaveformVisualizer)