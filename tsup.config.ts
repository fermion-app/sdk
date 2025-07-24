import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts', 'src/recorded-video.ts', 'src/livestream-video.ts', 'src/test.ts'],
	format: ['cjs', 'esm'],
	target: 'es2015',
	splitting: false,
	clean: true,
	dts: true,
	outDir: 'dist',
	ignoreWatch: ['**/*.test.ts'],
	noExternal: ['zod'],
	esbuildOptions(options) {
		options.platform = 'neutral'
	}
})
