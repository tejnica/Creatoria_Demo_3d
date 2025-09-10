import React, { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ClarifierDialog from '../ClarifierDialog'
import { useToast, ToastContainer } from '../Toast'

function WrapperWithToast() {
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const { toasts, addToast, removeToast } = useToast()

  const fakeApi = () => new Promise((_, reject) => setTimeout(() => reject(new Error('network')), 30))

  const onSend = async () => {
    if (!answer.trim()) return
    setLoading(true)
    try {
      await fakeApi()
    } catch (e) {
      addToast(`Clarification failed: ${e.message}`, 'error', 0)
    } finally {
      setLoading(false)
    }
  }

  const request = {
    questions: ['What variables?'],
    ordered_missing: [
      { id: 'variables', question: 'What variables?', status: 'active', attempts: 0, max_attempts: 3 }
    ],
    attempts_left: 3
  }

  return (
    <div>
      <ClarifierDialog
        open={true}
        request={request}
        history={[]}
        statusMap={{ variables: 'missing' }}
        attemptsLeft={3}
        answer={answer}
        setAnswer={setAnswer}
        onSend={onSend}
        loading={loading}
      />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

describe('ClarifierDialog Step4 UX', () => {
  it('disables send button during async and shows error toast on failure', async () => {
    const user = userEvent.setup()
    render(<WrapperWithToast />)

    const input = screen.getByPlaceholderText('Type your answer…')
    await user.type(input, 'x1, x2')

    const sendButton = screen.getByText('Send')
    await user.click(sendButton)

    // While async started, button turns to Sending… and disabled
    expect(await screen.findByText('Sending…')).toBeDisabled()

    // Then error toast should appear
    expect(await screen.findByText(/Clarification failed:/)).toBeInTheDocument()
  })
})
