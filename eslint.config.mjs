import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:recipe',
              onlyDependOnLibsWithTags: ['scope:recipe', 'scope:shared'],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:app', 'type:shell'],
            },
            {
              sourceTag: 'type:shell',
              onlyDependOnLibsWithTags: [
                'type:shell',
                'type:feature',
                'type:state',
                'type:data-access',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:ui',
                'type:data-access',
                'type:util',
                'type:model',
              ],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:util', 'type:model'],
            },
            {
              sourceTag: 'type:state',
              onlyDependOnLibsWithTags: [
                'type:state',
                'type:data-access',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: [
                'type:data-access',
                'type:util',
                'type:model',
              ],
            },
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: [
                'type:util',
                'type:mock',
                'type:model',
              ],
            },
            {
              sourceTag: 'type:mock',
              onlyDependOnLibsWithTags: ['type:mock', 'type:model'],
            },
            {
              sourceTag: 'type:model',
              onlyDependOnLibsWithTags: ['type:model'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
