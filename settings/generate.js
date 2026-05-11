const fs = require('fs');
const path = require('path');

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.txt' || ext === '.md') {
    return fs.readFileSync(filePath, 'utf8');
  }
  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse');
    const buf = fs.readFileSync(filePath);
    const out = await pdfParse(buf);
    return out.text || '';
  }
  if (ext === '.docx') {
    const mammoth = require('mammoth');
    const out = await mammoth.extractRawText({ path: filePath });
    return out.value || '';
  }
  throw new Error(`Unsupported file type: ${ext}. Use .txt, .md, .pdf, or .docx.`);
}

const SYSTEM_PROMPT = `You convert a presentation script into a JSON array of "sections" for a lower-third demo overlay.

Each section MUST have this shape:
{
  "key": "kebab-case-slug",
  "title": "short title (<= 6 words)",
  "subtitle": "one-line punchline (<= 16 words)",
  "details": ["3 to 5 short bullet points"],
  "animation": "kebab-case-slug-matching-key",
  "notes": ["one entry per spoken paragraph from the script"]
}

Rules:
- Return a JSON object with a "sections" array. No prose, no markdown fences.
- Detect natural section boundaries in the script (topic shifts, headings).
- Aim for 5 to 12 sections.
- "notes" must preserve the speaker's voice and order; split long paragraphs at sentence boundaries.
- "details" are visual bullets, NOT the spoken text. Crisp, scannable, distinct from notes.
- "key" and "animation" should be identical kebab-case slugs derived from the title.`;

async function callGitHubModels({ apiKey, model, scriptText }) {
  const url = 'https://models.github.ai/inference/chat/completions';
  const body = {
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Convert this script into sections JSON:\n\n${scriptText}` },
    ],
    response_format: { type: 'json_object' },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub Models API ${res.status}: ${text.slice(0, 400)}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from model.');
  return content;
}

function parseSections(content) {
  let parsed;
  try { parsed = JSON.parse(content); }
  catch (err) {
    const m = content.match(/\[[\s\S]*\]/);
    if (!m) throw new Error('Model did not return valid JSON.');
    parsed = JSON.parse(m[0]);
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.sections)) return parsed.sections;
  const firstArr = parsed && Object.values(parsed).find((v) => Array.isArray(v));
  if (firstArr) return firstArr;
  throw new Error('Model JSON did not contain a sections array.');
}

function normalize(sections) {
  return sections.map((s, i) => {
    const title = String(s.title || `Section ${i + 1}`).trim();
    const slug = (s.key || s.animation || title)
      .toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `section-${i + 1}`;
    return {
      key: slug,
      title,
      subtitle: String(s.subtitle || '').trim(),
      details: Array.isArray(s.details) ? s.details.map((d) => String(d).trim()).filter(Boolean) : [],
      animation: (s.animation && String(s.animation).trim()) || slug,
      notes: Array.isArray(s.notes)
        ? s.notes.map((n) => String(n).trim()).filter(Boolean)
        : (s.notes ? [String(s.notes).trim()] : []),
    };
  });
}

async function generateSections({ scriptText, apiKey, model }) {
  const content = await callGitHubModels({ apiKey, model, scriptText });
  const parsed = parseSections(content);
  return normalize(parsed);
}

module.exports = { extractText, generateSections };
