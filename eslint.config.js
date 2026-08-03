import tseslint from 'typescript-eslint';
import globals from 'globals';
import unusedImports from 'eslint-plugin-unused-imports';
import prettierConfig from 'eslint-config-prettier';

export default [
    {
        ignores: ['dist/', 'node_modules/', 'coverage/']
    },
    ...tseslint.configs.recommended,
    ...tseslint.configs.strict,
    {
        files: ['**/*.ts'], // 仅对 TS 文件启用检查
        languageOptions: {
            // parserOptions: {
            //     project: './tsconfig.eslint.json',
            //     tsconfigRootDir: import.meta.dirname
            // },
            globals: {
                ...globals.node,
                ...globals.es2025
            }
        },
        plugins: {
            'unused-imports': unusedImports
        },
        rules: {
            '@typescript-eslint/ban-ts-comment': 'off',

            // 自动化清理
            'unused-imports/no-unused-imports': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }
            ],

            '@typescript-eslint/no-dynamic-delete': 'off',
            '@typescript-eslint/unified-signatures': 'off',
            '@typescript-eslint/no-namespace': ['off', { allowDeclarations: true }],
            '@typescript-eslint/no-this-alias': ['error', { allowedNames: ['self', '_self'] }],
            'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
            'eqeqeq': ['error', 'always', { null: 'ignore' }],
            'curly': ['error', 'all'],
            'no-unused-expressions': 'error',
            'no-use-before-define': 'off',
            'no-undef': 'off',
            'require-atomic-updates': 'off',
            'init-declarations': 'off',
            'camelcase': 'off'
        }
    },
    prettierConfig
];
