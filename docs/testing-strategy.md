# Testing Strategy for Creatoria Frontend

## Overview

This document outlines the comprehensive testing strategy implemented for the Creatoria Frontend application, covering unit tests, integration tests, E2E tests, and component documentation.

## Testing Pyramid

```
    E2E Tests (Cypress)
        /\
       /  \
   Unit Tests (Jest)
      /\
     /  \
Component Stories (Storybook)
```

## 1. Unit Tests (Jest + React Testing Library)

### Coverage Areas
- **Component Behavior**: Rendering, props, user interactions
- **API Client Functions**: HTTP requests, error handling
- **Utility Functions**: Data transformations, validations
- **Edge Cases**: Error states, boundary conditions

### Test Structure
```javascript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  })

  it('should render correctly', () => {
    // Test rendering
  })

  it('should handle user interactions', () => {
    // Test user events
  })

  it('should handle error states', () => {
    // Test error scenarios
  })
})
```

### Key Test Files
- `src/components/__tests__/ClarifierDialog.test.js` - Dialog component tests
- `src/components/__tests__/ResultViewer.test.js` - Results display tests
- `src/api/__tests__/solver.test.js` - API client tests

### Mocking Strategy
- **External Dependencies**: Axios, Plotly, Next.js router
- **Browser APIs**: ResizeObserver, matchMedia, fetch
- **Component Dependencies**: Dynamic imports, external libraries

## 2. End-to-End Tests (Cypress)

### Test Scenarios
- **Complete Workflow**: Problem description → YAML generation → Optimization → Results
- **Demo Task Flow**: Load demo → Review → Run optimization
- **Error Handling**: API failures, validation errors
- **Navigation**: Step transitions, back/forward navigation
- **Responsive Design**: Mobile, tablet, desktop layouts
- **Accessibility**: Keyboard navigation, screen readers

### Test Structure
```javascript
describe('Feature', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should complete workflow', () => {
    // Test complete user journey
  })
})
```

### Custom Commands
- `mockApiResponse()` - Mock API endpoints
- `fillProblemDescription()` - Fill form inputs
- `waitForResults()` - Wait for async operations
- `shouldShowToast()` - Assert notifications

### Key Test Files
- `cypress/e2e/optimization-wizard.cy.js` - Main workflow tests

## 3. Component Stories (Storybook)

### Story Categories
- **Default States**: Normal component behavior
- **Variations**: Different props combinations
- **Edge Cases**: Empty data, error states
- **Interactive**: User interactions, animations

### Story Structure
```javascript
export default {
  title: 'Components/ComponentName',
  component: ComponentName,
  parameters: { layout: 'padded' }
}

export const Default = {
  args: { /* props */ }
}
```

### Key Story Files
- `src/components/ClarifierDialog.stories.js` - Dialog variations
- `src/components/ResultViewer.stories.js` - Results display variations

## 4. Test Configuration

### Jest Configuration (`jest.config.js`)
- Next.js integration
- Module path mapping
- Coverage collection
- Transform patterns

### Cypress Configuration (`cypress.config.js`)
- Base URL configuration
- Viewport settings
- Video/screenshot options
- Custom commands

### Storybook Configuration (`.storybook/`)
- Framework setup
- Addon configuration
- Webpack customization

## 5. Testing Best Practices

### Unit Tests
- **Test Behavior, Not Implementation**: Focus on what components do, not how
- **Mock External Dependencies**: Isolate components from external systems
- **Test Error States**: Ensure graceful error handling
- **Maintain High Coverage**: Target >80% code coverage

### E2E Tests
- **Test User Journeys**: Focus on complete workflows
- **Use Realistic Data**: Test with production-like data
- **Cross-Browser Testing**: Ensure compatibility
- **Performance Testing**: Monitor load times and responsiveness

### Component Stories
- **Document All States**: Show every possible component state
- **Interactive Testing**: Enable manual testing in Storybook
- **Accessibility Testing**: Include a11y addon for compliance
- **Visual Regression**: Use Chromatic or similar tools

## 6. Running Tests

### Prerequisites
```bash
# Install Node.js and npm
node --version  # >= 16.0.0
npm --version   # >= 8.0.0

# Install dependencies
npm install
```

### Unit Tests
```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### E2E Tests
```bash
# Run headless tests
npm run test:e2e

# Open Cypress Test Runner
npm run test:e2e:open
```

### Component Stories
```bash
# Start Storybook
npm run storybook

# Build static Storybook
npm run build-storybook
```

## 7. Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:e2e
      - run: npm run build-storybook
```

### Pre-commit Hooks
- Run unit tests
- Check code coverage
- Lint code
- Format code

## 8. Test Data Management

### Mock Data
- **API Responses**: Realistic server responses
- **User Inputs**: Valid and invalid form data
- **Error Scenarios**: Network errors, validation failures

### Test Utilities
- **Custom Commands**: Reusable test helpers
- **Mock Factories**: Generate test data
- **Assertion Helpers**: Common validation patterns

## 9. Performance Testing

### Metrics
- **Load Time**: Page load performance
- **Interaction Time**: User action responsiveness
- **Memory Usage**: Component memory footprint
- **Bundle Size**: JavaScript bundle optimization

### Tools
- **Lighthouse**: Performance auditing
- **WebPageTest**: Detailed performance analysis
- **React DevTools**: Component profiling

## 10. Accessibility Testing

### Standards
- **WCAG 2.1**: Web Content Accessibility Guidelines
- **Section 508**: US federal accessibility requirements
- **ARIA**: Accessible Rich Internet Applications

### Testing Tools
- **axe-core**: Automated accessibility testing
- **Screen Readers**: Manual testing with NVDA, JAWS
- **Keyboard Navigation**: Tab order, focus management

## 11. Future Enhancements

### Planned Improvements
- **Visual Regression Testing**: Automated UI comparison
- **Performance Monitoring**: Real user metrics
- **Cross-Browser Testing**: Automated browser compatibility
- **Mobile Testing**: Device-specific testing
- **Internationalization**: Multi-language testing

### Tools to Consider
- **Chromatic**: Visual regression testing
- **Percy**: Visual testing platform
- **BrowserStack**: Cross-browser testing
- **Sentry**: Error monitoring and performance

## Conclusion

This comprehensive testing strategy ensures the Creatoria Frontend maintains high quality, reliability, and user experience across all features and use cases. The combination of unit tests, E2E tests, and component stories provides multiple layers of validation and documentation.
