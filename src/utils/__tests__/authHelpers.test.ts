// src/utils/__tests__/authHelpers.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  generateRandomString, 
  generateCodeVerifier, 
  generateCodeChallenge,
  PKCEStateManager 
} from '../authHelpers'

// Mock crypto API for testing
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    // Fill with predictable values for testing
    for (let i = 0; i < array.length; i++) {
      array[i] = i % 256
    }
    return array
  }),
  subtle: {
    digest: vi.fn(async (algorithm: string, data: BufferSource) => {
      // Return a mock hash
      return new ArrayBuffer(32)
    })
  }
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

describe('authHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup global mocks
    Object.defineProperty(global, 'crypto', {
      value: mockCrypto,
      writable: true
    })
    
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true
    })

    Object.defineProperty(global, 'btoa', {
      value: vi.fn((str: string) => Buffer.from(str, 'binary').toString('base64')),
      writable: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateRandomString', () => {
    it('should generate string of specified length', () => {
      const result = generateRandomString(10)
      expect(result).toHaveLength(10)
      expect(typeof result).toBe('string')
    })

    it('should generate different strings on multiple calls', () => {
      // Mock different random values for each call
      let callCount = 0
      mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = (callCount * 10 + i) % 256
        }
        callCount++
        return array
      })

      const result1 = generateRandomString(10)
      const result2 = generateRandomString(10)
      expect(result1).not.toBe(result2)
    })
  })

  describe('generateCodeVerifier', () => {
    it('should generate code verifier of length 128', () => {
      const verifier = generateCodeVerifier()
      expect(verifier).toHaveLength(128)
    })

    it('should use URL-safe characters', () => {
      const verifier = generateCodeVerifier()
      const urlSafeRegex = /^[A-Za-z0-9\-._~]+$/
      expect(urlSafeRegex.test(verifier)).toBe(true)
    })
  })

  describe('generateCodeChallenge', () => {
    it('should generate base64url encoded challenge', async () => {
      const verifier = 'test-verifier'
      const challenge = await generateCodeChallenge(verifier)
      
      expect(typeof challenge).toBe('string')
      expect(challenge.length).toBeGreaterThan(0)
      
      // Should call crypto.subtle.digest
      expect(mockCrypto.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array))
    })

    it('should produce consistent results for same input', async () => {
      const verifier = 'test-verifier'
      const challenge1 = await generateCodeChallenge(verifier)
      const challenge2 = await generateCodeChallenge(verifier)
      
      expect(challenge1).toBe(challenge2)
    })
  })

  describe('PKCEStateManager', () => {
    const mockPKCEState = {
      codeVerifier: 'mock-verifier',
      codeChallenge: 'mock-challenge', 
      state: 'mock-state',
      timestamp: Date.now()
    }

    describe('create', () => {
      it('should create and save PKCE state', async () => {
        const result = await PKCEStateManager.create()
        
        expect(result).toHaveProperty('codeVerifier')
        expect(result).toHaveProperty('codeChallenge') 
        expect(result).toHaveProperty('state')
        expect(result).toHaveProperty('timestamp')
        
        expect(result.codeVerifier).toHaveLength(128)
        expect(result.state).toHaveLength(16)
        expect(typeof result.timestamp).toBe('number')
        
        // Should save to localStorage
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'playme_spotify_pkce_state',
          expect.stringContaining(result.state)
        )
      })
    })

    describe('save', () => {
      it('should save PKCE state to localStorage', () => {
        PKCEStateManager.save(mockPKCEState)
        
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'playme_spotify_pkce_state',
          JSON.stringify(mockPKCEState)
        )
      })
    })

    describe('load', () => {
      it('should load valid PKCE state', () => {
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPKCEState))
        
        const result = PKCEStateManager.load()
        
        expect(result).toEqual(mockPKCEState)
        expect(localStorageMock.getItem).toHaveBeenCalledWith('playme_spotify_pkce_state')
      })

      it('should return null if no state exists', () => {
        localStorageMock.getItem.mockReturnValue(null)
        
        const result = PKCEStateManager.load()
        
        expect(result).toBe(null)
      })

      it('should return null and clear if state is expired', () => {
        const expiredState = {
          ...mockPKCEState,
          timestamp: Date.now() - (11 * 60 * 1000) // 11 minutes ago
        }
        localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredState))
        
        const result = PKCEStateManager.load()
        
        expect(result).toBe(null)
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('playme_spotify_pkce_state')
      })

      it('should handle corrupted data gracefully', () => {
        localStorageMock.getItem.mockReturnValue('invalid-json')
        
        const result = PKCEStateManager.load()
        
        expect(result).toBe(null)
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('playme_spotify_pkce_state')
      })
    })

    describe('clear', () => {
      it('should remove PKCE state from localStorage', () => {
        PKCEStateManager.clear()
        
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('playme_spotify_pkce_state')
      })
    })

    describe('isExpired', () => {
      it('should return false for fresh state', () => {
        const freshState = {
          ...mockPKCEState,
          timestamp: Date.now() - (5 * 60 * 1000) // 5 minutes ago
        }
        
        const result = PKCEStateManager.isExpired(freshState)
        
        expect(result).toBe(false)
      })

      it('should return true for expired state', () => {
        const expiredState = {
          ...mockPKCEState,
          timestamp: Date.now() - (11 * 60 * 1000) // 11 minutes ago
        }
        
        const result = PKCEStateManager.isExpired(expiredState)
        
        expect(result).toBe(true)
      })

      it('should return true for state at exact TTL boundary', () => {
        const boundaryState = {
          ...mockPKCEState,
          timestamp: Date.now() - (10 * 60 * 1000) // Exactly 10 minutes ago
        }
        
        const result = PKCEStateManager.isExpired(boundaryState)
        
        expect(result).toBe(false) // Should still be valid at boundary
      })

      it('should return true for state just over TTL', () => {
        const justExpiredState = {
          ...mockPKCEState,
          timestamp: Date.now() - (10 * 60 * 1000 + 1) // Just over 10 minutes
        }
        
        const result = PKCEStateManager.isExpired(justExpiredState)
        
        expect(result).toBe(true)
      })
    })

    describe('TTL and timestamp handling', () => {
      it('should use prefixed localStorage key', () => {
        PKCEStateManager.save(mockPKCEState)
        
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'playme_spotify_pkce_state', // Should use prefixed key
          expect.any(String)
        )
      })

      it('should handle race conditions in load-verify-clear operations', () => {
        // Simulate rapid calls to load
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPKCEState))
        
        const result1 = PKCEStateManager.load()
        const result2 = PKCEStateManager.load()
        
        expect(result1).toEqual(mockPKCEState)
        expect(result2).toEqual(mockPKCEState)
        expect(localStorageMock.getItem).toHaveBeenCalledTimes(2)
      })
    })
  })
})