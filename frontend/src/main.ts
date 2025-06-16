import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app'; // Correctly imports the App class
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig) // Bootstraps the App component
  .catch((err) => console.error(err));
