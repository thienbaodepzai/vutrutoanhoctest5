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
import { DailyLuckyWheelModal } from './components/DailyLuckyWheelModal';
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

  const navItems = [
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
    { id: 'achievements', label: 'Thành tích', icon: Award },
    { id: 'analytics', label: 'Tiến độ', icon: BarChart3 },
    { id: 'admin', label: '🛡️ Quản trị Admin', icon: ShieldCheck },
  ];

  return (
    <div
      className={`min-h-screen ${
        isLight
          ? 'theme-light bg-gradient-to-br from-slate-50 via-sky-50/30 to-indigo-50/40 text-slate-800'
          : 'theme-dark bg-slate-950 text-slate-100'
      } flex flex-col relative selection:bg-indigo-500 selection:text-white transition-colors duration-300`}
    >
      {/* Background Cosmic Atmosphere & Mathematical Constellation Glyphs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {isLight ? (
          <>
            <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-300/20 rounded-full blur-[140px]" />
            <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-sky-300/25 rounded-full blur-[140px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-purple-200/20 rounded-full blur-[160px]" />
            {/* Luminous math symbols floating in light theme */}
            <span className="absolute top-20 left-12 text-indigo-500/20 text-4xl select-none font-mono font-bold animate-float-slow">π</span>
            <span className="absolute top-36 right-20 text-sky-600/20 text-5xl select-none font-mono font-bold animate-float-delayed">∑</span>
            <span className="absolute bottom-40 left-16 text-purple-600/20 text-5xl select-none font-mono font-bold animate-float-slow">√</span>
            <span className="absolute bottom-32 right-24 text-pink-500/20 text-4xl select-none font-mono font-bold animate-float-delayed">∞</span>
            <span className="absolute top-1/2 right-12 text-amber-500/20 text-3xl select-none font-mono font-bold animate-float-slow">Δ</span>
            <span className="absolute top-2/3 left-1/3 text-cyan-600/20 text-4xl select-none font-mono font-bold animate-float-delayed">∫</span>
            <span className="absolute top-1/3 left-1/4 text-indigo-400/15 text-2xl select-none font-mono font-bold">f(x)</span>
          </>
        ) : (
          <>
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px]" />
            <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[140px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px]" />
            {/* Luminous glowing math symbols in cosmic dark theme */}
            <span className="absolute top-20 left-12 text-cyan-400/25 text-4xl select-none font-mono font-bold animate-float-slow filter drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">π</span>
            <span className="absolute top-36 right-20 text-indigo-400/25 text-5xl select-none font-mono font-bold animate-float-delayed filter drop-shadow-[0_0_8px_rgba(129,140,248,0.3)]">∑</span>
            <span className="absolute bottom-40 left-16 text-purple-400/25 text-5xl select-none font-mono font-bold animate-float-slow filter drop-shadow-[0_0_8px_rgba(192,132,252,0.3)]">√</span>
            <span className="absolute bottom-32 right-24 text-pink-400/25 text-4xl select-none font-mono font-bold animate-float-delayed filter drop-shadow-[0_0_8px_rgba(244,114,182,0.3)]">∞</span>
            <span className="absolute top-1/2 right-12 text-amber-400/25 text-3xl select-none font-mono font-bold animate-float-slow filter drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">Δ</span>
            <span className="absolute top-2/3 left-1/3 text-emerald-400/20 text-4xl select-none font-mono font-bold animate-float-delayed">∫</span>
            <span className="absolute top-1/3 left-1/4 text-cyan-300/20 text-2xl select-none font-mono font-bold">f(x)</span>
          </>
        )}
      </div>

      {/* Top Navbar */}
      <Navbar />

      {/* Secondary Quick Nav Bar (Desktop & Tablet) */}
      <div
        className={`relative z-10 border-b ${
          isLight ? 'border-slate-200/80 bg-white/80 shadow-xs' : 'border-slate-800/80 bg-slate-900/40'
        } backdrop-blur-md hidden sm:block`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    soundManager.playClickSound();
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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
          </nav>
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

      {/* Floating Background Study Music Player */}
      <MusicPlayerWidget />

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
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                soundManager.playClickSound();
              }}
              className={`flex flex-col items-center p-1.5 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
                isActive
                  ? isLight
                    ? 'text-indigo-600 font-bold'
                    : 'text-cyan-400 font-bold'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
        {/* More button to toggle mathbot */}
        <button
          onClick={() => {
            setActiveTab('mathbot');
            soundManager.playClickSound();
          }}
          className={`flex flex-col items-center p-1.5 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'mathbot' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-5 h-5 mb-0.5 text-indigo-400" />
          <span>MathBot</span>
        </button>
      </div>
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
