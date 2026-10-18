import React, { useState, useEffect, useCallback } from 'react';
import { useMathVerse } from '../context/MathVerseContext';
import {
  fetchRealLeaderboardData,
  LeaderboardEntry,
  LeaderboardStats,
} from '../utils/supabaseDb';
import {
  Trophy,
  Users,
  CheckCircle2,
  Award,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Clock,
  BookOpen,
  PenTool,
  ShieldCheck,
  TrendingUp,
  Eye,
  Search,
  Ban,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';
import { UserAvatar } from './UserAvatar';
import { banUserPermanently, useAdminStore } from '../utils/adminUtils';

export const LeaderboardView: React.FC = () => {
  const { user, supabaseUserId, setActiveTab, setViewingPublicProfile, theme, isAdmin } = useMathVerse();
  const { store: adminStore } = useAdminStore();
  const isLight = theme === 'light';

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<'all' | 6 | 7 | 8 | 9>('all');
  const [searchUserQuery, setSearchUserQuery] = useState<string>('');

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await fetchRealLeaderboardData();
      if (fetchErr || !data) {
        setError('Không thể tải dữ liệu');
        setStats(null);
        setEntries([]);
      } else {
        setStats(data.stats);
        setEntries(data.entries);
        setLastFetchedAt(data.fetchedAt);
      }
    } catch {
      setError('Không thể tải dữ liệu');
      setStats(null);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [
    loadLeaderboard,
    user?.xp,
    user?.completedLessons?.length,
    user?.answeredQuestionsCount,
    adminStore.bannedUsers.length,
  ]);

  const filteredEntries = React.useMemo(() => {
    const byGrade =
      gradeFilter === 'all'
        ? entries
        : entries.filter((e) => Number(e.grade) === gradeFilter);

    // Re-rank within the active grade filter while preserving strict tie-breaker sorting
    const ranked = byGrade
      .slice()
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const accA = a.accuracy_rate ?? -1;
        const accB = b.accuracy_rate ?? -1;
        if (accB !== accA) return accB - accA;
        if (b.correct_count !== a.correct_count) return b.correct_count - a.correct_count;
        if (b.completed_lessons !== a.completed_lessons) return b.completed_lessons - a.completed_lessons;
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      })
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));

    if (!searchUserQuery.trim()) return ranked;
    const q = searchUserQuery.trim().toLowerCase();
    return ranked.filter((item) => item.display_name.toLowerCase().includes(q));
  }, [entries, gradeFilter, searchUserQuery]);

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white font-black text-sm shadow-md shadow-amber-500/30">
          🥇
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-slate-300 to-slate-500 text-white font-black text-sm shadow-md">
          🥈
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 text-white font-black text-sm shadow-md">
          🥉
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-mono font-bold text-xs border ${
          isLight
            ? 'bg-slate-100 border-slate-200 text-slate-700'
            : 'bg-slate-800/80 border-slate-700 text-slate-300'
        }`}
      >
        #{rank}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in">
      {/* Header Banner */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-xl transition-all ${
          isLight
            ? 'bg-gradient-to-r from-amber-50/90 via-white to-indigo-50/90 border-amber-200/80 shadow-amber-100/40'
            : 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/60 border-amber-500/30 shadow-indigo-950/40'
        }`}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isLight
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dữ liệu thực tế 100% • Xác thực từ cơ sở dữ liệu</span>
            </div>
            <h1
              className={`text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2.5 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              <span>🏆 Bảng xếp hạng</span>
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Vinh danh những nhà thám hiểm Toán học xuất sắc dựa trên kết quả làm bài thực tế. Sắp xếp theo tổng điểm XP; nếu bằng điểm sẽ xét tỷ lệ trả lời đúng và số câu hoàn thành.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto shrink-0">
            {user && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playClickSound();
                  const wrongCount = Math.max(0, user.answeredQuestionsCount - user.correctAnswersCount);
                  const acc =
                    user.answeredQuestionsCount > 0
                      ? Math.round((user.correctAnswersCount / user.answeredQuestionsCount) * 100)
                      : user.completedLessons.length > 0
                      ? 100
                      : null;
                  setViewingPublicProfile({
                    user_id: supabaseUserId || (user as any)?.id || user.name || 'me',
                    display_name: user.name,
                    avatar: user.avatar,
                    grade: user.grade,
                    score: user.xp,
                    completed_lessons: user.completedLessons.length,
                    questions_answered: user.answeredQuestionsCount,
                    correct_count: user.correctAnswersCount,
                    wrong_count: wrongCount,
                    accuracy_rate: acc,
                    updated_at: new Date().toISOString(),
                  });
                }}
                className={`px-3.5 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLight
                    ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                    : 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-500/30 text-indigo-300'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Xem hồ sơ công khai của tôi</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                loadLeaderboard();
              }}
              disabled={loading}
              className={`px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                isLight
                  ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-cyan-300'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Đang tải...' : 'Làm mới dữ liệu'}</span>
            </button>
          </div>
        </div>

        {/* SECTION: THỐNG KÊ SỐ NGƯỜI THAM GIA THỰC TẾ */}
        <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <h2
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-500" />
              <span>Thống kê số người tham gia thực tế</span>
            </h2>
            {lastFetchedAt && !error && (
              <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Cập nhật lúc: {formatDateTime(lastFetchedAt)}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border animate-pulse h-24 ${
                    isLight ? 'bg-white/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                  }`}
                />
              ))}
            </div>
          ) : error ? (
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-semibold ${
                isLight
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>Không thể tải dữ liệu thống kê người tham gia do lỗi kết nối máy chủ.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Tổng số người học thực tế */}
              <div
                className={`p-4 rounded-2xl border transition-colors ${
                  isLight ? 'bg-white/95 border-slate-200 shadow-xs' : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className={`flex items-center justify-between text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>Tổng số người học thực tế</span>
                  <Users className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`} />
                </div>
                <div className={`text-2xl font-extrabold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {stats?.totalParticipants ?? 0} người
                </div>
                <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Tính theo tài khoản định danh duy nhất
                </div>
              </div>

              {/* Card 2: Số người đã làm bài */}
              <div
                className={`p-4 rounded-2xl border transition-colors ${
                  isLight ? 'bg-white/95 border-slate-200 shadow-xs' : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className={`flex items-center justify-between text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>Số người đã làm bài</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  {stats?.activeLearnersCount ?? 0} người
                </div>
                <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Đã có bài học hoặc câu hỏi được lưu
                </div>
              </div>

              {/* Card 3: Số người có kết quả hợp lệ trên BXH */}
              <div
                className={`p-4 rounded-2xl border transition-colors ${
                  isLight ? 'bg-white/95 border-slate-200 shadow-xs' : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className={`flex items-center justify-between text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>Số người có kết quả hợp lệ</span>
                  <Trophy className="w-4 h-4 text-amber-500" />
                </div>
                <div className={`text-2xl font-extrabold font-mono ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                  {stats?.validRankedUsersCount ?? 0} người
                </div>
                <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Đủ điều kiện ghi danh bảng xếp hạng
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar by Grade */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          className={`inline-flex p-1 rounded-2xl border overflow-x-auto ${
            isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800'
          }`}
        >
          {(['all', 6, 7, 8, 9] as const).map((g) => {
            const isActive = gradeFilter === g;
            return (
              <button
                key={String(g)}
                type="button"
                onClick={() => {
                  soundManager.playClickSound();
                  setGradeFilter(g);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {g === 'all' ? 'Tất cả khối lớp' : `Khối Lớp ${g}`}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              placeholder="Tìm tên thành viên (xem hồ sơ LQDOJ)..."
              className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-800 focus:ring-indigo-500'
                  : 'bg-slate-900 border-slate-800 text-white focus:ring-cyan-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* MAIN LEADERBOARD CONTENT: LOADING / ERROR / EMPTY / TABLE */}
      {loading ? (
        <div
          className={`p-12 rounded-3xl border text-center space-y-3 ${
            isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-500" />
          <div className="text-base font-bold">Đang tải dữ liệu bảng xếp hạng...</div>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Hệ thống đang đồng bộ kết quả thực tế từ cơ sở dữ liệu.
          </p>
        </div>
      ) : error ? (
        <div
          className={`p-10 rounded-3xl border text-center space-y-4 ${
            isLight
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold">{error}</h3>
            <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-rose-700' : 'text-rose-300/80'}`}>
              Hệ thống chưa thể xác minh dữ liệu bảng xếp hạng tại thời điểm này. Vui lòng kiểm tra kết nối mạng và thử lại.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.playClickSound();
              loadLeaderboard();
            }}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử lại</span>
          </button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div
          className={`p-10 sm:p-12 rounded-3xl border text-center space-y-4 ${
            isLight
              ? 'bg-white border-slate-200 text-slate-800 shadow-xs'
              : 'bg-slate-900 border-slate-800 text-white'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-3xl border flex items-center justify-center mx-auto text-3xl ${
              isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/30'
            }`}
          >
            🏆
          </div>
          <div className="space-y-1.5">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              Chưa có dữ liệu xếp hạng
            </span>
            <h3 className={`text-lg sm:text-xl font-extrabold pt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Chưa có người tham gia. Hãy là người đầu tiên chinh phục thử thách!
            </h3>
            <p className={`text-xs sm:text-sm max-w-md mx-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Hoàn thành các bài học SGK hoặc trả lời câu hỏi trong mục Luyện tập và Trắc nghiệm để ghi danh lên bảng xếp hạng thực tế.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                setActiveTab('lessons');
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Bắt đầu Học bài ngay</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                setActiveTab('practice');
              }}
              className={`px-5 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>Làm bài Luyện tập</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`rounded-3xl border overflow-hidden shadow-xl transition-colors ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          {/* Desktop Table Header */}
          <div
            className={`hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 text-xs font-bold uppercase tracking-wider border-b ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-500'
                : 'bg-slate-950/70 border-slate-800 text-slate-400'
            }`}
          >
            <div className="col-span-1 text-center">Hạng</div>
            <div className="col-span-4">Người học</div>
            <div className="col-span-2 text-right">Điểm số</div>
            <div className="col-span-2 text-center">Bài & Câu hoàn thành</div>
            <div className="col-span-1 text-center">Tỷ lệ đúng</div>
            <div className="col-span-2 text-right">Cập nhật gần nhất</div>
          </div>

          {/* Rows */}
          <div className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/80'}`}>
            {filteredEntries.map((entry) => {
              const isCurrentUser =
                Boolean(supabaseUserId && entry.user_id === supabaseUserId) ||
                Boolean(!supabaseUserId && user?.name && entry.display_name === user.name);

              return (
                <div
                  key={entry.user_id}
                  onClick={() => {
                    soundManager.playClickSound();
                    setViewingPublicProfile(entry);
                  }}
                  title={`Nhấn để xem trang cá nhân công khai của ${entry.display_name} (Chế độ chỉ xem)`}
                  className={`p-4 sm:px-6 sm:py-4 transition-colors cursor-pointer group ${
                    isCurrentUser
                      ? isLight
                        ? 'bg-indigo-50/70 hover:bg-indigo-100/70'
                        : 'bg-indigo-950/35 hover:bg-indigo-950/55'
                      : isLight
                      ? 'hover:bg-slate-50/90'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center">
                    {/* Rank + User (Mobile combined top row, Desktop split) */}
                    <div className="md:col-span-1 flex items-center justify-between md:justify-center">
                      <div className="flex items-center gap-3 md:justify-center">
                        {renderRankBadge(entry.rank)}
                        {/* Mobile-only user info */}
                        <div className="flex items-center gap-2.5 md:hidden">
                          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800">
                            <UserAvatar avatar={entry.avatar} alt={entry.display_name} sizeClass="w-9 h-9" textClass="text-2xl" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`font-bold text-sm group-hover:text-indigo-600 dark:group-hover:text-cyan-300 group-hover:underline ${
                                  isLight ? 'text-slate-900' : 'text-white'
                                }`}
                              >
                                {entry.display_name}
                              </span>
                              {isCurrentUser && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[11px] font-semibold flex items-center gap-1 ${
                                isLight ? 'text-slate-500' : 'text-slate-400'
                              }`}
                            >
                              <span>Toán Lớp {entry.grade}</span>
                              <span>•</span>
                              <span className="text-indigo-500 dark:text-cyan-400 inline-flex items-center gap-0.5">
                                <Eye className="w-3 h-3" /> Xem hồ sơ
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Mobile-only score */}
                      <div className="md:hidden text-right">
                        <div
                          className={`text-base font-extrabold font-mono ${
                            isLight ? 'text-amber-600' : 'text-amber-400'
                          }`}
                        >
                          {entry.score.toLocaleString('vi-VN')} XP
                        </div>
                        <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {entry.accuracy_rate !== null ? `Đúng ${entry.accuracy_rate}%` : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Learner Info */}
                    <div className="hidden md:flex md:col-span-4 items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl border flex items-center justify-center text-xl shrink-0 overflow-hidden ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <UserAvatar avatar={entry.avatar} alt={entry.display_name} sizeClass="w-10 h-10" textClass="text-xl" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm truncate group-hover:text-indigo-600 dark:group-hover:text-cyan-300 group-hover:underline ${
                              isLight ? 'text-slate-900' : 'text-white'
                            }`}
                          >
                            {entry.display_name}
                          </span>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shrink-0">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className={`text-xs flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          <span>Khối Lớp {entry.grade}</span>
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-cyan-400 inline-flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                            <Eye className="w-3 h-3" /> Xem hồ sơ
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Score */}
                    <div className="hidden md:block md:col-span-2 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-extrabold text-sm ${
                          isLight ? 'text-amber-600' : 'text-amber-400'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{entry.score.toLocaleString('vi-VN')} XP</span>
                      </span>
                    </div>

                    {/* Completed Lessons & Questions */}
                    <div className="md:col-span-2 flex md:flex-col items-center justify-between md:justify-center text-xs">
                      <span className={`md:hidden ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        Hoàn thành:
                      </span>
                      <div className="text-right md:text-center">
                        <div className={`font-bold font-mono ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          {entry.completed_lessons} bài • {entry.questions_answered} câu
                        </div>
                        <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Đúng {entry.correct_count} câu
                        </div>
                      </div>
                    </div>

                    {/* Accuracy Rate */}
                    <div className="hidden md:flex md:col-span-1 flex-col items-center justify-center">
                      {entry.accuracy_rate !== null ? (
                        <>
                          <span
                            className={`font-mono font-bold text-xs ${
                              entry.accuracy_rate >= 80
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : entry.accuracy_rate >= 50
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {entry.accuracy_rate}%
                          </span>
                          <div
                            className={`w-14 h-1.5 rounded-full mt-1 overflow-hidden ${
                              isLight ? 'bg-slate-200' : 'bg-slate-800'
                            }`}
                          >
                            <div
                              className={`h-full rounded-full ${
                                entry.accuracy_rate >= 80
                                  ? 'bg-emerald-500'
                                  : entry.accuracy_rate >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${entry.accuracy_rate}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>

                    {/* Last Updated Timestamp & Admin Permanent Ban */}
                    <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="md:hidden">Cập nhật gần nhất:</span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{formatDateTime(entry.updated_at)}</span>
                        </span>
                        {isAdmin && !isCurrentUser && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              soundManager.playClickSound();
                              await banUserPermanently({
                                user_id: entry.user_id,
                                username: entry.display_name,
                                reason: 'Bị Admin ban vĩnh viễn khỏi Bảng xếp hạng',
                                bannedBy: `${user?.name || 'Admin'} (Admin)`,
                              });
                              loadLeaderboard();
                            }}
                            title={`Ban vĩnh viễn ${entry.display_name} (Chỉ Admin)`}
                            className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold inline-flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Ban vĩnh viễn</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
