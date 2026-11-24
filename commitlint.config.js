/** @type {import('@commitlint/types').UserConfig} */
export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'scope-enum': [
			1,
			'always',
			[
				'repo',
				'config',
				'db',
				'ci',
				'docker',
				'docs',
				'deps',
				'auth',
				'rbac',
				'users',
				'roles',
				'api',
				'ui',
				'design',
				'storage',
				'email',
				'security'
			]
		],
		'header-max-length': [2, 'always', 72]
	}
};
