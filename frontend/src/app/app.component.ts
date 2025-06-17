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
    { id: 1, expression: 'x**2', color: '#009999', calculateArea: true }
  ];
  lowerLimit: number = -5;
  upperLimit: number = 5;
  totalCalculatedArea: number | null = null;
  globalError: string | null = null;
  isLoading: boolean = false;

  private colorPalette: string[] = ['#009999', '#f43f5e', '#3b82f6', '#eab308', '#8b5cf6', '#10b981', '#f97316'];
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
      map(() => {
        // Create a unique key that includes all function states and calculation selections
        const functionsState = this.functions.map(f => ({
          id: f.id,
          expression: f.expression,
          calculateArea: f.calculateArea
        }));
        return JSON.stringify(functionsState) + `|${this.lowerLimit}|${this.upperLimit}`;
      }),
      distinctUntilChanged(),
      tap(() => {
        this.isLoading = true;
        this.globalError = null;
        this.totalCalculatedArea = null;
        // Reset calculation results
        this.functions.forEach(f => { 
          f.area = null; 
          f.error = null; 
        });
      }),
      switchMap(() => this.calculateAllSelectedAreas())
    ).subscribe(results => {
      this.isLoading = false;
      let totalArea = 0;
      let hasCalculatedArea = false;
      let hasErrors = false;
      
      // Process results for each function
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
            hasErrors = true;
            // Use the first error encountered as the global error message.
            if (!this.globalError) {
              this.globalError = `Error in function "${func.expression}": ${result.error}`;
            }
          }
        }
      });
      
      // Only set total area if we have calculated areas and no errors
      if (hasCalculatedArea && !hasErrors) {
        this.totalCalculatedArea = totalArea;
      } else if (hasErrors) {
        this.totalCalculatedArea = null;
      }
      
      this.renderChart();
    });
    
    // Initial calculation
    this.onInputChange();
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.destroyChart();
  }

  addFunction(): void {
    const newColor = this.colorPalette[this.functions.length % this.colorPalette.length];
    this.functions.push({
      id: Date.now(),
      expression: 'x*cos(x)',
      color: newColor,
      calculateArea: false, // Default to unchecked for new functions
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
    // Only calculate for functions that are selected AND have non-empty expressions
    const functionsToCalculate = this.functions.filter(f => 
      f.calculateArea && 
      f.expression.trim() !== ''
    );
    
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
        catchError(err => {
          console.error(`Error calculating area for function ${func.expression}:`, err);
          return of({ id: func.id, error: 'Failed to connect to backend or calculation error.' });
        })
      )
    );

    return forkJoin(requests);
  }

  private renderChart(): void {
    if (!this.chartCanvas) return;
    
    const points = 201; // Increased for smoother curves
    const labels: number[] = [];
    for (let i = 0; i < points; i++) {
        const x = this.lowerLimit + (i * (this.upperLimit - this.lowerLimit)) / (points - 1);
        labels.push(x);
    }
    
    const datasets = this.functions.map(funcItem => {
      const data: (number | null)[] = [];
      try {
        // Create a safer evaluation function
        const func = new Function('x', `
          with(Math) {
            try {
              const result = ${funcItem.expression};
              return (typeof result === 'number' && isFinite(result)) ? result : null;
            } catch (e) {
              return null;
            }
          }
        `);
        
        labels.forEach(x => {
          try {
            const result = func(x);
            data.push(result);
          } catch (e) {
            data.push(null);
          }
        });

        return {
          label: `f(x) = ${funcItem.expression}${funcItem.calculateArea ? ' (Area: ' + (funcItem.area?.toFixed(3) || 'calculating...') + ')' : ''}`,
          data,
          borderColor: funcItem.color,
          backgroundColor: funcItem.calculateArea && !funcItem.error && funcItem.area !== null ? 
            `${funcItem.color}20` : 'transparent', // Using hex transparency
          fill: funcItem.calculateArea && !funcItem.error && funcItem.area !== null ? 'origin' : false,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2
        } as ChartDataset<'line', (number | null)[]>;
      } catch (error) {
        console.error(`Error creating dataset for function ${funcItem.expression}:`, error);
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
        interaction: {
          intersect: false,
          mode: 'index'
        },
        scales: {
          x: { 
            grid: { color: '#30363d' }, 
            ticks: { color: '#7d8590' },
            title: {
              display: true,
              text: 'x',
              color: '#e6edf3'
            }
          },
          y: { 
            grid: { color: '#30363d' }, 
            ticks: { color: '#7d8590' },
            title: {
              display: true,
              text: 'f(x)',
              color: '#e6edf3'
            }
          }
        },
        plugins: {
          legend: { 
            labels: { 
              color: '#e6edf3',
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: '#161b22',
            titleColor: '#e6edf3',
            bodyColor: '#e6edf3',
            borderColor: '#30363d',
            borderWidth: 1
          }
        }
      }
    };
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  // Helper method to get count of selected functions
  get selectedFunctionsCount(): number {
    return this.functions.filter(f => f.calculateArea).length;
  }

  // Helper method to check if any function has errors
  get hasAnyErrors(): boolean {
    return this.functions.some(f => f.error !== null);
  }
}