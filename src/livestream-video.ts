import Hls from 'hls.js'
import type {
	HlsConfig,
	Loader,
	LoaderCallbacks,
	LoaderConfiguration,
	LoaderStats,
	PlaylistLoaderContext
} from 'hls.js'

/**
 * Options for initializing a FermionLivestreamVideo instance
 */
export interface FermionLivestreamVideoOptions {
	/** Unique identifier of the livestream session on Fermion */
	liveEventSessionId: string
	/** Your Fermion website hostname (e.g., acme.fermion.app) */
	websiteHostname: string
}

/**
 * Options for private livestream embedding
 */
export interface PrivateEmbedOptions {
	/** JWT token for authenticating private livestream access */
	jwtToken: string
}

/**
 * Options for M3U8 playback source
 */
interface PlaybackSourceOptions {
	/** CDN origin URL for the livestream */
	origin: string
	/** Path to the M3U8 playlist file */
	masterM3u8Pathname: string
	/** Key for decrypting the livestream content */
	clearkeyDecryptionKeyInHex: string | null
	/** Signed URL parameters for authentication */
	urlSearchParamString: string
}

/**
 * Result of iframe embedding methods
 */
export interface IframeEmbedResult {
	/** URL for the livestream iframe */
	iframeUrl: string
	/** Complete HTML code for the iframe */
	iframeHtml: string
}

export class FermionLivestreamVideo {
	private liveEventSessionId: string
	private websiteHostname: string

	constructor(options: FermionLivestreamVideoOptions) {
		this.liveEventSessionId = options.liveEventSessionId

		try {
			// Try to construct a URL with the hostname to validate it
			new URL(`https://${options.websiteHostname}`)
			this.websiteHostname = options.websiteHostname
		} catch (error) {
			throw new Error(
				'Invalid website hostname. Please provide a valid hostname (e.g., acme.fermion.app)'
			)
		}
	}

	/**
	 * Get iframe code for privately embeddable livestream (requires JWT token)
	 */
	getPrivateEmbedPlaybackIframeCode(options: PrivateEmbedOptions): IframeEmbedResult {
		const encodedLiveEventSessionId = encodeURIComponent(this.liveEventSessionId)
		const encodedToken = encodeURIComponent(options.jwtToken)
		const iframeUrl = `https://${this.websiteHostname}/embed/live-session?liveEventSessionId=${encodedLiveEventSessionId}&token=${encodedToken}`
		const iframeHtml = `<iframe
      width="1280"
      height="720"
      src="${iframeUrl}"
      title="Livestream"
      frameborder="0"
      allow="allow-same-origin; camera *;microphone *;display-capture *;encrypted-media;"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    ></iframe>`

		return {
			iframeUrl,
			iframeHtml
		}
	}

	private createCustomLoader({
		signedUrlParam,
		keyUri
	}: {
		signedUrlParam: string
		keyUri: string | null
	}) {
		return class PlaylistLoader implements Loader<PlaylistLoaderContext> {
			internalLoader: Loader<PlaylistLoaderContext>
			context: PlaylistLoaderContext
			stats: LoaderStats

			constructor(config: HlsConfig) {
				this.internalLoader = new Hls.DefaultConfig.loader(
					config
				) as Loader<PlaylistLoaderContext>
				this.context = {
					type: 'manifest',
					level: 0,
					id: 0,
					deliveryDirectives: null,
					levelOrTrack: null
				} as PlaylistLoaderContext
				this.stats = {} as LoaderStats
			}

			load(
				context: PlaylistLoaderContext,
				config: LoaderConfiguration,
				callbacks: LoaderCallbacks<PlaylistLoaderContext>
			) {
				const originalSuccess = callbacks.onSuccess
				callbacks.onSuccess = (response, stats, ctx, networkDetails) => {
					if (
						context.type === ('manifest' as PlaylistLoaderContext['type']) ||
						context.type === ('level' as PlaylistLoaderContext['type'])
					) {
						if (typeof response.data === 'string') {
							response.data = this.patchM3U8(response.data)
						}
					}
					originalSuccess(response, stats, ctx, networkDetails)
				}
				this.internalLoader.load(context, config, callbacks)
			}

			patchM3U8(original: string): string {
				return original
					.split('\n')
					.map(line => {
						const trimmedLine = line.trim()

						if (trimmedLine.startsWith('#EXT-X-KEY') && keyUri) {
							const ivMatch = trimmedLine.match(/IV=([^,]+)/)
							if (!ivMatch) return line
							return `#EXT-X-KEY:METHOD=AES-128,URI="${keyUri}",IV=${ivMatch[1]}`
						}

						if (trimmedLine === '' || trimmedLine.startsWith('#')) return line

						return trimmedLine.includes('?')
							? `${trimmedLine}&${signedUrlParam.substring(1)}`
							: `${trimmedLine}${signedUrlParam}`
					})
					.join('\n')
			}

			abort() {
				if (this.internalLoader.abort) this.internalLoader.abort()
			}

			destroy() {
				if (this.internalLoader.destroy) this.internalLoader.destroy()
			}
		}
	}

	public getHlsPlaybackConfig(options: PlaybackSourceOptions) {
		const { origin, masterM3u8Pathname, urlSearchParamString, clearkeyDecryptionKeyInHex } =
			options

		const m3u8Url = `${origin}${masterM3u8Pathname}${urlSearchParamString}`

		let keyUri: string | null = null

		if (clearkeyDecryptionKeyInHex) {
			const bytes = new Uint8Array(clearkeyDecryptionKeyInHex.length / 2)
			for (let i = 0; i < clearkeyDecryptionKeyInHex.length; i += 2) {
				bytes[i / 2] = parseInt(clearkeyDecryptionKeyInHex.substring(i, i + 2), 16)
			}

			keyUri = `data:text/plain;base64,${window.btoa(String.fromCharCode(...bytes))}`
		}

		const PlaylistLoader = this.createCustomLoader({
			signedUrlParam: urlSearchParamString,
			keyUri
		})

		return {
			sourceUrl: m3u8Url,
			PlaylistLoader
		}
	}
}
