import axios from 'axios'
import { generateYaml, runOptimization, answerClarification } from '../solver'

// Mock axios
jest.mock('axios')
const mockedAxios = axios

describe('Solver API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateYaml', () => {
    it('calls correct endpoint with description', async () => {
      const mockResponse = {
        data: {
          solver_input: { variables: [], objectives: [] },
          warnings: [],
          validation_success: true
        }
      }
      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await generateYaml('Test description')

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/generate-yaml', {
        description: 'Test description'
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('handles API errors correctly', async () => {
      const errorResponse = {
        response: {
          data: { error: 'Invalid description' },
          status: 400
        }
      }
      mockedAxios.post.mockRejectedValue(errorResponse)

      await expect(generateYaml('Invalid')).rejects.toEqual(errorResponse)
    })

    it('handles network errors correctly', async () => {
      const networkError = new Error('Network Error')
      mockedAxios.post.mockRejectedValue(networkError)

      await expect(generateYaml('Test')).rejects.toEqual(networkError)
    })
  })

  describe('runOptimization', () => {
    it('calls correct endpoint with optimization payload', async () => {
      const mockPayload = {
        problem_ir: {
          task_id: 'test_task',
          variables: [{ name: 'x1', bounds: [0, 10] }],
          objective: [{ minimize: 'x1' }]
        },
        generate_report: true,
        save_artifacts: false
      }

      const mockResponse = {
        data: {
          task_id: 'test_task',
          status: 'success',
          result: { fast_solution: { objective_value: 5.0 } }
        }
      }
      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await runOptimization(mockPayload)

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/run-opt', mockPayload)
      expect(result).toEqual(mockResponse.data)
    })

    it('handles optimization errors correctly', async () => {
      const errorResponse = {
        response: {
          data: { error: 'Solver failed' },
          status: 500
        }
      }
      mockedAxios.post.mockRejectedValue(errorResponse)

      const payload = { problem_ir: {} }
      await expect(runOptimization(payload)).rejects.toEqual(errorResponse)
    })
  })

  describe('answerClarification', () => {
    it('calls correct endpoint with answers and history', async () => {
      const mockAnswers = { field_id: 'variables', answer: 'x1, x2' }
      const mockHistory = [
        { role: 'assistant', content: 'What variables?' },
        { role: 'user', content: 'x1, x2' }
      ]

      const mockResponse = {
        data: {
          accepted: true,
          solver_input: { variables: ['x1', 'x2'] }
        }
      }
      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await answerClarification(mockAnswers, mockHistory)

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/answer-clarification', {
        answers: mockAnswers,
        conversation_history: mockHistory
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('handles clarification errors correctly', async () => {
      const errorResponse = {
        response: {
          data: { error: 'Invalid answer format' },
          status: 422
        }
      }
      mockedAxios.post.mockRejectedValue(errorResponse)

      await expect(answerClarification({}, [])).rejects.toEqual(errorResponse)
    })

    it('handles empty parameters correctly', async () => {
      const mockResponse = {
        data: {
          need_clarification: true,
          clarification_request: { questions: ['What is your goal?'] }
        }
      }
      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await answerClarification(undefined, undefined)

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/answer-clarification', {
        answers: undefined,
        conversation_history: undefined
      })
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('Error handling', () => {
    it('preserves axios error structure', async () => {
      const axiosError = {
        response: {
          data: { error: 'Server error', details: 'Internal server error' },
          status: 500,
          statusText: 'Internal Server Error'
        },
        request: {},
        message: 'Request failed with status code 500'
      }
      mockedAxios.post.mockRejectedValue(axiosError)

      try {
        await generateYaml('test')
      } catch (error) {
        expect(error).toEqual(axiosError)
        expect(error.response.status).toBe(500)
        expect(error.response.data.error).toBe('Server error')
      }
    })

    it('handles timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      }
      mockedAxios.post.mockRejectedValue(timeoutError)

      await expect(generateYaml('test')).rejects.toEqual(timeoutError)
    })
  })
}) 