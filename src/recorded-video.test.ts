import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { FermionRecordedVideo } from './recorded-video'

describe('FermionRecordedVideo', () => {
	test('should create instance with valid hostname', () => {
		const video = new FermionRecordedVideo({
			videoId: 'test-video-id',
			websiteHostname: 'acme.fermion.app'
		})
		expect(video).toBeInstanceOf(FermionRecordedVideo)
	})

	test('should throw error with invalid hostname', () => {
		expect(() => {
			new FermionRecordedVideo({
				videoId: 'test-video-id',
				websiteHostname: 'invalid hostname'
			})
		}).toThrow('Invalid website hostname')
	})

	test('should return iframe URL and HTML for public embedding', () => {
		const video = new FermionRecordedVideo({
			videoId: 'test-video-id',
			websiteHostname: 'acme.fermion.app'
		})
		const result = video.getPubliclyEmbedPlaybackIframeCode()

		expect(result).toHaveProperty('iframeUrl')
		expect(result).toHaveProperty('iframeHtml')
		expect(result.iframeUrl).toContain('acme.fermion.app')
		expect(result.iframeUrl).toContain('test-video-id')
		expect(result.iframeHtml).toContain(result.iframeUrl)
	})

	test('should encode video ID in public iframe URL', () => {
		const video = new FermionRecordedVideo({
			videoId: 'test/video/id',
			websiteHostname: 'acme.fermion.app'
		})
		const result = video.getPubliclyEmbedPlaybackIframeCode()
		expect(result.iframeUrl).toContain('test%2Fvideo%2Fid')
	})

	test('should return iframe URL and HTML with token for private embedding', () => {
		const video = new FermionRecordedVideo({
			videoId: 'test-video-id',
			websiteHostname: 'acme.fermion.app'
		})
		const result = video.getPrivateEmbedPlaybackIframeCode({
			jwtToken: 'test-token'
		})

		expect(result).toHaveProperty('iframeUrl')
		expect(result).toHaveProperty('iframeHtml')
		expect(result.iframeUrl).toContain('acme.fermion.app')
		expect(result.iframeUrl).toContain('test-video-id')
		expect(result.iframeUrl).toContain('test-token')
		expect(result.iframeHtml).toContain(result.iframeUrl)
	})

	test('should encode both video ID and token in private iframe URL', () => {
		const video = new FermionRecordedVideo({
			videoId: 'test/video/id',
			websiteHostname: 'acme.fermion.app'
		})
		const result = video.getPrivateEmbedPlaybackIframeCode({
			jwtToken: 'test/token'
		})

		expect(result.iframeUrl).toContain('test%2Fvideo%2Fid')
		expect(result.iframeUrl).toContain('test%2Ftoken')
	})

	test('should process M3U8 content and return blob URL', async () => {
		const video = new FermionRecordedVideo({
			videoId: 'test-video-id',
			websiteHostname: 'acme.fermion.app'
		})

		// Mock fetch response
		global.fetch = vi.fn().mockResolvedValue({
			text: () =>
				Promise.resolve(
					'#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key",IV=123\nsegment1.ts\nsegment2.ts'
				)
		})

		const result = await video.getM3U8PlaybackUrl({
			origin: 'https://cdn.example.com',
			m3u8Pathname: '/video/playlist.m3u8',
			decryptionKey: '1234567890abcdef',
			signedUrlSearchParams: '?token=test'
		})

		expect(result).toMatch(/^blob:/)
		expect(fetch).toHaveBeenCalled()
	})

	test('should throw error if IV not found in M3U8 content', async () => {
		const video = new FermionRecordedVideo({
			videoId: 'test-video-id',
			websiteHostname: 'acme.fermion.app'
		})

		// Mock fetch response with invalid M3U8 content
		global.fetch = vi.fn().mockResolvedValue({
			text: () => Promise.resolve('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\nsegment1.ts')
		})

		await expect(
			video.getM3U8PlaybackUrl({
				origin: 'https://cdn.example.com',
				m3u8Pathname: '/video/playlist.m3u8',
				decryptionKey: '1234567890abcdef',
				signedUrlSearchParams: '?token=test'
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

	test('should handle video play event with duration', () => {
		const video = new FermionRecordedVideo({
			videoId: 'test-video-id',
			websiteHostname: 'acme.fermion.app'
		})

		const events = video.setupEventListenersOnVideo()
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

	test('should handle video pause event with duration', () => {
		const video = new FermionRecordedVideo({
			videoId: 'test-video-id',
			websiteHostname: 'acme.fermion.app'
		})

		const events = video.setupEventListenersOnVideo()
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

	test('should handle video ended event', () => {
		const video = new FermionRecordedVideo({
			videoId: 'test-video-id',
			websiteHostname: 'acme.fermion.app'
		})

		const events = video.setupEventListenersOnVideo()
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
		const video = new FermionRecordedVideo({
			videoId: 'test-video-id',
			websiteHostname: 'acme.fermion.app'
		})

		const events = video.setupEventListenersOnVideo()
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
		const video = new FermionRecordedVideo({
			videoId: 'test-video-id',
			websiteHostname: 'acme.fermion.app'
		})

		const events = video.setupEventListenersOnVideo()
		events.dispose()
		expect(window.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function))
	})
})
