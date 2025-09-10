import ClarifierDialog from './ClarifierDialog'

export default {
  title: 'Components/ClarifierDialog',
  component: ClarifierDialog,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onSubmit: { action: 'submitted' },
  },
}

export const Default = {
  args: {
    open: true,
    loading: false,
    request: {
      missing: ['variables', 'objectives', 'constraints'],
      conflicts: ['temperature_unit_mismatch'],
      questions: [
        'What variables should be optimized in your heat exchanger?',
        'What are your optimization objectives (minimize/maximize)?',
        'Are there any constraints or limitations?'
      ]
    }
  }
}

export const Loading = {
  args: {
    ...Default.args,
    loading: true
  }
}

export const MinimalRequest = {
  args: {
    ...Default.args,
    request: {
      missing: ['variables'],
      conflicts: [],
      questions: ['What variables should be optimized?']
    }
  }
}

export const NoMissingFields = {
  args: {
    ...Default.args,
    request: {
      missing: [],
      conflicts: ['unit_mismatch', 'constraint_conflict'],
      questions: [
        'There are conflicts in your input. Please clarify the temperature units.',
        'The pressure constraint conflicts with the flow rate. Which should take priority?'
      ]
    }
  }
}

export const EmptyRequest = {
  args: {
    ...Default.args,
    request: {
      missing: [],
      conflicts: [],
      questions: []
    }
  }
}

export const Closed = {
  args: {
    ...Default.args,
    open: false
  }
}

export const LongContent = {
  args: {
    ...Default.args,
    request: {
      missing: [
        'primary_variables',
        'secondary_variables', 
        'optimization_objectives',
        'performance_constraints',
        'physical_constraints',
        'cost_constraints'
      ],
      conflicts: [
        'temperature_range_conflict',
        'pressure_unit_mismatch',
        'flow_rate_inconsistency',
        'material_property_conflict'
      ],
      questions: [
        'What are the primary variables you want to optimize? (e.g., temperature, pressure, flow rate)',
        'What secondary variables should be considered in the optimization?',
        'What are your main optimization objectives? Do you want to minimize cost, maximize efficiency, or both?',
        'Are there any performance constraints such as minimum heat transfer rate or maximum pressure drop?',
        'What are the physical constraints of your system? (e.g., maximum temperature, minimum flow rate)',
        'Do you have any budget or cost constraints that should be considered?',
        'Please clarify the temperature units - are you using Celsius, Fahrenheit, or Kelvin?',
        'The pressure values seem inconsistent. Are you using bar, psi, or Pa?'
      ]
    }
  }
} 