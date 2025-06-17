import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// This is the correct modern configuration for a standalone Angular app
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter([]),
    provideHttpClient(), // Provides the modern HttpClient
    importProvidersFrom(
      BrowserModule,
      FormsModule, // Needed for [(ngModel)]
      BrowserAnimationsModule // Needed for animations and Chart.js
    )
  ]
};
