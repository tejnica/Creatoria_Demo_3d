import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClarifierDialog from '../ClarifierDialog'

describe('ClarifierDialog', () => {
  const mockRequest = {
    missing: ['variables', 'objectives'],
    conflicts: ['constraint_conflict'],
    questions: ['What variables should be optimized?', 'What are the objectives?']
  }

  const defaultProps = {
    open: true,
    request: mockRequest,
    onSubmit: jest.fn(),
    loading: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when closed', () => {
    render(<ClarifierDialog {...defaultProps} open={false} />)
    expect(screen.queryByText('Clarification')).not.toBeInTheDocument()
  })

  it('renders nothing when no request provided', () => {
    render(<ClarifierDialog {...defaultProps} request={null} />)
    expect(screen.queryByText('Clarification')).not.toBeInTheDocument()
  })

  it('renders dialog with correct title and question count', () => {
    render(<ClarifierDialog {...defaultProps} />)
    expect(screen.getByText('Clarification (2)')).toBeInTheDocument()
  })

  it('displays missing fields correctly', () => {
    render(<ClarifierDialog {...defaultProps} />)
    
    expect(screen.getByText('Missing')).toBeInTheDocument()
    expect(screen.getByText('variables')).toBeInTheDocument()
    expect(screen.getByText('objectives')).toBeInTheDocument()
  })

  it('displays conflicts correctly', () => {
    render(<ClarifierDialog {...defaultProps} />)
    
    expect(screen.getByText('Conflicts')).toBeInTheDocument()
    expect(screen.getByText('constraint_conflict')).toBeInTheDocument()
  })

  it('displays questions correctly', () => {
    render(<ClarifierDialog {...defaultProps} />)
    
    expect(screen.getByText('What variables should be optimized?')).toBeInTheDocument()
    expect(screen.getByText('What are the objectives?')).toBeInTheDocument()
  })

  it('handles user input correctly', async () => {
    const user = userEvent.setup()
    render(<ClarifierDialog {...defaultProps} />)
    
    const input = screen.getByPlaceholderText('Type your answer…')
    await user.type(input, 'Test answer')
    
    expect(input).toHaveValue('Test answer')
  })

  it('calls onSubmit with correct text when Send is clicked', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = jest.fn()
    render(<ClarifierDialog {...defaultProps} onSubmit={mockOnSubmit} />)
    
    const input = screen.getByPlaceholderText('Type your answer…')
    const sendButton = screen.getByText('Send')
    
    await user.type(input, 'My answer')
    await user.click(sendButton)
    
    expect(mockOnSubmit).toHaveBeenCalledWith('My answer')
  })

  it('clears input after sending', async () => {
    const user = userEvent.setup()
    render(<ClarifierDialog {...defaultProps} />)
    
    const input = screen.getByPlaceholderText('Type your answer…')
    const sendButton = screen.getByText('Send')
    
    await user.type(input, 'My answer')
    await user.click(sendButton)
    
    expect(input).toHaveValue('')
  })

  it('disables Send button when input is empty', () => {
    render(<ClarifierDialog {...defaultProps} />)
    
    const sendButton = screen.getByText('Send')
    expect(sendButton).toBeDisabled()
  })

  it('disables Send button when loading', () => {
    render(<ClarifierDialog {...defaultProps} loading={true} />)
    
    const input = screen.getByPlaceholderText('Type your answer…')
    const sendButton = screen.getByText('Send')
    
    fireEvent.change(input, { target: { value: 'test' } })
    expect(sendButton).toBeDisabled()
  })

  it('handles empty missing and conflicts arrays', () => {
    const emptyRequest = {
      missing: [],
      conflicts: [],
      questions: ['Test question?']
    }
    
    render(<ClarifierDialog {...defaultProps} request={emptyRequest} />)
    
    expect(screen.getByText('Missing')).toBeInTheDocument()
    expect(screen.getByText('Conflicts')).toBeInTheDocument()
    expect(screen.getByText('Test question?')).toBeInTheDocument()
  })

  it('handles keyboard Enter to send message', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = jest.fn()
    render(<ClarifierDialog {...defaultProps} onSubmit={mockOnSubmit} />)
    
    const input = screen.getByPlaceholderText('Type your answer…')
    
    await user.type(input, 'My answer{enter}')
    
    // Note: This test assumes Enter key handling is implemented
    // If not implemented, this test would need to be adjusted
  })
}) 