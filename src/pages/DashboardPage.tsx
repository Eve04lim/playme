// src/pages/DashboardPage.tsx
/**
 * DashboardPage - Playme ダッシュボード統合ページ
 * 
 * 機能:
 * - レスポンシブ3/2/1カラムレイアウト
 * - 波形＋歌詞エフェクト（設定・デバイス依存）
 * - MiniPlayer統合、アクセシビリティ完全対応
 * - パフォーマンス最適化（遅延読込、仮想化）
 */
import { Grid3X3, Palette, Settings, Volume2 } from 'lucide-react'
import React, { startTransition, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MusicCarousel from '../components/carousel/MusicCarousel'
import CenteredAutoCarousel from '../components/carousel/CenteredAutoCarousel'
import { BuildStamp } from '../components/debug/BuildStamp'
import { PlaylistDebugBar } from '../components/debug/PlaylistDebugBar'
import { SpotifyPlaylists } from '../components/playlist/SpotifyPlaylists'
import LyricsOverlay from '../components/visualization/LyricsOverlay'
import WaveformVisualizer from '../components/visualization/WaveformVisualizer'
import { useSpotify } from '../hooks/useSpotify'
import { useAuthStore } from '../stores/authStore'
import { useMusicStore } from '../stores/musicStore'
import { useMyPageStore } from '../stores/myPageStore'
import { usePlaylistStore } from '../stores/playlistStore'
import { useTracksStore } from '../stores/tracksStore'
import { debug } from '../utils/debug'

// 遅延読込対応のコンポーネント
const LazySettingsModal = React.lazy(() => import('../components/modals/SettingsModal'))

interface DashboardPageProps {}

export const DashboardPage: React.FC<DashboardPageProps> = () => {
  const [showSettings, setShowSettings] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [initCompleted, setInitCompleted] = useState(false)
  // const [columnLayout, setColumnLayout] = useState<number>(3) // 不要：単一カルーセルに統一
  const [errorMsg, setErrorMsg] = useState<string>('')
  const initializedRef = useRef(false)
  const runIdRef = useRef(0) // 複数 run の競合を識別
  const inflightTracks = useRef<Record<string, Promise<any>>>({})
  const fetchCountRef = useRef(0)

  // Store states with shallow selectors to prevent unnecessary re-renders
  const { spotifyTokens, spotifyConnected, hasHydrated } = useAuthStore(s => ({
    spotifyTokens: s.spotifyTokens, 
    spotifyConnected: s.spotifyConnected ?? false,
    hasHydrated: s.hasHydrated ?? false
  }))
  const { playlists, loadPlaylists } = useMusicStore()
  const { playlists: spotifyPlaylists, selectedPlaylistId, setPlaylists } = usePlaylistStore()
  const { 
    theme, 
    showWaveform, 
    showLyrics,
    loadSettings 
  } = useMyPageStore()
  
  const spotify = useSpotify()
  
  // Stable refs for functions to prevent useEffect re-runs
  const loadSettingsRef = useRef(loadSettings)
  const loadPlaylistsRef = useRef(loadPlaylists)
  const setPlaylistsRef = useRef(setPlaylists)
  const spotifyRef = useRef(spotify)
  
  // Update refs on each render
  loadSettingsRef.current = loadSettings
  loadPlaylistsRef.current = loadPlaylists
  setPlaylistsRef.current = setPlaylists
  spotifyRef.current = spotify
  const { tracksByPlaylist, loading: tracksLoading, setTracksFor, setLoading: setTracksLoading, setError: setTracksError } = useTracksStore()
  // 依存を "配列の長さ" に縮約（オブジェクト参照の変化で再発火しない）
  const selectedTracksLen = useTracksStore(
    s => (selectedPlaylistId ? (s.tracksByPlaylist[selectedPlaylistId]?.length ?? 0) : 0)
  )
  const hasAccessToken = Boolean(spotifyTokens?.accessToken)

  // レスポンシブ対応 → 不要：単一カルーセルに統一
  // useEffect(() => {
  //   const updateLayout = () => {
  //     const width = window.innerWidth
  //     if (width >= 1200) {
  //       setColumnLayout(3) // Desktop
  //     } else if (width >= 768) {
  //       setColumnLayout(2) // Tablet
  //     } else {
  //       setColumnLayout(1) // Mobile
  //     }
  //   }

  //   updateLayout()
  //   window.addEventListener('resize', updateLayout)

  //   return () => {
  //     window.removeEventListener('resize', updateLayout)
  //   }
  // }, [])

  // 初期化処理を共通化 - useRef経由で関数呼び出し
  const runInitialization = useCallback(async (aborted: { current: boolean }) => {
    try {
      setIsLoading(true)
      setErrorMsg('')
      
      // 並列でデータを読み込み - Ref経由で最新の関数を取得
      const results = await Promise.allSettled([
        loadSettingsRef.current(),
        loadPlaylistsRef.current(),
        spotifyRef.current.getUserPlaylists()
      ])
      
      if (aborted.current) return
      
      // 名前付き変数で結果を受け取り
      const [, , spotifyPlRes] = results
      
      // getUserPlaylists結果の処理（失敗を握りつぶさない）
      if (spotifyPlRes.status === 'fulfilled') {
        const playlists = Array.isArray(spotifyPlRes.value) ? spotifyPlRes.value : []
        if (Array.isArray(playlists)) {
          // 非同期で描画優先（固まりづらく）
          startTransition(() => setPlaylistsRef.current(playlists))
        }
      } else {
        // 失敗時も空配列をセットしてスピナーから脱出
        console.warn('getUserPlaylists failed:', spotifyPlRes.reason)
        startTransition(() => setPlaylistsRef.current([]))
        setErrorMsg('Spotifyのプレイリスト取得に失敗しました。権限（playlist-read-private）を有効化するか、アカウントを再認証してください。')
      }
      
      // 初期化完了ログ（プレイリスト数、選択状態）
      console.log('✅ [Dashboard Init] Complete:', {
        playlistCount: (spotifyPlRes.status === 'fulfilled' && Array.isArray(spotifyPlRes.value)) ? spotifyPlRes.value.length : 0,
        hasSelectedPlaylist: Boolean(selectedPlaylistId),
        errorOccurred: Boolean(errorMsg)
      })
      console.log('🎵 Dashboard initialization completed')
      
    } catch (error: any) {
      if (aborted.current) return
      console.error('Dashboard initialization failed:', error)
      setErrorMsg(
        error?.message ?? '初期化に失敗しました。ネットワークまたは認証状態を確認してください。'
      )
    } finally {
      // 必ず初期化完了とする（aborted状態でも、マウント中なら）
      if (!aborted.current) {
        // queueMicrotask で確実に state 更新
        queueMicrotask(() => {
          setIsLoading(false)
          setInitCompleted(true)
        })
      }
    }
  // 依存を最小化: selectedPlaylistId は ref 経由、errorMsg は除外
  // 関数参照の不安定さで初期化再実行が起きるため、useRefで固定し依存から外す
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaylistId])

  // 初期データ読み込み（StrictMode対応 + Rehydration Guard）
  useEffect(() => {
    // 初期描画時のストア値スナップショット（DEVのみ）
    if (import.meta.env.DEV) {
      console.log('📊 [Dashboard Init] Store snapshot:', {
        hasHydrated,
        spotifyConnected,
        hasAccessToken: Boolean(spotifyTokens?.accessToken),
        initialized: initializedRef.current
      })
    }
    debug('🔄 Dashboard init effect triggered:', { spotifyConnected, hasAccessToken, hasHydrated, initialized: initializedRef.current })
    
    if (!hasHydrated) {
      if (import.meta.env.DEV) {
        console.warn('[Init] early-return: hasHydrated=false')
      }
      return
    }
    // トークンがあれば初期化を許可（spotifyConnected はUI指標なので依存しない）
    if (!hasAccessToken) {
      if (import.meta.env.DEV) {
        console.warn('[Init] early-return: hasAccessToken=false')
      }
      return
    }
    if (initializedRef.current) {
      if (import.meta.env.DEV) {
        console.warn('[Init] early-return: already initialized')
      }
      return
    }
    initializedRef.current = true
    
    const myRunId = ++runIdRef.current
    let mounted = true
    
    const run = async () => {
      try {
        setIsLoading(true)
        setErrorMsg('')
        
        // 並列でデータを読み込み - Ref経由で最新の関数を取得
        const results = await Promise.allSettled([
          loadSettingsRef.current(),
          loadPlaylistsRef.current(),
          spotifyRef.current.getUserPlaylists()
        ])
        
        if (!mounted || myRunId !== runIdRef.current) return
        
        const playlistsRes = results[2]
        if (playlistsRes.status === 'fulfilled' && Array.isArray(playlistsRes.value)) {
          startTransition(() => {
            setPlaylistsRef.current(playlistsRes.value)
            // データ投入と同時にスピナー停止（描画優先）- データ到達ラッチに委譲可能
            if (import.meta.env.DEV) {
              console.log('📋 [Dashboard] Data set → letting data-latch handle completion')
            }
            setIsLoading(false)
            setInitCompleted(true)
          })
        } else {
          console.warn('getUserPlaylists failed:', (playlistsRes as any).reason)
          startTransition(() => setPlaylistsRef.current([]))
        }
        
        // 初期化完了ログ（プレイリスト数、選択状態）- DEVのみ
        if (import.meta.env.DEV) {
          console.log('✅ [Dashboard Init] Complete:', {
            playlistCount: (playlistsRes.status === 'fulfilled' && Array.isArray(playlistsRes.value)) ? playlistsRes.value.length : 0,
            hasSelectedPlaylist: Boolean(selectedPlaylistId),
            runId: myRunId
          })
          console.log('🎵 Dashboard initialization completed')
        }
        
      } catch (error: any) {
        if (!mounted || myRunId !== runIdRef.current) return
        console.error('Dashboard initialization failed:', error)
        setErrorMsg(
          error?.message ?? '初期化に失敗しました。ネットワークまたは認証状態を確認してください。'
        )
      } finally {
        if (mounted && myRunId === runIdRef.current) {
          setIsLoading(false)
          setInitCompleted(true)
          // マイクロタスクでもう一度確実に閉じる
          queueMicrotask(() => {
            if (mounted) { 
              setIsLoading(false)
              setInitCompleted(true) 
            }
          })
        }
      }
    }
    
    // 👉 デバッグ／安定性重視：直ちに実行（必要なら将来 Idle に戻す）
    run()
    
    // フェイルセーフ：3秒で強制的に完了扱い（ネット劣化時の固着を避ける）
    const safety = window.setTimeout(() => {
      console.warn('[Init] safety timeout fired → forcing completion')
      if (mounted) { 
        setIsLoading(false)
        setInitCompleted(true) 
      }
    }, 3000)

    return () => {
      mounted = false
      window.clearTimeout(safety)
      // 次の run が来たら myRunId は古くなる：finally では runId を比較して弾く
    }
  // 依存は "初回実行の可否" に関わるフラグに限定（トークンベース）
  // 関数参照の不安定さで初期化再実行が起きるため、useRefで固定し依存から外す
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [hasHydrated, hasAccessToken])

  
  // 接続状態変更時の制御
  useEffect(() => {
    if (spotifyConnected && hasAccessToken) {
      // デモモードが廃止されたため処理なし
    }
  }, [spotifyConnected, hasAccessToken])

  // 選択プレイリスト変更→曲を取得（重複呼び出し抑止・依存縮約）
  useEffect(() => {
    fetchCountRef.current++
    debug('🎵 Tracks fetch effect triggered:', { 
      count: fetchCountRef.current,
      spotifyConnected, 
      hasAccessToken, 
      selectedPlaylistId, 
      selectedTracksLen,
      inFlight: Object.keys(inflightTracks.current)
    })
    
    let cancelled = false
    
    const fetchTracks = async () => {
      if (!spotifyConnected || !hasAccessToken || !selectedPlaylistId) return
      if (selectedTracksLen > 0) return // キャッシュ済
      
      // すでに同じIDの取得が走っていたら再利用
      if (inflightTracks.current[selectedPlaylistId]) return
      
      try {
        setTracksLoading(true)
        inflightTracks.current[selectedPlaylistId] = spotify.getPlaylistTracks(selectedPlaylistId)
        const tracks = await inflightTracks.current[selectedPlaylistId]
        if (!cancelled) startTransition(() => setTracksFor(selectedPlaylistId, tracks))
      } catch (error: any) {
        if (!cancelled) setTracksError(error?.message ?? '曲の取得に失敗しました')
      } finally {
        delete inflightTracks.current[selectedPlaylistId]
        if (!cancelled) setTracksLoading(false)
      }
    }
    
    fetchTracks()
    return () => { cancelled = true }
  // 関数参照の不安定さで再実行防止のため、安定した関数のみ依存から外す
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyConnected, hasAccessToken, selectedPlaylistId, selectedTracksLen])
  // Note: spotify, setTracksFor, setTracksLoading, setTracksError are stable but excluded to avoid re-runs
  
  // 初回自動選択（まだなら先頭を選ぶ）
  useEffect(() => {
    if (!selectedPlaylistId && (spotifyPlaylists?.length ?? 0) > 0) {
      // store のAPI名に合わせて変更
      usePlaylistStore.getState().setSelectedPlaylist(spotifyPlaylists[0]?.id || null)
      console.log('[AutoSelect] selectedPlaylistId ->', spotifyPlaylists[0]?.id)
    }
  }, [selectedPlaylistId, spotifyPlaylists])

  // エフェクト表示条件の計算
  const effectsEnabled = useMemo(() => {
    const isMobile = window.innerWidth < 768 // 直接判定
    // matchMediaの安全ガード
    const prefersReducedMotion = 
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    return {
      waveform: showWaveform && !isMobile && !prefersReducedMotion,
      lyrics: showLyrics && !isMobile && !prefersReducedMotion
    }
  }, [showWaveform, showLyrics])

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力要素での誤爆を防止
      const tgt = e.target as HTMLElement | null
      if (tgt instanceof HTMLInputElement ||
          tgt instanceof HTMLTextAreaElement ||
          (tgt && tgt.isContentEditable)) return

      switch (e.key) {
        case 'Tab':
          // フォーカス順序の管理
          if (e.shiftKey) {
            // Shift+Tab: 逆順移動
          } else {
            // Tab: 順次移動（Header → Player → Carousel → Settings）
          }
          break
        case 'Escape':
          if (showSettings) {
            setShowSettings(false)
          }
          break
        case 's':
        case 'S':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setShowSettings(true)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showSettings])

  // 🧪 DEBUG専用保険機構：開発時のスピナー永続化を防ぐためのフェイルセーフ
  // VITE_DEBUG_INIT=true でのみ有効（本番では無効）
  const debugInitEnabled = import.meta.env.DEV && import.meta.env.VITE_DEBUG_INIT

  // 🚦 データ到達ラッチ：プレイリストが載ったら確実にスピナー終了（run/finallyが飛んでも閉じる）
  const hasAnyPlaylists = (spotifyPlaylists?.length ?? 0) > 0
  const hasAnyTracks = selectedTracksLen > 0

  useEffect(() => {
    if (hasHydrated && hasAccessToken && hasAnyPlaylists) {
      if (import.meta.env.DEV) {
        console.warn('[Init] data-latch: playlists detected → closing spinner')
      }
      setIsLoading(false)
      setInitCompleted(true)
    }
  // hasAnyPlaylists をキーに（トークンベース、spotifyConnected不要）
  // データ到達による確実なスピナー終了のため、依存は最小化
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, hasAccessToken, hasAnyPlaylists])

  // 🎯 さらに堅く：選択IDが入った時点でも閉じる（自動選択後の安全弁）
  useEffect(() => {
    if (hasHydrated && hasAccessToken && selectedPlaylistId && !initCompleted) {
      if (import.meta.env.DEV) {
        console.warn('[Init] selection-latch: selectedPlaylistId present → closing spinner')
      }
      setIsLoading(false)
      setInitCompleted(true)
    }
  // 選択ID到達による確実なスピナー終了のため、依存は最小化（トークンベース）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, hasAccessToken, selectedPlaylistId])

  // 🧪 DEV 緊急ブレーキ（必要なら残す。VITE_DEBUG_INIT=true のときのみ）
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_INIT && !initCompleted && hasHydrated && hasAccessToken) {
      console.warn('[Init] DEV latch → forcing completion now')
      setIsLoading(false)
      setInitCompleted(true)
    }
  }, [initCompleted, hasHydrated, hasAccessToken])

  // Skip link for screen readers
  const skipToContent = () => {
    const mainContent = document.getElementById('main-dashboard')
    if (mainContent) {
      mainContent.focus()
    }
  }

  // Wait for store rehydration before initialization
  if (!hasHydrated) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <div className="text-center space-y-4">
          <div 
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: theme.primaryColor }}
          />
          <p style={{ color: theme.textColor }} className="text-sm">
            Loading...
          </p>
        </div>
      </div>
    )
  }

  // デバッグ: いまの分岐値を出す（DEVのみ）
  if (import.meta.env.DEV) {
    console.log('[SpinnerCheck]', { initCompleted, isLoading, hasAnyPlaylists, selectedPlaylistId, selectedTracksLen })
  }

  const showSpinner = !initCompleted
  
  // 現場保険：トークン＋データがあるのに閉じない場合、即クローズ
  if (import.meta.env.DEV && showSpinner && hasAccessToken && (hasAnyPlaylists || selectedPlaylistId)) {
    console.warn('[Init] Emergency: token+data present but spinner still active → force close')
    queueMicrotask(() => { 
      setIsLoading(false)
      setInitCompleted(true) 
    })
  }
  
  // 🧪 DEBUG専用緊急スピナー停止（レンダー時最終保険）
  if (debugInitEnabled && showSpinner && hasHydrated && hasAccessToken) {
    console.warn('[Init] DEBUG emergency: flipping spinner off in-render queue')
    queueMicrotask(() => { 
      setInitCompleted(true)
      setIsLoading(false) 
    })
  }

  if (showSpinner) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <div className="text-center space-y-4">
          <div 
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: theme.primaryColor }}
          />
          <p style={{ color: theme.textColor }}>
            ダッシュボードを読み込み中...
          </p>
        </div>
      </div>
    )
  }

  // 空状態UI - プレイリストが見つからない場合
  if (initCompleted && !hasAnyPlaylists) {
    const handleRetry = async () => {
      setInitCompleted(false)
      const aborted = { current: false }
      await runInitialization(aborted)
    }

    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="text-8xl mb-4">🎵</div>
          <h2 style={{ color: theme.textColor }} className="text-2xl font-medium mb-2">
            プレイリストが見つかりません
          </h2>
          <p style={{ color: theme.textColor + 'CC' }} className="text-sm leading-relaxed mb-6">
            Spotifyでプレイリストを作成するか、<br />
            アクセス権限を確認してください
          </p>
          <button
            onClick={handleRetry}
            disabled={isLoading}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/30"
            style={{ 
              backgroundColor: theme.primaryColor, 
              color: 'white',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? '再取得中...' : '再試行'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden pt-16"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* Skip Navigation for Accessibility */}
      <a
        href="#main-dashboard"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
        onClick={skipToContent}
      >
        メインコンテンツへスキップ
      </a>

      {/* Background Effects Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Waveform Visualizer Background */}
        {effectsEnabled.waveform && (
          <WaveformVisualizer
            className="absolute bottom-0 left-0 right-0"
            height={200}
            opacity={0.3}
          />
        )}

        {/* Gradient Overlay for better contrast */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 100%, ${theme.primaryColor}10 0%, transparent 70%)`
          }}
        />
      </div>

      {/* Lyrics Overlay */}
      {effectsEnabled.lyrics && (
        <LyricsOverlay opacity={0.2} />
      )}

      {/* Main Dashboard Content */}
      <main 
        id="main-dashboard"
        className="relative z-20 container mx-auto px-4 py-8"
        tabIndex={-1}
        role="main"
        aria-label="音楽ダッシュボード"
      >
        {/* エラーバナー */}
        {errorMsg && (
          <div role="alert" className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm">
            <div className="flex">
              <div className="text-red-400">
                ⚠️ {errorMsg}
              </div>
            </div>
          </div>
        )}
        {/* Dashboard Header */}
        <header className="text-center mb-12">
          <h1 
            className="text-header-lg mb-4"
            style={{ color: theme.textColor }}
          >
            マイ ミュージック
          </h1>
          <p 
            className="text-body-md"
            style={{ color: theme.textColor + 'CC' }}
          >
            あなただけの音楽空間へようこそ
          </p>
        </header>

        {/* Single Playlist Carousel (center focus + auto slide) */}
        <section
          className="mb-16"
          role="region"
          aria-label="選択中プレイリスト"
        >
          {selectedPlaylistId ? (
            (() => {
              const rawTracks = tracksByPlaylist[selectedPlaylistId] ?? []
              if (import.meta.env.DEV && rawTracks.length > 0) {
                console.log('[CarouselSample]', rawTracks[0])
              }
              return (
                <CenteredAutoCarousel
                  className="animate-fade-in"
                  items={rawTracks.map((raw: any) => {
                const t = raw?.track ?? raw;                       // Spotify API: items[].track 配列に対応
                const albumObj = t?.album ?? raw?.album ?? null;   // album オブジェクト or null
                const imageFromAlbum =
                  albumObj?.images?.[0]?.url ??
                  albumObj?.images?.[1]?.url ??
                  albumObj?.images?.[2]?.url ??
                  null;
                const artistName =
                  t?.artists?.[0]?.name ??
                  raw?.artist ??
                  raw?.artistName ??
                  '';
                const albumName =
                  albumObj?.name ??
                  raw?.albumName ??
                  '';
                const title =
                  t?.name ??
                  raw?.name ??
                  '(no title)';
                const img =
                  imageFromAlbum ??
                  raw?.imageUrl ??
                  raw?.albumArtUrl ??
                  raw?.images?.[0]?.url ??
                  '';
                const id =
                  t?.id ??
                  raw?.id ??
                  `${title}-${artistName}-${albumName}`;
                return {
                  id,
                  name: String(title),
                  artist: String(artistName),
                  album: String(albumName),
                  imageUrl: String(img),
                }
              })}
              autoplayInterval={3500}
              step={1}
              pauseOnFocus={false}
              onSelect={(item) => {
                // ここに再生アクションなどを紐づけ（MiniPlayer再生など）
                console.log('[CarouselSelect]', item)
              }}
            />
              )
            })()
          ) : (
            <div className="text-center opacity-70" style={{ color: theme.textColor }}>
              プレイリストを選択してください
            </div>
          )}
        </section>

        {/* Dashboard Stats */}
        <section 
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          role="region"
          aria-label="音楽統計"
        >
          <StatCard
            icon="🎵"
            label="プレイリスト"
            value={(playlists?.length ?? 0).toString()}
            theme={theme}
          />
          <StatCard
            icon="🎶"
            label="楽曲総数"
            value={(playlists?.reduce((sum, pl) => sum + (pl?.trackCount ?? 0), 0) ?? 0).toString()}
            theme={theme}
          />
          <StatCard
            icon="⏱"
            label="総再生時間"
            value="12時間"
            theme={theme}
          />
          <StatCard
            icon="❤"
            label="お気に入り"
            value="42"
            theme={theme}
          />
        </section>

        {/* Quick Actions */}
        <section 
          className="flex flex-wrap justify-center gap-4"
          role="region"
          aria-label="クイック アクション"
        >
          <QuickActionButton
            icon={<Grid3X3 size={20} />}
            label="レイアウト"
            onClick={() => setShowSettings(true)}
            theme={theme}
          />
          <QuickActionButton
            icon={<Palette size={20} />}
            label="テーマ"
            onClick={() => setShowSettings(true)}
            theme={theme}
          />
          <QuickActionButton
            icon={<Volume2 size={20} />}
            label="エフェクト"
            onClick={() => setShowSettings(true)}
            theme={theme}
          />
        </section>
      </main>

      {/* Settings FAB */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-white/50 z-30"
        style={{ backgroundColor: theme.primaryColor }}
        title="設定を開く (Ctrl/Cmd + S)"
        aria-label="ダッシュボード設定を開く"
      >
        <Settings className="text-white w-6 h-6 mx-auto" />
      </button>

      {/* Settings Modal */}
      {showSettings && (
        <Suspense 
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="text-white">設定を読み込み中...</div>
            </div>
          }
        >
          <LazySettingsModal
            onClose={() => setShowSettings(false)}
          />
        </Suspense>
      )}

      {/* Debug Components */}
      <PlaylistDebugBar />
      <BuildStamp />

      {/* Spotify Playlists Section */}
      {spotifyConnected && (
        <div className="max-w-6xl mx-auto px-4 py-6">
          <SpotifyPlaylists />
        </div>
      )}

      {/* Accessibility Announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {effectsEnabled.waveform && '音声波形エフェクトが有効です。'}
        {effectsEnabled.lyrics && '歌詞アニメーションが有効です。'}
        {!effectsEnabled.waveform && !effectsEnabled.lyrics && 'エフェクトは無効になっています。'}
      </div>
    </div>
  )
}

// Statistics Card Component
interface StatCardProps {
  icon: string
  label: string
  value: string
  theme: any
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, theme }) => (
  <div 
    className="bg-white/5 backdrop-blur-sm rounded-lg p-4 text-center transition-all duration-300 hover:bg-white/10"
    role="region"
    aria-label={`${label}: ${value}`}
  >
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-body-sm mb-1" style={{ color: theme.textColor + 'CC' }}>
      {label}
    </div>
    <div className="text-header-sm" style={{ color: theme.textColor }}>
      {value}
    </div>
  </div>
)

// Quick Action Button Component
interface QuickActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  theme: any
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ 
  icon, 
  label, 
  onClick, 
  theme 
}) => (
  <button
    onClick={onClick}
    className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
    style={{ color: theme.textColor }}
    aria-label={`${label}設定を開く`}
  >
    {icon}
    <span className="text-body-sm">{label}</span>
  </button>
)

export default DashboardPage

