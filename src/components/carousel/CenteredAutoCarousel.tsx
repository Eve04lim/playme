import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'

export interface CarouselItem {
  id: string
  name: string
  artist?: string
  album?: string
  imageUrl?: string
}

interface CenteredAutoCarouselProps {
  items: CarouselItem[]
  className?: string
  autoplayInterval?: number
  step?: number
  pauseOnFocus?: boolean
  onSelect?: (item: CarouselItem) => void
}

export const CenteredAutoCarousel: React.FC<CenteredAutoCarouselProps> = ({
  items,
  className,
  autoplayInterval = 3500,
  step = 1,
  pauseOnFocus = true,
  onSelect,
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const isJumpingRef = useRef(false)
  const isHoverRef = useRef(false)

  // ===== クローン数を画面幅に合わせて自動算出 =====
  const [clones, setClones] = useState(4)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const calc = () => {
      const cardW = 240 // 220–260pxの平均
      const gap = 16
      const visible = Math.max(1, Math.floor((el.clientWidth + gap) / (cardW + gap)))
      // "見た目上の余白"として +1、最低3
      setClones(Math.max(3, visible + 1))
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ===== 拡張配列（前後にクローン）=====
  const extended = useMemo(() => {
    if (!items?.length) return []
    return [
      ...items.slice(-clones),
      ...items,
      ...items.slice(0, clones),
    ]
  }, [items, clones])

  // 測定用ref
  const metricsRef = useRef<{
    startLeft: number   // 本体先頭のcenter位置
    spanWidth: number   // 本体ひとかたまりの幅（先頭→先頭クローン）
    stride: number      // 1カード分のセンター間隔
  } | null>(null)

  // 中央ハイライト用状態管理
  const [activeVIndex, setActiveVIndex] = useState<number>(clones) // 初期は本体先頭
  const rafRef = useRef<number | null>(null)

  const getNearestVIndex = useCallback(() => {
    const c = wrapRef.current
    if (!c) return activeVIndex
    const center = c.scrollLeft + c.clientWidth / 2
    let nearest = 0, best = Number.POSITIVE_INFINITY
    for (let i = 0; i < c.children.length; i++) {
      const el = c.children[i] as HTMLElement
      const cc = el.offsetLeft + el.clientWidth / 2
      const d = Math.abs(center - cc)
      if (d < best) { 
        best = d
        nearest = i 
      }
    }
    return nearest
  }, [activeVIndex])

  const scheduleActiveUpdate = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const v = getNearestVIndex()
      if (v !== activeVIndex) setActiveVIndex(v)
    })
  }, [getNearestVIndex, activeVIndex])

  // RAF cleanup
  useEffect(() => () => { 
    if (rafRef.current) cancelAnimationFrame(rafRef.current) 
  }, [])

  // 初期採寸 & stride算出（"1枚進む"距離）
  useLayoutEffect(() => {
    const c = wrapRef.current
    if (!c || items.length === 0) return

    const first = c.children[clones] as HTMLElement
    const second = c.children[clones + 1] as HTMLElement
    const nextOfLast = c.children[clones + items.length] as HTMLElement
    if (!first || !nextOfLast) return

    // gap を計測（flex gap）
    const gapStr = getComputedStyle(c).columnGap || getComputedStyle(c).gap || '0px'
    const gap = parseFloat(gapStr) || 0

    const centerLeft = (el: HTMLElement) =>
      el.offsetLeft - (c.clientWidth - el.clientWidth) / 2

    const startLeft = centerLeft(first)
    const spanWidth = nextOfLast.offsetLeft - first.offsetLeft
    let   stride    = second ? (second.offsetLeft - first.offsetLeft) : 0
    if (!stride || stride < 1) {
      // フォールバック：カード幅 + gap
      stride = first.clientWidth + gap
    }

    if (import.meta.env.DEV) {
      console.log('[CarouselMeasure]', { startLeft, spanWidth, stride, gap, clones, itemCount: items.length })
    }

    metricsRef.current = { 
      startLeft, 
      spanWidth, 
      stride
    }

    // 初期位置セット（本体の1枚目を中央）
    isJumpingRef.current = true
    c.scrollTo({ left: startLeft, behavior: 'auto' })
    requestAnimationFrame(() => {
      isJumpingRef.current = false
      // 初期ハイライト更新を確実に実行
      scheduleActiveUpdate()
    })
  }, [items.length, clones, scheduleActiveUpdate]) // Layout後に必ず採寸

  // 無限ループ正規化関数（簡単版）
  const normalizeScrollPosition = useCallback(() => {
    const c = wrapRef.current
    const m = metricsRef.current
    if (!c || !m || isJumpingRef.current) return

    const cur = c.scrollLeft
    const leftEdge = m.startLeft
    const rightEdge = m.startLeft + m.spanWidth

    // 本体範囲を大きく外れた場合のみ正規化
    if (cur < leftEdge - m.stride) {
      isJumpingRef.current = true
      c.scrollTo({ left: cur + m.spanWidth, behavior: 'auto' })
      requestAnimationFrame(() => { isJumpingRef.current = false })
    } else if (cur > rightEdge + m.stride) {
      isJumpingRef.current = true
      c.scrollTo({ left: cur - m.spanWidth, behavior: 'auto' })
      requestAnimationFrame(() => { isJumpingRef.current = false })
    }
  }, [])

  // onScroll：ハイライト常時更新
  const onScroll = useCallback(() => {
    if (isJumpingRef.current) return
    
    // ハイライトは常に更新（RAF節度）
    scheduleActiveUpdate()
    // 無限ループ正規化
    normalizeScrollPosition()
  }, [scheduleActiveUpdate, normalizeScrollPosition])

  // scroll 監視を必ず登録（正規化＆ハイライト）
  useEffect(() => {
    const c = wrapRef.current
    if (!c) return
    const handler = () => onScroll()
    c.addEventListener('scroll', handler, { passive: true })
    return () => {
      c.removeEventListener('scroll', handler)
    }
  }, [onScroll])

  // オートプレイ：rAF で実装（metrics 準備後に確実に動く）
  useEffect(() => {
    if (autoplayInterval <= 0) return
    let rafId: number | null = null
    let last = performance.now()

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick)
      const m = metricsRef.current
      const c = wrapRef.current
      if (!m || !c) return
      if (pauseOnFocus && isHoverRef.current) { last = now; return }
      if (isJumpingRef.current) { last = now; return }
      if (now - last < autoplayInterval) return
      last = now

      c.scrollTo({ left: c.scrollLeft + m.stride, behavior: 'smooth' })
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [autoplayInterval, pauseOnFocus])

  return (
    <div className={className}>
      <div
        ref={wrapRef}
        onMouseEnter={() => { if (pauseOnFocus) isHoverRef.current = true }}
        onMouseLeave={() => { if (pauseOnFocus) isHoverRef.current = false }}
        className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth px-4"
        aria-roledescription="carousel"
        aria-label="選択中のプレイリストの曲"
      >
        {extended.map((t, idx) => {
          // state管理による安定した中央ハイライト
          const isActive = idx === activeVIndex
          
          return (
            <button
              key={`${t.id}-${idx}`}
              data-idx={idx}
              onClick={() => onSelect?.(t)}
              style={{
                // 幅
                minWidth: "220px",
                maxWidth: "260px",
                // 視覚効果：中央かどうかで変える
                opacity: isActive ? 1 : 0.4,
                transform: `scale(${isActive ? 1.12 : 0.92})`,
                transition: "transform 220ms ease, opacity 180ms ease",
              }}
              className="group relative rounded-xl p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 bg-white/5"
              aria-label={`${t.name} を再生`}
            >
              <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-lg">
                {t.imageUrl ? (
                  <img
                    src={t.imageUrl}
                    alt={`${t.name} アートワーク`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center bg-white/10">
                    <span className="text-4xl">🎵</span>
                  </div>
                )}
              </div>
              <div className="space-y-1 text-left">
                <h3 className="font-medium text-sm truncate text-white">{String(t.name ?? "")}</h3>
                <p className="text-xs text-white/70 truncate">{String(t.artist ?? "")}</p>
                <p className="text-xs text-white/60 truncate">{String(t.album ?? "")}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CenteredAutoCarousel