import React, { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { act } from 'react-dom/test-utils'
import ClarifierDialog from '../ClarifierDialog'

function SmokeWrapper() {
  const [answer, setAnswer] = useState('')
  const [step, setStep] = useState(0)
  const steps = [
    {
      request: {
        current_field: 'variables',
        questions: ['Укажите переменные'],
        expected_format: {
          variables: {
            hint: 'JSON-массив или CSV-список переменных',
            examples: ['x1, x2', '[{"name":"x1"}]']
          }
        },
        ordered_missing: [
          { id: 'variables', question: 'Q', status: 'active', attempts: 0, max_attempts: 3 }
        ],
        attempts_left: 3
      }
    },
    {
      request: {
        current_field: 'objectives',
        questions: ['Какие цели оптимизировать?'],
        expected_format: {
          objectives: {
            hint: "Например: 'minimize cost'",
            examples: ['minimize cost']
          }
        },
        ordered_missing: [
          { id: 'objectives', question: 'Q', status: 'active', attempts: 0, max_attempts: 3 }
        ],
        attempts_left: 3
      }
    },
    {
      request: {
        current_field: 'bounds_for_x1',
        questions: ['Диапазон для x1'],
        expected_format: {
          bounds_for_x1: {
            hint: '0..10 или min=0,max=10',
            examples: ['0..10', 'min=0,max=10']
          }
        },
        ordered_missing: [
          { id: 'bounds_for_x1', question: 'Q', status: 'active', attempts: 1, max_attempts: 3 }
        ],
        attempts_left: 2
      }
    }
  ]

  const current = steps[step]

  return (
    <div>
      <ClarifierDialog
        open={true}
        request={current.request}
        history={[]}
        statusMap={{ [current.request.current_field]: 'missing' }}
        attemptsLeft={current.request.attempts_left}
        answer={answer}
        setAnswer={setAnswer}
        onSend={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
        loading={false}
      />
    </div>
  )
}

describe('ClarifierDialog Smoke flow', () => {
  it('variables → objectives → bounds: renders hints, examples and templates', async () => {
    const user = userEvent.setup()
    render(<SmokeWrapper />)

    // Step 1: variables
    expect(screen.getByText('📋 Expected format:')).toBeInTheDocument()
    expect(screen.getByText('JSON-массив или CSV-список переменных')).toBeInTheDocument()
    await user.click(screen.getByText('x1, x2'))

    // Send to go next step
    await act(async () => { await user.click(screen.getByText('Send')) })

    // Step 2: objectives
    expect(await screen.findByText(/Какие цели оптимизировать\?/)).toBeInTheDocument()
    expect(screen.getByText('📋 Expected format:')).toBeInTheDocument()
    const exampleBtn = screen.getByRole('button', { name: 'minimize cost' })
    expect(exampleBtn).toBeInTheDocument()
    await user.click(exampleBtn)

    // Next step
    await act(async () => { await user.click(screen.getByText('Send')) })

    // Step 3: bounds_for_x1
    expect(await screen.findByText(/Диапазон для x1/)).toBeInTheDocument()
    expect(screen.getByLabelText('Templates')).toBeInTheDocument()
    expect(screen.getByText('x1: 0..10')).toBeInTheDocument()
    expect(screen.getByText('min=0,max=10')).toBeInTheDocument()
  })
})
