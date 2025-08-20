// src/pages/MyPage.tsx
import React from 'react'
import { useMyPageStore } from '../stores/myPageStore'

export const MyPage: React.FC = () => {
  const { theme, showWaveform, showLyrics } = useMyPageStore()

  return (
    <div 
      className="min-h-screen relative"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* 背景エフェクト領域 */}
      <div className="absolute inset-0">
        {showWaveform && (
          <div className="absolute bottom-0 left-0 right-0 h-32 opacity-30">
            {/* 波形エフェクトはここに後で実装 */}
            <div 
              className="w-full h-full"
              style={{ backgroundColor: theme.primaryColor + '20' }}
            />
          </div>
        )}
        
        {showLyrics && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* 流れる歌詞はここに後で実装 */}
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl opacity-10"
              style={{ color: theme.primaryColor }}
            >
              ♪ 音楽と共に ♪
            </div>
          </div>
        )}
      </div>

      {/* メインコンテンツ */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4" style={{ color: theme.textColor }}>
            マイページ
          </h1>
          <p className="text-xl" style={{ color: theme.textColor + '80' }}>
            あなただけの音楽空間
          </p>
        </div>

        {/* 3カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {[0, 1, 2].map((columnIndex) => (
            <div key={columnIndex} className="space-y-6">
              <h2 
                className="text-2xl font-semibold text-center"
                style={{ color: theme.textColor }}
              >
                カラム {columnIndex + 1}
              </h2>
              
              {/* プレースホルダーカード */}
              {[...Array(3)].map((_, cardIndex) => (
                <div
                  key={cardIndex}
                  className="rounded-lg p-6 border-2 border-dashed flex flex-col items-center justify-center h-48"
                  style={{ borderColor: theme.primaryColor + '40' }}
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: theme.primaryColor + '20' }}
                  >
                    <span style={{ color: theme.primaryColor }}>🎵</span>
                  </div>
                  <p style={{ color: theme.textColor + '60' }}>
                    プレイリストを設定
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 設定ボタン */}
        <div className="fixed bottom-8 right-8">
          <button
            className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <span className="text-white text-xl">⚙️</span>
          </button>
        </div>
      </div>
    </div>
  )
}