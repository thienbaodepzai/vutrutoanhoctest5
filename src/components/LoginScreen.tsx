import React, { useState } from 'react';
import { Grade } from '../types/mathverse';
import { useMathVerse } from '../context/MathVerseContext';
import { Sparkles, Rocket, Sun, Moon, LogIn, UserPlus, KeyRound, Mail, Lock, User, CheckCircle2, Upload } from 'lucide-react';
import { soundManager } from '../utils/soundEffects';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { UserAvatar } from './UserAvatar';
import { readMediaFile, isMediaAvatar } from '../utils/mediaUtils';
import {
  checkDisplayNameAvailability,
  registerDisplayNameLocally,
} from '../utils/supabaseDb';
import { checkIsUserBanned, fetchAdminStoreFromServer, ROOT_ADMIN_EMAIL } from '../utils/adminUtils';

const AVATARS = [
  { icon: '👨‍🚀', label: 'Phi hành gia' },
  { icon: '👩‍🚀', label: 'Nhà thám hiểm' },
  { icon: '🦉', label: 'Cú thông thái' },
  { icon: '🤖', label: 'Robot MathBot' },
  { icon: '🦊', label: 'Cáo nhanh nhẹn' },
  { icon: '⭐', label: 'Ngôi sao nhỏ' },
];

const GRADES: { grade: Grade; title: string; subtitle: string; icon: string; bgGrad: string }[] = [
  { grade: 6, title: 'Lớp 6', subtitle: 'Số tự nhiên, Số nguyên, Phân số & Hình trực quan', icon: '🌱', bgGrad: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30' },
  { grade: 7, title: 'Lớp 7', subtitle: 'Số hữu tỉ, Tỉ lệ thức, Tam giác & Định lý Pythagore', icon: '📐', bgGrad: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30' },
  { grade: 8, title: 'Lớp 8', subtitle: 'Hằng đẳng thức, Phương trình & Định lý Thalès', icon: '⚡', bgGrad: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30' },
  { grade: 9, title: 'Lớp 9', subtitle: 'Căn bậc hai, Hệ phương trình, Vi-ét & Đường tròn', icon: '👑', bgGrad: 'from-purple-500/20 to-pink-500/10 border-purple-500/30' },
];

export const LoginScreen: React.FC = () => {
  const { login, loginAsGuest, theme, toggleTheme } = useMathVerse();
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'guest'>('signin');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<Grade>(6);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].icon);

  // UI feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isLight = theme === 'light';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      soundManager.playWrongSound();
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = (email || '').trim().toLowerCase();
    const adminStore = await fetchAdminStoreFromServer();
    const bannedByEmail = checkIsUserBanned({ email: cleanEmail, username: cleanEmail.split('@')[0] }, adminStore);
    if (bannedByEmail) {
      setLoading(false);
      soundManager.playWrongSound();
      setErrorMessage(
        `Tài khoản này đã bị Admin khóa vĩnh viễn (Ban). Lý do: ${bannedByEmail.reason}`
      );
      return;
    }

    if (!isSupabaseConfigured) {
      // Offline fallback
      setTimeout(() => {
        setLoading(false);
        login(cleanEmail.split('@')[0] || 'Học sinh', 6, '👨‍🚀', cleanEmail);
      }, 500);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        // If it's the admin email and user is registering or signing in for the first time
        if (
          cleanEmail === ROOT_ADMIN_EMAIL.toLowerCase() &&
          (error.message?.includes('Invalid login credentials') ||
            error.message?.includes('Email not confirmed') ||
            error.message?.includes('User not found'))
        ) {
          const signUpRes = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                name: 'Admin',
                grade: 9,
                avatar: '👑',
              },
            },
          });
          if (!signUpRes.error && signUpRes.data?.user) {
            soundManager.playCorrectSound();
            login('Admin', 9, '👑', cleanEmail);
            return;
          }
        }
        throw error;
      }

      if (data?.user) {
        const userName = data.user.user_metadata?.name || cleanEmail.split('@')[0];
        const bannedAccount = checkIsUserBanned(
          { user_id: data.user.id, username: userName, email: cleanEmail },
          adminStore
        );
        if (bannedAccount) {
          await supabase.auth.signOut().catch(() => {});
          soundManager.playWrongSound();
          setErrorMessage(
            `Tài khoản "${userName}" đã bị Admin khóa vĩnh viễn. Lý do: ${bannedAccount.reason}`
          );
          return;
        }
        soundManager.playCorrectSound();
        const userGrade = data.user.user_metadata?.grade || 6;
        const userAvatar = data.user.user_metadata?.avatar || '👨‍🚀';
        login(userName, userGrade, userAvatar, cleanEmail);
      }
    } catch (err: any) {
      soundManager.playWrongSound();
      setErrorMessage(err?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email hoặc mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email || !password) {
      setErrorMessage('Vui lòng điền đầy đủ tên, email và mật khẩu.');
      soundManager.playWrongSound();
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      soundManager.playWrongSound();
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedName = name.trim();
    const adminStore = await fetchAdminStoreFromServer();
    const bannedCheck = checkIsUserBanned({ username: trimmedName, email }, adminStore);
    if (bannedCheck) {
      setLoading(false);
      soundManager.playWrongSound();
      setErrorMessage(
        `Tài khoản hoặc tên "${trimmedName}" đã bị Admin khóa vĩnh viễn. Lý do: ${bannedCheck.reason}`
      );
      return;
    }

    const nameCheck = await checkDisplayNameAvailability(trimmedName);
    if (!nameCheck.available) {
      setLoading(false);
      soundManager.playWrongSound();
      setErrorMessage(
        nameCheck.message || `Tên "${trimmedName}" đã có người sử dụng! Vui lòng đổi sang tên khác nhé.`
      );
      return;
    }

    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setLoading(false);
        registerDisplayNameLocally(trimmedName, `local:${trimmedName}`);
        login(trimmedName, selectedGrade, selectedAvatar, email);
      }, 500);
      return;
    }

    try {
      const safeMetaAvatar = selectedAvatar.length < 32000 ? selectedAvatar : '👨‍🚀';
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: trimmedName,
            grade: selectedGrade,
            avatar: safeMetaAvatar,
          },
        },
      });

      if (error) throw error;

      if (data?.user) {
        registerDisplayNameLocally(trimmedName, data.user.id);
        soundManager.playCorrectSound();
        if (data.session) {
          login(trimmedName, selectedGrade, selectedAvatar, email);
        } else {
          setSuccessMessage('Đăng ký thành công! Vui lòng kiểm tra hộp thư email để xác thực tài khoản trước khi đăng nhập.');
          setAuthMode('signin');
        }
      }
    } catch (err: any) {
      soundManager.playWrongSound();
      setErrorMessage(err?.message || 'Đăng ký thất bại. Email có thể đã được sử dụng.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage('Vui lòng nhập email đăng ký của bạn.');
      soundManager.playWrongSound();
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!isSupabaseConfigured) {
      setLoading(false);
      setSuccessMessage('Đã gửi hướng dẫn khôi phục mật khẩu (Chế độ giả lập).');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (error) throw error;
      soundManager.playCorrectSound();
      setSuccessMessage('Đã gửi liên kết đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư.');
    } catch (err: any) {
      soundManager.playWrongSound();
      setErrorMessage(err?.message || 'Không thể gửi email khôi phục. Vui lòng kiểm tra lại địa chỉ email.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      soundManager.playWrongSound();
      setErrorMessage('Vui lòng nhập Tên học sinh / Biệt danh trước khi vào học.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const adminStore = await fetchAdminStoreFromServer();
      const bannedGuest = checkIsUserBanned({ username: trimmedName }, adminStore);
      if (bannedGuest) {
        soundManager.playWrongSound();
        setErrorMessage(
          `Tên người dùng "${trimmedName}" đã bị Admin khóa vĩnh viễn. Lý do: ${bannedGuest.reason}`
        );
        return;
      }

      const nameCheck = await checkDisplayNameAvailability(trimmedName);
      if (!nameCheck.available) {
        soundManager.playWrongSound();
        setErrorMessage(
          nameCheck.message || `Tên "${trimmedName}" đã có người sử dụng! Vui lòng đổi sang tên khác nhé.`
        );
        return;
      }

      registerDisplayNameLocally(trimmedName, `guest:${trimmedName.toLowerCase()}`);
      soundManager.playClickSound();
      loginAsGuest(trimmedName, selectedGrade, selectedAvatar);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen relative overflow-hidden flex items-center justify-center p-4 transition-colors duration-300 ${
        isLight
          ? 'theme-light bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-50 text-slate-800'
          : 'theme-dark bg-slate-950 text-slate-100'
      }`}
    >
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isLight ? (
          <>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/40 rounded-full blur-[128px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-200/40 rounded-full blur-[128px]" />
          </>
        ) : (
          <>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[128px] animate-pulse" />
          </>
        )}
        <span className="absolute top-16 left-12 text-cyan-500/20 text-4xl select-none font-mono font-bold animate-bounce">π</span>
        <span className="absolute top-28 right-24 text-indigo-400/20 text-5xl select-none font-mono font-bold">∑</span>
        <span className="absolute bottom-24 left-20 text-purple-400/20 text-5xl select-none font-mono font-bold">√</span>
        <span className="absolute bottom-32 right-16 text-pink-400/20 text-4xl select-none font-mono font-bold">∞</span>
      </div>

      <div
        className={`relative z-10 w-full max-w-xl backdrop-blur-xl border rounded-3xl p-6 sm:p-8 transition-all ${
          isLight
            ? 'bg-white/95 border-slate-200 shadow-2xl shadow-indigo-100 text-slate-800'
            : 'bg-slate-900/90 border-slate-800 shadow-2xl shadow-indigo-950/50 text-slate-100'
        }`}
      >
        {/* Top bar with theme toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Supabase Auth & Cloud Database</span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.playClickSound();
              toggleTheme();
            }}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isLight
                ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300'
            }`}
          >
            {isLight ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-300" />}
            <span>{isLight ? 'Sáng' : 'Tối'}</span>
          </button>
        </div>

        {/* Header Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-tr from-indigo-600 to-cyan-400 rounded-2xl shadow-lg shadow-indigo-500/30 mb-2 transform hover:scale-105 transition-transform duration-300">
            <Rocket className="w-7 h-7 text-white animate-pulse" />
          </div>
          <h1
            className={`text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${
              isLight ? 'from-indigo-600 via-purple-600 to-pink-600' : 'from-cyan-300 via-indigo-200 to-purple-400'
            } tracking-tight`}
          >
            MathVerse
          </h1>
          <p className={`text-xs sm:text-sm mt-1 font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Nền tảng học Toán THCS thông minh • Kết nối tri thức
          </p>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setErrorMessage('');
              setSuccessMessage('');
              soundManager.playClickSound();
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authMode === 'signin'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng nhập</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setErrorMessage('');
              setSuccessMessage('');
              soundManager.playClickSound();
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authMode === 'signup'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Đăng ký</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('guest');
              setErrorMessage('');
              setSuccessMessage('');
              soundManager.playClickSound();
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authMode === 'guest'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Khách nhanh</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* SIGN IN FORM */}
        {authMode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-600 dark:text-slate-400">
                Email tài khoản
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhap_email@example.com"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:ring-indigo-500'
                      : 'bg-slate-950/70 border-slate-700 text-white focus:ring-cyan-500'
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:ring-indigo-500'
                      : 'bg-slate-950/70 border-slate-700 text-white focus:ring-cyan-500'
                  }`}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập hệ thống</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* SIGN UP FORM */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-600 dark:text-slate-400">
                Họ và tên học sinh
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:ring-indigo-500'
                      : 'bg-slate-950/70 border-slate-700 text-white focus:ring-cyan-500'
                  }`}
                  required
                  maxLength={30}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-600 dark:text-slate-400">
                Email đăng ký
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhap_email@example.com"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:ring-indigo-500'
                      : 'bg-slate-950/70 border-slate-700 text-white focus:ring-cyan-500'
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-600 dark:text-slate-400">
                Mật khẩu (ít nhất 6 ký tự)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:ring-indigo-500'
                      : 'bg-slate-950/70 border-slate-700 text-white focus:ring-cyan-500'
                  }`}
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Grade Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-600 dark:text-slate-400">
                Chọn khối lớp THCS
              </label>
              <div className="grid grid-cols-2 gap-2">
                {GRADES.map((g) => (
                  <button
                    type="button"
                    key={g.grade}
                    onClick={() => {
                      setSelectedGrade(g.grade);
                      soundManager.playClickSound();
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedGrade === g.grade
                        ? 'border-indigo-600 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 ring-2 ring-indigo-500/30'
                        : isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <span className="text-xl">{g.icon}</span>
                    <div>
                      <div className="text-xs font-bold">{g.title}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Chọn hình đại diện (Emoji / Ảnh / GIF / Video)
                </label>
                <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-cyan-300 border border-indigo-500/30 cursor-pointer hover:bg-indigo-500/25 transition-all">
                  <Upload className="w-3 h-3" />
                  <span>Tải ảnh/GIF/Video</span>
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime,.gif"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const media = await readMediaFile(file);
                        setSelectedAvatar(media.dataUrl);
                        soundManager.playCorrectSound();
                      } catch (err: any) {
                        setErrorMessage(err?.message || 'Không thể tải tệp lên.');
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
              {isMediaAvatar(selectedAvatar) && (
                <div className="mb-2 p-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-indigo-400">
                      <UserAvatar avatar={selectedAvatar} alt="Avatar" sizeClass="w-full h-full" />
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-cyan-300">
                      Đã chọn ảnh/GIF/video từ máy
                    </span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((av) => (
                  <button
                    type="button"
                    key={av.icon}
                    onClick={() => {
                      setSelectedAvatar(av.icon);
                      soundManager.playClickSound();
                    }}
                    className={`p-2 rounded-xl text-2xl transition-all cursor-pointer flex items-center justify-center border ${
                      selectedAvatar === av.icon
                        ? 'border-indigo-600 bg-indigo-500/20 scale-105 shadow-sm'
                        : isLight
                        ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        : 'border-slate-800 bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    {av.icon}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Đăng ký tài khoản Supabase</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {authMode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="text-center mb-2">
              <KeyRound className="w-10 h-10 mx-auto text-indigo-500 mb-2" />
              <h2 className="text-base font-bold">Khôi phục mật khẩu</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Nhập email của bạn để nhận liên kết đặt lại mật khẩu từ Supabase Auth.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-600 dark:text-slate-400">
                Email đăng ký
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhap_email@example.com"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:ring-indigo-500'
                      : 'bg-slate-950/70 border-slate-700 text-white focus:ring-cyan-500'
                  }`}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Gửi liên kết khôi phục</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAuthMode('signin')}
              className="w-full text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-2"
            >
              Quay lại đăng nhập
            </button>
          </form>
        )}

        {/* GUEST QUICK START MODE */}
        {authMode === 'guest' && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <User className="w-10 h-10 mx-auto text-cyan-500 mb-2" />
              <h2 className="text-base font-bold">Trải nghiệm nhanh (Khách)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Học tập và làm bài ngay lập tức không cần đăng ký tài khoản Supabase.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-600 dark:text-slate-400">
                Tên học sinh / Biệt danh
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên của em..."
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:ring-indigo-500'
                    : 'bg-slate-950/70 border-slate-700 text-white focus:ring-cyan-500'
                }`}
                maxLength={30}
              />
            </div>

            {/* Grade Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-600 dark:text-slate-400">
                Khối lớp THCS
              </label>
              <div className="grid grid-cols-2 gap-2">
                {GRADES.map((g) => (
                  <button
                    type="button"
                    key={g.grade}
                    onClick={() => {
                      setSelectedGrade(g.grade);
                      soundManager.playClickSound();
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedGrade === g.grade
                        ? 'border-indigo-600 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 ring-2 ring-indigo-500/30'
                        : isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-700'
                        : 'border-slate-800 bg-slate-900 text-slate-300'
                    }`}
                  >
                    <span className="text-xl">{g.icon}</span>
                    <div className="text-xs font-bold">{g.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Hình đại diện (Emoji / Ảnh / GIF / Video)
                </label>
                <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-cyan-300 border border-indigo-500/30 cursor-pointer hover:bg-indigo-500/25 transition-all">
                  <Upload className="w-3 h-3" />
                  <span>Tải từ máy</span>
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime,.gif"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const media = await readMediaFile(file);
                        setSelectedAvatar(media.dataUrl);
                        soundManager.playCorrectSound();
                      } catch (err: any) {
                        setErrorMessage(err?.message || 'Không thể tải tệp lên.');
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
              {isMediaAvatar(selectedAvatar) && (
                <div className="mb-2 p-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-indigo-400">
                      <UserAvatar avatar={selectedAvatar} alt="Avatar" sizeClass="w-full h-full" />
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-cyan-300">
                      Đã chọn ảnh/GIF/video từ máy
                    </span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((av) => (
                  <button
                    type="button"
                    key={av.icon}
                    onClick={() => {
                      setSelectedAvatar(av.icon);
                      soundManager.playClickSound();
                    }}
                    className={`p-2 rounded-xl text-2xl transition-all cursor-pointer flex items-center justify-center border ${
                      selectedAvatar === av.icon
                        ? 'border-indigo-600 bg-indigo-500/20 scale-105'
                        : isLight
                        ? 'border-slate-200 bg-slate-50'
                        : 'border-slate-800 bg-slate-900'
                    }`}
                  >
                    {av.icon}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-purple-500/25 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              <span>Vào khám phá Vũ trụ Toán học</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
