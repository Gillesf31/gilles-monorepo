import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeToggleComponent } from '@gilles-monorepo/feature-theme';
import { AppVersionNotificationComponent } from '@gilles-monorepo/rituel-feature-app-version';

@Component({
  selector: 'lib-rituel-shell',
  imports: [
    RouterOutlet,
    ThemeToggleComponent,
    AppVersionNotificationComponent,
  ],
  templateUrl: './rituel-shell.html',
})
export class RituelShellComponent {}
