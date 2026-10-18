import React, { useEffect, useState } from 'react';
import { LeaderboardEntry, fetchUserLearningResults, LearningResultRecord } from '../utils/supabaseDb';
import { getUserLevel, BADGES_DATA } from '../data/badgesData';
import { UserAvatar } from './UserAvatar';
import { isMediaAvatar, downloadMediaToDevice } from '../utils/mediaUtils';
import {
  X,
  Trophy,
  Award,
  CheckCircle2,
  XCircle,
  BookOpen,
  Target,
  Clock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Eye,
  Lock,
  Download,
  Activity,
  BarChart3,
  Layers,
  Ban,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';
import { banUserPermanently } from '../utils/adminUtils';
import { useMathVerse } from '../context/MathVerseContext';

export interface PublicProfileUser {
  user_id: string;
  display_name: string;
  avatar: string;
  grade: number;
  score: number;
  rank?: number;
  completed_lessons: number;
  in_progress_lessons?: number;
  questions_answered: number;
  correct_count: number;
  wrong_count: number;
  accuracy_rate: number | null;
  updated_at?: string;
}

interface PublicUserProfileModalProps {
  profile: PublicProfileUser | null;
  isOwnProfile?: boolean;
  isLight?: boolean;
  onClose: () => void;
  onEditOwnProfile?: () => void;
}

/**
 * Hệ thống phân hạng màu sắc lấy cảm hứng từ LQDOJ (Lê Quý Đôn Online Judge)
 */
function getLqdojRankTier(xp: number) {
  if (xp >= 2500) {
    return {
      title: 'Đại Kiện Tướng Toán Học (Grandmaster)',
      short: 'GM',
      textColor: 'text-rose-500 dark:text-rose-400',
      badgeBg: 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-300',
      barColor: 'from-rose-500 via-red-500 to-amber-500',
    };
  }
  if (xp >= 1200) {
    return {
      title: 'Kiện Tướng Vũ Trụ (Master)',
      short: 'Master',
      textColor: 'text-amber-500 dark:text-amber-400',
      badgeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300',
      barColor: 'from-amber-500 to-yellow-400',
    };
  }
  if (xp >= 600) {
    return {
      title: 'Chuyên Gia Giải Toán (Expert)',
      short: 'Expert',
      textColor: 'text-purple-600 dark:text-purple-400',
      badgeBg: 'bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300',
      barColor: 'from-purple-500 to-indigo-500',
    };
  }
  if (xp >= 250) {
    return {
      title: 'Chiến Binh Tinh Anh (Specialist)',
      short: 'Specialist',
      textColor: 'text-cyan-600 dark:text-cyan-400',
      badgeBg: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300',
      barColor: 'from-cyan-500 to-blue-500',
    };
  }
  return {
    title: 'Tân Binh Khám Phá (Newbie)',
    short: 'Newbie',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
    barColor: 'from-emerald-500 to-teal-400',
  };
}

export const PublicUserProfileModal: React.FC<PublicUserProfileModalProps> = ({
  profile,
  isOwnProfile = false,
  isLight = false,
  onClose,
  onEditOwnProfile,
}) => {
  const { isAdmin, user } = useMathVerse();
  const [recentSubmissions, setRecentSubmissions] = useState<LearningResultRecord[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'submissions' | 'badges'>('overview');

  useEffect(() => {
    if (!profile?.user_id) return;
    let mounted = true;
    setLoadingSubmissions(true);
    fetchUserLearningResults(profile.user_id)
      .then(({ data }) => {
        if (mounted && Array.isArray(data)) {
          setRecentSubmissions(data.slice(0, 15));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingSubmissions(false);
      });
    return () => {
      mounted = false;
    };
  }, [profile?.user_id]);

  if (!profile) return null;

  const levelInfo = getUserLevel(profile.score);
  const lqdojTier = getLqdojRankTier(profile.score);

  const totalQ = Math.max(0, profile.questions_answered || profile.correct_count + profile.wrong_count);
  const acCount = Math.max(0, profile.correct_count);
  const waCount = Math.max(0, profile.wrong_count);
  const acPercent = totalQ > 0 ? Math.round((acCount / totalQ) * 100) : profile.accuracy_rate ?? 0;
  const waPercent = totalQ > 0 ? Math.max(0, 100 - acPercent) : 0;

  // Estimate unlocked badges based on public stats
  const unlockedBadges = BADGES_DATA.filter((b) => {
    if (b.id === 'first_step') return profile.completed_lessons >= 1 || totalQ >= 1;
    if (b.id === 'math_explorer') return profile.completed_lessons >= 3;
    if (b.id === 'sharpshooter') return acCount >= 10;
    if (b.id === 'xp_hunter') return profile.score >= 500;
    if (b.id === 'math_master') return profile.score >= 1000;
    return profile.score >= 300 && acCount >= 5;
  });

  const formatDate = (iso?: string) => {
    if (!iso) return 'Gần đây';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'Gần đây';
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'Gần đây';
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200 ${
        isLight ? 'bg-slate-950/50' : 'bg-slate-950/80'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden max-h-[92vh] flex flex-col transition-all card-top-accent ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-indigo-200/50'
            : 'bg-slate-900 border-slate-700/80 text-white shadow-black/60'
        }`}
      >
        {/* Top Banner Read-Only Notice (LQDOJ style) */}
        <div
          className={`px-5 py-2.5 border-b flex items-center justify-between gap-2 text-xs shrink-0 ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-600'
              : 'bg-slate-950/90 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                isLight
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Hồ sơ Thành viên (LQDOJ Style)</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] border ${
                isLight
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Chế độ Chỉ xem • Không được chỉnh sửa</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playClickSound();
              onClose();
            }}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isLight
                ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Đóng hồ sơ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
          {/* Profile Header Card */}
          <div
            className={`p-5 sm:p-6 rounded-2xl border relative overflow-hidden ${
              isLight
                ? 'bg-gradient-to-r from-indigo-50/70 via-white to-sky-50/70 border-slate-200/90'
                : 'bg-gradient-to-r from-indigo-950/50 via-slate-950/80 to-purple-950/40 border-slate-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                {/* Avatar Box */}
                <div className="relative group">
                  <div
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-2 flex items-center justify-center overflow-hidden shadow-lg ${
                      isLight
                        ? 'bg-white border-indigo-200 shadow-indigo-100'
                        : 'bg-slate-900 border-indigo-500/40 shadow-indigo-950/50'
                    }`}
                  >
                    <UserAvatar
                      avatar={profile.avatar}
                      alt={profile.display_name}
                      sizeClass="w-full h-full"
                      textClass="text-4xl sm:text-5xl"
                    />
                  </div>
                  {isMediaAvatar(profile.avatar) && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClickSound();
                        downloadMediaToDevice(
                          profile.avatar,
                          `avatar-${profile.display_name.replace(/\s+/g, '_')}`
                        );
                      }}
                      title="Tải ảnh/GIF/video đại diện này về máy"
                      className="mt-1.5 w-full py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-all"
                    >
                      <Download className="w-3 h-3" />
                      <span>Tải về máy</span>
                    </button>
                  )}
                </div>

                {/* User Identity & LQDOJ Rating Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border ${lqdojTier.badgeBg}`}>
                      {lqdojTier.short}
                    </span>
                    <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${lqdojTier.textColor}`}>
                      {profile.display_name}
                    </h2>
                    {isOwnProfile && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                        Hồ sơ của bạn
                      </span>
                    )}
                  </div>

                  <div className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    {lqdojTier.title} • {levelInfo.icon} {levelInfo.title} (Cấp {levelInfo.level})
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap text-xs">
                    <span
                      className={`px-2.5 py-1 rounded-xl border font-semibold ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-700'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      🎓 Khối Lớp {profile.grade}
                    </span>
                    {profile.rank && (
                      <span
                        className={`px-2.5 py-1 rounded-xl border font-bold ${
                          isLight
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        }`}
                      >
                        🏆 Hạng #{profile.rank} toàn hệ thống
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-1 rounded-xl border text-[11px] flex items-center gap-1 ${
                        isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-500'
                          : 'bg-slate-900/70 border-slate-800 text-slate-400'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>Hoạt động: {formatDate(profile.updated_at)}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Rating Box (LQDOJ Rating Score) */}
              <div
                className={`px-5 py-3.5 rounded-2xl border text-center shrink-0 ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Điểm Rating / XP
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-amber-500 mt-0.5 flex items-center justify-center gap-1">
                  <Sparkles className="w-5 h-5" />
                  <span>{profile.score.toLocaleString('vi-VN')}</span>
                </div>
                <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Điểm tích lũy xác thực
                </div>
              </div>
            </div>
          </div>

          {/* Sub-navigation Tabs (LQDOJ style: Tổng quan | Lịch sử nộp bài | Huy hiệu) */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                setActiveSubTab('overview');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeSubTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-800/70 text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Thống kê giải bài</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                setActiveSubTab('submissions');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeSubTab === 'submissions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-800/70 text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Hoạt động & Bài đã nộp ({recentSubmissions.length || profile.completed_lessons})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                setActiveSubTab('badges');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeSubTab === 'badges'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-800/70 text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Huy hiệu đạt được ({unlockedBadges.length})</span>
            </button>
          </div>

          {activeSubTab === 'overview' && (
            <div className="space-y-5">
              {/* 4 LQDOJ Problem-Solving Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  className={`p-4 rounded-2xl border ${
                    isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className={`text-[11px] font-semibold flex items-center justify-between ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span>Bài học hoàn thành</span>
                    <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
                  </div>
                  <div className="text-2xl font-extrabold font-mono mt-1 text-cyan-600 dark:text-cyan-400">
                    {profile.completed_lessons}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Chương trình Toán {profile.grade}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className={`text-[11px] font-semibold flex items-center justify-between ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span>Câu trả lời Đúng (AC)</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-extrabold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                    {acCount}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Accepted (Chính xác)
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className={`text-[11px] font-semibold flex items-center justify-between ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span>Câu trả lời Sai (WA)</span>
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="text-2xl font-extrabold font-mono mt-1 text-rose-600 dark:text-rose-400">
                    {waCount}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Wrong Answer
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className={`text-[11px] font-semibold flex items-center justify-between ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span>Tỷ lệ chính xác</span>
                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-extrabold font-mono mt-1 text-indigo-600 dark:text-indigo-400">
                    {acPercent}%
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Tổng {totalQ} lượt giải
                  </div>
                </div>
              </div>

              {/* LQDOJ Verdict Distribution Bar (AC vs WA) */}
              <div
                className={`p-5 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-slate-50/60 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>Biểu đồ Kết quả Chấm bài (Submission Verdicts)</span>
                  </span>
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                    AC: {acCount} ({acPercent}%) • WA: {waCount} ({waPercent}%)
                  </span>
                </div>

                <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800 p-0.5 gap-0.5">
                  {totalQ > 0 ? (
                    <>
                      {acPercent > 0 && (
                        <div
                          className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
                          style={{ width: `${acPercent}%` }}
                          title={`AC (Đúng): ${acCount} câu (${acPercent}%)`}
                        />
                      )}
                      {waPercent > 0 && (
                        <div
                          className="h-full bg-rose-500 rounded-r-full transition-all duration-500"
                          style={{ width: `${waPercent}%` }}
                          title={`WA (Sai): ${waCount} câu (${waPercent}%)`}
                        />
                      )}
                    </>
                  ) : (
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${profile.completed_lessons > 0 ? 100 : 0}%` }}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                      <span>AC (Accepted - Đúng)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                      <span>WA (Wrong Answer - Sai)</span>
                    </span>
                  </div>
                  <span>Chuẩn chấm điểm tự động MathVerse Judge</span>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'submissions' && (
            <div className="space-y-3">
              {loadingSubmissions ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Đang tải lịch sử bài nộp từ cơ sở dữ liệu...
                </div>
              ) : recentSubmissions.length === 0 ? (
                <div
                  className={`p-6 rounded-2xl border text-center space-y-2 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-sm font-bold">
                    Đã hoàn thành {profile.completed_lessons} bài học & {totalQ} câu hỏi
                  </div>
                  <p className="text-xs">
                    Chi tiết từng lần nộp bài được tổng hợp trực tiếp vào điểm số và tỷ lệ chính xác ở tab Thống kê.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {recentSubmissions.map((sub, i) => (
                    <div
                      key={sub.id || i}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        isLight
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold truncate">
                          {sub.lesson_title || sub.lesson_id}
                        </div>
                        <div className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Khối Lớp {sub.grade_level || profile.grade} • Chủ đề: {sub.topic || 'Toán THCS'} •{' '}
                          {formatDate(sub.completed_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          AC • {sub.score}đ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'badges' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {unlockedBadges.map((b) => (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                    isLight
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-slate-950/70 border-amber-500/30'
                  }`}
                >
                  <span className="text-3xl shrink-0">{b.icon}</span>
                  <div>
                    <div className="text-xs font-bold">{b.title}</div>
                    <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {b.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3.5 border-t flex items-center justify-between gap-3 shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Trang cá nhân công khai chỉ cho phép xem thông tin, bảo vệ toàn vẹn dữ liệu người học.</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && !isOwnProfile && (
              <button
                type="button"
                onClick={async () => {
                  soundManager.playClickSound();
                  await banUserPermanently({
                    user_id: profile.user_id,
                    username: profile.display_name,
                    reason: 'Bị Admin ban vĩnh viễn từ hồ sơ thành viên',
                    bannedBy: `${user?.name || 'Admin'} (Admin)`,
                  });
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                title="Chỉ Admin mới có quyền Ban vĩnh viễn người khác"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Ban vĩnh viễn (Admin)</span>
              </button>
            )}
            {isOwnProfile && onEditOwnProfile && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playClickSound();
                  onClose();
                  onEditOwnProfile();
                }}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
              >
                Vào Cài đặt của tôi
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
