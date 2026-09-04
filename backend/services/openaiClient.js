// Cliente de OpenAI compartido — Roberto configura su propia OPENAI_API_KEY para el
// SaaS (ver backend/.env.example). Si no está configurada, `openai` queda en null y
// cada feature que lo use debe devolver un error claro en vez de romper el server.
const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

module.exports = { openai, MODEL };
