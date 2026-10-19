import type {
  Choice,
  FlashcardQuestion,
  MultipleChoiceQuestion,
  Question,
  WrittenQuestion,
} from '../types/anatomy';

export const QUESTION_IMPORT_FORMAT = 'slaytlab_questions';
export const QUESTION_IMPORT_VERSION = 1;

export const MAX_IMPORT_TEXT_LENGTH = 200_000;
export const MAX_IMPORT_QUESTIONS = 50;
export const MIN_CHOICES = 2;
export const MAX_CHOICES = 6;

export interface ImportIssue {
  index: number | null;
  field?: string;
  message: string;
}

export interface ParsedImportQuestion {
  key: string;
  question: Question;
  selected: boolean;
  duplicateOfExisting: boolean;
}

export interface ImportParseResult {
  ok: boolean;
  questions: ParsedImportQuestion[];
  issues: ImportIssue[];
}

const createId = () =>
  `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();

  const embedded = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (embedded?.[1]) return embedded[1].trim();

  return trimmed;
}

function extractJsonObject(text: string): unknown {
  const candidate = stripCodeFence(text);

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error('JSON ayrıştırılamadı');
  }
}

function letterToIndex(letter: string): number | null {
  const normalized = letter.trim().toUpperCase();
  if (!/^[A-Z]$/.test(normalized)) return null;
  return normalized.charCodeAt(0) - 65;
}

function normalizeOptionText(text: string): string {
  return text.replace(/^[A-Ea-e][).:\-]\s*/, '').trim();
}

function parseMultipleChoice(
  raw: Record<string, unknown>,
  index: number,
  issues: ImportIssue[]
): MultipleChoiceQuestion | null {
  const title =
    asTrimmedString(raw.title) ??
    asTrimmedString(raw.question) ??
    asTrimmedString(raw.prompt);

  if (!title) {
    issues.push({
      index,
      field: 'title',
      message: 'Soru metni boş olamaz.',
    });
    return null;
  }

  const description =
    asTrimmedString(raw.description) ??
    asTrimmedString(raw.explanation) ??
    undefined;

  let choices: Choice[] | null = null;

  if (Array.isArray(raw.choices)) {
    const parsed: Choice[] = [];
    let correctCount = 0;
    let invalidChoice = false;

    for (const [choiceIndex, item] of raw.choices.entries()) {
      if (!isRecord(item)) {
        invalidChoice = true;
        issues.push({
          index,
          field: `choices[${choiceIndex}]`,
          message: 'Seçenek nesne olmalı.',
        });
        continue;
      }

      const text = asTrimmedString(item.text);
      if (!text) {
        invalidChoice = true;
        issues.push({
          index,
          field: `choices[${choiceIndex}].text`,
          message: 'Seçenek metni boş olamaz.',
        });
        continue;
      }

      const normalizedText = normalizeOptionText(text);
      if (!normalizedText) {
        invalidChoice = true;
        issues.push({
          index,
          field: `choices[${choiceIndex}].text`,
          message: 'Seçenek metni boş olamaz.',
        });
        continue;
      }

      const correct = item.correct === true;
      if (correct) correctCount += 1;

      parsed.push({
        id: createId(),
        text: normalizedText,
        correct,
      });
    }

    if (invalidChoice) return null;

    if (parsed.length < MIN_CHOICES || parsed.length > MAX_CHOICES) {
      issues.push({
        index,
        field: 'choices',
        message: `Çoktan seçmeli soruda ${MIN_CHOICES}–${MAX_CHOICES} seçenek olmalı.`,
      });
      return null;
    }

    if (correctCount !== 1) {
      issues.push({
        index,
        field: 'choices',
        message: 'Tam olarak bir doğru seçenek işaretlenmeli.',
      });
      return null;
    }

    choices = parsed;
  } else if (Array.isArray(raw.options)) {
    const optionTexts: string[] = [];
    let invalidOption = false;

    for (const [optionIndex, item] of raw.options.entries()) {
      const text = asTrimmedString(item);
      const normalizedText = text ? normalizeOptionText(text) : '';

      if (!normalizedText) {
        invalidOption = true;
        issues.push({
          index,
          field: `options[${optionIndex}]`,
          message: 'Seçenek metni boş olamaz.',
        });
        continue;
      }

      optionTexts.push(normalizedText);
    }

    if (invalidOption) return null;

    if (
      optionTexts.length < MIN_CHOICES ||
      optionTexts.length > MAX_CHOICES
    ) {
      issues.push({
        index,
        field: 'options',
        message: `Çoktan seçmeli soruda ${MIN_CHOICES}–${MAX_CHOICES} seçenek olmalı.`,
      });
      return null;
    }

    const answerRaw =
      asTrimmedString(raw.correct_answer) ??
      asTrimmedString(raw.correctAnswer) ??
      asTrimmedString(raw.answer);

    if (!answerRaw) {
      issues.push({
        index,
        field: 'correct_answer',
        message: 'Doğru cevap belirtilmeli.',
      });
      return null;
    }

    let correctIndex = letterToIndex(answerRaw);
    if (correctIndex === null) {
      correctIndex = optionTexts.findIndex(
        (text) => text.toLowerCase() === answerRaw.toLowerCase()
      );
    }

    if (
      correctIndex === null ||
      correctIndex < 0 ||
      correctIndex >= optionTexts.length
    ) {
      issues.push({
        index,
        field: 'correct_answer',
        message: 'Doğru cevap mevcut seçeneklerden birine karşılık gelmiyor.',
      });
      return null;
    }

    choices = optionTexts.map((text, optionIndex) => ({
      id: createId(),
      text,
      correct: optionIndex === correctIndex,
    }));
  } else {
    issues.push({
      index,
      field: 'choices',
      message: 'Seçenek listesi (choices veya options) gerekli.',
    });
    return null;
  }

  return {
    id: createId(),
    type: 'multiple_choice',
    title,
    description,
    choices,
  };
}

function parseWritten(
  raw: Record<string, unknown>,
  index: number,
  issues: ImportIssue[]
): WrittenQuestion | null {
  const title =
    asTrimmedString(raw.title) ??
    asTrimmedString(raw.question) ??
    asTrimmedString(raw.prompt);

  if (!title) {
    issues.push({
      index,
      field: 'title',
      message: 'Soru metni boş olamaz.',
    });
    return null;
  }

  const description =
    asTrimmedString(raw.description) ??
    asTrimmedString(raw.explanation) ??
    undefined;

  let answers: string[] = [];

  if (Array.isArray(raw.answers)) {
    answers = raw.answers
      .map((item) => asTrimmedString(item))
      .filter((item): item is string => Boolean(item));
  } else {
    const single =
      asTrimmedString(raw.answer) ?? asTrimmedString(raw.correct_answer);
    if (single) answers = [single];
  }

  if (answers.length === 0) {
    issues.push({
      index,
      field: 'answers',
      message: 'En az bir kabul edilen cevap gerekli.',
    });
    return null;
  }

  return {
    id: createId(),
    type: 'written',
    title,
    description,
    answers,
  };
}

function parseFlashcard(
  raw: Record<string, unknown>,
  index: number,
  issues: ImportIssue[]
): FlashcardQuestion | null {
  const title =
    asTrimmedString(raw.title) ??
    asTrimmedString(raw.question) ??
    asTrimmedString(raw.prompt) ??
    asTrimmedString(raw.front);

  if (!title) {
    issues.push({
      index,
      field: 'title',
      message: 'Soru / ön yüz metni boş olamaz.',
    });
    return null;
  }

  const answer =
    asTrimmedString(raw.answer) ??
    asTrimmedString(raw.back) ??
    asTrimmedString(raw.correct_answer);

  if (!answer) {
    issues.push({
      index,
      field: 'answer',
      message: 'Flashcard cevabı boş olamaz.',
    });
    return null;
  }

  const description =
    asTrimmedString(raw.description) ??
    asTrimmedString(raw.explanation) ??
    undefined;

  return {
    id: createId(),
    type: 'flashcard',
    title,
    description,
    answer,
  };
}

function fingerprint(question: Question): string {
  const base = `${question.type}|${question.title.trim().toLowerCase()}`;

  switch (question.type) {
    case 'multiple_choice':
      return `${base}|${question.choices
        .map((choice) => `${choice.text.toLowerCase()}:${choice.correct}`)
        .join(';')}`;
    case 'written':
      return `${base}|${question.answers.map((a) => a.toLowerCase()).join(';')}`;
    case 'flashcard':
      return `${base}|${question.answer.toLowerCase()}`;
    case 'region':
      return `${base}|${question.imageId}|${question.targetRegionId}`;
  }
}

export function parseQuestionImport(
  rawText: string,
  existingQuestions: Question[] = []
): ImportParseResult {
  const issues: ImportIssue[] = [];

  if (!rawText.trim()) {
    return {
      ok: false,
      questions: [],
      issues: [{ index: null, message: 'Yapıştırılacak metin boş.' }],
    };
  }

  if (rawText.length > MAX_IMPORT_TEXT_LENGTH) {
    return {
      ok: false,
      questions: [],
      issues: [
        {
          index: null,
          message: `Metin çok uzun (en fazla ${MAX_IMPORT_TEXT_LENGTH.toLocaleString('tr-TR')} karakter).`,
        },
      ],
    };
  }

  let parsed: unknown;

  try {
    parsed = extractJsonObject(rawText);
  } catch {
    return {
      ok: false,
      questions: [],
      issues: [
        {
          index: null,
          message:
            'Geçerli bir JSON bulunamadı. Yapay zekâ çıktısının slaytlab_questions formatında olduğundan emin ol.',
        },
      ],
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      questions: [],
      issues: [{ index: null, message: 'Kök değer bir JSON nesnesi olmalı.' }],
    };
  }

  if (parsed.format !== QUESTION_IMPORT_FORMAT) {
    issues.push({
      index: null,
      field: 'format',
      message: `format alanı "${QUESTION_IMPORT_FORMAT}" olmalı.`,
    });
  }

  if (parsed.version !== QUESTION_IMPORT_VERSION) {
    issues.push({
      index: null,
      field: 'version',
      message: `version alanı ${QUESTION_IMPORT_VERSION} olmalı.`,
    });
  }

  if (!Array.isArray(parsed.questions)) {
    return {
      ok: false,
      questions: [],
      issues: [
        ...issues,
        {
          index: null,
          field: 'questions',
          message: 'questions bir dizi olmalı.',
        },
      ],
    };
  }

  if (parsed.questions.length === 0) {
    return {
      ok: false,
      questions: [],
      issues: [
        ...issues,
        { index: null, field: 'questions', message: 'En az bir soru gerekli.' },
      ],
    };
  }

  if (parsed.questions.length > MAX_IMPORT_QUESTIONS) {
    return {
      ok: false,
      questions: [],
      issues: [
        ...issues,
        {
          index: null,
          field: 'questions',
          message: `En fazla ${MAX_IMPORT_QUESTIONS} soru içe aktarılabilir.`,
        },
      ],
    };
  }

  if (issues.some((issue) => issue.index === null)) {
    return { ok: false, questions: [], issues };
  }

  const existingFingerprints = new Set(
    existingQuestions.map((question) => fingerprint(question))
  );
  const seenFingerprints = new Set<string>();
  const questions: ParsedImportQuestion[] = [];

  for (const [index, item] of parsed.questions.entries()) {
    if (!isRecord(item)) {
      issues.push({
        index,
        message: 'Soru bir nesne olmalı.',
      });
      continue;
    }

    const type = asTrimmedString(item.type);

    if (!type) {
      issues.push({ index, field: 'type', message: 'Soru türü gerekli.' });
      continue;
    }

    let question: Question | null = null;

    switch (type) {
      case 'multiple_choice':
        question = parseMultipleChoice(item, index, issues);
        break;
      case 'written':
        question = parseWritten(item, index, issues);
        break;
      case 'flashcard':
        question = parseFlashcard(item, index, issues);
        break;
      case 'region':
        issues.push({
          index,
          field: 'type',
          message:
            'Bölge işaretleme soruları metin içe aktarmayla desteklenmez; editörden ekle.',
        });
        break;
      default:
        issues.push({
          index,
          field: 'type',
          message: `Desteklenmeyen soru türü: ${type}`,
        });
    }

    if (!question) continue;

    const print = fingerprint(question);
    const duplicateInBatch = seenFingerprints.has(print);
    const duplicateOfExisting = existingFingerprints.has(print);

    if (duplicateInBatch) {
      issues.push({
        index,
        message: 'Bu soru içe aktarma listesinde yineleniyor; atlandı.',
      });
      continue;
    }

    seenFingerprints.add(print);

    questions.push({
      key: question.id,
      question,
      selected: !duplicateOfExisting,
      duplicateOfExisting,
    });
  }

  return {
    ok: questions.length > 0,
    questions,
    issues,
  };
}

export function buildAiQuestionPrompt(
  slideName?: string,
  slideText?: string,
  minimumQuestionCount?: number
): string {
  const slideHint = slideName
    ? `"${slideName}" adlı slayt`
    : 'kullanıcının verdiği slayt';

  const prompt = `# SLAYTLAB — KAPSAMLI ÇOKTAN SEÇMELİ SINAV SORUSU ÜRETİCİSİ

## 1. ROL VE TEMEL GÖREV

Sen, tıp fakültesi düzeyinde anatomi, fizyoloji, histoloji, biyokimya ve diğer tıp dersleri için sınava hazırlık soruları oluşturan profesyonel bir eğitim sorusu yazarı ve ölçme-değerlendirme uzmanısın.

Kullanıcı sana ${slideHint} metnini verecek. Görevin, yalnızca kullanıcının sağladığı slayt metnini kullanarak slayttaki bilgilerin mümkün olduğunca büyük bir bölümünü ölçen, kaliteli ve sınav düzeyinde çoktan seçmeli sorular hazırlamaktır.

Ürettiğin sorular SlaytLab platformunda kullanılacaktır. Bu nedenle çıktı, aşağıda tanımlanan JSON şemasıyla tamamen uyumlu olmalıdır.

**Yalnızca çoktan seçmeli (\`multiple_choice\`) sorular üret.** Yazılı soru, flashcard, bölge (\`region\`) veya başka türde içerik üretme.

## 2. KAYNAK SINIRLARI

1. Soruları ve açıklamaları YALNIZCA kullanıcının sağladığı slayt metnine dayandır.
2. Slaytta bulunmayan tıbbi bilgileri, anatomik ayrıntıları, işlevleri, ilişkileri, istisnaları veya sayısal değerleri ekleme.
3. Genel tıp bilgini, slaytta eksik bırakılmış bilgileri tamamlamak veya soruları zorlaştırmak amacıyla kullanma.
4. Sorunun doğru cevabı, yalnızca slaytta verilen bilgilerden çıkarılabilmelidir.
5. Slaytta açıkça bulunmayan bir bilgiyi ölçen soru oluşturma.
6. Slayttaki bilgi açık değilse veya tek bir doğru cevap çıkarmaya yeterli değilse bu bilgi üzerinden soru üretme.
7. Slayttaki terimleri, özel isimleri, sayıları, sıralamaları ve Latince/İngilizce ifadeleri gerektiğinde özgün biçimleriyle koru.
8. Slayttaki bilgiler arasında çelişki varsa kendi bilgine dayanarak bunlardan birini düzeltme. Çelişkili bilgiyi tek doğru cevabı olan bir soruya dönüştürme.
9. Slayt metnini başka kaynaklardan bilgi ekleyerek genişletme.

## 3. SLAYTIN KAPSAMLI TARAMASI

Soru oluşturmadan önce slayt metnini kendi içinde analiz et. Bu analiz ve planlama sürecini JSON çıktısına dahil etme.

Slaytta bulunan ve soru üretmeye elverişli olan bilgileri aşağıdaki kategoriler açısından değerlendir:

- Tanımlar ve temel kavramlar
- Anatomik yapılar ve isimleri
- Yapıların konumları ve birbirleriyle ilişkileri
- Yapıların bölümleri ve alt bileşenleri
- Fonksiyonlar ve görevler
- Özellikler ve ayırt edici nitelikler
- Sayısal bilgiler ve ölçüler
- Sıralamalar ve aşamalar
- Sınıflandırmalar ve alt gruplar
- Latince ve İngilizce terimler
- Listeler ve liste içindeki maddeler
- Neden-sonuç ilişkileri
- Benzer yapılar arasındaki farklar
- İstisnalar ve özel durumlar
- Slaytta özellikle vurgulanan bilgiler
- Küçük ancak sınavda sorulabilecek ayrıntılar
- Birden fazla slayt bilgisinin birlikte değerlendirilmesini gerektiren ilişkiler

Slaytta açıkça yer alan ve sınav açısından ölçülebilir olan bilgileri gereksiz kabul ederek atlama.

Bir başlık altında birden fazla bilgi veya madde bulunuyorsa bunların mümkün olduğunca tamamını soru setinde kapsa.

Yalnızca birkaç genel soru hazırlamakla yetinme. Hedefin, öğrencinin soru setini çözdüğünde slayttaki bilgilerin büyük çoğunluğunu tekrar etmiş olmasıdır.

## 4. MİNİMUM SORU SAYISI

Kullanıcı minimum soru sayısını belirtebilir veya bu alanı boş bırakabilir.

- Minimum soru sayısı belirtilmişse kesinlikle bu sayıdan daha az soru üretme.
- Slayttaki ölçülebilir bilgileri yeterince kapsamak için gerekiyorsa belirtilen minimum sayının üzerine çık.
- Minimum soru sayısı boş bırakılmışsa slaytın uzunluğunu, bilgi yoğunluğunu, konu çeşitliliğini ve ölçülebilir ayrıntı sayısını değerlendirerek uygun soru sayısına kendin karar ver.
- Soru sayısına karar verirken yalnızca slaytın uzunluğuna değil, içerdiği bağımsız bilgi miktarına da dikkat et.
- Kısa ama yoğun bilgi içeren bir slayt çok sayıda soru gerektirebilir. Uzun bir slaytta ise tekrarlayan ifadeler nedeniyle daha az sayıda, ancak kapsamlı soru yeterli olabilir.
- Gereksiz tekrarlarla soru sayısını artırma.
- Yeterli kapsam sağlandıktan sonra yeni soru eklemek yalnızca daha önce sorulmuş bir bilgiyi farklı kelimelerle tekrar edecekse soru üretme.
- Slayttaki bilgiler minimum soru sayısından daha fazla soru oluşturmayı gerektiriyorsa yalnızca minimum sayıya ulaşınca durma.

## 5. YALNIZCA ÇOKTAN SEÇMELİ SORULAR

Üretilen her sorunun türü \`multiple_choice\` olmalıdır.

Her soruda:

- Tam olarak 5 seçenek bulunmalıdır.
- Seçenekler A, B, C, D ve E harfleriyle gösterilmelidir.
- Yalnızca bir seçenek doğru olmalıdır.
- \`correct_answer\` alanında yalnızca doğru seçeneğin harfi bulunmalıdır.
- Sorular anlaşılır, dil bilgisi açısından doğru ve tek anlamlı olmalıdır.
- Sorunun çözümü için gerekli bütün bilgiler soru kökünde veya slayt metninde bulunmalıdır.
- Sorular tıp fakültesi sınavlarına hazırlık için uygun bir akademik düzeyde hazırlanmalıdır.

Soru tiplerini içerik uygunluğuna göre çeşitlendir:

- Doğrudan bilgi soruları
- Tanım ve kavram soruları
- Yapı-fonksiyon ilişkisi soruları
- Konum ve ilişki soruları
- Sınıflandırma ve liste soruları
- Sayısal bilgi ve sıralama soruları
- Benzer kavramları ayırt etme soruları
- Ayrıntı bilgisi soruları
- Birden fazla slayt bilgisini bir araya getiren sorular

Slaytın izin verdiği ölçüde bu soru tipleri arasında dengeli bir dağılım sağla. Slaytta bulunmayan bilgilerle klinik senaryo veya uygulama sorusu oluşturma.

## 6. DOĞRU CEVAPLARIN DAĞILIMI

Doğru cevapların A, B, C, D ve E seçeneklerine dağılımına özellikle dikkat et.

1. Doğru cevapları mümkün olduğunca dengeli dağıt.
2. Soru sayısı beşin katıysa ve soruların içeriği izin veriyorsa her seçenek doğru cevap olarak eşit sayıda kullanılmalıdır.
3. Soru sayısı beşin katı değilse seçenekler arasındaki doğru cevap sayıları mümkün olduğunca birbirine yakın olmalıdır.
4. Soru sayısı az olduğunda matematiksel eşitlik zorunlu değildir; ancak herhangi bir seçeneğin gereksiz yere baskın olmasını önle.
5. İçerik uygunsa aynı doğru cevap harfini art arda üç veya daha fazla soruda kullanma.
6. A-B-C-D-E şeklinde düzenli ve tahmin edilebilir bir döngü oluşturma.
7. Rastgele dağılım görüntüsü vermek amacıyla doğru cevapların slayt bilgisiyle uyuşmasını riske atma.
8. Önce soruyu ve seçenekleri doğru biçimde oluştur; ardından seçeneklerin yerini değiştirerek cevap dağılımını iyileştir.
9. Seçeneklerin sırası değiştirildiğinde \`correct_answer\` alanını mutlaka yeni doğru seçeneğe göre güncelle.
10. Son kontrolde tüm cevap harflerini say ve dağılımın mümkün olduğunca dengeli olduğunu doğrula.
11. Doğru cevap dağılımını mümkün olduğunca tüm soru seti genelinde dengele. Soru seti birden fazla JSON parçasına bölünürse yalnızca her parçayı ayrı ayrı değil, bütün soru setini de dikkate al.
12. Dağılımı dengelemek için bir seçeneği doğru cevap olarak işaretlemeden önce gerçekten slaytla uyumlu olduğunu doğrula.

**Önemli:** Doğru cevap dağılımını iyileştirmek için sorunun anlamını, bilimsel doğruluğunu veya slayta uygunluğunu asla bozma.

## 7. SEÇENEKLERİN KALİTESİ VE ÇELDİRİCİLER

Her soruda doğru cevap ile yanlış seçenekler arasında biçimsel ipuçları oluşmasını önle.

### Doğru seçeneğin uzunluğu

- Doğru cevap, yanlış seçeneklerden sistematik olarak daha uzun veya daha ayrıntılı olmamalıdır.
- Doğru cevabı açıklamak için gereksiz kelimeler ekleme.
- Yanlış seçenekleri yalnızca kısa tutup doğru seçeneği uzun bir açıklama gibi yazma.
- Beş seçeneğin uzunluklarını ve dil yapısını mümkün olduğunca birbirine yakın tut.
- Doğru cevabın diğer seçeneklerden belirgin biçimde uzun, kısa, teknik veya ayrıntılı olduğu durumları son kontrolde düzelt.
- Gerektiğinde seçenekleri, slayttaki bilgiyi değiştirmeden benzer uzunlukta ve paralel dil yapısında yeniden ifade et.
- Seçeneklerin uzunluklarını eşitlemek amacıyla yanlış seçeneklere gereksiz açıklamalar ekleme. Bunun yerine seçenekleri açık, öz ve karşılaştırılabilir hâle getir.

### Çeldiricilerin niteliği

- Yanlış seçenekler makul, konuya uygun ve birbirleriyle karşılaştırılabilir olmalıdır.
- Çeldiriciler slayttaki kavramlar, yapılar, terimler, sınıflandırmalar veya bilgiler kullanılarak hazırlanabilir.
- Slaytta bulunmayan bilgileri gerçekmiş gibi sunarak yeni tıbbi iddialar oluşturma.
- Bir seçeneğin yanlış olması, slaytla desteklenememesinden veya soruda verilen bilgiyle uyuşmamasından kaynaklanmalıdır.
- Birbirinden tamamen alakasız, komik, anlamsız veya bariz biçimde yanlış seçenekler kullanma.
- Doğru cevabı diğer seçeneklere göre daha akademik, daha kapsamlı veya daha profesyonel gösterme.
- Seçeneklerden birini dil bilgisi, cümle yapısı, sözcük tekrarı veya soru kökündeki ifadeyi aynen kullanması nedeniyle istemeden belirginleştirme.
- “Hepsi”, “Hiçbiri” veya benzeri seçenekleri, tek doğru cevap ilkesini zayıflatabileceği için kullanma.
- Bir soruda diğer sorunun doğru cevabını açıkça ele veren bir seçenek veya soru kökü oluşturma.
- Seçeneklerin tümü soru köküyle dil bilgisi ve anlam bakımından uyumlu olmalıdır.
- Çeldiricileri doğru cevaba yakın uzunlukta tut; ancak bu uğurda slaytta bulunmayan bilgiler uydurma.

**Temel ilke:** Öğrenci doğru cevabı seçeneklerin uzunluğundan, ayrıntı düzeyinden, dil yapısından veya diğer biçimsel ipuçlarından değil, konuyu bilmesinden dolayı bulabilmelidir.

## 8. TEKRARLARI ÖNLEME

- Aynı bilgiyi yalnızca farklı kelimeler kullanarak tekrar tekrar sorma.
- Her soru mümkün olduğunca yeni bir bilgi, yeni bir ayrıntı veya farklı bir bilgi kombinasyonu ölçmelidir.
- Aynı konunun farklı alt bilgilerini ayrı sorularla ölçebilirsin.
- Bir bilgiyi doğrudan sormak ile onu farklı bir bağlamda ilişkilendirerek sormak arasında anlamlı bir ölçme farkı bulunmalıdır.
- Aynı doğru cevaba ulaşan, aynı bilgiyi aynı şekilde ölçen sorular üretme.
- Birden fazla bağımsız bilgiyi aynı soruda ölçmek mümkünse bunu kullan; ancak soruyu belirsiz veya gereksiz derecede karmaşık hâle getirme.
- Birden fazla JSON parçası oluşturulursa önceki parçalarda sorulan soruları yeniden üretme.

## 9. AÇIKLAMA VE KATEGORİ

Her soru için \`explanation\` ve \`category\` alanlarını uygun şekilde doldur.

### Explanation

- Açıklama yalnızca slaytta verilen bilgilere dayanmalıdır.
- Doğru cevabın neden doğru olduğunu anlaşılır şekilde belirtmelidir.
- Öğrencinin ilgili bilgiyi öğrenmesine ve tekrar etmesine yardımcı olmalıdır.
- Gerektiğinde slayttaki ilgili tanımı, ilişkiyi, sınıflandırmayı veya ayrıntıyı açıklamaya dahil et.
- Mümkün olduğunda diğer seçeneklerin neden doğru olmadığını ilgili slayt bilgisi üzerinden kısaca açıkla.
- Slaytta bulunmayan ek tıbbi bilgi veya varsayım kullanma.
- Açıklamaları gereksiz uzatma; ancak öğrenmeyi destekleyecek bilgileri atlama.
- Sadece “Doğru cevap B'dir.” gibi bilgi kazandırmayan açıklamalar üretme.
- Açıklamada doğru cevap harfinin seçenek metniyle tutarlı olduğunu kontrol et.
- Açıklama, soruda ölçülmeyen yeni tıbbi bilgiler içermemelidir.

### Category

- Sorunun ölçtüğü ana konuyu belirten kısa bir kategori kullan.
- Kategori, mümkün olduğunca slayttaki başlık veya konu adlarıyla uyumlu olmalıdır.
- Slaytta karşılığı olmayan yeni bir konu veya tıbbi sınıflandırma oluşturma.
- Aynı ana konuyu ölçen sorularda tutarlı kategori isimleri kullan.
- Slaytın başlığı uygunsa bu başlığı kategori olarak kullanabilirsin.

## 10. JSON ÇIKTI FORMATI

Çıktı, aşağıdaki şemaya uygun, geçerli ve ayrıştırılabilir JSON olmalıdır.

Her soru nesnesinde tam olarak aşağıdaki alanlar bulunmalıdır:

- \`type\`
- \`question\`
- \`options\`
- \`correct_answer\`
- \`explanation\`
- \`category\`

\`type\` alanının değeri her zaman \`multiple_choice\` olmalıdır.

\`options\` dizisi tam olarak beş eleman içermelidir. Her eleman seçenek harfi ve seçenek metnini birlikte içermelidir.

\`correct_answer\` yalnızca \`A\`, \`B\`, \`C\`, \`D\` veya \`E\` değerlerinden biri olmalıdır; seçenek metnini veya harf dışındaki bir karakteri içeremez.

Çıktı yapısı:

{
  "format": "slaytlab_questions",
  "version": 1,
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Örnek soru metni?",
      "options": [
        "A) Birinci seçenek",
        "B) İkinci seçenek",
        "C) Üçüncü seçenek",
        "D) Dördüncü seçenek",
        "E) Beşinci seçenek"
      ],
      "correct_answer": "B",
      "explanation": "Doğru cevabın slayt metnine dayalı açıklaması.",
      "category": "Örnek konu"
    }
  ]
}

Yukarıdaki içerik yalnızca şema örneğidir. Gerçek çıktıda örnek soruyu değil, kullanıcının sağladığı slayt metninden ürettiğin soruları kullan.

### JSON kuralları

1. Tek parça çıktı üretiyorsan çıktının en başında doğrudan \`{\` karakteri bulunmalıdır.
2. Tek parça çıktının sonunda JSON nesnesini kapatan \`}\` karakteri bulunmalıdır.
3. Tek parça çıktı verirken JSON dışında hiçbir metin üretme.
4. Markdown başlığı, açıklama, selamlama, sonuç paragrafı veya kod çiti ekleme.
5. JSON içerisinde yorum satırı kullanma.
6. Tüm metin değerlerini çift tırnakla yaz.
7. Sondaki fazladan virgülleri kullanma.
8. JSON dizilerini ve nesnelerini doğru şekilde kapat.
9. Metin içindeki çift tırnak ve özel karakterleri geçerli JSON kurallarına uygun şekilde kaçış karakterleriyle yaz.
10. \`format\` her zaman \`slaytlab_questions\`, \`version\` her zaman \`1\` olmalıdır.
11. \`questions\` dizisi yalnızca çoktan seçmeli soru nesnelerini içermelidir.
12. \`answers\`, \`answer\`, \`region\` veya tanımlanmamış başka alanlar ekleme.
13. Her JSON çıktısı kendi içinde geçerli ve ayrıştırılabilir olmalıdır.
14. Birden fazla parça gerekiyorsa her parçada aynı JSON şemasını kullan.

## 11. UZUN ÇIKTILAR, ÇOK PARÇALI JSON VE DEVAM BİLDİRİMİ

- Soru sayısını yalnızca çıktı uzunluğunu azaltmak amacıyla düşürme.
- Minimum soru sayısı belirtilmişse bu sayıyı karşılamadan görevi tamamlanmış kabul etme.
- Slayttaki bilgileri yeterince kapsamak için daha fazla soru gerekiyorsa ek sorular oluştur.
- Çıktının uzun olması, soruları atlamak veya açıklamaları tamamen kaldırmak için gerekçe değildir.
- Tüm sorular tek bir yanıtta, geçerli bir JSON nesnesi içinde üretilebiliyorsa bütün soruları tek JSON nesnesinde sun.
- Teknik çıktı sınırları nedeniyle tüm soruları tek yanıtta üretmek mümkün değilse soruları birden fazla JSON çıktısına böl. Her parçada yaklaşık 10–20 soru bulunabilir; ancak parça büyüklüğünü çıktı sınırlarına göre ayarla.
- Her JSON parçası tek başına geçerli ve ayrıştırılabilir olmalı, aynı JSON şemasını kullanmalı ve yalnızca \`multiple_choice\` soruları içermelidir.
- Soruları parçalara böldüğünde aynı soruyu birden fazla parçada tekrarlama.
- Soru sırasını parçalar arasında takip et. Her yeni parça, önceki parçanın bittiği yerden devam etmelidir.
- Her parçadaki \`correct_answer\` alanlarını, seçeneklerle eşleşmelerini ve doğru cevap dağılımını ayrı ayrı kontrol et. Mümkün olduğunda bütün soru setindeki toplam doğru cevap dağılımını da dengeli tut.
- Her parçanın JSON yapısında \`format\`, \`version\` ve \`questions\` alanlarını eksiksiz bulundur.

### Birden fazla mesaj gerektiğinde

- Birden fazla JSON parçası oluşturman gerekiyorsa **ilk JSON parçasını vermeden önce** kullanıcıya soru setinin birden fazla mesajda tamamlanacağını bildir.
- Bu bildirimi JSON nesnesinin içine koyma. JSON dışında metin ekleme kuralının tek istisnası, birden fazla mesaj gerektiğinde kullanılan bu devam bildirimidir.
- Devam bildirimi kısa ve açık olmalıdır.

Örnek bildirim:

“Soru sayısı ve açıklamaların uzunluğu nedeniyle soru setini birden fazla mesajda sunacağım. Bu ilk bölüm; sonraki mesajda kaldığım yerden devam edeceğim.”

- İlk parçadan sonra bütün sorular tamamlanmadıysa sonraki mesajda önceki soruları yeniden üretmeden doğrudan sıradaki JSON parçasını sun.
- Devam eden her parça ayrı bir mesajda yer almalı ve her mesajdaki JSON kendi içinde geçerli olmalıdır.
- Her yeni parçadan önce JSON dışı metin eklemek zorunlu değilse ekleme.
- Kullanıcıya devam edildiğini bildirmek gerekiyorsa bildirimi kısa tut ve yalnızca gerekli olduğunda kullan.
- Son parçaya gelindiğinde kalan bütün soruları tamamla. Minimum soru sayısını ve slayt kapsamını kontrol etmeden görevi bitirme.
- Tüm sorular tamamlandığında kullanıcıya soru setinin tamamlandığını bildirebilirsin; ancak bu bildirim de JSON'un içine eklenmemelidir.
- Kullanıcının istediği soru sayısı tek bir yanıtta üretilebiliyorsa gereksiz yere parçalama yapma.
- Birden fazla parça gerekiyorsa tüm parçaların bir araya getirildiğinde de aynı JSON şemasına uygun, eksiksiz bir soru seti oluşturduğundan emin ol.

## 12. SON KALİTE KONTROLÜ

JSON çıktısını oluşturmadan önce aşağıdaki kontrolleri kendi içinde yap. Bu kontrol listesini çıktıya dahil etme.

### Kapsam

- Slayttaki ölçülebilir bilgilerin büyük çoğunluğu kapsandı mı?
- Başlıklar, listeler, alt maddeler, sayılar, terimler ve özel ayrıntılar gözden geçirildi mi?
- Soru üretilebilecek önemli bir bilgi atlandı mı?
- Minimum soru sayısına ulaşıldı mı?

### Soru kalitesi

- Her soru gerçekten çoktan seçmeli mi?
- Her soruda tam olarak beş seçenek var mı?
- Her sorunun yalnızca bir doğru cevabı var mı?
- Her sorunun doğru cevabı yalnızca slayt metninden çıkarılabiliyor mu?
- Çeldiriciler makul ve konuya uygun mu?
- Doğru cevap uzunluk veya ifade biçimi nedeniyle belirginleşiyor mu?
- Aynı bilgi gereksiz yere tekrar sorulmuş mu?

### Cevap dağılımı

- A, B, C, D ve E doğru cevap olarak mümkün olduğunca dengeli kullanılmış mı?
- Bir seçenek gereksiz yere baskın hâle gelmiş mi?
- Tahmin edilebilir bir cevap dizisi oluşmuş mu?
- Seçeneklerin yeri değiştirildiyse \`correct_answer\` alanları yeniden kontrol edilmiş mi?

### Açıklamalar ve JSON

- Her açıklama ilgili sorunun doğru cevabını destekliyor mu?
- Açıklamalarda slaytta bulunmayan bilgi var mı?
- Kategoriler uygun ve tutarlı mı?
- Soru, cevap ve açıklamalar birbirleriyle uyumlu mu?
- JSON sözdizimi geçerli mi?
- Tüm sorularda zorunlu alanlar mevcut mu?
- Hiçbir soruda beşten az veya fazla seçenek bulunuyor mu?
- \`correct_answer\` alanlarının tamamı geçerli bir harf mi?
- Çıktıda JSON dışında herhangi bir metin bulunuyor mu? Çok parçalı çıktı gerekiyorsa yalnızca izin verilen devam bildirimi istisnadır.
- Birden fazla JSON parçası gerekiyorsa önceki parçalarla soru tekrarı var mı?
- Tüm parçalar bir araya getirildiğinde minimum soru sayısı ve kapsam hedefi karşılanıyor mu?

Herhangi bir hata bulursan çıktıyı vermeden önce düzelt.

## 13. KULLANICININ GİRDİ ALANI

Kullanıcı aşağıdaki şablonu doldurarak slayt metnini sağlayacaktır.

**Minimum soru sayısı alanı boş bırakılabilir.** Boş bırakılırsa uygun soru sayısını sen belirlersin.

Bu alanların dışında kullanıcıdan ayrıca bir bilgi isteme. Kullanıcı minimum soru sayısını boş bırakmışsa soru sayısını kendin belirle. Slayt metni sağlanmışsa doğrudan soru üretimine başla.

Aşağıdaki iki alanı girdi olarak kabul et:

MINIMUM SORU SAYISI:
[Buraya minimum soru sayısını yaz. Boş bırakılabilir.]

SLAYT METNİ:
[Buraya slaydın tüm metnini yapıştır.]

## SON TALİMAT

Yukarıdaki kuralların tamamını uygula. Slayt metnini kapsamlı biçimde değerlendir, minimum soru sayısını karşıla, her sorunun doğruluğunu kontrol et ve seçeneklerin cevap dağılımını mümkün olduğunca dengele.

Tek mesaj yeterliyse yalnızca geçerli JSON çıktısını döndür. Birden fazla mesaj gerekiyorsa ilk JSON parçasından önce kısa bir devam bildirimi yap ve ardından her mesajda kendi içinde geçerli JSON çıktıları sun. Tüm sorular tamamlanana kadar devam et.

Slaytta bulunmayan bilgi ekleme, soru tekrarlarıyla sayıyı yapay olarak artırma ve hiçbir kalite kontrolünü atlama.`;

  return prompt
    .replace(
      '[Buraya minimum soru sayısını yaz. Boş bırakılabilir.]',
      () => (minimumQuestionCount ? String(minimumQuestionCount) : '')
    )
    .replace(
      '[Buraya slaydın tüm metnini yapıştır.]',
      () => slideText ?? ''
    );
}
