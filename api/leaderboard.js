import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const STORAGE_FILE = path.join('/tmp', 'mathverse_verified_leaderboard.json');

// Rate limit / duplicate submission guard per user_id
const recentSubmissions = new Map();

function loadVerifiedStore() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.warn('Could not read verified leaderboard store:', e);
  }
  return { users: {} };
}

function saveVerifiedStore(store) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(store), 'utf8');
  } catch (e) {
    console.warn('Could not write verified leaderboard store:', e);
  }
}

function sanitizeDisplayName(rawName) {
  if (!rawName || typeof rawName !== 'string') return 'Học sinh MathVerse';
  // Strip any email domain if user accidentally used email as name
  let cleaned = rawName.trim();
  if (cleaned.includes('@')) {
    cleaned = cleaned.split('@')[0];
  }
  // Remove HTML tags
  cleaned = cleaned.replace(/[<>]/g, '').trim();
  return cleaned.slice(0, 45) || 'Học sinh MathVerse';
}

function isValidUserId(uid) {
  if (!uid || typeof uid !== 'string') return false;
  const trimmed = uid.trim();
  // Must be a stable identifier (Supabase UUID or authenticated ID), between 8 and 128 chars
  return trimmed.length >= 8 && trimmed.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

function validateAndComputeRecord(body) {
  const userId = String(body.user_id || '').trim();
  if (!isValidUserId(userId)) {
    return { error: 'Định danh người dùng (user_id) không hợp lệ.' };
  }

  const displayName = sanitizeDisplayName(body.display_name);
  const rawAvatar = typeof body.avatar === 'string' ? body.avatar.trim() : '';
  const isCustomMedia =
    rawAvatar.startsWith('data:image/') ||
    rawAvatar.startsWith('data:video/') ||
    rawAvatar.startsWith('http://') ||
    rawAvatar.startsWith('https://');
  const avatar = isCustomMedia
    ? rawAvatar.slice(0, 500000)
    : rawAvatar && rawAvatar.length <= 16
    ? rawAvatar
    : '👨‍🚀';
  const rawGrade = Number(body.grade);
  const grade = [6, 7, 8, 9].includes(rawGrade) ? rawGrade : 6;

  const completedLessons = Math.max(0, Math.min(500, Math.floor(Number(body.completed_lessons) || 0)));
  const inProgressLessons = Math.max(0, Math.min(500, Math.floor(Number(body.in_progress_lessons) || 0)));
  const correctCount = Math.max(0, Math.min(10000, Math.floor(Number(body.correct_count) || 0)));
  const wrongCount = Math.max(0, Math.min(10000, Math.floor(Number(body.wrong_count) || 0)));
  const totalQuestions = correctCount + wrongCount;

  // Server-side score verification: do not allow arbitrary huge scores without corresponding completed work
  const requestedScore = Math.max(0, Math.floor(Number(body.score) || 0));
  const calculatedMinScore = completedLessons * 50 + correctCount * 15 + wrongCount * 2;
  const maxPlausibleScore = completedLessons * 200 + correctCount * 30 + wrongCount * 5 + 600;

  // If user has no completed lessons and no answered questions, valid score must be 0
  let verifiedScore = 0;
  if (completedLessons > 0 || totalQuestions > 0) {
    verifiedScore = requestedScore > 0
      ? Math.min(requestedScore, Math.max(calculatedMinScore, maxPlausibleScore))
      : calculatedMinScore;
  }

  const accuracyRate = totalQuestions > 0
    ? Math.round((correctCount / totalQuestions) * 100)
    : completedLessons > 0
    ? 100
    : null;

  const updatedAt = body.updated_at && !isNaN(Date.parse(body.updated_at))
    ? new Date(body.updated_at).toISOString()
    : new Date().toISOString();

  return {
    record: {
      user_id: userId,
      display_name: displayName,
      avatar,
      grade,
      score: verifiedScore,
      completed_lessons: completedLessons,
      in_progress_lessons: inProgressLessons,
      questions_answered: totalQuestions,
      correct_count: correctCount,
      wrong_count: wrongCount,
      accuracy_rate: accuracyRate,
      updated_at: updatedAt,
    },
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  const authHeader = req.headers.authorization || '';
  const supabase =
    supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey, {
          global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
        })
      : null;

  if (req.method === 'POST') {
    const body = req.body || {};
    const { error, record } = validateAndComputeRecord(body);
    if (error || !record) {
      return res.status(400).json({ error: error || 'Dữ liệu không hợp lệ.' });
    }

    // Anti-spam / duplicate submission guard
    const dedupKey = `${record.user_id}:${record.score}:${record.completed_lessons}:${record.questions_answered}`;
    const lastTime = recentSubmissions.get(dedupKey);
    const now = Date.now();
    if (lastTime && now - lastTime < 3000) {
      return res.status(200).json({ ok: true, duplicate: true, record });
    }
    recentSubmissions.set(dedupKey, now);

    // Save to verified server store
    const store = loadVerifiedStore();
    const existing = store.users[record.user_id];
    if (!existing || new Date(record.updated_at).getTime() >= new Date(existing.updated_at || 0).getTime()) {
      store.users[record.user_id] = record;
      saveVerifiedStore(store);
    }

    // Also try upserting into Supabase leaderboard_entries if table exists
    if (supabase) {
      try {
        await supabase
          .from('leaderboard_entries')
          .upsert([record], { onConflict: 'user_id' });
      } catch {
        // Ignore if table not created yet
      }
    }

    return res.status(200).json({ ok: true, record });
  }

  if (req.method === 'GET') {
    const usersMap = new Map();
    const store = loadVerifiedStore();

    Object.values(store.users || {}).forEach((u) => {
      if (u && u.user_id) {
        usersMap.set(u.user_id, u);
      }
    });

    if (supabase) {
      // 1. Try public leaderboard_entries table
      try {
        const { data: lbData, error: lbErr } = await supabase
          .from('leaderboard_entries')
          .select('*')
          .limit(200);
        if (!lbErr && Array.isArray(lbData)) {
          lbData.forEach((row) => {
            if (row && row.user_id) {
              const validated = validateAndComputeRecord(row);
              if (validated.record) {
                usersMap.set(row.user_id, validated.record);
              }
            }
          });
        }
      } catch {
        // Ignore
      }

      // 2. Try aggregating from learning_results and learning_progress if accessible
      try {
        const [resResults, resProgress] = await Promise.all([
          supabase.from('learning_results').select('*').limit(1000),
          supabase.from('learning_progress').select('*').limit(1000),
        ]);

        const byUser = new Map();
        if (!resResults.error && Array.isArray(resResults.data)) {
          resResults.data.forEach((r) => {
            if (!r || !r.user_id) return;
            const cur = byUser.get(r.user_id) || {
              user_id: r.user_id,
              display_name: r.answers?.userName || `Học sinh #${String(r.user_id).slice(0, 6)}`,
              avatar: r.answers?.userAvatar || '👨‍🚀',
              grade: Number(r.grade_level) || 6,
              completedIds: new Set(),
              inProgressIds: new Set(),
              correct_count: 0,
              wrong_count: 0,
              score: 0,
              updated_at: r.completed_at || new Date().toISOString(),
            };
            if (r.lesson_id) cur.completedIds.add(r.lesson_id);
            const c = Math.max(0, Number(r.correct_count) || 0);
            const w = Math.max(0, Number(r.wrong_count) || 0);
            cur.correct_count += c;
            cur.wrong_count += w;
            const gainedXp =
              r.answers && typeof r.answers.xpEarned === 'number'
                ? Number(r.answers.xpEarned)
                : 50 + c * 15 + w * 2;
            cur.score += gainedXp;
            if (r.completed_at && new Date(r.completed_at) > new Date(cur.updated_at)) {
              cur.updated_at = r.completed_at;
            }
            if (r.answers?.userName) cur.display_name = sanitizeDisplayName(r.answers.userName);
            if (r.answers?.userAvatar) cur.avatar = r.answers.userAvatar;
            byUser.set(r.user_id, cur);
          });
        }

        if (!resProgress.error && Array.isArray(resProgress.data)) {
          resProgress.data.forEach((p) => {
            if (!p || !p.user_id) return;
            const cur = byUser.get(p.user_id) || {
              user_id: p.user_id,
              display_name: p.answers?.userName || `Học sinh #${String(p.user_id).slice(0, 6)}`,
              avatar: p.answers?.userAvatar || '👨‍🚀',
              grade: Number(p.grade_level) || 6,
              completedIds: new Set(),
              inProgressIds: new Set(),
              correct_count: 0,
              wrong_count: 0,
              score: 0,
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
              cur.score +=
                typeof p.answers.xpEarned === 'number'
                  ? Number(p.answers.xpEarned)
                  : pc * 15 + pw * 2;
            }
            if (p.updated_at && new Date(p.updated_at) > new Date(cur.updated_at)) {
              cur.updated_at = p.updated_at;
            }
            if (p.answers?.userName) cur.display_name = sanitizeDisplayName(p.answers.userName);
            if (p.answers?.userAvatar) cur.avatar = p.answers.userAvatar;
            byUser.set(p.user_id, cur);
          });
        }

        byUser.forEach((agg, uid) => {
          const existing = usersMap.get(uid);
          const merged = validateAndComputeRecord({
            user_id: uid,
            display_name: existing?.display_name && !existing.display_name.startsWith('Học sinh #')
              ? existing.display_name
              : agg.display_name,
            avatar: existing?.avatar || agg.avatar,
            grade: existing?.grade || agg.grade,
            score: Math.max(existing?.score || 0, agg.score),
            completed_lessons: Math.max(existing?.completed_lessons || 0, agg.completedIds.size),
            in_progress_lessons: Math.max(existing?.in_progress_lessons || 0, agg.inProgressIds.size),
            correct_count: Math.max(existing?.correct_count || 0, agg.correct_count),
            wrong_count: Math.max(existing?.wrong_count || 0, agg.wrong_count),
            updated_at: agg.updated_at || existing?.updated_at,
          });
          if (merged.record) {
            usersMap.set(uid, merged.record);
          }
        });
      } catch {
        // Ignore
      }
    }

    const ADMIN_STORE_FILE = path.join('/tmp', 'mathverse_admin_store_v1.json');
    let bannedList = [];
    try {
      if (fs.existsSync(ADMIN_STORE_FILE)) {
        const parsedAdmin = JSON.parse(fs.readFileSync(ADMIN_STORE_FILE, 'utf8'));
        if (parsedAdmin && Array.isArray(parsedAdmin.bannedUsers)) {
          bannedList = parsedAdmin.bannedUsers;
        }
      }
    } catch {
      // Ignore
    }

    const isBannedEntry = (u) => {
      if (!u || bannedList.length === 0) return false;
      const uid = String(u.user_id || '').trim();
      const uname = String(u.display_name || '').trim().toLowerCase();
      return bannedList.some(
        (b) =>
          (uid && b.user_id === uid) ||
          (uname && b.username && b.username.trim().toLowerCase() === uname)
      );
    };

    const allUsers = Array.from(usersMap.values()).filter((u) => !isBannedEntry(u));
    const totalParticipants = allUsers.length;
    const activeLearnersCount = allUsers.filter(
      (u) => u.completed_lessons > 0 || u.in_progress_lessons > 0 || u.questions_answered > 0
    ).length;

    const validEntries = allUsers
      .filter((u) => u.score > 0 && (u.completed_lessons > 0 || u.questions_answered > 0))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const accA = a.accuracy_rate ?? -1;
        const accB = b.accuracy_rate ?? -1;
        if (accB !== accA) return accB - accA;
        if (b.correct_count !== a.correct_count) return b.correct_count - a.correct_count;
        if (b.completed_lessons !== a.completed_lessons) return b.completed_lessons - a.completed_lessons;
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      })
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
      }));

    return res.status(200).json({
      stats: {
        totalParticipants,
        activeLearnersCount,
        validRankedUsersCount: validEntries.length,
      },
      entries: validEntries,
      fetchedAt: new Date().toISOString(),
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
