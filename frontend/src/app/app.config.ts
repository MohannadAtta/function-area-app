import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// This is where you configure the app for standalone components
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter([]), // Provide router even if no routes are defined
    provideHttpClient(), // Provides the modern HttpClient
    importProvidersFrom(
      BrowserModule,
      FormsModule, // Needed for [(ngModel)]
      BrowserAnimationsModule // Needed for some UI features and good practice
    )
  ]
};
