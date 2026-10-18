import { useState, useEffect, useCallback } from 'react';
import { deleteUserSurvey } from './userSurvey';

export const ROOT_ADMIN_EMAIL = 'tnthienbao230715@gmail.com';
const ADMIN_LOCAL_STORAGE_KEY = 'mathverse_admin_store_v1';
const ADMIN_OWNER_MIGRATED_KEY = 'mathverse_admin_owner_bound_v1';
const ADMIN_PREVIEW_AS_STUDENT_KEY = 'mathverse_admin_preview_student_v1';
const ADMIN_UPDATED_EVENT = 'mathverse_admin_updated';

export interface BannedUserEntry {
  id: string;
  user_id: string;
  username: string;
  reason: string;
  bannedBy: string;
  bannedAt: string;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'important' | 'event';
  authorName: string;
  createdAt: string;
}

export interface AdminStoreData {
  bannedUsers: BannedUserEntry[];
  announcements: AdminAnnouncement[];
  deletedSurveyIds: string[];
}

const DEFAULT_ANNOUNCEMENTS: AdminAnnouncement[] = [
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

export function getLocalAdminStore(): AdminStoreData {
  try {
    const raw = localStorage.getItem(ADMIN_LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          bannedUsers: Array.isArray(parsed.bannedUsers) ? parsed.bannedUsers : [],
          announcements: Array.isArray(parsed.announcements)
            ? parsed.announcements
            : DEFAULT_ANNOUNCEMENTS,
          deletedSurveyIds: Array.isArray(parsed.deletedSurveyIds) ? parsed.deletedSurveyIds : [],
        };
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return {
    bannedUsers: [],
    announcements: DEFAULT_ANNOUNCEMENTS,
    deletedSurveyIds: [],
  };
}

export function saveLocalAdminStore(store: Partial<AdminStoreData>): AdminStoreData {
  const current = getLocalAdminStore();
  const next: AdminStoreData = {
    bannedUsers: Array.isArray(store.bannedUsers) ? store.bannedUsers : current.bannedUsers,
    announcements: Array.isArray(store.announcements)
      ? store.announcements
      : current.announcements,
    deletedSurveyIds: Array.isArray(store.deletedSurveyIds)
      ? store.deletedSurveyIds
      : current.deletedSurveyIds,
  };
  try {
    localStorage.setItem(ADMIN_LOCAL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ADMIN_UPDATED_EVENT, { detail: next }));
  }
  return next;
}

export function ensureOwnerAdminEmailBound(existingEmail?: string | null): string {
  try {
    localStorage.removeItem(ADMIN_OWNER_MIGRATED_KEY);
  } catch {}
  if (existingEmail && existingEmail.trim()) {
    return existingEmail.trim().toLowerCase();
  }
  return '';
}

export function getPreviewAsStudentMode(): boolean {
  try {
    return localStorage.getItem(ADMIN_PREVIEW_AS_STUDENT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPreviewAsStudentMode(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(ADMIN_PREVIEW_AS_STUDENT_KEY, 'true');
    } else {
      localStorage.removeItem(ADMIN_PREVIEW_AS_STUDENT_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(ADMIN_UPDATED_EVENT));
    }
  } catch {
    // Ignore
  }
}

/**
 * Kiểm tra xem người dùng hiện tại có phải là Admin không.
 * QUY TẮC BẮT BUỘC: CHỈ DUY NHẤT chủ sở hữu với email trùng khớp mới được làm Admin!
 */
export function checkIsUserAdmin(
  userName?: string | null,
  userEmail?: string | null,
  store?: AdminStoreData,
  ignoreStudentPreview = false
): boolean {
  if (!ignoreStudentPreview && getPreviewAsStudentMode()) {
    return false;
  }

  if (!userEmail || typeof userEmail !== 'string') {
    return false;
  }

  const cleanEmail = userEmail.trim().toLowerCase();
  return cleanEmail === ROOT_ADMIN_EMAIL.toLowerCase();
}

/**
 * Kiểm tra xem một người dùng có nằm trong danh sách bị Ban vĩnh viễn không
 */
export function checkIsUserBanned(
  params: { user_id?: string | null; username?: string | null; email?: string | null },
  store?: AdminStoreData
): BannedUserEntry | null {
  const activeStore = store || getLocalAdminStore();
  if (!Array.isArray(activeStore.bannedUsers) || activeStore.bannedUsers.length === 0) {
    return null;
  }

  const uid = (params.user_id || '').trim();
  const uname = (params.username || '').trim().toLowerCase();
  const uemail = (params.email || '').trim().toLowerCase();

  // Không bao giờ ban Admin gốc
  if (uemail === ROOT_ADMIN_EMAIL.toLowerCase()) {
    return null;
  }

  const found = activeStore.bannedUsers.find((b) => {
    if (uid && b.user_id && b.user_id === uid) return true;
    if (uname && b.username && b.username.trim().toLowerCase() === uname) return true;
    return false;
  });

  return found || null;
}

export async function fetchAdminStoreFromServer(): Promise<AdminStoreData> {
  const local = getLocalAdminStore();
  try {
    const res = await fetch('/api/admin');
    if (res.ok) {
      const serverData = await res.json();

      const mergedBansMap = new Map<string, BannedUserEntry>();
      [...(local.bannedUsers || []), ...(serverData.bannedUsers || [])].forEach(
        (b: BannedUserEntry) => {
          if (b && (b.user_id || b.username)) {
            const key = `${b.user_id || ''}::${(b.username || '').toLowerCase()}`;
            mergedBansMap.set(key, {
              id: b.id,
              user_id: b.user_id,
              username: b.username,
              reason: b.reason,
              bannedBy: b.bannedBy,
              bannedAt: b.bannedAt,
            });
          }
        }
      );

      const mergedAnnouncementsMap = new Map<string, AdminAnnouncement>();
      [...(serverData.announcements || []), ...(local.announcements || [])].forEach(
        (ann: AdminAnnouncement) => {
          if (ann && ann.id) {
            mergedAnnouncementsMap.set(ann.id, {
              id: ann.id,
              title: ann.title,
              content: ann.content,
              type: ann.type,
              authorName: ann.authorName || 'Ban Quản Trị (Admin)',
              createdAt: ann.createdAt,
            });
          }
        }
      );

      const mergedDeletedSurveys = Array.from(
        new Set([...(local.deletedSurveyIds || []), ...(serverData.deletedSurveyIds || [])])
      );

      mergedDeletedSurveys.forEach((sid) => {
        deleteUserSurvey(sid);
      });

      const sortedAnnouncements = Array.from(mergedAnnouncementsMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return saveLocalAdminStore({
        bannedUsers: Array.from(mergedBansMap.values()),
        announcements:
          sortedAnnouncements.length > 0 ? sortedAnnouncements : DEFAULT_ANNOUNCEMENTS,
        deletedSurveyIds: mergedDeletedSurveys,
      });
    }
  } catch {
    // Fallback to local store
  }
  return local;
}

export async function postAdminAnnouncement(payload: {
  title: string;
  content: string;
  type: 'info' | 'important' | 'event';
  authorName?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const title = payload.title.trim();
  const content = payload.content.trim();
  if (!title || !content) {
    return { ok: false, error: 'Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.' };
  }

  const newAnn: AdminAnnouncement = {
    id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    content,
    type: payload.type || 'info',
    authorName: 'Ban Quản Trị (Admin)',
    createdAt: new Date().toISOString(),
  };

  const current = getLocalAdminStore();
  saveLocalAdminStore({
    ...current,
    announcements: [newAnn, ...current.announcements],
  });

  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_announcement',
        title,
        content,
        type: payload.type || 'info',
        authorName: 'Ban Quản Trị (Admin)',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.store) saveLocalAdminStore(data.store);
    }
  } catch {
    // Saved locally
  }
  return { ok: true };
}

export async function removeAdminAnnouncement(id: string): Promise<void> {
  const current = getLocalAdminStore();
  saveLocalAdminStore({
    ...current,
    announcements: current.announcements.filter((a) => a.id !== id),
  });

  try {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_announcement', id }),
    });
  } catch {
    // Ignore
  }
}

export async function banUserPermanently(payload: {
  user_id?: string;
  username: string;
  email?: string;
  reason?: string;
  bannedBy?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const username = (payload.username || '').trim();
  const email = (payload.email || '').trim().toLowerCase();
  const userId = (payload.user_id || '').trim() || `ban-name-${username.toLowerCase()}`;
  const reason = (payload.reason || 'Vi phạm quy định cộng đồng MathVerse').trim();

  if (email === ROOT_ADMIN_EMAIL.toLowerCase()) {
    return { ok: false, error: 'Không thể ban Admin gốc!' };
  }
  if (!username && !userId) {
    return { ok: false, error: 'Vui lòng cung cấp tên người dùng hoặc ID cần ban vĩnh viễn.' };
  }

  const current = getLocalAdminStore();
  const already = current.bannedUsers.some(
    (b) =>
      (userId && b.user_id === userId) ||
      (username && b.username.toLowerCase() === username.toLowerCase())
  );

  if (!already) {
    const newBan: BannedUserEntry = {
      id: `ban-${Date.now()}`,
      user_id: userId,
      username: username || 'Người dùng',
      reason,
      bannedBy: 'Admin',
      bannedAt: new Date().toISOString(),
    };
    saveLocalAdminStore({
      ...current,
      bannedUsers: [newBan, ...current.bannedUsers],
    });
  }

  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ban_user',
        user_id: userId,
        username,
        email,
        reason,
        bannedBy: 'Admin',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.store) saveLocalAdminStore(data.store);
    }
  } catch {
    // Saved locally
  }

  return { ok: true };
}

export async function unbanUserAccount(payload: {
  id?: string;
  user_id?: string;
  username?: string;
}): Promise<void> {
  const current = getLocalAdminStore();
  const uname = (payload.username || '').trim().toLowerCase();
  saveLocalAdminStore({
    ...current,
    bannedUsers: current.bannedUsers.filter(
      (b) =>
        (!payload.id || b.id !== payload.id) &&
        (!payload.user_id || b.user_id !== payload.user_id) &&
        (!uname || b.username.toLowerCase() !== uname)
    ),
  });

  try {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'unban_user',
        ...payload,
      }),
    });
  } catch {
    // Ignore
  }
}

export async function adminDeleteSurveyById(surveyId: string): Promise<void> {
  deleteUserSurvey(surveyId);
  const current = getLocalAdminStore();
  if (!current.deletedSurveyIds.includes(surveyId)) {
    saveLocalAdminStore({
      ...current,
      deletedSurveyIds: [...current.deletedSurveyIds, surveyId],
    });
  }
  try {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_survey',
        surveyId,
      }),
    });
  } catch {
    // Ignore
  }
}

export function useAdminStore() {
  const [store, setStore] = useState<AdminStoreData>(() => getLocalAdminStore());
  const [previewAsStudent, setPreviewState] = useState<boolean>(() => getPreviewAsStudentMode());

  const refresh = useCallback(async () => {
    const updated = await fetchAdminStoreFromServer();
    setStore(updated);
    setPreviewState(getPreviewAsStudentMode());
  }, []);

  useEffect(() => {
    refresh();
    const handleEvent = () => {
      setStore(getLocalAdminStore());
      setPreviewState(getPreviewAsStudentMode());
    };
    window.addEventListener(ADMIN_UPDATED_EVENT, handleEvent);
    window.addEventListener('storage', handleEvent);
    return () => {
      window.removeEventListener(ADMIN_UPDATED_EVENT, handleEvent);
      window.removeEventListener('storage', handleEvent);
    };
  }, [refresh]);

  return {
    store,
    previewAsStudent,
    refreshAdminStore: refresh,
  };
}
