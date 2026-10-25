import { HttpClient, httpResource } from '@angular/common/http';
import { inject } from '@angular/core';
import { ResolveFn, Routes, nonBlocking } from '@angular/router';
import { Project, Task } from './api';
import { Home, ProjectPage, TasksTab, TasksTabLive } from './pages';

// 1. Resolvers: the router runs the parent's, waits for it, then runs the child's.
const projectResolver: ResolveFn<Project> = (route) =>
  inject(HttpClient).get<Project>(`/api/projects/${route.params['id']}`);

const tasksResolver: ResolveFn<Task[]> = (route) =>
  inject(HttpClient).get<Task[]>(`/api/projects/${route.params['id']}/tasks`);

// 2. Router resources, both blocking: the router starts both and waits for both.
// 3. The same, with the tasks marked nonBlocking: the page shows as soon as the
//    project is in, and the tab shows its own loading state.
export const routes: Routes = [
  { path: '', component: Home },
  {
    path: 'resolvers/projects/:id',
    component: ProjectPage,
    resolve: { project: projectResolver },
    children: [
      { path: 'tasks', component: TasksTab, resolve: { tasks: tasksResolver } },
    ],
  },
  {
    path: 'resources/projects/:id',
    component: ProjectPage,
    resources: ({ params }) => ({
      project: httpResource<Project>(() => `/api/projects/${params()['id']}`),
    }),
    children: [
      {
        path: 'tasks',
        component: TasksTab,
        resources: ({ params }) => ({
          tasks: httpResource<Task[]>(() => `/api/projects/${params()['id']}/tasks`),
        }),
      },
    ],
  },
  {
    path: 'nonblocking/projects/:id',
    component: ProjectPage,
    resources: ({ params }) => ({
      project: httpResource<Project>(() => `/api/projects/${params()['id']}`),
    }),
    children: [
      {
        path: 'tasks',
        component: TasksTabLive,
        resources: ({ params }) => ({
          tasks: nonBlocking(
            httpResource<Task[]>(() => `/api/projects/${params()['id']}/tasks`),
          ),
        }),
      },
    ],
  },
];
