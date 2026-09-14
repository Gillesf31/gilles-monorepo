# feature-theme

Provide `provideTheme()` from the app's shell and import `src/styles.css` in
the app's global stylesheet. Set `--theme-background-light` and
`--theme-background-dark` on `:root` using the app's Tailwind palette.

The shared stylesheet paints the document and iOS safe areas before bootstrap.
`ThemeService` keeps the browser theme color in sync with that background.

## Running unit tests

Run `nx test feature-theme` to execute the unit tests.
