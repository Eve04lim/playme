export const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  const randomArray = new Uint8Array(length)
  crypto.getRandomValues(randomArray)
  
  randomArray.forEach((value) => {
    result += chars[value % chars.length]
  })
  
  return result
}

export const sha256 = async (plain: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return await crypto.subtle.digest('SHA-256', data)
}

export const base64UrlEncode = (arrayBuffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export const generateCodeVerifier = (): string => {
  return generateRandomString(128)
}

export const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const hashed = await sha256(verifier)
  return base64UrlEncode(hashed)
}

interface PKCEState {
  codeVerifier: string
  codeChallenge: string
  state: string
  timestamp: number
}

export class PKCEStateManager {
  private static readonly KEY = 'playme_spotify_pkce_state' // Prefixed to avoid conflicts
  private static readonly TTL = 10 * 60 * 1000 // 10分

  static async create(): Promise<PKCEState> {
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = generateRandomString(16)
    const timestamp = Date.now()

    const pkceState = { codeVerifier, codeChallenge, state, timestamp }
    this.save(pkceState)
    return pkceState
  }

  static save(pkceState: PKCEState): void {
    localStorage.setItem(this.KEY, JSON.stringify(pkceState))
  }

  static load(): PKCEState | null {
    try {
      const data = localStorage.getItem(this.KEY)
      if (!data) return null

      const pkceState: PKCEState = JSON.parse(data)
      
      // TTL チェック
      if (Date.now() - pkceState.timestamp > this.TTL) {
        this.clear()
        return null
      }

      return pkceState
    } catch (error) {
      console.error('Failed to load PKCE state:', error)
      this.clear()
      return null
    }
  }

  static clear(): void {
    localStorage.removeItem(this.KEY)
  }

  static isExpired(pkceState: PKCEState): boolean {
    return Date.now() - pkceState.timestamp > this.TTL
  }
}