import { Component, Resource, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Project, Task } from './api';

// The parent page. The same component serves the resolver routes and the
// resource routes: with a blocking resource, the input gets the plain value,
// exactly like a resolver's.
@Component({
  selector: 'app-project-page',
  imports: [RouterOutlet],
  template: `
    <section class="project" [attr.data-project]="project().id">
      <h2>{{ project().name }}</h2>
      <router-outlet />
    </section>
  `,
})
export class ProjectPage {
  readonly project = input.required<Project>();
}

// The child tab, blocking: it only exists once its tasks have arrived.
@Component({
  selector: 'app-tasks-tab',
  template: `
    <ul class="tasks">
      @for (task of tasks(); track task.id) {
        <li class="task">{{ task.title }}</li>
      }
    </ul>
  `,
})
export class TasksTab {
  readonly tasks = input.required<Task[]>();
}

// The child tab, non-blocking: the router hands over the Resource itself,
// so the tab shows its own loading and error states.
@Component({
  selector: 'app-tasks-tab-live',
  template: `
    @if (tasks().isLoading()) {
      <p class="loading">Loading tasks…</p>
    } @else if (tasks().error()) {
      <p class="error">Couldn't load the tasks.</p>
    } @else {
      <ul class="tasks">
        @for (task of tasks().value(); track task.id) {
          <li class="task">{{ task.title }}</li>
        }
      </ul>
    }
  `,
})
export class TasksTabLive {
  readonly tasks = input.required<Resource<Task[] | undefined>>();
}

@Component({
  selector: 'app-home',
  template: `<p class="home">Pick a project above.</p>`,
})
export class Home {}
