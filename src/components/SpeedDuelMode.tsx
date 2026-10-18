import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMathVerse } from '../context/MathVerseContext';
import { soundManager } from '../utils/soundEffects';
import {
  Zap,
  Timer,
  Flame,
  Trophy,
  RotateCcw,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
} from 'lucide-react';

interface SpeedQuestion {
  question: string;
  options: (number | string)[];
  correctAnswer: number | string;
  tip?: string;
}

export const SpeedDuelMode: React.FC = () => {
  const { user, addXp, theme } = useMathVerse();
  const isLight = theme === 'light';

  // Game configuration
  const [selectedMode, setSelectedMode] = useState<'rush' | 'grade' | 'mystery'>('rush');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // In-game dynamic state
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [totalAnswered, setTotalAnswered] = useState<number>(0);
  const [currentQ, setCurrentQ] = useState<SpeedQuestion | null>(null);
  const [feedbackState, setFeedbackState] = useState<'correct' | 'wrong' | null>(null);

  const timerRef = useRef<any>(null);

  // High score storage in localStorage
  const [bestScores, setBestScores] = useState<{ [key: string]: number }>(() => {
    try {
      const saved = localStorage.getItem('mathverse_speed_best');
      return saved ? JSON.parse(saved) : { rush: 0, grade: 0, mystery: 0 };
    } catch {
      return { rush: 0, grade: 0, mystery: 0 };
    }
  });

  // Question generator
  const generateQuestion = useCallback(
    (mode: 'rush' | 'grade' | 'mystery'): SpeedQuestion => {
      const grade = user?.grade || 6;

      if (mode === 'mystery') {
        // Find the missing operator or missing number x
        const type = Math.random() > 0.5 ? 'operator' : 'missing_x';
        if (type === 'operator') {
          const a = Math.floor(Math.random() * 12) + 2;
          const b = Math.floor(Math.random() * 9) + 2;
          const ops = ['+', '-', '×'];
          const chosenOp = ops[Math.floor(Math.random() * ops.length)];
          let res = 0;
          if (chosenOp === '+') res = a + b;
          else if (chosenOp === '-') res = a - b;
          else res = a * b;

          return {
            question: `${a}  ?  ${b} = ${res}`,
            options: ['+', '-', '×', '÷'],
            correctAnswer: chosenOp,
          };
        } else {
          const a = Math.floor(Math.random() * 8) + 2;
          const x = Math.floor(Math.random() * 10) + 1;
          const b = Math.floor(Math.random() * 15) + 1;
          const res = a * x + b;
          const wrongOpts = [x + 1, Math.max(1, x - 1), x + 2, x + 3].filter((o) => o !== x).slice(0, 3);
          const allOpts = [x, ...wrongOpts].sort(() => Math.random() - 0.5);

          return {
            question: `${a}x + ${b} = ${res}  =>  x = ?`,
            options: allOpts,
            correctAnswer: x,
          };
        }
      }

      if (mode === 'grade') {
        if (grade === 6) {
          // Negative numbers or powers
          const isPower = Math.random() > 0.5;
          if (isPower) {
            const base = Math.floor(Math.random() * 5) + 2;
            const exp = Math.floor(Math.random() * 3) + 2; // 2 or 3 or 4
            const ans = Math.pow(base, exp);
            const opts = [ans, ans + base, ans - base, ans + 2].sort(() => Math.random() - 0.5);
            return {
              question: `${base}^${exp} = ?`,
              options: opts,
              correctAnswer: ans,
            };
          } else {
            const a = -Math.floor(Math.random() * 15) - 1;
            const b = -Math.floor(Math.random() * 15) - 1;
            const ans = a + b;
            const opts = [ans, ans + 2, ans - 2, -(ans)].sort(() => Math.random() - 0.5);
            return {
              question: `(${a}) + (${b}) = ?`,
              options: opts,
              correctAnswer: ans,
            };
          }
        } else if (grade === 7) {
          // Rational or Pythagoras basic
          const pTriplets = [
            [3, 4, 5],
            [6, 8, 10],
            [5, 12, 13],
          ];
          const trip = pTriplets[Math.floor(Math.random() * pTriplets.length)];
          const ans = trip[2];
          const opts = [ans, ans + 1, ans - 2, ans + 3].sort(() => Math.random() - 0.5);
          return {
            question: `Tam giác vuông cạnh ${trip[0]} & ${trip[1]}. Cạnh huyền = ?`,
            options: opts,
            correctAnswer: ans,
          };
        } else if (grade === 8) {
          // Algebraic identities: (x + a)^2
          const a = Math.floor(Math.random() * 5) + 2;
          const ans = 2 * a;
          const opts = [ans, a * a, a, ans + 2].sort(() => Math.random() - 0.5);
          return {
            question: `(x + ${a})² = x² + ?x + ${a * a}`,
            options: opts,
            correctAnswer: ans,
          };
        } else {
          // Grade 9: Vi-ét sum or sqrt
          const x1 = Math.floor(Math.random() * 5) + 1;
          const x2 = Math.floor(Math.random() * 5) + 2;
          const sum = x1 + x2;
          const prod = x1 * x2;
          const opts = [sum, prod, sum + 1, prod - 1].sort(() => Math.random() - 0.5);
          return {
            question: `x² - ${sum}x + ${prod} = 0. Tổng 2 nghiệm x₁ + x₂ = ?`,
            options: opts,
            correctAnswer: sum,
          };
        }
      }

      // Default: Mental Rush (Speed addition, subtraction, multiplication)
      const opType = Math.floor(Math.random() * 3);
      if (opType === 0) {
        // Addition
        const a = Math.floor(Math.random() * 45) + 12;
        const b = Math.floor(Math.random() * 45) + 12;
        const ans = a + b;
        const opts = [ans, ans + 10, ans - 1, ans + 2].sort(() => Math.random() - 0.5);
        return {
          question: `${a} + ${b} = ?`,
          options: opts,
          correctAnswer: ans,
        };
      } else if (opType === 1) {
        // Subtraction
        const a = Math.floor(Math.random() * 60) + 30;
        const b = Math.floor(Math.random() * 25) + 10;
        const ans = a - b;
        const opts = [ans, ans + 2, ans - 10, ans + 1].sort(() => Math.random() - 0.5);
        return {
          question: `${a} - ${b} = ?`,
          options: opts,
          correctAnswer: ans,
        };
      } else {
        // Multiplication
        const a = Math.floor(Math.random() * 9) + 3;
        const b = Math.floor(Math.random() * 9) + 4;
        const ans = a * b;
        const opts = [ans, ans + a, ans - b, ans + 4].sort(() => Math.random() - 0.5);
        return {
          question: `${a} × ${b} = ?`,
          options: opts,
          correctAnswer: ans,
        };
      }
    },
    [user?.grade]
  );

  // Start the 60s game
  const startGame = () => {
    soundManager.playClickSound();
    setIsPlaying(true);
    setIsFinished(false);
    setTimeLeft(60);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setTotalAnswered(0);
    setFeedbackState(null);

    const firstQ = generateQuestion(selectedMode);
    setCurrentQ(firstQ);
  };

  // Timer Countdown
  useEffect(() => {
    if (isPlaying && !isFinished) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            finishGame();
            return 0;
          }
          if (prev === 11) {
            soundManager.playLevelUpSound();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, isFinished]);

  // Finish Game Handler
  const finishGame = () => {
    setIsPlaying(false);
    setIsFinished(true);

    // Calculate XP Reward based on score (min 30 XP, max 200 XP)
    const xpReward = Math.min(250, Math.max(30, Math.round(score * 0.8)));
    addXp(xpReward, 'Đấu trường Tốc độ 60s');

    // Update Best Score
    setBestScores((prev) => {
      const currentBest = prev[selectedMode] || 0;
      if (score > currentBest) {
        const updated = { ...prev, [selectedMode]: score };
        try {
          localStorage.setItem('mathverse_speed_best', JSON.stringify(updated));
        } catch {}
        soundManager.triggerConfetti();
        return updated;
      }
      return prev;
    });

    if (score >= 300) {
      soundManager.triggerConfetti();
    }
  };

  // Answer selection handler
  const handleAnswer = (chosen: number | string) => {
    if (!currentQ || !isPlaying) return;

    setTotalAnswered((prev) => prev + 1);

    const isCorrect = chosen === currentQ.correctAnswer;
    if (isCorrect) {
      soundManager.playCorrectSound();
      setFeedbackState('correct');
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setMaxStreak((m) => Math.max(m, nextStreak));
      setCorrectCount((c) => c + 1);

      // Multiplier logic: streak >= 10: 3x, >= 5: 2x, >= 3: 1.5x
      let multiplier = 1;
      if (nextStreak >= 10) multiplier = 3;
      else if (nextStreak >= 5) multiplier = 2;
      else if (nextStreak >= 3) multiplier = 1.5;

      const basePoints = 10;
      const points = Math.round(basePoints * multiplier);
      setScore((s) => s + points);
    } else {
      soundManager.playWrongSound();
      setFeedbackState('wrong');
      setStreak(0);
    }

    // Flash next question quickly
    setTimeout(() => {
      setFeedbackState(null);
      setCurrentQ(generateQuestion(selectedMode));
    }, 280);
  };

  // Keyboard shortcut support (1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || !currentQ) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 4 && currentQ.options[num - 1] !== undefined) {
        handleAnswer(currentQ.options[num - 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentQ, handleAnswer]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 border shadow-lg transition-all ${
          isLight
            ? 'bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-rose-50/90 border-amber-200/80 shadow-amber-100/50 text-slate-800'
            : 'bg-gradient-to-r from-amber-950/60 via-slate-900/80 to-rose-950/60 border-amber-500/30 text-white'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black">
                Đấu Trường Tốc Độ 60 Giây
              </h1>
            </div>
            <p className={`text-xs sm:text-sm max-w-xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Rèn luyện phản xạ tính toán và tư duy tức thì! Trả lời càng nhiều câu hỏi đúng liên tiếp
              để nhân chuỗi điểm combo x1.5, x2 và x3.
            </p>
          </div>

          {/* Record Display */}
          <div
            className={`p-3.5 rounded-2xl border text-center shrink-0 ${
              isLight ? 'bg-white/80 border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Kỷ lục cá nhân
            </div>
            <div className="text-2xl font-black text-amber-500 flex items-center justify-center gap-1">
              <Trophy className="w-5 h-5" />
              <span>{bestScores[selectedMode] || 0} điểm</span>
            </div>
          </div>
        </div>
      </div>

      {/* GAME SETUP SCREEN (when not playing & not finished) */}
      {!isPlaying && !isFinished && (
        <div className="space-y-6">
          {/* Mode Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => {
                setSelectedMode('rush');
                soundManager.playClickSound();
              }}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedMode === 'rush'
                  ? 'border-amber-500 bg-amber-500/10 shadow-md ring-2 ring-amber-500/30'
                  : isLight
                  ? 'bg-white border-slate-200 hover:border-slate-300'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">⚡</span>
                <span className="text-xs font-bold text-amber-500">Phổ biến</span>
              </div>
              <h2 className="text-base font-bold">1. Tốc Độ Tia Chớp</h2>
              <p className="text-xs text-slate-500 mt-1">
                Phép tính cộng, trừ, nhân nhẩm siêu tốc thử thách phản xạ não bộ.
              </p>
            </button>

            <button
              onClick={() => {
                setSelectedMode('grade');
                soundManager.playClickSound();
              }}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedMode === 'grade'
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-md ring-2 ring-indigo-500/30'
                  : isLight
                  ? 'bg-white border-slate-200 hover:border-slate-300'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">🎯</span>
                <span className="text-xs font-bold text-indigo-500">Lớp {user?.grade}</span>
              </div>
              <h2 className="text-base font-bold">2. Chiến Binh Khối Lớp</h2>
              <p className="text-xs text-slate-500 mt-1">
                Câu hỏi chọn lọc theo chuẩn kiến thức Lớp {user?.grade}: luỹ thừa, pytago, hằng đẳng thức.
              </p>
            </button>

            <button
              onClick={() => {
                setSelectedMode('mystery');
                soundManager.playClickSound();
              }}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedMode === 'mystery'
                  ? 'border-purple-500 bg-purple-500/10 shadow-md ring-2 ring-purple-500/30'
                  : isLight
                  ? 'bg-white border-slate-200 hover:border-slate-300'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">🧩</span>
                <span className="text-xs font-bold text-purple-500">Cân não</span>
              </div>
              <h2 className="text-base font-bold">3. Điền Dấu & Ẩn Số</h2>
              <p className="text-xs text-slate-500 mt-1">
                Tìm dấu phép tính bí ẩn hoặc tìm giá trị ẩn số x trong 5 giây.
              </p>
            </button>
          </div>

          {/* Start Battle Button */}
          <div className="text-center pt-4">
            <button
              onClick={startGame}
              className="py-4 px-10 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:scale-105 active:scale-95 text-white font-black text-lg sm:text-xl shadow-xl shadow-orange-500/25 transition-all cursor-pointer inline-flex items-center gap-3"
            >
              <Zap className="w-6 h-6 fill-current" />
              <span>BẮT ĐẦU VÒNG ĐẤU 60 GIÂY</span>
            </button>
            <div className="text-xs text-slate-400 mt-3">
              Mẹo: Trên máy tính, em có thể bấm trực tiếp các phím 1, 2, 3, 4 để chọn đáp án tức thì!
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE GAMEPLAY SCREEN */}
      {isPlaying && currentQ && (
        <div className="space-y-6">
          {/* Top Bar: Timer, Score & Streak */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            {/* Countdown Timer with animation */}
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black text-xl shadow-md ${
                  timeLeft <= 10
                    ? 'bg-rose-500 text-white animate-pulse'
                    : timeLeft <= 25
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {timeLeft}s
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400">Thời gian</div>
                <div className="text-xs font-bold">
                  {timeLeft <= 10 ? 'Sắp hết giờ!' : 'Cố lên!'}
                </div>
              </div>
            </div>

            {/* Streak & Multiplier */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black ${
                  streak >= 5
                    ? 'bg-orange-500 text-white border-orange-400 shadow-md animate-bounce'
                    : streak >= 3
                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                    : isLight
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Flame className="w-4 h-4 fill-current text-orange-500" />
                <span>Combo {streak}</span>
                {streak >= 5 && <span>(x2.0)</span>}
                {streak >= 10 && <span>(x3.0)</span>}
              </div>
            </div>

            {/* Current Score */}
            <div className="text-right">
              <div className="text-[11px] font-bold text-slate-400">Điểm số</div>
              <div className="text-2xl font-black text-amber-500 font-mono">{score}</div>
            </div>
          </div>

          {/* Time Progress Bar */}
          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                timeLeft <= 10 ? 'bg-rose-500' : timeLeft <= 25 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            />
          </div>

          {/* Question Display Card */}
          <div
            className={`p-8 sm:p-12 rounded-3xl border text-center transition-all ${
              feedbackState === 'correct'
                ? 'bg-emerald-500/15 border-emerald-500 scale-[1.01]'
                : feedbackState === 'wrong'
                ? 'bg-rose-500/15 border-rose-500 shake'
                : isLight
                ? 'bg-white border-slate-200 shadow-lg text-slate-900'
                : 'bg-slate-900 border-slate-800 shadow-2xl text-white'
            }`}
          >
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Câu số {totalAnswered + 1}
            </div>
            <div className="text-3xl sm:text-5xl font-black font-mono tracking-tight my-4">
              {currentQ.question}
            </div>
          </div>

          {/* 4 Quick Choice Options */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(opt)}
                className={`p-5 sm:p-6 rounded-2xl border text-lg sm:text-2xl font-black font-mono transition-all cursor-pointer relative group flex items-center justify-center ${
                  isLight
                    ? 'bg-white hover:bg-indigo-50/80 border-slate-200 hover:border-indigo-400 text-slate-900 shadow-sm active:scale-98'
                    : 'bg-slate-900 hover:bg-indigo-950/60 border-slate-800 hover:border-indigo-500 text-white active:scale-98'
                }`}
              >
                <span className="absolute top-2 left-3 text-[10px] font-bold text-slate-400">
                  Phím [{idx + 1}]
                </span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {isFinished && (
        <div
          className={`p-8 sm:p-10 rounded-3xl border text-center space-y-6 shadow-2xl animate-in zoom-in-95 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800 text-white'
          }`}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 mx-auto shadow-lg shadow-orange-500/30">
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black">HẾT GIỜ! HOÀN THÀNH VÒNG ĐẤU</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Tuyệt vời lắm! Em đã hoàn thành xuất sắc thử thách 60 giây.
            </p>
          </div>

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="text-[11px] font-bold text-slate-400">Điểm trận</div>
              <div className="text-2xl font-black text-amber-500">{score}</div>
            </div>
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="text-[11px] font-bold text-slate-400">Đúng / Tổng</div>
              <div className="text-2xl font-black text-emerald-500">
                {correctCount}/{totalAnswered}
              </div>
            </div>
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="text-[11px] font-bold text-slate-400">Chuỗi cao nhất</div>
              <div className="text-2xl font-black text-orange-500">{maxStreak}</div>
            </div>
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="text-[11px] font-bold text-slate-400">Thưởng XP</div>
              <div className="text-2xl font-black text-indigo-500">
                +{Math.min(250, Math.max(30, Math.round(score * 0.8)))}
              </div>
            </div>
          </div>

          {/* Play Again & Change Mode */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={startGame}
              className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-md"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Chơi lại trận này</span>
            </button>
            <button
              onClick={() => {
                setIsFinished(false);
                setIsPlaying(false);
              }}
              className={`py-3 px-6 rounded-xl border text-sm font-bold cursor-pointer transition-colors ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              Chọn chế độ khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
