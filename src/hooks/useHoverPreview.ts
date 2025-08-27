// src/hooks/useHoverPreview.ts
import { useCallback, useEffect, useRef, useState } from 'react'

interface EnhancedTrack {
  id: string
  title: string
  artist: string
  artworkUrl?: string
  previewUrl?: string
  duration: number
}

interface PreviewState {
  track: EnhancedTrack | null
  isLoading: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  error?: string
}

interface UseHoverPreviewOptions {
  enabled?: boolean
  volume?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  maxPreviewDuration?: number
  previewStartOffset?: number
  onPreviewStart?: (track: EnhancedTrack) => void
  onPreviewEnd?: (track: EnhancedTrack) => void
  onError?: (error: string, track: EnhancedTrack) => void
}

interface UseHoverPreviewReturn {
  previewState: PreviewState
  startPreview: (track: EnhancedTrack) => void
  stopPreview: () => void
  setVolume: (volume: number) => void
  isPreviewSupported: boolean
}

export const useHoverPreview = (options: UseHoverPreviewOptions = {}): UseHoverPreviewReturn => {
  const {
    enabled = true,
    volume: initialVolume = 0.3,
    fadeInDuration = 500,
    fadeOutDuration = 300,
    maxPreviewDuration = 30000, // 30秒
    previewStartOffset = 30, // 30秒地点から開始
    onPreviewStart,
    onPreviewEnd,
    onError
  } = options

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadeTimeoutRef = useRef<number>()
  const previewTimeoutRef = useRef<number>()
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)

  const [previewState, setPreviewState] = useState<PreviewState>({
    track: null,
    isLoading: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: initialVolume,
    error: undefined
  })

  const [isPreviewSupported, setIsPreviewSupported] = useState(true)

  // Web Audio APIの初期化
  const initializeAudioContext = useCallback(() => {
    if (!enabled || audioContextRef.current) return

    try {
      // AudioContextの作成
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      audioContextRef.current = new AudioContextClass()
      
      // GainNodeの作成（音量制御用）
      gainNodeRef.current = audioContextRef.current.createGain()
      gainNodeRef.current.connect(audioContextRef.current.destination)
      gainNodeRef.current.gain.value = initialVolume

      console.log('Audio context initialized for hover preview')
    } catch (error) {
      console.warn('Web Audio API not supported:', error)
      setIsPreviewSupported(false)
    }
  }, [enabled, initialVolume])

  // オーディオ要素の作成
  const createAudioElement = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.remove()
    }

    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audio.volume = 0 // フェードイン用に0から開始
    audio.preload = 'none'
    
    // Web Audio APIとの接続
    if (audioContextRef.current && gainNodeRef.current && !sourceNodeRef.current) {
      try {
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audio)
        sourceNodeRef.current.connect(gainNodeRef.current)
      } catch (error) {
        console.warn('Failed to connect audio element to Web Audio API:', error)
      }
    }

    audioRef.current = audio
    return audio
  }, [])

  // モック音声の生成
  const generateMockAudio = useCallback(async (track: EnhancedTrack): Promise<string> => {
    if (!audioContextRef.current) return ''

    try {
      // 楽曲の特徴に基づいた短いサンプル音声を生成
      const context = audioContextRef.current
      const sampleRate = context.sampleRate
      const duration = 5 // 5秒のサンプル
      const length = sampleRate * duration
      
      const buffer = context.createBuffer(2, length, sampleRate)
      
      // 楽曲IDに基づく擬似ランダム音声生成
      const trackSeed = parseInt(track.id.replace(/\D/g, '').slice(-8) || '12345678')
      let seed = trackSeed
      
      const random = () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }

      // チャンネルごとに音声データを生成
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel)
        
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate
          
          // 基本周波数（楽曲IDに基づく）
          const baseFreq = 220 + (trackSeed % 100) * 2 // 220-420Hz
          
          // 複数の正弦波を組み合わせてリッチな音声を作成
          let sample = 0
          sample += Math.sin(2 * Math.PI * baseFreq * t) * 0.3
          sample += Math.sin(2 * Math.PI * baseFreq * 1.25 * t) * 0.2
          sample += Math.sin(2 * Math.PI * baseFreq * 1.5 * t) * 0.15
          
          // ノイズ追加
          sample += (random() - 0.5) * 0.1
          
          // エンベロープ（フェードイン・アウト）
          const fadeTime = 0.1 // 0.1秒
          let envelope = 1
          if (t < fadeTime) {
            envelope = t / fadeTime
          } else if (t > duration - fadeTime) {
            envelope = (duration - t) / fadeTime
          }
          
          channelData[i] = sample * envelope * 0.3 // 音量調整
        }
      }

      // Blobに変換してURLを作成
      const audioBlob = bufferToWaveBlob(buffer)
      return URL.createObjectURL(audioBlob)
    } catch (error) {
      console.warn('Failed to generate mock audio:', error)
      return ''
    }
  }, [])

  // AudioBufferをWAVファイルのBlobに変換
  const bufferToWaveBlob = useCallback((buffer: AudioBuffer): Blob => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44
    const arrayBuffer = new ArrayBuffer(length)
    const view = new DataView(arrayBuffer)
    const channels = []
    let offset = 0
    let pos = 0

    // WAVEヘッダー書き込み
    const writeString = (offset: number, string: string) => {
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

    // チャンネルデータを取得
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i))
    }

    // インターリーブ形式でデータを書き込み
    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        const sample = Math.max(-1, Math.min(1, channels[i][offset]))
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
        pos += 2
      }
      offset++
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }, [])

  // フェードイン効果
  const fadeIn = useCallback((targetVolume: number = previewState.volume) => {
    if (!gainNodeRef.current) return

    const gainNode = gainNodeRef.current
    const currentTime = audioContextRef.current?.currentTime || 0
    
    gainNode.gain.cancelScheduledValues(currentTime)
    gainNode.gain.setValueAtTime(0, currentTime)
    gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + fadeInDuration / 1000)
  }, [fadeInDuration, previewState.volume])

  // フェードアウト効果
  const fadeOut = useCallback((callback?: () => void) => {
    if (!gainNodeRef.current) return

    const gainNode = gainNodeRef.current
    const currentTime = audioContextRef.current?.currentTime || 0
    
    gainNode.gain.cancelScheduledValues(currentTime)
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime)
    gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeOutDuration / 1000)

    if (callback) {
      setTimeout(callback, fadeOutDuration)
    }
  }, [fadeOutDuration])

  // プレビュー開始
  const startPreview = useCallback(async (track: EnhancedTrack) => {
    if (!enabled || previewState.track?.id === track.id) return

    // 前のプレビューを停止
    stopPreview()

    setPreviewState(prev => ({
      ...prev,
      track,
      isLoading: true,
      error: undefined
    }))

    try {
      const audio = createAudioElement()
      
      // プレビューURLの取得または生成
      let previewUrl = track.previewUrl
      
      if (!previewUrl) {
        // モック音声を生成
        previewUrl = await generateMockAudio(track)
      }
      
      if (!previewUrl) {
        throw new Error('プレビュー音声を取得できませんでした')
      }

      // オーディオの設定
      audio.src = previewUrl
      
      // イベントリスナーの設定
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
        stopPreview()
        onPreviewEnd?.(track)
      }

      const handleError = () => {
        const errorMessage = 'プレビュー再生に失敗しました'
        setPreviewState(prev => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          error: errorMessage
        }))
        onError?.(errorMessage, track)
      }

      audio.addEventListener('canplay', handleCanPlay)
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('error', handleError)

      // プレビュー開始位置を設定
      audio.currentTime = Math.min(previewStartOffset, track.duration / 1000 * 0.3)

      // 再生開始
      await audio.play()
      
      setPreviewState(prev => ({
        ...prev,
        isPlaying: true
      }))

      // フェードイン
      fadeIn()
      
      // 最大プレビュー時間でタイムアウト
      previewTimeoutRef.current = window.setTimeout(() => {
        stopPreview()
      }, maxPreviewDuration)

      onPreviewStart?.(track)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'プレビューの開始に失敗しました'
      setPreviewState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: errorMessage
      }))
      onError?.(errorMessage, track)
    }
  }, [enabled, previewState.track?.id, createAudioElement, generateMockAudio, fadeIn, maxPreviewDuration, previewStartOffset, onPreviewStart, onPreviewEnd, onError])

  // プレビュー停止
  const stopPreview = useCallback(() => {
    if (!previewState.track) return

    const currentTrack = previewState.track

    // タイムアウトのクリア
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
      previewTimeoutRef.current = undefined
    }

    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current)
      fadeTimeoutRef.current = undefined
    }

    // フェードアウトして停止
    fadeOut(() => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        
        // Blob URLの場合はリソースを解放
        if (audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src)
        }
      }

      setPreviewState({
        track: null,
        isLoading: false,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: initialVolume,
        error: undefined
      })

      onPreviewEnd?.(currentTrack)
    })
  }, [previewState.track, fadeOut, initialVolume, onPreviewEnd])

  // 音量設定
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    
    setPreviewState(prev => ({
      ...prev,
      volume: clampedVolume
    }))

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clampedVolume
    }
  }, [])

  // 初期化
  useEffect(() => {
    if (enabled) {
      initializeAudioContext()
    }

    return () => {
      stopPreview()
      
      // AudioContext のクリーンアップ
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [enabled, initializeAudioContext, stopPreview])

  // ユーザーインタラクション後にAudioContextを再開
  useEffect(() => {
    const handleUserInteraction = () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume()
      }
    }

    document.addEventListener('click', handleUserInteraction, { once: true })
    document.addEventListener('keydown', handleUserInteraction, { once: true })

    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
    }
  }, [])

  return {
    previewState,
    startPreview,
    stopPreview,
    setVolume,
    isPreviewSupported: isPreviewSupported && enabled
  }
}