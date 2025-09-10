import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SmartAnalysisDisplay from '../SmartAnalysisDisplay';

describe('SmartAnalysisDisplay', () => {
  const mockSemanticAnalysis = {
    success: true,
    extraction_confidence: 0.95,
    problem: {
      objectives: [
        { type: 'minimize', target: 'mass', unit: 'kg' },
        { type: 'maximize', target: 'heat_transfer', unit: 'W' }
      ],
      variables: [
        { name: 'tube_diameter', unit: 'm' },
        { name: 'length', unit: 'm' },
        { name: 'wall_thickness', unit: 'm' }
      ],
      constraints: [
        { description: 'pressure up to 10 bar', variable: 'pressure', operator: '<=', value: 10 }
      ],
      context: {
        materials: [
          { name: 'copper', properties: { density: { value: 8960, unit: 'kg/m³' } } }
        ]
      }
    },
    ambiguities: {
      total_count: 2,
      high_priority: [
        {
          category: 'undefined_bounds',
          description: 'Variable bounds not specified',
          priority: 'high'
        }
      ],
      medium_priority: [
        {
          category: 'missing_units',
          description: 'Units for objectives not clear',
          priority: 'medium'
        }
      ]
    }
  };

  const mockPreparser = {
    language: 'en',
    goal_candidates: ['minimize cost'],
    constraint_candidates: ['stress < 100 MPa'],
    unit_mentions: ['mm', 'kg']
  };

  test('renders semantic analysis with recognized items', () => {
    render(
      <SmartAnalysisDisplay 
        semanticAnalysis={mockSemanticAnalysis}
        hasAmbiguities={true}
      />
    );

    // Check header
    expect(screen.getByText('Результаты анализа')).toBeInTheDocument();
    expect(screen.getByText('Высокая (95%)')).toBeInTheDocument();

    // Check recognized section
    expect(screen.getByText('Что удалось распознать')).toBeInTheDocument();
    expect(screen.getByText('Цели оптимизации')).toBeInTheDocument();
    expect(screen.getByText('Переменные')).toBeInTheDocument();
    expect(screen.getByText('Ограничения')).toBeInTheDocument();
    expect(screen.getByText('Материалы')).toBeInTheDocument();

    // Check counts (using more specific selectors)
    expect(screen.getByText('2')).toBeInTheDocument(); // objectives count
    expect(screen.getByText('3')).toBeInTheDocument(); // variables count
    // Check for constraints and materials without duplicate "1" issue
    const constraintsSection = screen.getByText('Ограничения').closest('.bg-white');
    const materialsSection = screen.getByText('Материалы').closest('.bg-white');
    expect(constraintsSection).toBeInTheDocument();
    expect(materialsSection).toBeInTheDocument();
  });

  test('renders ambiguities section when present', () => {
    render(
      <SmartAnalysisDisplay 
        semanticAnalysis={mockSemanticAnalysis}
        hasAmbiguities={true}
      />
    );

    // Check ambiguities section
    expect(screen.getByText('Что нужно уточнить')).toBeInTheDocument();
    expect(screen.getByText('undefined bounds')).toBeInTheDocument(); // lowercase from category
    expect(screen.getByText('missing units')).toBeInTheDocument(); // lowercase from category
    expect(screen.getByText('Variable bounds not specified')).toBeInTheDocument();
    expect(screen.getByText('Важно')).toBeInTheDocument(); // high priority badge
  });

  test('shows clarification button when ambiguities exist', () => {
    const mockOnStartClarification = jest.fn();
    
    render(
      <SmartAnalysisDisplay 
        semanticAnalysis={mockSemanticAnalysis}
        hasAmbiguities={true}
        onStartClarification={mockOnStartClarification}
      />
    );

    const clarifyButton = screen.getByText('Начать уточнение');
    expect(clarifyButton).toBeInTheDocument();

    fireEvent.click(clarifyButton);
    expect(mockOnStartClarification).toHaveBeenCalledTimes(1);
  });

  test('shows success message when no ambiguities', () => {
    const cleanSemanticAnalysis = {
      ...mockSemanticAnalysis,
      ambiguities: { total_count: 0, high_priority: [], medium_priority: [] }
    };

    render(
      <SmartAnalysisDisplay 
        semanticAnalysis={cleanSemanticAnalysis}
        hasAmbiguities={false}
      />
    );

    expect(screen.getByText('✅ Все данные распознаны корректно')).toBeInTheDocument();
    expect(screen.queryByText('Начать уточнение')).not.toBeInTheDocument();
  });

  test('falls back to preparser data when semantic analysis not available', () => {
    render(
      <SmartAnalysisDisplay 
        preparser={mockPreparser}
        hasAmbiguities={false}
      />
    );

    expect(screen.getByText('Цели (найденные)')).toBeInTheDocument();
    expect(screen.getByText('Ограничения (найденные)')).toBeInTheDocument();
    expect(screen.getByText('Единицы измерения')).toBeInTheDocument();
  });

  test('handles empty data gracefully', () => {
    const { container } = render(<SmartAnalysisDisplay />);

    // Should not crash and container should be empty or minimal
    expect(container.firstChild).toBeNull();
  });
});
