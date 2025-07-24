import { describe, test } from 'vitest'
import { FermionLivestreamVideo } from './livestream-video'

describe('FermionLivestreamVideo', () => {
	test('should create instance with valid hostname', ({ expect }) => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})
		expect(livestream).toBeInstanceOf(FermionLivestreamVideo)
	})

	test('should throw error with invalid hostname', ({ expect }) => {
		expect(() => {
			new FermionLivestreamVideo({
				liveEventSessionId: 'test-session-id',
				websiteHostname: 'invalid hostname'
			})
		}).toThrow('Invalid website hostname')
	})

	test('should return iframe URL and HTML with token for private embedding', ({ expect }) => {
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

	test('should encode both live event session ID and token in private iframe URL', ({
		expect
	}) => {
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

	test('should return HLS playback config with encrypted content', async ({ expect }) => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})

		const result = await livestream.getHlsPlaybackConfig({
			origin: 'https://cdn.example.com',
			masterM3u8Pathname: '/livestream/playlist.m3u8',
			clearkeyDecryptionKeyInHex: '1234567890abcdef',
			urlSearchParamString: '?token=test'
		})

		expect(result).toHaveProperty('sourceUrl')
		expect(result).toHaveProperty('PlaylistLoader')
		expect(result.sourceUrl).toBe('https://cdn.example.com/livestream/playlist.m3u8?token=test')
		expect(typeof result.PlaylistLoader).toBe('function')
	})

	test('should return HLS playback config with unencrypted content', async ({ expect }) => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})

		const result = await livestream.getHlsPlaybackConfig({
			origin: 'https://cdn.example.com',
			masterM3u8Pathname: '/livestream/playlist.m3u8',
			clearkeyDecryptionKeyInHex: null,
			urlSearchParamString: '?token=test'
		})

		expect(result).toHaveProperty('sourceUrl')
		expect(result).toHaveProperty('PlaylistLoader')
		expect(result.sourceUrl).toBe('https://cdn.example.com/livestream/playlist.m3u8?token=test')
		expect(typeof result.PlaylistLoader).toBe('function')
	})

	test('should handle M3U8 content with missing IV', async ({ expect }) => {
		const livestream = new FermionLivestreamVideo({
			liveEventSessionId: 'test-session-id',
			websiteHostname: 'acme.fermion.app'
		})

		const result = await livestream.getHlsPlaybackConfig({
			origin: 'https://cdn.example.com',
			masterM3u8Pathname: '/livestream/playlist.m3u8',
			clearkeyDecryptionKeyInHex: '1234567890abcdef',
			urlSearchParamString: '?token=test'
		})

		expect(result).toHaveProperty('sourceUrl')
		expect(result).toHaveProperty('PlaylistLoader')
		expect(result.sourceUrl).toBe('https://cdn.example.com/livestream/playlist.m3u8?token=test')
		expect(typeof result.PlaylistLoader).toBe('function')
	})
})
