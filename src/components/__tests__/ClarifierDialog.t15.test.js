import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ClarifierDialog from '../ClarifierDialog'

describe('ClarifierDialog T15 Features', () => {
  // T15 mock data with ordered_missing and attempts_left
  const mockT15Request = {
    missing: ['variables', 'objectives'],
    conflicts: [],
    questions: ['What variables should be optimized?'],
    ordered_missing: [
      {
        id: 'variables',
        question: 'What variables should be optimized?',
        status: 'missing',
        attempts: 0
      },
      {
        id: 'objectives', 
        question: 'What are your optimization objectives?',
        status: 'missing',
        attempts: 0
      }
    ],
    attempts_left: 3
  }

  const mockHistory = [
    { role: 'user', content: 'x1, x2' },
    { role: 'assistant', content: '✅ Answer accepted' }
  ]

  const mockStatusMap = {
    variables: 'resolved',
    objectives: 'missing'
  }

  const defaultT15Props = {
    open: true,
    request: mockT15Request,
    history: mockHistory,
    statusMap: mockStatusMap,
    attemptsLeft: 3,
    answer: '',
    setAnswer: jest.fn(),
    onSend: jest.fn(),
    loading: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders status table with ordered_missing data', () => {
    render(<ClarifierDialog {...defaultT15Props} />)
    
    // Check for status table headers (исправлено под реальную реализацию)
    expect(screen.getByText('Field')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument() // Сокращенный заголовок
    
    // Check for field data
    expect(screen.getByText('variables')).toBeInTheDocument()
    expect(screen.getByText('objectives')).toBeInTheDocument()
  })

  it('displays correct status indicators', () => {
    render(<ClarifierDialog {...defaultT15Props} />)
    
    // Should show resolved status for variables
    const resolvedElements = screen.getAllByText('✅')
    expect(resolvedElements.length).toBeGreaterThan(0)
    
    // Should show missing status for objectives (исправлено под реальную иконку)
    const missingElements = screen.getAllByText('⚠️')
    expect(missingElements.length).toBeGreaterThan(0)
  })

  it('displays attempts left counter', () => {
    render(<ClarifierDialog {...defaultT15Props} />)
    
    const left = screen.getByText(/Attempts left:/)
    expect(left).toBeInTheDocument()
    // mini progress bar present
    expect(screen.getByLabelText('Attempts progress')).toBeInTheDocument()
  })

  it('displays conversation history', () => {
    render(<ClarifierDialog {...defaultT15Props} />)
    
    expect(screen.getByText('x1, x2')).toBeInTheDocument()
    expect(screen.getByText('✅ Answer accepted')).toBeInTheDocument()
  })

  it('calls setAnswer when input changes', async () => {
    const user = userEvent.setup()
    const mockSetAnswer = jest.fn()
    
    render(<ClarifierDialog {...defaultT15Props} setAnswer={mockSetAnswer} />)
    
    const input = screen.getByPlaceholderText('Type your answer…')
    await user.type(input, 'test')
    
    // Исправлено - проверяем что setAnswer вызывался (любой вызов с 't')
    expect(mockSetAnswer).toHaveBeenCalledWith(expect.stringContaining('t'))
    expect(mockSetAnswer).toHaveBeenCalled()
  })

  it('calls onSend when Send button clicked', async () => {
    const user = userEvent.setup()
    const mockOnSend = jest.fn()
    
    render(<ClarifierDialog {...defaultT15Props} onSend={mockOnSend} answer="test" />)
    
    const sendButton = screen.getByText('Send')
    await user.click(sendButton)
    
    expect(mockOnSend).toHaveBeenCalled()
  })

  it('disables Send button when answer is empty', () => {
    render(<ClarifierDialog {...defaultT15Props} answer="" />)
    
    const sendButton = screen.getByText('Send')
    expect(sendButton).toBeDisabled()
  })

  it('enables Send button when answer is provided', () => {
    render(<ClarifierDialog {...defaultT15Props} answer="test answer" />)
    
    const sendButton = screen.getByText('Send')
    expect(sendButton).not.toBeDisabled()
  })

  it('displays loading state correctly', () => {
    render(<ClarifierDialog {...defaultT15Props} loading={true} />)
    
    // Исправлено - при loading кнопка показывает "Sending…"
    const sendButton = screen.getByText('Sending…')
    expect(sendButton).toBeDisabled()
  })

  it('handles conflict status in status table', () => {
    const conflictRequest = {
      ...mockT15Request,
      ordered_missing: [
        {
          id: 'variables',
          question: 'What variables should be optimized?',
          status: 'conflict',
          attempts: 2
        }
      ]
    }
    
    const conflictStatusMap = {
      variables: 'conflict'
    }
    
    render(<ClarifierDialog 
      {...defaultT15Props} 
      request={conflictRequest}
      statusMap={conflictStatusMap}
    />)
    
    // Should show conflict status
    const conflictElements = screen.getAllByText('❌')
    expect(conflictElements.length).toBeGreaterThan(0)
  })

  it('shows decreased attempts left when provided', () => {
    render(<ClarifierDialog {...defaultT15Props} attemptsLeft={1} />)
    
    const left = screen.getByText(/Attempts left:/)
    expect(left).toBeInTheDocument()
  })

  it('handles empty history gracefully', () => {
    render(<ClarifierDialog {...defaultT15Props} history={[]} />)
    
    // Should still render without errors
    expect(screen.getByText('Field')).toBeInTheDocument()
  })

  it('renders expected_format hint and example buttons for current field', () => {
    const requestWithExpected = {
      ...mockT15Request,
      current_field: 'variables',
      expected_format: {
        variables: {
          hint: 'JSON-массив или CSV-список переменных',
          examples: ['x1, x2, thickness', '[{"name":"x1"},{"name":"x2"}]']
        }
      }
    }

    render(<ClarifierDialog {...defaultT15Props} request={requestWithExpected} />)

    // Hint is rendered
    expect(screen.getByText('📋 Expected format:')).toBeInTheDocument()
    expect(screen.getByText('JSON-массив или CSV-список переменных')).toBeInTheDocument()

    // Example buttons rendered
    expect(screen.getByText('x1, x2, thickness')).toBeInTheDocument()
    expect(screen.getByText('[{"name":"x1"},{"name":"x2"}]')).toBeInTheDocument()
  })

  it('clicking example button inserts example into input via setAnswer', async () => {
    const user = userEvent.setup()
    const mockSetAnswer = jest.fn()
    const requestWithExpected = {
      ...mockT15Request,
      current_field: 'variables',
      expected_format: {
        variables: {
          hint: 'JSON-массив или CSV-список переменных',
          examples: ['x1, x2, thickness']
        }
      }
    }

    render(
      <ClarifierDialog
        {...defaultT15Props}
        request={requestWithExpected}
        setAnswer={mockSetAnswer}
      />
    )

    const exampleBtn = screen.getByText('x1, x2, thickness')
    await user.click(exampleBtn)

    expect(mockSetAnswer).toHaveBeenCalledWith('x1, x2, thickness')
  })

  it('renders bounds templates when current field is bounds_for_x1', () => {
    const requestWithBounds = {
      ...mockT15Request,
      current_field: 'bounds_for_x1'
    }
    render(<ClarifierDialog {...defaultT15Props} request={requestWithBounds} />)

    expect(screen.getByLabelText('Templates')).toBeInTheDocument()
    expect(screen.getByText('x1: 0..10')).toBeInTheDocument()
    expect(screen.getByText('min=0,max=10')).toBeInTheDocument()
  })

  it('clicking bounds template inserts formatted value', async () => {
    const user = userEvent.setup()
    const mockSetAnswer = jest.fn()
    const requestWithBounds = {
      ...mockT15Request,
      current_field: 'bounds_for_x1'
    }
    render(
      <ClarifierDialog
        {...defaultT15Props}
        request={requestWithBounds}
        setAnswer={mockSetAnswer}
      />
    )

    await user.click(screen.getByText('x1: 0..10'))
    expect(mockSetAnswer).toHaveBeenCalledWith('x1: 0..10')

    await user.click(screen.getByText('min=0,max=10'))
    expect(mockSetAnswer).toHaveBeenCalledWith('min=0,max=10')
  })

  it('shows derived Attempts left from ordered_missing for active field', () => {
    const requestRetry = {
      ...mockT15Request,
      current_field: 'variables',
      ordered_missing: [
        { id: 'variables', question: 'Q', status: 'active', attempts: 2, max_attempts: 3 }
      ]
    }
    render(<ClarifierDialog {...defaultT15Props} request={requestRetry} attemptsLeft={3} />)

      const leftEl = screen.getByText(/Attempts left:/)
  expect(leftEl).toHaveTextContent(/Attempts left:\s*1\b/) // 3 - 2 = 1
  })
})
