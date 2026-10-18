import React, { useState, useEffect } from 'react';
import { Question } from '../types/mathverse';
import { useMathVerse } from '../context/MathVerseContext';
import { QUESTIONS_DATA } from '../data/questionsData';
import { CURRICULUM_DATA } from '../data/curriculumData';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Award,
  Lightbulb,
  Check,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';
import { formatMathNotation, compareMathAnswers } from '../utils/formatMath';

export const PracticeMode: React.FC = () => {
  const {
    user,
    selectedLessonId,
    setSelectedLessonId,
    recordQuestionResult,
    theme,
  } = useMathVerse();
  const isLight = theme === 'light';

  const currentGrade = user?.grade || 6;

  // Filter pool of questions
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // User input states for different question types
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [fillInAnswer, setFillInAnswer] = useState<string>('');
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<boolean | null>(null);
  const [selectedErrorStep, setSelectedErrorStep] = useState<number | null>(null);

  // Matching pair states
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({}); // leftId -> rightText

  // Result state
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Filter questions according to selected lesson or grade/topic
  const availableQuestions: Question[] = React.useMemo(() => {
    let pool = QUESTIONS_DATA;

    if (selectedLessonId) {
      const lesson = CURRICULUM_DATA.find((l) => l.id === selectedLessonId);
      if (lesson && lesson.practiceQuestionIds?.length > 0) {
        const lessonPool = pool.filter((q) => lesson.practiceQuestionIds.includes(q.id));
        if (lessonPool.length > 0) return lessonPool;
      }
    }

    pool = pool.filter((q) => q.grade === currentGrade);
    if (topicFilter !== 'all') {
      pool = pool.filter((q) => q.topic === topicFilter);
    }

    return pool.length > 0 ? pool : QUESTIONS_DATA.slice(0, 5);
  }, [selectedLessonId, currentGrade, topicFilter]);

  const currentQ: Question | undefined = availableQuestions[currentIndex] || availableQuestions[0];

  // Reset answer states when question changes
  useEffect(() => {
    setSelectedOption(null);
    setFillInAnswer('');
    setTrueFalseAnswer(null);
    setSelectedErrorStep(null);
    setSelectedLeft(null);
    setMatchedPairs({});
    setIsSubmitted(false);
    setIsCorrect(false);
    setShowHint(false);
  }, [currentIndex, selectedLessonId, topicFilter]);

  if (!currentQ) {
    return (
      <div className="p-8 text-center text-slate-400">
        Không có câu hỏi nào cho mục này.
      </div>
    );
  }

  // Handle Matching logic
  const handleLeftClick = (id: string) => {
    if (isSubmitted) return;
    soundManager.playClickSound();
    setSelectedLeft(id);
  };

  const handleRightClick = (rightText: string) => {
    if (isSubmitted || !selectedLeft) return;
    soundManager.playClickSound();
    setMatchedPairs((prev) => ({
      ...prev,
      [selectedLeft]: rightText,
    }));
    setSelectedLeft(null);
  };

  // Submit and evaluate answer
  const handleSubmit = () => {
    if (isSubmitted) return;

    let correct = false;
    let studentAns = '';

    if (currentQ.type === 'multiple_choice') {
      if (!selectedOption) return;
      studentAns = selectedOption;
      correct = compareMathAnswers(selectedOption, currentQ.correctAnswer);
    } else if (currentQ.type === 'fill_in') {
      if (!fillInAnswer.trim()) return;
      studentAns = fillInAnswer.trim();
      correct = compareMathAnswers(fillInAnswer, currentQ.correctAnswer);
    } else if (currentQ.type === 'true_false') {
      if (trueFalseAnswer === null) return;
      studentAns = trueFalseAnswer ? 'Đúng' : 'Sai';
      correct = compareMathAnswers(trueFalseAnswer, currentQ.correctAnswer);
    } else if (currentQ.type === 'find_error') {
      if (selectedErrorStep === null) return;
      studentAns = `Bước ${selectedErrorStep}`;
      correct = selectedErrorStep === currentQ.correctAnswer;
    } else if (currentQ.type === 'match_formula') {
      if (!currentQ.matchingPairs) return;
      studentAns = 'Ghép đôi';
      const allMatched = currentQ.matchingPairs.every(
        (pair) => matchedPairs[pair.id] === pair.right
      );
      correct = allMatched;
    }

    setIsCorrect(correct);
    setIsSubmitted(true);

    recordQuestionResult(
      currentQ.id,
      correct,
      currentQ.topic,
      currentQ.question,
      studentAns,
      String(currentQ.correctAnswer),
      currentQ.explanation,
      currentQ.xpReward
    );
  };

  const handleNext = () => {
    soundManager.playClickSound();
    if (currentIndex < availableQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0); // Loop back
    }
  };

  // Clear specific lesson filter if user wants all questions
  const clearLessonFilter = () => {
    setSelectedLessonId(null);
  };

  const distinctTopics = ['all', 'Số học', 'Phân số', 'Đại số', 'Hình học'];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-colors ${
        isLight ? 'bg-white border-slate-200/90 shadow-xs' : 'bg-slate-900/60 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              isLight
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
            }`}>
              Lớp {currentQ.grade} • {currentQ.topic}
            </span>
            {selectedLessonId && (
              <span className={`text-xs flex items-center gap-1 ${isLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
                (Theo bài học)
                <button
                  onClick={clearLessonFilter}
                  className={`underline text-[11px] ml-1 cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
                >
                  Xem tất cả
                </button>
              </span>
            )}
          </div>
          <div className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Câu {currentIndex + 1} trên {availableQuestions.length} câu • Thưởng: +{currentQ.xpReward} XP
          </div>
        </div>

        {/* Topic filter if not tied to single lesson */}
        {!selectedLessonId && (
          <div className="flex items-center gap-1 overflow-x-auto">
            {distinctTopics.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTopicFilter(t);
                  setCurrentIndex(0);
                  soundManager.playClickSound();
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  topicFilter === t
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isLight
                    ? 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {t === 'all' ? 'Tất cả' : t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Question Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl backdrop-blur-xl space-y-6 card-top-accent transition-all ${
        isLight
          ? 'bg-white border-slate-200/90 text-slate-800 shadow-indigo-100/50'
          : 'bg-slate-900/90 border-slate-700/80 text-white'
      }`}>
        {/* Question Header & Hint */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
              isLight ? 'text-indigo-600' : 'text-indigo-400'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              {currentQ.type === 'multiple_choice' && 'Trắc nghiệm chọn đáp án'}
              {currentQ.type === 'fill_in' && 'Điền số / đáp án'}
              {currentQ.type === 'true_false' && 'Khẳng định Đúng hay Sai'}
              {currentQ.type === 'find_error' && 'Tìm lỗi sai trong lời giải'}
              {currentQ.type === 'match_formula' && 'Ghép đôi công thức & kết quả'}
            </span>

            {currentQ.hint && (
              <button
                onClick={() => setShowHint(!showHint)}
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                  isLight
                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:text-amber-200'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{showHint ? 'Ẩn gợi ý' : 'Gợi ý'}</span>
              </button>
            )}
          </div>

          <h2 className={`text-lg sm:text-xl font-bold leading-relaxed ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {currentQ.question}
          </h2>

          {currentQ.mathExpression && (
            <div className={`p-3 rounded-xl font-mono text-sm sm:text-base border text-center font-bold tracking-wide ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-indigo-900'
                : 'bg-slate-950 border-slate-800 text-cyan-300'
            }`}>
              {formatMathNotation(currentQ.mathExpression)}
            </div>
          )}

          {showHint && currentQ.hint && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in border ${
              isLight
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
            }`}>
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{currentQ.hint}</span>
            </div>
          )}
        </div>

        {/* QUESTION INPUT SECTION */}
        <div className="space-y-4 pt-2">
          {/* 1. Multiple Choice */}
          {currentQ.type === 'multiple_choice' && currentQ.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOption === opt;
                let optionStyle = isLight
                  ? 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-200';

                if (isSubmitted) {
                  if (opt === currentQ.correctAnswer) {
                    optionStyle = isLight
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/30'
                      : 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30';
                  } else if (isSelected && !isCorrect) {
                    optionStyle = isLight
                      ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/30'
                      : 'bg-rose-950/40 border-rose-500 text-rose-300 ring-2 ring-rose-500/30';
                  }
                } else if (isSelected) {
                  optionStyle = isLight
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-950 ring-2 ring-indigo-400/30'
                    : 'bg-indigo-950/60 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/30';
                }

                return (
                  <button
                    key={idx}
                    disabled={isSubmitted}
                    onClick={() => {
                      setSelectedOption(opt);
                      soundManager.playClickSound();
                    }}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm sm:text-base transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-mono font-bold ${
                        isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800/80 border-slate-700 text-slate-300'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{opt}</span>
                    </div>
                    {isSubmitted && opt === currentQ.correctAnswer && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. Fill in Answer */}
          {currentQ.type === 'fill_in' && (
            <div className="space-y-2">
              <label className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Nhập câu trả lời của em:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={isSubmitted}
                  value={fillInAnswer}
                  onChange={(e) => setFillInAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSubmitted && fillInAnswer.trim()) {
                      handleSubmit();
                    }
                  }}
                  placeholder="Nhập số hoặc kết quả (ví dụ: 24, -5, 1/2...)"
                  className={`flex-1 px-4 py-3 border rounded-xl font-mono text-base focus:ring-2 focus:outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500'
                      : 'bg-slate-950/80 border-slate-700 text-white focus:ring-cyan-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* 3. True / False */}
          {currentQ.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                disabled={isSubmitted}
                onClick={() => {
                  setTrueFalseAnswer(true);
                  soundManager.playClickSound();
                }}
                className={`p-5 rounded-2xl border font-bold text-base transition-all flex flex-col items-center gap-2 cursor-pointer ${
                  trueFalseAnswer === true
                    ? isLight
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/30'
                      : 'bg-emerald-950/60 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30'
                    : isLight
                    ? 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <span className="text-2xl">✅</span>
                <span>Đúng</span>
              </button>

              <button
                disabled={isSubmitted}
                onClick={() => {
                  setTrueFalseAnswer(false);
                  soundManager.playClickSound();
                }}
                className={`p-5 rounded-2xl border font-bold text-base transition-all flex flex-col items-center gap-2 cursor-pointer ${
                  trueFalseAnswer === false
                    ? isLight
                      ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/30'
                      : 'bg-rose-950/60 border-rose-400 text-rose-300 ring-2 ring-rose-500/30'
                    : isLight
                    ? 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <span className="text-2xl">❌</span>
                <span>Sai</span>
              </button>
            </div>
          )}

          {/* 4. Find Error in Solution */}
          {currentQ.type === 'find_error' && currentQ.errorSteps && (
            <div className="space-y-3">
              <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Bấm chọn bước mà em nghĩ là chứa lỗi sai trong lời giải:
              </div>
              <div className="space-y-2">
                {currentQ.errorSteps.map((step) => {
                  const isChosen = selectedErrorStep === step.stepNumber;
                  let cardStyle = isLight
                    ? 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-200';

                  if (isSubmitted) {
                    if (step.isError) {
                      cardStyle = isLight
                        ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/30'
                        : 'bg-rose-950/40 border-rose-500 text-rose-200';
                    }
                  } else if (isChosen) {
                    cardStyle = isLight
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-950 ring-2 ring-indigo-400/30'
                      : 'bg-indigo-950/60 border-cyan-400 text-cyan-200';
                  }

                  return (
                    <button
                      key={step.stepNumber}
                      disabled={isSubmitted}
                      onClick={() => {
                        setSelectedErrorStep(step.stepNumber);
                        soundManager.playClickSound();
                      }}
                      className={`w-full p-3.5 rounded-xl border text-left text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${cardStyle}`}
                    >
                      <span>{step.text}</span>
                      {isChosen && !isSubmitted && (
                        <span className={`text-xs font-bold ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`}>Đã chọn</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Match formula pairs */}
          {currentQ.type === 'match_formula' && currentQ.matchingPairs && (
            <div className="space-y-4">
              <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                1. Chọn ô bên trái (cột A) → 2. Chọn ô tương ứng bên phải (cột B) để ghép đôi:
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Left column */}
                <div className="space-y-2">
                  <div className={`text-xs font-bold uppercase ${isLight ? 'text-indigo-700' : 'text-cyan-400'}`}>Cột A</div>
                  {currentQ.matchingPairs.map((pair) => {
                    const isLeftSelected = selectedLeft === pair.id;
                    const hasMatch = !!matchedPairs[pair.id];

                    return (
                      <button
                        key={pair.id}
                        disabled={isSubmitted}
                        onClick={() => handleLeftClick(pair.id)}
                        className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                          hasMatch
                            ? isLight
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                              : 'bg-indigo-950/40 border-indigo-500/50 text-indigo-300'
                            : isLeftSelected
                            ? isLight
                              ? 'bg-cyan-50 border-cyan-400 text-cyan-900 ring-2 ring-cyan-400/40'
                              : 'bg-cyan-950/60 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/30'
                            : isLight
                            ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-2xs'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{pair.left}</span>
                          {hasMatch && (
                            <span className={`text-[10px] font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`}>
                              → {matchedPairs[pair.id]}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right column */}
                <div className="space-y-2">
                  <div className={`text-xs font-bold uppercase ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>Cột B</div>
                  {currentQ.matchingPairs.map((pair) => {
                    const isAssigned = Object.values(matchedPairs).includes(pair.right);
                    return (
                      <button
                        key={pair.id}
                        disabled={isSubmitted || !selectedLeft}
                        onClick={() => handleRightClick(pair.right)}
                        className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                          isAssigned
                            ? isLight
                              ? 'bg-purple-50 border-purple-300 text-purple-800'
                              : 'bg-purple-950/40 border-purple-500/40 text-purple-300'
                            : selectedLeft
                            ? isLight
                              ? 'bg-white border-purple-400 hover:bg-purple-50 text-purple-950 shadow-sm'
                              : 'bg-slate-950 border-purple-500/40 hover:bg-purple-900/40 hover:border-purple-400 text-white'
                            : isLight
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>{pair.right}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FEEDBACK & EXPLANATION PANEL */}
        {isSubmitted && (
          <div
            className={`p-5 rounded-2xl border transition-all animate-in fade-in space-y-3 ${
              isCorrect
                ? isLight
                  ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                  : 'bg-emerald-950/30 border-emerald-500/40'
                : isLight
                ? 'bg-rose-50 border-rose-300 shadow-xs'
                : 'bg-rose-950/30 border-rose-500/40'
            }`}
          >
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <>
                  <CheckCircle2 className={`w-6 h-6 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  <span className={`font-extrabold text-base ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>
                    Chính xác! (+{currentQ.xpReward} XP) 🎉
                  </span>
                </>
              ) : (
                <>
                  <XCircle className={`w-6 h-6 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
                  <span className={`font-extrabold text-base ${isLight ? 'text-rose-800' : 'text-rose-300'}`}>
                    Chưa chính xác! Cùng xem cách giải dưới đây nhé:
                  </span>
                </>
              )}
            </div>

            <div className={`text-xs sm:text-sm leading-relaxed pt-1 ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
              <strong className={`block mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>💡 Hướng dẫn chi tiết:</strong>
              <div className={`whitespace-pre-line ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{currentQ.explanation}</div>
            </div>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className={`pt-4 border-t flex items-center justify-between gap-4 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}>
          <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {isSubmitted
              ? isCorrect
                ? 'Tuyệt vời! Hãy tiếp tục phát huy.'
                : 'Đã lưu vào mục Ôn tập thông minh để rèn lại sau.'
              : 'Hãy suy nghĩ cẩn thận trước khi gửi câu trả lời.'}
          </div>

          <div className="flex items-center gap-3">
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/25 transition-transform active:scale-95 cursor-pointer"
              >
                Kiểm tra đáp án
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-500/25 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <span>Câu tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
