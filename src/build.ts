import { build } from 'tsup'
import { execSync } from 'child_process'

async function run() {
	await Promise.all([
		build({
			entry: ['src/index.ts'],
			format: ['cjs'],
			target: 'es2015',
			splitting: false,
			clean: true,
			dts: true,
			outDir: 'dist-old',
			ignoreWatch: ['**/*.test.ts'],
			noExternal: ['zod'],
			esbuildOptions(options) {
				options.platform = 'neutral'
			}
		}),

		build({
			entry: ['src/recorded-video.ts', 'src/livestream-video.ts', 'src/test.ts'],
			format: ['cjs', 'esm'],
			target: 'esnext',
			splitting: false,
			clean: true,
			dts: true,
			outDir: 'dist-modern',
			ignoreWatch: ['**/*.test.ts']
		})
	])

	execSync('rm -rf dist || true')
	execSync('mkdir -p dist')
	execSync('cp -a dist-old/. dist/')
	execSync('cp -a dist-modern/. dist/')

	execSync('rm -rf dist-modern dist-old')
}

void run()

export {}
