import React, { useState } from 'react';
import { soundManager } from '../utils/soundEffects';
import {
  Calculator,
  X,
  Equal,
  Sparkles,
  HelpCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface SmartCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
}

export const SmartCalculatorModal: React.FC<SmartCalculatorModalProps> = ({
  isOpen,
  onClose,
  isLight,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'fraction' | 'equation'>('fraction');

  // Basic Calculator State
  const [calcInput, setCalcInput] = useState<string>('');
  const [calcResult, setCalcResult] = useState<string>('');

  // Fraction Solver State
  const [f1Num, setF1Num] = useState<string>('3');
  const [f1Den, setF1Den] = useState<string>('4');
  const [fOp, setFOp] = useState<'+' | '-' | '×' | '÷'>('+');
  const [f2Num, setF2Num] = useState<string>('1');
  const [f2Den, setF2Den] = useState<string>('6');
  const [fractionSolution, setFractionSolution] = useState<{
    resultNum: number;
    resultDen: number;
    steps: string[];
  } | null>(null);

  // Equation Solver State: ax^2 + bx + c = 0
  const [eqA, setEqA] = useState<string>('1');
  const [eqB, setEqB] = useState<string>('-5');
  const [eqC, setEqC] = useState<string>('6');
  const [eqSolution, setEqSolution] = useState<{
    type: 'linear' | 'quadratic';
    delta?: number;
    roots: string[];
    steps: string[];
  } | null>(null);

  if (!isOpen) return null;

  // GCD helper
  const gcd = (a: number, b: number): number => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  };

  // LCM helper
  const lcm = (a: number, b: number): number => {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / gcd(a, b);
  };

  // Solve Fractions
  const handleSolveFraction = () => {
    soundManager.playClickSound();
    const n1 = parseInt(f1Num, 10);
    const d1 = parseInt(f1Den, 10);
    const n2 = parseInt(f2Num, 10);
    const d2 = parseInt(f2Den, 10);

    if (isNaN(n1) || isNaN(d1) || isNaN(n2) || isNaN(d2)) return;
    if (d1 === 0 || d2 === 0) {
      alert('Mẫu số phải khác 0!');
      return;
    }

    const steps: string[] = [];
    let num = 0;
    let den = 1;

    if (fOp === '+' || fOp === '-') {
      const commonDen = lcm(d1, d2);
      const m1 = commonDen / d1;
      const m2 = commonDen / d2;
      const adjN1 = n1 * m1;
      const adjN2 = n2 * m2;

      steps.push(`Tìm mẫu số chung nhỏ nhất (MSCNN): BCNN(${d1}, ${d2}) = ${commonDen}`);
      steps.push(`Quy đồng mẫu số: ${n1}/${d1} = ${adjN1}/${commonDen} và ${n2}/${d2} = ${adjN2}/${commonDen}`);

      if (fOp === '+') {
        num = adjN1 + adjN2;
        steps.push(`Cộng hai tử số giữ nguyên mẫu: (${adjN1} + ${adjN2}) / ${commonDen} = ${num}/${commonDen}`);
      } else {
        num = adjN1 - adjN2;
        steps.push(`Trừ hai tử số giữ nguyên mẫu: (${adjN1} - ${adjN2}) / ${commonDen} = ${num}/${commonDen}`);
      }
      den = commonDen;
    } else if (fOp === '×') {
      num = n1 * n2;
      den = d1 * d2;
      steps.push(`Nhân tử với tử, mẫu với mẫu: (${n1} × ${n2}) / (${d1} × ${d2}) = ${num}/${den}`);
    } else if (fOp === '÷') {
      if (n2 === 0) {
        alert('Không thể chia cho phân số có tử số bằng 0!');
        return;
      }
      num = n1 * d2;
      den = d1 * n2;
      steps.push(`Chia phân số là nhân với phân số đảo ngược: (${n1}/${d1}) × (${d2}/${n2}) = ${num}/${den}`);
    }

    // Simplify fraction
    const divisor = gcd(num, den);
    const finalNum = (den < 0 ? -num : num) / divisor;
    const finalDen = Math.abs(den) / divisor;

    if (divisor > 1) {
      steps.push(`Rút gọn phân số (chia cả tử và mẫu cho ƯCLN = ${divisor}): kết quả tối giản = ${finalNum}/${finalDen}`);
    } else {
      steps.push(`Phân số đã ở dạng tối giản: ${finalNum}/${finalDen}`);
    }

    setFractionSolution({
      resultNum: finalNum,
      resultDen: finalDen,
      steps,
    });
  };

  // Solve Equations
  const handleSolveEquation = () => {
    soundManager.playClickSound();
    const a = parseFloat(eqA);
    const b = parseFloat(eqB);
    const c = parseFloat(eqC);

    if (isNaN(a) || isNaN(b) || isNaN(c)) return;

    const steps: string[] = [];
    const roots: string[] = [];

    if (a === 0) {
      // Linear bx + c = 0
      steps.push(`Vì a = 0 nên phương trình trở thành bậc nhất: ${b}x + (${c}) = 0`);
      if (b === 0) {
        if (c === 0) {
          steps.push('Phương trình có vô số nghiệm (0x = 0).');
          roots.push('Vô số nghiệm (x ∈ ℝ)');
        } else {
          steps.push(`Phương trình vô nghiệm (0x = ${-c}).`);
          roots.push('Vô nghiệm (x ∈ ∅)');
        }
      } else {
        const root = -c / b;
        const formatted = Number.isInteger(root) ? root.toString() : root.toFixed(3);
        steps.push(`Chuyển vế: ${b}x = ${-c} ⇔ x = ${-c} / ${b} = ${formatted}`);
        roots.push(`x = ${formatted}`);
      }
      setEqSolution({
        type: 'linear',
        roots,
        steps,
      });
      return;
    }

    // Quadratic ax^2 + bx + c = 0
    const delta = b * b - 4 * a * c;
    steps.push(`Phương trình bậc hai: ${a}x² + (${b})x + (${c}) = 0`);
    steps.push(`Tính biệt thức Δ (Delta): Δ = b² - 4ac = (${b})² - 4 × (${a}) × (${c}) = ${delta}`);

    if (delta < 0) {
      steps.push('Vì Δ < 0 nên phương trình vô nghiệm trên tập số thực ℝ.');
      roots.push('Vô nghiệm (x ∈ ∅)');
    } else if (delta === 0) {
      const x0 = -b / (2 * a);
      const formatted = Number.isInteger(x0) ? x0.toString() : x0.toFixed(3);
      steps.push(`Vì Δ = 0 nên phương trình có nghiệm kép: x₁ = x₂ = -b / (2a) = ${-b} / (2 × ${a}) = ${formatted}`);
      roots.push(`x₁ = x₂ = ${formatted}`);
    } else {
      const sqrtDelta = Math.sqrt(delta);
      const x1 = (-b + sqrtDelta) / (2 * a);
      const x2 = (-b - sqrtDelta) / (2 * a);
      const f1 = Number.isInteger(x1) ? x1.toString() : x1.toFixed(3);
      const f2 = Number.isInteger(x2) ? x2.toString() : x2.toFixed(3);
      steps.push(`Vì Δ > 0 nên √Δ = ${Number.isInteger(sqrtDelta) ? sqrtDelta : sqrtDelta.toFixed(3)}`);
      steps.push(`Nghiệm thứ nhất: x₁ = (-b + √Δ) / 2a = (${-b} + ${Number.isInteger(sqrtDelta) ? sqrtDelta : sqrtDelta.toFixed(3)}) / (2 × ${a}) = ${f1}`);
      steps.push(`Nghiệm thứ hai: x₂ = (-b - √Δ) / 2a = (${-b} - ${Number.isInteger(sqrtDelta) ? sqrtDelta : sqrtDelta.toFixed(3)}) / (2 × ${a}) = ${f2}`);
      roots.push(`x₁ = ${f1}`);
      roots.push(`x₂ = ${f2}`);
    }

    setEqSolution({
      type: 'quadratic',
      delta,
      roots,
      steps,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl max-h-[90vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${isLight ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800 bg-slate-950/40'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Máy Tính Khoa Học & Giải Toán Chi Tiết</h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Hỗ trợ tính phân số, căn thức, phương trình bậc nhất & bậc hai từng bước
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={`flex border-b px-4 sm:px-6 pt-3 gap-2 ${isLight ? 'border-slate-200 bg-slate-50/30' : 'border-slate-800 bg-slate-950/20'}`}>
          <button
            type="button"
            onClick={() => { setActiveTab('fraction'); soundManager.playClickSound(); }}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 cursor-pointer transition-all ${
              activeTab === 'fraction'
                ? 'border-indigo-600 text-indigo-600 dark:border-cyan-400 dark:text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📐 Tính Phân Số (Quy đồng & Rút gọn)
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('equation'); soundManager.playClickSound(); }}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 cursor-pointer transition-all ${
              activeTab === 'equation'
                ? 'border-indigo-600 text-indigo-600 dark:border-cyan-400 dark:text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Giải Phương Trình (Bậc 1 & 2 với Δ)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* TAB 1: PHÂN SỐ */}
          {activeTab === 'fraction' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 p-4 rounded-2xl bg-slate-500/5 border border-slate-300/40">
                {/* Fraction 1 */}
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="number"
                    value={f1Num}
                    onChange={(e) => setF1Num(e.target.value)}
                    className="w-14 sm:w-16 p-2 rounded-lg border text-center font-bold text-sm sm:text-base focus:ring-2 focus:ring-indigo-500"
                    placeholder="Tử"
                  />
                  <div className="w-14 sm:w-16 h-0.5 bg-slate-400" />
                  <input
                    type="number"
                    value={f1Den}
                    onChange={(e) => setF1Den(e.target.value)}
                    className="w-14 sm:w-16 p-2 rounded-lg border text-center font-bold text-sm sm:text-base focus:ring-2 focus:ring-indigo-500"
                    placeholder="Mẫu"
                  />
                </div>

                {/* Operator Selector */}
                <div className="flex flex-col gap-1">
                  {(['+', '-', '×', '÷'] as const).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => { setFOp(op); soundManager.playClickSound(); }}
                      className={`w-8 h-8 rounded-lg font-black text-sm flex items-center justify-center border transition-all cursor-pointer ${
                        fOp === op
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>

                {/* Fraction 2 */}
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="number"
                    value={f2Num}
                    onChange={(e) => setF2Num(e.target.value)}
                    className="w-14 sm:w-16 p-2 rounded-lg border text-center font-bold text-sm sm:text-base focus:ring-2 focus:ring-indigo-500"
                    placeholder="Tử"
                  />
                  <div className="w-14 sm:w-16 h-0.5 bg-slate-400" />
                  <input
                    type="number"
                    value={f2Den}
                    onChange={(e) => setF2Den(e.target.value)}
                    className="w-14 sm:w-16 p-2 rounded-lg border text-center font-bold text-sm sm:text-base focus:ring-2 focus:ring-indigo-500"
                    placeholder="Mẫu"
                  />
                </div>

                <div className="text-xl font-bold">=</div>

                {/* Result Display Box */}
                <div className="flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 min-w-16">
                  {fractionSolution ? (
                    <div className="flex flex-col items-center">
                      <span className="font-black text-lg text-indigo-500 dark:text-cyan-300">
                        {fractionSolution.resultNum}
                      </span>
                      {fractionSolution.resultDen !== 1 && (
                        <>
                          <div className="w-8 h-0.5 bg-indigo-500 dark:bg-cyan-400 my-0.5" />
                          <span className="font-black text-lg text-indigo-500 dark:text-cyan-300">
                            {fractionSolution.resultDen}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-slate-400">?</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSolveFraction}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Giải Chi Tiết Phân Số</span>
              </button>

              {/* Step-by-step display */}
              {fractionSolution && (
                <div className={`p-4 rounded-2xl border space-y-2 text-xs ${isLight ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-950 border-indigo-500/30'}`}>
                  <div className="font-extrabold text-indigo-500 dark:text-cyan-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Các bước giải chi tiết:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300">
                    {fractionSolution.steps.map((step, idx) => (
                      <li key={idx} className="leading-relaxed font-mono">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PHƯƠNG TRÌNH */}
          {activeTab === 'equation' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-500/5 border border-slate-300/40 text-center space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Dạng tổng quát: a·x² + b·x + c = 0
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-base sm:text-lg font-bold font-mono">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={eqA}
                      onChange={(e) => setEqA(e.target.value)}
                      className="w-14 sm:w-16 p-2 rounded-lg border text-center font-bold text-sm sm:text-base focus:ring-2 focus:ring-indigo-500"
                    />
                    <span>x²</span>
                  </div>

                  <span>+</span>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={eqB}
                      onChange={(e) => setEqB(e.target.value)}
                      className="w-14 sm:w-16 p-2 rounded-lg border text-center font-bold text-sm sm:text-base focus:ring-2 focus:ring-indigo-500"
                    />
                    <span>x</span>
                  </div>

                  <span>+</span>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={eqC}
                      onChange={(e) => setEqC(e.target.value)}
                      className="w-14 sm:w-16 p-2 rounded-lg border text-center font-bold text-sm sm:text-base focus:ring-2 focus:ring-indigo-500"
                    />
                    <span>= 0</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSolveEquation}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-xs sm:text-sm shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Giải Phương Trình & Tính Δ</span>
              </button>

              {/* Step-by-step display */}
              {eqSolution && (
                <div className={`p-4 rounded-2xl border space-y-2.5 text-xs ${isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-950 border-amber-500/30'}`}>
                  <div className="font-extrabold text-amber-500 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Kết quả nghiệm:</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-mono font-bold">
                      {eqSolution.roots.join(' ; ')}
                    </span>
                  </div>

                  <div className="pt-1.5 border-t border-amber-200/50 dark:border-amber-500/20">
                    <div className="font-bold text-slate-400 mb-1">Các bước biến đổi:</div>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300">
                      {eqSolution.steps.map((step, idx) => (
                        <li key={idx} className="leading-relaxed font-mono">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
