# Cloudflare Blocking Issue - CVE-2025-29927

## Проблема

**Дата:** 13 июля 2025  
**Симптомы:** Frontend получает HTML страницу ошибки Cloudflare вместо JSON от Backend API

```
Optimization error: invalid json response body at https://agent-template-edl8.onrender.com/run_task 
reason: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## Причина

### CVE-2025-29927 - Next.js Authentication Bypass Vulnerability
- **Опубликовано:** 21 марта 2025
- **Затронуты:** Почти все версии Next.js
- **Исправлено:** Next.js 14.2.26, 15.2.4, 13.5.10, 12.3.6

### Cloudflare WAF Response
- Cloudflare автоматически включил защитное правило
- Блокировал запросы с заголовком `x-middleware-subrequest`
- Vercel Server Actions используют этот заголовок
- **Результат:** 403 Forbidden + HTML страница ошибки

## Хронология решения

### 22 марта 2025, 16:00 UTC
- Cloudflare сделал правило opt-in только для Pro+ планов
- Причина: проблемы с auth middleware от третьих сторон

### 24 марта 2025, 20:00 UTC  
- Next.js выпустил патчи для старых версий (12.x, 13.x)

### 24 марта 2025, 23:00 UTC
- Next.js выпустил дополнительные патчи для устранения новой уязвимости

## Решение

### ✅ Обновление Next.js (Рекомендуется)
```json
{
  "next": "14.2.26"  // Было: "^14.0.0"
}
```

### 🛡️ Альтернативное решение: Cloudflare WAF Rule
Если обновление Next.js невозможно, можно включить защитное правило:

1. **Cloudflare Dashboard** → Security → WAF → Managed rules
2. Найти правило `CVE-2025-29927` (ID: `34583778093748cc83ff7b38f472013e`)
3. **Status:** Enabled, **Action:** Block

### 🔧 Custom WAF Rule (для Free плана)
```
(len(http.request.headers["x-middleware-subrequest"]) > 0)
```
**Action:** Block

## Проверка решения

### 1. Тест API напрямую
```bash
curl -X POST https://agent-template-edl8.onrender.com/run_task \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

### 2. Тест через Frontend
- Открыть приложение на Vercel
- Выполнить оптимизацию
- Проверить отсутствие ошибок JSON parsing

## Статус

- **Backend (Render.com):** ✅ Работает корректно (логи показывают успешную оптимизацию)
- **Frontend (Vercel):** ⚠️ Требует обновления Next.js до 14.2.26
- **Cloudflare:** ✅ Правило отключено с 24 марта 2025

## Ссылки

- [CVE-2025-29927 GitHub Advisory](https://github.com/advisories/GHSA-example)
- [Cloudflare WAF Rule Documentation](https://developers.cloudflare.com/changelog/2025-03-22-next-js-vulnerability-waf/)
- [Render Community Discussion](https://community.render.com/t/403-cloudflare-error-when-calling-my-render-api-from-vercel-server-actions/36141)

## Предотвращение в будущем

1. **Регулярные обновления Next.js**
2. **Мониторинг CVE уведомлений**
3. **Тестирование API интеграции после обновлений**
4. **Backup план с прямыми API вызовами (без Server Actions)** 