import { Component, computed, inject } from '@angular/core';
import { WsControlService } from './services/ws-control.service';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <main class="app-shell">
      <p>WebSocket status: {{ status() }}</p>
    </main>
  `,
  styles: [
    `
      .app-shell {
        align-items: center;
        display: flex;
        font-family: Arial, sans-serif;
        height: 100vh;
        justify-content: center;
        margin: 0;
      }
    `
  ]
})
export class App {
  private readonly wsControl = inject(WsControlService);
  readonly status = computed(() => this.wsControl.status());
}
