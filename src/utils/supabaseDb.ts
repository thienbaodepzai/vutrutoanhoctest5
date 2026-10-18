import { supabase, isSupabaseConfigured } from './supabase';
import { checkIsUserBanned } from './adminUtils';

export interface LearningResultRecord {
  id?: string;
  user_id: string;
  lesson_id: string;
  lesson_title: string;
  grade_level: number;
  topic: string;
  score: number;
  correct_count: number;
  wrong_count: number;
  completion_percent: number;
  answers?: any;
  completed_at: string;
}

export interface LearningProgressRecord {
  id?: string;
  user_id: string;
  lesson_id: string;
  lesson_title?: string;
  grade_level?: number;
  topic?: string;
  current_question: number;
  answers?: any;
  progress_percent: number;
  status: 'in_progress' | 'completed';
  updated_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar: string;
  grade: number;
  score: number;
  completed_lessons: number;
  in_progress_lessons: number;
  questions_answered: number;
  correct_count: number;
  wrong_count: number;
  accuracy_rate: number | null;
  updated_at: string;
}

export interface LeaderboardStats {
  totalParticipants: number;
  activeLearnersCount: number;
  validRankedUsersCount: number;
}

export interface LeaderboardResponse {
  stats: LeaderboardStats;
  entries: LeaderboardEntry[];
  source: string;
  fetchedAt: string;
}

// Track in-flight or very recent result saves to prevent duplicate clicks
const recentResultSaves = new Map<string, number>();

export async function saveLearningResult(record: Omit<LearningResultRecord, 'id'>) {
  if (!isSupabaseConfigured) {
    return { error: new Error('Supabase chưa được cấu hình'), data: null };
  }
  if (!record.user_id || !record.lesson_id) {
    return { error: new Error('Thiếu thông tin người dùng hoặc bài học'), data: null };
  }

  const dedupKey = `${record.user_id}:${record.lesson_id}:${record.score}:${record.correct_count}:${record.wrong_count}`;
  const now = Date.now();
  const lastSaved = recentResultSaves.get(dedupKey);
  if (lastSaved && now - lastSaved < 8000) {
    // Prevent duplicate insert when user clicks complete multiple times rapidly
    return { data: [], error: null, duplicate: true };
  }
  recentResultSaves.set(dedupKey, now);

  try {
    const { data, error } = await supabase
      .from('learning_results')
      .insert([record])
      .select();
    if (error) {
      recentResultSaves.delete(dedupKey);
    }
    return { data, error };
  } catch (err: any) {
    recentResultSaves.delete(dedupKey);
    return { data: null, error: err };
  }
}

export async function upsertLearningProgress(record: Omit<LearningProgressRecord, 'id'>) {
  if (!isSupabaseConfigured) {
    return { error: new Error('Supabase chưa được cấu hình'), data: null };
  }
  if (!record.user_id || !record.lesson_id) {
    return { error: new Error('Thiếu thông tin người dùng hoặc bài học'), data: null };
  }

  try {
    // Check existing progress to avoid overwriting newer data with an older draft
    const { data: existing } = await supabase
      .from('learning_progress')
      .select('id, updated_at, status, progress_percent')
      .eq('user_id', record.user_id)
      .eq('lesson_id', record.lesson_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const existingTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const incomingTime = record.updated_at ? new Date(record.updated_at).getTime() : Date.now();

      // Do not overwrite newer timestamp with older draft
      if (existingTime > incomingTime + 1000) {
        return { data: [existing], error: null };
      }

      const { data, error } = await supabase
        .from('learning_progress')
        .update({
          lesson_title: record.lesson_title,
          grade_level: record.grade_level,
          topic: record.topic,
          current_question: record.current_question,
          answers: record.answers,
          progress_percent: record.progress_percent,
          status: record.status,
          updated_at: record.updated_at,
        })
        .eq('id', existing.id)
        .eq('user_id', record.user_id)
        .select();

      return { data, error };
    }

    // Try standard upsert first; fallback to insert if constraint is not defined
    const { data, error } = await supabase
      .from('learning_progress')
      .upsert([record], { onConflict: 'user_id,lesson_id' })
      .select();

    if (error && (error.code === '42P10' || String(error.message).includes('ON CONFLICT'))) {
      const { data: insData, error: insError } = await supabase
        .from('learning_progress')
        .insert([record])
        .select();
      return { data: insData, error: insError };
    }

    return { data, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export async function fetchUserLearningResults(userId: string) {
  if (!isSupabaseConfigured || !userId) return { data: [] as LearningResultRecord[], error: null };
  try {
    const { data, error } = await supabase
      .from('learning_results')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });
    return { data: (data || []) as LearningResultRecord[], error };
  } catch (err: any) {
    return { data: [] as LearningResultRecord[], error: err };
  }
}

export async function fetchUserLearningProgress(userId: string) {
  if (!isSupabaseConfigured || !userId) return { data: [] as LearningProgressRecord[], error: null };
  try {
    const { data, error } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    return { data: (data || []) as LearningProgressRecord[], error };
  } catch (err: any) {
    return { data: [] as LearningProgressRecord[], error: err };
  }
}

function sanitizePublicDisplayName(rawName?: string, fallbackId?: string): string {
  if (!rawName || typeof rawName !== 'string') {
    return fallbackId ? `Học sinh #${String(fallbackId).slice(0, 6)}` : 'Học sinh MathVerse';
  }
  let cleaned = rawName.trim();
  // Never expose email addresses on the public leaderboard
  if (cleaned.includes('@')) {
    cleaned = cleaned.split('@')[0];
  }
  cleaned = cleaned.replace(/[<>]/g, '').trim();
  return cleaned.slice(0, 45) || 'Học sinh MathVerse';
}

function getLeaderboardApiEndpoints(): string[] {
  const endpoints: string[] = [];
  const isStaticHost =
    typeof window !== 'undefined' && window.location.hostname.includes('github.io');

  if (!isStaticHost) {
    endpoints.push('/api/leaderboard');
  }
  endpoints.push('https://vutrutoanhoctest4.vercel.app/api/leaderboard');
  return endpoints;
}

export async function syncUserLeaderboardEntry(payload: {
  user_id: string;
  display_name: string;
  avatar: string;
  grade: number;
  score: number;
  completed_lessons: number;
  in_progress_lessons: number;
  correct_count: number;
  wrong_count: number;
  updated_at?: string;
}) {
  if (!payload.user_id) return;

  const totalQuestions = Math.max(0, payload.correct_count) + Math.max(0, payload.wrong_count);
  const accuracyRate =
    totalQuestions > 0
      ? Math.round((payload.correct_count / totalQuestions) * 100)
      : payload.completed_lessons > 0
      ? 100
      : null;

  const cleanEntry = {
    user_id: payload.user_id,
    display_name: sanitizePublicDisplayName(payload.display_name, payload.user_id),
    avatar: payload.avatar || '👨‍🚀',
    grade: [6, 7, 8, 9].includes(Number(payload.grade)) ? Number(payload.grade) : 6,
    score: Math.max(0, Math.floor(Number(payload.score) || 0)),
    completed_lessons: Math.max(0, Math.floor(Number(payload.completed_lessons) || 0)),
    in_progress_lessons: Math.max(0, Math.floor(Number(payload.in_progress_lessons) || 0)),
    questions_answered: totalQuestions,
    correct_count: Math.max(0, Math.floor(Number(payload.correct_count) || 0)),
    wrong_count: Math.max(0, Math.floor(Number(payload.wrong_count) || 0)),
    accuracy_rate: accuracyRate,
    updated_at: payload.updated_at || new Date().toISOString(),
  };

  // 1. Try syncing to Supabase leaderboard_entries table if configured
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('leaderboard_entries')
        .upsert([cleanEntry], { onConflict: 'user_id' });
    } catch {
      // Ignore if table hasn't been created yet
    }
  }

  // 2. Also sync to Backend API (/api/leaderboard)
  const endpoints = getLeaderboardApiEndpoints();
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanEntry),
      });
      if (res.ok) break;
    } catch {
      // Continue to fallback endpoint
    }
  }
}

export async function fetchRealLeaderboardData(options?: {
  simulateError?: boolean;
}): Promise<{ data: LeaderboardResponse | null; error: string | null }> {
  if (options?.simulateError) {
    return { data: null, error: 'Không thể tải dữ liệu' };
  }

  const usersMap = new Map<string, Omit<LeaderboardEntry, 'rank'>>();
  let anySourceSucceeded = false;

  const mergeUserRecord = (raw: Partial<LeaderboardEntry> & { user_id: string }) => {
    if (!raw || !raw.user_id || typeof raw.user_id !== 'string') return;
    const uid = raw.user_id.trim();
    if (uid.length < 6) return;

    const existing = usersMap.get(uid);
    const completedLessons = Math.max(
      existing?.completed_lessons || 0,
      Math.max(0, Math.floor(Number(raw.completed_lessons) || 0))
    );
    const inProgressLessons = Math.max(
      existing?.in_progress_lessons || 0,
      Math.max(0, Math.floor(Number(raw.in_progress_lessons) || 0))
    );
    const correctCount = Math.max(
      existing?.correct_count || 0,
      Math.max(0, Math.floor(Number(raw.correct_count) || 0))
    );
    const wrongCount = Math.max(
      existing?.wrong_count || 0,
      Math.max(0, Math.floor(Number(raw.wrong_count) || 0))
    );
    const questionsAnswered = Math.max(
      existing?.questions_answered || 0,
      correctCount + wrongCount,
      Math.max(0, Math.floor(Number(raw.questions_answered) || 0))
    );

    const rawScore = Math.max(existing?.score || 0, Math.max(0, Math.floor(Number(raw.score) || 0)));
    const maxPlausible = completedLessons * 250 + correctCount * 35 + wrongCount * 5 + 600;
    const verifiedScore =
      completedLessons > 0 || questionsAnswered > 0 ? Math.min(rawScore, maxPlausible) : 0;

    const accuracyRate =
      questionsAnswered > 0
        ? Math.round((correctCount / questionsAnswered) * 100)
        : completedLessons > 0
        ? 100
        : null;

    const incomingName = sanitizePublicDisplayName(raw.display_name, uid);
    const displayName =
      existing?.display_name &&
      !existing.display_name.startsWith('Học sinh #') &&
      incomingName.startsWith('Học sinh #')
        ? existing.display_name
        : incomingName;

    const existingTime = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;
    const incomingTime = raw.updated_at && !isNaN(Date.parse(raw.updated_at))
      ? new Date(raw.updated_at).getTime()
      : 0;
    const bestUpdatedAt =
      incomingTime >= existingTime && raw.updated_at
        ? new Date(raw.updated_at).toISOString()
        : existing?.updated_at || new Date().toISOString();

    usersMap.set(uid, {
      user_id: uid,
      display_name: displayName,
      avatar: raw.avatar || existing?.avatar || '👨‍🚀',
      grade: [6, 7, 8, 9].includes(Number(raw.grade)) ? Number(raw.grade) : existing?.grade || 6,
      score: verifiedScore,
      completed_lessons: completedLessons,
      in_progress_lessons: inProgressLessons,
      questions_answered: questionsAnswered,
      correct_count: correctCount,
      wrong_count: wrongCount,
      accuracy_rate: accuracyRate,
      updated_at: bestUpdatedAt,
    });
  };

  // 1. Query Supabase if configured
  if (isSupabaseConfigured) {
    // 1a. Try RPC get_public_leaderboard()
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_public_leaderboard');
      if (!rpcErr && rpcData && Array.isArray(rpcData.entries)) {
        anySourceSucceeded = true;
        rpcData.entries.forEach((row: any) => {
          if (row && row.user_id) mergeUserRecord(row);
        });
      }
    } catch {
      // Ignore if RPC not created yet
    }

    // 1b. Try public.leaderboard_entries table
    try {
      const { data: lbRows, error: lbErr } = await supabase
        .from('leaderboard_entries')
        .select('*')
        .limit(200);
      if (!lbErr && Array.isArray(lbRows)) {
        anySourceSucceeded = true;
        lbRows.forEach((row: any) => {
          if (row && row.user_id) mergeUserRecord(row);
        });
      }
    } catch {
      // Ignore if table not created yet
    }

    // 1c. Aggregate directly from learning_results and learning_progress
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const [resResults, resProgress] = await Promise.all([
        supabase.from('learning_results').select('*').limit(1000),
        supabase.from('learning_progress').select('*').limit(1000),
      ]);

      if (!resResults.error || !resProgress.error) {
        anySourceSucceeded = true;
      }

      const byUser = new Map<
        string,
        {
          user_id: string;
          display_name?: string;
          avatar?: string;
          grade: number;
          completedIds: Set<string>;
          inProgressIds: Set<string>;
          correct_count: number;
          wrong_count: number;
          score: number;
          hasKnownTotalXp?: boolean;
          updated_at: string;
        }
      >();

      // If current user is authenticated in Supabase, ensure they are registered as an actual participant
      if (session?.user?.id) {
        anySourceSucceeded = true;
        const meta = session.user.user_metadata || {};
        byUser.set(session.user.id, {
          user_id: session.user.id,
          display_name: meta.name || session.user.email?.split('@')[0] || 'Học sinh',
          avatar: meta.avatar || '👨‍🚀',
          grade: Number(meta.grade) || 6,
          completedIds: new Set<string>(),
          inProgressIds: new Set<string>(),
          correct_count: 0,
          wrong_count: 0,
          score: Number(meta.xp) || 0,
          hasKnownTotalXp: Boolean(meta.xp !== undefined && Number(meta.xp) > 0),
          updated_at: new Date().toISOString(),
        });
      }

      if (!resResults.error && Array.isArray(resResults.data)) {
        resResults.data.forEach((r: LearningResultRecord) => {
          if (!r || !r.user_id) return;
          const cur = byUser.get(r.user_id) || {
            user_id: r.user_id,
            display_name: r.answers?.userName,
            avatar: r.answers?.userAvatar,
            grade: Number(r.grade_level) || 6,
            completedIds: new Set<string>(),
            inProgressIds: new Set<string>(),
            correct_count: 0,
            wrong_count: 0,
            score: 0,
            hasKnownTotalXp: false,
            updated_at: r.completed_at || new Date().toISOString(),
          };
          if (r.lesson_id) cur.completedIds.add(r.lesson_id);
          const c = Math.max(0, Number(r.correct_count) || 0);
          const w = Math.max(0, Number(r.wrong_count) || 0);
          cur.correct_count += c;
          cur.wrong_count += w;

          // Only calculate and add XP if total XP is not already known from user metadata
          if (!cur.hasKnownTotalXp) {
            const gainedXp =
              r.answers && typeof r.answers.xpEarned === 'number'
                ? Number(r.answers.xpEarned)
                : 50 + c * 15 + w * 2;
            cur.score += gainedXp;
          }

          if (r.completed_at && new Date(r.completed_at) > new Date(cur.updated_at)) {
            cur.updated_at = r.completed_at;
          }
          if (r.answers?.userName) cur.display_name = r.answers.userName;
          if (r.answers?.userAvatar) cur.avatar = r.answers.userAvatar;
          byUser.set(r.user_id, cur);
        });
      }

      if (!resProgress.error && Array.isArray(resProgress.data)) {
        resProgress.data.forEach((p: LearningProgressRecord) => {
          if (!p || !p.user_id) return;
          const cur = byUser.get(p.user_id) || {
            user_id: p.user_id,
            display_name: p.answers?.userName,
            avatar: p.answers?.userAvatar,
            grade: Number(p.grade_level) || 6,
            completedIds: new Set<string>(),
            inProgressIds: new Set<string>(),
            correct_count: 0,
            wrong_count: 0,
            score: 0,
            hasKnownTotalXp: false,
            updated_at: p.updated_at || new Date().toISOString(),
          };
          if (p.status === 'completed' || Number(p.progress_percent) >= 100) {
            if (p.lesson_id) cur.completedIds.add(p.lesson_id);
          } else if (p.lesson_id) {
            cur.inProgressIds.add(p.lesson_id);
          }
          if (!cur.completedIds.has(p.lesson_id) && p.answers) {
            const pc = Math.max(0, Number(p.answers.correctCount) || 0);
            const pw = Math.max(0, Number(p.answers.wrongCount) || 0);
            cur.correct_count += pc;
            cur.wrong_count += pw;
            if (!cur.hasKnownTotalXp) {
              cur.score +=
                typeof p.answers.xpEarned === 'number'
                  ? Number(p.answers.xpEarned)
                  : pc * 15 + pw * 2;
            }
          }
          if (p.updated_at && new Date(p.updated_at) > new Date(cur.updated_at)) {
            cur.updated_at = p.updated_at;
          }
          if (p.answers?.userName) cur.display_name = p.answers.userName;
          if (p.answers?.userAvatar) cur.avatar = p.answers.userAvatar;
          byUser.set(p.user_id, cur);
        });
      }

      byUser.forEach((agg) => {
        mergeUserRecord({
          user_id: agg.user_id,
          display_name: agg.display_name,
          avatar: agg.avatar,
          grade: agg.grade,
          score: agg.score,
          completed_lessons: agg.completedIds.size,
          in_progress_lessons: agg.inProgressIds.size,
          correct_count: agg.correct_count,
          wrong_count: agg.wrong_count,
          updated_at: agg.updated_at,
        });
      });
    } catch {
      // Ignore
    }
  }

  // 2. Also query Backend API (/api/leaderboard)
  const endpoints = getLeaderboardApiEndpoints();
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        const json = await res.json();
        anySourceSucceeded = true;
        if (Array.isArray(json.entries)) {
          json.entries.forEach((row: any) => {
            if (row && row.user_id) mergeUserRecord(row);
          });
        }
        break;
      }
    } catch {
      // Try next endpoint
    }
  }

  if (!anySourceSucceeded) {
    return {
      data: null,
      error: 'Không thể tải dữ liệu',
    };
  }

  const allUsers = Array.from(usersMap.values()).filter(
    (u) => !checkIsUserBanned({ user_id: u.user_id, username: u.display_name })
  );
  const totalParticipants = allUsers.length;
  const activeLearnersCount = allUsers.filter(
    (u) => u.completed_lessons > 0 || u.in_progress_lessons > 0 || u.questions_answered > 0
  ).length;

  // Retrieve current active user profile XP to guarantee strict truth
  let localRealXp: number | null = null;
  let localRealName: string | null = null;
  try {
    const rawProf = localStorage.getItem('mathverse_user_profile_v1');
    if (rawProf) {
      const parsed = JSON.parse(rawProf);
      if (parsed && typeof parsed.xp === 'number') {
        localRealXp = parsed.xp;
        localRealName = parsed.name ? parsed.name.trim().toLowerCase() : null;
      }
    }
  } catch {}

  const sortedEntries: LeaderboardEntry[] = allUsers
    .map((u) => {
      if (localRealName && u.display_name.trim().toLowerCase() === localRealName && localRealXp !== null) {
        return {
          ...u,
          score: localRealXp, // STRICT: real user.xp is the single source of truth
        };
      }
      return u;
    })
    .filter((u) => u.score > 0 && (u.completed_lessons > 0 || u.questions_answered > 0))
    .sort((a, b) => {
      // Primary: Score descending
      if (b.score !== a.score) return b.score - a.score;
      // Tie-breaker 1: Accuracy rate descending
      const accA = a.accuracy_rate ?? -1;
      const accB = b.accuracy_rate ?? -1;
      if (accB !== accA) return accB - accA;
      // Tie-breaker 2: Correct answers count descending
      if (b.correct_count !== a.correct_count) return b.correct_count - a.correct_count;
      // Tie-breaker 3: Completed lessons count descending
      if (b.completed_lessons !== a.completed_lessons) return b.completed_lessons - a.completed_lessons;
      // Tie-breaker 4: Earlier completion timestamp
      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  return {
    data: {
      stats: {
        totalParticipants,
        activeLearnersCount,
        validRankedUsersCount: sortedEntries.length,
      },
      entries: sortedEntries,
      source: isSupabaseConfigured ? 'Supabase PostgreSQL & Cloud API' : 'Cloud API',
      fetchedAt: new Date().toISOString(),
    },
    error: null,
  };
}

const REGISTERED_NAMES_STORAGE_KEY = 'mathverse_registered_names_v1';

export function normalizeDisplayNameKey(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Lưu tên hiển thị đã đăng ký của người dùng vào bộ nhớ cục bộ để kiểm tra chống trùng tên nhanh chóng
 */
export function registerDisplayNameLocally(
  name: string,
  ownerId?: string | null,
  previousName?: string | null
): void {
  const norm = normalizeDisplayNameKey(name);
  if (!norm) return;
  const owner = (ownerId || `owner:${norm}`).trim();
  try {
    const raw = localStorage.getItem(REGISTERED_NAMES_STORAGE_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (previousName) {
      const prevNorm = normalizeDisplayNameKey(previousName);
      if (prevNorm && prevNorm !== norm && map[prevNorm] === owner) {
        delete map[prevNorm];
      }
    }
    map[norm] = owner;
    localStorage.setItem(REGISTERED_NAMES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore
  }
}

/**
 * Kiểm tra xem tên hiển thị (Họ và tên / Biệt danh) đã có người khác sử dụng chưa.
 * Kiểm tra đồng thời trên:
 * 1. Bảng xếp hạng trực tuyến (/api/leaderboard & Supabase leaderboard_entries)
 * 2. Dữ liệu học tập trên Supabase (learning_results / learning_progress)
 * 3. Danh sách tên đã đăng ký trên trình duyệt & cộng đồng
 */
export async function checkDisplayNameAvailability(
  desiredName: string,
  currentUserId?: string | null,
  currentUserName?: string | null
): Promise<{ available: boolean; message?: string }> {
  const trimmed = (desiredName || '').trim();
  if (!trimmed) {
    return {
      available: false,
      message: 'Vui lòng nhập tên hiển thị của em.',
    };
  }

  const targetNorm = normalizeDisplayNameKey(trimmed);
  const currentNameNorm = currentUserName ? normalizeDisplayNameKey(currentUserName) : '';
  const myOwnerId = (currentUserId || '').trim();

  // Nếu học sinh giữ nguyên tên hiện tại của chính mình thì hợp lệ
  if (currentNameNorm && targetNorm === currentNameNorm) {
    return { available: true };
  }

  // Danh sách tên học sinh có sẵn trong hệ thống cộng đồng
  const reservedSeedNames = [
    'nguyễn minh khôi',
    'trần bảo ngọc',
    'lê hoàng nam',
    'phạm quỳnh chi',
    'vũ đức anh',
    'đặng thảo vy',
    'hoàng gia bảo',
    'bùi phương linh',
  ];
  if (reservedSeedNames.includes(targetNorm)) {
    return {
      available: false,
      message: `Tên "${trimmed}" đã có người sử dụng! Vui lòng chọn một tên khác nhé.`,
    };
  }

  // 1. Kiểm tra trong bộ nhớ tên đã đăng ký cục bộ
  try {
    const raw = localStorage.getItem(REGISTERED_NAMES_STORAGE_KEY);
    if (raw) {
      const map: Record<string, string> = JSON.parse(raw);
      const existingOwner = map[targetNorm];
      if (existingOwner && (!myOwnerId || existingOwner !== myOwnerId)) {
        return {
          available: false,
          message: `Tên "${trimmed}" đã có người sử dụng! Vui lòng đổi sang tên khác nhé.`,
        };
      }
    }
  } catch {
    // Ignore
  }

  // 2. Kiểm tra trên Bảng xếp hạng trực tuyến & Supabase
  try {
    const lbRes = await fetchRealLeaderboardData();
    const entries = lbRes.data?.entries || [];
    for (const entry of entries) {
      const entryNorm = normalizeDisplayNameKey(entry.display_name);
      if (entryNorm === targetNorm) {
        if (!myOwnerId || entry.user_id !== myOwnerId) {
          return {
            available: false,
            message: `Tên "${trimmed}" đã có thành viên khác sử dụng trên hệ thống! Vui lòng chọn tên khác nhé.`,
          };
        }
      }
    }
  } catch {
    // Ignore network error and continue
  }

  // 3. Kiểm tra thêm trực tiếp từ bảng learning_results / leaderboard_entries trên Supabase nếu có
  if (isSupabaseConfigured) {
    try {
      const { data: lbRows } = await supabase
        .from('leaderboard_entries')
        .select('user_id, display_name')
        .limit(300);
      if (Array.isArray(lbRows)) {
        for (const r of lbRows) {
          if (r && r.display_name && normalizeDisplayNameKey(r.display_name) === targetNorm) {
            if (!myOwnerId || r.user_id !== myOwnerId) {
              return {
                available: false,
                message: `Tên "${trimmed}" đã có người sử dụng! Vui lòng chọn một tên khác nhé.`,
              };
            }
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return { available: true };
}

