import React, { useState, useEffect, useRef } from 'react';
import { Challenge, Question, Difficulty } from '../types/mathverse';
import { useMathVerse } from '../context/MathVerseContext';
import { CHALLENGES_DATA } from '../data/challengesData';
import {
  Target,
  Zap,
  Clock,
  Sparkles,
  Trophy,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Flame,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

export const ChallengesMode: React.FC = () => {
  const { addXp, recordQuestionResult, theme } = useMathVerse();
  const isLight = theme === 'light';

  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);

  // Active Challenge Session State
  const [qIndex, setQIndex] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [challengeScore, setChallengeScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [streakCount, setStreakCount] = useState<number>(0);

  const timerRef = useRef<any>(null);

  const filteredChallenges = filterDifficulty === 'all'
    ? CHALLENGES_DATA
    : CHALLENGES_DATA.filter((c) => c.difficulty === filterDifficulty);

  // Start Challenge
  const startChallenge = (challenge: Challenge) => {
    soundManager.playClickSound();
    setActiveChallenge(challenge);
    setQIndex(0);
    setUserAnswer('');
    setChallengeScore(0);
    setStreakCount(0);
    setIsGameOver(false);

    const initialTime = challenge.timeLimitSeconds || 60;
    setTimeLeft(initialTime);
  };

  // Timer loop for active challenge
  useEffect(() => {
    if (activeChallenge && !isGameOver) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            endChallenge();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [activeChallenge, isGameOver]);

  const endChallenge = (playCelebration: boolean = false) => {
    clearInterval(timerRef.current);
    setIsGameOver(true);
    if (playCelebration) {
      soundManager.triggerConfetti();
    }
  };

  const handleAnswerSubmit = (ans: string) => {
    if (!activeChallenge || isGameOver) return;

    const currentQ = activeChallenge.questions[qIndex];
    let isCorrect = false;

    if (currentQ.type === 'multiple_choice') {
      isCorrect = ans === currentQ.correctAnswer;
    } else if (currentQ.type === 'fill_in') {
      const cleanA = ans.trim().replace(',', '.');
      const cleanB = String(currentQ.correctAnswer).trim().replace(',', '.');
      isCorrect = cleanA === cleanB || (parseFloat(cleanA) === parseFloat(cleanB));
    } else if (currentQ.type === 'true_false') {
      isCorrect = (ans === 'true') === currentQ.correctAnswer;
    }

    recordQuestionResult(
      currentQ.id,
      isCorrect,
      currentQ.topic,
      currentQ.question,
      ans,
      String(currentQ.correctAnswer),
      currentQ.explanation,
      currentQ.xpReward,
      true
    );

    if (isCorrect) {
      soundManager.playCorrectSound();
      setChallengeScore((prev) => prev + currentQ.xpReward);
      setStreakCount((prev) => prev + 1);

      // Next question or end
      if (qIndex < activeChallenge.questions.length - 1) {
        setQIndex((prev) => prev + 1);
        setUserAnswer('');
      } else {
        // Completed all questions in challenge
        addXp(activeChallenge.xpReward, `Chinh phục ${activeChallenge.title}`);
        endChallenge(true);
      }
    } else {
      soundManager.playWrongSound();
      // If it's a survival streak challenge, one mistake ends the game!
      if (activeChallenge.category === 'streak') {
        endChallenge(false);
      } else {
        if (qIndex < activeChallenge.questions.length - 1) {
          setQIndex((prev) => prev + 1);
          setUserAnswer('');
        } else {
          endChallenge(false);
        }
      }
    }
  };

  // If in active challenge session
  if (activeChallenge) {
    const currentQ = activeChallenge.questions[qIndex];

    if (isGameOver) {
      return (
        <div className="max-w-xl mx-auto space-y-6 pb-12 animate-in fade-in">
          <div className={`p-8 rounded-3xl border text-center space-y-4 shadow-2xl card-top-accent transition-all ${
            isLight
              ? 'bg-white border-slate-200 text-slate-800 shadow-pink-100/40'
              : 'bg-slate-900 border-slate-700 text-white'
          }`}>
            <div className="text-5xl animate-bounce">🏆</div>
            <h2 className={`text-2xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>Thử thách kết thúc!</h2>
            <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{activeChallenge.title}</p>

            <div className={`p-4 rounded-2xl border flex justify-around text-center ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <div>
                <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Điểm thưởng kiếm được</div>
                <div className={`text-2xl font-extrabold font-mono ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`}>+{challengeScore} XP</div>
              </div>
              <div className={`border-r ${isLight ? 'border-slate-200' : 'border-slate-800'}`} />
              <div>
                <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Chuỗi đúng liên tiếp</div>
                <div className="text-2xl font-extrabold text-orange-500 font-mono">{streakCount} 🔥</div>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => startChallenge(activeChallenge)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer border ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                }`}
              >
                <RotateCcw className="w-4 h-4" /> Thử lại
              </button>
              <button
                onClick={() => setActiveChallenge(null)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm cursor-pointer"
              >
                Chọn thử thách khác
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in">
        {/* Top Header */}
        <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
        }`}>
          <div>
            <div className={`text-xs font-bold ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`}>{activeChallenge.title}</div>
            <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Câu {qIndex + 1} / {activeChallenge.questions.length} • Chuỗi: {streakCount} 🔥
            </div>
          </div>

          {/* Countdown Clock */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm ${
            isLight
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-slate-950 border-slate-700 text-amber-300'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>

          <button
            onClick={() => setActiveChallenge(null)}
            className={`text-xs underline cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
          >
            Thoát
          </button>
        </div>

        {/* Active Question */}
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 card-top-accent transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-pink-100/40'
            : 'bg-slate-900 border-slate-700/80 text-white'
        }`}>
          <div className="space-y-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
              {currentQ.topic}
            </span>
            <h3 className={`text-lg sm:text-xl font-bold leading-relaxed ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {currentQ.question}
            </h3>
          </div>

          {/* Formats */}
          {currentQ.type === 'multiple_choice' && currentQ.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQ.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSubmit(opt)}
                  className={`p-4 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                    isLight
                      ? 'bg-white border-slate-200 hover:border-pink-400 hover:bg-pink-50/30 text-slate-800 shadow-2xs'
                      : 'bg-slate-950 border-slate-800 hover:border-cyan-400 hover:bg-slate-900 text-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {currentQ.type === 'fill_in' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && userAnswer.trim()) {
                    handleAnswerSubmit(userAnswer);
                  }
                }}
                placeholder="Nhập số và nhấn Enter..."
                className={`flex-1 px-4 py-3 border rounded-xl font-mono text-base focus:ring-2 focus:outline-none transition-colors ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:ring-pink-500'
                    : 'bg-slate-950 border-slate-700 text-white focus:ring-cyan-500'
                }`}
                autoFocus
              />
              <button
                onClick={() => handleAnswerSubmit(userAnswer)}
                disabled={!userAnswer.trim()}
                className="px-5 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold rounded-xl disabled:opacity-40 cursor-pointer"
              >
                Trả lời
              </button>
            </div>
          )}

          {currentQ.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleAnswerSubmit('true')}
                className={`p-4 rounded-xl border font-bold text-base transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-emerald-950/60 border-emerald-500 text-emerald-300 hover:bg-emerald-900/60'
                }`}
              >
                Đúng
              </button>
              <button
                onClick={() => handleAnswerSubmit('false')}
                className={`p-4 rounded-xl border font-bold text-base transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                    : 'bg-rose-950/60 border-rose-500 text-rose-300 hover:bg-rose-900/60'
                }`}
              >
                Sai
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Challenge Selection Board
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold flex items-center gap-2 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <Target className="w-7 h-7 text-pink-500" />
            <span>Đấu trường Thử thách Toán</span>
          </h1>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Vượt qua 7 chế độ thử thách đặc biệt để rèn luyện phản xạ, tư duy logic và nhận thêm +100 XP!
          </p>
        </div>

        {/* Difficulty Filter */}
        <div className={`inline-flex p-1 rounded-2xl border transition-colors ${
          isLight ? 'bg-slate-100/90 border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
        }`}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'easy', label: '🟢 Dễ' },
            { id: 'medium', label: '🟡 Trung bình' },
            { id: 'hard', label: '🔴 Khó' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setFilterDifficulty(d.id);
                soundManager.playClickSound();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterDifficulty === d.id
                  ? isLight
                    ? 'bg-white text-pink-600 shadow-xs border border-pink-200'
                    : 'bg-slate-800 text-cyan-300 border border-slate-700'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Challenges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredChallenges.map((ch) => {
          const diffBadge =
            ch.difficulty === 'easy'
              ? { text: '🟢 Dễ', color: isLight ? 'text-emerald-700 bg-emerald-100 border-emerald-300' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
              : ch.difficulty === 'medium'
              ? { text: '🟡 Trung bình', color: isLight ? 'text-amber-800 bg-amber-100 border-amber-300' : 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
              : { text: '🔴 Khó', color: isLight ? 'text-rose-700 bg-rose-100 border-rose-300' : 'text-rose-400 bg-rose-500/10 border-rose-500/20' };

          return (
            <div
              key={ch.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between group relative overflow-hidden card-top-accent ${
                isLight
                  ? 'bg-white border-slate-200/90 shadow-xs hover:border-pink-300 hover:shadow-lg'
                  : 'bg-slate-900/80 border-slate-800 hover:border-pink-500/40 hover:shadow-xl backdrop-blur-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${diffBadge.color}`}>
                    {diffBadge.text}
                  </span>
                  <div className={`flex items-center gap-1 text-xs font-semibold ${
                    isLight ? 'text-indigo-600' : 'text-cyan-400'
                  }`}>
                    <Sparkles className="w-3 h-3" /> +{ch.xpReward} XP
                  </div>
                </div>

                <h3 className={`text-base font-bold transition-colors mb-2 ${
                  isLight ? 'text-slate-900 group-hover:text-pink-600' : 'text-white group-hover:text-pink-300'
                }`}>
                  {ch.title}
                </h3>
                <p className={`text-xs leading-relaxed mb-4 line-clamp-2 ${
                  isLight ? 'text-slate-600' : 'text-slate-300/90'
                }`}>
                  {ch.description}
                </p>
              </div>

              <div className={`pt-3 border-t flex items-center justify-between ${
                isLight ? 'border-slate-100' : 'border-slate-800/80'
              }`}>
                <span className={`text-[11px] flex items-center gap-1 font-mono ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  <Clock className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                  {ch.timeLimitSeconds}s • {ch.questions.length} câu
                </span>
                <button
                  onClick={() => startChallenge(ch)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white text-xs font-bold shadow-md shadow-pink-500/20 transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" /> Thử sức
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
