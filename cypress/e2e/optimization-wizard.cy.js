describe('Optimization Wizard E2E', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  describe('Initial Page Load', () => {
    it('displays the wizard header and step 1', () => {
      cy.get('h1').should('contain.text', 'Creatoria Optimization Wizard')
      cy.get('h2').should('contain.text', 'Describe Your Optimization Problem')
      cy.get('[data-testid="step-indicator"]').should('contain.text', 'Step 1 of 3')
    })

    it('shows demo task selector and description textarea', () => {
      cy.get('select').should('be.visible')
      cy.get('textarea[placeholder*="Describe what you want to optimize"]').should('be.visible')
      cy.get('button').contains('Generate Configuration').should('be.disabled')
    })
  })

  describe('Demo Task Flow', () => {
    it('can select and load a demo task', () => {
      // Assume demo tasks exist in the select
      cy.get('select option').should('have.length.greaterThan', 1)
      
      // Select first demo task (skip empty option)
      cy.get('select').select(1)
      cy.get('button').contains('Load Demo Task').should('be.visible').click()
      
      // Should navigate to step 2
      cy.get('h2').should('contain.text', 'Review Generated Configuration')
      cy.get('[data-testid="step-indicator"]').should('contain.text', 'Step 2 of 3')
    })

    it('can complete demo optimization workflow', () => {
      // Load demo task
      cy.get('select').select(1)
      cy.get('button').contains('Load Demo Task').click()
      
      // Review configuration and run optimization
      cy.get('button').contains('Run Optimization').click()
      
      // Should show progress and then results
      cy.get('[data-testid="progress-bar"]', { timeout: 10000 }).should('be.visible')
      cy.get('h2').should('contain.text', 'Optimization Results')
      cy.get('[data-testid="step-indicator"]').should('contain.text', 'Step 3 of 3')
    })
  })

  describe('Custom Problem Flow', () => {
    beforeEach(() => {
      cy.mockGenerateYaml()
      cy.mockRunOptimization()
    })

    it('can generate YAML from custom description', () => {
      const description = 'Optimize heat exchanger: minimize cost, maximize efficiency. Temperature 20-80°C, pressure 1-5 bar.'
      
      cy.fillProblemDescription(description)
      cy.get('button').contains('Generate Configuration').should('not.be.disabled').click()
      
      // Wait for API call and navigation
      cy.wait('@apigenerateyaml')
      cy.get('h2').should('contain.text', 'Review Generated Configuration')
    })

    it('displays generated configuration correctly', () => {
      cy.fillProblemDescription('Test optimization problem')
      cy.get('button').contains('Generate Configuration').click()
      
      cy.wait('@apigenerateyaml')
      
      // Should show configuration details
      cy.get('h3').should('contain.text', 'Configuration YAML')
      cy.get('h3').should('contain.text', 'Goals')
      cy.get('h3').should('contain.text', 'Constraints')
      cy.get('pre').should('be.visible') // YAML display
    })

    it('can run optimization and view results', () => {
      cy.fillProblemDescription('Test optimization problem')
      cy.get('button').contains('Generate Configuration').click()
      cy.wait('@apigenerateyaml')
      
      cy.get('button').contains('Run Optimization').click()
      cy.wait('@apirunopt')
      
      // Should show results
      cy.get('h2').should('contain.text', 'Optimization Results')
      cy.get('[data-testid="task-info"]').should('contain.text', 'test_task_123')
      cy.get('[data-testid="fast-solution"]').should('be.visible')
      cy.get('[data-testid="advanced-solution"]').should('be.visible')
    })
  })

  describe('Error Handling', () => {
    it('shows error toast when YAML generation fails', () => {
      cy.mockApiResponse('/api/generate-yaml', { error: 'Invalid description' }, 400)
      
      cy.fillProblemDescription('Invalid problem')
      cy.get('button').contains('Generate Configuration').click()
      
      cy.wait('@apigenerateyaml')
      cy.shouldShowToast('YAML generation failed', 'error')
    })

    it('shows error toast when optimization fails', () => {
      cy.mockGenerateYaml()
      cy.mockApiResponse('/api/run-opt', { error: 'Solver failed' }, 500)
      
      cy.fillProblemDescription('Test problem')
      cy.get('button').contains('Generate Configuration').click()
      cy.wait('@apigenerateyaml')
      
      cy.get('button').contains('Run Optimization').click()
      cy.wait('@apirunopt')
      
      cy.shouldShowToast('Optimization failed', 'error')
    })
  })

  describe('Navigation', () => {
    beforeEach(() => {
      cy.mockGenerateYaml()
      cy.mockRunOptimization()
    })

    it('can navigate back from step 2 to step 1', () => {
      cy.fillProblemDescription('Test problem')
      cy.get('button').contains('Generate Configuration').click()
      cy.wait('@apigenerateyaml')
      
      cy.get('button').contains('Back').click()
      cy.get('h2').should('contain.text', 'Describe Your Optimization Problem')
    })

    it('can navigate back from step 3 to step 2', () => {
      cy.fillProblemDescription('Test problem')
      cy.get('button').contains('Generate Configuration').click()
      cy.wait('@apigenerateyaml')
      
      cy.get('button').contains('Run Optimization').click()
      cy.wait('@apirunopt')
      
      cy.get('button').contains('Back').click()
      cy.get('h2').should('contain.text', 'Review Generated Configuration')
    })

    it('can start new optimization from results', () => {
      cy.fillProblemDescription('Test problem')
      cy.get('button').contains('Generate Configuration').click()
      cy.wait('@apigenerateyaml')
      
      cy.get('button').contains('Run Optimization').click()
      cy.wait('@apirunopt')
      
      cy.get('button').contains('Start New Optimization').click()
      cy.get('h2').should('contain.text', 'Describe Your Optimization Problem')
      cy.get('textarea').should('have.value', '') // Should be cleared
    })
  })

  describe('Responsive Design', () => {
    it('works on mobile viewport', () => {
      cy.viewport('iphone-x')
      cy.get('h1').should('be.visible')
      cy.get('textarea').should('be.visible')
      
      // Test mobile-specific layout
      cy.get('.max-w-4xl').should('have.class', 'mx-auto')
    })

    it('works on tablet viewport', () => {
      cy.viewport('ipad-2')
      cy.get('h1').should('be.visible')
      cy.get('textarea').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      cy.get('h1').should('have.length', 1)
      cy.get('h2').should('have.length', 1)
      // Should not skip heading levels
    })

    it('has accessible form labels', () => {
      cy.get('label').should('be.visible')
      cy.get('textarea').should('have.attr', 'placeholder')
    })

    it('supports keyboard navigation', () => {
      cy.get('select').focus().should('be.focused')
      cy.get('select').tab()
      cy.get('textarea').should('be.focused')
    })
  })

  describe('Performance', () => {
    it('loads within acceptable time', () => {
      const start = Date.now()
      cy.visit('/')
      cy.get('h1').should('be.visible').then(() => {
        const loadTime = Date.now() - start
        expect(loadTime).to.be.lessThan(3000) // 3 seconds
      })
    })
  })
}) 