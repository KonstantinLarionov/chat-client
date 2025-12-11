import { Injectable } from '@angular/core';
import { Device } from '@capacitor/device';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  async requestPermissions() {
    const info = await Device.getInfo();

    // Android → разрешения запрашивает сам WebView через WebChromeClient
    // Но дополнительно нужно запросить нативные права (минимальные)
    if (info.platform === 'android') {
      // Вызов Web API (работает внутри WebView)
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => {});
    }
  }
}
