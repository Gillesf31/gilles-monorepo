import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppVersionNotificationComponent } from '@gilles-monorepo/feature-app-version';
import {
  ThemeToggleComponent,
} from '@gilles-monorepo/feature-theme';

@Component({
  selector: 'gilles-monorepo-shell',
  imports: [
    RouterOutlet,
    ThemeToggleComponent,
    AppVersionNotificationComponent,
  ],
  template: `
    <router-outlet />
    <gilles-monorepo-app-version-notification />
    <gilles-monorepo-theme-toggle />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {}
