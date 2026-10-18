import React, { useState, useEffect, useRef } from 'react';
import { useMathVerse } from '../context/MathVerseContext';
import { soundManager } from '../utils/soundEffects';
import {
  Sparkles,
  Trophy,
  X,
  Gift,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  RotateCw,
} from 'lucide-react';

interface DailyLuckyWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WHEEL_SECTORS = [
  { label: '+50 XP', xp: 50, color: '#6366f1', text: '#ffffff' },
  { label: '+100 XP', xp: 100, color: '#0ea5e9', text: '#ffffff' },
  { label: '⭐ Ngôi Sao', xp: 75, color: '#eab308', text: '#000000' },
  { label: '+150 XP', xp: 150, color: '#10b981', text: '#ffffff' },
  { label: '💡 Trí Tuệ', xp: 60, color: '#8b5cf6', text: '#ffffff' },
  { label: '+200 XP', xp: 200, color: '#f59e0b', text: '#000000' },
  { label: '🔥 Thần Tốc', xp: 80, color: '#ef4444', text: '#ffffff' },
  { label: '🏆 Quán Quân', xp: 120, color: '#ec4899', text: '#ffffff' },
];

export const DailyLuckyWheelModal: React.FC<DailyLuckyWheelModalProps> = ({ isOpen, onClose }) => {
  const { user, addXp, theme } = useMathVerse();
  const isLight = theme === 'light';

  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<(typeof WHEEL_SECTORS)[0] | null>(null);
  const [hasSpunToday, setHasSpunToday] = useState(false);

  // Daily riddle of the day
  const [riddleAnswer, setRiddleAnswer] = useState('');
  const [showRiddleHint, setShowRiddleHint] = useState(false);
  const [isRiddleSolved, setIsRiddleSolved] = useState(false);
  const [riddleFeedback, setRiddleFeedback] = useState<string | null>(null);

  const todayKey = new Date().toISOString().split('T')[0];

  useEffect(() => {
    try {
      const lastSpun = localStorage.getItem('mathverse_daily_wheel_date');
      if (lastSpun === todayKey) {
        setHasSpunToday(true);
      }
      const riddleSaved = localStorage.getItem(`mathverse_riddle_${todayKey}`);
      if (riddleSaved === 'solved') {
        setIsRiddleSolved(true);
      }
    } catch {}
  }, [todayKey]);

  if (!isOpen) return null;

  const spinWheel = () => {
    if (isSpinning || hasSpunToday) return;

    soundManager.playClickSound();
    setIsSpinning(true);
    setWonPrize(null);

    // Pick a random sector index
    const sectorCount = WHEEL_SECTORS.length;
    const targetIndex = Math.floor(Math.random() * sectorCount);
    const sectorAngle = 360 / sectorCount;

    // Calculate rotation: 5 full rotations + alignment to center of target sector
    const extraSpins = 5 * 360;
    const targetAngle = 360 - (targetIndex * sectorAngle + sectorAngle / 2);
    const finalRotation = rotation + extraSpins + (targetAngle - (rotation % 360));

    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const prize = WHEEL_SECTORS[targetIndex];
      setWonPrize(prize);
      setHasSpunToday(true);
      try {
        localStorage.setItem('mathverse_daily_wheel_date', todayKey);
      } catch {}

      soundManager.playLevelUpSound();
      soundManager.triggerConfetti();

      if (prize.xp > 0) {
        addXp(prize.xp, `Vòng quay May mắn (${prize.label})`);
      }
    }, 4200);
  };

  const handleSolveRiddle = () => {
    if (isRiddleSolved) return;
    const clean = riddleAnswer.trim().toLowerCase();
    // Daily Riddle: "Số nào khi chia cho 2 dư 1, chia cho 3 dư 2, chia cho 4 dư 3, chia cho 5 dư 4, chia cho 6 dư 5 và chia hết cho 7 nhỏ nhất?" -> 119
    if (clean === '119' || clean.includes('119')) {
      soundManager.playCorrectSound();
      soundManager.triggerConfetti();
      setIsRiddleSolved(true);
      setRiddleFeedback('Chính xác tuyệt đối! Đáp số là 119.');
      addXp(80, 'Giải Câu đố Toán học của ngày');
      try {
        localStorage.setItem(`mathverse_riddle_${todayKey}`, 'solved');
      } catch {}
    } else {
      soundManager.playWrongSound();
      setRiddleFeedback('Chưa đúng rồi! Em hãy suy nghĩ xem: Số đó cộng thêm 1 thì sẽ chia hết cho cả 2, 3, 4, 5, 6 nhé!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 relative transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            soundManager.playClickSound();
            onClose();
          }}
          className={`absolute top-5 right-5 p-2 rounded-xl border transition-colors cursor-pointer ${
            isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-md">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black">
              Vòng Quay Tri Thức & Câu Đố Mỗi Ngày
            </h2>
            <p className="text-xs text-slate-500">
              Điểm danh nhận quà may mắn và thử thách trí tuệ mỗi ngày cùng MathVerse
            </p>
          </div>
        </div>

        {/* SECTION 1: THE LUCKY WHEEL */}
        <div
          className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center space-y-5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          {/* Wheel Container */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72">
            {/* Top Pointer Indicator */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 drop-shadow-md" />

            {/* Rotating SVG Wheel */}
            <div
              className="w-full h-full rounded-full shadow-xl overflow-hidden transition-transform ease-out"
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: isSpinning ? '4.2s' : '0s',
                transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.25, 1)',
              }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {WHEEL_SECTORS.map((sector, idx) => {
                  const angle = 360 / WHEEL_SECTORS.length;
                  const startAngle = (idx * angle - 90) * (Math.PI / 180);
                  const endAngle = ((idx + 1) * angle - 90) * (Math.PI / 180);

                  const x1 = 100 + 100 * Math.cos(startAngle);
                  const y1 = 100 + 100 * Math.sin(startAngle);
                  const x2 = 100 + 100 * Math.cos(endAngle);
                  const y2 = 100 + 100 * Math.sin(endAngle);

                  const pathData = `M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`;

                  // Text angle
                  const midAngle = (idx * angle + angle / 2);
                  return (
                    <g key={idx}>
                      <path d={pathData} fill={sector.color} stroke="#1e293b" strokeWidth="1" />
                      <text
                        x="100"
                        y="42"
                        transform={`rotate(${midAngle}, 100, 100)`}
                        fill={sector.text}
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {sector.label}
                      </text>
                    </g>
                  );
                })}
                {/* Center Hub */}
                <circle cx="100" cy="100" r="22" fill="#0f172a" stroke="#fbbf24" strokeWidth="3" />
                <text x="100" y="104" fill="#fbbf24" fontSize="10" fontWeight="black" textAnchor="middle">
                  SPIN
                </text>
              </svg>
            </div>
          </div>

          {/* Result or Action Button */}
          {wonPrize ? (
            <div className="space-y-2 animate-in zoom-in-95">
              <div className="text-sm font-bold text-amber-500">
                🎉 Chúc mừng em đã quay trúng:
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-cyan-400">
                {wonPrize.label} (+{wonPrize.xp} XP)
              </div>
              <div className="text-xs text-slate-400">
                Điểm thưởng đã được tự động cộng vào hồ sơ MathVerse của em!
              </div>
            </div>
          ) : hasSpunToday ? (
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-400">
                Em đã quay vòng quay hôm nay rồi!
              </div>
              <div className="text-xs text-slate-500">
                Hãy quay trở lại vào ngày mai để nhận thêm quà mới nhé.
              </div>
            </div>
          ) : (
            <button
              onClick={spinWheel}
              disabled={isSpinning}
              className={`py-3 px-8 rounded-2xl font-black text-sm text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-lg shadow-amber-500/20 cursor-pointer transition-transform ${
                isSpinning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
              }`}
            >
              {isSpinning ? 'Đang quay...' : 'QUAY NGAY (Miễn phí mỗi ngày)'}
            </button>
          )}
        </div>

        {/* SECTION 2: DAILY MATH RIDDLE */}
        <div
          className={`p-5 rounded-2xl border space-y-3 ${
            isLight ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-sm">Câu Đố Toán Học Hóc Búa Hôm Nay</h3>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-cyan-400">+80 XP</span>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <strong>Đề bài:</strong> Tìm số tự nhiên nhỏ nhất sao cho khi chia số đó cho 2 thì dư 1,
            chia 3 dư 2, chia 4 dư 3, chia 5 dư 4, chia 6 dư 5, và chia hết cho 7?
          </p>

          {/* Hint */}
          {showRiddleHint && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400">
              💡 <strong>Gợi ý:</strong> Gọi số cần tìm là A. Khi đó (A + 1) chia hết cho cả 2, 3, 4, 5, 6.
              Do đó (A + 1) là bội chung của [2, 3, 4, 5, 6] = 60k. Tìm k nhỏ nhất sao cho A = 60k - 1 chia hết cho 7.
            </div>
          )}

          {/* Answer Input */}
          {!isRiddleSolved ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <input
                type="text"
                value={riddleAnswer}
                onChange={(e) => setRiddleAnswer(e.target.value)}
                placeholder="Nhập số em tìm được..."
                className={`flex-1 px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none ${
                  isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700 text-white'
                }`}
              />
              <button
                onClick={handleSolveRiddle}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                Gửi đáp án
              </button>
              <button
                onClick={() => {
                  soundManager.playClickSound();
                  setShowRiddleHint(!showRiddleHint);
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {showRiddleHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Em đã giải xuất sắc câu đố hôm nay! Đáp số: 119. Nhận ngay +80 XP.</span>
            </div>
          )}

          {riddleFeedback && !isRiddleSolved && (
            <div className="text-xs text-rose-500 font-medium">{riddleFeedback}</div>
          )}
        </div>
      </div>
    </div>
  );
};
