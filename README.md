# @fermion-app/sdk

[![npm version](https://img.shields.io/npm/v/@fermion-app/sdk.svg)](https://www.npmjs.com/package/@fermion-app/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Beta](https://img.shields.io/badge/Status-Beta-orange)](https://github.com/fermion-app/sdk)

> ⚠️ **Beta Status**: This SDK is currently in beta. While it's stable enough for testing, we recommend using it in production with caution. Please report any issues you encounter.

A modern TypeScript SDK for interacting with Fermion services. This library is isomorphic, meaning it works in both Node.js and browser environments, with some features restricted to server-side usage for security reasons.

## Features

-   🎥 Video embedding with Fermion's secure player
-   🔒 DRM protected playback and HLS clearkey support
-   🔄 Automatic access key refreshing
-   🌐 Isomorphic - works in both Node.js and browser
-   🔐 Server-side features for sensitive operations
-   📦 Written in TypeScript with full type support

## Installation

```bash
# Using npm
npm install @fermion-app/sdk

# Using yarn
yarn add @fermion-app/sdk

# Using pnpm
pnpm add @fermion-app/sdk
```

## Usage

### Importing

```typescript
import { FermionRecordedVideo } from '@fermion-app/sdk/recorded-video'
```

### Video Embedding

The SDK provides two methods for video embedding:

1. **Public Embedding** - For videos that are publicly accessible
2. **Private Embedding** - For videos that require authentication

```typescript
// Create a video instance
const video = new FermionRecordedVideo({
	videoId: 'your-video-id',
	websiteHostname: 'your-domain.fermion.app'
})

// Get public embed code
const publicEmbed = video.getPubliclyEmbedPlaybackIframeCode()
console.log(publicEmbed.iframeHtml)

// Get private embed code (requires JWT token)
const privateEmbed = video.getPrivateEmbedPlaybackIframeCode({
	jwtToken: 'your-jwt-token'
})
console.log(privateEmbed.iframeHtml)
```

### M3U8 Playback

For advanced use cases, you can use the M3U8 playback feature. This is useful when you need to:

-   Use a custom video player
-   Implement your own ABR (Adaptive Bitrate) logic
-   Handle video decryption manually

> **Important**: To use M3U8 playback, you must first call the Fermion API endpoint `get-signed-url-data-for-recorded-video-playback` from your backend server. This endpoint requires your Fermion API key and returns the necessary playback options. See the [API documentation](https://api.fermion.app/#tag/video/POST/public/get-signed-url-data-for-recorded-video-playback) for more details.

```typescript
// On your backend server
const playbackOptions = await fetch('<fermion API endpoint>')
```

Then use these options with the SDK:

```typescript
const video = new FermionRecordedVideo({
	videoId: 'your-video-id',
	websiteHostname: 'your-domain.fermion.app'
})

// Get M3U8 playback URL using the options from the API
const playbackUrl = await video.getM3U8PlaybackUrl({
	origin: playbackOptions.origin,
	m3u8Pathname: playbackOptions.m3u8Pathname,
	decryptionKey: playbackOptions.decryptionKey,
	signedUrlSearchParams: playbackOptions.signedUrlSearchParams
})
```

## Environment Support

This SDK is designed to work in both Node.js and browser environments:

-   **Browser**: All video embedding and playback features are available
-   **Node.js**: Full feature set including server-side operations

### Server-Side Requirements

Some features require server-side execution for security reasons:

-   Operations requiring Fermion API keys
-   Sensitive data handling
-   Token generation and validation
-   Fetching signed URL data for M3U8 playback

## Security Features

The SDK implements several security measures:

-   DRM protection for video content
-   HLS clearkey encryption
-   Presigned URLs for video segments
-   WAF protection for video storage
-   Rate limiting on decryption key requests

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import type {
	FermionRecordedVideoOptions,
	PrivateEmbedOptions,
	PlaybackSourceOptions,
	IframeEmbedResult
} from '@fermion-app/sdk/recorded-video'
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Since this SDK is in beta, we especially welcome:

-   Bug reports
-   Feature suggestions
-   Documentation improvements
-   Test coverage additions

## License

MIT © [Fermion](https://github.com/fermion-app)
