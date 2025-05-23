import { describe, test, expect, vi } from 'vitest'
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
})
