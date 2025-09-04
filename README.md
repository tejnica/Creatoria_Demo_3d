# Creatoria Frontend

Modern React/Next.js frontend for the Creatoria Optimization Platform with comprehensive testing suite.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## 🧪 Testing

### Unit Tests (Jest + React Testing Library)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Test Coverage:**
- ✅ Component rendering and props
- ✅ User interactions and events
- ✅ API client functions
- ✅ Error handling
- ✅ Edge cases and boundary conditions

### End-to-End Tests (Cypress)

```bash
# Run E2E tests (headless)
npm run test:e2e

# Open Cypress Test Runner
npm run test:e2e:open
```

**E2E Test Scenarios:**
- ✅ Complete optimization workflow
- ✅ Demo task selection and execution
- ✅ Custom problem input and processing
- ✅ Error handling and recovery
- ✅ Navigation and state management
- ✅ Responsive design testing
- ✅ Accessibility validation

### Component Stories (Storybook)

```bash
# Run Storybook development server
npm run storybook

# Build static Storybook
npm run build-storybook
```

**Available Stories:**
- `ClarifierDialog` - Interactive clarification modal
- `ResultViewer` - Optimization results display
- `ErrorBoundary` - Error handling component
- `Toast` - Notification system

## 📁 Project Structure

```
Frontend/
├── pages/
│   ├── index.js                 # Main optimization wizard
│   └── api/                     # Next.js API routes (proxy)
├── src/
│   ├── components/
│   │   ├── ClarifierDialog.jsx  # Interactive clarification
│   │   ├── ResultViewer.jsx     # Results visualization
│   │   ├── ErrorBoundary.jsx    # Error handling
│   │   ├── Toast.jsx            # Notifications
│   │   └── __tests__/           # Component unit tests
│   └── api/
│       ├── solver.ts            # API client functions
│       └── __tests__/           # API tests
├── cypress/
│   ├── e2e/                     # End-to-end tests
│   └── support/                 # Test utilities
├── .storybook/                  # Storybook configuration
└── stories/                     # Component stories
```

## 🔧 Configuration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
PY_BACKEND_URL=http://localhost:8000
```

### Testing Configuration

- **Jest**: `jest.config.js` - Unit test configuration
- **Cypress**: `cypress.config.js` - E2E test configuration  
- **Storybook**: `.storybook/main.js` - Component story configuration

## 🎯 API Integration

The frontend communicates with the Python backend through:

1. **Next.js API Routes** (`/pages/api/`) - Proxy to Python backend
2. **Axios Client** (`/src/api/solver.ts`) - HTTP request handling
3. **Error Handling** - Toast notifications and error boundaries

### API Endpoints

- `POST /api/generate-yaml` - Generate solver configuration
- `POST /api/run-opt` - Execute optimization
- `POST /api/answer-clarification` - Handle clarification flow

## 🎨 UI Components

### ClarifierDialog
Interactive modal for handling missing information and conflicts in optimization problems.

**Features:**
- Missing field indicators
- Conflict resolution
- Question-answer interface
- Loading states

### ResultViewer
Comprehensive display of optimization results with visualizations.

**Features:**
- Fast vs Advanced solution comparison
- Interactive Plotly charts
- Performance metrics
- Analysis reports
- Raw data inspection

### ErrorBoundary
React error boundary for graceful error handling.

**Features:**
- Error capture and display
- Recovery options
- Debug information
- User-friendly messaging

### Toast System
Non-intrusive notification system for user feedback.

**Features:**
- Multiple notification types (success, error, warning, info)
- Auto-dismiss timers
- Manual dismissal
- Stacking support

## 🔍 Testing Best Practices

### Unit Tests
- Test component behavior, not implementation
- Mock external dependencies (API calls, libraries)
- Test error states and edge cases
- Maintain high coverage (>80%)

### E2E Tests
- Test complete user workflows
- Use realistic data and scenarios
- Test across different viewports
- Validate accessibility

### Component Stories
- Document all component states
- Provide realistic data examples
- Include edge cases and error states
- Enable interactive testing

## 🚀 Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🐛 Troubleshooting

### Common Issues

1. **Tests failing with module errors**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Cypress tests failing**
   ```bash
   # Clear Cypress cache
   npx cypress cache clear
   npx cypress install
   ```

3. **Storybook not loading**
   ```bash
   # Clear Storybook cache
   rm -rf node_modules/.cache/storybook
   npm run storybook
   ```

## 📝 Contributing

1. Write tests for new components
2. Update stories for UI changes  
3. Run full test suite before commits
4. Maintain documentation

## 🔗 Related

- [Backend API Documentation](../Backend-Core/README.md)
- [Testing Strategy](./docs/testing-strategy.md)
- [Component Guidelines](./docs/component-guidelines.md)

