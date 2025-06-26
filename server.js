// ==============================================================================
// Файл: server.js
// Версия: Финальная, с поддержкой двухшагового анализа.
//
// Изменения:
// 1. В эндпоинте /api/run-opt теперь происходит интеллектуальная обработка
//    ответа от Python API.
// 2. Он формирует ДВА набора объяснений: краткое (summary) для Шага 3
//    и полное (full_analysis) для Шага 4.
// 3. Оба набора отправляются на фронтенд за ОДИН вызов, что очень эффективно.
// ==============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jsyaml = require('js-yaml');
const { OpenAI } = require('openai');
const fetch = require('node-fetch');
const demoTasks = require('./src/demoTasks.json');

const app = express();

app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://creatoria.xyz', 'https://creatoria-demo.vercel.app', 'https://*.vercel.app'] 
    : 'http://localhost:3000'
}));
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL;

async function runLiveOptimization(fullTaskDescription) {
  if (!PYTHON_BACKEND_URL) {
    throw new Error("URL Python бэкенда не задан (PYTHON_BACKEND_URL)");
  }
  const response = await fetch(`${PYTHON_BACKEND_URL}/run_task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: fullTaskDescription }),
      timeout: 60000, 
  });
  if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Ошибка от Python бэкенда: ${errorData.error || response.statusText}`);
  }
  return response.json();
}

app.post('/api/generate-yaml', async (req, res) => {
  try {
    const { description } = req.body;
    const systemPrompt = `You are a precision machine that converts user requirements into a raw YAML format. You MUST ONLY output the raw YAML code. DO NOT add any explanations or markdown.`;
    const userPrompt = `Based on the following user description, generate a YAML structure with "goals" and "constraints".\n\nUser Description: "${description}"`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
    });
    const clean = completion.choices[0].message.content.replace(/```yaml\s*/g, '').replace(/```/g, '').trim();
    const data = jsyaml.load(clean);
    res.json({ yaml: clean, data });
  } catch (err) {
    console.error("Ошибка в /api/generate-yaml:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/run-opt', async (req, res) => {
  try {
    const { taskKey, description } = req.body;

    if (taskKey && demoTasks[taskKey]) {
      return res.json(demoTasks[taskKey]);
    }
    
    const resultFromPython = await runLiveOptimization(description);

    let paretoData = [];
    const numericalResults = resultFromPython?.numerical_results;
    
    if (numericalResults && !numericalResults.error) {
        const optimizationResult = numericalResults.result;
        if (optimizationResult?.solver === 'nsga-ii' && Array.isArray(optimizationResult.front) && optimizationResult.front.length > 0) {
            paretoData = optimizationResult.front.map(point => ({
                "mass": point[0], "stiffness": point[1], "cost": point.length > 2 ? point[2] : 100 
            }));
        } else if (numericalResults.balanced_solution) {
            const { best_for_objective_1, best_for_objective_2, balanced_solution } = numericalResults;
            paretoData = [
                { "mass": best_for_objective_1[0], "stiffness": best_for_objective_1[1], "cost": 110, "front": "A" },
                { "mass": best_for_objective_2[0], "stiffness": best_for_objective_2[1], "cost": 120, "front": "B" },
                { "mass": balanced_solution[0], "stiffness": balanced_solution[1], "cost": 100, "front": "C" }
            ];
        }
    }
    
    const fullReport = resultFromPython?.human_readable_report || "Отчет не был сгенерирован.";

    // --- НОВАЯ ЛОГИКА: Разделяем отчет на краткий и полный ---
    const summaryMatch = fullReport.match(/#\s*Резюме\s*([\s\S]*?)\n\n##/);
    const summary = summaryMatch ? summaryMatch[1].trim() : "Краткий анализ недоступен.";

    res.json({ 
        pareto: paretoData, 
        // explanations - это теперь только краткая выжимка для Шага 3
        explanations: { summary: summary },
        // full_analysis - это полный отчет для Шага 4
        full_analysis: {
            // Адаптируем под формат, который ожидает ваш UI
            summary: summary,
            trends: fullReport, // Временно поместим весь отчет сюда
            anomalies: "",
            recommendations: ""
        }
    });
    
  } catch (err) {
    console.error("Критическая ошибка в /api/run-opt:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;