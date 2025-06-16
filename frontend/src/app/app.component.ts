import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interface for the backend API response for type safety
interface IntegrationResponse {
  area?: number;
  error?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  // --- Component State ---
  expression: string = 'x**2';
  lowerLimit: number = 0;
  upperLimit: number = 2;
  calculatedArea: number | null = null;
  error: string | null = null;

  // --- RxJS Subjects for Real-time Updates (Bonus Feature) ---
  private inputUpdate$ = new Subject<void>();
  private subscription: Subscription = new Subscription();

  // --- Chart.js Instance ---
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  // --- Backend Configuration ---
  // This is the correct public URL for your backend running in the cloud IDE.
  private readonly backendUrl = 'https://cautious-space-enigma-v9r47wpvg6whpprj-8000.app.github.dev/integrate';
  private http = inject(HttpClient);

  constructor() {
    // Register all necessary Chart.js components
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    // Subscribe to the input changes stream.
    this.subscription = this.inputUpdate$.pipe(
      // Wait for 500ms of silence before proceeding
      debounceTime(500),
      // Map the input event to a unique string representing the form state.
      map(() => `${this.expression}|${this.lowerLimit}|${this.upperLimit}`),
      // Only proceed if that unique string has actually changed.
      distinctUntilChanged()
    ).subscribe(() => {
      this.calculateAndDraw();
    });

    // Initial calculation on load
    this.calculateAndDraw();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions and chart instances to prevent memory leaks
    this.subscription.unsubscribe();
    this.destroyChart();
  }

  /**
   * Called on every input change in the HTML to trigger the update stream.
   */
  onInputChange(): void {
    this.inputUpdate$.next();
  }
  
  /**
   * Main orchestrator function to fetch data and update the UI.
   */
  private calculateAndDraw(): void {
    this.error = null; // Reset error on new calculation

    if (this.expression === '' || this.lowerLimit === null || this.upperLimit === null) {
      this.error = "Please ensure all fields are filled.";
      return;
    }

    const requestBody = {
      expression: this.expression,
      lower_limit: this.lowerLimit,
      upper_limit: this.upperLimit,
    };

    this.http.post<IntegrationResponse>(this.backendUrl, requestBody).subscribe({
      next: (response) => {
        if (response.error) {
          this.error = response.error;
          this.calculatedArea = null;
          this.destroyChart();
        } else if (response.area !== undefined) {
          this.calculatedArea = response.area;
          this.renderChart();
        }
      },
      error: (err) => {
        console.error('Backend connection error', err);
        this.error = 'Could not connect to the backend. Please ensure it is running and the URL is correct.';
        this.calculatedArea = null;
        this.destroyChart();
      }
    });
  }

  /**
   * Renders the function graph using Chart.js.
   */
  private renderChart(): void {
    if (!this.chartCanvas) return;

    const points = 100;
    const labels: number[] = [];
    const data: (number | null)[] = [];

    try {
      const func = new Function('x', `with(Math){return ${this.expression}}`);

      for (let i = 0; i <= points; i++) {
        const x = this.lowerLimit + (i * (this.upperLimit - this.lowerLimit)) / points;
        labels.push(x);
        const y = func(x);
        data.push(isFinite(y) ? y : null);
      }

      this.destroyChart(); 

      const ctx = this.chartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels.map(l => l.toFixed(2)),
            datasets: [{
              label: `f(x) = ${this.expression}`,
              data: data,
              borderColor: '#009999',
              backgroundColor: 'rgba(0, 153, 153, 0.2)',
              fill: 'origin',
              tension: 0.1,
              pointRadius: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          }
        });
      }
    } catch (e) {
      console.error("Chart rendering failed:", e);
      this.error = (this.error ? this.error + ' ' : '') + 'Could not render the function graph.';
      this.destroyChart();
    }
  }

  /**
   * Safely destroys the Chart.js instance to free up resources.
   */
  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}
