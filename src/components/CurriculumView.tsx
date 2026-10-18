import React, { useState, useEffect } from 'react';
import { Grade, Lesson } from '../types/mathverse';
import { useMathVerse } from '../context/MathVerseContext';
import { CURRICULUM_DATA } from '../data/curriculumData';
import { LessonDetailModal } from './LessonDetailModal';
import { isGradeUnlocked, canTakePromotionExam, PROMOTION_EXAMS } from '../data/promotionExamsData';
import {
  BookOpen,
  CheckCircle2,
  Play,
  Sparkles,
  Filter,
  ChevronRight,
  Lock,
  Award,
  ArrowRight,
  Search,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

export const CurriculumView: React.FC = () => {
  const {
    user,
    updateGrade,
    setSelectedLessonId,
    setActiveTab,
    setLockedGradeAttempt,
    setActivePromotionExamGrade,
    theme,
  } = useMathVerse();
  const isLight = theme === 'light';
  const currentGrade = user?.grade || 6;

  const [activeGradeTab, setActiveGradeTab] = useState<Grade>(currentGrade);
  const [selectedVolumeFilter, setSelectedVolumeFilter] = useState<'all' | 1 | 2>('all');
  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>('all');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalLesson, setActiveModalLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    if (user?.grade && isGradeUnlocked(user, user.grade)) {
      setActiveGradeTab(user.grade);
    }
  }, [user?.grade]);

  // Filter lessons by grade
  const gradeLessons = CURRICULUM_DATA.filter((l) => l.grade === activeGradeTab);

  // Chapters list for this grade (sorted)
  const chapters = [
    'all',
    ...Array.from(new Set(gradeLessons.map((l) => l.chapter).filter(Boolean) as string[])),
  ];

  // Distinct topics in this grade
  const topics = ['all', ...Array.from(new Set(gradeLessons.map((l) => l.topic)))];

  // Filtered lessons
  const filteredLessons = gradeLessons.filter((l) => {
    // Volume filter
    if (selectedVolumeFilter !== 'all' && l.bookVolume !== selectedVolumeFilter) {
      return false;
    }
    // Chapter filter
    if (selectedChapterFilter !== 'all' && l.chapter !== selectedChapterFilter) {
      return false;
    }
    // Topic filter
    if (selectedTopicFilter !== 'all' && l.topic !== selectedTopicFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = l.title.toLowerCase().includes(q);
      const matchObjective = l.objective.toLowerCase().includes(q);
      const matchChapter = (l.chapter || '').toLowerCase().includes(q);
      const matchTopic = l.topic.toLowerCase().includes(q);
      return matchTitle || matchObjective || matchChapter || matchTopic;
    }
    return true;
  });

  const handleOpenLesson = (lesson: Lesson) => {
    soundManager.playClickSound();
    setActiveModalLesson(lesson);
  };

  const handleStartPractice = (lessonId: string) => {
    setActiveModalLesson(null);
    setSelectedLessonId(lessonId);
    setActiveTab('practice');
  };

  const handleTabClick = (g: Grade) => {
    soundManager.playClickSound();
    if (isGradeUnlocked(user, g)) {
      setActiveGradeTab(g);
      updateGrade(g);
      setSelectedVolumeFilter('all');
      setSelectedChapterFilter('all');
      setSelectedTopicFilter('all');
      setSearchQuery('');
    } else {
      soundManager.playWrongSound();
      setLockedGradeAttempt(g);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 border ${
            isLight
              ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
          }`}>
            <BookOpen className="w-3.5 h-3.5" /> Bộ sách Kết nối tri thức với cuộc sống (Tập 1 & Tập 2)
          </div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <span>Bài học Toán Lớp {activeGradeTab} theo SGK</span>
          </h1>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Nội dung chi tiết từng bài học chuẩn theo sách giáo khoa Toán {activeGradeTab} (Tập 1 & Tập 2). Vượt qua bài kiểm tra để lên lớp!
          </p>
        </div>

        {/* Grade tabs with Lock indicator */}
        <div className={`inline-flex p-1 rounded-2xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          {([6, 7, 8, 9] as Grade[]).map((g) => {
            const unlocked = isGradeUnlocked(user, g);
            const isActive = activeGradeTab === g;

            return (
              <button
                key={g}
                onClick={() => handleTabClick(g)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : unlocked
                    ? isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      : 'text-slate-400 hover:text-white'
                    : isLight
                    ? 'text-slate-400 hover:text-slate-600'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span>Lớp {g}</span>
                {!unlocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Promotion Exam Banner for KNTT */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl space-y-3 card-top-accent transition-all ${
        isLight
          ? 'bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 border-slate-200 text-slate-800'
          : 'bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/70 border-indigo-500/40 text-white'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-xl border ${
                isLight ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                <Award className="w-5 h-5" />
              </span>
              <div>
                <h3 className={`text-base sm:text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Bài tập tổng hợp lên lớp (Bộ sách Kết nối tri thức)
                </h3>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  Quy định: Để lên Lớp 7 cần hoàn thành Tổng hợp Lớp 6; để lên Lớp 8 hoặc 9 phải trải qua đủ các kiến thức lớp trước đó.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {PROMOTION_EXAMS.map((exam) => {
              const isEligibleToTake = canTakePromotionExam(user, exam.sourceGrade);
              const isPassed = isEligibleToTake && !!user?.completedGradeExams?.[exam.sourceGrade]?.passed;
              return (
                <button
                  key={exam.id}
                  onClick={() => {
                    if (isEligibleToTake) {
                      soundManager.playClickSound();
                      setActivePromotionExamGrade(exam.sourceGrade);
                    } else {
                      soundManager.playWrongSound();
                      setLockedGradeAttempt(exam.unlocksGrade);
                    }
                  }}
                  title={
                    isEligibleToTake
                      ? `Làm bài thi từ Lớp ${exam.sourceGrade} lên Lớp ${exam.unlocksGrade}`
                      : `Cần hoàn thành kỳ thi lên Lớp ${exam.sourceGrade} trước (theo thứ tự 7 → 8 → 9)`
                  }
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isPassed
                      ? isLight
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                      : isEligibleToTake
                      ? isLight
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-600 hover:text-white'
                        : 'bg-indigo-600/30 border-cyan-400/50 text-cyan-300 hover:bg-indigo-600 hover:text-white'
                      : isLight
                      ? 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:border-amber-500/40 hover:text-amber-300'
                  }`}
                >
                  {isPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : isEligibleToTake ? (
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>Thi lên Lớp {exam.unlocksGrade}</span>
                  {isPassed && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      (Đã đạt)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters Bar: Tập 1 / Tập 2, Search & Chapters */}
      <div className={`p-4 rounded-2xl border space-y-3.5 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Volume Tabs: Tất cả / Tập 1 / Tập 2 */}
          <div className={`inline-flex p-1 rounded-xl border shrink-0 ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}>
            <button
              onClick={() => {
                setSelectedVolumeFilter('all');
                soundManager.playClickSound();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedVolumeFilter === 'all'
                  ? isLight
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-cyan-500 text-slate-950 shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cả năm ({gradeLessons.length} bài)
            </button>
            <button
              onClick={() => {
                setSelectedVolumeFilter(1);
                soundManager.playClickSound();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedVolumeFilter === 1
                  ? isLight
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-500 text-slate-950 shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📖 Tập 1 (Kỳ I)
            </button>
            <button
              onClick={() => {
                setSelectedVolumeFilter(2);
                soundManager.playClickSound();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedVolumeFilter === 2
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📘 Tập 2 (Kỳ II)
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài học, định lý, công thức (VD: Vi-ét, góc nội tiếp, luỹ thừa)..."
              className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:ring-2 focus:outline-none transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-indigo-500'
                  : 'bg-slate-950 border-slate-700/80 text-white placeholder-slate-500 focus:ring-cyan-500'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Chapters selection */}
        {chapters.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className={`shrink-0 flex items-center gap-1 pr-1 font-semibold ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
              <Layers className="w-3.5 h-3.5" /> Chương:
            </span>
            {chapters.map((chap) => {
              const isSelected = selectedChapterFilter === chap;
              const shortName = chap === 'all' ? 'Tất cả chương' : chap.split('.')[0] || chap;
              return (
                <button
                  key={chap}
                  onClick={() => {
                    setSelectedChapterFilter(chap);
                    soundManager.playClickSound();
                  }}
                  title={chap}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap text-[11px] font-bold transition-all cursor-pointer shrink-0 border ${
                    isSelected
                      ? isLight
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-indigo-600/30 border-cyan-400 text-cyan-300'
                      : isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/80'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {shortName}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredLessons.length === 0 && (
        <div className={`text-center py-12 p-8 rounded-3xl border space-y-3 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <BookOpen className={`w-12 h-12 mx-auto ${isLight ? 'text-slate-300' : 'text-slate-600'}`} />
          <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Không tìm thấy bài học phù hợp</h3>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Hãy thử tìm bằng từ khóa khác hoặc đặt lại bộ lọc Tập sách / Chương.
          </p>
          <button
            onClick={() => {
              setSelectedVolumeFilter('all');
              setSelectedChapterFilter('all');
              setSelectedTopicFilter('all');
              setSearchQuery('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              isLight
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            Đặt lại tất cả bộ lọc
          </button>
        </div>
      )}

      {/* Lesson Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLessons.map((lesson) => {
          const isDone = user?.completedLessons.includes(lesson.id);

          return (
            <div
              key={lesson.id}
              className={`group p-5 rounded-2xl border transition-all duration-300 backdrop-blur-md flex flex-col justify-between ${
                isLight
                  ? isDone
                    ? 'bg-white border-emerald-300 hover:border-emerald-400 shadow-xs hover:shadow-md'
                    : 'bg-white border-slate-200/90 hover:border-indigo-300 shadow-xs hover:shadow-md'
                  : isDone
                  ? 'bg-slate-900/80 border-emerald-500/30 hover:border-emerald-500/50 shadow-sm'
                  : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/40 hover:shadow-lg'
              }`}
            >
              <div>
                {/* Meta row: Volume badge + Chapter + Done status */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {lesson.bookVolume && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                          lesson.bookVolume === 1
                            ? isLight
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : isLight
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                        }`}
                      >
                        Tập {lesson.bookVolume}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      isLight
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-slate-800 text-slate-300 border-slate-700/80'
                    }`}>
                      {lesson.topic}
                    </span>
                  </div>

                  {isDone ? (
                    <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      isLight
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" /> Đã học
                    </span>
                  ) : (
                    <span className={`text-[11px] font-semibold flex items-center gap-1 shrink-0 ${
                      isLight ? 'text-indigo-600' : 'text-slate-400'
                    }`}>
                      <Sparkles className="w-3 h-3 text-amber-500" /> +50 XP
                    </span>
                  )}
                </div>

                {/* Chapter title (if any) */}
                {lesson.chapter && (
                  <div className={`text-[11px] font-medium mb-1 truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {lesson.chapter}
                  </div>
                )}

                {/* Title */}
                <h3 className={`text-base sm:text-lg font-bold transition-colors mb-2 leading-snug ${
                  isLight
                    ? 'text-slate-900 group-hover:text-indigo-600'
                    : 'text-white group-hover:text-cyan-300'
                }`}>
                  {lesson.title}
                </h3>

                {/* Objective */}
                <p className={`text-xs line-clamp-2 leading-relaxed mb-4 ${
                  isLight ? 'text-slate-600' : 'text-slate-300/90'
                }`}>
                  {lesson.objective}
                </p>

                {/* Key formulas preview */}
                {lesson.formulas.length > 0 && (
                  <div className={`mb-4 p-2.5 rounded-xl border font-mono text-xs flex items-center gap-2 ${
                    isLight
                      ? 'bg-indigo-50/50 border-indigo-200/80 text-indigo-900 font-semibold'
                      : 'bg-slate-950/60 border-slate-800/80 text-cyan-300'
                  }`}>
                    <span className={`text-[10px] font-sans uppercase ${isLight ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>Công thức:</span>
                    <span className="truncate">{lesson.formulas[0].formula}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className={`flex items-center gap-2 pt-2 border-t ${isLight ? 'border-slate-100' : 'border-slate-800/60'}`}>
                <button
                  onClick={() => handleOpenLesson(lesson)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isLight
                      ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                      : 'bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-400 text-cyan-300 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Chi tiết bài học</span>
                </button>

                <button
                  onClick={() => handleStartPractice(lesson.id)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-transparent'
                  }`}
                >
                  <span>Luyện tập</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lesson Detail Interactive Modal */}
      {activeModalLesson && (
        <LessonDetailModal
          lesson={activeModalLesson}
          onClose={() => setActiveModalLesson(null)}
          onStartPractice={handleStartPractice}
        />
      )}
    </div>
  );
};
