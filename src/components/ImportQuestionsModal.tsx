import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  ClipboardPaste,
  Copy,
  FileJson,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';

import type { Question } from '../types/anatomy';
import {
  buildAiQuestionPrompt,
  MAX_IMPORT_QUESTIONS,
  parseQuestionImport,
  type ParsedImportQuestion,
} from '../utils/questionImport';
import { useToast } from './ToastProvider';

interface Props {
  slideName: string;
  existingQuestions: Question[];
  onImport: (questions: Question[]) => void;
  onClose: () => void;
}

type Step = 'input' | 'prompt' | 'paste' | 'preview';

export default function ImportQuestionsModal({
  slideName,
  existingQuestions,
  onImport,
  onClose,
}: Props) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>('input');
  const [slideText, setSlideText] = useState('');
  const [questionCount, setQuestionCount] = useState('');
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedImportQuestion[]>([]);
  const [issues, setIssues] = useState<
    Array<{ index: number | null; field?: string; message: string }>
  >([]);
  const [busy, setBusy] = useState(false);

  const parsedQuestionCount = Number(questionCount);
  const hasValidInputs =
    slideText.trim().length > 0 &&
    Number.isSafeInteger(parsedQuestionCount) &&
    parsedQuestionCount > 0 &&
    parsedQuestionCount <= MAX_IMPORT_QUESTIONS;

  const prompt = useMemo(
    () =>
      buildAiQuestionPrompt(
        slideName,
        slideText.trim(),
        hasValidInputs ? parsedQuestionCount : undefined
      ),
    [hasValidInputs, parsedQuestionCount, slideName, slideText]
  );

  const selectedCount = parsed.filter((item) => item.selected).length;

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      showToast('Prompt panoya kopyalandı.', 'success');
    } catch {
      showToast('Kopyalanamadı. Metni elle seçip kopyala.', 'error');
    }
  };

  const analyze = () => {
    setBusy(true);
    try {
      const result = parseQuestionImport(rawText, existingQuestions);
      setIssues(result.issues);
      setParsed(result.questions);

      if (!result.ok) {
        showToast('Geçerli soru bulunamadı. Hataları kontrol et.', 'error');
        return;
      }

      setStep('preview');
    } finally {
      setBusy(false);
    }
  };

  const toggleSelected = (key: string) => {
    setParsed((current) =>
      current.map((item) =>
        item.key === key ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAll = (value: boolean) => {
    setParsed((current) =>
      current.map((item) => ({
        ...item,
        selected: item.duplicateOfExisting ? false : value,
      }))
    );
  };

  const confirmImport = () => {
    const selected = parsed
      .filter((item) => item.selected)
      .map((item) => item.question);

    if (selected.length === 0) {
      showToast('İçe aktarmak için en az bir soru seç.', 'error');
      return;
    }

    onImport(selected);
    showToast(`${selected.length} soru eklendi.`, 'success');
    onClose();
  };

  const typeLabel = (type: Question['type']) => {
    switch (type) {
      case 'multiple_choice':
        return 'Çoktan seçmeli';
      case 'written':
        return 'Yazılı';
      case 'flashcard':
        return 'Flashcard';
      case 'region':
        return 'Bölge';
    }
  };

  return (
    <div
      className="modal-backdrop question-import-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="question-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-import-title"
      >
        <header className="question-import-header">
          <div>
            <span className="editor-eyebrow">YAPAY ZEKÂ İLE</span>
            <h2 id="question-import-title">Soru oluştur / içe aktar</h2>
            <p>
              Sorular dışarıdaki bir yapay zekâ aracında üretilir. SlaytLab
              yalnızca yapıştırılan çıktıyı doğrular ve kaydeder.
            </p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X size={19} />
          </button>
        </header>

        <nav className="question-import-steps" aria-label="Adımlar">
          <button
            type="button"
            className={step === 'input' ? 'active' : ''}
            onClick={() => setStep('input')}
          >
            1. İçerik
          </button>
          <button
            type="button"
            className={step === 'prompt' ? 'active' : ''}
            disabled={!hasValidInputs}
            onClick={() => setStep('prompt')}
          >
            2. Prompt
          </button>
          <button
            type="button"
            className={step === 'paste' ? 'active' : ''}
            disabled={!hasValidInputs}
            onClick={() => setStep('paste')}
          >
            3. Yapıştır
          </button>
          <button
            type="button"
            className={step === 'preview' ? 'active' : ''}
            disabled={parsed.length === 0 || !hasValidInputs}
            onClick={() => parsed.length > 0 && setStep('preview')}
          >
            4. Önizle
          </button>
        </nav>

        <div className="question-import-body">
          {step === 'input' && (
            <section className="question-import-panel">
              <div className="question-import-panel-head">
                <Sparkles size={16} />
                <div>
                  <strong>Slayt içeriği ve soru sayısı</strong>
                  <span>
                    Önce slayttaki metni, ardından oluşturulmasını istediğin
                    minimum soru sayısını gir.
                  </span>
                </div>
              </div>

              <textarea
                className="question-import-textarea"
                value={slideText}
                onChange={(event) => setSlideText(event.target.value)}
                rows={8}
                placeholder="Slayttaki tüm metni buraya yapıştır..."
                aria-label="Slayt metni"
              />

              <label className="question-import-count-field">
                <span>
                  Minimum soru sayısı (en fazla {MAX_IMPORT_QUESTIONS})
                </span>
                <input
                  type="number"
                  min="1"
                  max={MAX_IMPORT_QUESTIONS}
                  step="1"
                  value={questionCount}
                  onChange={(event) => setQuestionCount(event.target.value)}
                  placeholder="Örn. 10"
                  aria-label="Minimum soru sayısı"
                />
              </label>

              <div className="question-import-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setStep('prompt')}
                  disabled={!hasValidInputs}
                >
                  Promptu oluştur
                </button>
              </div>
            </section>
          )}

          {step === 'prompt' && (
            <section className="question-import-panel">
              <div className="question-import-panel-head">
                <Sparkles size={16} />
                <div>
                  <strong>Hazır prompt</strong>
                  <span>
                    Slayt metni ve soru sayısı prompta eklendi. Bunu ChatGPT,
                    Claude, Gemini veya benzeri bir araca yapıştır.
                  </span>
                </div>
              </div>

              <textarea
                className="question-import-textarea"
                value={prompt}
                readOnly
                rows={14}
                aria-label="Hazır yapay zekâ promptu"
              />

              <div className="question-import-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setStep('input')}
                >
                  Bilgileri düzenle
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void copyPrompt()}
                >
                  <Copy size={16} />
                  Promptu kopyala
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setStep('paste')}
                >
                  <ClipboardPaste size={16} />
                  Çıktıyı yapıştır
                </button>
              </div>
            </section>
          )}

          {step === 'paste' && (
            <section className="question-import-panel">
              <div className="question-import-panel-head">
                <FileJson size={16} />
                <div>
                  <strong>Yapay zekâ çıktısı</strong>
                  <span>
                    Yapay zekânın kopyalaman için verdiği bloğu olduğu gibi yapıştır.
                  </span>
                </div>
              </div>

              <textarea
                className="question-import-textarea"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                rows={14}
                placeholder='{"format":"slaytlab_questions","version":1,"questions":[...]}'
                aria-label="İçe aktarılacak JSON"
              />

              {issues.length > 0 && (
                <ul className="question-import-issues" role="alert">
                  {issues.map((issue, index) => (
                    <li key={`${issue.message}-${index}`}>
                      <AlertCircle size={14} />
                      <span>
                        {issue.index !== null
                          ? `Soru ${issue.index + 1}`
                          : 'Genel'}
                        {issue.field ? ` · ${issue.field}` : ''}: {issue.message}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="question-import-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setStep('prompt')}
                >
                  Prompta dön
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={analyze}
                  disabled={busy || !rawText.trim()}
                >
                  {busy ? (
                    <Loader2 size={16} className="auth-spinner" />
                  ) : (
                    <Check size={16} />
                  )}
                  Analiz et
                </button>
              </div>
            </section>
          )}

          {step === 'preview' && (
            <section className="question-import-panel">
              <div className="question-import-summary">
                <span>
                  {parsed.length} soru bulundu · {selectedCount} seçili
                </span>
                <div className="question-import-summary-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => selectAll(true)}
                  >
                    Tümünü seç
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => selectAll(false)}
                  >
                    Seçimi kaldır
                  </button>
                </div>
              </div>

              {issues.length > 0 && (
                <ul className="question-import-issues">
                  {issues.map((issue, index) => (
                    <li key={`preview-${issue.message}-${index}`}>
                      <AlertCircle size={14} />
                      <span>
                        {issue.index !== null
                          ? `Soru ${issue.index + 1}`
                          : 'Genel'}
                        {issue.field ? ` · ${issue.field}` : ''}: {issue.message}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <ul className="question-import-list">
                {parsed.map((item, index) => (
                  <li key={item.key}>
                    <label className="question-import-item">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        disabled={item.duplicateOfExisting}
                        onChange={() => toggleSelected(item.key)}
                      />
                      <span>
                        <strong>
                          {index + 1}. {item.question.title}
                        </strong>
                        <small>
                          {typeLabel(item.question.type)}
                          {item.duplicateOfExisting
                            ? ' · Slaytta zaten var'
                            : ''}
                        </small>
                        {item.question.description && (
                          <em>{item.question.description}</em>
                        )}
                        {item.question.type === 'multiple_choice' && (
                          <ul className="question-import-choices">
                            {item.question.choices.map((choice) => (
                              <li
                                key={choice.id}
                                className={choice.correct ? 'is-correct' : ''}
                              >
                                {choice.text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <div className="question-import-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setStep('paste')}
                >
                  Düzenle
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={confirmImport}
                  disabled={selectedCount === 0}
                >
                  <Check size={16} />
                  {selectedCount} soruyu ekle
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
