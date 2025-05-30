import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { FermionLivestreamVideo } from './livestream-video'

describe('FermionLivestreamVideo', () => {
	test('should create instance with valid hostname', () => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})
		expect(livestream).toBeInstanceOf(FermionLivestreamVideo)
	})

	test('should throw error with invalid hostname', () => {
		expect(() => {
			new FermionLivestreamVideo({
				liveEventSessionId: 'test-session-id',
				websiteHostname: 'invalid hostname'
			})
		}).toThrow('Invalid website hostname')
	})

	test('should return iframe URL and HTML with token for private embedding', () => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})
		const result = livestream.getPrivateEmbedPlaybackIframeCode({
			jwtToken: 'test-token'
		})

		expect(result).toHaveProperty('iframeUrl')
		expect(result).toHaveProperty('iframeHtml')
		expect(result.iframeUrl).toContain('acme.fermion.app')
		expect(result.iframeUrl).toContain('test-session-id')
		expect(result.iframeUrl).toContain('test-token')
		expect(result.iframeHtml).toContain(result.iframeUrl)
	})

	test('should encode both live event session ID and token in private iframe URL', () => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test/session/id',
			websiteHostname: 'acme.fermion.app'
		})
		const result = livestream.getPrivateEmbedPlaybackIframeCode({
			jwtToken: 'test/token'
		})

		expect(result.iframeUrl).toContain('test%2Fsession%2Fid')
		expect(result.iframeUrl).toContain('test%2Ftoken')
	})

	test('should process encrypted M3U8 content and return blob URL', async () => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})

		// Mock fetch response
		global.fetch = vi.fn().mockResolvedValue({
			text: () =>
				Promise.resolve(
					'#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key",IV=123\nsegment1.ts\nsegment2.ts'
				)
		})

		const result = await livestream.getM3U8PlaybackUrl({
			origin: 'https://cdn.example.com',
			masterM3u8Pathname: '/livestream/playlist.m3u8',
			clearkeyDecryptionKeyInHex: '1234567890abcdef',
			urlSearchParamString: '?token=test'
		})

		expect(result).toMatch(/^blob:/)
		expect(fetch).toHaveBeenCalled()
	})

	test('should process unencrypted M3U8 content and return blob URL', async () => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})

		// Mock fetch response with unencrypted M3U8 content
		global.fetch = vi.fn().mockResolvedValue({
			text: () => Promise.resolve('#EXTM3U\nsegment1.ts\nsegment2.ts')
		})

		const result = await livestream.getM3U8PlaybackUrl({
			origin: 'https://cdn.example.com',
			masterM3u8Pathname: '/livestream/playlist.m3u8',
			clearkeyDecryptionKeyInHex: null,
			urlSearchParamString: '?token=test'
		})

		expect(result).toMatch(/^blob:/)
		expect(fetch).toHaveBeenCalled()
	})

	test('should throw error if IV not found in encrypted M3U8 content', async () => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})

		// Mock fetch response with invalid M3U8 content
		global.fetch = vi.fn().mockResolvedValue({
			text: () => Promise.resolve('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\nsegment1.ts')
		})

		await expect(
			livestream.getM3U8PlaybackUrl({
				origin: 'https://cdn.example.com',
				masterM3u8Pathname: '/livestream/playlist.m3u8',
				clearkeyDecryptionKeyInHex: '1234567890abcdef',
				urlSearchParamString: '?token=test'
			})
		).rejects.toThrow('IV not found in #EXT-X-KEY line')
	})

	let messageHandler: (event: MessageEvent) => void

	beforeEach(() => {
		// Mock addEventListener to capture the handler
		window.addEventListener = vi.fn((event, handler) => {
			if (event === 'message') {
				messageHandler = handler as (event: MessageEvent) => void
			}
		})

		// Mock removeEventListener
		window.removeEventListener = vi.fn()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should handle livestream play event with duration', () => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})

		const events = livestream.setupEventListenersOnVideo()
		const playCallback = vi.fn()
		events.onVideoPlay(playCallback)

		messageHandler({
			origin: 'https://acme.fermion.app',
			data: {
				type: 'video:play',
				durationAtInSeconds: 42
			}
		} as MessageEvent)

		expect(playCallback).toHaveBeenCalledWith({ durationAtInSeconds: 42 })
	})

	test('should handle livestream pause event with duration', () => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})

		const events = livestream.setupEventListenersOnVideo()
		const pauseCallback = vi.fn()
		events.onVideoPaused(pauseCallback)

		messageHandler({
			origin: 'https://acme.fermion.app',
			data: {
				type: 'video:pause',
				durationAtInSeconds: 42
			}
		} as MessageEvent)

		expect(pauseCallback).toHaveBeenCalledWith({ durationAtInSeconds: 42 })
	})

	test('should handle livestream ended event', () => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})

		const events = livestream.setupEventListenersOnVideo()
		const endedCallback = vi.fn()
		events.onVideoEnded(endedCallback)

		messageHandler({
			origin: 'https://acme.fermion.app',
			data: {
				type: 'video:ended'
			}
		} as MessageEvent)

		expect(endedCallback).toHaveBeenCalled()
	})

	test('should ignore events from different origin', () => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})

		const events = livestream.setupEventListenersOnVideo()
		const playCallback = vi.fn()
		events.onVideoPlay(playCallback)

		messageHandler({
			origin: 'https://malicious-site.com',
			data: {
				type: 'video:play',
				durationAtInSeconds: 42
			}
		} as MessageEvent)

		expect(playCallback).not.toHaveBeenCalled()
	})

	test('should remove event listener on dispose', () => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})

		const events = livestream.setupEventListenersOnVideo()
		events.dispose()
		expect(window.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function))
	})
})
