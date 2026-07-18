import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeToggleComponent } from '@gilles-monorepo/feature-theme';

@Component({
  selector: 'lib-rituel-shell',
  imports: [RouterOutlet, ThemeToggleComponent],
  templateUrl: './rituel-shell.html',
  styleUrl: './rituel-shell.css',
})
export class RituelShellComponent {}
