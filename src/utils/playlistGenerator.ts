// src/utils/playlistGenerator.ts
import type { Track } from '../types'

// プレイリストテンプレート定義
export interface PlaylistTemplate {
  id: string
  name: string
  description: string
  icon: string
  color: string
  criteria: {
    genres?: string[]
    energy?: { min: number; max: number }
    valence?: { min: number; max: number }
    danceability?: { min: number; max: number }
    bpm?: { min: number; max: number }
    duration?: { min: number; max: number } // minutes
    popularity?: { min: number; max: number }
    mood?: string[]
  }
  trackCount: { min: number; max: number; default: number }
  algorithm: 'balanced' | 'high_energy' | 'chill' | 'focused' | 'diverse'
}

// プレイリストエントリ
export interface PlaylistEntry {
  id: string
  name: string
  description?: string
  coverArt?: string
  tracks: Track[]
  createdAt: Date
  updatedAt: Date
  templateId?: string
  isPublic: boolean
  tags: string[]
  totalDuration: number
  averageEnergy: number
  genres: string[]
}

// ワンクリック生成用テンプレート
export const PRESET_TEMPLATES: PlaylistTemplate[] = [
  {
    id: 'workout',
    name: 'ワークアウト',
    description: 'エネルギッシュでモチベーション高い楽曲',
    icon: '💪',
    color: '#ef4444',
    criteria: {
      energy: { min: 0.7, max: 1.0 },
      danceability: { min: 0.6, max: 1.0 },
      valence: { min: 0.5, max: 1.0 },
      bpm: { min: 120, max: 180 },
      genres: ['Electronic', 'Hip-Hop', 'Rock', 'Pop']
    },
    trackCount: { min: 15, max: 30, default: 20 },
    algorithm: 'high_energy'
  },
  {
    id: 'study',
    name: '勉強・集中',
    description: '集中力を高める落ち着いた楽曲',
    icon: '📚',
    color: '#3b82f6',
    criteria: {
      energy: { min: 0.2, max: 0.6 },
      valence: { min: 0.3, max: 0.7 },
      bpm: { min: 60, max: 120 },
      genres: ['Classical', 'Ambient', 'Lo-fi', 'Jazz', 'Instrumental']
    },
    trackCount: { min: 20, max: 50, default: 30 },
    algorithm: 'focused'
  },
  {
    id: 'relax',
    name: 'リラックス',
    description: '癒しとくつろぎのための楽曲',
    icon: '🌸',
    color: '#10b981',
    criteria: {
      energy: { min: 0.1, max: 0.5 },
      valence: { min: 0.4, max: 0.8 },
      danceability: { min: 0.2, max: 0.6 },
      bpm: { min: 60, max: 100 },
      genres: ['Ambient', 'Chill', 'Folk', 'Jazz', 'Classical']
    },
    trackCount: { min: 15, max: 40, default: 25 },
    algorithm: 'chill'
  },
  {
    id: 'party',
    name: 'パーティー',
    description: '盛り上がる楽しい楽曲',
    icon: '🎉',
    color: '#f59e0b',
    criteria: {
      energy: { min: 0.6, max: 1.0 },
      danceability: { min: 0.7, max: 1.0 },
      valence: { min: 0.6, max: 1.0 },
      bpm: { min: 100, max: 160 },
      genres: ['Dance', 'Pop', 'Hip-Hop', 'Electronic']
    },
    trackCount: { min: 20, max: 50, default: 30 },
    algorithm: 'high_energy'
  },
  {
    id: 'commute',
    name: '通勤・移動',
    description: '移動時間を楽しくする楽曲',
    icon: '🚊',
    color: '#8b5cf6',
    criteria: {
      energy: { min: 0.4, max: 0.8 },
      valence: { min: 0.5, max: 0.9 },
      duration: { min: 3, max: 5 },
      genres: ['Pop', 'Rock', 'Alternative', 'Indie']
    },
    trackCount: { min: 15, max: 25, default: 20 },
    algorithm: 'balanced'
  },
  {
    id: 'sleep',
    name: '睡眠・就寝',
    description: '眠りを誘う穏やかな楽曲',
    icon: '🌙',
    color: '#6366f1',
    criteria: {
      energy: { min: 0.0, max: 0.3 },
      valence: { min: 0.2, max: 0.6 },
      bpm: { min: 40, max: 80 },
      genres: ['Ambient', 'Classical', 'New Age', 'Nature']
    },
    trackCount: { min: 10, max: 30, default: 15 },
    algorithm: 'chill'
  }
]

export class PlaylistGenerator {
  private tracks: Track[]
  private playlists: Map<string, PlaylistEntry> = new Map()
  private storageKey = 'user_playlists'

  constructor(tracks: Track[]) {
    this.tracks = tracks
    this.loadPlaylists()
  }

  // ストレージからプレイリスト読み込み
  private loadPlaylists(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        Object.entries(data).forEach(([id, playlist]: [string, any]) => {
          this.playlists.set(id, {
            ...playlist,
            createdAt: new Date(playlist.createdAt),
            updatedAt: new Date(playlist.updatedAt)
          })
        })
      }
    } catch (error) {
      console.error('Failed to load playlists:', error)
    }
  }

  // ストレージにプレイリスト保存
  private savePlaylists(): void {
    try {
      const data = Object.fromEntries(this.playlists)
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save playlists:', error)
    }
  }

  // ワンクリックプレイリスト生成
  generatePlaylist(templateId: string, customName?: string): PlaylistEntry {
    const template = PRESET_TEMPLATES.find(t => t.id === templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const candidateTracks = this.filterTracksByTemplate(template)
    const selectedTracks = this.selectTracksByAlgorithm(
      candidateTracks, 
      template.algorithm, 
      template.trackCount.default
    )

    const playlist: PlaylistEntry = {
      id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: customName || `${template.name} ${new Date().toLocaleDateString('ja-JP')}`,
      description: template.description,
      coverArt: this.generateCoverArt(selectedTracks),
      tracks: selectedTracks,
      createdAt: new Date(),
      updatedAt: new Date(),
      templateId: template.id,
      isPublic: false,
      tags: [template.name, ...template.criteria.genres || []],
      totalDuration: selectedTracks.reduce((sum, track) => sum + track.duration, 0),
      averageEnergy: selectedTracks.reduce((sum, track) => sum + (track as any).energy || 0.5, 0) / selectedTracks.length,
      genres: [...new Set(selectedTracks.flatMap(track => (track as any).genre || []))]
    }

    this.playlists.set(playlist.id, playlist)
    this.savePlaylists()

    return playlist
  }

  // ジャンル別自動プレイリスト生成
  generateGenrePlaylist(
    genre: string, 
    trackCount: number = 20,
    name?: string
  ): PlaylistEntry {
    const genreTracks = this.tracks.filter(track => 
      (track as any).genre && (track as any).genre.includes(genre)
    )

    if (genreTracks.length === 0) {
      throw new Error(`No tracks found for genre: ${genre}`)
    }

    // 人気度順でソートして上位を選択
    const selectedTracks = genreTracks
      .sort((a, b) => ((b as any).popularity || 0) - ((a as any).popularity || 0))
      .slice(0, Math.min(trackCount, genreTracks.length))

    const playlist: PlaylistEntry = {
      id: `genre_playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || `${genre} ベスト ${trackCount}`,
      description: `${genre}ジャンルの人気楽曲セレクション`,
      coverArt: this.generateCoverArt(selectedTracks),
      tracks: selectedTracks,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: false,
      tags: [genre, 'auto-generated'],
      totalDuration: selectedTracks.reduce((sum, track) => sum + track.duration, 0),
      averageEnergy: selectedTracks.reduce((sum, track) => sum + (track as any).energy || 0.5, 0) / selectedTracks.length,
      genres: [genre]
    }

    this.playlists.set(playlist.id, playlist)
    this.savePlaylists()

    return playlist
  }

  // カスタムプレイリスト作成
  createCustomPlaylist(
    name: string,
    tracks: Track[] = [],
    description?: string,
    tags: string[] = []
  ): PlaylistEntry {
    const playlist: PlaylistEntry = {
      id: `custom_playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      coverArt: this.generateCoverArt(tracks),
      tracks,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: false,
      tags: ['custom', ...tags],
      totalDuration: tracks.reduce((sum, track) => sum + track.duration, 0),
      averageEnergy: tracks.reduce((sum, track) => sum + (track as any).energy || 0.5, 0) / (tracks.length || 1),
      genres: [...new Set(tracks.flatMap(track => (track as any).genre || []))]
    }

    this.playlists.set(playlist.id, playlist)
    this.savePlaylists()

    return playlist
  }

  // プレイリスト編集
  updatePlaylist(
    playlistId: string,
    updates: Partial<PlaylistEntry>
  ): PlaylistEntry {
    const playlist = this.playlists.get(playlistId)
    if (!playlist) {
      throw new Error(`Playlist not found: ${playlistId}`)
    }

    const updatedPlaylist: PlaylistEntry = {
      ...playlist,
      ...updates,
      updatedAt: new Date(),
      totalDuration: updates.tracks 
        ? updates.tracks.reduce((sum, track) => sum + track.duration, 0)
        : playlist.totalDuration,
      averageEnergy: updates.tracks
        ? updates.tracks.reduce((sum, track) => sum + (track as any).energy || 0.5, 0) / updates.tracks.length
        : playlist.averageEnergy,
      genres: updates.tracks
        ? [...new Set(updates.tracks.flatMap(track => (track as any).genre || []))]
        : playlist.genres
    }

    this.playlists.set(playlistId, updatedPlaylist)
    this.savePlaylists()

    return updatedPlaylist
  }

  // 楽曲追加
  addTracksToPlaylist(playlistId: string, tracks: Track[]): PlaylistEntry {
    const playlist = this.playlists.get(playlistId)
    if (!playlist) {
      throw new Error(`Playlist not found: ${playlistId}`)
    }

    // 重複チェック
    const existingTrackIds = new Set(playlist.tracks.map(t => t.id))
    const newTracks = tracks.filter(track => !existingTrackIds.has(track.id))

    return this.updatePlaylist(playlistId, {
      tracks: [...playlist.tracks, ...newTracks]
    })
  }

  // 楽曲削除
  removeTracksFromPlaylist(playlistId: string, trackIds: string[]): PlaylistEntry {
    const playlist = this.playlists.get(playlistId)
    if (!playlist) {
      throw new Error(`Playlist not found: ${playlistId}`)
    }

    const removeIds = new Set(trackIds)
    return this.updatePlaylist(playlistId, {
      tracks: playlist.tracks.filter(track => !removeIds.has(track.id))
    })
  }

  // プレイリスト取得
  getPlaylist(playlistId: string): PlaylistEntry | null {
    return this.playlists.get(playlistId) || null
  }

  // 全プレイリスト取得
  getAllPlaylists(): PlaylistEntry[] {
    return Array.from(this.playlists.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    )
  }

  // プレイリスト削除
  deletePlaylist(playlistId: string): boolean {
    const deleted = this.playlists.delete(playlistId)
    if (deleted) {
      this.savePlaylists()
    }
    return deleted
  }

  // テンプレートによる楽曲フィルタリング
  private filterTracksByTemplate(template: PlaylistTemplate): Track[] {
    return this.tracks.filter(track => {
      const extendedTrack = track as any

      // ジャンルフィルター
      if (template.criteria.genres && template.criteria.genres.length > 0) {
        const trackGenres = extendedTrack.genre || []
        if (!template.criteria.genres.some(g => 
          trackGenres.some((tg: string) => tg.toLowerCase().includes(g.toLowerCase()))
        )) {
          return false
        }
      }

      // エネルギーフィルター
      if (template.criteria.energy) {
        const energy = extendedTrack.energy || 0.5
        if (energy < template.criteria.energy.min || energy > template.criteria.energy.max) {
          return false
        }
      }

      // ヴァレンス（感情価）フィルター
      if (template.criteria.valence) {
        const valence = extendedTrack.valence || 0.5
        if (valence < template.criteria.valence.min || valence > template.criteria.valence.max) {
          return false
        }
      }

      // ダンサビリティフィルター
      if (template.criteria.danceability) {
        const danceability = extendedTrack.danceability || 0.5
        if (danceability < template.criteria.danceability.min || 
            danceability > template.criteria.danceability.max) {
          return false
        }
      }

      // BPMフィルター
      if (template.criteria.bpm && extendedTrack.bpm) {
        if (extendedTrack.bpm < template.criteria.bpm.min || 
            extendedTrack.bpm > template.criteria.bpm.max) {
          return false
        }
      }

      // 人気度フィルター
      if (template.criteria.popularity) {
        const popularity = extendedTrack.popularity || 50
        if (popularity < template.criteria.popularity.min || 
            popularity > template.criteria.popularity.max) {
          return false
        }
      }

      return true
    })
  }

  // アルゴリズムによる楽曲選択
  private selectTracksByAlgorithm(
    tracks: Track[], 
    algorithm: PlaylistTemplate['algorithm'], 
    count: number
  ): Track[] {
    if (tracks.length <= count) return tracks

    const shuffled = [...tracks]

    switch (algorithm) {
      case 'high_energy':
        return shuffled
          .sort((a, b) => ((b as any).energy || 0) - ((a as any).energy || 0))
          .slice(0, count)

      case 'chill':
        return shuffled
          .sort((a, b) => ((a as any).energy || 1) - ((b as any).energy || 1))
          .slice(0, count)

      case 'focused':
        return shuffled
          .filter(track => ((track as any).energy || 0.5) < 0.6)
          .sort((a, b) => ((b as any).popularity || 0) - ((a as any).popularity || 0))
          .slice(0, count)

      case 'diverse':
        // ジャンル多様性を重視
        const genreMap = new Map<string, Track[]>()
        shuffled.forEach(track => {
          const genres = (track as any).genre || ['Unknown']
          genres.forEach((genre: string) => {
            if (!genreMap.has(genre)) genreMap.set(genre, [])
            genreMap.get(genre)!.push(track)
          })
        })

        const selected: Track[] = []
        const genreEntries = Array.from(genreMap.entries())
        let genreIndex = 0

        while (selected.length < count && genreEntries.length > 0) {
          const [, genreTracks] = genreEntries[genreIndex % genreEntries.length]
          if (genreTracks.length > 0) {
            const track = genreTracks.shift()!
            if (!selected.find(t => t.id === track.id)) {
              selected.push(track)
            }
          }
          genreIndex++
        }

        return selected.slice(0, count)

      case 'balanced':
      default:
        return shuffled
          .sort((a, b) => {
            const scoreA = ((a as any).popularity || 0) * 0.5 + ((a as any).energy || 0) * 0.3 + ((a as any).valence || 0) * 0.2
            const scoreB = ((b as any).popularity || 0) * 0.5 + ((b as any).energy || 0) * 0.3 + ((b as any).valence || 0) * 0.2
            return scoreB - scoreA
          })
          .slice(0, count)
    }
  }

  // カバーアート生成（グラデーション）
  private generateCoverArt(tracks: Track[]): string {
    if (tracks.length === 0) {
      return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }

    // 楽曲のジャンルベースでカラーパレット選択
    const genres = tracks.flatMap(track => (track as any).genre || [])
    const genreColors = {
      'Electronic': ['#3b82f6', '#1d4ed8'],
      'Jazz': ['#d97706', '#92400e'],
      'Rock': ['#dc2626', '#991b1b'],
      'Pop': ['#ec4899', '#be185d'],
      'Hip-Hop': ['#7c3aed', '#5b21b6'],
      'Classical': ['#059669', '#047857'],
      'Ambient': ['#06b6d4', '#0891b2']
    }

    const primaryGenre = genres[0] || 'Electronic'
    const colors = genreColors[primaryGenre as keyof typeof genreColors] || genreColors.Electronic

    return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`
  }

  // 統計情報取得
  getStats(): {
    totalPlaylists: number
    totalTracks: number
    averagePlaylistLength: number
    favoriteGenres: string[]
    templateUsage: Record<string, number>
  } {
    const playlists = Array.from(this.playlists.values())
    
    const templateUsage: Record<string, number> = {}
    playlists.forEach(playlist => {
      if (playlist.templateId) {
        templateUsage[playlist.templateId] = (templateUsage[playlist.templateId] || 0) + 1
      }
    })

    const allGenres = playlists.flatMap(p => p.genres)
    const genreCount = allGenres.reduce((acc, genre) => {
      acc[genre] = (acc[genre] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const favoriteGenres = Object.entries(genreCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre)

    return {
      totalPlaylists: playlists.length,
      totalTracks: playlists.reduce((sum, p) => sum + p.tracks.length, 0),
      averagePlaylistLength: playlists.length > 0 
        ? playlists.reduce((sum, p) => sum + p.tracks.length, 0) / playlists.length 
        : 0,
      favoriteGenres,
      templateUsage
    }
  }
}