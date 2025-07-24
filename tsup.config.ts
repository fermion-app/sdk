import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts', 'src/recorded-video.ts', 'src/livestream-video.ts', 'src/test.ts'],
	format: ['cjs', 'esm'],
	dts: true,
	outDir: 'dist',
	clean: true,
	target: 'es2018',
	ignoreWatch: ['**/*.test.ts'],
	esbuildOptions(options) {
		options.platform = 'neutral'
	}
})
