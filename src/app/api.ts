import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { log } from './log';

export interface Project {
  id: string;
  name: string;
}

export interface Task {
  id: number;
  title: string;
}

// Fixed delays, so the timings are the router's doing and nothing else.
export const PROJECT_DELAY_MS = 400;
export const TASKS_DELAY_MS = 600;

// Project 999 does not exist: its endpoint answers 500 after the usual delay.
// Project 777 exists, but its tasks endpoint answers 500.
export const BROKEN_PROJECT_ID = '999';
export const BROKEN_TASKS_ID = '777';

// A fake backend. It answers /api/projects/:id and /api/projects/:id/tasks after
// the delays above and logs when each request starts and ends.
export const fakeBackend: HttpInterceptorFn = (req) => {
  const tasks = req.url.match(/^\/api\/projects\/(\w+)\/tasks$/);
  const project = req.url.match(/^\/api\/projects\/(\w+)$/);
  const name = tasks ? `tasks ${tasks[1]}` : project ? `project ${project![1]}` : null;
  if (!name) {
    throw new Error(`No fake endpoint for ${req.url}`);
  }
  const id = (tasks ?? project)![1];
  const delay = tasks ? TASKS_DELAY_MS : PROJECT_DELAY_MS;
  const body = tasks
    ? [1, 2, 3].map((n) => ({ id: n, title: `Task ${n} of project ${id}` }))
    : { id, name: `Project ${id}` };

  return new Observable((subscriber) => {
    log(`start ${name}`);
    const timer = setTimeout(() => {
      log(`end ${name}`);
      if (id === BROKEN_PROJECT_ID || (tasks && id === BROKEN_TASKS_ID)) {
        subscriber.error(new HttpErrorResponse({ url: req.url, status: 500, statusText: 'Server Error' }));
        return;
      }
      subscriber.next(new HttpResponse({ url: req.url, status: 200, body }));
      subscriber.complete();
    }, delay);
    return () => clearTimeout(timer);
  });
};
