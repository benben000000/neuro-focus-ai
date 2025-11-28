import '@testing-library/jest-dom/vitest'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})
window.IntersectionObserver = mockIntersectionObserver

// Mock ResizeObserver
const mockResizeObserver = vi.fn()
mockResizeObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})
window.ResizeObserver = mockResizeObserver

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', localStorageMock)

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('sessionStorage', sessionStorageMock)

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock-url'),
})

// Mock URL.revokeObjectURL
Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
})

// Mock canvas operations
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Array(4) })),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
}))

// Mock toDataURL
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock')

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  })),
  destination: {},
  state: 'running',
  resume: vi.fn(),
  currentTime: 0,
}))

// Mock Web Audio API
global.webkitAudioContext = global.AudioContext

// Mock fetch if needed
global.fetch = vi.fn()

// Mock FileReader
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(),
  readAsText: vi.fn(),
  addEventListener: vi.fn(),
  result: 'mock-result',
  onload: null,
  onerror: null,
}))

// Mock Image
global.Image = vi.fn().mockImplementation(() => ({
  width: 800,
  height: 600,
  src: '',
  onload: null,
  onerror: null,
}))

// Mock MediaRecorder
global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null,
  onstop: null,
  stream: { getTracks: vi.fn(() => [{ stop: vi.fn() }]) },
}))

// Mock getUserMedia
navigator.mediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: vi.fn(() => [{ stop: vi.fn() }]),
  }),
}

// Mock process.env for Vite
process.env = {
  ...process.env,
  NODE_ENV: 'test',
}