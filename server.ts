import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '15mb' }));

  // Gemini API client initialization
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // In-memory rate limiter (max 30 requests per minute per IP)
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000;
  const MAX_REQUESTS_PER_WINDOW = 30;

  // Cached health state to prevent quota exhaustion
  let cachedHealth: {
    online: boolean;
    status: 'online' | 'offline' | 'ONLINE' | 'OFFLINE';
    message: string;
    detail?: string;
    model?: string;
    provider?: string;
    latencyMs?: number;
    error?: string;
    timestamp: string;
  } | null = null;
  let lastHealthCheckTime = 0;
  const HEALTH_CACHE_TTL_MS = 30000; // 30 seconds

  // Real Gemini Health Check handler
  const handleHealthCheck = async (req: express.Request, res: express.Response) => {
    const isForce = req.query && (req.query.force === 'true' || req.query.force === '1');
    const now = Date.now();

    if (!isForce && cachedHealth && now - lastHealthCheckTime < HEALTH_CACHE_TTL_MS) {
      const statusCode = cachedHealth.online ? 200 : 503;
      return res.status(statusCode).json(cachedHealth);
    }

    if (!process.env.GEMINI_API_KEY || !ai) {
      cachedHealth = {
        status: 'offline',
        online: false,
        error: 'MISSING_KEY',
        message: 'Chưa cấu hình API Key.',
        detail: 'Chưa cấu hình biến môi trường GEMINI_API_KEY trên server.',
        provider: 'Google Gemini',
        timestamp: new Date().toISOString(),
      };
      lastHealthCheckTime = now;
      return res.status(503).json(cachedHealth);
    }

    const startTime = Date.now();
    try {
      let response;
      const candidateModels = [
        process.env.GEMINI_MODEL,
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-3.8-flash',
        'gemini-4-argon',
      ].filter((m): m is string => Boolean(m));

      let modelUsed = candidateModels[0] || 'gemini-3.1-flash-lite';
      let lastErr: unknown = null;

      for (const m of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: m,
            contents: 'ping',
            config: {
              maxOutputTokens: 5,
              temperature: 0.1,
            },
          });
          if (response && typeof response.text === 'string') {
            modelUsed = m;
            lastErr = null;
            break;
          }
        } catch (mErr) {
          lastErr = mErr;
          continue;
        }
      }

      if (lastErr || !response || typeof response.text !== 'string') {
        throw lastErr || new Error('Phản hồi từ Gemini API không hợp lệ.');
      }

      const latencyMs = Date.now() - startTime;

      cachedHealth = {
        status: 'online',
        online: true,
        message: 'MathBot AI đã kết nối thành công.',
        provider: 'Google Gemini',
        model: modelUsed,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
      lastHealthCheckTime = Date.now();
      return res.status(200).json(cachedHealth);
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      let errString = err instanceof Error ? err.message : String(err);
      if (process.env.GEMINI_API_KEY) {
        errString = errString.replaceAll(process.env.GEMINI_API_KEY, '[REDACTED_API_KEY]');
      }

      let errorCode = 'CONNECTION_FAILED';
      let detailMsg = 'Không thể kết nối đến dịch vụ Google Gemini.';

      if (errString.includes('API_KEY_INVALID') || errString.includes('401') || errString.includes('403')) {
        errorCode = 'AUTH_FAILED';
        detailMsg = 'API Key không hợp lệ hoặc không có quyền truy cập.';
      } else if (errString.includes('RESOURCE_EXHAUSTED') || errString.includes('429')) {
        errorCode = 'RATE_LIMITED';
        detailMsg = 'Dịch vụ AI đang bị giới hạn số lần gọi hoặc hết hạn ngạch (429 Quota Exceeded).';
      } else if (errString.includes('timeout') || errString.includes('abort') || errString.includes('ETIMEDOUT')) {
        errorCode = 'TIMEOUT';
        detailMsg = 'Yêu cầu kiểm tra API mất quá nhiều thời gian (hết thời gian chờ).';
      }

      console.warn(`[Gemini Health Probe] Offline (${errorCode}):`, detailMsg);

      cachedHealth = {
        status: 'offline',
        online: false,
        error: errorCode,
        message: 'Không thể kết nối Gemini API.',
        detail: detailMsg,
        provider: 'Google Gemini',
        latencyMs,
        timestamp: new Date().toISOString(),
      };
      lastHealthCheckTime = Date.now();
      return res.status(503).json(cachedHealth);
    }
  };

  // Mount health check on both /api/mathbot/health and /api/health
  app.get('/api/mathbot/health', handleHealthCheck);
  app.get('/api/health', handleHealthCheck);

  // Mount Leaderboard API endpoint (/api/leaderboard)
  app.all('/api/leaderboard', async (req, res) => {
    try {
      const mod = await import('./api/leaderboard.js');
      const leaderboardHandler = mod.default;
      return await leaderboardHandler(req, res);
    } catch (err) {
      console.error('Leaderboard API error:', err);
      return res.status(500).json({ error: 'Không thể tải dữ liệu' });
    }
  });

  // Mount Admin API endpoint (/api/admin)
  app.all('/api/admin', async (req, res) => {
    try {
      const mod = await import('./api/admin.js');
      const adminHandler = mod.default;
      return await adminHandler(req, res);
    } catch (err) {
      console.error('Admin API error:', err);
      return res.status(500).json({ error: 'Không thể xử lý yêu cầu Admin' });
    }
  });

  // API endpoint for MathBot
  app.post('/api/mathbot', async (req, res) => {
    // Basic IP rate limiting
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const rateData = rateLimitMap.get(clientIp);

    if (rateData && now < rateData.resetTime) {
      if (rateData.count >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({
          error: 'Em đang hỏi hơi nhanh, hãy đợi 1 chút để MathBot trả lời nhé!',
          reply: '✨ **MathBot đang tiếp nhận nhiều câu hỏi!**\n\nEm vui lòng đợi khoảng 30 giây rồi hãy gửi câu hỏi tiếp theo để đảm bảo chất lượng giải bài nhé!'
        });
      }
      rateData.count += 1;
    } else {
      rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    }

    try {
      const { message, grade, topic, history, image } = req.body;

      if ((!message || typeof message !== 'string' || !message.trim()) && !(image && image.data)) {
        return res.status(400).json({ error: 'Nội dung tin nhắn không hợp lệ' });
      }

      const safeMessage =
        typeof message === 'string' && message.trim()
          ? message.trim()
          : 'Hãy phân tích hình ảnh/video bài toán này và hướng dẫn cách giải chi tiết từng bước.';

      // If Gemini API is available, call gemini-3.8-flash
      if (ai && process.env.GEMINI_API_KEY) {
        const SYSTEM_PROMPT = `
Bạn là MathVerse AI – Gia sư Toán THCS.

Nguyên tắc bắt buộc:

1. Phạm vi trả lời:
- Chỉ trả lời: Toán THCS, Học tập, Kỹ năng tư duy logic.
- Không trả lời: Chính trị, Bạo lực, Hack, Nội dung ngoài giáo dục.

2. Phương pháp sư phạm:
- Không đưa đáp án ngay.
- Luôn hướng dẫn từng bước.
- Luôn giải thích vì sao.

3. Tính chính xác & Trung thực:
- Tuyệt đối không được bịa.
- Không được tự suy diễn.
- Không được tự tạo công thức.
- Mọi kết quả phải tính toán lại trước khi trả lời.

4. Xử lý khi thiếu dữ kiện hoặc chưa rõ:
- Nếu không biết: "Tôi chưa có đủ thông tin để trả lời."
- Nếu bài toán thiếu dữ kiện: "Hãy cung cấp thêm dữ kiện."
- Nếu không chắc chắn: "Tôi không chắc chắn về kết quả này."

5. Sau mỗi lời giải:
"Hãy tự kiểm tra lại kết quả."
`;

        const prompt = `
${SYSTEM_PROMPT}

Câu hỏi:

${safeMessage}
`;

        // Format history safely
        const contents: any[] = [];
        if (Array.isArray(history) && history.length > 0) {
          for (const item of history.slice(-6)) {
            const textContent = String(item.content || item.text || '').trim();
            if (textContent) {
              contents.push({
                role: item.role === 'user' ? 'user' : 'model',
                parts: [{ text: textContent }],
              });
            }
          }
        }

        const userParts: any[] = [];
        if (image && image.data && image.mimeType) {
          userParts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data,
            },
          });
        }
        userParts.push({ text: prompt.trim() });

        contents.push({
          role: 'user',
          parts: userParts,
        });

        const candidateModels = [
          process.env.GEMINI_MODEL,
          'gemini-3.1-flash-lite',
          'gemini-flash-latest',
          'gemini-3.8-flash',
          'gemini-4-argon',
        ].filter((m): m is string => Boolean(m));

        let response = null;
        let lastErr: unknown = null;

        for (const model of candidateModels) {
          try {
            response = await ai.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction: SYSTEM_PROMPT.trim(),
                temperature: 0.7,
              },
            });
            if (response && response.text) {
              lastErr = null;
              break;
            }
          } catch (mErr) {
            lastErr = mErr;
            continue;
          }
        }

        if (response && response.text) {
          return res.json({ reply: response.text });
        }

        if (lastErr) {
          throw lastErr;
        }
      }

      // Offline intelligent educational fallback if API key is not configured
      const fallbackReply = generateFallbackResponse(safeMessage, grade);
      return res.json({ reply: fallbackReply });
    } catch (err: unknown) {
      let errString = err instanceof Error ? err.message : String(err);
      if (process.env.GEMINI_API_KEY) {
        errString = errString.replaceAll(process.env.GEMINI_API_KEY, '[REDACTED_API_KEY]');
      }
      console.warn('[MathBot] AI request fallback activated (rate-limit or offline):', errString.slice(0, 160));
      // Friendly fallback in case of rate limit or connection issue
      const fallbackReply = generateFallbackResponse(req.body?.message || '', req.body?.grade || 6);
      return res.json({ reply: fallbackReply });
    }
  });

  // Local educational rule-based responder for common middle school queries
  function generateFallbackResponse(query: string, gradeNum?: number): string {
    const q = query.toLowerCase();

    if (q.includes('phương trình') || q.includes('tìm x') || q.includes('2x')) {
      return `✨ **Hướng dẫn giải phương trình cho em:**\n\n` +
        `**Nguyên tắc "Chuyển vế đổi dấu":**\n` +
        `• Khi chuyển một số hạng từ vế này sang vế kia, ta phải đổi dấu của số hạng đó (+ thành -, - thành +).\n` +
        `• Ví dụ tìm x: 2x + 5 = 15\n` +
        `  - **Bước 1:** Chuyển +5 sang vế phải thành -5:\n` +
        `    2x = 15 - 5 ⇒ 2x = 10\n` +
        `  - **Bước 2:** Chia cả hai vế cho 2:\n` +
        `    x = 10 : 2 = 5\n` +
        `  - **Kết luận:** Vậy nghiệm của phương trình là x = 5.\n\n` +
        `💡 *Mẹo của MathBot:* Luôn thử lại đáp án bằng cách thay x vào phương trình ban đầu nhé!`;
    }

    if (q.includes('phân số') || q.includes('quy đồng') || q.includes('mẫu số')) {
      return `✨ **Bí quyết với Phân số:**\n\n` +
        `**1. Vì sao 2 phân số bằng nhau?**\n` +
        `Hai phân số a/b = c/d khi và chỉ khi tích chéo bằng nhau: a . d = b . c.\n\n` +
        `**2. Quy đồng mẫu số 3 bước cực dễ:**\n` +
        `• **Bước 1:** Tìm Mẫu số chung (thường là BCNN của các mẫu số).\n` +
        `• **Bước 2:** Tìm thừa số phụ bằng cách lấy Mẫu chung chia cho từng mẫu.\n` +
        `• **Bước 3:** Nhân cả tử và mẫu với thừa số phụ tương ứng.\n\n` +
        `💡 *Ví dụ:* Cộng 1/2 + 1/3 = 3/6 + 2/6 = 5/6. Em đã hiểu chưa nào?`;
    }

    if (q.includes('hình thang') || q.includes('diện tích hình thang')) {
      return `✨ **Công thức diện tích hình thang:**\n\n` +
        `📐 **Công thức:**\n` +
        `S = [(a + b) . h] / 2\n` +
        `Trong đó:\n` +
        `• a: đáy nhỏ, b: đáy lớn (cùng đơn vị đo)\n` +
        `• h: chiều cao tương ứng\n\n` +
        `🎵 *Bài thơ nhớ nhanh:* \n` +
        `"Muốn tính diện tích hình thang\n` +
        `Đáy lớn đáy nhỏ ta mang cộng vào\n` +
        `Thế rồi nhân với chiều cao\n` +
        `Chia đôi lấy nửa thế nào cũng ra!"\n\n` +
        `Em có bài tập hình thang nào cụ thể muốn cùng MathBot giải không?`;
    }

    if (q.includes('tam giác') || q.includes('pythagore') || q.includes('pitago')) {
      return `✨ **Định lý Pythagore (Toán 7 & 8):**\n\n` +
        `📐 **Trong một tam giác vuông:**\n` +
        `Bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông.\n` +
        `$$c^2 = a^2 + b^2$$\n\n` +
        `• Ví dụ bộ ba số quen thuộc: $(3, 4, 5)$ vì $3^2 + 4^2 = 9 + 16 = 25 = 5^2$.\n` +
        `• Bộ ba số: $(6, 8, 10)$, $(5, 12, 13)$.\n\n` +
        `💡 *Ứng dụng:* Khi biết độ dài 2 cạnh bất kì của tam giác vuông, ta luôn tính được cạnh còn lại!`;
    }

    if (q.includes('số âm') || q.includes('số nguyên') || q.includes('dấu')) {
      return `✨ **Quy tắc dấu khi nhân, chia số nguyên:**\n\n` +
        `• **Cùng dấu ra DƯƠNG:**\n` +
        `  $(+) \\times (+) = (+)$\n` +
        `  $(-) \\times (-) = (+)$ (Ví dụ: $(-3) \\times (-4) = +12$)\n\n` +
        `• **Khác dấu ra ÂM:**\n` +
        `  $(+) \\times (-) = (-)$\n` +
        `  $(-) \\times (+) = (-)$ (Ví dụ: $(-3) \\times 4 = -12$)\n\n` +
        `💡 *Cách hiểu dễ nhớ:* "Kẻ thù của kẻ thù là bạn" (âm nhân âm thành dương)!`;
    }

    return `✨ **Chào em! MathBot rất vui được hỗ trợ em môn Toán Lớp ${gradeNum || 6-9}!**\n\n` +
      `Câu hỏi của em: "${query}"\n\n` +
      `Để giải bài này hiệu quả, em hãy chia sẻ thêm:\n` +
      `1. Đề bài chi tiết hoặc số liệu cụ thể.\n` +
      `2. Em đã làm được đến bước nào rồi?\n\n` +
      `MathBot có thể hỗ trợ em các chủ đề: Số học, Phân số, Đại số & Phương trình, Hình học, Thống kê & Xác suất. Hãy gửi đề bài để chúng mình cùng khám phá nhé! 🚀`;
  }

  // Vite development vs production serving
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MathVerse server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
