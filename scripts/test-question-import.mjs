/**
 * Basit parser duman testi (vitest yok).
 * Çalıştır: node scripts/test-question-import.mjs
 *
 * Not: TypeScript kaynak derlemeden doğrudan çalışmaz; burada mantığın
 * kopyası yerine build sonrası doğrulama için build'e güveniyoruz.
 * Bu dosya örnek JSON senaryolarını JSON.parse ile doğrular.
 */

const sample = `{
  "format": "slaytlab_questions",
  "version": 1,
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Örnek?",
      "options": ["A) Bir", "B) İki", "C) Üç", "D) Dört", "E) Beş"],
      "correct_answer": "B",
      "explanation": "Slayttan"
    }
  ]
}`;

const fenced = '```json\\n' + sample + '\\n```';

function extract(raw) {
  const trimmed = raw.trim().replace(/^```(?:json)?\\s*/i, '').replace(/\\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  return JSON.parse(trimmed.slice(start, end + 1));
}

const a = extract(sample);
const b = extract(fenced.replace(/\\\\n/g, '\\n'));

if (a.format !== 'slaytlab_questions' || a.questions.length !== 1) {
  console.error('FAIL sample');
  process.exit(1);
}

if (b.questions[0].correct_answer !== 'B') {
  console.error('FAIL fenced');
  process.exit(1);
}

console.log('OK: sample JSON and fenced extraction shape checks passed');
