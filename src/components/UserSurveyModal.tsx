import React, { useState } from 'react';
import { useMathVerse } from '../context/MathVerseContext';
import {
  Star,
  Sparkles,
  Heart,
  MessageSquare,
  CheckCircle2,
  X,
  Send,
  HelpCircle,
  ThumbsUp,
  Award,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';
import {
  saveUserSurvey,
  snoozeWeeklySurvey,
  SURVEY_FEATURES,
  hasUserCompletedSurvey,
  markUserSurveyCompleted,
  hasSeenSurveyCompletedNotice,
  markSurveyCompletedNoticeSeen,
} from '../utils/userSurvey';

interface UserSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeek?: number;
}

export const UserSurveyModal: React.FC<UserSurveyModalProps> = ({
  isOpen,
  onClose,
  currentWeek = 1,
}) => {
  const { user, supabaseUserId, cloudResults, addXp, saveLessonResultToCloud, theme } = useMathVerse();
  const isLight = theme === 'light';

  // Câu 1: AI có dễ sử dụng không? (1-5 sao)
  const [easeRating, setEaseRating] = useState<number>(5);
  const [easeHover, setEaseHover] = useState<number>(0);

  // Câu 2: AI có giúp em học Toán tốt hơn không? (1-5 sao)
  const [helpRating, setHelpRating] = useState<number>(5);
  const [helpHover, setHelpHover] = useState<number>(0);

  // Câu 3: Em thích tính năng nào nhất?
  const [selectedFeature, setSelectedFeature] = useState<string>(SURVEY_FEATURES[0].label);

  // Câu 4: Góp ý thêm
  const [feedbackText, setFeedbackText] = useState<string>('');

  // Trạng thái đã gửi thành công trong phiên hiện tại
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const userSurveyKey = supabaseUserId || (user as any)?.id || user?.name || 'default';
  const alreadyCompleted = hasUserCompletedSurvey(userSurveyKey, cloudResults);
  const alreadySawCompletedNotice = hasSeenSurveyCompletedNotice(userSurveyKey);

  // Nếu đã hoàn thành khảo sát và đã từng hiện thông báo 1 lần rồi thì tự động đóng, không bao giờ hiện lại gây phiền
  React.useEffect(() => {
    if (isOpen && alreadyCompleted && !isSubmitted) {
      if (alreadySawCompletedNotice) {
        onClose();
      } else {
        markSurveyCompletedNoticeSeen(userSurveyKey);
      }
    }
  }, [isOpen, alreadyCompleted, isSubmitted, alreadySawCompletedNotice, userSurveyKey, onClose]);

  if (!isOpen) return null;
  if (alreadyCompleted && !isSubmitted && alreadySawCompletedNotice) return null;

  const easeLabels: Record<number, string> = {
    1: 'Rất khó sử dụng',
    2: 'Hơi phức tạp',
    3: 'Bình thường',
    4: 'Dễ sử dụng',
    5: 'Cực kỳ trực quan & dễ dùng ⭐',
  };

  const helpLabels: Record<number, string> = {
    1: 'Chưa thấy hiệu quả',
    2: 'Ít giúp ích',
    3: 'Tạm ổn',
    4: 'Hiểu bài nhanh hơn',
    5: 'Tiến bộ vượt bậc & tự tin học Toán ⭐',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (alreadyCompleted || isSubmitted) return;
    soundManager.playClickSound();

    saveUserSurvey({
      userName: user?.name || 'Học sinh MathVerse',
      grade: user?.grade || 6,
      weekNumber: currentWeek,
      easeOfUseRating: easeRating,
      helpfulnessRating: helpRating,
      favoriteFeature: selectedFeature,
      feedbackText: feedbackText.trim() || undefined,
    });

    // Đánh dấu người dùng đã hoàn thành khảo sát & đã xem thông báo (chỉ hiện 1 lần duy nhất)
    markUserSurveyCompleted(userSurveyKey);
    markSurveyCompletedNoticeSeen(userSurveyKey);

    // Cộng ngay +30 XP vào tài khoản (1 lần duy nhất) và đồng bộ lên Supabase
    addXp(30, 'Hoàn thành khảo sát trải nghiệm (+30 XP)');
    saveLessonResultToCloud({
      lesson_id: 'user-survey-once',
      lesson_title: 'Khảo sát trải nghiệm người dùng',
      grade_level: user?.grade || 6,
      topic: 'Thống kê',
      score: 100,
      correct_count: 0,
      wrong_count: 0,
      completion_percent: 100,
      answers: {
        type: 'weekly_survey',
        xpEarned: 30,
        easeOfUseRating: easeRating,
        helpfulnessRating: helpRating,
        favoriteFeature: selectedFeature,
      },
    }).catch(() => {});

    soundManager.playCorrectSound();
    soundManager.triggerConfetti();
    setIsSubmitted(true);

    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 2400);
  };

  const handleSnooze = () => {
    soundManager.playClickSound();
    snoozeWeeklySurvey();
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 ${
      isLight ? 'bg-slate-950/45' : 'bg-slate-950/80'
    }`}>
      <div className={`relative w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 max-h-[92vh] overflow-y-auto card-top-accent transition-all ${
        isLight
          ? 'bg-gradient-to-b from-white via-indigo-50/30 to-sky-50/40 border border-slate-200 text-slate-800 shadow-indigo-100/50'
          : 'bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border border-indigo-500/40 text-white'
      }`}>
        {/* Glow hiệu ứng nền */}
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
          isLight ? 'bg-indigo-300/20' : 'bg-indigo-500/10'
        }`} />
        <div className={`absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
          isLight ? 'bg-purple-300/20' : 'bg-purple-500/10'
        }`} />

        {/* Nút đóng */}
        <button
          onClick={onClose}
          type="button"
          className={`absolute top-4 right-4 p-2 rounded-xl transition-colors cursor-pointer ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
          }`}
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {isSubmitted ? (
          <div className="py-12 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className={`w-16 h-16 rounded-full border mx-auto flex items-center justify-center shadow-lg ${
              isLight
                ? 'bg-emerald-100 border-emerald-300 text-emerald-700 shadow-emerald-500/10'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20'
            }`}>
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className={`text-2xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Cảm ơn em đã gửi khảo sát! 🎉
            </h3>
            <p className={`text-sm max-w-md mx-auto leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Ý kiến quý báu của em giúp Vũ trụ MathVerse và Gia sư MathBot AI ngày càng hoàn thiện và thông minh hơn mỗi ngày.
            </p>
            <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl border text-xs font-bold ${
              isLight
                ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
            }`}>
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Em được cộng thưởng +30 XP khảo sát tích cực!</span>
            </div>
          </div>
        ) : alreadyCompleted ? (
          <div className="py-10 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className={`w-16 h-16 rounded-full border mx-auto flex items-center justify-center shadow-lg ${
              isLight
                ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            }`}>
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className={`text-xl sm:text-2xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Em đã hoàn thành khảo sát! ✅
            </h3>
            <p className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Mỗi tài khoản chỉ thực hiện bài khảo sát trải nghiệm <strong>1 lần duy nhất</strong> và em đã nhận đủ phần thưởng <strong>+30 XP</strong>.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  markSurveyCompletedNoticeSeen(userSurveyKey);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all"
              >
                Đã hiểu & Không hiện lại
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="space-y-1.5 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  isLight
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                }`}>
                  <Award className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-300'}`} />
                  <span>Khảo sát trải nghiệm (Chỉ làm 1 lần)</span>
                </span>
              </div>
              <h2 className={`text-xl sm:text-2xl font-extrabold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span>Đánh giá trải nghiệm học Toán cùng AI</span>
              </h2>
              <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Hãy cho thầy cô biết cảm nhận của em để cùng xây dựng nền tảng học Toán tốt nhất nhé!
              </p>
            </div>

            {/* CÂU 1: AI có dễ sử dụng không? */}
            <div className={`p-4 rounded-2xl border space-y-2.5 transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
            }`}>
              <label className={`text-sm font-bold flex items-center justify-between ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span>1. AI có dễ sử dụng không?</span>
                <span className={`text-xs font-mono font-semibold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                  {easeRating}/5 ⭐
                </span>
              </label>

              {/* 5 Ngôi sao tương tác */}
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (easeHover || easeRating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setEaseHover(star)}
                      onMouseLeave={() => setEaseHover(0)}
                      onClick={() => {
                        soundManager.playClickSound();
                        setEaseRating(star);
                      }}
                      className={`p-1.5 rounded-xl transition-transform active:scale-90 cursor-pointer focus:outline-none ${
                        isLight ? 'hover:bg-amber-50' : 'hover:bg-slate-800/80'
                      }`}
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : isLight
                            ? 'text-slate-300 hover:text-amber-400'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className={`text-xs font-medium ${isLight ? 'text-indigo-700' : 'text-indigo-300'}`}>
                {easeLabels[easeHover || easeRating]}
              </p>
            </div>

            {/* CÂU 2: AI có giúp em học Toán tốt hơn không? */}
            <div className={`p-4 rounded-2xl border space-y-2.5 transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
            }`}>
              <label className={`text-sm font-bold flex items-center justify-between ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span>2. AI có giúp em học Toán tốt hơn không?</span>
                <span className={`text-xs font-mono font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  {helpRating}/5 ⭐
                </span>
              </label>

              {/* 5 Ngôi sao tương tác */}
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (helpHover || helpRating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHelpHover(star)}
                      onMouseLeave={() => setHelpHover(0)}
                      onClick={() => {
                        soundManager.playClickSound();
                        setHelpRating(star);
                      }}
                      className={`p-1.5 rounded-xl transition-transform active:scale-90 cursor-pointer focus:outline-none ${
                        isLight ? 'hover:bg-emerald-50' : 'hover:bg-slate-800/80'
                      }`}
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          isFilled
                            ? 'text-emerald-500 fill-emerald-500 filter drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                            : isLight
                            ? 'text-slate-300 hover:text-emerald-400'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className={`text-xs font-medium ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>
                {helpLabels[helpHover || helpRating]}
              </p>
            </div>

            {/* CÂU 3: Em thích tính năng nào nhất? */}
            <div className={`p-4 rounded-2xl border space-y-2.5 transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
            }`}>
              <label className={`text-sm font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Heart className={`w-4 h-4 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
                <span>3. Em thích tính năng nào nhất?</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {SURVEY_FEATURES.map((feat) => {
                  const isSelected = selectedFeature === feat.label;
                  return (
                    <button
                      key={feat.id}
                      type="button"
                      onClick={() => {
                        soundManager.playClickSound();
                        setSelectedFeature(feat.label);
                      }}
                      className={`p-2.5 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? isLight
                            ? 'bg-indigo-100 border-indigo-400 text-indigo-950 shadow-sm'
                            : 'bg-indigo-600/40 border-indigo-400 text-white shadow-md shadow-indigo-600/20'
                          : isLight
                          ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100/70'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="text-base">{feat.icon}</span>
                      <span className="truncate">{feat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CÂU 4: Góp ý thêm */}
            <div className={`p-4 rounded-2xl border space-y-2 transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
            }`}>
              <label className={`text-sm font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <MessageSquare className={`w-4 h-4 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
                <span>4. Góp ý thêm cho MathVerse:</span>
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Chia sẻ thêm cảm nhận, tính năng em muốn có thêm hoặc bài toán em muốn AI hỗ trợ tốt hơn..."
                rows={3}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none transition-colors ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-900 border-slate-700/80 text-white placeholder-slate-500'
                }`}
              />
            </div>

            {/* Footer buttons */}
            <div className={`flex items-center justify-between gap-3 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <button
                type="button"
                onClick={handleSnooze}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Nhắc em sau
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-400 hover:to-pink-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Send className="w-4 h-4 text-white" />
                <span className="text-white">Gửi đánh giá (+30 XP)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
