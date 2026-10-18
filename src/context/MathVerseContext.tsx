import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Grade, UserProfile, MistakeRecord } from '../types/mathverse';
import { BADGES_DATA } from '../data/badgesData';
import { CURRICULUM_DATA } from '../data/curriculumData';
import { QUESTIONS_DATA } from '../data/questionsData';
import { soundManager } from '../utils/soundEffects';
import { isGradeUnlocked } from '../data/promotionExamsData';
import { analyzeStudentCompetency } from '../utils/aiCompetencyAnalytics';
import { shouldPromptWeeklySurvey, markUserSurveyCompleted } from '../utils/userSurvey';
import {
  getCustomAvatarLocally,
  saveCustomAvatarLocally,
  loadCustomAvatarAsync,
  isMediaAvatar,
} from '../utils/mediaUtils';
import { PublicProfileUser } from '../components/PublicUserProfileModal';
import {
  ROOT_ADMIN_EMAIL,
  ensureOwnerAdminEmailBound,
  checkIsUserAdmin,
  checkIsUserBanned,
  useAdminStore,
  BannedUserEntry,
} from '../utils/adminUtils';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import {
  saveLearningResult,
  upsertLearningProgress,
  fetchUserLearningResults,
  fetchUserLearningProgress,
  syncUserLeaderboardEntry,
  registerDisplayNameLocally,
  LearningResultRecord,
  LearningProgressRecord,
} from '../utils/supabaseDb';

export type CloudSyncStatus = 'idle' | 'saving' | 'saved' | 'error';

interface MathVerseContextType {
  user: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedLessonId: string | null;
  setSelectedLessonId: (id: string | null) => void;
  selectedPracticeTopic: string | null;
  setSelectedPracticeTopic: (topic: string | null) => void;
  lockedGradeAttempt: Grade | null;
  setLockedGradeAttempt: (grade: Grade | null) => void;
  activePromotionExamGrade: Grade | null;
  setActivePromotionExamGrade: (grade: Grade | null) => void;
  isSurveyModalOpen: boolean;
  openSurveyModal: () => void;
  closeSurveyModal: () => void;
  login: (name: string, grade: Grade, avatar: string, email?: string) => void;
  loginAsGuest: (name: string, grade: Grade, avatar: string) => void;
  logout: () => void;
  addXp: (amount: number, reason?: string) => void;
  completeLesson: (lessonId: string) => void;
  recordQuestionResult: (
    questionId: string,
    isCorrect: boolean,
    topic: string,
    questionText: string,
    userAnswer: string,
    correctAnswer: string,
    explanation: string,
    xpEarned: number,
    silent?: boolean
  ) => void;
  toggleSound: () => void;
  updateGrade: (grade: Grade) => void;
  unlockGrade: (sourceGrade: Grade, nextGrade: Grade, score: number, total: number) => void;
  updateProfile: (name: string, avatar: string) => void;
  resetAllData: () => void;
  markMistakeUnderstood: (questionId: string) => void;
  removeMistakeRecord: (questionId: string) => void;
  recentXpGained: { amount: number; reason?: string } | null;
  newBadgeUnlocked: string | null;
  clearNewBadge: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  // Supabase Cloud State & Actions
  supabaseUserId: string | null;
  cloudResults: LearningResultRecord[];
  cloudProgress: LearningProgressRecord[];
  loadingCloud: boolean;
  cloudError: string | null;
  cloudSyncStatus: CloudSyncStatus;
  isAuthenticatedSupabase: boolean;
  refreshCloudData: () => Promise<void>;
  saveLessonProgressToCloud: (
    record: Omit<LearningProgressRecord, 'id' | 'user_id' | 'updated_at'>
  ) => Promise<boolean>;
  saveLessonResultToCloud: (
    record: Omit<LearningResultRecord, 'id' | 'user_id' | 'completed_at'>
  ) => Promise<boolean>;
  viewingPublicProfile: PublicProfileUser | null;
  setViewingPublicProfile: (profile: PublicProfileUser | null) => void;
  isAdmin: boolean;
  isRootAdmin: boolean;
  userEmail: string;
  updateUserEmail: (email: string) => void;
  bannedInfo: BannedUserEntry | null;
  recordSpeedDuelScore: (mode: string, score: number, streak: number) => void;
  syncAllDataNow: () => Promise<{ ok: boolean; message: string }>;
  isSyncingData: boolean;
}

const STORAGE_KEY = 'mathverse_user_profile_v1';

const DEFAULT_TOPIC_STATS: Record<string, { correct: number; total: number }> = {
  'Số học': { correct: 0, total: 0 },
  'Phân số': { correct: 0, total: 0 },
  'Đại số': { correct: 0, total: 0 },
  'Hình học': { correct: 0, total: 0 },
  'Thống kê': { correct: 0, total: 0 },
};

const defaultProfile: UserProfile = {
  name: '',
  grade: 6,
  avatar: '👨‍🚀',
  xp: 0,
  streak: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  completedLessons: [],
  answeredQuestionsCount: 0,
  correctAnswersCount: 0,
  timeSpentSeconds: 0,
  unlockedBadges: [],
  topicStats: {
    'Số học': { correct: 0, total: 0 },
    'Phân số': { correct: 0, total: 0 },
    'Đại số': { correct: 0, total: 0 },
    'Hình học': { correct: 0, total: 0 },
    'Thống kê': { correct: 0, total: 0 },
  },
  recentMistakes: [],
  soundEnabled: true,
  unlockedGrades: [6],
  completedGradeExams: {},
};

// Helper to match a Supabase lesson_id or lesson_title to a curriculum lesson ID
function resolveCurriculumLessonId(
  lessonId?: string,
  lessonTitle?: string,
  gradeLevel?: number
): string | null {
  if (lessonId && CURRICULUM_DATA.some((l) => l.id === lessonId)) {
    return lessonId;
  }
  if (lessonTitle) {
    const cleanTitle = lessonTitle.replace(/^Bài học\s+/i, '').trim().toLowerCase();
    const byExact = CURRICULUM_DATA.find(
      (l) =>
        (!gradeLevel || l.grade === Number(gradeLevel)) &&
        (l.title.trim().toLowerCase() === cleanTitle || l.id.toLowerCase() === cleanTitle)
    );
    if (byExact) return byExact.id;

    const byPartial = CURRICULUM_DATA.find(
      (l) =>
        (!gradeLevel || l.grade === Number(gradeLevel)) &&
        (cleanTitle.includes(l.title.trim().toLowerCase()) ||
          l.title.trim().toLowerCase().includes(cleanTitle))
    );
    if (byPartial) return byPartial.id;
  }
  if (lessonId) {
    const numMatch = String(lessonId).match(/(?:bai|lesson|b)[-_]?(\d+)/i);
    if (numMatch) {
      const lessonNum = parseInt(numMatch[1], 10);
      const byNum = CURRICULUM_DATA.find(
        (l) => l.grade === (Number(gradeLevel) || 6) && l.lessonNumber === lessonNum
      );
      if (byNum) return byNum.id;
    }
  }
  return null;
}

function normalizeTopicName(rawTopic?: string, lessonId?: string): string {
  const validTopics = ['Số học', 'Phân số', 'Đại số', 'Hình học', 'Thống kê'];
  if (rawTopic && validTopics.includes(rawTopic)) {
    return rawTopic;
  }
  if (lessonId) {
    const matchedLesson = CURRICULUM_DATA.find((l) => l.id === lessonId);
    if (matchedLesson && validTopics.includes(matchedLesson.topic)) {
      return matchedLesson.topic;
    }
  }
  if (rawTopic) {
    const lower = rawTopic.toLowerCase();
    if (lower.includes('phân số')) return 'Phân số';
    if (lower.includes('đại số') || lower.includes('phương trình') || lower.includes('hàm số')) return 'Đại số';
    if (lower.includes('hình học') || lower.includes('tam giác') || lower.includes('đường tròn')) return 'Hình học';
    if (lower.includes('thống kê') || lower.includes('xác suất')) return 'Thống kê';
  }
  return 'Số học';
}

function computeStreakFromDates(dateStrings: string[]): number {
  const uniqueDays = Array.from(
    new Set(
      dateStrings
        .filter(Boolean)
        .map((d) => {
          try {
            return new Date(d).toISOString().split('T')[0];
          } catch {
            return '';
          }
        })
        .filter(Boolean)
    )
  ).sort((a, b) => (a > b ? -1 : 1));

  if (uniqueDays.length === 0) return 1;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let streak = 1;
  let currentRef = uniqueDays[0] === today || uniqueDays[0] === yesterday ? uniqueDays[0] : today;

  for (let i = 1; i < uniqueDays.length; i++) {
    const prevDate = new Date(new Date(currentRef).getTime() - 86400000)
      .toISOString()
      .split('T')[0];
    if (uniqueDays[i] === prevDate) {
      streak += 1;
      currentRef = uniqueDays[i];
    } else {
      break;
    }
  }
  return Math.max(1, streak);
}

function safeSaveProfileToStorage(profile: UserProfile): void {
  try {
    const userKey = (profile as any).id || profile.name || 'default';
    if (profile.name) {
      registerDisplayNameLocally(profile.name, userKey);
    }
    if (isMediaAvatar(profile.avatar)) {
      saveCustomAvatarLocally(userKey, profile.avatar);
      saveCustomAvatarLocally(profile.name, profile.avatar);
    }
    // If avatar is larger than 100KB (e.g., GIF or Video), store a compact placeholder in localStorage
    // while keeping the full media in IndexedDB + memory cache to prevent QuotaExceededError.
    const storageProfile =
      profile.avatar && profile.avatar.length > 100 * 1024
        ? { ...profile, avatar: '👨‍🚀' }
        : profile;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageProfile));
  } catch {
    try {
      const compactProfile = {
        ...profile,
        avatar: isMediaAvatar(profile.avatar) ? '👨‍🚀' : profile.avatar || '👨‍🚀',
        recentMistakes: (profile.recentMistakes || []).slice(0, 15),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compactProfile));
    } catch {
      // Ignore storage quota error cleanly
    }
  }
}

const MathVerseContext = createContext<MathVerseContextType | undefined>(undefined);

export const MathVerseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          const today = new Date().toISOString().split('T')[0];
          const rawExams = { ...(parsed.completedGradeExams || {}) };
          const validUnlocked: Grade[] = [6];
          if (rawExams[6]?.passed) {
            validUnlocked.push(7);
          } else {
            delete rawExams[7];
            delete rawExams[8];
          }
          if (rawExams[6]?.passed && rawExams[7]?.passed) {
            validUnlocked.push(8);
          } else {
            delete rawExams[8];
          }
          if (rawExams[6]?.passed && rawExams[7]?.passed && rawExams[8]?.passed) {
            validUnlocked.push(9);
          }
          const validGrade: Grade = validUnlocked.includes(parsed.grade)
            ? parsed.grade
            : validUnlocked[validUnlocked.length - 1] || 6;
          const cachedAvatar =
            getCustomAvatarLocally((parsed as any).id) ||
            getCustomAvatarLocally(parsed.name) ||
            parsed.avatar ||
            '👨‍🚀';
          try {
            localStorage.removeItem('mathverse_admin_owner_bound_v1');
          } catch {}
          let validEmail: string | undefined = undefined;
          if (!parsed.isGuest && parsed.email && typeof parsed.email === 'string') {
            const cleanE = parsed.email.trim().toLowerCase();
            if (cleanE === ROOT_ADMIN_EMAIL.toLowerCase()) {
              validEmail = ROOT_ADMIN_EMAIL;
            } else if (cleanE.includes('@')) {
              validEmail = cleanE;
            }
          }
          return {
            ...defaultProfile,
            ...parsed,
            email: validEmail,
            isGuest: Boolean(parsed.isGuest),
            avatar: cachedAvatar,
            grade: validGrade,
            unlockedGrades: validUnlocked,
            completedGradeExams: rawExams,
            lastActiveDate: today,
          };
        }
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedPracticeTopic, setSelectedPracticeTopic] = useState<string | null>(null);
  const [recentXpGained, setRecentXpGained] = useState<{ amount: number; reason?: string } | null>(null);
  const [newBadgeUnlocked, setNewBadgeUnlocked] = useState<string | null>(null);

  const [lockedGradeAttempt, setLockedGradeAttempt] = useState<Grade | null>(null);
  const [activePromotionExamGrade, setActivePromotionExamGrade] = useState<Grade | null>(null);

  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const openSurveyModal = () => setIsSurveyModalOpen(true);
  const closeSurveyModal = () => setIsSurveyModalOpen(false);
  const hasAutoPromptedSurveyRef = useRef<boolean>(false);

  const [viewingPublicProfile, setViewingPublicProfile] = useState<PublicProfileUser | null>(null);
  const { store: adminStore } = useAdminStore();

  // Supabase Cloud State
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [cloudResults, setCloudResults] = useState<LearningResultRecord[]>([]);
  const [cloudProgress, setCloudProgress] = useState<LearningProgressRecord[]>([]);
  const [loadingCloud, setLoadingCloud] = useState<boolean>(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
  const [isAuthenticatedSupabase, setIsAuthenticatedSupabase] = useState<boolean>(false);
  const supabaseUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || hasAutoPromptedSurveyRef.current) return;
    const surveyKey = supabaseUserId || (user as any)?.id || user.name;
    if (shouldPromptWeeklySurvey(user, surveyKey, cloudResults)) {
      hasAutoPromptedSurveyRef.current = true;
      const timer = setTimeout(() => {
        setIsSurveyModalOpen(true);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [user, supabaseUserId, cloudResults]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('mathverse_theme_v1');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'light';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('mathverse_theme_v1', next);
      } catch {}
      return next;
    });
  };

  // Check badges whenever user profile changes
  const checkBadgeUnlocks = useCallback((updatedUser: UserProfile, silent = false): UserProfile => {
    const newlyUnlocked: string[] = [];
    const currentBadges = new Set(updatedUser.unlockedBadges);

    BADGES_DATA.forEach((badge) => {
      if (!currentBadges.has(badge.id)) {
        if (badge.checkUnlocked(updatedUser)) {
          currentBadges.add(badge.id);
          newlyUnlocked.push(badge.title);
        }
      }
    });

    if (!silent && newlyUnlocked.length > 0) {
      setNewBadgeUnlocked(newlyUnlocked[0]);
      soundManager.triggerBigCelebration();
    }

    return {
      ...updatedUser,
      unlockedBadges: Array.from(currentBadges),
    };
  }, []);

  // Aggregate a full UserProfile from Supabase learning_results and learning_progress
  const buildProfileFromCloudData = useCallback(
    (
      authUser: any,
      results: LearningResultRecord[],
      progress: LearningProgressRecord[],
      prevProfile: UserProfile | null
    ): UserProfile => {
      const meta = authUser?.user_metadata || {};
      const isSameUser = (prevProfile as any)?.id === authUser?.id;

      // Determine grade: prefer user_metadata.grade, then same-user prevProfile.grade, then most recent grade_level in Supabase
      let detectedGrade: Grade = 6;
      if ([6, 7, 8, 9].includes(Number(meta.grade))) {
        detectedGrade = Number(meta.grade) as Grade;
      } else if (isSameUser && prevProfile?.grade && [6, 7, 8, 9].includes(prevProfile.grade)) {
        detectedGrade = prevProfile.grade;
      } else if (results.length > 0 && [6, 7, 8, 9].includes(Number(results[0].grade_level))) {
        detectedGrade = Number(results[0].grade_level) as Grade;
      } else if (progress.length > 0 && [6, 7, 8, 9].includes(Number(progress[0].grade_level))) {
        detectedGrade = Number(progress[0].grade_level) as Grade;
      }

      const name: string =
        meta.name ||
        (isSameUser ? prevProfile?.name : '') ||
        authUser?.email?.split('@')[0] ||
        'Học sinh';
      const localCustomAvatar =
        getCustomAvatarLocally(authUser?.id) || getCustomAvatarLocally(name);
      const avatar: string =
        localCustomAvatar ||
        meta.avatar ||
        (isSameUser ? prevProfile?.avatar : '') ||
        '👨‍🚀';
      const today = new Date().toISOString().split('T')[0];

      const completedLessonIds = new Set<string>();
      const gradeLessons = CURRICULUM_DATA.filter((l) => l.grade === detectedGrade);

      let totalCorrect = 0;
      let totalWrong = 0;
      let totalXp = 0;

      const topicStats: Record<string, { correct: number; total: number }> = {
        'Số học': { correct: 0, total: 0 },
        'Phân số': { correct: 0, total: 0 },
        'Đại số': { correct: 0, total: 0 },
        'Hình học': { correct: 0, total: 0 },
        'Thống kê': { correct: 0, total: 0 },
      };

      const mistakesMap = new Map<string, MistakeRecord>();
      if (isSameUser && prevProfile?.recentMistakes) {
        prevProfile.recentMistakes.forEach((m) => {
          if (m.questionId) mistakesMap.set(m.questionId, m);
        });
      }

      const completedGradeExams: Record<number, any> = {
        ...(meta.completedGradeExams || {}),
        ...(isSameUser ? prevProfile?.completedGradeExams || {} : {}),
      };

      const activityDates: string[] = [today];
      let unmatchedCompletedInGrade = 0;
      let hasCountedSurveyXp = false;

      // 1. Process learning_results
      results.forEach((r, idx) => {
        if (r.completed_at) activityDates.push(r.completed_at);

        let c = Math.max(0, Number(r.correct_count) || 0);
        let w = Math.max(0, Number(r.wrong_count) || 0);
        const comp = Number(r.completion_percent ?? 100);
        const scoreVal = Number(r.score || 0);
        const isTheoryOnly = r.answers && r.answers.type === 'lesson_theory';
        const isSurveyReward =
          String(r.lesson_id) === 'user-survey-once' ||
          String(r.lesson_id).startsWith('survey-') ||
          (r.answers && r.answers.type === 'weekly_survey');

        // Reconstruct promotion exams if present
        const promoMatch = String(r.lesson_id).match(/promotion-grade-(\d)-to-(\d)/i);
        if (promoMatch || (r.answers && r.answers.type === 'promotion_exam')) {
          const srcG = promoMatch ? Number(promoMatch[1]) : Number(r.grade_level);
          if ([6, 7, 8].includes(srcG) && scoreVal >= 70) {
            completedGradeExams[srcG] = {
              passed: true,
              score: c || Math.round(scoreVal / 10),
              total: c + w || 10,
              date: r.completed_at ? r.completed_at.split('T')[0] : today,
            };
          }
        }

        // If a result row was saved with score > 0 and c === 0 && w === 0 (and not a survey/theory)
        if (!isTheoryOnly && !isSurveyReward && c === 0 && w === 0 && scoreVal > 0) {
          if (scoreVal <= 10) {
            c = Math.round(scoreVal);
            w = Math.max(0, 10 - c);
          } else {
            c = Math.round(scoreVal / 10);
            w = Math.max(0, 10 - c);
          }
        }

        if (!isTheoryOnly && !isSurveyReward) {
          totalCorrect += c;
          totalWrong += w;
        }

        // Calculate XP from this result (Survey reward is strictly counted once: +30 XP)
        if (isSurveyReward) {
          markUserSurveyCompleted(authUser?.id || name);
          if (!hasCountedSurveyXp) {
            totalXp += 30;
            hasCountedSurveyXp = true;
          }
        } else if (r.answers && typeof r.answers.xpEarned === 'number' && r.answers.xpEarned > 0) {
          totalXp += Number(r.answers.xpEarned);
        } else {
          const matchedCurrId = resolveCurriculumLessonId(
            r.lesson_id,
            r.lesson_title,
            r.grade_level || detectedGrade
          );
          const matchedLessonObj = matchedCurrId
            ? CURRICULUM_DATA.find((l) => l.id === matchedCurrId)
            : null;
          const baseLessonXp = matchedLessonObj?.xpReward || (comp >= 50 ? 50 : 25);
          const questionXp = isTheoryOnly ? 0 : c * 15 + w * 2;
          totalXp += baseLessonXp + questionXp;
        }

        // Resolve completed lesson ID for curriculum progress
        if (!isSurveyReward) {
          const matchedCurrId = resolveCurriculumLessonId(
            r.lesson_id,
            r.lesson_title,
            r.grade_level || detectedGrade
          );
          if (matchedCurrId) {
            completedLessonIds.add(matchedCurrId);
          } else if (r.lesson_id) {
            completedLessonIds.add(r.lesson_id);
            if (!r.grade_level || Number(r.grade_level) === detectedGrade) {
              unmatchedCompletedInGrade += 1;
            }
          } else {
            completedLessonIds.add(`result-${idx}`);
            unmatchedCompletedInGrade += 1;
          }
        }

        // Aggregate topic stats
        if (r.answers && r.answers.topicBreakdown && typeof r.answers.topicBreakdown === 'object') {
          Object.entries(r.answers.topicBreakdown).forEach(([tKey, statVal]: [string, any]) => {
            const normT = normalizeTopicName(tKey, r.lesson_id);
            if (!topicStats[normT]) topicStats[normT] = { correct: 0, total: 0 };
            topicStats[normT].correct += Number(statVal?.correct) || 0;
            topicStats[normT].total += Number(statVal?.total) || 0;
          });
        } else if (!isSurveyReward) {
          const normT = normalizeTopicName(r.topic, r.lesson_id);
          if (!topicStats[normT]) topicStats[normT] = { correct: 0, total: 0 };
          if (c + w > 0) {
            topicStats[normT].correct += c;
            topicStats[normT].total += c + w;
          } else if (isTheoryOnly) {
            // Count completed theory lesson as 1 mastered concept in that topic if no questions yet
            topicStats[normT].correct += 1;
            topicStats[normT].total += 1;
          }
        }

        // Extract mistakes if stored in answers
        if (r.answers && Array.isArray(r.answers.mistakes)) {
          r.answers.mistakes.forEach((m: MistakeRecord) => {
            if (m && m.questionId && !mistakesMap.has(m.questionId)) {
              mistakesMap.set(m.questionId, m);
            }
          });
        } else if (w > 0 && !isSurveyReward) {
          // Synthesize a review item from QUESTIONS_DATA for this topic if detailed mistake wasn't saved
          const normT = normalizeTopicName(r.topic, r.lesson_id);
          const sampleQ = QUESTIONS_DATA.find(
            (q) => q.grade === (Number(r.grade_level) || detectedGrade) && q.topic === normT
          );
          if (sampleQ && !mistakesMap.has(sampleQ.id)) {
            mistakesMap.set(sampleQ.id, {
              questionId: sampleQ.id,
              questionText: sampleQ.question,
              topic: normT,
              userAnswer: 'Cần ôn tập lại',
              correctAnswer: String(sampleQ.correctAnswer),
              explanation: sampleQ.explanation,
              timestamp: r.completed_at ? new Date(r.completed_at).getTime() : Date.now(),
              failCount: w,
              isResolved: false,
            });
          }
        }
      });

      // Map unmatched completed records in this grade to gradeLessons so progress % is accurate
      if (unmatchedCompletedInGrade > 0) {
        let toAssign = unmatchedCompletedInGrade;
        for (const gl of gradeLessons) {
          if (toAssign <= 0) break;
          if (!completedLessonIds.has(gl.id)) {
            completedLessonIds.add(gl.id);
            toAssign -= 1;
          }
        }
      }

      // 2. Process learning_progress
      const resultLessonIds = new Set(results.map((r) => r.lesson_id));
      progress.forEach((p) => {
        if (p.updated_at) activityDates.push(p.updated_at);

        if (p.status === 'completed' || Number(p.progress_percent) >= 100) {
          const matchedCurrId = resolveCurriculumLessonId(
            p.lesson_id,
            p.lesson_title,
            p.grade_level || detectedGrade
          );
          if (matchedCurrId) {
            completedLessonIds.add(matchedCurrId);
          } else if (p.lesson_id) {
            completedLessonIds.add(p.lesson_id);
          }
        }

        // If this progress record hasn't been finalized into learning_results yet, include its active question stats & XP
        if (!resultLessonIds.has(p.lesson_id)) {
          const pCorrect = Number(p.answers?.correctCount) || 0;
          const pWrong = Number(p.answers?.wrongCount) || 0;
          const pPct = Number(p.progress_percent) || 0;

          if (pCorrect + pWrong > 0) {
            totalCorrect += pCorrect;
            totalWrong += pWrong;
            const normT = normalizeTopicName(p.topic, p.lesson_id);
            if (!topicStats[normT]) topicStats[normT] = { correct: 0, total: 0 };
            topicStats[normT].correct += pCorrect;
            topicStats[normT].total += pCorrect + pWrong;
          }

          if (p.answers && typeof p.answers.xpEarned === 'number' && p.answers.xpEarned > 0) {
            totalXp += Number(p.answers.xpEarned);
          } else if (pCorrect + pWrong > 0) {
            totalXp += pCorrect * 15 + pWrong * 2;
          } else if (pPct > 0) {
            totalXp += Math.max(10, Math.round(pPct * 0.5));
          }

          if (p.answers && Array.isArray(p.answers.mistakes)) {
            p.answers.mistakes.forEach((m: MistakeRecord) => {
              if (m && m.questionId && !mistakesMap.has(m.questionId)) {
                mistakesMap.set(m.questionId, m);
              }
            });
          }
        }
      });

      // Sequential grade unlocking: Grade 6 always unlocked; 7 requires passing 6; 8 requires 6 & 7; 9 requires 6, 7 & 8
      const unlockedGrades: Grade[] = [6];
      if (completedGradeExams[6]?.passed) {
        unlockedGrades.push(7);
      } else {
        delete completedGradeExams[7];
        delete completedGradeExams[8];
      }
      if (completedGradeExams[6]?.passed && completedGradeExams[7]?.passed) {
        unlockedGrades.push(8);
      } else {
        delete completedGradeExams[8];
      }
      if (
        completedGradeExams[6]?.passed &&
        completedGradeExams[7]?.passed &&
        completedGradeExams[8]?.passed
      ) {
        unlockedGrades.push(9);
      }
      if (!unlockedGrades.includes(detectedGrade)) {
        detectedGrade = unlockedGrades[unlockedGrades.length - 1] || 6;
      }

      const streak = computeStreakFromDates(activityDates);
      const answeredQuestionsCount = totalCorrect + totalWrong;
      const estimatedSeconds =
        answeredQuestionsCount * 90 + completedLessonIds.size * 600;

      // Combine calculated cloud XP with any bonus XP stored in user_metadata.xp
      const metaXp = Number(meta.xp) || 0;
      const finalXp =
        results.length > 0 || progress.length > 0
          ? Math.max(totalXp, metaXp)
          : metaXp;

      const hydrated: UserProfile = {
        ...defaultProfile,
        ...(isSameUser ? prevProfile || {} : {}),
        name,
        email: authUser?.email || (isSameUser ? prevProfile?.email : '') || ROOT_ADMIN_EMAIL,
        grade: detectedGrade,
        avatar,
        xp: finalXp,
        streak,
        lastActiveDate: today,
        completedLessons: Array.from(completedLessonIds),
        answeredQuestionsCount,
        correctAnswersCount: totalCorrect,
        timeSpentSeconds: estimatedSeconds,
        topicStats,
        recentMistakes: Array.from(mistakesMap.values()).slice(0, 50),
        unlockedGrades,
        completedGradeExams,
      };
      (hydrated as any).id = authUser?.id;

      const withBadges = checkBadgeUnlocks(hydrated, true);
      queueMicrotask(() => {
        analyzeStudentCompetency(withBadges);
      });
      return withBadges;
    },
    [checkBadgeUnlocks]
  );

  // Fetch & sync cloud data for current authenticated Supabase user
  const syncCloudForUser = useCallback(
    async (authUser: any) => {
      if (!isSupabaseConfigured || !authUser?.id) return;
      supabaseUserIdRef.current = authUser.id;
      setSupabaseUserId(authUser.id);
      setIsAuthenticatedSupabase(true);
      setLoadingCloud(true);
      setCloudError(null);

      try {
        const [resResults, resProgress] = await Promise.all([
          fetchUserLearningResults(authUser.id),
          fetchUserLearningProgress(authUser.id),
        ]);

        if (resResults.error || resProgress.error) {
          const errMsg =
            resResults.error?.message ||
            resProgress.error?.message ||
            'Không thể tải dữ liệu học tập từ Supabase.';
          setCloudError(errMsg);
        }

        const resultsList = resResults.data || [];
        const progressList = resProgress.data || [];

        setCloudResults(resultsList);
        setCloudProgress(progressList);

        let syncedProfile: UserProfile | null = null;
        setUser((prev) => {
          const updated = buildProfileFromCloudData(authUser, resultsList, progressList, prev);
          syncedProfile = updated;
          safeSaveProfileToStorage(updated);
          return updated;
        });

        // Sync verified participant entry to Leaderboard
        if (syncedProfile) {
          const prof = syncedProfile as UserProfile;
          const inProgCount = progressList.filter((p) => p.status === 'in_progress').length;
          const wrongCount = Math.max(0, prof.answeredQuestionsCount - prof.correctAnswersCount);
          await syncUserLeaderboardEntry({
            user_id: authUser.id,
            display_name: prof.name,
            avatar: prof.avatar,
            grade: prof.grade,
            score: prof.xp,
            completed_lessons: Math.max(prof.completedLessons.length, resultsList.length),
            in_progress_lessons: inProgCount,
            correct_count: prof.correctAnswersCount,
            wrong_count: wrongCount,
          });
        }
      } catch (err: any) {
        setCloudError(err?.message || 'Lỗi kết nối đến cơ sở dữ liệu Supabase.');
      } finally {
        setLoadingCloud(false);
      }
    },
    [buildProfileFromCloudData]
  );

  const refreshCloudData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await syncCloudForUser(session.user);
      }
    } catch (e) {
      console.error('Error refreshing Supabase data:', e);
    }
  }, [syncCloudForUser]);

  // Supabase session initialization & listener
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncCloudForUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        syncCloudForUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        supabaseUserIdRef.current = null;
        setSupabaseUserId(null);
        setIsAuthenticatedSupabase(false);
        setCloudResults([]);
        setCloudProgress([]);
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncCloudForUser]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (user) {
      soundManager.setSoundEnabled(user.soundEnabled ?? true);
      safeSaveProfileToStorage(user);
    }
  }, [user]);

  // Hydrate large custom GIF/Video avatar from IndexedDB if not already in memory
  useEffect(() => {
    if (!user) return;
    if (isMediaAvatar(user.avatar)) return;
    let cancelled = false;
    const key = supabaseUserId || (user as any).id || user.name;
    loadCustomAvatarAsync(key).then((idbAvatar) => {
      if (!cancelled && idbAvatar && isMediaAvatar(idbAvatar)) {
        setUser((prev) => (prev ? { ...prev, avatar: idbAvatar } : null));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.name, supabaseUserId]);

  const saveLessonProgressToCloud = useCallback(
    async (
      record: Omit<LearningProgressRecord, 'id' | 'user_id' | 'updated_at'>
    ): Promise<boolean> => {
      if (!isSupabaseConfigured) return false;
      setCloudSyncStatus('saving');
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          setCloudSyncStatus('idle');
          return false;
        }
        const safeCloudAvatar =
          user?.avatar && user.avatar.length < 32000
            ? user.avatar
            : session.user.user_metadata?.avatar || '👨‍🚀';
        const payload: Omit<LearningProgressRecord, 'id'> = {
          ...record,
          answers: {
            ...(record.answers || {}),
            userName: user?.name || session.user.user_metadata?.name,
            userAvatar: safeCloudAvatar,
          },
          user_id: session.user.id,
          updated_at: new Date().toISOString(),
        };
        const { error } = await upsertLearningProgress(payload);
        if (error) {
          console.error('Supabase upsert progress error:', error);
          setCloudSyncStatus('error');
          setCloudError(error.message || 'Lưu tiến độ thất bại.');
          return false;
        }
        setCloudSyncStatus('saved');
        await syncCloudForUser(session.user);
        return true;
      } catch (err: any) {
        setCloudSyncStatus('error');
        setCloudError(err?.message || 'Lỗi mạng khi lưu tiến độ.');
        return false;
      }
    },
    [syncCloudForUser, user?.name, user?.avatar]
  );

  const saveLessonResultToCloud = useCallback(
    async (
      record: Omit<LearningResultRecord, 'id' | 'user_id' | 'completed_at'>
    ): Promise<boolean> => {
      if (!isSupabaseConfigured) return false;
      setCloudSyncStatus('saving');
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          setCloudSyncStatus('idle');
          return false;
        }
        const nowIso = new Date().toISOString();
        const safeCloudAvatar =
          user?.avatar && user.avatar.length < 32000
            ? user.avatar
            : session.user.user_metadata?.avatar || '👨‍🚀';
        const enrichedAnswers = {
          ...(record.answers || {}),
          userName: user?.name || session.user.user_metadata?.name,
          userAvatar: safeCloudAvatar,
        };
        const resultPayload: Omit<LearningResultRecord, 'id'> = {
          ...record,
          answers: enrichedAnswers,
          user_id: session.user.id,
          completed_at: nowIso,
        };
        const { error } = await saveLearningResult(resultPayload);
        if (error) {
          console.error('Supabase save result error:', error);
          setCloudSyncStatus('error');
          setCloudError(error.message || 'Lưu kết quả bài học thất bại.');
          return false;
        }

        // Also mark corresponding learning_progress as completed
        await upsertLearningProgress({
          user_id: session.user.id,
          lesson_id: record.lesson_id,
          lesson_title: record.lesson_title,
          grade_level: record.grade_level,
          topic: record.topic,
          current_question: record.correct_count + record.wrong_count,
          answers: enrichedAnswers,
          progress_percent: 100,
          status: 'completed',
          updated_at: nowIso,
        });

        setCloudSyncStatus('saved');
        await syncCloudForUser(session.user);
        return true;
      } catch (err: any) {
        setCloudSyncStatus('error');
        setCloudError(err?.message || 'Lỗi mạng khi lưu kết quả.');
        return false;
      }
    },
    [syncCloudForUser, user?.name, user?.avatar]
  );

  const login = async (name: string, grade: Grade, avatar: string, email?: string) => {
    const today = new Date().toISOString().split('T')[0];
    soundManager.playTriumphSound();

    // If authenticated with Supabase, hydrate directly from Supabase without wiping out XP
    if (isSupabaseConfigured) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const resolvedEmail = (email || session.user.email || '').trim().toLowerCase();
        setUser((prev) => {
          if (prev && (prev as any).id === session.user.id) {
            return {
              ...prev,
              name: name || prev.name,
              email: resolvedEmail || undefined,
              isGuest: false,
              avatar: avatar || prev.avatar,
            };
          }
          const initial: UserProfile = {
            ...defaultProfile,
            name,
            email: resolvedEmail || undefined,
            isGuest: false,
            grade,
            avatar,
            unlockedGrades: [6],
            completedGradeExams: {},
            lastActiveDate: today,
            streak: 1,
          };
          (initial as any).id = session.user.id;
          return initial;
        });
        await syncCloudForUser(session.user);
        return;
      }
    }

    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : undefined;
    const initialUser: UserProfile = {
      ...defaultProfile,
      name,
      email: cleanEmail,
      isGuest: false,
      grade,
      avatar,
      unlockedGrades: [6],
      completedGradeExams: {},
      lastActiveDate: today,
      streak: 1,
    };
    setUser(initialUser);
    safeSaveProfileToStorage(initialUser);
  };

  const loginAsGuest = (name: string, grade: Grade, avatar: string) => {
    setIsAuthenticatedSupabase(false);
    setSupabaseUserId(null);
    try {
      localStorage.removeItem('mathverse_admin_owner_bound_v1');
    } catch {}
    const today = new Date().toISOString().split('T')[0];

    const guestUser: UserProfile = {
      ...defaultProfile,
      name,
      email: undefined, // Guest NEVER has admin email or any email
      isGuest: true,
      grade,
      avatar,
      unlockedGrades: [6],
      completedGradeExams: {},
      lastActiveDate: today,
      streak: 1,
    };
    setUser(guestUser);
    safeSaveProfileToStorage(guestUser);
    soundManager.playTriumphSound();
  };

  const updateUserEmail = (newEmail: string) => {
    const cleaned = (newEmail || '').trim().toLowerCase();
    setUser((prev) => (prev ? { ...prev, email: cleaned || undefined } : null));
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
    supabaseUserIdRef.current = null;
    setSupabaseUserId(null);
    setIsAuthenticatedSupabase(false);
    setCloudResults([]);
    setCloudProgress([]);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    setActiveTab('dashboard');
  };

  const addXp = (amount: number, reason?: string) => {
    if (!user || amount <= 0) return;
    setRecentXpGained({ amount, reason });
    setTimeout(() => setRecentXpGained(null), 3000);

    let nextXpValue = user.xp + amount;
    setUser((prev) => {
      if (!prev) return null;
      nextXpValue = prev.xp + amount;
      const updated = {
        ...prev,
        xp: nextXpValue,
      };
      return checkBadgeUnlocks(updated);
    });

    if (isSupabaseConfigured && isAuthenticatedSupabase) {
      supabase.auth.updateUser({ data: { xp: nextXpValue } }).catch(() => {});
      if (supabaseUserIdRef.current) {
        const wrongCount = Math.max(0, user.answeredQuestionsCount - user.correctAnswersCount);
        syncUserLeaderboardEntry({
          user_id: supabaseUserIdRef.current,
          display_name: user.name,
          avatar: user.avatar,
          grade: user.grade,
          score: nextXpValue,
          completed_lessons: Math.max(user.completedLessons.length, cloudResults.length),
          in_progress_lessons: cloudProgress.filter((p) => p.status === 'in_progress').length,
          correct_count: user.correctAnswersCount,
          wrong_count: wrongCount,
        }).catch(() => {});
      }
    }
  };

  const completeLesson = async (lessonId: string) => {
    if (!user) return;
    const isNew = !user.completedLessons.includes(lessonId);
    const lessonObj = CURRICULUM_DATA.find((l) => l.id === lessonId);
    const rewardXp = lessonObj?.xpReward || 50;

    let nextXp = user.xp;
    setUser((prev) => {
      if (!prev) return null;
      if (!isNew) return prev;
      nextXp = prev.xp + rewardXp;
      const updated = {
        ...prev,
        completedLessons: [...prev.completedLessons, lessonId],
        xp: nextXp,
      };
      return checkBadgeUnlocks(updated);
    });

    if (isNew) {
      soundManager.triggerConfetti();
      soundManager.playTriumphSound();
      setRecentXpGained({ amount: rewardXp, reason: 'Hoàn thành bài học' });
      setTimeout(() => setRecentXpGained(null), 3000);

      if (isSupabaseConfigured) {
        supabase.auth.updateUser({ data: { xp: nextXp } }).catch(() => {});
        await saveLessonResultToCloud({
          lesson_id: lessonId,
          lesson_title: lessonObj?.title || `Bài học ${lessonId}`,
          grade_level: lessonObj?.grade || user.grade || 6,
          topic: lessonObj?.topic || 'Số học',
          score: 100,
          correct_count: 1,
          wrong_count: 0,
          completion_percent: 100,
          answers: {
            type: 'lesson_theory',
            xpEarned: rewardXp,
          },
        });
      }
    }
  };

  const recordQuestionResult = (
    questionId: string,
    isCorrect: boolean,
    topic: string,
    questionText: string,
    userAnswer: string,
    correctAnswer: string,
    explanation: string,
    xpEarned: number,
    silent: boolean = false
  ) => {
    if (!user) return;

    const gainedXp = isCorrect ? xpEarned : 2;
    if (!silent) {
      setRecentXpGained({
        amount: gainedXp,
        reason: isCorrect ? 'Trả lời chính xác!' : 'Nỗ lực luyện tập',
      });
      setTimeout(() => setRecentXpGained(null), 2500);

      if (isCorrect) {
        soundManager.playCorrectSound();
      } else {
        soundManager.playWrongSound();
      }
    }

    let finalProfileSnapshot: UserProfile | null = null;

    setUser((prev) => {
      if (!prev) return null;

      const normTopic = normalizeTopicName(topic);
      const prevTopic = prev.topicStats[normTopic] || { correct: 0, total: 0 };
      const updatedTopicStats = {
        ...prev.topicStats,
        [normTopic]: {
          correct: prevTopic.correct + (isCorrect ? 1 : 0),
          total: prevTopic.total + 1,
        },
      };

      let mistakes = [...(prev.recentMistakes || [])];
      if (!isCorrect) {
        const existingIdx = mistakes.findIndex((m) => m.questionId === questionId);
        if (existingIdx >= 0) {
          const old = mistakes[existingIdx];
          const updatedRecord: MistakeRecord = {
            ...old,
            questionText,
            topic: normTopic,
            userAnswer,
            correctAnswer,
            explanation,
            timestamp: Date.now(),
            failCount: (old.failCount || 1) + 1,
            isResolved: false,
          };
          mistakes.splice(existingIdx, 1);
          mistakes.unshift(updatedRecord);
        } else {
          const newMistake: MistakeRecord = {
            questionId,
            questionText,
            topic: normTopic,
            userAnswer,
            correctAnswer,
            explanation,
            timestamp: Date.now(),
            failCount: 1,
            isResolved: false,
          };
          mistakes.unshift(newMistake);
        }
        mistakes = mistakes.slice(0, 50);
      } else {
        const existingIdx = mistakes.findIndex((m) => m.questionId === questionId);
        if (existingIdx >= 0) {
          mistakes[existingIdx] = {
            ...mistakes[existingIdx],
            isResolved: true,
            resolvedAt: Date.now(),
          };
        }
      }

      const updated: UserProfile = {
        ...prev,
        answeredQuestionsCount: prev.answeredQuestionsCount + 1,
        correctAnswersCount: prev.correctAnswersCount + (isCorrect ? 1 : 0),
        xp: prev.xp + gainedXp,
        topicStats: updatedTopicStats,
        recentMistakes: mistakes,
      };

      const finalUser = checkBadgeUnlocks(updated);
      finalProfileSnapshot = finalUser;
      queueMicrotask(() => {
        analyzeStudentCompetency(finalUser);
      });

      return finalUser;
    });

    if (isSupabaseConfigured && isAuthenticatedSupabase && finalProfileSnapshot) {
      const snap = finalProfileSnapshot as UserProfile;
      supabase.auth.updateUser({ data: { xp: snap.xp } }).catch(() => {});
    }
  };

  const toggleSound = () => {
    setUser((prev) => {
      if (!prev) return null;
      const nextSound = !prev.soundEnabled;
      soundManager.setSoundEnabled(nextSound);
      return { ...prev, soundEnabled: nextSound };
    });
  };

  const updateGrade = (grade: Grade) => {
    if (!user) return;
    if (!isGradeUnlocked(user, grade)) {
      soundManager.playWrongSound();
      setLockedGradeAttempt(grade);
      return;
    }
    setUser((prev) => (prev ? { ...prev, grade } : null));
    if (isSupabaseConfigured && isAuthenticatedSupabase) {
      supabase.auth.updateUser({ data: { grade } }).catch(() => {});
    }
  };

  const unlockGrade = (sourceGrade: Grade, nextGrade: Grade, score: number, total: number) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    let nextExamsMap: Record<number, any> = {};
    let nextXp = user.xp + 150;

    setUser((prev) => {
      if (!prev) return null;
      const newUnlocked = prev.unlockedGrades.includes(nextGrade)
        ? prev.unlockedGrades
        : ([...prev.unlockedGrades, nextGrade] as Grade[]);

      nextExamsMap = {
        ...prev.completedGradeExams,
        [sourceGrade]: {
          passed: true,
          score,
          total,
          date: today,
        },
      };
      nextXp = prev.xp + 150;

      const updated: UserProfile = {
        ...prev,
        grade: nextGrade,
        unlockedGrades: newUnlocked,
        xp: nextXp,
        completedGradeExams: nextExamsMap,
      };

      return checkBadgeUnlocks(updated);
    });

    setRecentXpGained({ amount: 150, reason: `Mở khóa thành công Lớp ${nextGrade}` });
    setTimeout(() => setRecentXpGained(null), 3500);

    if (isSupabaseConfigured) {
      saveLessonResultToCloud({
        lesson_id: `promotion-grade-${sourceGrade}-to-${nextGrade}`,
        lesson_title: `Kỳ thi Vượt cấp Lớp ${sourceGrade} lên Lớp ${nextGrade}`,
        grade_level: sourceGrade,
        topic: 'Số học',
        score: Math.round((score / Math.max(1, total)) * 100),
        correct_count: score,
        wrong_count: Math.max(0, total - score),
        completion_percent: 100,
        answers: {
          type: 'promotion_exam',
          xpEarned: 150,
          unlockedGrade: nextGrade,
        },
      });
      supabase.auth
        .updateUser({
          data: {
            grade: nextGrade,
            xp: nextXp,
            completedGradeExams: nextExamsMap,
          },
        })
        .catch(() => {});
    }
  };

  const updateProfile = (name: string, avatar: string) => {
    const userKey = supabaseUserId || (user as any)?.id || name;
    if (isMediaAvatar(avatar)) {
      saveCustomAvatarLocally(userKey, avatar);
      saveCustomAvatarLocally(name, avatar);
    } else {
      saveCustomAvatarLocally(userKey, '');
      saveCustomAvatarLocally(name, '');
    }
    setUser((prev) => (prev ? { ...prev, name, avatar } : null));
    if (isSupabaseConfigured && isAuthenticatedSupabase) {
      // Only store avatar in Supabase auth user_metadata if it's small enough (< 100KB) to avoid JWT bloat
      const safeMetaAvatar = avatar.length < 100000 ? avatar : undefined;
      supabase.auth
        .updateUser({
          data: safeMetaAvatar ? { name, avatar: safeMetaAvatar } : { name },
        })
        .catch(() => {});
    }
  };

  const resetAllData = () => {
    if (!user) return;
    const cleanUser: UserProfile = {
      ...defaultProfile,
      name: user.name,
      grade: 6,
      avatar: user.avatar,
      topicStats: { ...DEFAULT_TOPIC_STATS },
    };
    setUser(cleanUser);
    safeSaveProfileToStorage(cleanUser);
  };

  const clearNewBadge = () => {
    setNewBadgeUnlocked(null);
  };

  const markMistakeUnderstood = (questionId: string) => {
    if (!user) return;
    soundManager.playCorrectSound();
    setUser((prev) => {
      if (!prev) return null;
      const updatedMistakes = (prev.recentMistakes || []).map((m) => {
        if (m.questionId === questionId) {
          return {
            ...m,
            isResolved: true,
            resolvedAt: Date.now(),
          };
        }
        return m;
      });

      const updated = {
        ...prev,
        recentMistakes: updatedMistakes,
      };
      queueMicrotask(() => {
        analyzeStudentCompetency(updated);
      });
      return updated;
    });
  };

  const removeMistakeRecord = (questionId: string) => {
    if (!user) return;
    soundManager.playClickSound();
    setUser((prev) => {
      if (!prev) return null;
      const updatedMistakes = (prev.recentMistakes || []).filter((m) => m.questionId !== questionId);
      const updated = {
        ...prev,
        recentMistakes: updatedMistakes,
      };
      queueMicrotask(() => {
        analyzeStudentCompetency(updated);
      });
      return updated;
    });
  };

  const [isSyncingData, setIsSyncingData] = useState(false);

  const recordSpeedDuelScore = useCallback(
    (mode: string, score: number, streak: number) => {
      setUser((prev) => {
        if (!prev) return null;
        const currentRecord = prev.speedDuelRecord || {
          highScore: 0,
          maxStreak: 0,
          modeScores: {},
        };
        const prevModeBest = currentRecord.modeScores?.[mode] || 0;
        const nextModeScores = {
          ...(currentRecord.modeScores || {}),
          [mode]: Math.max(prevModeBest, score),
        };
        const nextHighScore = Math.max(currentRecord.highScore || 0, score);
        const nextMaxStreak = Math.max(currentRecord.maxStreak || 0, streak);

        const updatedRecord = {
          highScore: nextHighScore,
          maxStreak: nextMaxStreak,
          modeScores: nextModeScores,
          lastAchievedAt: new Date().toISOString(),
        };

        const updated = {
          ...prev,
          speedDuelRecord: updatedRecord,
        };
        safeSaveProfileToStorage(updated);
        return updated;
      });

      // Also persist to Supabase user metadata if logged in
      if (isSupabaseConfigured && isAuthenticatedSupabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            const prevMeta = session.user.user_metadata || {};
            const prevRecord = prevMeta.speedDuelRecord || {};
            const updatedRecord = {
              highScore: Math.max(prevRecord.highScore || 0, score),
              maxStreak: Math.max(prevRecord.maxStreak || 0, streak),
              modeScores: {
                ...(prevRecord.modeScores || {}),
                [mode]: Math.max(prevRecord.modeScores?.[mode] || 0, score),
              },
              lastAchievedAt: new Date().toISOString(),
            };
            supabase.auth.updateUser({
              data: { speedDuelRecord: updatedRecord },
            }).catch(() => {});
          }
        });
      }
    },
    [isAuthenticatedSupabase]
  );

  const syncAllDataNow = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (!user) return { ok: false, message: 'Chưa có thông tin học sinh để đồng bộ.' };
    setIsSyncingData(true);
    try {
      // 1. Force local storage save
      safeSaveProfileToStorage(user);

      // 2. Sync to online leaderboard with STRICT real user.xp
      const targetUserId = supabaseUserIdRef.current || `local_${user.name}`;
      const wrongCount = Math.max(0, user.answeredQuestionsCount - user.correctAnswersCount);
      await syncUserLeaderboardEntry({
        user_id: targetUserId,
        display_name: user.name,
        avatar: user.avatar,
        grade: user.grade,
        score: user.xp, // STRICT: ALWAYS exact authentic user.xp
        completed_lessons: user.completedLessons.length,
        in_progress_lessons: cloudProgress.filter((p) => p.status === 'in_progress').length,
        correct_count: user.correctAnswersCount,
        wrong_count: wrongCount,
        updated_at: new Date().toISOString(),
      });

      // 3. Sync to Supabase Cloud if authenticated
      if (isSupabaseConfigured && isAuthenticatedSupabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.auth.updateUser({
            data: {
              name: user.name,
              avatar: user.avatar && user.avatar.length < 32000 ? user.avatar : '👨‍🚀',
              grade: user.grade,
              xp: user.xp,
              streak: user.streak,
              completedLessons: user.completedLessons,
              speedDuelRecord: user.speedDuelRecord,
            },
          });
          await syncCloudForUser(session.user);
        }
      }

      setCloudSyncStatus('saved');
      soundManager.playLevelUpSound();
      return { ok: true, message: 'Đã đồng bộ hóa toàn bộ dữ liệu học tập lên máy chủ thành công!' };
    } catch (err: any) {
      setCloudSyncStatus('error');
      return { ok: false, message: err?.message || 'Không thể kết nối đến máy chủ đồng bộ.' };
    } finally {
      setIsSyncingData(false);
    }
  }, [user, cloudProgress, isAuthenticatedSupabase, syncCloudForUser]);

  const userEmail = (user?.email || '').trim().toLowerCase();
  const isRootAdmin = userEmail === ROOT_ADMIN_EMAIL.toLowerCase();
  const isAdmin = checkIsUserAdmin(user?.name, userEmail, adminStore, false);
  const bannedInfo = user
    ? checkIsUserBanned(
        {
          user_id: supabaseUserId || (user as any)?.id || '',
          username: user.name,
          email: userEmail,
        },
        adminStore
      )
    : null;

  return (
    <MathVerseContext.Provider
      value={{
        user,
        activeTab,
        setActiveTab,
        selectedLessonId,
        setSelectedLessonId,
        selectedPracticeTopic,
        setSelectedPracticeTopic,
        lockedGradeAttempt,
        setLockedGradeAttempt,
        activePromotionExamGrade,
        setActivePromotionExamGrade,
        isSurveyModalOpen,
        openSurveyModal,
        closeSurveyModal,
        login,
        loginAsGuest,
        logout,
        addXp,
        completeLesson,
        recordQuestionResult,
        toggleSound,
        updateGrade,
        unlockGrade,
        updateProfile,
        resetAllData,
        markMistakeUnderstood,
        removeMistakeRecord,
        recentXpGained,
        newBadgeUnlocked,
        clearNewBadge,
        theme,
        setTheme,
        toggleTheme,
        supabaseUserId,
        cloudResults,
        cloudProgress,
        loadingCloud,
        cloudError,
        cloudSyncStatus,
        isAuthenticatedSupabase,
        refreshCloudData,
        saveLessonProgressToCloud,
        saveLessonResultToCloud,
        viewingPublicProfile,
        setViewingPublicProfile,
        isAdmin,
        isRootAdmin,
        userEmail,
        updateUserEmail,
        bannedInfo,
        recordSpeedDuelScore,
        syncAllDataNow,
        isSyncingData,
      }}
    >
      {children}
    </MathVerseContext.Provider>
  );
};

export const useMathVerse = () => {
  const context = useContext(MathVerseContext);
  if (!context) {
    throw new Error('useMathVerse must be used within a MathVerseProvider');
  }
  return context;
};
