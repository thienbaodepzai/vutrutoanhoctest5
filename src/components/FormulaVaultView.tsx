import React, { useState, useMemo } from 'react';
import { FORMULAS_DATA, FormulaItem } from '../data/formulasData';
import { useMathVerse } from '../context/MathVerseContext';
import { FormattedMathView } from './FormattedMathView';
import {
  Compass,
  Search,
  Star,
  Calculator,
  Grid,
  CheckCircle2,
  HelpCircle,
  Copy,
  ChevronRight,
  Sparkles,
  BookMarked,
  RotateCcw,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

export const FormulaVaultView: React.FC = () => {
  const { theme, user } = useMathVerse();
  const isLight = theme === 'light';

  // Navigation tab inside Formula Vault
  const [activeSubTab, setActiveSubTab] = useState<'handbook' | 'tools' | 'mult_table'>('handbook');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>(user?.grade || 'all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Favorites stored in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mathverse_fav_formulas');
      return saved ? JSON.parse(saved) : ['f-8-1', 'f-7-3'];
    } catch {
      return ['f-8-1', 'f-7-3'];
    }
  });

  const toggleFavorite = (id: string) => {
    soundManager.playClickSound();
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('mathverse_fav_formulas', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleCopy = (text: string, id: string) => {
    soundManager.playClickSound();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter formulas
  const filteredFormulas = useMemo(() => {
    return FORMULAS_DATA.filter((item) => {
      if (onlyFavorites && !favorites.includes(item.id)) return false;
      if (selectedGrade !== 'all' && item.grade !== selectedGrade) return false;
      if (selectedTopic !== 'all' && item.topic !== selectedTopic) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const inTitle = item.title.toLowerCase().includes(query);
        const inExp = item.expression.toLowerCase().includes(query);
        const inExpl = item.explanation.toLowerCase().includes(query);
        const inTags = item.tags.some((t) => t.toLowerCase().includes(query));
        return inTitle || inExp || inExpl || inTags;
      }
      return true;
    });
  }, [searchQuery, selectedGrade, selectedTopic, onlyFavorites, favorites]);

  // Interactive Equation Solver State
  const [eqA, setEqA] = useState<string>('1');
  const [eqB, setEqB] = useState<string>('-5');
  const [eqC, setEqC] = useState<string>('6');

  const solveQuadratic = useMemo(() => {
    const a = parseFloat(eqA);
    const b = parseFloat(eqB);
    const c = parseFloat(eqC);

    if (isNaN(a) || isNaN(b) || isNaN(c)) {
      return { status: 'invalid', message: 'Vui lòng nhập các hệ số a, b, c hợp lệ.' };
    }
    if (a === 0) {
      if (b === 0) {
        if (c === 0) {
          return { status: 'infinite', message: 'Phương trình 0 = 0 nghiệm đúng với mọi x.' };
        }
        return { status: 'none', message: `Phương trình ${c} = 0 vô nghiệm.` };
      }
      const x = -c / b;
      return {
        status: 'linear',
        message: `Vì a = 0 nên phương trình trở thành bậc nhất: ${b}x + (${c}) = 0`,
        steps: [`${b}x = ${-c}`, `x = ${-c} / ${b} = ${Number(x.toFixed(4))}`],
        x1: x,
      };
    }

    const delta = b * b - 4 * a * c;
    if (delta < 0) {
      return {
        status: 'negative_delta',
        delta,
        message: `Δ = (${b})² - 4·(${a})·(${c}) = ${delta} < 0 => Phương trình vô nghiệm trên tập số thực ℝ.`,
      };
    } else if (delta === 0) {
      const x = -b / (2 * a);
      return {
        status: 'single',
        delta,
        message: `Δ = 0 => Phương trình có nghiệm kép:`,
        steps: [`x₁ = x₂ = -b / (2a) = -(${b}) / (2·${a}) = ${Number(x.toFixed(4))}`],
        x1: x,
      };
    } else {
      const sqrtDelta = Math.sqrt(delta);
      const x1 = (-b + sqrtDelta) / (2 * a);
      const x2 = (-b - sqrtDelta) / (2 * a);
      return {
        status: 'two',
        delta,
        sqrtDelta: Number(sqrtDelta.toFixed(4)),
        message: `Δ = (${b})² - 4·(${a})·(${c}) = ${delta} > 0 => Có 2 nghiệm phân biệt:`,
        steps: [
          `x₁ = (-(${b}) + √${delta}) / (2·${a}) = (${-b} + ${Number(sqrtDelta.toFixed(3))}) / ${2 * a} = ${Number(x1.toFixed(4))}`,
          `x₂ = (-(${b}) - √${delta}) / (2·${a}) = (${-b} - ${Number(sqrtDelta.toFixed(3))}) / ${2 * a} = ${Number(x2.toFixed(4))}`,
          `Kiểm tra Vi-ét: Tổng x₁ + x₂ = ${Number((x1 + x2).toFixed(4))} (bằng -b/a = ${Number((-b / a).toFixed(4))}), Tích x₁·x₂ = ${Number((x1 * x2).toFixed(4))} (bằng c/a = ${Number((c / a).toFixed(4))})`,
        ],
        x1,
        x2,
      };
    }
  }, [eqA, eqB, eqC]);

  // Interactive Pythagoras & Triangle Checker State
  const [sideA, setSideA] = useState<string>('3');
  const [sideB, setSideB] = useState<string>('4');
  const [sideC, setSideC] = useState<string>('5');

  const triangleAnalysis = useMemo(() => {
    const a = parseFloat(sideA);
    const b = parseFloat(sideB);
    const c = parseFloat(sideC);
    if (isNaN(a) || isNaN(b) || isNaN(c) || a <= 0 || b <= 0 || c <= 0) {
      return { valid: false, message: 'Độ dài 3 cạnh phải là các số dương lớn hơn 0.' };
    }
    // Check triangle inequality
    if (a + b <= c || a + c <= b || b + c <= a) {
      return { valid: false, message: `Không tạo thành tam giác vì vi phạm bất đẳng thức tam giác (tổng 2 cạnh phải lớn hơn cạnh còn lại).` };
    }
    const sides = [a, b, c].sort((x, y) => x - y);
    const [s1, s2, hyp] = sides;
    const isRight = Math.abs(s1 * s1 + s2 * s2 - hyp * hyp) < 1e-6;
    const perimeter = a + b + c;
    const p = perimeter / 2;
    const area = Math.sqrt(p * (p - a) * (p - b) * (p - c));

    return {
      valid: true,
      isRight,
      perimeter: Number(perimeter.toFixed(3)),
      area: Number(area.toFixed(3)),
      hypotenuse: hyp,
      legs: [s1, s2],
      pythagorasSum: Number((s1 * s1 + s2 * s2).toFixed(3)),
      hypSquare: Number((hyp * hyp).toFixed(3)),
    };
  }, [sideA, sideB, sideC]);

  // Interactive GCD & LCM State
  const [gcdA, setGcdA] = useState<string>('24');
  const [gcdB, setGcdB] = useState<string>('36');

  const gcdLcmAnalysis = useMemo(() => {
    const a = parseInt(gcdA, 10);
    const b = parseInt(gcdB, 10);
    if (isNaN(a) || isNaN(b) || a <= 0 || b <= 0) {
      return { valid: false, message: 'Vui lòng nhập 2 số nguyên dương lớn hơn 0.' };
    }

    const getPrimes = (n: number) => {
      const factors: { [key: number]: number } = {};
      let temp = n;
      for (let i = 2; i * i <= temp; i++) {
        while (temp % i === 0) {
          factors[i] = (factors[i] || 0) + 1;
          temp /= i;
        }
      }
      if (temp > 1) {
        factors[temp] = (factors[temp] || 0) + 1;
      }
      return factors;
    };

    const calcGcd = (x: number, y: number): number => (y === 0 ? x : calcGcd(y, x % y));
    const g = calcGcd(a, b);
    const l = (a * b) / g;

    const factorsA = getPrimes(a);
    const factorsB = getPrimes(b);

    const formatPrimeStr = (factors: { [k: number]: number }) =>
      Object.entries(factors)
        .map(([base, exp]) => (exp > 1 ? `${base}^${exp}` : `${base}`))
        .join(' · ');

    return {
      valid: true,
      gcd: g,
      lcm: l,
      strA: formatPrimeStr(factorsA),
      strB: formatPrimeStr(factorsB),
    };
  }, [gcdA, gcdB]);

  // Multiplication table hover
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 border shadow-lg transition-all ${
          isLight
            ? 'bg-gradient-to-r from-indigo-50/90 via-sky-50/80 to-purple-50/90 border-indigo-200/80 shadow-indigo-100/50 text-slate-800'
            : 'bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-purple-950/60 border-indigo-500/30 text-white'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                <Compass className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black">
                Sổ Tay Công Thức & Máy Tính Từng Bước
              </h1>
            </div>
            <p className={`text-xs sm:text-sm max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Toàn thư công thức Toán THCS từ Lớp 6 đến Lớp 9. Tích hợp máy tính giải phương trình bậc hai,
              kiểm tra tam giác Pytago, tìm ƯCLN/BCNN và bảng cửu chương trực quan.
            </p>
          </div>

          {/* Sub Navigation Tabs */}
          <div className={`p-1.5 rounded-2xl border flex items-center gap-1 ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
          }`}>
            <button
              onClick={() => {
                soundManager.playClickSound();
                setActiveSubTab('handbook');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'handbook'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookMarked className="w-4 h-4" />
              <span>Tra cứu Công thức</span>
            </button>
            <button
              onClick={() => {
                soundManager.playClickSound();
                setActiveSubTab('tools');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'tools'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Máy tính Giải Toán</span>
            </button>
            <button
              onClick={() => {
                soundManager.playClickSound();
                setActiveSubTab('mult_table');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'mult_table'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Bảng Cửu Chương</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: FORMULAS HANDBOOK */}
      {activeSubTab === 'handbook' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div
            className={`p-4 rounded-2xl border backdrop-blur-md flex flex-wrap items-center justify-between gap-3 ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm công thức: hằng đẳng thức, pytago, vi-ét, hình tròn..."
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border transition-colors outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-800 placeholder-slate-400'
                    : 'bg-slate-950 border-slate-700 focus:border-cyan-400 text-white placeholder-slate-500'
                }`}
              />
            </div>

            {/* Grade Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
              {(['all', 6, 7, 8, 9] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setSelectedGrade(g);
                    soundManager.playClickSound();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedGrade === g
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {g === 'all' ? 'Tất cả Lớp' : `Lớp ${g}`}
                </button>
              ))}
            </div>

            {/* Topic Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
              {['all', 'Đại số', 'Hình học', 'Số học'].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setSelectedTopic(t);
                    soundManager.playClickSound();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedTopic === t
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'all' ? 'Mọi chủ đề' : t}
                </button>
              ))}
            </div>

            {/* Favorite Only Toggle */}
            <button
              onClick={() => {
                setOnlyFavorites(!onlyFavorites);
                soundManager.playClickSound();
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                onlyFavorites
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current' : 'text-amber-500'}`} />
              <span>Ghim ({favorites.length})</span>
            </button>
          </div>

          {/* Formulas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFormulas.map((item) => {
              const isFav = favorites.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all hover:shadow-md ${
                    isLight
                      ? 'bg-white border-slate-200/90 hover:border-indigo-300'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                          <span className="text-indigo-600 dark:text-cyan-400 font-bold">
                            Lớp {item.grade}
                          </span>
                          <span>·</span>
                          <span>{item.topic}</span>
                        </div>
                        <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {item.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleCopy(item.expression, item.id)}
                          title="Sao chép công thức"
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            copiedId === item.id
                              ? 'bg-emerald-500 text-white border-emerald-600'
                              : isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {copiedId === item.id ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleFavorite(item.id)}
                          title={isFav ? 'Bỏ ghim' : 'Ghim công thức'}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isFav
                              ? 'bg-amber-500/15 border-amber-500 text-amber-500'
                              : isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-400 hover:text-amber-500'
                              : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-amber-400'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Formula Math Box */}
                    <div
                      className={`p-3 rounded-xl border font-mono text-center overflow-x-auto text-sm sm:text-base font-bold ${
                        isLight
                          ? 'bg-indigo-50/60 border-indigo-200/80 text-indigo-900'
                          : 'bg-indigo-950/40 border-indigo-500/30 text-cyan-200'
                      }`}
                    >
                      <FormattedMathView content={item.expression} />
                    </div>

                    {/* Explanation */}
                    <div className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      <FormattedMathView content={item.explanation} />
                    </div>

                    {/* Examples */}
                    {item.examples && item.examples.length > 0 && (
                      <div
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          isLight
                            ? 'bg-slate-50 border-slate-200/80 text-slate-700'
                            : 'bg-slate-950 border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                          Ví dụ minh họa:
                        </div>
                        {item.examples.map((ex, exIdx) => (
                          <div key={exIdx} className="font-mono text-xs">
                            <FormattedMathView content={ex} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pro Tips */}
                    {item.tips && (
                      <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <FormattedMathView content={item.tips} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                    {item.tags.map((t, idx) => (
                      <span key={idx}>#{t}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredFormulas.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <Compass className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="font-bold text-slate-500">
                Không tìm thấy công thức phù hợp với từ khóa "{searchQuery}"
              </div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGrade('all');
                  setSelectedTopic('all');
                  setOnlyFavorites(false);
                }}
                className="text-xs text-indigo-600 dark:text-cyan-400 underline font-bold cursor-pointer"
              >
                Xóa bộ lọc để hiển thị toàn bộ
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: INTERACTIVE STEP-BY-STEP MATH SOLVERS */}
      {activeSubTab === 'tools' && (
        <div className="space-y-6">
          {/* Tool 1: Quadratic & Linear Equation Solver */}
          <div
            className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-600 text-white">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">1. Giải Phương Trình Bậc Nhất & Bậc Hai Từng Bước</h2>
                <p className="text-xs text-slate-500">Phương trình dạng tổng quát: ax² + bx + c = 0</p>
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Hệ số a (gắn với x²)</label>
                <input
                  type="number"
                  value={eqA}
                  onChange={(e) => setEqA(e.target.value)}
                  placeholder="Ví dụ: 1"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Hệ số b (gắn với x)</label>
                <input
                  type="number"
                  value={eqB}
                  onChange={(e) => setEqB(e.target.value)}
                  placeholder="Ví dụ: -5"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Hệ số tự do c</label>
                <input
                  type="number"
                  value={eqC}
                  onChange={(e) => setEqC(e.target.value)}
                  placeholder="Ví dụ: 6"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>
            </div>

            {/* Equation Preview */}
            <div
              className={`p-3 rounded-xl border text-center font-mono font-bold text-sm sm:text-base ${
                isLight ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900' : 'bg-indigo-950/30 border-indigo-500/20 text-cyan-200'
              }`}
            >
              Phương trình: ({eqA || '0'})x² + ({eqB || '0'})x + ({eqC || '0'}) = 0
            </div>

            {/* Steps & Solution */}
            <div
              className={`p-4 rounded-2xl border space-y-2 text-xs sm:text-sm ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              <div className="font-bold text-indigo-600 dark:text-cyan-400">
                {solveQuadratic.message}
              </div>
              {solveQuadratic.steps && (
                <div className="space-y-1 pt-1 font-mono text-xs">
                  {solveQuadratic.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-slate-400 select-none">•</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tool 2: Pythagoras Theorem & Triangle Checker */}
          <div
            className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-600 text-white">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">2. Kiểm Tra Định Lý Pytago & Tam Giác Vuông</h2>
                <p className="text-xs text-slate-500">Nhập độ dài 3 cạnh a, b, c để kiểm tra định lý Pytago đảo và tính chu vi, diện tích</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cạnh a</label>
                <input
                  type="number"
                  value={sideA}
                  onChange={(e) => setSideA(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cạnh b</label>
                <input
                  type="number"
                  value={sideB}
                  onChange={(e) => setSideB(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cạnh c</label>
                <input
                  type="number"
                  value={sideC}
                  onChange={(e) => setSideC(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border space-y-2 text-xs sm:text-sm ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              {!triangleAnalysis.valid ? (
                <div className="text-rose-500 font-bold">{triangleAnalysis.message}</div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Kết luận:</span>
                    {triangleAnalysis.isRight ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                        ✓ Đây là TAM GIÁC VUÔNG (Cạnh huyền = {triangleAnalysis.hypotenuse})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                        Tam giác thường (không vuông)
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                    Kiểm tra Pytago: {triangleAnalysis.legs?.[0]}² + {triangleAnalysis.legs?.[1]}² = {triangleAnalysis.pythagorasSum}
                    {triangleAnalysis.isRight ? ' =' : ' ≠'} {triangleAnalysis.hypotenuse}² ({triangleAnalysis.hypSquare})
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <strong>Chu vi P:</strong> {triangleAnalysis.perimeter}
                    </div>
                    <div>
                      <strong>Diện tích S (Heron):</strong> {triangleAnalysis.area}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tool 3: GCD & LCM Calculator */}
          <div
            className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-600 text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">3. Tìm Ước Chung Lớn Nhất (ƯCLN) & Bội Chung Nhỏ Nhất (BCNN)</h2>
                <p className="text-xs text-slate-500">Phân tích thừa số nguyên tố và tìm ƯCLN, BCNN nhanh chóng</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Số tự nhiên thứ nhất</label>
                <input
                  type="number"
                  value={gcdA}
                  onChange={(e) => setGcdA(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Số tự nhiên thứ hai</label>
                <input
                  type="number"
                  value={gcdB}
                  onChange={(e) => setGcdB(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border space-y-2 text-xs sm:text-sm ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              {!gcdLcmAnalysis.valid ? (
                <div className="text-rose-500 font-bold">{gcdLcmAnalysis.message}</div>
              ) : (
                <div className="space-y-2">
                  <div className="font-mono text-xs">
                    • Phân tích {gcdA} = <strong>{gcdLcmAnalysis.strA}</strong>
                  </div>
                  <div className="font-mono text-xs">
                    • Phân tích {gcdB} = <strong>{gcdLcmAnalysis.strB}</strong>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-6">
                    <div>
                      <span className="text-slate-500">ƯCLN({gcdA}, {gcdB}) = </span>
                      <strong className="text-base text-indigo-600 dark:text-cyan-400">{gcdLcmAnalysis.gcd}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">BCNN({gcdA}, {gcdB}) = </span>
                      <strong className="text-base text-purple-600 dark:text-purple-400">{gcdLcmAnalysis.lcm}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: INTERACTIVE MULTIPLICATION TABLE MATRIX */}
      {activeSubTab === 'mult_table' && (
        <div
          className={`p-6 rounded-3xl border shadow-sm space-y-6 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Bảng Cửu Chương Ma Trận Tương Tác (1 đến 10)</h2>
              <p className="text-xs text-slate-500">
                Di chuột hoặc chạm vào ô bất kỳ để xem phép nhân và quy luật đối xứng đường chéo chính.
              </p>
            </div>
            {hoverRow && hoverCol && (
              <div
                className={`px-4 py-2 rounded-xl border text-sm font-extrabold font-mono flex items-center gap-2 ${
                  isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-indigo-950/60 border-cyan-400 text-cyan-300'
                }`}
              >
                <span>{hoverRow} × {hoverCol} =</span>
                <span className="text-lg text-indigo-600 dark:text-yellow-400">{hoverRow * hoverCol}</span>
              </div>
            )}
          </div>

          {/* Matrix Grid */}
          <div className="overflow-x-auto pb-2">
            <div className="inline-block min-w-[500px] w-full">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr>
                    <th className="p-2 text-xs font-black text-indigo-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-800">
                      ×
                    </th>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <th
                        key={n}
                        className={`p-2 text-xs font-black border border-slate-200 dark:border-slate-800 ${
                          hoverCol === n
                            ? 'bg-indigo-500 text-white'
                            : isLight
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-slate-950 text-slate-300'
                        }`}
                      >
                        {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 10 }, (_, rIdx) => rIdx + 1).map((row) => (
                    <tr key={row}>
                      <th
                        className={`p-2 text-xs font-black border border-slate-200 dark:border-slate-800 ${
                          hoverRow === row
                            ? 'bg-indigo-500 text-white'
                            : isLight
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-slate-950 text-slate-300'
                        }`}
                      >
                        {row}
                      </th>
                      {Array.from({ length: 10 }, (_, cIdx) => cIdx + 1).map((col) => {
                        const val = row * col;
                        const isMainDiagonal = row === col;
                        const isHighlighted = hoverRow === row || hoverCol === col;
                        const isTarget = hoverRow === row && hoverCol === col;

                        return (
                          <td
                            key={col}
                            onMouseEnter={() => {
                              setHoverRow(row);
                              setHoverCol(col);
                            }}
                            onClick={() => {
                              soundManager.playClickSound();
                              setHoverRow(row);
                              setHoverCol(col);
                            }}
                            className={`p-2 sm:p-3 text-xs sm:text-sm font-mono transition-colors cursor-pointer border border-slate-200 dark:border-slate-800 ${
                              isTarget
                                ? 'bg-amber-400 text-slate-950 font-black scale-105 shadow-md z-10'
                                : isHighlighted
                                ? isLight
                                  ? 'bg-indigo-100/80 font-bold text-indigo-900'
                                  : 'bg-indigo-900/40 font-bold text-cyan-300'
                                : isMainDiagonal
                                ? isLight
                                  ? 'bg-indigo-50 font-bold text-indigo-700'
                                  : 'bg-indigo-950/40 font-bold text-indigo-300'
                                : isLight
                                ? 'hover:bg-slate-100 text-slate-700'
                                : 'hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
