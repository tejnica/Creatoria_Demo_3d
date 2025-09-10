import ResultViewer from './ResultViewer'

export default {
  title: 'Components/ResultViewer',
  component: ResultViewer,
  parameters: {
    layout: 'padded',
  },
}

const mockBaseResult = {
  task_id: 'heat_exchanger_optimization',
  status: 'success',
  solver_info: {
    solver: 'two_tier',
    total_time: 0.247
  }
}

export const FastSolutionOnly = {
  args: {
    result: {
      ...mockBaseResult,
      result: {
        fast_solution: {
          solve_time: 0.008,
          objective_value: 1250.75,
          variables: {
            temperature: 65.5,
            pressure: 2.1,
            flow_rate: 0.85,
            diameter: 0.025
          }
        }
      }
    }
  }
}

export const BothSolutions = {
  args: {
    result: {
      ...mockBaseResult,
      result: {
        fast_solution: {
          solve_time: 0.008,
          objective_value: 1250.75,
          variables: {
            temperature: 65.5,
            pressure: 2.1,
            flow_rate: 0.85,
            diameter: 0.025
          }
        },
        advanced_solution: {
          solve_time: 0.239,
          objective_value: 1198.32,
          variables: {
            temperature: 67.2,
            pressure: 2.05,
            flow_rate: 0.89,
            diameter: 0.027
          }
        }
      }
    }
  }
}

export const WithReport = {
  args: {
    result: {
      ...mockBaseResult,
      result: {
        fast_solution: {
          solve_time: 0.008,
          objective_value: 1250.75,
          variables: {
            temperature: 65.5,
            pressure: 2.1,
            flow_rate: 0.85
          }
        },
        advanced_solution: {
          solve_time: 0.239,
          objective_value: 1198.32,
          variables: {
            temperature: 67.2,
            pressure: 2.05,
            flow_rate: 0.89
          }
        }
      },
      report: `Optimization Analysis Report
      
The advanced solver achieved a 4.2% improvement over the fast solution, reducing the objective value from 1250.75 to 1198.32.

Key findings:
- Optimal temperature: 67.2°C (vs 65.5°C in fast solution)
- Optimal pressure: 2.05 bar (slightly lower than fast solution)
- Optimal flow rate: 0.89 m/s (higher than fast solution)

The advanced solution required 239ms vs 8ms for the fast solution, providing better results with acceptable computational cost.

Recommendations:
1. Implement the advanced solution parameters for optimal performance
2. Monitor temperature closely as it's near the upper constraint
3. Consider pressure drop implications of the higher flow rate`
    }
  }
}

export const MultipleVariables = {
  args: {
    result: {
      ...mockBaseResult,
      task_id: 'complex_system_optimization',
      result: {
        fast_solution: {
          solve_time: 0.015,
          objective_value: 2847.91,
          variables: {
            x1: 12.5,
            x2: 8.7,
            x3: 15.2,
            x4: 3.1,
            x5: 22.8,
            x6: 7.4,
            x7: 18.9,
            x8: 5.6
          }
        },
        advanced_solution: {
          solve_time: 0.432,
          objective_value: 2756.43,
          variables: {
            x1: 13.1,
            x2: 8.2,
            x3: 16.0,
            x4: 2.9,
            x5: 23.5,
            x6: 7.1,
            x7: 19.4,
            x8: 5.3
          }
        }
      }
    }
  }
}

export const ErrorStatus = {
  args: {
    result: {
      task_id: 'failed_optimization',
      status: 'error',
      solver_info: {
        solver: 'two_tier',
        total_time: 0.045
      },
      result: {
        fast_solution: null
      },
      report: 'Optimization failed: Infeasible problem detected. The constraints are contradictory and no solution exists.'
    }
  }
}

export const NoVariables = {
  args: {
    result: {
      ...mockBaseResult,
      result: {
        fast_solution: {
          solve_time: 0.003,
          objective_value: 42.0,
          variables: {}
        }
      }
    }
  }
}

export const MissingObjectiveValue = {
  args: {
    result: {
      ...mockBaseResult,
      result: {
        fast_solution: {
          solve_time: 0.005,
          objective_value: null,
          variables: {
            x: 1.0,
            y: 2.0
          }
        }
      }
    }
  }
}

export const StringVariables = {
  args: {
    result: {
      ...mockBaseResult,
      result: {
        fast_solution: {
          solve_time: 0.007,
          objective_value: 100.0,
          variables: {
            status: 'optimal',
            method: 'simplex',
            iterations: 25,
            x1: 1.5,
            x2: 2.8
          }
        }
      }
    }
  }
}

export const NoResult = {
  args: {
    result: null
  }
} 