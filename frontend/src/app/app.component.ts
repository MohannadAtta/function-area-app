import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface IntegrationResponse {
  area?: number;
  error?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ CommonModule, FormsModule ], // Correct imports for standalone
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  expression: string = 'x**2';
  lowerLimit: number = 0;
  upperLimit: number = 2;
  calculatedArea: number | null = null;
  error: string | null = null;

  private inputUpdate$ = new Subject<void>();
  private subscription: Subscription = new Subscription();

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  // The correct public URL for your backend in the cloud IDE
  private readonly backendUrl = 'https://cautious-space-enigma-v9r47wpvg6whpprj-8000.app.github.dev/integrate';
  private http = inject(HttpClient);

  constructor() {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.subscription = this.inputUpdate$.pipe(
      debounceTime(500),
      map(() => `${this.expression}|${this.lowerLimit}|${this.upperLimit}`),
      distinctUntilChanged()
    ).subscribe(() => {
      this.calculateAndDraw();
    });
    this.calculateAndDraw(); // Initial call
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.destroyChart();
  }

  onInputChange(): void {
    this.inputUpdate$.next();
  }
  
  private calculateAndDraw(): void {
    this.error = null;
    if (this.expression === '' || this.lowerLimit === null || this.upperLimit === null) { return; }

    this.http.post<IntegrationResponse>(this.backendUrl, {
      expression: this.expression,
      lower_limit: this.lowerLimit,
      upper_limit: this.upperLimit,
    }).subscribe({
      next: (res) => {
        if (res.error) {
          this.error = res.error;
          this.calculatedArea = null;
          this.destroyChart();
        } else if (res.area !== undefined) {
          this.calculatedArea = res.area;
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

  private renderChart(): void {
    if (!this.chartCanvas) return;
    const points = 101;
    const labels: number[] = [];
    const data: (number | null)[] = [];

    try {
      const func = new Function('x', `with(Math){return ${this.expression}}`);
      for (let i = 0; i < points; i++) {
        const x = this.lowerLimit + (i * (this.upperLimit - this.lowerLimit)) / (points - 1);
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
              data,
              borderColor: '#009999',
              backgroundColor: 'rgba(0, 153, 153, 0.2)',
              fill: 'origin',
              tension: 0.1,
              pointRadius: 0
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }
    } catch (e) {
      this.error = 'Could not render the function graph. Check syntax.';
      this.destroyChart();
    }
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
