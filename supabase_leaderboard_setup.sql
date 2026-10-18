-- =============================================================================
-- CẤU HÌNH BẢNG XẾP HẠNG & THỐNG KÊ THỰC TẾ CHO VŨ TRỤ TOÁN HỌC (SUPABASE SQL)
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- =============================================================================

-- 1. Tạo bảng lưu trữ bảng xếp hạng người học đã xác thực (leaderboard_entries)
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Học sinh MathVerse',
  avatar TEXT NOT NULL DEFAULT '👨‍🚀',
  grade INTEGER NOT NULL DEFAULT 6 CHECK (grade IN (6, 7, 8, 9)),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  completed_lessons INTEGER NOT NULL DEFAULT 0 CHECK (completed_lessons >= 0),
  in_progress_lessons INTEGER NOT NULL DEFAULT 0 CHECK (in_progress_lessons >= 0),
  questions_answered INTEGER NOT NULL DEFAULT 0 CHECK (questions_answered >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  wrong_count INTEGER NOT NULL DEFAULT 0 CHECK (wrong_count >= 0),
  accuracy_rate INTEGER CHECK (accuracy_rate IS NULL OR (accuracy_rate >= 0 AND accuracy_rate <= 100)),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ràng buộc chống gửi điểm ảo: điểm không được vượt quá giới hạn hợp lý của số bài & số câu đã làm
  CONSTRAINT valid_score_bound CHECK (
    (completed_lessons = 0 AND questions_answered = 0 AND score = 0)
    OR (score <= (completed_lessons * 250 + correct_count * 35 + wrong_count * 5 + 600))
  )
);

-- 2. Bật Row Level Security (RLS)
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- 3. Cấp quyền truy cập bảng
GRANT SELECT ON public.leaderboard_entries TO anon, authenticated;
GRANT INSERT, UPDATE ON public.leaderboard_entries TO authenticated;

-- 4. Policy: Cho phép mọi người đọc bảng xếp hạng công khai (không chứa email/mật khẩu)
DROP POLICY IF EXISTS "Public can view leaderboard" ON public.leaderboard_entries;
CREATE POLICY "Public can view leaderboard"
  ON public.leaderboard_entries
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Policy: Người dùng đã đăng nhập chỉ được thêm/cập nhật hàng của chính mình (auth.uid() = user_id)
DROP POLICY IF EXISTS "Users can insert own leaderboard entry" ON public.leaderboard_entries;
CREATE POLICY "Users can insert own leaderboard entry"
  ON public.leaderboard_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own leaderboard entry" ON public.leaderboard_entries;
CREATE POLICY "Users can update own leaderboard entry"
  ON public.leaderboard_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Hàm RPC tổng hợp trực tiếp từ learning_results, learning_progress và leaderboard_entries
-- Giúp lấy bảng xếp hạng và thống kê số người thực tế trên toàn hệ thống mà không lộ thông tin nhạy cảm
CREATE OR REPLACE FUNCTION public.get_public_leaderboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH combined_users AS (
    SELECT user_id FROM public.learning_results
    UNION
    SELECT user_id FROM public.learning_progress
    UNION
    SELECT user_id FROM public.leaderboard_entries
  ),
  agg_results AS (
    SELECT
      user_id,
      COUNT(DISTINCT lesson_id) AS completed_lessons,
      COALESCE(SUM(GREATEST(0, correct_count)), 0) AS res_correct,
      COALESCE(SUM(GREATEST(0, wrong_count)), 0) AS res_wrong,
      COALESCE(SUM(
        CASE
          WHEN (answers->>'xpEarned') ~ '^[0-9]+$' THEN (answers->>'xpEarned')::INTEGER
          ELSE 50 + GREATEST(0, correct_count) * 15 + GREATEST(0, wrong_count) * 2
        END
      ), 0) AS res_xp,
      MAX(completed_at) AS last_completed_at,
      MAX(grade_level) AS last_grade,
      MAX(answers->>'userName') AS meta_name,
      MAX(answers->>'userAvatar') AS meta_avatar
    FROM public.learning_results
    GROUP BY user_id
  ),
  agg_progress AS (
    SELECT
      user_id,
      COUNT(DISTINCT CASE WHEN status = 'in_progress' THEN lesson_id END) AS in_progress_lessons,
      COUNT(DISTINCT CASE WHEN status = 'completed' OR progress_percent >= 100 THEN lesson_id END) AS prog_completed,
      MAX(updated_at) AS last_updated_at,
      MAX(grade_level) AS prog_grade,
      MAX(answers->>'userName') AS prog_name,
      MAX(answers->>'userAvatar') AS prog_avatar
    FROM public.learning_progress
    GROUP BY user_id
  ),
  merged AS (
    SELECT
      u.user_id,
      COALESCE(
        le.display_name,
        ar.meta_name,
        ap.prog_name,
        'Học sinh #' || SUBSTRING(u.user_id::TEXT FROM 1 FOR 6)
      ) AS display_name,
      COALESCE(le.avatar, ar.meta_avatar, ap.prog_avatar, '👨‍🚀') AS avatar,
      COALESCE(le.grade, ar.last_grade, ap.prog_grade, 6) AS grade,
      GREATEST(COALESCE(le.score, 0), COALESCE(ar.res_xp, 0)) AS score,
      GREATEST(COALESCE(le.completed_lessons, 0), COALESCE(ar.completed_lessons, 0), COALESCE(ap.prog_completed, 0)) AS completed_lessons,
      GREATEST(COALESCE(le.in_progress_lessons, 0), COALESCE(ap.in_progress_lessons, 0)) AS in_progress_lessons,
      GREATEST(COALESCE(le.correct_count, 0), COALESCE(ar.res_correct, 0)) AS correct_count,
      GREATEST(COALESCE(le.wrong_count, 0), COALESCE(ar.res_wrong, 0)) AS wrong_count,
      GREATEST(
        COALESCE(le.updated_at, '1970-01-01'::TIMESTAMPTZ),
        COALESCE(ar.last_completed_at, '1970-01-01'::TIMESTAMPTZ),
        COALESCE(ap.last_updated_at, '1970-01-01'::TIMESTAMPTZ)
      ) AS updated_at
    FROM combined_users u
    LEFT JOIN public.leaderboard_entries le ON le.user_id = u.user_id
    LEFT JOIN agg_results ar ON ar.user_id = u.user_id
    LEFT JOIN agg_progress ap ON ap.user_id = u.user_id
  )
  SELECT jsonb_build_object(
    'stats', jsonb_build_object(
      'totalParticipants', (SELECT COUNT(*) FROM merged),
      'activeLearnersCount', (SELECT COUNT(*) FROM merged WHERE completed_lessons > 0 OR in_progress_lessons > 0 OR (correct_count + wrong_count) > 0),
      'validRankedUsersCount', (SELECT COUNT(*) FROM merged WHERE score > 0 AND (completed_lessons > 0 OR (correct_count + wrong_count) > 0))
    ),
    'entries', COALESCE((
      SELECT jsonb_agg(row_to_json(ranked_rows))
      FROM (
        SELECT
          ROW_NUMBER() OVER (
            ORDER BY
              m.score DESC,
              CASE WHEN (m.correct_count + m.wrong_count) > 0 THEN ROUND((m.correct_count::NUMERIC / (m.correct_count + m.wrong_count)) * 100) ELSE 0 END DESC,
              m.correct_count DESC,
              m.completed_lessons DESC,
              m.updated_at ASC
          ) AS rank,
          m.user_id,
          m.display_name,
          m.avatar,
          m.grade,
          m.score,
          m.completed_lessons,
          m.in_progress_lessons,
          (m.correct_count + m.wrong_count) AS questions_answered,
          m.correct_count,
          m.wrong_count,
          CASE
            WHEN (m.correct_count + m.wrong_count) > 0 THEN ROUND((m.correct_count::NUMERIC / (m.correct_count + m.wrong_count)) * 100)::INTEGER
            WHEN m.completed_lessons > 0 THEN 100
            ELSE NULL
          END AS accuracy_rate,
          m.updated_at
        FROM merged m
        WHERE m.score > 0 AND (m.completed_lessons > 0 OR (m.correct_count + m.wrong_count) > 0)
        ORDER BY
          m.score DESC,
          CASE WHEN (m.correct_count + m.wrong_count) > 0 THEN ROUND((m.correct_count::NUMERIC / (m.correct_count + m.wrong_count)) * 100) ELSE 0 END DESC,
          m.correct_count DESC,
          m.completed_lessons DESC,
          m.updated_at ASC
        LIMIT 100
      ) ranked_rows
    ), '[]'::JSONB)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_leaderboard() TO anon, authenticated;
