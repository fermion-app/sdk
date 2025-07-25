import * as z from 'zod'

/**
 * Schema for iframe events
 */
export const iframeEventSchema = z
	.object({
		type: z.literal('video:play'),
		durationAtInSeconds: z.number()
	})
	.or(
		z.object({
			type: z.literal('video:pause'),
			durationAtInSeconds: z.number()
		})
	)
	.or(
		z.object({
			type: z.literal('video:ended')
		})
	)
	.or(
		z.object({
			type: z.literal('video:livestream-ended')
		})
	)
	.or(
		z.object({
			type: z.literal('webrtc:livestream-ended')
		})
	)
	.or(
		z.object({
			type: z.literal('video:time-updated'),
			currentTimeInSeconds: z.number()
		})
	)

/**
 * Type for iframe events
 */
export type IframeEvent = z.infer<typeof iframeEventSchema>

/**
 * Validates if the given data matches the iframe event schema
 * @param data - The data to validate
 * @returns The validated data if successful, throws error if invalid
 */
export function validateIframeEvent(data: unknown): IframeEvent {
	return iframeEventSchema.parse(data)
}
