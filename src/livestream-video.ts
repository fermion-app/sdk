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
 * Options for processing M3U8 content
 */
interface M3U8Options {
	/** Base URL for livestream segments */
	segmentBaseUrl: string
	/** Signed URL parameters to append to segment URLs */
	signedUrlSearchParams: string
	/** URI for the decryption key */
	keyUri: string | null
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

import { validateIframeEvent } from './schemas'

/**
 * Event handlers for livestream events
 */
interface VideoEventHandlers {
	/** Callback function to be called when livestream starts playing */
	onVideoPlay: (callback: (data: { durationAtInSeconds: number }) => void) => void
	/** Callback function to be called when livestream is paused */
	onVideoPaused: (callback: (data: { durationAtInSeconds: number }) => void) => void
	/** Callback function to be called when livestream ends */
	onVideoEnded: (callback: () => void) => void
	/** Removes all event listeners and cleans up resources */
	dispose: () => void
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

	/**
	 * Process M3U8 content to handle encryption and signed URLs
	 */
	private processM3U8(m3u8Content: string, options: M3U8Options): string {
		const { segmentBaseUrl, keyUri, signedUrlSearchParams } = options

		const lines = m3u8Content.split('\n')
		const processedLines: string[] = []
		let keyInserted = false

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]?.trim() ?? ''

			if (line === '#EXTM3U') {
				processedLines.push(line)
			} else if (line.startsWith('#EXT-X-KEY')) {
				if (keyUri == null) {
					// nothing to do
				} else {
					const match = line.match(/IV=([^,]+)/)
					const iv = match?.[1]

					if (!iv) {
						throw new Error('IV not found in #EXT-X-KEY line')
					}

					if (!keyInserted) {
						processedLines.push(`#EXT-X-KEY:METHOD=AES-128,URI="${keyUri}",IV=${iv}`)
					} else {
						processedLines.push(line)
					}

					keyInserted = true
				}
			} else if (line !== '' && !line.startsWith('#')) {
				const fullUrl = `${segmentBaseUrl}/${line}${signedUrlSearchParams}`
				processedLines.push(fullUrl)
			} else {
				processedLines.push(line)
			}
		}

		return processedLines.join('\n')
	}

	/**
	 * Get M3U8 playback URL for the livestream
	 * @param options Playback source options containing quality, origin, pathname, decryption key and signed URL params
	 */
	public async getM3U8PlaybackUrl(options: PlaybackSourceOptions): Promise<string> {
		const { origin, masterM3u8Pathname, urlSearchParamString, clearkeyDecryptionKeyInHex } =
			options

		// Construct base URL
		const m3u8Url = `${origin}${masterM3u8Pathname}${urlSearchParamString}`

		// Download original file for further patching
		const m3u8Content = await fetch(m3u8Url).then(t => t.text())

		let keyUri: string | null
		if (clearkeyDecryptionKeyInHex) {
			// Construct the decryption key for HLS
			const decryptionKeyArray = new Uint8Array(clearkeyDecryptionKeyInHex.length / 2)

			for (let i = 0; i < clearkeyDecryptionKeyInHex.length; i += 2) {
				decryptionKeyArray[i / 2] = parseInt(
					clearkeyDecryptionKeyInHex.substring(i, i + 2),
					16
				)
			}

			// Convert Uint8Array to regular array for String.fromCharCode
			const decryptionKeyArrayRegular = Array.from(decryptionKeyArray)

			keyUri = `data:text/plain;base64,${window.btoa(
				String.fromCharCode.apply(null, decryptionKeyArrayRegular)
			)}`
		} else {
			keyUri = null
		}

		// Construct the final m3u8 playable URL
		const finalM3U8 = this.processM3U8(m3u8Content, {
			segmentBaseUrl: `${origin}${masterM3u8Pathname.split('/').slice(0, -1).join('/')}`,
			signedUrlSearchParams: urlSearchParamString,
			keyUri
		})

		// Create and return blob URL
		return URL.createObjectURL(new Blob([finalM3U8], { type: 'text/plain' }))
	}

	/**
	 * Sets up event listeners for livestream events from the iframe.
	 * This method allows you to listen for livestream events (play, pause, end)
	 * through postMessage communication with the livestream iframe.
	 * Multiple calls to this method will create independent event subscriptions.
	 *
	 * @returns {VideoEventHandlers} An object containing methods to set up event callbacks and dispose of listeners
	 * @example
	 * ```typescript
	 * const livestream = new FermionLivestreamVideo({ liveEventSessionId: '123', websiteHostname: 'example.fermion.app' });
	 * const events = livestream.setupEventListenersOnVideo();
	 *
	 * events.onVideoPlay(() => console.log('Livestream started playing'));
	 * events.onVideoPaused(() => console.log('Livestream was paused'));
	 * events.onVideoEnded(() => console.log('Livestream ended'));
	 *
	 * // When done, clean up the listeners
	 * events.dispose();
	 * ```
	 */
	setupEventListenersOnVideo(): VideoEventHandlers {
		const eventCallbacks: {
			play?: (data: { durationAtInSeconds: number }) => void
			pause?: (data: { durationAtInSeconds: number }) => void
			ended?: () => void
		} = {}

		const messageHandler = (event: MessageEvent<unknown>) => {
			// Verify the message is from our iframe
			if (!event.origin.includes(this.websiteHostname)) return

			try {
				const data = validateIframeEvent(event.data)

				switch (data.type) {
					case 'video:play':
						eventCallbacks.play?.({ durationAtInSeconds: data.durationAtInSeconds })
						break
					case 'video:pause':
						eventCallbacks.pause?.({ durationAtInSeconds: data.durationAtInSeconds })
						break
					case 'video:ended':
						eventCallbacks.ended?.()
						break
				}
			} catch (error) {
				// Invalid event data, ignore
				console.warn('Received invalid video event data:', error)
			}
		}

		window.addEventListener('message', messageHandler)

		return {
			onVideoPlay: callback => {
				eventCallbacks.play = callback
			},
			onVideoPaused: callback => {
				eventCallbacks.pause = callback
			},
			onVideoEnded: callback => {
				eventCallbacks.ended = callback
			},
			dispose: () => {
				window.removeEventListener('message', messageHandler)
			}
		}
	}
}
