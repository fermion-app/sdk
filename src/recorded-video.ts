/**
 * Options for initializing a FermionRecordedVideo instance
 */
export interface FermionRecordedVideoOptions {
	/** Unique identifier of the video on Fermion */
	videoId: string
	/** Your Fermion website hostname (e.g., acme.fermion.app) */
	websiteHostname: string
}

/**
 * Options for private video embedding
 */
export interface PrivateEmbedOptions {
	/** JWT token for authenticating private video access */
	jwtToken: string
}

/**
 * Options for M3U8 playback source
 */
interface PlaybackSourceOptions {
	/** CDN origin URL for the video */
	origin: string
	/** Path to the M3U8 playlist file */
	m3u8Pathname: string
	/** Key for decrypting the video content */
	decryptionKey: string
	/** Signed URL parameters for authentication */
	signedUrlSearchParams: string
}

/**
 * Options for processing M3U8 content
 */
interface M3U8Options {
	/** Base URL for video segments */
	segmentBaseUrl: string
	/** Signed URL parameters to append to segment URLs */
	signedUrlSearchParams: string
	/** URI for the decryption key */
	keyUri: string
}

/**
 * Result of iframe embedding methods
 */
export interface IframeEmbedResult {
	/** URL for the video iframe */
	iframeUrl: string
	/** Complete HTML code for the iframe */
	iframeHtml: string
}

import { validateIframeEvent } from './schemas'

/**
 * Event handlers for video playback events
 */
interface VideoEventHandlers {
	/** Callback function to be called when video starts playing */
	onVideoPlay: (callback: (data: { durationAtInSeconds: number }) => void) => void
	/** Callback function to be called when video is paused */
	onVideoPaused: (callback: (data: { durationAtInSeconds: number }) => void) => void
	/** Callback function to be called when video playback ends */
	onVideoEnded: (callback: () => void) => void
	/** Removes all event listeners and cleans up resources */
	dispose: () => void
}

export class FermionRecordedVideo {
	private videoId: string
	private websiteHostname: string
	private eventListenerCleanup: (() => void) | null = null

	constructor(options: FermionRecordedVideoOptions) {
		this.videoId = options.videoId

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
	 * Get iframe code for publicly embeddable video
	 */
	getPubliclyEmbedPlaybackIframeCode(): IframeEmbedResult {
		const encodedVideoId = encodeURIComponent(this.videoId)
		const iframeUrl = `https://${this.websiteHostname}/embed/recorded-video?video-id=${encodedVideoId}`
		const iframeHtml = `<iframe
      width="1280"
      height="720"
      src="${iframeUrl}"
      title="Video"
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
	 * Get iframe code for privately embeddable video (requires JWT token)
	 */
	getPrivateEmbedPlaybackIframeCode(options: PrivateEmbedOptions): IframeEmbedResult {
		const encodedVideoId = encodeURIComponent(this.videoId)
		const encodedToken = encodeURIComponent(options.jwtToken)
		const iframeUrl = `https://${this.websiteHostname}/embed/recorded-video?video-id=${encodedVideoId}&token=${encodedToken}`
		const iframeHtml = `<iframe
      width="1280"
      height="720"
      src="${iframeUrl}"
      title="Video"
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
	 * Get M3U8 playback URL for the video
	 * @param options Playback source options containing quality, origin, pathname, decryption key and signed URL params
	 */
	async getM3U8PlaybackUrl(options: PlaybackSourceOptions): Promise<string> {
		const { origin, m3u8Pathname, signedUrlSearchParams, decryptionKey } = options

		// Construct base URL
		const m3u8Url = `${origin}${m3u8Pathname}${signedUrlSearchParams}`

		// Download original file for further patching
		const m3u8Content = await fetch(m3u8Url).then(t => t.text())

		// Construct the decryption key for HLS
		const decryptionKeyArray = new Uint8Array(decryptionKey.length / 2)

		for (let i = 0; i < decryptionKey.length; i += 2) {
			decryptionKeyArray[i / 2] = parseInt(decryptionKey.substring(i, i + 2), 16)
		}

		// Convert Uint8Array to regular array for String.fromCharCode
		const decryptionKeyArrayRegular = Array.from(decryptionKeyArray)

		// Construct the final m3u8 playable URL
		const finalM3U8 = this.processM3U8(m3u8Content, {
			segmentBaseUrl: `${origin}${m3u8Pathname.split('/').slice(0, -1).join('/')}`,
			signedUrlSearchParams,
			keyUri: `data:text/plain;base64,${window.btoa(
				String.fromCharCode.apply(null, decryptionKeyArrayRegular)
			)}`
		})

		// Create and return blob URL
		return URL.createObjectURL(new Blob([finalM3U8], { type: 'text/plain' }))
	}

	/**
	 * Sets up event listeners for video events from the iframe.
	 * This method allows you to listen for video playback events (play, pause, end)
	 * through postMessage communication with the video iframe.
	 * Multiple calls to this method will create independent event subscriptions.
	 *
	 * @returns {VideoEventHandlers} An object containing methods to set up event callbacks and dispose of listeners
	 * @example
	 * ```typescript
	 * const video = new FermionRecordedVideo({ videoId: '123', websiteHostname: 'example.fermion.app' });
	 * const events = video.setupEventListenersOnVideo();
	 *
	 * events.onVideoPlay(() => console.log('Video started playing'));
	 * events.onVideoPaused(() => console.log('Video was paused'));
	 * events.onVideoEnded(() => console.log('Video ended'));
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
