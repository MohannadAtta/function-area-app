import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, tap } from 'rxjs/operators';
import { Chart, registerables, ChartOptions, ChartData } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface IntegrationResponse {
  area?: number;
  error?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ CommonModule, FormsModule ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  // --- Component State ---
  expression: string = '(x**2) * sin(x)'; // A more interesting default function
  lowerLimit: number = -5;
  upperLimit: number = 5;
  calculatedArea: number | null = null;
  error: string | null = null;
  isLoading: boolean = false;

  private inputUpdate$ = new Subject<void>();
  private subscription: Subscription = new Subscription();

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;
  
  private readonly backendUrl = 'https://cautious-space-enigma-v9r47wpvg6whpprj-8000.app.github.dev/integrate';
  private http = inject(HttpClient);

  constructor() {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.subscription = this.inputUpdate$.pipe(
      debounceTime(500),
      map(() => `${this.expression}|${this.lowerLimit}|${this.upperLimit}`),
      distinctUntilChanged(),
      tap(() => {
        this.isLoading = true;
        this.error = null;
        this.calculatedArea = null;
      })
    ).subscribe(() => {
      this.calculateAndDraw();
    });
    this.onInputChange(); // Initial call
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.destroyChart();
  }

  onInputChange(): void {
    this.inputUpdate$.next();
  }
  
  private calculateAndDraw(): void {
    if (this.expression === '' || this.lowerLimit === null || this.upperLimit === null) {
      this.isLoading = false;
      return;
    }

    this.http.post<IntegrationResponse>(this.backendUrl, {
      expression: this.expression,
      lower_limit: this.lowerLimit,
      upper_limit: this.upperLimit,
    }).subscribe({
      next: (res) => {
        if (res.error) {
          this.error = res.error;
        } else if (res.area !== undefined) {
          this.calculatedArea = res.area;
          this.renderChart();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Backend connection error', err);
        this.error = 'Could not connect to the backend.';
        this.isLoading = false;
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
        this.chart = new Chart(ctx, this.getChartConfiguration(labels, data));
      }
    } catch (e) {
      this.error = 'Could not render the function graph. Check syntax.';
      this.destroyChart();
    }
  }

  private getChartConfiguration(labels: number[], data: (number | null)[]): {type: 'line', data: ChartData, options: ChartOptions} {
    const chartData: ChartData = {
      labels: labels.map(l => l.toFixed(2)),
      datasets: [{
        label: `f(x) = ${this.expression}`,
        data,
        borderColor: '#22d3ee', // Accent color
        backgroundColor: 'rgba(34, 211, 238, 0.1)', // Accent fill
        fill: 'origin',
        tension: 0.4,
        pointRadius: 0
      }]
    };

    const chartOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { 
          grid: { color: '#374151' },
          ticks: { color: '#9ca3af' }
        },
        y: { 
          grid: { color: '#374151' },
          ticks: { color: '#9ca3af' }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#d1d5db' // Text color
          }
        }
      }
    };
    
    return { type: 'line', data: chartData, options: chartOptions };
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
