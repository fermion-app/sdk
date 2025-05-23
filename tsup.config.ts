import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/*.ts', '!src/**/*.test.ts'],
	format: ['cjs', 'esm'],
	dts: true,
	outDir: 'dist',
	clean: true,
	ignoreWatch: ['**/*.test.ts']
})
