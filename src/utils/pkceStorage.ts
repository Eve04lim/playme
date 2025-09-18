const PKCE_NS = 'spotify:pkce'

export const pkceKeys = {
  state:    `${PKCE_NS}:state`,
  verifier: `${PKCE_NS}:verifier`,
  lock:     `${PKCE_NS}:lock`,
}

// セッション継続はリダイレクト間で十分なので sessionStorage を既定に
const store = {
  get:  (k: string) => sessionStorage.getItem(k),
  set:  (k: string, v: string) => sessionStorage.setItem(k, v),
  del:  (k: string) => sessionStorage.removeItem(k),
  has:  (k: string) => sessionStorage.getItem(k) !== null,
}

// 新しい統一インターフェース
export function savePkce(state: string, verifier: string) {
  store.set(pkceKeys.state, state)
  store.set(pkceKeys.verifier, verifier)
  
  if (import.meta.env.DEV) {
    console.log('💾 [PKCE] Saved to sessionStorage:', {
      state: state.substring(0, 8) + '...',
      verifier: verifier.substring(0, 8) + '...'
    })
  }
}

export function loadPkce() {
  const state = store.get(pkceKeys.state)
  const verifier = store.get(pkceKeys.verifier)
  
  if (import.meta.env.DEV) {
    console.log('🔍 [PKCE] Loaded from sessionStorage:', {
      hasState: !!state,
      hasVerifier: !!verifier,
      state: state?.substring(0, 8) + '...' || 'null',
      verifier: verifier?.substring(0, 8) + '...' || 'null'
    })
  }
  
  return { state, verifier }
}

export function clearPkce() {
  store.del(pkceKeys.state)
  store.del(pkceKeys.verifier)
  
  if (import.meta.env.DEV) {
    console.log('🧹 [PKCE] Cleared from sessionStorage')
  }
}

// 既存インターフェース（互換性維持）
export const pkce = {
  save: savePkce,
  load: loadPkce,
  clear: clearPkce
}

// 旧関数との互換性維持（段階的移行用）
export function setPKCEForState(state: string, verifier: string, useSession = true) {
  pkce.save(state, verifier)
}

export function getPKCEForState(state: string) {
  const { state: savedState, verifier } = pkce.load()
  return { savedState, verifier }
}

export function clearPKCEForState(state: string) {
  pkce.clear()
}

// ロック：2分TTL
export function acquirePkceLock(): boolean {
  const now = Date.now()
  const raw = store.get(pkceKeys.lock)
  if (raw) {
    try {
      const { ts } = JSON.parse(raw)
      if (now - ts < 120_000) {
        if (import.meta.env.DEV) {
          console.warn('🔒 [PKCE] Lock already held, age:', Math.floor((now - ts) / 1000) + 's')
        }
        return false
      }
    } catch {
      // ロック読み取り失敗は無視（新しいロックを取得）
    }
  }
  store.set(pkceKeys.lock, JSON.stringify({ ts: now }))
  if (import.meta.env.DEV) {
    console.log('🔒 [PKCE] Lock acquired')
  }
  return true
}

export function releasePkceLock() {
  store.del(pkceKeys.lock)
  if (import.meta.env.DEV) {
    console.log('🔓 [PKCE] Lock released')
  }
}

// state / verifier バリデーション
const b64url = /^[A-Za-z0-9\-_~.]+$/ // RFC7636で利用する文字集合

export function validateState(state: string): boolean {
  return state.length >= 8 && state.length <= 128 && b64url.test(state)
}

export function validateVerifier(verifier: string): boolean {
  return verifier.length >= 43 && verifier.length <= 128 && b64url.test(verifier)
}

// orphan GC（開発中便利） - 24時間以上古いエントリを削除
export function gcOrphanedPKCE() {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  
  // localStorage内のpkce_*キーを全て検索
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(`${NS}_`)) {
      // activeとlockは除外
      if (key.includes(':')) {
        keysToRemove.push(key)
      }
    }
  }
  
  // sessionStorage内のpkce_*キーも検索
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key?.startsWith(`${NS}_verifier:`)) {
      // 対応するlocalStorageのstateキーがあるかチェック
      const state = key.split(':')[1]
      const stateKey = pkceKeys(state).state
      if (!localStorage.getItem(stateKey)) {
        sessionStorage.removeItem(key)
        console.log('🧹 [PKCE] GC orphaned sessionStorage key:', key)
      }
    }
  }
  
  console.log('🧹 [PKCE] GC found', keysToRemove.length, 'localStorage keys')
  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })
}