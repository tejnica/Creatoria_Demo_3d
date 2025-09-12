import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '../../contexts/ThemeContext';

// ?????? localStorage
const createLocalStorageMock = () => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
  };
};

// ?????? matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('ThemeToggle', () => {
  let localStorageMock;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test('renders theme toggle with light theme by default', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(screen.getByText('Theme:')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
    // ????????? ??????? ?????????? ? ???????? ?????? ????? ??????
    expect(screen.getByRole('switch').parentElement).toBeInTheDocument();
  });

  test('has correct accessibility attributes', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-checked', 'false');
    expect(switchButton).toHaveAttribute('aria-label', 'Switch to dark theme');
  });

  test('toggles theme when clicked', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const switchButton = screen.getByRole('switch');
    
    // Initially light theme
    expect(switchButton).toHaveAttribute('aria-checked', 'false');
    
    // Click to toggle to dark
    fireEvent.click(switchButton);
    expect(switchButton).toHaveAttribute('aria-checked', 'true');
    expect(switchButton).toHaveAttribute('aria-label', 'Switch to light theme');
    
    // Click again to toggle back to light
    fireEvent.click(switchButton);
    expect(switchButton).toHaveAttribute('aria-checked', 'false');
    expect(switchButton).toHaveAttribute('aria-label', 'Switch to dark theme');
  });

  test('applies custom className', () => {
    const customClass = 'custom-theme-toggle';
    render(
      <ThemeProvider>
        <ThemeToggle className={customClass} />
      </ThemeProvider>
    );

    const container = screen.getByText('Theme:').parentElement;
    expect(container).toHaveClass(customClass);
  });

  test('shows correct visual state for dark theme', () => {
    // Pre-set dark theme in localStorage
    localStorageMock.setItem('theme', 'dark');
    
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-checked', 'true');
    expect(switchButton).toHaveClass('bg-blue-600');
  });

  test('shows correct visual state for light theme', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-checked', 'false');
    expect(switchButton).toHaveClass('bg-gray-200');
  });

  test('renders theme label correctly', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    // ?????????, ??? ????????? ?????????? ? ?????????? ??????????
    const themeLabel = screen.getByText('Theme:');
    expect(themeLabel).toHaveClass('text-sm', 'text-gray-600', 'dark:text-gray-300');
  });
});
