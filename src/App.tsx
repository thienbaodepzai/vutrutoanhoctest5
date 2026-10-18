import React from 'react';
import { MathVerseProvider, useMathVerse } from './context/MathVerseContext';
import { LoginScreen } from './components/LoginScreen';
import { Navbar } from './components/Navbar';
import { HomeDashboard } from './components/HomeDashboard';
import { CurriculumView } from './components/CurriculumView';
import { PracticeMode } from './components/PracticeMode';
import { QuizExamMode } from './components/QuizExamMode';
import { ChallengesMode } from './components/ChallengesMode';
import { MathBotChat } from './components/MathBotChat';
import { SmartReviewMode } from './components/SmartReviewMode';
import { AchievementsView } from './components/AchievementsView';
import { ProgressAnalyticsView } from './components/ProgressAnalyticsView';
import { LeaderboardView } from './components/LeaderboardView';
import { SettingsModal } from './components/SettingsModal';
import { MusicPlayerWidget } from './components/MusicPlayerWidget';
import { GradePromotionModal } from './components/GradePromotionModal';
import { GradePromotionQuiz } from './components/GradePromotionQuiz';
import { UserSurveyModal } from './components/UserSurveyModal';
import { PublicUserProfileModal } from './components/PublicUserProfileModal';
import { AdminDashboardView } from './components/AdminDashboardView';
import { FormulaVaultView } from './components/FormulaVaultView';
import { SpeedDuelMode } from './components/SpeedDuelMode';
import { SmartCalculatorModal } from './components/SmartCalculatorModal';
import { DynamicBackground } from './components/DynamicBackground';
import { BackgroundCustomizerModal } from './components/BackgroundCustomizerModal';
import {
  Home,
  BookOpen,
  PenTool,
  Clock,
  Target,
  Bot,
  RotateCcw,
  Award,
  BarChart3,
  Trophy,
  ShieldCheck,
  Ban,
  LogOut,
  Zap,
  Compass,
  Gift,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Menu,
  X,
  Calculator,
  Music,
  Film,
  RefreshCw,
} from 'lucide-react';
import { soundManager } from './utils/soundEffects';

const MainAppContent: React.FC = () => {
  const {
    user,
    supabaseUserId,
    activeTab,
    setActiveTab,
    lockedGradeAttempt,
    setLockedGradeAttempt,
    activePromotionExamGrade,
    setActivePromotionExamGrade,
    isSurveyModalOpen,
    closeSurveyModal,
    viewingPublicProfile,
    setViewingPublicProfile,
    theme,
    isAdmin,
    bannedInfo,
    logout,
    syncAllDataNow,
    isSyncingData,
  } = useMathVerse();

  if (!user) {
    return <LoginScreen />;
  }

  const isLight = theme === 'light';

  if (bannedInfo && !isAdmin) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 ${
          isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-white'
        }`}
      >
        <div
          className={`max-w-md w-full p-8 rounded-3xl border text-center space-y-5 shadow-2xl ${
            isLight
              ? 'bg-white border-rose-300 shadow-rose-100'
              : 'bg-slate-900 border-rose-500/40 shadow-black/70'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
            <Ban className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-rose-500">
            Tài khoản đã bị Ban Vĩnh Viễn
          </h1>
          <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Tài khoản <strong>{user.name}</strong> của bạn đã bị Ban Quản Trị (Admin) khóa vĩnh viễn và không thể tiếp tục truy cập hệ thống MathVerse.
          </p>
          <div
            className={`p-4 rounded-2xl border text-left text-xs space-y-1.5 ${
              isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
            }`}
          >
            <div>
              <strong>Lý do:</strong> {bannedInfo.reason}
            </div>
            <div>
              <strong>Thực hiện bởi:</strong> {bannedInfo.bannedBy}
            </div>
            <div>
              <strong>Thời gian:</strong> {new Date(bannedInfo.bannedAt).toLocaleString('vi-VN')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.playClickSound();
              logout();
            }}
            className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất sang tài khoản khác</span>
          </button>
        </div>
      </div>
    );
  }

  const [isAllMenuOpen, setIsAllMenuOpen] = React.useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const [isMusicModalOpen, setIsMusicModalOpen] = React.useState(false);
  const [isBgModalOpen, setIsBgModalOpen] = React.useState(false);
  const scrollNavRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkNavScroll = React.useCallback(() => {
    if (!scrollNavRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollNavRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  const handleNavScroll = (direction: 'left' | 'right') => {
    if (!scrollNavRef.current) return;
    const offset = direction === 'left' ? -240 : 240;
    scrollNavRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    soundManager.playClickSound();
    setTimeout(checkNavScroll, 300);
  };

  React.useEffect(() => {
    checkNavScroll();
    const handleResize = () => checkNavScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkNavScroll]);

  React.useEffect(() => {
    if (!scrollNavRef.current) return;
    const activeEl = scrollNavRef.current.querySelector<HTMLElement>(`[data-nav-id="${activeTab}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    setTimeout(checkNavScroll, 300);
  }, [activeTab, checkNavScroll]);

  const learningNavItems = [
    { id: 'dashboard', label: 'Trang chủ', icon: Home },
    { id: 'lessons', label: 'Học bài', icon: BookOpen },
    { id: 'practice', label: 'Luyện tập', icon: PenTool },
    { id: 'speed_duel', label: '⚡ Đấu trường 60s', icon: Zap },
    { id: 'formula_vault', label: '📐 Sổ tay Công thức', icon: Compass },
    { id: 'quiz', label: 'Trắc nghiệm', icon: Clock },
    { id: 'challenges', label: 'Thử thách', icon: Target },
    { id: 'leaderboard', label: '🏆 Bảng xếp hạng', icon: Trophy },
    { id: 'mathbot', label: 'MathBot AI', icon: Bot },
    { id: 'smart_review', label: 'Ôn tập', icon: RotateCcw },
  ];

  return (
    <div
      className={`min-h-screen ${
        isLight
          ? 'theme-light bg-gradient-to-br from-slate-50 via-sky-50/30 to-indigo-50/40 text-slate-800'
          : 'theme-dark bg-slate-950 text-slate-100'
      } flex flex-col relative selection:bg-indigo-500 selection:text-white transition-colors duration-300`}
    >
      {/* Dynamic Background System (Supports Uploaded Video MP4/WebM, Animated GIF, Image, and Cosmic Presets) */}
      <DynamicBackground />

      {/* Top Navbar */}
      <Navbar
        onOpenMusicModal={() => setIsMusicModalOpen(true)}
        onOpenBgModal={() => setIsBgModalOpen(true)}
      />

      {/* Secondary Quick Nav Bar (Desktop & Tablet) */}
      <div
        className={`relative z-10 border-b ${
          isLight ? 'border-slate-200/90 bg-white/90 shadow-xs' : 'border-slate-800/90 bg-slate-900/60'
        } backdrop-blur-md hidden sm:block`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 py-2">
            
            {/* Left Zone: Scrollable Learning Nav Items with Left & Right scroll buttons */}
            <div className="relative flex-1 min-w-0 flex items-center">
              {/* Left Scroll Chevron */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => handleNavScroll('left')}
                  className={`absolute left-0 z-20 p-1.5 rounded-lg border shadow-md cursor-pointer transition-all ${
                    isLight
                      ? 'bg-white/95 text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-50'
                      : 'bg-slate-900/95 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-800'
                  }`}
                  title="Cuộn sang trái"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* Scrollable list */}
              <div
                ref={scrollNavRef}
                onScroll={checkNavScroll}
                className="flex items-center space-x-1.5 overflow-x-auto py-0.5 scrollbar-thin scroll-smooth w-full px-1"
              >
                {learningNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      data-nav-id={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        soundManager.playClickSound();
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                        isActive
                          ? isLight
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                            : 'bg-gradient-to-r from-cyan-500/20 to-indigo-600/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : isLight
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Scroll Chevron */}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => handleNavScroll('right')}
                  className={`absolute right-0 z-20 p-1.5 rounded-lg border shadow-md cursor-pointer transition-all ${
                    isLight
                      ? 'bg-white/95 text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-50'
                      : 'bg-slate-900/95 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-800'
                  }`}
                  title="Cuộn sang phải"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Right Zone: Pinned Action Group: Thành tích, Tiến độ, 🛡️ Quản trị Admin (ALWAYS VISIBLE, NEVER CUT OFF) */}
            <div className={`flex items-center gap-1.5 shrink-0 pl-3 border-l ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              {/* Thành tích Button */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('achievements');
                  soundManager.playClickSound();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  activeTab === 'achievements'
                    ? isLight
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/30'
                      : 'bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-amber-300 border-amber-500/50 shadow-sm'
                    : isLight
                    ? 'text-amber-700 bg-amber-50 hover:bg-amber-100/90 border-amber-200/90'
                    : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
                }`}
                title="Xem Thành tích & Huy hiệu"
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Thành tích</span>
              </button>

              {/* Tiến độ Button */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('analytics');
                  soundManager.playClickSound();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  activeTab === 'analytics'
                    ? isLight
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-500/30'
                      : 'bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : isLight
                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100/90 border-emerald-200/90'
                    : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30'
                }`}
                title="Xem Tiến độ & Báo cáo học tập"
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Tiến độ</span>
              </button>

              {/* 🛡️ Quản trị Admin Button - If admin */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    soundManager.playClickSound();
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer border shadow-sm ${
                    activeTab === 'admin'
                      ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-orange-500 text-white border-amber-300 shadow-md shadow-orange-500/30'
                      : isLight
                      ? 'bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 border-amber-400 text-amber-900 font-extrabold'
                      : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border-amber-400 text-amber-300'
                  }`}
                  title="Trung tâm Quản trị Admin Tối cao"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>🛡️ Quản trị Admin</span>
                </button>
              )}

              {/* Máy tính thông minh Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsCalculatorOpen(true);
                  soundManager.playClickSound();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  isLight
                    ? 'bg-cyan-50 hover:bg-cyan-100/90 border-cyan-200/90 text-cyan-800'
                    : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                }`}
                title="Mở Máy tính khoa học & Giải toán phân số, phương trình chi tiết"
              >
                <Calculator className="w-3.5 h-3.5 text-cyan-500" />
                <span className="hidden lg:inline">Máy tính</span>
              </button>

              {/* Tất cả Menu Drawer Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsAllMenuOpen(true);
                  soundManager.playClickSound();
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                  isLight
                    ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                    : 'border-slate-800 hover:bg-slate-800 text-slate-300'
                }`}
                title="Xem danh mục tất cả tính năng"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Main Page Content */}
      <main className="flex-1 relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 sm:pb-12">
        {activeTab === 'dashboard' && <HomeDashboard />}
        {activeTab === 'lessons' && <CurriculumView />}
        {activeTab === 'practice' && <PracticeMode />}
        {activeTab === 'speed_duel' && <SpeedDuelMode />}
        {activeTab === 'formula_vault' && <FormulaVaultView />}
        {activeTab === 'quiz' && <QuizExamMode />}
        {activeTab === 'challenges' && <ChallengesMode />}
        {activeTab === 'leaderboard' && <LeaderboardView />}
        {activeTab === 'mathbot' && <MathBotChat />}
        {activeTab === 'smart_review' && <SmartReviewMode />}
        {activeTab === 'achievements' && <AchievementsView />}
        {activeTab === 'analytics' && <ProgressAnalyticsView />}
        {activeTab === 'admin' && <AdminDashboardView />}
        {activeTab === 'settings' && <SettingsModal />}
      </main>



      {/* Grade Promotion Modal when attempting to switch to a locked grade */}
      {lockedGradeAttempt && (
        <GradePromotionModal
          targetGrade={lockedGradeAttempt}
          onClose={() => setLockedGradeAttempt(null)}
          onStartExam={(gradeToTake) => {
            setLockedGradeAttempt(null);
            setActivePromotionExamGrade(gradeToTake);
          }}
        />
      )}

      {/* Active Promotion Exam Quiz */}
      {activePromotionExamGrade && (
        <GradePromotionQuiz
          sourceGrade={activePromotionExamGrade}
          onClose={() => setActivePromotionExamGrade(null)}
        />
      )}

      {/* Weekly User Feedback Survey Modal */}
      <UserSurveyModal
        isOpen={isSurveyModalOpen}
        onClose={closeSurveyModal}
        currentWeek={Math.min(4, Math.max(1, Math.ceil((user?.streak || 1) / 7)))}
      />

      {/* LQDOJ-style Read-Only Public User Profile Modal */}
      {viewingPublicProfile && (
        <PublicUserProfileModal
          profile={viewingPublicProfile}
          isOwnProfile={
            Boolean(supabaseUserId && viewingPublicProfile.user_id === supabaseUserId) ||
            Boolean(!supabaseUserId && user?.name && viewingPublicProfile.display_name === user.name)
          }
          isLight={isLight}
          onClose={() => setViewingPublicProfile(null)}
          onEditOwnProfile={() => setActiveTab('settings')}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div
        className={`sm:hidden fixed bottom-0 left-0 right-0 z-40 ${
          isLight ? 'bg-white/95 border-t border-slate-200 shadow-lg text-slate-800' : 'bg-slate-950/90 border-t border-slate-800 text-slate-100'
        } backdrop-blur-xl px-2 py-1.5 flex items-center justify-around`}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('dashboard');
            soundManager.playClickSound();
          }}
          className={`flex flex-col items-center p-1.5 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? isLight
                ? 'text-indigo-600 font-bold'
                : 'text-cyan-400 font-bold'
              : isLight
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Trang chủ</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('lessons');
            soundManager.playClickSound();
          }}
          className={`flex flex-col items-center p-1.5 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'lessons'
              ? isLight
                ? 'text-indigo-600 font-bold'
                : 'text-cyan-400 font-bold'
              : isLight
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span>Học bài</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('practice');
            soundManager.playClickSound();
          }}
          className={`flex flex-col items-center p-1.5 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'practice'
              ? isLight
                ? 'text-indigo-600 font-bold'
                : 'text-cyan-400 font-bold'
              : isLight
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PenTool className="w-5 h-5 mb-0.5" />
          <span>Luyện tập</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('mathbot');
            soundManager.playClickSound();
          }}
          className={`flex flex-col items-center p-1.5 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'mathbot'
              ? isLight
                ? 'text-indigo-600 font-bold'
                : 'text-cyan-400 font-bold'
              : isLight
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-5 h-5 mb-0.5 text-indigo-400" />
          <span>MathBot</span>
        </button>

        {/* Menu Tất cả (Bao gồm Thành tích, Tiến độ, Quản trị Admin) */}
        <button
          type="button"
          onClick={() => {
            setIsAllMenuOpen(true);
            soundManager.playClickSound();
          }}
          className={`relative flex flex-col items-center p-1.5 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            isAllMenuOpen || ['achievements', 'analytics', 'admin'].includes(activeTab)
              ? isLight
                ? 'text-amber-600 font-bold'
                : 'text-amber-400 font-bold'
              : isLight
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isAdmin && (
            <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
          <LayoutGrid className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </div>

      {/* All Features & Navigation Modal / Sheet */}
      {isAllMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl border flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            {/* Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${isLight ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800/80 bg-slate-950/40'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Danh mục tính năng MathVerse</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Truy cập nhanh tất cả khu vực học tập, quản trị và báo cáo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAllMenuOpen(false)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              
              {/* Highlighted Admin Card if admin */}
              {isAdmin && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border-2 border-amber-400/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm sm:text-base text-amber-500 dark:text-amber-300">
                          🛡️ Trung tâm Quản trị Admin
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase">
                          Root Admin
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Quản lý người dùng, câu hỏi đề thi, thăng hạng, duyệt khảo sát và bảo mật hệ thống.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('admin');
                      setIsAllMenuOpen(false);
                      soundManager.playClickSound();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-105 shrink-0"
                  >
                    <span>Mở Bảng Admin</span>
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* 2 Key Progress & Achievements Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Thành tích */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('achievements');
                    setIsAllMenuOpen(false);
                    soundManager.playClickSound();
                  }}
                  className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer group ${
                    activeTab === 'achievements'
                      ? isLight ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-amber-500/15 border-amber-500/40 shadow-sm'
                      : isLight ? 'bg-slate-50 hover:bg-amber-50/50 border-slate-200 hover:border-amber-200' : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 hover:border-amber-500/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5">
                      <span>🏆 Thành tích & Cấp bậc</span>
                    </div>
                    <div className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {user.xp} XP • Huy hiệu & phần thưởng
                    </div>
                  </div>
                </button>

                {/* Tiến độ */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('analytics');
                    setIsAllMenuOpen(false);
                    soundManager.playClickSound();
                  }}
                  className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer group ${
                    activeTab === 'analytics'
                      ? isLight ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-emerald-500/15 border-emerald-500/40 shadow-sm'
                      : isLight ? 'bg-slate-50 hover:bg-emerald-50/50 border-slate-200 hover:border-emerald-200' : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 hover:border-emerald-500/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5">
                      <span>📊 Tiến độ & Báo cáo</span>
                    </div>
                    <div className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Phân tích bài học, điểm số & chuỗi ngày
                    </div>
                  </div>
                </button>
              </div>

              {/* All Other Core Learning Features */}
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                  Các khu vực học tập & rèn luyện
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {learningNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsAllMenuOpen(false);
                          soundManager.playClickSound();
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          isActive
                            ? isLight
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                              : 'bg-indigo-600/20 border-cyan-500/50 text-cyan-300 font-bold'
                            : isLight
                            ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-xs truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tiện ích mở rộng: Máy tính khoa học */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAllMenuOpen(false);
                      setIsCalculatorOpen(true);
                      soundManager.playClickSound();
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isLight
                        ? 'bg-gradient-to-r from-cyan-50 to-indigo-50 border-cyan-200 text-slate-800 hover:border-cyan-300'
                        : 'bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border-cyan-500/30 text-white hover:border-cyan-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                        <Calculator className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-xs sm:text-sm text-cyan-600 dark:text-cyan-300">
                          📐 Máy Tính Khoa Học & Phân Số (Giải Từng Bước)
                        </div>
                        <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Hỗ trợ quy đồng phân số, rút gọn và giải phương trình bậc nhất, bậc hai với Δ
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-500">Mở &rarr;</span>
                  </button>

                  {/* 3 Quick Utility Cards: Nhạc, Hình nền, Đồng bộ */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {/* Music Player */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAllMenuOpen(false);
                        setIsMusicModalOpen(true);
                        soundManager.playClickSound();
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isLight
                          ? 'bg-slate-50 hover:bg-cyan-50/60 border-slate-200'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">🎵 Trình phát Nhạc</div>
                        <div className="text-[10px] text-slate-400 truncate">Tải nhạc từ máy</div>
                      </div>
                    </button>

                    {/* Background Customizer */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAllMenuOpen(false);
                        setIsBgModalOpen(true);
                        soundManager.playClickSound();
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isLight
                          ? 'bg-slate-50 hover:bg-purple-50/60 border-slate-200'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                        <Film className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">🖼️ Đổi Hình nền</div>
                        <div className="text-[10px] text-slate-400 truncate">Tải ảnh/video/GIF</div>
                      </div>
                    </button>

                    {/* Data Sync */}
                    <button
                      type="button"
                      onClick={async () => {
                        soundManager.playClickSound();
                        await syncAllDataNow();
                      }}
                      disabled={isSyncingData}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isLight
                          ? 'bg-slate-50 hover:bg-emerald-50/60 border-slate-200'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <RefreshCw className={`w-4 h-4 ${isSyncingData ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">☁️ Đồng bộ hóa</div>
                        <div className="text-[10px] text-emerald-500 truncate">
                          {isSyncingData ? 'Đang đồng bộ...' : 'Lưu lên đám mây'}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Smart Scientific Math Calculator Modal */}
      <SmartCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        isLight={isLight}
      />

      {/* Music Player & Upload Widget */}
      <MusicPlayerWidget
        isOpen={isMusicModalOpen}
        onClose={() => setIsMusicModalOpen(false)}
      />

      {/* Dynamic Background Customizer Modal */}
      <BackgroundCustomizerModal
        isOpen={isBgModalOpen}
        onClose={() => setIsBgModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <MathVerseProvider>
      <MainAppContent />
    </MathVerseProvider>
  );
}
