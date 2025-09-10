import React from 'react'
import { render, screen } from '@testing-library/react'
import ResultViewer from '../ResultViewer'

describe('ResultViewer', () => {
  const mockResult = {
    task_id: 'test_task_123',
    status: 'success',
    solver_info: {
      solver: 'two_tier',
      total_time: 0.125
    },
    result: {
      fast_solution: {
        solve_time: 0.005,
        objective_value: 2.5,
        variables: {
          x1: 1.0,
          x2: 1.5
        }
      },
      advanced_solution: {
        solve_time: 0.120,
        objective_value: 2.3,
        variables: {
          x1: 0.9,
          x2: 1.4
        }
      }
    },
    report: 'Optimization completed successfully. The advanced solution provides better results.'
  }

  it('renders nothing when no result provided', () => {
    const { container } = render(<ResultViewer result={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('displays task information correctly', () => {
    render(<ResultViewer result={mockResult} />)
    
    expect(screen.getByText('Task: test_task_123')).toBeInTheDocument()
    expect(screen.getByText('success')).toBeInTheDocument()
    expect(screen.getByText('Solver: two_tier')).toBeInTheDocument()
    expect(screen.getByText('Total time: 0.125s')).toBeInTheDocument()
  })

  it('displays fast solution correctly', () => {
    render(<ResultViewer result={mockResult} />)
    
    expect(screen.getByText('Fast Solution')).toBeInTheDocument()
    expect(screen.getByText('0.005s')).toBeInTheDocument() // solve time
    expect(screen.getByText('2.5000')).toBeInTheDocument() // objective value
    expect(screen.getByText('x1:')).toBeInTheDocument()
    expect(screen.getByText('1.0000')).toBeInTheDocument()
    expect(screen.getByText('x2:')).toBeInTheDocument()
    expect(screen.getByText('1.5000')).toBeInTheDocument()
  })

  it('displays advanced solution correctly', () => {
    render(<ResultViewer result={mockResult} />)
    
    expect(screen.getByText('Advanced Solution')).toBeInTheDocument()
    expect(screen.getByText('0.120s')).toBeInTheDocument() // solve time
    expect(screen.getByText('2.3000')).toBeInTheDocument() // objective value
    expect(screen.getByText('0.9000')).toBeInTheDocument() // x1 value
    expect(screen.getByText('1.4000')).toBeInTheDocument() // x2 value
  })

  it('displays report section when report is provided', () => {
    render(<ResultViewer result={mockResult} />)
    
    expect(screen.getByText('Analysis Report')).toBeInTheDocument()
    expect(screen.getByText('Optimization completed successfully. The advanced solution provides better results.')).toBeInTheDocument()
  })

  it('displays plotly chart when variables are present', () => {
    render(<ResultViewer result={mockResult} />)
    
    expect(screen.getByText('Variable Values')).toBeInTheDocument()
    expect(screen.getByTestId('plotly-chart')).toBeInTheDocument()
  })

  it('displays raw data in debug section', () => {
    render(<ResultViewer result={mockResult} />)
    
    expect(screen.getByText('Raw Response Data (Debug)')).toBeInTheDocument()
    // The details element should contain the JSON data
    const detailsElement = screen.getByText('Raw Response Data (Debug)').closest('details')
    expect(detailsElement).toBeInTheDocument()
  })

  it('handles missing advanced solution gracefully', () => {
    const resultWithoutAdvanced = {
      ...mockResult,
      result: {
        fast_solution: mockResult.result.fast_solution
      }
    }

    render(<ResultViewer result={resultWithoutAdvanced} />)
    
    expect(screen.getByText('Fast Solution')).toBeInTheDocument()
    expect(screen.queryByText('Advanced Solution')).not.toBeInTheDocument()
  })

  it('handles missing fast solution gracefully', () => {
    const resultWithoutFast = {
      ...mockResult,
      result: {
        advanced_solution: mockResult.result.advanced_solution
      }
    }

    render(<ResultViewer result={resultWithoutFast} />)
    
    expect(screen.queryByText('Fast Solution')).not.toBeInTheDocument()
    expect(screen.getByText('Advanced Solution')).toBeInTheDocument()
  })

  it('handles missing variables gracefully', () => {
    const resultWithoutVariables = {
      ...mockResult,
      result: {
        fast_solution: {
          solve_time: 0.005,
          objective_value: 2.5,
          variables: {}
        }
      }
    }

    render(<ResultViewer result={resultWithoutVariables} />)
    
    expect(screen.getByText('Fast Solution')).toBeInTheDocument()
    expect(screen.queryByText('Variable Values')).not.toBeInTheDocument()
  })

  it('handles missing report gracefully', () => {
    const resultWithoutReport = {
      ...mockResult,
      report: null
    }

    render(<ResultViewer result={resultWithoutReport} />)
    
    expect(screen.queryByText('Analysis Report')).not.toBeInTheDocument()
  })

  it('displays N/A for missing objective values', () => {
    const resultWithoutObjective = {
      ...mockResult,
      result: {
        fast_solution: {
          solve_time: 0.005,
          objective_value: null,
          variables: { x1: 1.0 }
        }
      }
    }

    render(<ResultViewer result={resultWithoutObjective} />)
    
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('handles non-numeric variable values', () => {
    const resultWithStringVariable = {
      ...mockResult,
      result: {
        fast_solution: {
          solve_time: 0.005,
          objective_value: 2.5,
          variables: {
            status: 'optimal',
            x1: 1.0
          }
        }
      }
    }

    render(<ResultViewer result={resultWithStringVariable} />)
    
    expect(screen.getByText('status:')).toBeInTheDocument()
    expect(screen.getByText('optimal')).toBeInTheDocument()
    expect(screen.getByText('1.0000')).toBeInTheDocument()
  })
}) 