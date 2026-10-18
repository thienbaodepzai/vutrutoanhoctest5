import React, { useState, useEffect } from 'react';
import { useMathVerse } from '../context/MathVerseContext';
import {
  useAdminStore,
  postAdminAnnouncement,
  removeAdminAnnouncement,
  banUserPermanently,
  unbanUserAccount,
  adminDeleteSurveyById,
  setPreviewAsStudentMode,
  ROOT_ADMIN_EMAIL,
} from '../utils/adminUtils';
import { useUserFeedbackStats } from '../utils/userSurvey';
import { fetchRealLeaderboardData, LeaderboardEntry } from '../utils/supabaseDb';
import { soundManager } from '../utils/soundEffects';
import {
  ShieldCheck,
  ShieldAlert,
  Megaphone,
  Ban,
  Trash2,
  Crown,
  CheckCircle2,
  AlertTriangle,
  Send,
  Unlock,
  MessageSquare,
  Star,
  Eye,
  Lock,
  UserCheck,
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const { user, isAdmin, updateUserEmail, logout, theme } = useMathVerse();
  const { store, previewAsStudent } = useAdminStore();
  const surveyStats = useUserFeedbackStats();
  const isLight = theme === 'light';

  // Form: Post Announcement to Home Page
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annType, setAnnType] = useState<'info' | 'important' | 'event'>('important');
  const [annFeedback, setAnnFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Form: Permanently Ban User
  const [banUsername, setBanUsername] = useState('');
  const [banUserId, setBanUserId] = useState('');
  const [banReason, setBanReason] = useState('Vi phạm quy định cộng đồng MathVerse');
  const [banFeedback, setBanFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Leaderboard members list for quick 1-click Ban
  const [members, setMembers] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetchRealLeaderboardData()
      .then(({ data }) => {
        if (data?.entries) {
          setMembers(data.entries);
        }
      })
      .catch(() => {});
  }, [store.bannedUsers.length]);

  if (!user) return null;

  // If the owner enabled "Preview as Student" mode, show a banner to switch back to Admin
  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div
          className={`p-8 rounded-3xl border text-center space-y-5 shadow-xl ${
            isLight
              ? 'bg-white border-rose-200 text-slate-800'
              : 'bg-slate-900 border-rose-500/30 text-white'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold">Khu vực dành riêng cho Ban Quản Trị (Admin)</h2>
          <p className={`text-sm max-w-lg mx-auto ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Chỉ duy nhất <strong>Chủ sở hữu</strong> mới có quyền Admin để truy cập trang quản trị, ban vĩnh viễn tài khoản, gửi thông báo lên trang chủ và xóa báo cáo khảo sát.
          </p>

          {previewAsStudent && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClickSound();
                  setPreviewAsStudentMode(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold shadow-lg cursor-pointer"
              >
                👑 Quay lại quyền Admin (Chủ sở hữu)
              </button>
            </div>
          )}

          {!previewAsStudent && (
            <div
              className={`p-4 rounded-2xl border max-w-md mx-auto text-left space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="text-xs font-bold text-center text-rose-500 flex items-center justify-center gap-1.5">
                <Lock className="w-4 h-4" />
                <span>Khu vực bảo mật dành riêng cho Quản trị viên</span>
              </div>
              <p className={`text-xs text-center leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Chỉ tài khoản Quản trị viên chính thức đã đăng nhập bằng chính xác Email và Mật khẩu của Quản trị viên mới có quyền truy cập. Tài khoản khách không thể vào khu vực này.
              </p>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClickSound();
                  logout();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors text-center"
              >
                Đăng nhập tài khoản Quản trị viên
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnFeedback(null);
    const res = await postAdminAnnouncement({
      title: annTitle,
      content: annContent,
      type: annType,
      authorName: 'Ban Quản Trị (Admin)',
    });
    if (!res.ok) {
      soundManager.playWrongSound();
      setAnnFeedback({ type: 'err', text: res.error || 'Không thể đăng thông báo.' });
      return;
    }
    soundManager.playCorrectSound();
    setAnnTitle('');
    setAnnContent('');
    setAnnFeedback({
      type: 'ok',
      text: 'Đã gửi thông báo lên Trang chủ thành công! Tất cả học sinh đều sẽ nhìn thấy.',
    });
  };

  const handleBanUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanFeedback(null);
    if (!banUsername.trim() && !banUserId.trim()) {
      soundManager.playWrongSound();
      setBanFeedback({
        type: 'err',
        text: 'Vui lòng nhập Tên người dùng cần ban vĩnh viễn.',
      });
      return;
    }
    if (banUsername.trim().toLowerCase() === user.name.trim().toLowerCase()) {
      soundManager.playWrongSound();
      setBanFeedback({
        type: 'err',
        text: 'Không thể tự ban chính mình!',
      });
      return;
    }

    const res = await banUserPermanently({
      user_id: banUserId.trim() || undefined,
      username: banUsername.trim(),
      reason: banReason.trim() || 'Vi phạm quy định cộng đồng MathVerse',
      bannedBy: 'Admin',
    });

    if (!res.ok) {
      soundManager.playWrongSound();
      setBanFeedback({ type: 'err', text: res.error || 'Không thể ban người dùng.' });
      return;
    }

    soundManager.playCorrectSound();
    setBanFeedback({
      type: 'ok',
      text: `Đã Ban vĩnh viễn người dùng "${banUsername.trim()}" khỏi hệ thống!`,
    });
    setBanUsername('');
    setBanUserId('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in">
      {/* Header Banner */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-xl ${
          isLight
            ? 'bg-gradient-to-r from-amber-50 via-white to-rose-50 border-amber-300/80 text-slate-900'
            : 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-rose-950/50 border-amber-500/40 text-white'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm">
                <Crown className="w-3.5 h-3.5" />
                <span>CHỦ SỞ HỮU • ADMIN ĐỘC QUYỀN</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Đã xác thực danh tính Admin an toàn</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              🛡️ Trung tâm Quản trị Hệ thống MathVerse (Admin Panel)
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Chào mừng Admin <strong>{user.name}</strong>. Quyền Admin được bảo mật độc quyền dành riêng cho bạn: <strong>Gửi thông báo lên Trang chủ</strong>, <strong>Ban vĩnh viễn người vi phạm</strong> và <strong>Xóa báo cáo khảo sát</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                setPreviewAsStudentMode(true);
              }}
              className={`px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
              title="Thử đóng vai học sinh thường để kiểm tra việc khóa các nút xóa/ban"
            >
              <Eye className="w-4 h-4 text-cyan-500" />
              <span>Xem thử giao diện Học sinh thường</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: 1. Gửi thông báo Trang chủ & 2. Quyền quản trị độc quyền */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: GỬI THÔNG BÁO LÊN TRANG CHỦ */}
        <div
          className={`p-6 rounded-3xl border space-y-5 shadow-lg ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                <span>1. Gửi thông báo lên Trang chủ</span>
              </h2>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Thông báo của Admin sẽ hiển thị nổi bật ngay đầu Trang chủ để tất cả mọi người đều biết.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
              {store.announcements.length} thông báo
            </span>
          </div>

          <form onSubmit={handlePostAnnouncement} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold mb-1">Tiêu đề thông báo *</label>
              <input
                type="text"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="VD: 🔥 Thông báo lịch thi đua top tuần này..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Mức độ thông báo</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'important', label: '🚨 Quan trọng' },
                  { id: 'event', label: '🎉 Sự kiện mới' },
                  { id: 'info', label: '📢 Thông tin chung' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAnnType(t.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      annType === t.id
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-600'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Nội dung chi tiết *</label>
              <textarea
                rows={3}
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                placeholder="Nhập nội dung thông báo gửi đến toàn thể học sinh trên trang chủ..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>

            {annFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  annFeedback.type === 'ok'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                }`}
              >
                {annFeedback.type === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{annFeedback.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Đăng thông báo lên Trang chủ ngay</span>
            </button>
          </form>

          {/* Danh sách thông báo đang hiển thị trên Trang chủ */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Thông báo đang ghim trên Trang chủ ({store.announcements.length})
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {store.announcements.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-3 rounded-2xl border flex items-start justify-between gap-3 text-xs ${
                    isLight
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-bold truncate">{ann.title}</div>
                    <p className={`text-[11px] line-clamp-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {ann.content}
                    </p>
                    <div className="text-[10px] text-slate-400">
                      Đăng bởi: {ann.authorName} • {new Date(ann.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClickSound();
                      removeAdminAnnouncement(ann.id);
                    }}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 shrink-0 cursor-pointer"
                    title="Gỡ thông báo này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 2: QUYỀN ADMIN ĐỘC QUYỀN (CHỈ MÌNH BẠN) */}
        <div
          className={`p-6 rounded-3xl border space-y-5 shadow-lg flex flex-col justify-between ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold flex items-center gap-2 text-indigo-500">
                <UserCheck className="w-5 h-5" />
                <span>2. Quyền Quản trị Độc quyền</span>
              </h2>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                Chỉ 1 Admin duy nhất
              </span>
            </div>

            <div
              className={`p-5 rounded-2xl border space-y-3 ${
                isLight ? 'bg-indigo-50/60 border-indigo-200' : 'bg-indigo-950/30 border-indigo-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                  👑
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-indigo-400">
                    Chủ sở hữu hệ thống (Bạn)
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Quyền Admin cao nhất • Toàn quyền kiểm soát và vận hành MathVerse
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-200 dark:border-indigo-500/30 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-500 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Chỉ mình bạn mới được phép làm Admin (xác thực danh tính bảo mật).</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-500 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Không cho phép cấp quyền Admin cho bất kỳ ai khác.</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-500 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Tuyệt đối bảo mật thông tin, không hiển thị email ra ngoài giao diện.</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="font-bold text-slate-300">🛡️ Cơ chế bảo vệ Admin:</div>
            <p>
              Tài khoản Admin của bạn được bảo vệ miễn nhiễm với mọi lệnh Ban, không ai có thể can thiệp hay thay đổi vai trò quản trị của bạn.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: BAN VĨNH VIỄN NGƯỜI DÙNG (PERMANENT BAN) */}
      <div
        className={`p-6 rounded-3xl border space-y-5 shadow-lg ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold flex items-center gap-2 text-rose-500">
              <Ban className="w-5 h-5" />
              <span>3. Ban vĩnh viễn người khác (Khóa tài khoản & loại khỏi Bảng xếp hạng)</span>
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Chỉ Admin mới có quyền Ban vĩnh viễn. Người bị ban sẽ bị chặn truy cập và ẩn hoàn toàn khỏi Bảng xếp hạng.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 self-start sm:self-auto">
            Đang bị Ban vĩnh viễn: {store.bannedUsers.length} người
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form nhập Ban vĩnh viễn */}
          <form onSubmit={handleBanUser} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold mb-1">Tên người dùng cần Ban *</label>
              <input
                type="text"
                value={banUsername}
                onChange={(e) => setBanUsername(e.target.value)}
                placeholder="Nhập tên hiển thị..."
                className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Lý do Ban vĩnh viễn</label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="VD: Gian lận điểm số / Vi phạm nội quy cộng đồng..."
                className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>

            {banFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  banFeedback.type === 'ok'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                }`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{banFeedback.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Ban className="w-4 h-4" />
              <span>Thực thi Ban Vĩnh Viễn</span>
            </button>

            {/* Quick pick from active leaderboard members */}
            {members.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="text-[11px] font-bold text-slate-400">
                  Hoặc chọn nhanh thành viên trên Bảng xếp hạng để Ban vĩnh viễn:
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {members
                    .filter((m) => m.display_name.toLowerCase() !== user.name.toLowerCase())
                    .map((m) => (
                      <div
                        key={m.user_id}
                        className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                          isLight
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="truncate font-semibold">
                          #{m.rank} {m.display_name} (Lớp {m.grade} • {m.score} XP)
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            soundManager.playClickSound();
                            await banUserPermanently({
                              user_id: m.user_id,
                              username: m.display_name,
                              reason: banReason || 'Vi phạm quy định cộng đồng MathVerse',
                              bannedBy: 'Admin',
                            });
                            setBanFeedback({
                              type: 'ok',
                              text: `Đã Ban vĩnh viễn "${m.display_name}"!`,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Ban vĩnh viễn</span>
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </form>

          {/* Danh sách tài khoản đang bị Ban vĩnh viễn */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Danh sách người dùng đã bị Ban vĩnh viễn ({store.bannedUsers.length})
            </div>
            {store.bannedUsers.length === 0 ? (
              <div
                className={`p-6 rounded-2xl border text-center text-xs ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                Hiện chưa có tài khoản nào bị Ban vĩnh viễn.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {store.bannedUsers.map((b) => (
                  <div
                    key={b.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                      isLight
                        ? 'bg-rose-50/60 border-rose-200'
                        : 'bg-rose-950/20 border-rose-500/30'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-rose-500 flex items-center gap-1.5 truncate">
                        <Ban className="w-3.5 h-3.5 shrink-0" />
                        <span>{b.username}</span>
                      </div>
                      <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Lý do: {b.reason}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Thời gian: {new Date(b.bannedAt).toLocaleString('vi-VN')}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClickSound();
                        unbanUserAccount({ id: b.id, user_id: b.user_id, username: b.username });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Gỡ Ban</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: QUẢN LÝ & XÓA BÁO CÁO KHẢO SÁT (CHỈ ADMIN) */}
      <div
        className={`p-6 rounded-3xl border space-y-4 shadow-lg ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-500" />
              <span>4. Quản lý & Xóa Báo cáo khảo sát ({surveyStats.records.length} phiếu)</span>
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Chỉ có Admin mới có quyền xóa các phiếu báo cáo khảo sát của học sinh.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
          {surveyStats.records.map((sv) => (
            <div
              key={sv.id}
              className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 text-xs ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="font-bold flex items-center gap-2">
                  <span>{sv.userName || 'Học sinh'}</span>
                  <span className="text-amber-500 flex items-center gap-0.5 font-mono">
                    {Math.round((sv.easeOfUseRating + sv.helpfulnessRating) / 2)}
                    <Star className="w-3 h-3 fill-amber-400" />
                  </span>
                </div>
                <p className={`text-[11px] line-clamp-2 italic ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  "{sv.feedbackText || sv.favoriteFeature}"
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClickSound();
                  adminDeleteSurveyById(sv.id);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                title="Xóa báo cáo khảo sát này"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
