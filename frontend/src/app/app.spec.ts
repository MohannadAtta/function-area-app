import { TestBed } from '@angular/core/testing';
import { App } from './app'; // Correctly imports the App class
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

describe('App', () => { // Describes the App component
  beforeEach(async () => {
    // Configure the test bed for the standalone component
    await TestBed.configureTestingModule({
      imports: [
        App, // Import the standalone component itself
        HttpClientTestingModule, // Mock for HttpClient
        FormsModule,
        CommonModule
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'Area under curve calculator'`, () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('Area under curve calculator');
  });

  it('should have a default expression of "x**2"', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.expression).toEqual('x**2');
  });
});
