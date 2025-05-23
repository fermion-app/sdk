module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'prettier'],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'prettier'
	],
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
		project: './tsconfig.json'
	},
	env: {
		browser: true,
		es2020: true,
		node: true
	},
	rules: {
		'prettier/prettier': 'error',
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/no-explicit-any': 'error',
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'@typescript-eslint/no-non-null-assertion': 'error',
		'@typescript-eslint/no-floating-promises': 'error',
		'@typescript-eslint/no-misused-promises': 'error',
		'@typescript-eslint/await-thenable': 'error',
		'@typescript-eslint/no-unsafe-assignment': 'error',
		'@typescript-eslint/no-unsafe-member-access': 'error',
		'@typescript-eslint/no-unsafe-call': 'error',
		'@typescript-eslint/no-unsafe-return': 'error',
		'@typescript-eslint/restrict-template-expressions': 'error',
		'@typescript-eslint/unbound-method': 'error'
	}
}
