// src/utils/recommendationEngine.ts
import type { Track } from '../types'

// 拡張されたTrack型（音楽分析データを含む）
export interface EnhancedTrack extends Track {
  genre: string[]
  mood: string[]
  bpm?: number
  key?: string
  energy: number // 0-1
  danceability: number // 0-1
  valence: number // 0-1 (positivity)
  releaseDate: string
  popularity: number // 0-100
  acousticness?: number // 0-1
  instrumentalness?: number // 0-1
  liveness?: number // 0-1
  speechiness?: number // 0-1
}

// ユーザーインタラクション
export interface UserInteraction {
  trackId: string
  action: 'play' | 'like' | 'skip' | 'add_to_playlist' | 'share'
  timestamp: Date
  context?: string
  playDuration?: number // 再生時間（秒）
  completionRate?: number // 再生完了率（0-1）
}

// ユーザープロファイル
export interface UserProfile {
  preferredGenres: { genre: string; weight: number }[]
  preferredMoods: { mood: string; weight: number }[]
  audioFeatures: {
    energy: number
    danceability: number
    valence: number
    acousticness: number
    instrumentalness: number
  }
  listeningPatterns: {
    hourlyDistribution: number[] // 24時間分
    weeklyDistribution: number[] // 7日分
    sessionLength: number
  }
  diversityScore: number // 0-1: 多様性を好む度合い
  discoveryScore: number // 0-1: 新しい音楽を探す度合い
  lastUpdated: Date
}

// 楽曲間の類似度計算
export class MusicSimilarityCalculator {
  // オーディオ特徴量の重み設定
  private static readonly FEATURE_WEIGHTS = {
    energy: 0.25,
    danceability: 0.20,
    valence: 0.20,
    acousticness: 0.10,
    instrumentalness: 0.05,
    popularity: 0.10,
    tempo: 0.05,
    key: 0.05
  }

  // ジャンル類似度の計算
  static calculateGenreSimilarity(genres1: string[], genres2: string[]): number {
    if (genres1.length === 0 || genres2.length === 0) return 0

    const intersection = genres1.filter(g => genres2.includes(g)).length
    const union = [...new Set([...genres1, ...genres2])].length
    
    return intersection / union // Jaccard係数
  }

  // オーディオ特徴量の類似度計算（ユークリッド距離）
  static calculateAudioFeatureSimilarity(track1: EnhancedTrack, track2: EnhancedTrack): number {
    const features = ['energy', 'danceability', 'valence', 'acousticness', 'instrumentalness'] as const
    
    let distance = 0
    let totalWeight = 0

    features.forEach(feature => {
      if (track1[feature] !== undefined && track2[feature] !== undefined) {
        const diff = track1[feature]! - track2[feature]!
        const weight = this.FEATURE_WEIGHTS[feature]
        distance += Math.pow(diff, 2) * weight
        totalWeight += weight
      }
    })

    // BPMの類似度（正規化）
    if (track1.bpm && track2.bpm) {
      const bpmDiff = Math.abs(track1.bpm - track2.bpm) / 200 // 200 BPMで正規化
      distance += Math.pow(bpmDiff, 2) * this.FEATURE_WEIGHTS.tempo
      totalWeight += this.FEATURE_WEIGHTS.tempo
    }

    // 人気度の類似度
    const popularityDiff = Math.abs(track1.popularity - track2.popularity) / 100
    distance += Math.pow(popularityDiff, 2) * this.FEATURE_WEIGHTS.popularity
    totalWeight += this.FEATURE_WEIGHTS.popularity

    if (totalWeight === 0) return 0

    // 0-1の範囲に正規化（1 = 最も類似）
    return Math.max(0, 1 - Math.sqrt(distance / totalWeight))
  }

  // 総合類似度の計算
  static calculateOverallSimilarity(track1: EnhancedTrack, track2: EnhancedTrack): number {
    const genreSimilarity = this.calculateGenreSimilarity(track1.genre, track2.genre)
    const audioSimilarity = this.calculateAudioFeatureSimilarity(track1, track2)
    
    // ムード類似度
    const moodSimilarity = this.calculateGenreSimilarity(track1.mood, track2.mood)
    
    // 重み付け平均
    return (genreSimilarity * 0.4) + (audioSimilarity * 0.4) + (moodSimilarity * 0.2)
  }
}

// 推薦エンジン
export class RecommendationEngine {
  private userProfile: UserProfile | null = null
  private tracks: EnhancedTrack[] = []
  private interactions: UserInteraction[] = []

  constructor(tracks: EnhancedTrack[]) {
    this.tracks = tracks
  }

  // ユーザーインタラクションの追加
  addInteractions(interactions: UserInteraction[]) {
    this.interactions = [...this.interactions, ...interactions]
    this.updateUserProfile()
  }

  // ユーザープロファイルの更新
  private updateUserProfile() {
    if (this.interactions.length === 0) return

    const recentInteractions = this.interactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 200) // 最新200件を分析

    // 好まれるジャンルの分析
    const genreCount = new Map<string, number>()
    const moodCount = new Map<string, number>()
    const audioFeatures = {
      energy: 0, danceability: 0, valence: 0, 
      acousticness: 0, instrumentalness: 0
    }
    let featureCount = 0

    recentInteractions.forEach(interaction => {
      const track = this.tracks.find(t => t.id === interaction.trackId)
      if (!track) return

      // ポジティブなインタラクションに重み付け
      const weight = this.getInteractionWeight(interaction)

      // ジャンル分析
      track.genre.forEach(genre => {
        genreCount.set(genre, (genreCount.get(genre) || 0) + weight)
      })

      // ムード分析
      track.mood.forEach(mood => {
        moodCount.set(mood, (moodCount.get(mood) || 0) + weight)
      })

      // オーディオ特徴量の平均計算
      audioFeatures.energy += track.energy * weight
      audioFeatures.danceability += track.danceability * weight
      audioFeatures.valence += track.valence * weight
      audioFeatures.acousticness += (track.acousticness || 0.5) * weight
      audioFeatures.instrumentalness += (track.instrumentalness || 0.1) * weight
      featureCount += weight
    })

    // プロファイル作成
    this.userProfile = {
      preferredGenres: Array.from(genreCount.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([genre, count]) => ({ genre, weight: count / recentInteractions.length })),
      
      preferredMoods: Array.from(moodCount.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([mood, count]) => ({ mood, weight: count / recentInteractions.length })),
      
      audioFeatures: {
        energy: audioFeatures.energy / featureCount,
        danceability: audioFeatures.danceability / featureCount,
        valence: audioFeatures.valence / featureCount,
        acousticness: audioFeatures.acousticness / featureCount,
        instrumentalness: audioFeatures.instrumentalness / featureCount
      },
      
      listeningPatterns: this.analyzeListeningPatterns(recentInteractions),
      diversityScore: this.calculateDiversityScore(recentInteractions),
      discoveryScore: this.calculateDiscoveryScore(recentInteractions),
      lastUpdated: new Date()
    }
  }

  // インタラクションの重み付け
  private getInteractionWeight(interaction: UserInteraction): number {
    const baseWeights = {
      'like': 1.0,
      'play': 0.5,
      'add_to_playlist': 1.2,
      'share': 1.5,
      'skip': -0.3
    }

    let weight = baseWeights[interaction.action] || 0

    // 完了率による調整（再生の場合）
    if (interaction.action === 'play' && interaction.completionRate !== undefined) {
      weight *= Math.max(0.1, interaction.completionRate)
    }

    // 時間減衰（新しいインタラクションほど重要）
    const daysSinceInteraction = (Date.now() - interaction.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    const timeDecay = Math.exp(-daysSinceInteraction / 30) // 30日で半減
    
    return weight * timeDecay
  }

  // 視聴パターンの分析
  private analyzeListeningPatterns(interactions: UserInteraction[]): UserProfile['listeningPatterns'] {
    const hourlyDistribution = new Array(24).fill(0)
    const weeklyDistribution = new Array(7).fill(0)
    let totalSessionTime = 0
    let sessionCount = 0

    interactions.forEach(interaction => {
      const hour = interaction.timestamp.getHours()
      const day = interaction.timestamp.getDay()
      
      hourlyDistribution[hour]++
      weeklyDistribution[day]++
      
      if (interaction.playDuration) {
        totalSessionTime += interaction.playDuration
        sessionCount++
      }
    })

    // 正規化
    const totalInteractions = interactions.length
    const normalizedHourly = hourlyDistribution.map(count => count / totalInteractions)
    const normalizedWeekly = weeklyDistribution.map(count => count / totalInteractions)

    return {
      hourlyDistribution: normalizedHourly,
      weeklyDistribution: normalizedWeekly,
      sessionLength: sessionCount > 0 ? totalSessionTime / sessionCount : 180 // デフォルト3分
    }
  }

  // 多様性スコアの計算
  private calculateDiversityScore(interactions: UserInteraction[]): number {
    const playedTracks = interactions
      .filter(i => i.action === 'play')
      .map(i => this.tracks.find(t => t.id === i.trackId))
      .filter(t => t !== undefined) as EnhancedTrack[]

    if (playedTracks.length === 0) return 0.5 // デフォルト値

    const uniqueGenres = new Set(playedTracks.flatMap(t => t.genre))
    const uniqueArtists = new Set(playedTracks.map(t => t.artist))
    
    // ジャンルとアーティストの多様性を組み合わせ
    const genreDiversity = Math.min(1, uniqueGenres.size / 10)
    const artistDiversity = Math.min(1, uniqueArtists.size / Math.max(1, playedTracks.length / 5))
    
    return (genreDiversity + artistDiversity) / 2
  }

  // 発見スコアの計算
  private calculateDiscoveryScore(interactions: UserInteraction[]): number {
    const recentPlays = interactions
      .filter(i => i.action === 'play')
      .slice(0, 50) // 最近50曲

    if (recentPlays.length === 0) return 0.5

    // 人気度が低い楽曲をどれだけ聞いているか
    const tracks = recentPlays
      .map(i => this.tracks.find(t => t.id === i.trackId))
      .filter(t => t !== undefined) as EnhancedTrack[]

    const averagePopularity = tracks.reduce((sum, t) => sum + t.popularity, 0) / tracks.length
    
    // 人気度が低いほど発見スコアが高い
    return Math.max(0, Math.min(1, (100 - averagePopularity) / 100))
  }

  // コンテンツベース推薦
  getContentBasedRecommendations(seedTrack: EnhancedTrack, limit: number = 10): EnhancedTrack[] {
    return this.tracks
      .filter(track => track.id !== seedTrack.id)
      .map(track => ({
        track,
        similarity: MusicSimilarityCalculator.calculateOverallSimilarity(seedTrack, track)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.track)
  }

  // 協調フィルタリング推薦（簡易実装）
  getCollaborativeRecommendations(limit: number = 10): EnhancedTrack[] {
    if (!this.userProfile) return []

    const scores = this.tracks.map(track => {
      let score = 0

      // ジャンル適合度
      this.userProfile!.preferredGenres.forEach(({ genre, weight }) => {
        if (track.genre.includes(genre)) {
          score += weight * 2
        }
      })

      // ムード適合度  
      this.userProfile!.preferredMoods.forEach(({ mood, weight }) => {
        if (track.mood.includes(mood)) {
          score += weight * 1.5
        }
      })

      // オーディオ特徴量適合度
      const features = this.userProfile!.audioFeatures
      score += 1 - Math.abs(track.energy - features.energy)
      score += 1 - Math.abs(track.danceability - features.danceability)
      score += 1 - Math.abs(track.valence - features.valence)

      // 多様性ボーナス
      if (this.userProfile!.diversityScore > 0.7) {
        const isUnfamiliarGenre = !this.userProfile!.preferredGenres
          .slice(0, 3)
          .some(pg => track.genre.includes(pg.genre))
        if (isUnfamiliarGenre) score += 0.5
      }

      // 発見ボーナス
      if (this.userProfile!.discoveryScore > 0.7) {
        score += (100 - track.popularity) / 100
      }

      return { track, score }
    })

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.track)
  }

  // ハイブリッド推薦
  getHybridRecommendations(params: {
    limit?: number
    contentWeight?: number
    collaborativeWeight?: number
    popularityWeight?: number
    diversityWeight?: number
  } = {}): EnhancedTrack[] {
    const {
      limit = 20,
      contentWeight = 0.4,
      collaborativeWeight = 0.4,
      popularityWeight = 0.1,
      diversityWeight = 0.1
    } = params

    if (!this.userProfile) {
      // プロファイルがない場合は人気楽曲を返す
      return this.tracks
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit)
    }

    const trackScores = new Map<string, number>()

    // コンテンツベーススコア
    const likedTracks = this.interactions
      .filter(i => i.action === 'like' || (i.action === 'play' && (i.completionRate || 0) > 0.7))
      .map(i => this.tracks.find(t => t.id === i.trackId))
      .filter(t => t !== undefined) as EnhancedTrack[]

    if (likedTracks.length > 0) {
      const seedTrack = likedTracks[Math.floor(Math.random() * likedTracks.length)]
      const contentRecs = this.getContentBasedRecommendations(seedTrack, limit * 2)
      
      contentRecs.forEach((track, index) => {
        const score = (contentRecs.length - index) / contentRecs.length
        trackScores.set(track.id, (trackScores.get(track.id) || 0) + score * contentWeight)
      })
    }

    // 協調フィルタリングスコア
    const collaborativeRecs = this.getCollaborativeRecommendations(limit * 2)
    collaborativeRecs.forEach((track, index) => {
      const score = (collaborativeRecs.length - index) / collaborativeRecs.length
      trackScores.set(track.id, (trackScores.get(track.id) || 0) + score * collaborativeWeight)
    })

    // 人気度スコア
    const maxPopularity = Math.max(...this.tracks.map(t => t.popularity))
    this.tracks.forEach(track => {
      const score = track.popularity / maxPopularity
      trackScores.set(track.id, (trackScores.get(track.id) || 0) + score * popularityWeight)
    })

    // 多様性スコア
    if (diversityWeight > 0) {
      const playedGenres = new Set(
        this.interactions
          .map(i => this.tracks.find(t => t.id === i.trackId))
          .filter(t => t !== undefined)
          .flatMap(t => (t as EnhancedTrack).genre)
      )

      this.tracks.forEach(track => {
        const hasUnexploredGenre = track.genre.some(g => !playedGenres.has(g))
        if (hasUnexploredGenre) {
          trackScores.set(track.id, (trackScores.get(track.id) || 0) + diversityWeight)
        }
      })
    }

    // 既に聞いた楽曲を除外
    const playedTrackIds = new Set(this.interactions.map(i => i.trackId))

    return Array.from(trackScores.entries())
      .filter(([trackId]) => !playedTrackIds.has(trackId))
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([trackId]) => this.tracks.find(t => t.id === trackId)!)
      .filter(track => track !== undefined)
  }

  // 時間帯別推薦
  getTimeBasedRecommendations(hour: number, limit: number = 10): EnhancedTrack[] {
    let energyPreference = 0.5
    let moodPreferences: string[] = []

    // 時間帯による調整
    if (hour >= 6 && hour < 12) {
      // 朝：エネルギッシュで前向きな楽曲
      energyPreference = 0.7
      moodPreferences = ['energetic', 'uplifting', 'positive']
    } else if (hour >= 12 && hour < 17) {
      // 昼：集中できる楽曲
      energyPreference = 0.6
      moodPreferences = ['focused', 'energetic']
    } else if (hour >= 17 && hour < 22) {
      // 夜：リラックスしつつも楽しい楽曲
      energyPreference = 0.5
      moodPreferences = ['relaxing', 'romantic', 'nostalgic']
    } else {
      // 深夜：落ち着いた楽曲
      energyPreference = 0.3
      moodPreferences = ['peaceful', 'dreamy', 'calm']
    }

    return this.tracks
      .filter(track => 
        Math.abs(track.energy - energyPreference) < 0.3 &&
        track.mood.some(m => moodPreferences.includes(m))
      )
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit)
  }

  // ユーザープロファイルの取得
  getUserProfile(): UserProfile | null {
    return this.userProfile
  }

  // 推薦の説明生成
  getRecommendationExplanation(track: EnhancedTrack): string {
    if (!this.userProfile) {
      return `人気楽曲として推薦されました（人気度: ${track.popularity}%）`
    }

    const explanations: string[] = []

    // ジャンル適合
    const matchingGenres = this.userProfile.preferredGenres
      .filter(pg => track.genre.includes(pg.genre))
      .slice(0, 2)
    
    if (matchingGenres.length > 0) {
      explanations.push(`よく聞く${matchingGenres.map(g => g.genre).join('・')}ジャンル`)
    }

    // 特徴量適合
    const features = this.userProfile.audioFeatures
    if (Math.abs(track.energy - features.energy) < 0.2) {
      explanations.push('好みのエネルギーレベル')
    }

    // 人気度
    if (track.popularity > 80) {
      explanations.push('話題の楽曲')
    } else if (track.popularity < 30 && this.userProfile.discoveryScore > 0.6) {
      explanations.push('隠れた名曲')
    }

    return explanations.length > 0 
      ? explanations.join('・') + 'に基づく推薦'
      : '総合的な分析に基づく推薦'
  }
}