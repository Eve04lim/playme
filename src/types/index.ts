// src/types/index.ts

// ===== 基本型定義 =====

export interface User {
  id: string
  email: string
  username: string
  spotifyConnected: boolean
  appleMusicConnected: boolean
  createdAt: string
  updatedAt: string
}

export interface Track {
  id: string
  spotifyId?: string
  appleMusicId?: string
  title: string
  artist: string
  album?: string
  duration: number // ミリ秒
  artworkUrl?: string
  previewUrl?: string
  externalUrl?: string
  createdAt?: string
}

export interface Playlist {
  id: string
  userId: string
  name: string
  description?: string
  coverImageUrl?: string
  isPublic: boolean
  tracks: Track[]
  trackCount: number
  createdAt: string
  updatedAt: string
}

export interface FavoriteLyric {
  id: string
  userId: string
  trackId: string
  text: string
  artist: string
  songTitle: string
  createdAt: string
}

// ===== マイページ関連型 =====

export interface MyPageTheme {
  id: string
  name: string
  backgroundColor: string
  primaryColor: string
  secondaryColor: string
  textColor: string
}

export interface MyPageColumn {
  id: string
  playlistId: string
  position: number // 0, 1, 2 (左から右)
}

export interface MyPageSettings {
  id: string
  userId: string
  theme: MyPageTheme
  columns: MyPageColumn[]
  showWaveform: boolean
  showLyrics: boolean
  createdAt: string
  updatedAt: string
}

// ===== API レスポンス型 =====

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ===== 認証関連型 =====

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
  confirmPassword: string
}

export interface AuthResponse {
  user: User
  token: string
  expiresIn: number
}

// ===== 音楽検索関連型 =====

export interface SearchRequest {
  query: string
  type?: 'track' | 'album' | 'artist' | 'playlist'
  limit?: number
  offset?: number
}

export interface SearchResponse {
  tracks: Track[]
  albums?: any[]
  artists?: any[]
  playlists?: any[]
  total: number
}

// ===== プレイヤー関連型 =====

export interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  shuffle: boolean
  repeat: 'none' | 'one' | 'all'
  queue: Track[]
  queueIndex: number
}

// ===== フォーム関連型 =====

export interface CreatePlaylistRequest {
  name: string
  description?: string
  isPublic?: boolean
}

export interface UpdatePlaylistRequest {
  name?: string
  description?: string
  isPublic?: boolean
  coverImageUrl?: string
}

export interface AddTrackToPlaylistRequest {
  playlistId: string
  trackData: Omit<Track, 'id' | 'createdAt'>
}

// ===== エラー型 =====

export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: string
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

// ===== ユーティリティ型 =====

export type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface AsyncState<T> {
  data: T | null
  loading: LoadingState
  error: string | null
}

// ===== コンポーネントプロパティ型 =====

export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

// ===== イベント型 =====

export interface PlayTrackEvent {
  track: Track
  playlist?: Playlist
  queueIndex?: number
}

export interface UpdateThemeEvent {
  theme: MyPageTheme
}

export interface UpdateColumnsEvent {
  columns: MyPageColumn[]
}