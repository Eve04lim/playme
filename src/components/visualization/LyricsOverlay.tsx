// src/components/visualization/LyricsOverlay.tsx
/**
 * LyricsOverlay - 流れる歌詞アニメーション効果
 * 
 * 機能:
 * - 右200px→左-200pxの横スクロール（20-30秒ランダム）
 * - 3秒間隔での歌詞出現
 * - HSL色相ランダム・彩度70%・明度80%のカラー生成
 * - レスポンシブ対応（モバイルでは無効化）
 * - アクセシビリティ配慮
 */
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useMusicStore } from '../../stores/musicStore'
import { useMyPageStore } from '../../stores/myPageStore'

interface LyricItem {
  id: string
  text: string
  color: string
  duration: number
  delay: number
}

interface LyricsOverlayProps {
  className?: string
  opacity?: number
}

// サンプル歌詞データ
const SAMPLE_LYRICS = [
  '音楽と共に歩もう',
  'メロディーが心を癒す',
  'リズムに合わせて',
  '今日という日を大切に',
  '響く音色に包まれて',
  '夢見る力を信じて',
  'ハーモニーの中で',
  '新しい明日へ',
  '歌声が空に響く',
  '心の奥深くまで',
  '感動の瞬間を',
  '音楽は永遠に',
  'ビートが鼓動に重なる',
  '魂を揺さぶる調べ',
  '記憶に残るメロディー'
]

export const LyricsOverlay: React.FC<LyricsOverlayProps> = ({
  className = '',
  opacity = 0.2
}) => {
  const [lyrics, setLyrics] = useState<LyricItem[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const nextIdRef = useRef(0)

  // Store state
  const { isPlaying, currentTrack } = useMusicStore()
  const { showLyrics } = useMyPageStore()

  // レスポンシブ対応：モバイルデバイスの検出
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 767)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // HSL色相ランダム生成
  const generateRandomColor = useCallback((): string => {
    const hue = Math.floor(Math.random() * 360)
    return `hsl(${hue}, 70%, 80%)`
  }, [])

  // 歌詞アイテム作成
  const createLyricItem = useCallback((): LyricItem => {
    const randomLyric = SAMPLE_LYRICS[Math.floor(Math.random() * SAMPLE_LYRICS.length)]
    const duration = 20 + Math.random() * 10 // 20-30秒
    
    return {
      id: `lyric-${nextIdRef.current++}`,
      text: randomLyric ?? "",
      color: generateRandomColor(),
      duration: duration * 1000, // ミリ秒に変換
      delay: Math.random() * 2000 // 0-2秒のランダム遅延
    }
  }, [generateRandomColor])

  // 歌詞を追加
  const addLyric = useCallback(() => {
    if (!isPlaying || !currentTrack || !showLyrics || isMobile) return

    const newLyric = createLyricItem()
    
    setLyrics(prevLyrics => {
      // 最大5個までの歌詞を同時表示
      const updatedLyrics = [...prevLyrics, newLyric]
      return updatedLyrics.slice(-5)
    })

    // アニメーション終了後に自動削除
    setTimeout(() => {
      setLyrics(prevLyrics => 
        prevLyrics.filter(lyric => lyric.id !== newLyric.id)
      )
    }, newLyric.duration + newLyric.delay + 1000) // 少し余裕を持たせる
  }, [isPlaying, currentTrack, showLyrics, isMobile, createLyricItem])

  // 歌詞の表示/非表示制御
  useEffect(() => {
    const shouldShow = isPlaying && currentTrack && showLyrics && !isMobile
    setIsVisible(Boolean(shouldShow))

    if (shouldShow) {
      // 3秒間隔で歌詞を追加
      intervalRef.current = setInterval(addLyric, 3000)
      
      // 最初の歌詞を即座に追加
      addLyric()
    } else {
      // 停止時はインターバルをクリア
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      // 既存の歌詞をフェードアウト
      setLyrics([])
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, currentTrack, showLyrics, isMobile, addLyric])

  // 楽曲なしまたは設定で無効時は非表示
  if (!currentTrack || !showLyrics || isMobile) {
    return null
  }

  return (
    <div 
      className={`fixed inset-0 pointer-events-none overflow-hidden z-10 ${className}`}
      style={{ opacity: isVisible ? opacity : 0 }}
      role="presentation"
      aria-hidden="true"
    >
      {lyrics.map((lyric, index) => (
        <LyricText
          key={lyric.id}
          lyric={lyric}
          index={index}
        />
      ))}

      {/* アクセシビリティ: スクリーンリーダー向け情報 */}
      <div className="sr-only">
        {isVisible && (
          <div>
            {currentTrack.title} の装飾的な歌詞アニメーションが表示されています。
            これらは装飾目的で、実際の楽曲の歌詞ではありません。
          </div>
        )}
      </div>
    </div>
  )
}

// 個別の歌詞テキストコンポーネント
interface LyricTextProps {
  lyric: LyricItem
  index: number
}

const LyricText: React.FC<LyricTextProps> = ({ lyric, index }) => {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // 遅延後にアニメーション開始
    const timer = setTimeout(() => {
      setIsAnimating(true)
    }, lyric.delay)

    return () => clearTimeout(timer)
  }, [lyric.delay])

  // 垂直位置を計算（複数歌詞の重複回避）
  const topPosition = 20 + (index * 15) + Math.random() * 40 // 20-75% の範囲

  return (
    <div
      className={`absolute whitespace-nowrap text-2xl font-light transition-all duration-1000 ${
        isAnimating ? 'animate-lyrics-flow' : 'translate-x-[200px] opacity-0'
      }`}
      style={{
        color: lyric.color,
        top: `${topPosition}%`,
        animationDuration: `${lyric.duration}ms`,
        animationDelay: isAnimating ? '0ms' : `${lyric.delay}ms`,
        textShadow: '0 0 10px rgba(0,0,0,0.5)',
        fontFamily: 'Inter, sans-serif',
        fontWeight: '300',
        fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)', // レスポンシブフォントサイズ
      }}
    >
      {lyric.text}
    </div>
  )
}

// レスポンシブ対応の設定フック
export const useLyricsSettings = () => {
  const [settings, setSettings] = useState({
    enabled: true,
    reducedMotion: false
  })

  useEffect(() => {
    // Reduced Motion の検出
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    const handleChange = () => {
      setSettings(prev => ({
        ...prev,
        reducedMotion: mediaQuery.matches
      }))
    }

    mediaQuery.addEventListener('change', handleChange)
    handleChange()

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return settings
}

export default React.memo(LyricsOverlay)