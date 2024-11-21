import eslint from '@eslint/js';

import tsEslintPlugin from '@typescript-eslint/eslint-plugin';
import tsEslintParser from '@typescript-eslint/parser';
import tsEslint from 'typescript-eslint';
import globals from 'globals';

const tsConfig = [
	{
		name: 'typescript-eslint/base',
		languageOptions: {
			parser: tsEslintParser,
			sourceType: 'module',
		},
		files: ['**/*.{js, ts, mjs}'],
		rules: {
			...tsEslintPlugin.configs.recommended.rules
		},
		plugins: {
			'@typescript-eslint': tsEslintPlugin,
		},
	},
];
const globalConfig = [
	{
		ignores: ['dist', '.nyc_output', 'coverage']
	},
	{
		name: 'global-config',
		languageOptions: {
			globals: {
				...globals.es2021,
				...globals.node,
				jest: true,
				describe: true,
				test: true,
				expect: true,
				it: true,
				beforeAll: true,
				afterAll: true
			},
			parserOptions: {
				warnOnUnsupportedTypeScriptVersion: false,
			},
		},
		rules: {
			'no-dupe-class-members': "off",
			'@typescript-eslint/no-dupe-class-members': "error",
			'@typescript-eslint/only-throw-error': 0,
			'@typescript-eslint/no-explicit-any': 2,
			'@typescript-eslint/no-this-alias': [
				'error',
				{
					allowDestructuring: true, // Allow `const { props, state } = this`; false by default
					allowedNames: ['self'] // Allow `const self = this`; `[]` by default
				}
			],
			'@typescript-eslint/no-unused-vars': [2, { 'vars': 'all', 'args': 'after-used' }],
			'@typescript-eslint/no-redeclare': 2, //禁止重复声明变量
			'no-caller': 2, //禁止使用arguments.caller或arguments.callee
			'no-console': 2, //不能使用console
			'no-constant-condition': 2, // 禁止在条件中使用常量表达式 if(true) if(1)
			'no-func-assign': 2, //禁止重复的函数声明
			'camelcase': 2, //强制驼峰法命名
			'consistent-this': [2, 'self'], //this别名
			'no-multi-str': 2, //字符串不能用\换行
			'no-undef': 2, //不能有未定义的变量
			'no-sparse-arrays': 2, //禁止稀疏数组， [1,,2]
			'no-unreachable': 2, //不能有无法执行的代码
			'no-unused-expressions': 2, //禁止无用的表达式 如：err? a = 1 : a = 2;
			'no-unused-vars': [2, { 'vars': 'all', 'args': 'after-used' }], //不能有声明后未被使用的变量或参数
			// 'no-use-before-define': 2, //未定义前不能使用
			'no-extra-boolean-cast': 2, //禁止不必要的boolean转换 如：!!a
			'no-void': 2, //禁用void操作符
			'no-var': 2, //禁用var，用let和const代替
			'curly': [2, 'all'], //必须使用 if(){} 中的{}
			'default-case': 2, //switch语句最后必须有default
			'dot-notation': [0, { 'allowKeywords': true }], //取对象属性使用[]获取
			eqeqeq: 2, //必须使用全等
			'init-declarations': 2, //声明时必须赋初值
			'id-match': 0, //命名检测
			'sort-vars': 0, //变量声明时排序
			strict: 2, //使用严格模式
			'use-isnan': 2, //禁止比较时使用NaN，只能用isNaN()
			'valid-typeof': 2, //必须使用合法的typeof的值
			'no-useless-escape': 2, //可以进行必要的转义，考虑正则表达式
			'require-atomic-updates': 'off'
		}
	}
];

export default [
	eslint.configs.recommended,
	...globalConfig,
	...tsEslint.configs.recommended,
	...tsConfig
];
