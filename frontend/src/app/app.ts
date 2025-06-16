import { Component, ElementRef, ViewChild, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit, OnDestroy { // Renamed from AppComponent to App
  expression: string = 'x**2';
  lower: number = 0;
  upper: number = 2;
  area: number = 0;
  error: string | null = null;

  http = inject(HttpClient);

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  chart: Chart | null = null;

  private update$ = new Subject<void>();
  private subscription: Subscription;

  constructor() {
    // Register all Chart.js components. This is a crucial step.
    Chart.register(...registerables);

    // Debounce input to avoid excessive API calls
    this.subscription = this.update$.pipe(
      debounceTime(400) // Wait for 400ms of silence before processing
    ).subscribe(() => this.calculateAndDraw());
  }

  ngOnInit(): void {
    // Perform the initial calculation and drawing
    this.calculateAndDraw();
  }

  ngOnDestroy(): void {
    // Clean up the subscription to prevent memory leaks
    this.subscription.unsubscribe();
    if(this.chart) {
      this.chart.destroy();
    }
  }

  // This is called on every input change to trigger the debounced update
  onInputChange() {
    this.update$.next();
  }

  // The main logic for fetching data and updating the chart
  calculateAndDraw() {
    if (this.expression === '' || this.expression === null || this.lower === null || this.upper === null) {
      this.error = "Please fill out all fields.";
      return;
    }

    const body = {
      expression: this.expression,
      lower_limit: this.lower,
      upper_limit: this.upper
    };

    this.http.post('http://localhost:8000/integrate', body).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.area = res.area;
          this.generateChart(); // Generate chart on success
        } else {
          this.error = `Calculation Error: ${res.error}`;
          this.clearChart(); // Clear chart if there's a calculation error
        }
      },
      error: (err) => {
        console.error('Server error:', err);
        this.error = 'Could not connect to the backend server. Make sure it is running.';
        this.clearChart();
      }
    });
  }

  clearChart() {
    if (this.chart) {
        this.chart.destroy();
        this.chart = null;
    }
  }

  generateChart() {
    if (this.lower >= this.upper) {
        this.error = "Lower limit must be less than the upper limit.";
        this.clearChart();
        return;
    }

    // Generate points for the chart
    const xs = Array.from({ length: 101 }, (_, i) =>
      this.lower + (i * (this.upper - this.lower)) / 100
    );

    try {
      // This JS parser is basic. It's wrapped in `with(Math)` to allow using
      // functions like sin(x) directly. For complex backend-only functions,
      // this chart might not render, but the area will still be correct.
      const funcBody = `with(Math) { return ${this.expression} }`;
      const f = new Function('x', funcBody);
      const ys = xs.map(x => f(x));

      if (ys.some(y => isNaN(y) || !isFinite(y))) {
        throw new Error("Expression resulted in invalid numbers (NaN or Infinity) for charting.");
      }

      const ctx = this.canvasRef.nativeElement.getContext('2d');
      if (!ctx) return;

      this.clearChart(); // Clear previous chart instance

      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: xs.map(x => x.toFixed(2)),
          datasets: [{
            label: `f(x) = ${this.expression}`,
            data: ys,
            fill: 'origin', // This fills the area under the curve
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          }]
        }
      });
      // If chart generation is successful, clear any previous errors.
      this.error = null;
    } catch (e: any) {
      console.error("Chart generation error: ", e);
      this.error = `Chart Error: ${e.message}`;
      this.clearChart();
    }
  }
}
