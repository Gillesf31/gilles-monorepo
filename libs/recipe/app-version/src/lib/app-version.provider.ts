import { Injectable, NgZone, inject, provideEnvironmentInitializer } from '@angular/core';

type AppVersion = {
  version?: string;
  builtAt?: string;
  commit?: string | null;
};

@Injectable({ providedIn: 'root' })
class AppVersionService {
  private readonly zone = inject(NgZone);
  private readonly storageKey = 'recipe-app-version';
  private checkInProgress = false;
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    void this.checkForUpdate();

    this.zone.runOutsideAngular(() => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void this.checkForUpdate();
        }
      });

      window.addEventListener('focus', () => {
        void this.checkForUpdate();
      });
    });
  }

  private async checkForUpdate(): Promise<void> {
    if (this.checkInProgress) {
      return;
    }

    this.checkInProgress = true;

    try {
      const remoteVersion = await this.fetchVersion();

      if (!remoteVersion) {
        return;
      }

      const currentVersion = localStorage.getItem(this.storageKey);

      if (!currentVersion) {
        localStorage.setItem(this.storageKey, remoteVersion);
        return;
      }

      if (currentVersion !== remoteVersion) {
        localStorage.setItem(this.storageKey, remoteVersion);
        this.reloadWithFreshUrl(remoteVersion);
      }
    } catch {
      // Version checks should never block using the installed app.
    } finally {
      this.checkInProgress = false;
    }
  }

  private async fetchVersion(): Promise<string | null> {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const appVersion = (await response.json()) as AppVersion;
    return appVersion.version ?? appVersion.commit ?? appVersion.builtAt ?? null;
  }

  private reloadWithFreshUrl(version: string): void {
    const url = new URL(window.location.href);

    url.searchParams.set('appVersion', version);
    window.location.replace(url.toString());
  }
}

export function provideAppVersionCheck() {
  return provideEnvironmentInitializer(() => {
    inject(AppVersionService).start();
  });
}
