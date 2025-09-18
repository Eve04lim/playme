// src/components/modals/SettingsModal.tsx
/**
 * SettingsModal - ダッシュボード設定モーダル
 * 
 * 機能:
 * - テーマ変更、カラムレイアウト調整
 * - エフェクト有効/無効設定
 * - アクセシビリティ設定
 */
import React, { useEffect } from 'react'
import { X, Palette, Grid3X3, Volume2, Eye, Keyboard } from 'lucide-react'
import { useMyPageStore, getPresetThemes } from '../../stores/myPageStore'

interface SettingsModalProps {
  onClose: () => void
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    theme,
    showWaveform,
    showLyrics,
    updateTheme,
    toggleWaveform,
    toggleLyrics,
    saveSettings
  } = useMyPageStore()

  const presetThemes = getPresetThemes()

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handleSave = async () => {
    try {
      await saveSettings()
      onClose()
    } catch (error) {
      console.error('設定の保存に失敗しました:', error)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div 
        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        style={{ backgroundColor: theme.backgroundColor + 'E6' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 
            id="settings-title"
            className="text-header-md"
            style={{ color: theme.textColor }}
          >
            ダッシュボード設定
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="設定を閉じる"
          >
            <X size={24} style={{ color: theme.textColor }} />
          </button>
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {/* テーマ設定 */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <Palette size={20} style={{ color: theme.primaryColor }} />
              <h3 className="text-body-md font-medium" style={{ color: theme.textColor }}>
                テーマ
              </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {presetThemes.map((presetTheme) => (
                <button
                  key={presetTheme.id}
                  onClick={() => updateTheme(presetTheme)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    theme.id === presetTheme.id 
                      ? 'border-current scale-105' 
                      : 'border-white/20 hover:border-white/40'
                  }`}
                  style={{ 
                    backgroundColor: presetTheme.backgroundColor,
                    borderColor: theme.id === presetTheme.id ? theme.primaryColor : undefined
                  }}
                  aria-label={`${presetTheme.name}テーマを選択`}
                >
                  <div 
                    className="w-6 h-6 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: presetTheme.primaryColor }}
                  />
                  <div 
                    className="text-caption text-center"
                    style={{ color: presetTheme.textColor }}
                  >
                    {presetTheme.name}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* エフェクト設定 */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <Volume2 size={20} style={{ color: theme.primaryColor }} />
              <h3 className="text-body-md font-medium" style={{ color: theme.textColor }}>
                視覚エフェクト
              </h3>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-3">
                  <Eye size={18} style={{ color: theme.textColor + 'CC' }} />
                  <div>
                    <div className="text-body-sm" style={{ color: theme.textColor }}>
                      波形ビジュアライザー
                    </div>
                    <div className="text-caption" style={{ color: theme.textColor + 'AA' }}>
                      音楽に合わせた波形を表示
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showWaveform}
                  onChange={toggleWaveform}
                  className="w-5 h-5 rounded accent-current"
                  style={{ accentColor: theme.primaryColor }}
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-3">
                  <Keyboard size={18} style={{ color: theme.textColor + 'CC' }} />
                  <div>
                    <div className="text-body-sm" style={{ color: theme.textColor }}>
                      流れる歌詞
                    </div>
                    <div className="text-caption" style={{ color: theme.textColor + 'AA' }}>
                      背景に歌詞アニメーションを表示
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showLyrics}
                  onChange={toggleLyrics}
                  className="w-5 h-5 rounded accent-current"
                  style={{ accentColor: theme.primaryColor }}
                />
              </label>
            </div>
          </section>

          {/* レイアウト設定 */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <Grid3X3 size={20} style={{ color: theme.primaryColor }} />
              <h3 className="text-body-md font-medium" style={{ color: theme.textColor }}>
                レイアウト
              </h3>
            </div>
            
            <div 
              className="p-4 bg-white/5 rounded-lg"
              style={{ color: theme.textColor + 'CC' }}
            >
              <p className="text-body-sm mb-2">
                レイアウトは画面サイズに自動調整されます:
              </p>
              <ul className="text-caption space-y-1">
                <li>• デスクトップ (1200px+): 3カラム</li>
                <li>• タブレット (768-1199px): 2カラム</li>
                <li>• モバイル (768px未満): 1カラム</li>
              </ul>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-body-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            style={{ color: theme.textColor }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-body-sm text-white rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: theme.primaryColor }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal