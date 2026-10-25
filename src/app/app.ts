import { Component, inject } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  ResolveEnd,
  ResolveStart,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { log } from './log';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  template: `
    <h1>Router resources demo</h1>
    <nav>
      <a routerLink="/resolvers/projects/1/tasks">Resolvers</a>
      <a routerLink="/resources/projects/1/tasks">Router resources</a>
      <a routerLink="/nonblocking/projects/1/tasks">Tasks non-blocking</a>
    </nav>
    <nav class="more">
      @for (mode of modes; track mode) {
        <a [routerLink]="['/', mode, 'projects', '2', 'tasks']">{{ mode }}: project 2</a>
        <a [routerLink]="['/', mode, 'projects', '999', 'tasks']">{{ mode }}: broken project</a>
        <a [routerLink]="['/', mode, 'projects', '777', 'tasks']">{{ mode }}: broken tasks</a>
      }
    </nav>
    <router-outlet />
  `,
})
export class App {
  protected readonly modes = ['resolvers', 'resources', 'nonblocking'];

  constructor() {
    inject(Router).events.subscribe((e) => {
      if (e instanceof NavigationStart) log(`NavigationStart ${e.url}`);
      else if (e instanceof ResolveStart) log(`ResolveStart`);
      else if (e instanceof ResolveEnd) log(`ResolveEnd`);
      else if (e instanceof NavigationEnd) log(`NavigationEnd ${e.urlAfterRedirects}`);
      else if (e instanceof NavigationCancel) log(`NavigationCancel ${e.url}`);
      else if (e instanceof NavigationError) log(`NavigationError ${e.url}`);
    });
  }
}
