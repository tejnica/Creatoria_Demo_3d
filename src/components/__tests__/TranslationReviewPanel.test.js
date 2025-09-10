/**
 * T16 Phase 1: TranslationReviewPanel Jest Tests
 * Тесты для компонента проверки и редактирования перевода
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TranslationReviewPanel from '../TranslationReviewPanel';

describe('TranslationReviewPanel', () => {
  const defaultProps = {
    originalText: 'Оптимизировать прочность балки при минимизации веса',
    translatedText: 'Optimize beam strength while minimizing weight',
    detectedLanguage: 'ru',
    confidence: 0.9,
    onConfirm: jest.fn(),
    onBack: jest.fn(),
    onTextChange: jest.fn(),
    loading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders translation review panel with all elements', () => {
    render(<TranslationReviewPanel {...defaultProps} />);
    
    // Проверяем заголовок
    expect(screen.getByText('Translation Review')).toBeInTheDocument();
    
    // Проверяем информацию о языке и уверенности
    expect(screen.getByText('Detected: RU')).toBeInTheDocument();
    expect(screen.getByText('Confidence: 90%')).toBeInTheDocument();
    
    // Проверяем исходный текст
    expect(screen.getByText(defaultProps.originalText)).toBeInTheDocument();
    
    // Проверяем поле редактирования перевода
    const textarea = screen.getByDisplayValue(defaultProps.translatedText);
    expect(textarea).toBeInTheDocument();
    
    // Проверяем кнопки
    expect(screen.getByText('← Back')).toBeInTheDocument();
    expect(screen.getByText('Confirm & Continue to Parsing →')).toBeInTheDocument();
  });

  test('calls onTextChange when translation is edited', () => {
    render(<TranslationReviewPanel {...defaultProps} />);
    
    const textarea = screen.getByDisplayValue(defaultProps.translatedText);
    const newText = 'Optimize the beam strength while minimizing the weight';
    
    fireEvent.change(textarea, { target: { value: newText } });
    
    expect(defaultProps.onTextChange).toHaveBeenCalledWith(newText);
  });

  test('calls onConfirm when confirm button is clicked', () => {
    render(<TranslationReviewPanel {...defaultProps} />);
    
    const confirmButton = screen.getByText('Confirm & Continue to Parsing →');
    fireEvent.click(confirmButton);
    
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(defaultProps.translatedText);
  });

  test('calls onBack when back button is clicked', () => {
    render(<TranslationReviewPanel {...defaultProps} />);
    
    const backButton = screen.getByText('← Back');
    fireEvent.click(backButton);
    
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  test('disables buttons and textarea when loading', () => {
    render(<TranslationReviewPanel {...defaultProps} loading={true} />);
    
    const textarea = screen.getByDisplayValue(defaultProps.translatedText);
    const confirmButton = screen.getByText('Processing...');
    const backButton = screen.getByText('← Back');
    
    expect(textarea).toBeDisabled();
    expect(confirmButton).toBeDisabled();
    expect(backButton).toBeDisabled();
  });

  test('disables confirm button when text is empty', () => {
    const propsWithEmptyText = {
      ...defaultProps,
      translatedText: ''
    };
    
    render(<TranslationReviewPanel {...propsWithEmptyText} />);
    
    const confirmButton = screen.getByText('Confirm & Continue to Parsing →');
    expect(confirmButton).toBeDisabled();
  });

  test('highlights technical terms in key entities preview', () => {
    const propsWithTechnicalText = {
      ...defaultProps,
      translatedText: 'Minimize mass with constraint σ ≤ 200 MPa and range 1-10 mm'
    };
    
    render(<TranslationReviewPanel {...propsWithTechnicalText} />);
    
    // Проверяем, что есть раздел Key Entities Preview
    expect(screen.getByText('Key Entities Preview')).toBeInTheDocument();
    
    // Проверяем, что есть легенда
    expect(screen.getByText('Legend:')).toBeInTheDocument();
    expect(screen.getByText('Numbers + Units')).toBeInTheDocument();
    expect(screen.getByText('Variables')).toBeInTheDocument();
    expect(screen.getByText('Operators')).toBeInTheDocument();
    expect(screen.getByText('Ranges')).toBeInTheDocument();
  });

  test('shows correct language labels', () => {
    // Тест с русским языком
    render(<TranslationReviewPanel {...defaultProps} />);
    expect(screen.getByText('Original Text (RU)')).toBeInTheDocument();
    
    // Тест с английским языком
    const englishProps = {
      ...defaultProps,
      detectedLanguage: 'en'
    };
    render(<TranslationReviewPanel {...englishProps} />);
    expect(screen.getByText('Detected: EN')).toBeInTheDocument();
  });

  test('handles missing or undefined props gracefully', () => {
    const minimalProps = {
      originalText: 'Test text',
      translatedText: 'Test text',
      onConfirm: jest.fn(),
      onBack: jest.fn()
    };
    
    render(<TranslationReviewPanel {...minimalProps} />);
    
    // Должно отображаться без ошибок
    expect(screen.getByText('Translation Review')).toBeInTheDocument();
    expect(screen.getByText('Detected: Unknown')).toBeInTheDocument();
    expect(screen.getByText('Confidence: 0%')).toBeInTheDocument();
  });

  test('updates internal state when text is changed', async () => {
    render(<TranslationReviewPanel {...defaultProps} />);
    
    const textarea = screen.getByDisplayValue(defaultProps.translatedText);
    const newText = 'Updated translation text';
    
    fireEvent.change(textarea, { target: { value: newText } });
    
    // Проверяем, что значение в textarea обновилось
    await waitFor(() => {
      expect(textarea.value).toBe(newText);
    });
  });

  test('calls onConfirm with edited text', () => {
    render(<TranslationReviewPanel {...defaultProps} />);
    
    const textarea = screen.getByDisplayValue(defaultProps.translatedText);
    const newText = 'Edited translation';
    
    // Изменяем текст
    fireEvent.change(textarea, { target: { value: newText } });
    
    // Нажимаем confirm
    const confirmButton = screen.getByText('Confirm & Continue to Parsing →');
    fireEvent.click(confirmButton);
    
    // Проверяем, что onConfirm вызван с новым текстом
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(newText);
  });

  test('renders with high confidence correctly', () => {
    const highConfidenceProps = {
      ...defaultProps,
      confidence: 0.99
    };
    
    render(<TranslationReviewPanel {...highConfidenceProps} />);
    expect(screen.getByText('Confidence: 99%')).toBeInTheDocument();
  });

  test('renders with low confidence correctly', () => {
    const lowConfidenceProps = {
      ...defaultProps,
      confidence: 0.1
    };
    
    render(<TranslationReviewPanel {...lowConfidenceProps} />);
    expect(screen.getByText('Confidence: 10%')).toBeInTheDocument();
  });
});
