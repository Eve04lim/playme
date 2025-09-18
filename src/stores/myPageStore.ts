// src/stores/myPageStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
    FavoriteLyric,
    MyPageColumn,
    MyPageSettings,
    MyPageTheme
} from '../types'

interface MyPageState {
  // 現在の設定
  theme: MyPageTheme
  columns: MyPageColumn[]
  favoriteLyrics: FavoriteLyric[]
  showWaveform: boolean
  showLyrics: boolean
  
  // ロード状態
  loading: boolean
  error: string | null

  // テーマ操作
  updateTheme: (theme: MyPageTheme) => void
  setCustomColors: (colors: Partial<MyPageTheme>) => void
  resetTheme: () => void
  
  // カラム操作
  updateColumns: (columns: MyPageColumn[]) => void
  moveColumn: (fromIndex: number, toIndex: number) => void
  setColumnPlaylist: (position: number, playlistId: string) => void
  
  // 歌詞操作
  addFavoriteLyric: (lyric: Omit<FavoriteLyric, 'id' | 'userId' | 'createdAt'>) => void
  removeFavoriteLyric: (lyricId: string) => void
  updateFavoriteLyric: (lyricId: string, updates: Partial<FavoriteLyric>) => void
  
  // エフェクト設定
  toggleWaveform: () => void
  toggleLyrics: () => void
  setWaveformVisibility: (visible: boolean) => void
  setLyricsVisibility: (visible: boolean) => void
  
  // データ管理
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
  clearError: () => void
}

// プリセットテーマ
const presetThemes: MyPageTheme[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    backgroundColor: '#121212',
    primaryColor: '#1db954',
    secondaryColor: '#191414',
    textColor: '#ffffff'
  },
  {
    id: 'purple',
    name: 'Purple Dream',
    backgroundColor: '#1a1625',
    primaryColor: '#8b5cf6',
    secondaryColor: '#2d1b69',
    textColor: '#f8fafc'
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    backgroundColor: '#0f1419',
    primaryColor: '#06b6d4',
    secondaryColor: '#0891b2',
    textColor: '#f0f9ff'
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    backgroundColor: '#1c1917',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
    textColor: '#fef7f0'
  },
  {
    id: 'forest',
    name: 'Forest Green',
    backgroundColor: '#14532d',
    primaryColor: '#22c55e',
    secondaryColor: '#16a34a',
    textColor: '#f0fdf4'
  }
]

// デフォルト設定
const defaultTheme: MyPageTheme = presetThemes[0] ?? {
  id: 'default',
  name: 'default',
  primaryColor: '#1db954',
  secondaryColor: '#1ed760',
  backgroundColor: '#191414',
  textColor: '#ffffff'
}
const defaultColumns: MyPageColumn[] = [
  { id: '1', playlistId: '', position: 0 },
  { id: '2', playlistId: '', position: 1 },
  { id: '3', playlistId: '', position: 2 }
]

// モック API 関数
const mockLoadSettingsApi = async (): Promise<MyPageSettings> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: '1',
        userId: 'current-user-id',
        theme: defaultTheme,
        columns: defaultColumns,
        showWaveform: true,
        showLyrics: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }, 800)
  })
}

const mockSaveSettingsApi = async (settings: Partial<MyPageSettings>): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Settings saved:', settings)
      resolve()
    }, 500)
  })
}

export const useMyPageStore = create<MyPageState>()(
  persist(
    (set, get) => ({
      // 初期状態
      theme: defaultTheme,
      columns: defaultColumns,
      favoriteLyrics: [],
      showWaveform: true,
      showLyrics: true,
      loading: false,
      error: null,

      // テーマ更新
      updateTheme: (theme: MyPageTheme) => {
        set({ theme })
      },

      // カスタムカラー設定
      setCustomColors: (colors: Partial<MyPageTheme>) => {
        const { theme } = get()
        const updatedTheme: MyPageTheme = {
          ...theme,
          ...colors,
          id: 'custom',
          name: 'Custom Theme'
        }
        set({ theme: updatedTheme })
      },

      // テーマリセット
      resetTheme: () => {
        set({ theme: defaultTheme })
      },

      // カラム更新
      updateColumns: (columns: MyPageColumn[]) => {
        // 位置を正規化
        const normalizedColumns = columns.map((col, index) => ({
          ...col,
          position: index
        }))
        set({ columns: normalizedColumns })
      },

      // カラム移動
      moveColumn: (fromIndex: number, toIndex: number) => {
        const { columns } = get()
        const newColumns = [...columns]
        const [movedColumn] = newColumns.splice(fromIndex, 1)
        if (movedColumn) {
          newColumns.splice(toIndex, 0, movedColumn)
        }
        
        // 位置を再設定
        const updatedColumns = newColumns.map((col, index) => ({
          ...col,
          position: index
        }))
        
        set({ columns: updatedColumns })
      },

      // カラムにプレイリスト設定
      setColumnPlaylist: (position: number, playlistId: string) => {
        const { columns } = get()
        const updatedColumns = columns.map(col =>
          col.position === position
            ? { ...col, playlistId }
            : col
        )
        set({ columns: updatedColumns })
      },

      // お気に入り歌詞追加
      addFavoriteLyric: (lyricData: Omit<FavoriteLyric, 'id' | 'userId' | 'createdAt'>) => {
        const newLyric: FavoriteLyric = {
          ...lyricData,
          id: Date.now().toString(),
          userId: 'current-user-id', // 実際の実装では認証ストアから取得
          createdAt: new Date().toISOString()
        }
        
        set(state => ({
          favoriteLyrics: [...state.favoriteLyrics, newLyric]
        }))
      },

      // お気に入り歌詞削除
      removeFavoriteLyric: (lyricId: string) => {
        set(state => ({
          favoriteLyrics: state.favoriteLyrics.filter(lyric => lyric.id !== lyricId)
        }))
      },

      // お気に入り歌詞更新
      updateFavoriteLyric: (lyricId: string, updates: Partial<FavoriteLyric>) => {
        set(state => ({
          favoriteLyrics: state.favoriteLyrics.map(lyric =>
            lyric.id === lyricId
              ? { ...lyric, ...updates }
              : lyric
          )
        }))
      },

      // 波形表示切り替え
      toggleWaveform: () => {
        set(state => ({ showWaveform: !state.showWaveform }))
      },

      // 歌詞表示切り替え
      toggleLyrics: () => {
        set(state => ({ showLyrics: !state.showLyrics }))
      },

      // 波形表示設定
      setWaveformVisibility: (visible: boolean) => {
        set({ showWaveform: visible })
      },

      // 歌詞表示設定
      setLyricsVisibility: (visible: boolean) => {
        set({ showLyrics: visible })
      },

      // 設定読み込み
      loadSettings: async () => {
        set({ loading: true, error: null })
        try {
          const settings = await mockLoadSettingsApi()
          set({
            theme: settings.theme,
            columns: settings.columns,
            showWaveform: settings.showWaveform,
            showLyrics: settings.showLyrics,
            loading: false
          })
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load settings'
          })
          throw error
        }
      },

      // 設定保存
      saveSettings: async () => {
        const { theme, columns, showWaveform, showLyrics } = get()
        set({ loading: true, error: null })
        
        try {
          await mockSaveSettingsApi({
            theme,
            columns,
            showWaveform,
            showLyrics,
            updatedAt: new Date().toISOString()
          })
          set({ loading: false })
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to save settings'
          })
          throw error
        }
      },

      // エラークリア
      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'mypage-storage',
      // 永続化する項目を指定
      partialize: (state) => ({
        theme: state.theme,
        columns: state.columns,
        favoriteLyrics: state.favoriteLyrics,
        showWaveform: state.showWaveform,
        showLyrics: state.showLyrics
      })
    }
  )
)

// プリセットテーマを取得するヘルパー関数
export const getPresetThemes = (): MyPageTheme[] => presetThemes

// テーマをプリセットから取得するヘルパー関数
export const getThemeById = (themeId: string): MyPageTheme | undefined => {
  return presetThemes.find(theme => theme.id === themeId)
}

// カスタムフック: テーマCSS変数を生成
export const useThemeVariables = () => {
  const theme = useMyPageStore(state => state.theme)
  
  return {
    '--bg-primary': theme.backgroundColor,
    '--color-primary': theme.primaryColor,
    '--color-secondary': theme.secondaryColor,
    '--text-primary': theme.textColor,
    '--text-secondary': theme.textColor + '80', // 50% opacity
    '--text-muted': theme.textColor + '60' // 37.5% opacity
  }
}