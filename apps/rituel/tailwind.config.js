const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    join(__dirname, '../../libs/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      colors: {
        rituel: {
          background: '#f7f6f4', ink: '#383735', 'ink-strong': '#302f2d',
          muted: '#6b6964', 'muted-label': '#696761', subtle: '#85817a',
          surface: '#fffefd', border: '#e1dfda', 'input-border': '#c9c6bf',
          'action-bg': '#393836', 'action-text': '#fffefd', 'action-hover': '#4c4a46',
          'cadence-surface': '#f1f0ed', 'cadence-border': '#ddd9d2', 'cadence-dot': '#a7a39a',
          accent: '#e97057', 'accent-soft': '#f6c9b8', focus: 'rgb(233 112 87 / 55%)',
          'focus-soft': 'rgb(233 112 87 / 35%)', separator: '#d8d5ce',
          'today-bg': '#393836', 'today-text': '#fbfaf7', 'today-muted': '#d3d0c9',
          'today-secondary': '#e4e1da', 'overdue-bg': '#fff4ee', 'overdue-border': '#d06b57',
          error: '#9f3f2d', warning: '#f3c35c', 'warning-glow': 'rgb(243 195 92 / 20%)',
          'dark-background': '#161616', 'dark-ink': '#edebe7', 'dark-ink-strong': '#edebe7',
          'dark-muted': '#c1beb7', 'dark-muted-label': '#b9b6af', 'dark-subtle': '#cbc8c0',
          'dark-surface': '#232321', 'dark-border': '#42413e', 'dark-input-border': '#605e59',
          'dark-action-bg': '#dedbd4', 'dark-action-text': '#242321', 'dark-action-hover': '#eeece6',
          'dark-cadence-surface': '#302f2c', 'dark-cadence-border': '#56544f', 'dark-cadence-dot': '#8f8b82',
          'dark-accent': '#ff9c83', 'dark-accent-soft': '#633b32', 'dark-focus': 'rgb(255 156 131 / 70%)',
          'dark-focus-soft': 'rgb(255 156 131 / 45%)', 'dark-separator': '#4e4c47',
          'dark-today-bg': '#3a3935', 'dark-today-text': '#f2f0eb', 'dark-today-muted': '#d7d3ca',
          'dark-today-secondary': '#e7e3da', 'dark-overdue-bg': '#3b2420', 'dark-overdue-border': '#a95e50',
          'dark-error': '#ffa28c', 'dark-warning': '#f7cd72', 'dark-warning-glow': 'rgb(247 205 114 / 25%)',
        },
      },
    },
  },
  plugins: [],
};
