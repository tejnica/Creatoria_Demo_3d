// Custom commands for Creatoria testing

// Mock API responses
Cypress.Commands.add('mockApiResponse', (endpoint, response, statusCode = 200) => {
  cy.intercept('POST', endpoint, {
    statusCode,
    body: response
  }).as(endpoint.replace(/[^a-zA-Z0-9]/g, ''))
})

// Mock successful YAML generation
Cypress.Commands.add('mockGenerateYaml', (solverInput = null) => {
  const defaultResponse = {
    solver_input: solverInput || {
      variables: [
        { name: 'temperature', lower: 20, upper: 80, unit: '°C' },
        { name: 'pressure', lower: 1, upper: 5, unit: 'bar' }
      ],
      objectives: [{ minimize: 'cost' }, { maximize: 'efficiency' }],
      constraints: []
    },
    warnings: [],
    errors: [],
    validation_success: true,
    pipeline_log: ['Step 1: Parsing completed', 'Step 2: Validation passed']
  }
  
  cy.mockApiResponse('/api/generate-yaml', defaultResponse)
})

// Mock successful optimization
Cypress.Commands.add('mockRunOptimization', (result = null) => {
  const defaultResponse = {
    task_id: 'test_task_123',
    status: 'success',
    solver_info: {
      solver: 'two_tier',
      total_time: 0.125
    },
    result: result || {
      fast_solution: {
        solve_time: 0.008,
        objective_value: 1250.75,
        variables: {
          temperature: 65.5,
          pressure: 2.1
        }
      },
      advanced_solution: {
        solve_time: 0.117,
        objective_value: 1198.32,
        variables: {
          temperature: 67.2,
          pressure: 2.05
        }
      }
    },
    report: 'Optimization completed successfully.'
  }
  
  cy.mockApiResponse('/api/run-opt', defaultResponse)
})

// Mock clarification flow
Cypress.Commands.add('mockClarificationFlow', (needClarification = true) => {
  const response = needClarification ? {
    need_clarification: true,
    clarification_request: {
      missing: ['variables', 'objectives'],
      conflicts: [],
      questions: [
        'What variables should be optimized?',
        'What are your optimization objectives?'
      ]
    }
  } : {
    need_clarification: false,
    solver_input: {
      variables: [{ name: 'x1', lower: 0, upper: 10 }],
      objectives: [{ minimize: 'cost' }]
    }
  }
  
  cy.mockApiResponse('/api/answer-clarification', response)
})

// Navigation helpers
Cypress.Commands.add('goToStep', (stepNumber) => {
  // This assumes steps are accessible via direct navigation
  // Adjust based on your actual step navigation implementation
  cy.get(`[data-testid="step-${stepNumber}"]`).click()
})

// Form helpers
Cypress.Commands.add('fillProblemDescription', (description) => {
  cy.get('textarea[placeholder*="Describe what you want to optimize"]')
    .clear()
    .type(description, { delay: 10 })
})

Cypress.Commands.add('selectDemoTask', (taskKey) => {
  cy.get('select').select(taskKey)
  cy.get('button').contains('Load Demo Task').click()
})

// Wait for specific elements
Cypress.Commands.add('waitForStep', (stepNumber) => {
  cy.get(`[data-testid="step-${stepNumber}"]`, { timeout: 10000 }).should('be.visible')
})

Cypress.Commands.add('waitForResults', () => {
  cy.get('[data-testid="results-container"]', { timeout: 15000 }).should('be.visible')
})

// Assertion helpers
Cypress.Commands.add('shouldShowToast', (message, type = 'error') => {
  cy.get(`[data-testid="toast-${type}"]`)
    .should('be.visible')
    .and('contain.text', message)
})

Cypress.Commands.add('shouldShowClarificationDialog', () => {
  cy.get('[data-testid="clarification-dialog"]').should('be.visible')
  cy.get('h2').contains('Clarification').should('be.visible')
})

// Cleanup helpers
Cypress.Commands.add('resetWizard', () => {
  cy.get('button').contains('Start New Optimization').click()
  cy.get('h2').contains('Describe Your Optimization Problem').should('be.visible')
}) 