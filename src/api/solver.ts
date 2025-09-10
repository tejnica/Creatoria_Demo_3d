import axios from 'axios';

// ===============================================================================
// T16 Phase 2.3: Enhanced API with Semantic Analysis Support
// ===============================================================================

// Types for T16 Semantic Analysis
export interface SemanticAnalysisRequest {
  text: string;
  language?: string;
}

export interface SemanticAnalysisResponse {
  success: boolean;
  problem?: EngineeringProblem;
  ambiguities?: AmbiguitiesReport;
  extraction_confidence?: number;
  processing_notes?: string[];
  solver_input?: any;
  error?: string;
}

export interface EngineeringProblem {
  variables: EngineeringVariable[];
  objectives: EngineeringObjective[];
  constraints: EngineeringConstraint[];
  materials: string[];
  domain?: string;
  context?: string;
  problem_type?: string;
  extraction_confidence?: number;
}

export interface EngineeringVariable {
  name: string;
  description?: string;
  type: string;
  lower_bound?: number;
  upper_bound?: number;
  unit?: string;
  default_value?: number;
}

export interface EngineeringObjective {
  type: string;
  target: string;
  description?: string;
  unit?: string;
  weight?: number;
}

export interface EngineeringConstraint {
  variable: string;
  operator: string;
  value: number;
  units?: string;
  description?: string;
}

export interface AmbiguitiesReport {
  total_count: number;
  high_priority: Ambiguity[];
  medium_priority: Ambiguity[];
  low_priority: Ambiguity[];
  summary: string;
}

export interface Ambiguity {
  type: string;
  field_id: string;
  message: string;
  suggestions?: string[];
  priority: number;
}

// Enhanced Generate YAML with semantic parsing
export interface GenerateYamlRequest {
  description: string;
  use_semantic_parser?: boolean;
  session_id?: string;
}

export interface GenerateYamlResponse {
  solver_input: any;
  warnings: string[];
  errors: string[];
  validation_success: boolean;
  pipeline_log: string[];
  debug_preparser: any;
  semantic_analysis?: {
    success: boolean;
    extraction_confidence?: number;
    ambiguities?: AmbiguitiesReport;
    processing_notes?: string[];
    session_id?: string;
  };
  enhanced_by_semantic_parser?: boolean;
}

// ===============================================================================
// API Functions
// ===============================================================================

// Legacy API (preserved for backward compatibility)
export const generateYaml = (description: string) => axios.post('/api/generate-yaml', { description }).then(r => r.data);

// T16 Phase 2.3: Enhanced Generate YAML with semantic parsing
export const generateYamlEnhanced = (request: GenerateYamlRequest): Promise<GenerateYamlResponse> => 
  axios.post('/api/generate-yaml', request).then(r => r.data);

// T16 Phase 2.2: Semantic Analysis API
export const analyzeSemantics = (request: SemanticAnalysisRequest): Promise<SemanticAnalysisResponse> => 
  axios.post('/api/parse-semantic', request).then(r => r.data);

export const runOptimization = (payload: any) => axios.post('/api/run-opt', payload).then(r => r.data);

// Старт цикла уточнения: поддерживает solver_input и session_id для семантического анализа
export const startClarification = (payload: { solver_input?: any, session_id?: string } = {}) => 
  axios.post('/api/answer-clarification', payload).then(r => r.data);

// Ответ на текущий вопрос
export const answerClarification = (field_id: string, answer: string, conversation_history: any[] = [], session_id?: string) => 
  axios.post('/api/answer-clarification', { field_id, answer, conversation_history, session_id }).then(r => r.data);

// T16: Translation API - перевод текста на английский для семантического анализа
export const translateText = (text: string, sourceLanguage?: string) => 
  axios.post('/api/translate', { text, source_language: sourceLanguage }).then(r => r.data); 