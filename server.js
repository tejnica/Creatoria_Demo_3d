// ==============================================================================
// Файл: server.js
// Версия: Финальная, отлаженная (Прозрачный прокси)
//
// Изменения:
// 1. Этот сервер теперь работает как максимально простой и надежный прокси.
// 2. Он больше НЕ пытается анализировать или изменять ответ от Python.
// 3. Он просто получает JSON от бэкенда и пересылает его фронтенду 1-в-1.
//    Вся логика по обработке данных теперь находится на фронтенде.
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

// Эндпоинт /api/generate-yaml (без изменений)
app.post('/api/generate-yaml', async (req, res) => {
  try {
    const { description } = req.body;
    const systemPrompt = `You are a precision machine that converts user requirements into a raw YAML format...`; // Сокращено для краткости
    const userPrompt = `Based on the following user description, generate a YAML structure...\n\nUser Description: "${description}"`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
    });
    const clean = completion.choices[0].message.content.replace(/```yaml\s*|```/g, '').trim();
    const data = jsyaml.load(clean);
    res.json({ yaml: clean, data });
  } catch (err) {
    console.error("Ошибка в /api/generate-yaml:", err);
    res.status(500).json({ error: err.message });
  }
});

// Эндпоинт /api/run-opt (теперь работает как прокси)
app.post('/api/run-opt', async (req, res) => {
  try {
    const { taskKey, description } = req.body;

    if (taskKey && demoTasks[taskKey]) {
      // Для демо-задач возвращаем данные как и раньше
      return res.json(demoTasks[taskKey]);
    }
    
    // Для "живого" режима просто вызываем Python бэкенд и возвращаем его ответ как есть
    if (!PYTHON_BACKEND_URL) {
      throw new Error("URL Python бэкенда не задан (PYTHON_BACKEND_URL)");
    }
  
    console.log(`Прокси-запрос на Python бэкенд для задачи: "${description}"`);
  
    const response = await fetch(`${PYTHON_BACKEND_URL}/run_task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: description }),
        timeout: 60000, 
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Неизвестная ошибка от Python бэкенда');
    }

    // Отправляем ответ от Python на фронтенд без изменений
    res.json(data);
    
  } catch (err) {
    console.error("Критическая ошибка в /api/run-opt:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;