import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap, catchError, tap } from 'rxjs/operators';
import { Chart, registerables, ChartOptions, ChartData, ChartDataset } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// --- Interfaces for our data structures ---
interface IntegrationResponse {
  area?: number;
  error?: string;
}

interface FunctionItem {
  id: number;
  expression: string;
  color: string;
  calculateArea: boolean; // To track if we should calculate its area
  area?: number | null;
  error?: string | null;
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
  functions: FunctionItem[] = [
    { id: 1, expression: '(x**2) * sin(x)', color: '#009999', calculateArea: true }
  ];
  lowerLimit: number = -5;
  upperLimit: number = 5;
  totalCalculatedArea: number | null = null;
  globalError: string | null = null;
  isLoading: boolean = false;

  private colorPalette: string[] = ['#f43f5e', '#3b82f6', '#eab308', '#8b5cf6'];
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
      map(() => JSON.stringify(this.functions.map(f => ({...f, area: null, error: null}))) + `|${this.lowerLimit}|${this.upperLimit}`),
      distinctUntilChanged(),
      tap(() => {
        this.isLoading = true;
        this.globalError = null;
        this.totalCalculatedArea = null;
        this.functions.forEach(f => { f.area = null; f.error = null; });
      }),
      switchMap(() => this.calculateAllSelectedAreas())
    ).subscribe(results => {
      this.isLoading = false;
      let totalArea = 0;
      let hasCalculatedArea = false;
      
      // --- THE FIX: Using the 'in' operator for robust type guarding ---
      results.forEach(result => {
        const func = this.functions.find(f => f.id === result.id);
        if (func) {
          // Check if 'area' property exists. If so, it's a success response.
          if ('area' in result && result.area !== undefined) {
            func.area = result.area;
            totalArea += result.area;
            hasCalculatedArea = true;
          } 
          // Otherwise, it must be an error response.
          else if ('error' in result && result.error) {
            func.error = result.error;
            // Use the first error encountered as the global error message.
            if (!this.globalError) {
              this.globalError = `Error in function "${func.expression}": ${result.error}`;
            }
          }
        }
      });
      
      if (hasCalculatedArea && !this.globalError) {
        this.totalCalculatedArea = totalArea;
      }
      
      this.renderChart();
    });
    this.onInputChange();
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.destroyChart();
  }

  addFunction(): void {
    const newColor = this.colorPalette[ (this.functions.length - 1) % this.colorPalette.length ] || '#ffffff';
    this.functions.push({
      id: Date.now(),
      expression: 'x*cos(x)',
      color: newColor,
      calculateArea: false,
    });
    this.onInputChange();
  }

  removeFunction(id: number): void {
    this.functions = this.functions.filter(f => f.id !== id);
    this.onInputChange();
  }

  onInputChange(): void {
    this.inputUpdate$.next();
  }

  private calculateAllSelectedAreas() {
    const functionsToCalculate = this.functions.filter(f => f.calculateArea && f.expression.trim() !== '');
    
    if (functionsToCalculate.length === 0) {
      this.renderChart(); // Update chart to remove shading
      return of([]);
    }

    const requests = functionsToCalculate.map(func => 
      this.http.post<IntegrationResponse>(this.backendUrl, {
        expression: func.expression,
        lower_limit: this.lowerLimit,
        upper_limit: this.upperLimit,
      }).pipe(
        map(response => ({ id: func.id, ...response })),
        catchError(err => of({ id: func.id, error: 'Failed to connect to backend.' }))
      )
    );

    return forkJoin(requests);
  }

  private renderChart(): void {
    if (!this.chartCanvas) return;
    const points = 101;
    const labels: number[] = [];
    for (let i = 0; i < points; i++) {
        const x = this.lowerLimit + (i * (this.upperLimit - this.lowerLimit)) / (points - 1);
        labels.push(x);
    }
    
    const datasets = this.functions.map(funcItem => {
      const data: (number | null)[] = [];
      try {
        const func = new Function('x', `with(Math){return ${funcItem.expression}}`);
        labels.forEach(x => data.push(isFinite(func(x)) ? func(x) : null));

        return {
          label: `f(x) = ${funcItem.expression}`,
          data,
          borderColor: funcItem.color,
          backgroundColor: funcItem.calculateArea && !funcItem.error ? `rgba(${this.hexToRgb(funcItem.color)}, 0.1)` : 'transparent',
          fill: funcItem.calculateArea && !funcItem.error ? 'origin' : false,
          tension: 0.4,
          pointRadius: 0
        } as ChartDataset<'line', (number | null)[]>;
      } catch {
        return null;
      }
    }).filter((ds): ds is ChartDataset<'line', (number | null)[]> => ds !== null);

    this.destroyChart();
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.chart = new Chart(ctx, this.getChartConfiguration(labels, datasets));
    }
  }

  private getChartConfiguration(labels: number[], datasets: ChartDataset<'line', (number | null)[]>[]): {type: 'line', data: ChartData, options: ChartOptions} {
    return {
      type: 'line',
      data: {
        labels: labels.map(l => l.toFixed(2)),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: '#30363d' }, ticks: { color: '#7d8590' } },
          y: { grid: { color: '#30363d' }, ticks: { color: '#7d8590' } }
        },
        plugins: {
          legend: { labels: { color: '#e6edf3' } }
        }
      }
    };
  }

  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0,0,0';
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
