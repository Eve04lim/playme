// src/utils/playbackHistoryManager.ts
import type { Track } from '../types'

// 再生履歴エントリ
export interface PlaybackHistoryEntry {
  trackId: string
  trackData: Track
  playCount: number
  totalPlayTime: number // 総再生時間（ミリ秒）
  lastPlayedAt: Date
  firstPlayedAt: Date
  completionRate: number // 0-1: 最後に聞いた完了率
  lastPosition: number // 最後の再生位置（ミリ秒）
  averageSessionLength: number // 平均セッション長（ミリ秒）
  skipCount: number // スキップされた回数
  likedAt?: Date // いいねした日時
  mood?: 'happy' | 'sad' | 'energetic' | 'calm' | 'focused' // 再生時のムード
  context?: 'recommendation' | 'search' | 'playlist' | 'album' | 'artist' // 再生コンテキスト
  sessionData: PlaybackSession[] // セッション詳細データ
}

// 個別再生セッション
export interface PlaybackSession {
  sessionId: string
  startTime: Date
  endTime: Date
  startPosition: number // 開始位置（ミリ秒）
  endPosition: number // 終了位置（ミリ秒）
  playedDuration: number // 実際の再生時間（ミリ秒）
  completionRate: number // このセッションの完了率
  wasSkipped: boolean
  context?: string
  deviceType?: 'desktop' | 'mobile' | 'tablet'
  quality?: 'low' | 'medium' | 'high'
}

// クリア基準定義
export interface ClearCriteria {
  minimumCompletionRate: number // 最低完了率（デフォルト: 0.8）
  minimumPlayCount: number // 最低再生回数（デフォルト: 3）
  consecutivePlayCount: number // 連続再生回数
  perfectPlayCount: number // 100%完了再生回数
}

// ランキング基準
export interface RankingCriteria {
  gold: ClearCriteria
  silver: ClearCriteria
  bronze: ClearCriteria
  cleared: ClearCriteria
}

// 統計データ
export interface PlaybackStats {
  totalTracks: number
  totalPlayTime: number
  averagePlayTime: number
  totalSessions: number
  completionRateAverage: number
  topGenres: { genre: string; count: number; percentage: number }[]
  topArtists: { artist: string; count: number; percentage: number }[]
  playTimeDistribution: { hour: number; minutes: number }[] // 24時間分布
  streakData: {
    currentStreak: number
    longestStreak: number
    streakStartDate?: Date
  }
  achievements: Achievement[]
}

// 実績システム
export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt?: Date
  progress: number // 0-1
  maxProgress: number
  category: 'playback' | 'discovery' | 'streak' | 'completion' | 'social'
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

export class PlaybackHistoryManager {
  private historyMap: Map<string, PlaybackHistoryEntry> = new Map()
  private storageKey = 'music_playback_history'
  private maxHistorySize = 1000 // 最大履歴数
  private autoSaveInterval: number | null = null

  // デフォルトのクリア基準
  private defaultRankingCriteria: RankingCriteria = {
    gold: {
      minimumCompletionRate: 0.95,
      minimumPlayCount: 10,
      consecutivePlayCount: 5,
      perfectPlayCount: 3
    },
    silver: {
      minimumCompletionRate: 0.85,
      minimumPlayCount: 7,
      consecutivePlayCount: 3,
      perfectPlayCount: 2
    },
    bronze: {
      minimumCompletionRate: 0.75,
      minimumPlayCount: 5,
      consecutivePlayCount: 2,
      perfectPlayCount: 1
    },
    cleared: {
      minimumCompletionRate: 0.6,
      minimumPlayCount: 3,
      consecutivePlayCount: 1,
      perfectPlayCount: 0
    }
  }

  constructor() {
    this.loadFromStorage()
    this.startAutoSave()
  }

  // ストレージから履歴を読み込み
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        
        // 日付オブジェクトを復元
        Object.entries(data).forEach(([trackId, entry]: [string, unknown]) => {
          const entryData = entry as Omit<PlaybackHistoryEntry, 'lastPlayedAt' | 'firstPlayedAt' | 'sessionData'> & {
            lastPlayedAt: string
            firstPlayedAt: string
            sessionData: unknown[]
          }
          const restoredEntry: PlaybackHistoryEntry = {
            ...entryData,
            lastPlayedAt: new Date(entryData.lastPlayedAt),
            firstPlayedAt: new Date(entryData.firstPlayedAt),
            likedAt: entry.likedAt ? new Date(entry.likedAt) : undefined,
            sessionData: entryData.sessionData.map((session: unknown) => {
              const sessionData = session as Omit<PlaybackSession, 'startTime' | 'endTime'> & {
                startTime: string
                endTime: string
              }
              return {
                ...sessionData,
                startTime: new Date(sessionData.startTime),
                endTime: new Date(sessionData.endTime)
              }
            })
          }
          this.historyMap.set(trackId, restoredEntry)
        })
        
        console.log(`Loaded ${this.historyMap.size} tracks from playback history`)
      }
    } catch (error) {
      console.error('Failed to load playback history:', error)
    }
  }

  // ストレージに履歴を保存
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.historyMap)
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save playback history:', error)
      
      // ストレージ容量不足の場合、古いエントリを削除
      if (error instanceof DOMException && error.code === 22) {
        this.cleanupOldEntries(100) // 100件削除
        try {
          const data = Object.fromEntries(this.historyMap)
          localStorage.setItem(this.storageKey, JSON.stringify(data))
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError)
        }
      }
    }
  }

  // 自動保存の開始
  private startAutoSave(): void {
    this.autoSaveInterval = window.setInterval(() => {
      this.saveToStorage()
    }, 30000) // 30秒ごとに保存
  }

  // 古いエントリのクリーンアップ
  private cleanupOldEntries(removeCount: number): void {
    const entries = Array.from(this.historyMap.entries())
    entries.sort(([,a], [,b]) => a.lastPlayedAt.getTime() - b.lastPlayedAt.getTime())
    
    for (let i = 0; i < Math.min(removeCount, entries.length); i++) {
      this.historyMap.delete(entries[i][0])
    }
  }

  // 再生開始の記録
  startPlayback(track: Track, context?: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()

    let entry = this.historyMap.get(track.id)
    
    if (!entry) {
      // 新しいトラックの場合
      entry = {
        trackId: track.id,
        trackData: track,
        playCount: 0,
        totalPlayTime: 0,
        lastPlayedAt: now,
        firstPlayedAt: now,
        completionRate: 0,
        lastPosition: 0,
        averageSessionLength: 0,
        skipCount: 0,
        context,
        sessionData: []
      }
    }

    // 新しいセッションを開始
    const newSession: PlaybackSession = {
      sessionId,
      startTime: now,
      endTime: now,
      startPosition: entry.lastPosition,
      endPosition: entry.lastPosition,
      playedDuration: 0,
      completionRate: 0,
      wasSkipped: false,
      context,
      deviceType: this.detectDeviceType(),
      quality: 'medium'
    }

    entry.sessionData.push(newSession)
    entry.lastPlayedAt = now
    this.historyMap.set(track.id, entry)

    return sessionId
  }

  // 再生進行の更新
  updatePlaybackProgress(trackId: string, sessionId: string, currentPosition: number): void {
    const entry = this.historyMap.get(trackId)
    if (!entry) return

    const session = entry.sessionData.find(s => s.sessionId === sessionId)
    if (!session) return

    const now = new Date()
    session.endTime = now
    session.endPosition = currentPosition
    session.playedDuration = now.getTime() - session.startTime.getTime()
    session.completionRate = Math.min(1, currentPosition / entry.trackData.duration)

    // エントリの更新
    entry.lastPosition = currentPosition
    entry.completionRate = session.completionRate
    entry.lastPlayedAt = now

    this.historyMap.set(trackId, entry)
  }

  // 再生終了の記録
  endPlayback(trackId: string, sessionId: string, finalPosition: number, wasSkipped: boolean = false): void {
    const entry = this.historyMap.get(trackId)
    if (!entry) return

    const session = entry.sessionData.find(s => s.sessionId === sessionId)
    if (!session) return

    const now = new Date()
    
    // セッションの完了
    session.endTime = now
    session.endPosition = finalPosition
    session.completionRate = Math.min(1, finalPosition / entry.trackData.duration)
    session.wasSkipped = wasSkipped
    session.playedDuration = now.getTime() - session.startTime.getTime()

    // エントリ統計の更新
    entry.playCount++
    entry.totalPlayTime += session.playedDuration
    entry.lastPosition = session.completionRate >= 0.95 ? 0 : finalPosition // 95%以上なら最初から
    entry.completionRate = session.completionRate
    entry.lastPlayedAt = now
    
    if (wasSkipped) {
      entry.skipCount++
    }

    // 平均セッション長の計算
    const validSessions = entry.sessionData.filter(s => !s.wasSkipped && s.playedDuration > 10000) // 10秒以上
    entry.averageSessionLength = validSessions.length > 0
      ? validSessions.reduce((sum, s) => sum + s.playedDuration, 0) / validSessions.length
      : 0

    this.historyMap.set(trackId, entry)
    this.saveToStorage() // 即座に保存
  }

  // いいね記録
  recordLike(trackId: string): void {
    const entry = this.historyMap.get(trackId)
    if (entry) {
      entry.likedAt = new Date()
      this.historyMap.set(trackId, entry)
    }
  }

  // いいね削除
  removeLike(trackId: string): void {
    const entry = this.historyMap.get(trackId)
    if (entry) {
      delete entry.likedAt
      this.historyMap.set(trackId, entry)
    }
  }

  // 履歴取得（ソート・フィルター対応）
  getHistory(options: {
    sortBy?: 'lastPlayed' | 'playCount' | 'totalTime' | 'completionRate' | 'firstPlayed'
    sortOrder?: 'desc' | 'asc'
    limit?: number
    offset?: number
    filter?: {
      liked?: boolean
      completionRateMin?: number
      playCountMin?: number
      dateRange?: { start: Date; end: Date }
      genres?: string[]
      artists?: string[]
    }
  } = {}): PlaybackHistoryEntry[] {
    const {
      sortBy = 'lastPlayed',
      sortOrder = 'desc',
      limit,
      offset = 0,
      filter
    } = options

    let entries = Array.from(this.historyMap.values())

    // フィルター適用
    if (filter) {
      entries = entries.filter(entry => {
        // いいねフィルター
        if (filter.liked !== undefined) {
          const isLiked = !!entry.likedAt
          if (filter.liked !== isLiked) return false
        }

        // 完了率フィルター
        if (filter.completionRateMin !== undefined && 
            entry.completionRate < filter.completionRateMin) {
          return false
        }

        // 再生回数フィルター
        if (filter.playCountMin !== undefined && 
            entry.playCount < filter.playCountMin) {
          return false
        }

        // 日付範囲フィルター
        if (filter.dateRange) {
          const { start, end } = filter.dateRange
          if (entry.lastPlayedAt < start || entry.lastPlayedAt > end) {
            return false
          }
        }

        // ジャンルフィルター
        if (filter.genres && filter.genres.length > 0) {
          const trackGenres = (entry.trackData as { genre?: string[] }).genre ?? []
          if (!filter.genres.some(g => trackGenres.includes(g))) {
            return false
          }
        }

        // アーティストフィルター
        if (filter.artists && filter.artists.length > 0) {
          if (!filter.artists.includes(entry.trackData.artist)) {
            return false
          }
        }

        return true
      })
    }

    // ソート
    entries.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'lastPlayed':
          comparison = a.lastPlayedAt.getTime() - b.lastPlayedAt.getTime()
          break
        case 'playCount':
          comparison = a.playCount - b.playCount
          break
        case 'totalTime':
          comparison = a.totalPlayTime - b.totalPlayTime
          break
        case 'completionRate':
          comparison = a.completionRate - b.completionRate
          break
        case 'firstPlayed':
          comparison = a.firstPlayedAt.getTime() - b.firstPlayedAt.getTime()
          break
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })

    // ページネーション
    if (limit) {
      return entries.slice(offset, offset + limit)
    }

    return entries.slice(offset)
  }

  // 統計データの取得
  getStats(): PlaybackStats {
    const entries = Array.from(this.historyMap.values())
    
    if (entries.length === 0) {
      return {
        totalTracks: 0,
        totalPlayTime: 0,
        averagePlayTime: 0,
        totalSessions: 0,
        completionRateAverage: 0,
        topGenres: [],
        topArtists: [],
        playTimeDistribution: Array.from({ length: 24 }, (_, hour) => ({ hour, minutes: 0 })),
        streakData: { currentStreak: 0, longestStreak: 0 },
        achievements: this.getAchievements(entries)
      }
    }

    const totalPlayTime = entries.reduce((sum, entry) => sum + entry.totalPlayTime, 0)
    const totalSessions = entries.reduce((sum, entry) => sum + entry.sessionData.length, 0)
    const avgCompletionRate = entries.reduce((sum, entry) => sum + entry.completionRate, 0) / entries.length

    // ジャンル集計
    const genreCount = new Map<string, number>()
    entries.forEach(entry => {
      const genres = (entry.trackData as { genre?: string[] }).genre ?? [entry.trackData.album ?? 'Unknown']
      genres.forEach((genre: string) => {
        genreCount.set(genre, (genreCount.get(genre) || 0) + entry.playCount)
      })
    })

    const topGenres = Array.from(genreCount.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: (count / entries.length) * 100
      }))

    // アーティスト集計
    const artistCount = new Map<string, number>()
    entries.forEach(entry => {
      artistCount.set(entry.trackData.artist, (artistCount.get(entry.trackData.artist) || 0) + entry.playCount)
    })

    const topArtists = Array.from(artistCount.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([artist, count]) => ({
        artist,
        count,
        percentage: (count / entries.length) * 100
      }))

    // 時間分布
    const playTimeDistribution = Array.from({ length: 24 }, (_, hour) => ({ hour, minutes: 0 }))
    entries.forEach(entry => {
      entry.sessionData.forEach(session => {
        const hour = session.startTime.getHours()
        playTimeDistribution[hour].minutes += session.playedDuration / (1000 * 60)
      })
    })

    return {
      totalTracks: entries.length,
      totalPlayTime,
      averagePlayTime: totalPlayTime / entries.length,
      totalSessions,
      completionRateAverage: avgCompletionRate,
      topGenres,
      topArtists,
      playTimeDistribution,
      streakData: this.calculateStreakData(entries),
      achievements: this.getAchievements(entries)
    }
  }

  // クリアランキングの取得
  getClearRanking(criteria: RankingCriteria = this.defaultRankingCriteria): {
    gold: PlaybackHistoryEntry[]
    silver: PlaybackHistoryEntry[]
    bronze: PlaybackHistoryEntry[]
    cleared: PlaybackHistoryEntry[]
    uncleared: PlaybackHistoryEntry[]
  } {
    const entries = Array.from(this.historyMap.values())
    
    const gold: PlaybackHistoryEntry[] = []
    const silver: PlaybackHistoryEntry[] = []
    const bronze: PlaybackHistoryEntry[] = []
    const cleared: PlaybackHistoryEntry[] = []
    const uncleared: PlaybackHistoryEntry[] = []

    entries.forEach(entry => {
      const perfectPlays = entry.sessionData.filter(s => s.completionRate >= 0.95).length
      const consecutivePlays = this.getConsecutivePlayCount(entry)
      
      if (this.meetsCriteria(entry, perfectPlays, consecutivePlays, criteria.gold)) {
        gold.push(entry)
      } else if (this.meetsCriteria(entry, perfectPlays, consecutivePlays, criteria.silver)) {
        silver.push(entry)
      } else if (this.meetsCriteria(entry, perfectPlays, consecutivePlays, criteria.bronze)) {
        bronze.push(entry)
      } else if (this.meetsCriteria(entry, perfectPlays, consecutivePlays, criteria.cleared)) {
        cleared.push(entry)
      } else {
        uncleared.push(entry)
      }
    })

    // 各カテゴリを人気度でソート
    const sortByPopularity = (a: PlaybackHistoryEntry, b: PlaybackHistoryEntry) => 
      b.playCount - a.playCount

    return {
      gold: gold.sort(sortByPopularity),
      silver: silver.sort(sortByPopularity),
      bronze: bronze.sort(sortByPopularity),
      cleared: cleared.sort(sortByPopularity),
      uncleared: uncleared.sort(sortByPopularity)
    }
  }

  // クリア基準の判定
  private meetsCriteria(entry: PlaybackHistoryEntry, perfectPlays: number, consecutivePlays: number, criteria: ClearCriteria): boolean {
    return entry.completionRate >= criteria.minimumCompletionRate &&
           entry.playCount >= criteria.minimumPlayCount &&
           consecutivePlays >= criteria.consecutivePlayCount &&
           perfectPlays >= criteria.perfectPlayCount
  }

  // 連続再生回数の計算
  private getConsecutivePlayCount(entry: PlaybackHistoryEntry): number {
    const sessions = entry.sessionData.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    let consecutive = 0
    
    for (const session of sessions) {
      if (session.completionRate >= 0.8 && !session.wasSkipped) {
        consecutive++
      } else {
        break
      }
    }
    
    return consecutive
  }

  // デバイスタイプの検出
  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (/tablet|ipad|playbook|silk/.test(userAgent)) {
      return 'tablet'
    }
    
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
      return 'mobile'
    }
    
    return 'desktop'
  }

  // 連続再生日数の計算
  private calculateStreakData(entries: PlaybackHistoryEntry[]): PlaybackStats['streakData'] {
    if (entries.length === 0) {
      return { currentStreak: 0, longestStreak: 0 }
    }

    const playDates = entries
      .flatMap(entry => entry.sessionData.map(session => session.startTime))
      .map(date => date.toDateString())
      .filter((date, index, array) => array.indexOf(date) === index)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let streakStartDate: Date | undefined

    const checkDate = new Date()
    
    // 現在の連続日数を計算
    for (let i = 0; i < 30; i++) { // 30日まで遡って確認
      const dateStr = checkDate.toDateString()
      
      if (playDates.includes(dateStr)) {
        if (currentStreak === 0) {
          streakStartDate = new Date(checkDate)
        }
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    // 過去の最長連続日数を計算
    let tempCurrentDate = playDates[0] ? new Date(playDates[0]) : new Date()
    
    playDates.forEach(dateStr => {
      const playDate = new Date(dateStr)
      const dayDiff = Math.floor((tempCurrentDate.getTime() - playDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (dayDiff <= 1) {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 1
      }
      
      tempCurrentDate = playDate
    })

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      streakStartDate
    }
  }

  // 実績システム
  private getAchievements(entries: PlaybackHistoryEntry[]): Achievement[] {
    const achievements: Achievement[] = []
    const totalPlayCount = entries.reduce((sum, entry) => sum + entry.playCount, 0)
    const totalPlayTime = entries.reduce((sum, entry) => sum + entry.totalPlayTime, 0)
    const likedTracks = entries.filter(entry => entry.likedAt).length
    const perfectCompletions = entries.reduce((sum, entry) => 
      sum + entry.sessionData.filter(s => s.completionRate >= 0.95).length, 0)

    // 再生回数実績
    const playCountAchievements = [
      { count: 10, title: '音楽初心者', rarity: 'common' as const },
      { count: 100, title: '音楽愛好家', rarity: 'uncommon' as const },
      { count: 500, title: '音楽マニア', rarity: 'rare' as const },
      { count: 1000, title: '音楽の虫', rarity: 'epic' as const }
    ]

    playCountAchievements.forEach(({ count, title, rarity }) => {
      achievements.push({
        id: `play_count_${count}`,
        title,
        description: `${count}回以上楽曲を再生`,
        icon: '🎵',
        unlockedAt: totalPlayCount >= count ? new Date() : undefined,
        progress: Math.min(1, totalPlayCount / count),
        maxProgress: count,
        category: 'playback',
        rarity
      })
    })

    return achievements
  }

  // 続きから再生の取得
  getResumePosition(trackId: string): number {
    const entry = this.historyMap.get(trackId)
    return entry?.lastPosition || 0
  }

  // 履歴のクリア
  clearHistory(): void {
    this.historyMap.clear()
    localStorage.removeItem(this.storageKey)
  }

  // 特定トラックの削除
  removeTrack(trackId: string): void {
    this.historyMap.delete(trackId)
    this.saveToStorage()
  }

  // デストラクタ
  destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
    }
    this.saveToStorage()
  }
}