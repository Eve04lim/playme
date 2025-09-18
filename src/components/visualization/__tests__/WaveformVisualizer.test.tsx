// src/components/visualization/__tests__/WaveformVisualizer.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useMusicStore } from '../../../stores/musicStore'
import { useMyPageStore } from '../../../stores/myPageStore'
import WaveformVisualizer from '../WaveformVisualizer'

// Mock stores
vi.mock('../../../stores/musicStore')
vi.mock('../../../stores/myPageStore')

// Mock Web Audio API
const mockCanvas = {
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
  })),
  width: 800,
  height: 128
}

// Mock Canvas
HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvas.getContext())
HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 800,
  height: 128,
  top: 0,
  left: 0,
  bottom: 128,
  right: 800,
  x: 0,
  y: 0,
  toJSON: vi.fn()
}))

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  callback(0)
  return 0
})
global.cancelAnimationFrame = vi.fn()

// Mock AudioContext
global.AudioContext = vi.fn(() => ({
  createAnalyser: vi.fn(() => ({
    fftSize: 256,
    smoothingTimeConstant: 0.8,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn(),
    connect: vi.fn(),
  })),
  createMediaElementSource: vi.fn(() => ({
    connect: vi.fn()
  })),
  destination: {},
  close: vi.fn(),
  state: 'running'
})) as any

const mockMusicStore = {
  isPlaying: false,
  currentTrack: null
}

const mockTheme = {
  primaryColor: '#1db954',
  textColor: '#ffffff'
}

describe('WaveformVisualizer', () => {
  beforeEach(() => {
    vi.mocked(useMusicStore).mockReturnValue(mockMusicStore as any)
    vi.mocked(useMyPageStore).mockReturnValue({ theme: mockTheme } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when no current track', () => {
    const { container } = render(<WaveformVisualizer />)
    expect(container.firstChild).toBeNull()
  })

  it('should render canvas when track is available', () => {
    vi.mocked(useMusicStore).mockReturnValue({
      ...mockMusicStore,
      currentTrack: { id: '1', title: 'Test Track', artist: 'Test Artist', duration: 180000 },
      isPlaying: true
    } as any)

    render(<WaveformVisualizer />)
    
    const canvas = screen.getByRole('img')
    expect(canvas).toBeInTheDocument()
    expect(canvas).toHaveAttribute('aria-label', expect.stringContaining('音楽の波形を表示中'))
  })

  it('should show pause state in accessibility label', () => {
    vi.mocked(useMusicStore).mockReturnValue({
      ...mockMusicStore,
      currentTrack: { id: '1', title: 'Test Track', artist: 'Test Artist', duration: 180000 },
      isPlaying: false
    } as any)

    render(<WaveformVisualizer />)
    
    const canvas = screen.getByRole('img')
    expect(canvas).toHaveAttribute('aria-label', expect.stringContaining('音楽の再生が停止中'))
  })

  it('should display fallback message when Web Audio API is not supported', () => {
    // Simulate unsupported environment
    global.AudioContext = undefined as any
    
    vi.mocked(useMusicStore).mockReturnValue({
      ...mockMusicStore,
      currentTrack: { id: '1', title: 'Test Track', artist: 'Test Artist', duration: 180000 },
      isPlaying: true
    } as any)

    render(<WaveformVisualizer />)
    
    expect(screen.getByText('音声可視化は対応していません')).toBeInTheDocument()
  })

  it('should apply custom height and bars props', () => {
    vi.mocked(useMusicStore).mockReturnValue({
      ...mockMusicStore,
      currentTrack: { id: '1', title: 'Test Track', artist: 'Test Artist', duration: 180000 },
      isPlaying: true
    } as any)

    render(<WaveformVisualizer height={200} bars={32} />)
    
    const canvas = screen.getByRole('img')
    expect(canvas).toHaveStyle({ height: '200px' })
  })

  it('should include screen reader information', () => {
    vi.mocked(useMusicStore).mockReturnValue({
      ...mockMusicStore,
      currentTrack: { id: '1', title: 'Test Track', artist: 'Test Artist', duration: 180000 },
      isPlaying: true
    } as any)

    render(<WaveformVisualizer />)
    
    expect(screen.getByText(/Test Track の音楽波形ビジュアライザー/)).toBeInTheDocument()
    expect(screen.getByText(/再生中/)).toBeInTheDocument()
  })

  it('should handle canvas resize', () => {
    vi.mocked(useMusicStore).mockReturnValue({
      ...mockMusicStore,
      currentTrack: { id: '1', title: 'Test Track', artist: 'Test Artist', duration: 180000 },
      isPlaying: true
    } as any)

    render(<WaveformVisualizer />)
    
    // Simulate resize
    window.dispatchEvent(new Event('resize'))
    
    // Should not throw errors
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})