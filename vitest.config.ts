import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'happy-dom',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/**',
				'dist/**',
				'**/*.d.ts',
				'test/**',
				'**/*.test.ts',
				'**/*.config.ts',
				'.changeset/**'
			]
		}
	}
})
