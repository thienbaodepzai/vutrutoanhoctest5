import React, { useState, useEffect, useRef } from 'react';
import { Grade } from '../types/mathverse';
import { useMathVerse } from '../context/MathVerseContext';
import { PROMOTION_EXAMS, canTakePromotionExam, getGradeLockInfo } from '../data/promotionExamsData';
import { formatMathNotation, compareMathAnswers } from '../utils/formatMath';
import { soundManager } from '../utils/soundEffects';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
} from 'lucide-react';

interface GradePromotionQuizProps {
  sourceGrade: Grade;
  onClose: () => void;
}

export const GradePromotionQuiz: React.FC<GradePromotionQuizProps> = ({
  sourceGrade,
  onClose,
}) => {
  const { user, unlockGrade, setActiveTab, setActivePromotionExamGrade, theme } = useMathVerse();
  const isLight = theme === 'light';

  // Ensure sequential order 7 -> 8 -> 9: if user tries to take an exam for a grade they haven't unlocked yet, route to the first required exam
  const effectiveSourceGrade: Grade = canTakePromotionExam(user, sourceGrade)
    ? sourceGrade
    : (getGradeLockInfo(user, (sourceGrade + 1) as Grade).nextActionExamGrade || 6);

  const exam = PROMOTION_EXAMS.find((e) => e.sourceGrade === effectiveSourceGrade) || PROMOTION_EXAMS[0];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 mins
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleFinish = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsFinished(true);

    // Compute score
    let correctCount = 0;
    exam.questions.forEach((q, idx) => {
      const studentAns = userAnswers[idx];
      let correct = false;
      if (q.type === 'multiple_choice') {
        correct = compareMathAnswers(studentAns, q.correctAnswer);
      } else if (q.type === 'fill_in') {
        correct = compareMathAnswers(studentAns, q.correctAnswer);
      } else if (q.type === 'true_false') {
        correct = compareMathAnswers(studentAns, q.correctAnswer);
      } else {
        correct = compareMathAnswers(studentAns, q.correctAnswer);
      }

      if (correct) correctCount++;
    });

    const isPassed = (correctCount / exam.questions.length) * 100 >= exam.passingScorePercent;

    if (isPassed) {
      soundManager.triggerBigCelebration();
      unlockGrade(exam.sourceGrade, exam.unlocksGrade, correctCount, exam.questions.length);
    } else {
      soundManager.playWrongSound();
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = exam.questions[currentIndex];

  // ================= RESULTS SCREEN =================
  if (isFinished) {
    let correctCount = 0;
    exam.questions.forEach((q, idx) => {
      const studentAns = userAnswers[idx];
      let correct = false;
      if (q.type === 'multiple_choice') {
        correct = studentAns === q.correctAnswer;
      } else if (q.type === 'fill_in') {
        const cleanA = (studentAns || '').trim().replace(',', '.');
        const cleanB = String(q.correctAnswer).trim().replace(',', '.');
        correct = cleanA === cleanB || (parseFloat(cleanA) === parseFloat(cleanB));
      } else if (q.type === 'true_false') {
        correct = (studentAns === 'true') === q.correctAnswer;
      }
      if (correct) correctCount++;
    });

    const percentage = Math.round((correctCount / exam.questions.length) * 100);
    const isPassed = percentage >= exam.passingScorePercent;

    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto animate-in fade-in ${
        isLight ? 'bg-slate-950/45' : 'bg-slate-950/85'
      }`}>
        <div className={`w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-8 text-center space-y-5 animate-in zoom-in-95 card-top-accent transition-all ${
          isLight
            ? 'bg-white border border-slate-200 text-slate-800 shadow-indigo-100/50'
            : 'bg-slate-900 border border-slate-700 text-white'
        }`}>
          <div className="text-5xl">{isPassed ? '🎉' : '📖'}</div>

          <div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isPassed
                  ? isLight
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : isLight
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {isPassed ? 'ĐẠT TIÊU CHUẨN LÊN LỚP' : 'CHƯA ĐẠT TIÊU CHUẨN'}
            </span>
            <h2 className={`text-2xl font-black mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {isPassed
                ? `Mở khóa thành công Lớp ${exam.unlocksGrade}! 🚀`
                : 'Cần ôn tập thêm kiến thức'}
            </h2>
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{exam.bookSeries}</p>
          </div>

          {/* Score Box */}
          <div className={`p-4 rounded-2xl border flex justify-around items-center transition-colors ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}>
            <div>
              <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Số câu đúng</div>
              <div className={`text-2xl font-black font-mono ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                {correctCount}/{exam.questions.length}
              </div>
            </div>
            <div className={`border-r h-10 ${isLight ? 'border-slate-200' : 'border-slate-800'}`} />
            <div>
              <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tỉ lệ chính xác</div>
              <div className={`text-2xl font-black font-mono ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`}>{percentage}%</div>
            </div>
            <div className={`border-r h-10 ${isLight ? 'border-slate-200' : 'border-slate-800'}`} />
            <div>
              <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tiêu chuẩn</div>
              <div className={`text-base font-bold font-mono ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>≥ 70%</div>
            </div>
          </div>

          <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            {isPassed
              ? `Xuất sắc! Em đã hoàn thành bài tập tổng hợp chuẩn bộ sách Kết nối tri thức. Lớp ${exam.unlocksGrade} đã chính thức được mở khóa và thêm +150 XP vào tài khoản!`
              : `Để lên Lớp ${exam.unlocksGrade}, em cần đạt ít nhất 70% (7/10 câu). Hãy ôn lại các bài học Lớp ${exam.sourceGrade} và thử sức lại nhé!`}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {isPassed ? (
              <>
                <button
                  onClick={() => {
                    onClose();
                    setActiveTab('lessons');
                  }}
                  className="flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition-transform cursor-pointer"
                >
                  Vào học ngay Lớp {exam.unlocksGrade}
                </button>
                {exam.unlocksGrade < 9 && (
                  <button
                    onClick={() => {
                      soundManager.playClickSound();
                      setIsFinished(false);
                      setUserAnswers({});
                      setCurrentIndex(0);
                      setTimeLeft(15 * 60);
                      setActivePromotionExamGrade(exam.unlocksGrade);
                    }}
                    className="flex-1 py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 transition-transform cursor-pointer"
                  >
                    <span>Tiếp tục Thi lên Lớp {exam.unlocksGrade + 1}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsFinished(false);
                    setUserAnswers({});
                    setCurrentIndex(0);
                    setTimeLeft(15 * 60);
                  }}
                  className={`flex-1 py-3 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" /> Làm lại bài thi
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-transform cursor-pointer"
                >
                  Ôn tập lý thuyết
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= EXAM TAKING VIEW =================
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md overflow-y-auto animate-in fade-in ${
      isLight ? 'bg-slate-950/45' : 'bg-slate-950/90'
    }`}>
      <div className={`w-full max-w-2xl rounded-3xl shadow-2xl p-5 sm:p-7 space-y-5 animate-in zoom-in-95 my-auto card-top-accent transition-all ${
        isLight
          ? 'bg-white border border-slate-200 text-slate-800 shadow-indigo-100/50'
          : 'bg-slate-900 border border-slate-700 text-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isLight
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              }`}>
                Toán {exam.sourceGrade} → Lên Lớp {exam.unlocksGrade}
              </span>
              <span className={`text-[11px] hidden sm:inline ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{exam.bookSeries}</span>
            </div>
            <h3 className={`text-base sm:text-lg font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{exam.title}</h3>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold ${
              isLight
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-slate-950 border-slate-700 text-amber-300'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(timeLeft)}</span>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Question Navigator Grid */}
        <div className={`flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-xl border scrollbar-none ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          {exam.questions.map((_, i) => {
            const isAnswered = userAnswers[i] !== undefined;
            const isCurrent = i === currentIndex;
            return (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isCurrent
                    ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-300'
                    : isAnswered
                    ? isLight
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-indigo-600/40 text-cyan-300 border border-indigo-500/40'
                    : isLight
                    ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Question Details */}
        <div className={`p-5 rounded-2xl border space-y-4 transition-colors ${
          isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-950/70 border-slate-800'
        }`}>
          <div className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`}>
            Câu {currentIndex + 1} / {exam.questions.length} • {currentQ.topic}
          </div>

          <h4 className={`text-base sm:text-lg font-semibold leading-relaxed ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {currentQ.question}
          </h4>

          {currentQ.mathExpression && (
            <div className={`p-3 rounded-xl font-mono text-center font-bold tracking-wide border ${
              isLight
                ? 'bg-white border-slate-200 text-indigo-900'
                : 'bg-slate-900 border-slate-800 text-cyan-300'
            }`}>
              {formatMathNotation(currentQ.mathExpression)}
            </div>
          )}

          {/* Question Formats */}
          {currentQ.type === 'multiple_choice' && currentQ.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {currentQ.options.map((opt, idx) => {
                const isSelected = userAnswers[currentIndex] === opt;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setUserAnswers({ ...userAnswers, [currentIndex]: opt });
                      soundManager.playClickSound();
                    }}
                    className={`p-3.5 rounded-xl border text-left font-medium text-xs sm:text-sm transition-all flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? isLight
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-950 ring-2 ring-indigo-400/30'
                          : 'bg-indigo-950/70 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/30'
                        : isLight
                        ? 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-mono font-bold ${
                      isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentQ.type === 'fill_in' && (
            <div className="pt-2">
              <input
                type="text"
                value={userAnswers[currentIndex] || ''}
                onChange={(e) =>
                  setUserAnswers({ ...userAnswers, [currentIndex]: e.target.value })
                }
                placeholder="Nhập đáp án số hoặc kết quả..."
                className={`w-full px-4 py-3 border rounded-xl font-mono text-sm focus:ring-2 focus:outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:ring-indigo-500'
                    : 'bg-slate-900 border-slate-700 text-white focus:ring-cyan-500'
                }`}
              />
            </div>
          )}

          {currentQ.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setUserAnswers({ ...userAnswers, [currentIndex]: 'true' });
                  soundManager.playClickSound();
                }}
                className={`p-4 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
                  userAnswers[currentIndex] === 'true'
                    ? isLight
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-400/30'
                      : 'bg-emerald-950/60 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30'
                    : isLight
                    ? 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                Đúng
              </button>
              <button
                onClick={() => {
                  setUserAnswers({ ...userAnswers, [currentIndex]: 'false' });
                  soundManager.playClickSound();
                }}
                className={`p-4 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
                  userAnswers[currentIndex] === 'false'
                    ? isLight
                      ? 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-400/30'
                      : 'bg-rose-950/60 border-rose-400 text-rose-300 ring-2 ring-rose-500/30'
                    : isLight
                    ? 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                Sai
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="pt-2 flex items-center justify-between">
          <button
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            className={`px-3.5 py-2 rounded-xl disabled:opacity-40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Câu trước
          </button>

          {currentIndex < exam.questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              <span>Câu sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              Nộp bài kiểm tra lên lớp
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
