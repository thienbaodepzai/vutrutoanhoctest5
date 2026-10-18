import fs from 'fs';
import path from 'path';

const ADMIN_STORE_FILE = path.join('/tmp', 'mathverse_admin_store_v1.json');
const ROOT_ADMIN_EMAIL = 'tnthienbao230715@gmail.com';

const DEFAULT_ANNOUNCEMENTS = [
  {
    id: 'ann-welcome-1',
    title: '🚀 Chào mừng các em đến với MathVerse – Vũ trụ Toán học THCS!',
    content:
      'Hãy hoàn thành bài học mỗi ngày để duy trì chuỗi Streak, luyện tập cùng MathBot AI và đua top lành mạnh trên Bảng xếp hạng LQDOJ nhé!',
    type: 'info',
    authorName: 'Ban Quản Trị (Admin)',
    createdAt: new Date().toISOString(),
  },
];

function loadAdminStore() {
  try {
    if (fs.existsSync(ADMIN_STORE_FILE)) {
      const raw = fs.readFileSync(ADMIN_STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          admins: [],
          bannedUsers: Array.isArray(parsed.bannedUsers) ? parsed.bannedUsers : [],
          announcements: Array.isArray(parsed.announcements)
            ? parsed.announcements
            : DEFAULT_ANNOUNCEMENTS,
          deletedSurveyIds: Array.isArray(parsed.deletedSurveyIds) ? parsed.deletedSurveyIds : [],
        };
      }
    }
  } catch (e) {
    console.warn('Could not read admin store:', e);
  }
  return {
    admins: [],
    bannedUsers: [],
    announcements: DEFAULT_ANNOUNCEMENTS,
    deletedSurveyIds: [],
  };
}

function saveAdminStore(store) {
  try {
    fs.writeFileSync(ADMIN_STORE_FILE, JSON.stringify(store), 'utf8');
  } catch (e) {
    console.warn('Could not write admin store:', e);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const store = loadAdminStore();

  if (req.method === 'GET') {
    // Sanitized store without leaking any private emails
    const sanitizedAnnouncements = (store.announcements || []).map((ann) => ({
      id: ann.id,
      title: ann.title,
      content: ann.content,
      type: ann.type,
      authorName: ann.authorName || 'Ban Quản Trị (Admin)',
      createdAt: ann.createdAt,
    }));

    const sanitizedBans = (store.bannedUsers || []).map((b) => ({
      id: b.id,
      user_id: b.user_id,
      username: b.username,
      reason: b.reason,
      bannedBy: b.bannedBy,
      bannedAt: b.bannedAt,
    }));

    return res.status(200).json({
      admins: [],
      bannedUsers: sanitizedBans,
      announcements: sanitizedAnnouncements,
      deletedSurveyIds: store.deletedSurveyIds || [],
    });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const { action } = body;

    if (action === 'add_announcement') {
      const title = String(body.title || '').trim().slice(0, 120);
      const content = String(body.content || '').trim().slice(0, 1000);
      const type = ['info', 'important', 'event'].includes(body.type) ? body.type : 'info';
      const authorName = String(body.authorName || 'Ban Quản Trị (Admin)').trim().slice(0, 50);

      if (!title || !content) {
        return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.' });
      }

      const newAnn = {
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        content,
        type,
        authorName,
        createdAt: new Date().toISOString(),
      };
      store.announcements = [newAnn, ...(store.announcements || [])].slice(0, 30);
      saveAdminStore(store);
      return res.status(200).json({ ok: true, store });
    }

    if (action === 'delete_announcement') {
      const id = String(body.id || '');
      store.announcements = (store.announcements || []).filter((a) => a.id !== id);
      saveAdminStore(store);
      return res.status(200).json({ ok: true, store });
    }

    if (action === 'ban_user') {
      const userId = String(body.user_id || '').trim();
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const reason = String(body.reason || 'Vi phạm quy định cộng đồng MathVerse').trim();
      const bannedBy = String(body.bannedBy || 'Admin').trim();

      if (email === ROOT_ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Không thể ban Admin gốc.' });
      }
      if (!userId && !username && !email) {
        return res.status(400).json({ error: 'Thiếu thông tin người dùng cần ban.' });
      }

      const alreadyBanned = (store.bannedUsers || []).some(
        (b) =>
          (userId && b.user_id === userId) ||
          (username && b.username.toLowerCase() === username.toLowerCase()) ||
          (email && b.email && b.email.toLowerCase() === email)
      );

      if (!alreadyBanned) {
        store.bannedUsers = [
          {
            id: `ban-${Date.now()}`,
            user_id: userId || `ban-name-${username.toLowerCase()}`,
            username: username || 'Người dùng',
            reason,
            bannedBy,
            bannedAt: new Date().toISOString(),
          },
          ...(store.bannedUsers || []),
        ];
        saveAdminStore(store);
      }
      return res.status(200).json({ ok: true, store });
    }

    if (action === 'unban_user') {
      const banId = String(body.id || '');
      const userId = String(body.user_id || '');
      const username = String(body.username || '').toLowerCase();
      store.bannedUsers = (store.bannedUsers || []).filter(
        (b) =>
          b.id !== banId &&
          (!userId || b.user_id !== userId) &&
          (!username || b.username.toLowerCase() !== username)
      );
      saveAdminStore(store);
      return res.status(200).json({ ok: true, store });
    }

    if (action === 'delete_survey') {
      const surveyId = String(body.surveyId || '');
      if (surveyId && !store.deletedSurveyIds.includes(surveyId)) {
        store.deletedSurveyIds.push(surveyId);
        saveAdminStore(store);
      }
      return res.status(200).json({ ok: true, store });
    }

    if (action === 'restore_surveys') {
      store.deletedSurveyIds = [];
      saveAdminStore(store);
      return res.status(200).json({ ok: true, store });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ.' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
