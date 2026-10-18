import React, { useState, useRef, useEffect } from 'react';
import { useMathVerse } from '../context/MathVerseContext';
import {
  Bot,
  Send,
  Sparkles,
  User,
  Lightbulb,
  Trash2,
  ArrowUpRight,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  AlertTriangle,
  X,
  RotateCcw,
  ImagePlus,
  Download,
  Film,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';
import { formatMathNotation } from '../utils/formatMath';
import { FormattedMathView } from './FormattedMathView';
import { UserAvatar } from './UserAvatar';
import {
  UploadedMediaItem,
  readMediaFile,
  downloadMediaToDevice,
} from '../utils/mediaUtils';
import {
  recordAIFeedback,
  getAIFeedbackHistory,
  incrementAITotalAnswers,
  getAIFeedbackStats,
} from '../utils/aiFeedback';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  userQuestion?: string;
  media?: UploadedMediaItem;
}

const PRESET_QUESTIONS = [
  'Giải phương trình này giúp em: 2x + 5 = 15',
  'Vì sao hai số âm nhân với nhau lại ra số dương? [(-3) . (-4) = 12]',
  'Cách tính diện tích hình thang và mẹo ghi nhớ bằng thơ?',
  'Định lý Pythagore là gì và áp dụng trong tam giác vuông thế nào?',
  'Quy tắc quy đồng mẫu số nhiều phân số gồm những bước nào?',
  'Hệ thức Vi-ét dùng để làm gì trong phương trình bậc hai?',
];

export const MathBotChat: React.FC = () => {
  const { user, setActiveTab, theme } = useMathVerse();
  const currentGrade = user?.grade || 6;
  const isLight = theme === 'light';

  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: `Chào ${user?.name || 'em'}! 🚀 Thầy là **MathBot** – Gia sư Trợ lý AI Toán học đồng hành cùng em trong chương trình Toán THCS (Lớp ${currentGrade}).\n\nEm đang gặp khó khăn ở bài toán hay công thức nào? Hãy gửi đề bài hoặc nhấn vào các gợi ý bên dưới để chúng mình cùng khám phá từng bước nhé!`,
      timestamp: Date.now(),
      userQuestion: 'Lời chào khởi động & Giới thiệu MathBot AI',
    },
  ]);

  const [input, setInput] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<UploadedMediaItem | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'helpful' | 'wrong'>>(() => {
    const history = getAIFeedbackHistory();
    const map: Record<string, 'helpful' | 'wrong'> = {};
    history.forEach((h) => {
      if (h.messageId) {
        map[h.messageId] = h.rating;
      }
    });
    return map;
  });
  const [feedbackToast, setFeedbackToast] = useState<{
    message: string;
    type: 'success' | 'warning';
  } | null>(null);

  const [botStatus, setBotStatus] = useState<'CHECKING' | 'ONLINE' | 'OFFLINE'>('CHECKING');
  const [statusDetail, setStatusDetail] = useState<string>('');
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);
  const lastCheckTimeRef = useRef<number>(0);

  const checkBotHealth = async (force: boolean = false) => {
    const now = Date.now();
    if (isCheckingHealth) return;
    if (!force && now - lastCheckTimeRef.current < 5000) return;
    lastCheckTimeRef.current = now;
    setIsCheckingHealth(true);
    setBotStatus('CHECKING');

    const endpointsToTry: string[] = [
      'https://vutrutoanhoctest4.vercel.app/api/mathbot' + (force ? '?force=1' : ''),
    ];
    const envUrl = (import.meta as any).env?.VITE_MATHBOT_URL || (import.meta as any).env?.VITE_MATHBOT_API_URL;
    if (envUrl && envUrl !== 'https://vutrutoanhoctest4.vercel.app/api/mathbot') {
      endpointsToTry.unshift(envUrl + (force ? '?force=1' : ''));
    }
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      endpointsToTry.push('/api/mathbot/health');
      endpointsToTry.push('/api/health');
    }

    let connected = false;
    let detail = '';

    for (const ep of endpointsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(ep, { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && (data.status === 'online' || data.online)) {
            setBotStatus('ONLINE');
            setStatusDetail(data.message || 'MathBot AI đang trực tuyến và đã kết nối thành công. Bạn có thể đặt câu hỏi Toán học!');
            connected = true;
            break;
          } else {
            detail = data?.message || data?.detail || 'Không thể kết nối Gemini API.';
          }
        } else {
          const errData = await res.json().catch(() => null);
          detail = errData?.message || errData?.detail || `Mã lỗi phản hồi: ${res.status}`;
          if (errData && (errData.status === 'offline' || errData.error)) {
            break;
          }
        }
      } catch {
        // try next endpoint
      }
    }

    if (!connected) {
      setBotStatus('OFFLINE');
      setStatusDetail(detail || 'MathBot AI hiện không thể kết nối với hệ thống AI. Vui lòng thử lại sau.');
    }
    setIsCheckingHealth(false);
  };

  useEffect(() => {
    checkBotHealth();
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const mediaToSend = messageText ? null : attachedMedia;
    const rawText = (messageText ?? input).trim();
    const textToSend =
      rawText ||
      (mediaToSend
        ? mediaToSend.mediaType === 'video'
          ? 'Hãy xem video bài toán này và giải thích chi tiết từng bước giúp em.'
          : mediaToSend.mediaType === 'gif'
          ? 'Hãy xem ảnh GIF bài toán này và hướng dẫn cách giải từng bước giúp em.'
          : 'Hãy đọc đề bài trong hình ảnh này và hướng dẫn giải chi tiết từng bước giúp em.'
        : '');

    if ((!textToSend && !mediaToSend) || isLoading) return;

    soundManager.playClickSound();
    if (!messageText) {
      setInput('');
      setAttachedMedia(null);
      setMediaError(null);
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      media: mediaToSend || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Educational fallback generator when server/network is unavailable
    const generateClientFallback = (query: string, gradeNum: number): string => {
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
        return `✨ **Bí quyết với Phân số (Toán Lớp ${gradeNum}):**\n\n` +
          `**1. Quy đồng mẫu số 3 bước cực dễ:**\n` +
          `• **Bước 1:** Tìm Mẫu số chung (thường là BCNN của các mẫu số).\n` +
          `• **Bước 2:** Tìm thừa số phụ bằng cách lấy Mẫu chung chia cho từng mẫu.\n` +
          `• **Bước 3:** Nhân cả tử và mẫu với thừa số phụ tương ứng.\n\n` +
          `💡 *Ví dụ:* Cộng 1/2 + 1/3 = 3/6 + 2/6 = 5/6. Em đã hiểu chưa nào?`;
      }
      if (q.includes('hình thang') || q.includes('diện tích hình thang')) {
        return `✨ **Công thức diện tích hình thang:**\n\n` +
          `📐 **Công thức:** S = [(a + b) · h] / 2\n` +
          `• a: đáy nhỏ, b: đáy lớn (cùng đơn vị đo)\n` +
          `• h: chiều cao tương ứng\n\n` +
          `🎵 *Bài thơ nhớ nhanh:* \n` +
          `"Muốn tính diện tích hình thang\n` +
          `Đáy lớn đáy nhỏ ta mang cộng vào\n` +
          `Thế rồi nhân với chiều cao\n` +
          `Chia đôi lấy nửa thế nào cũng ra!"`;
      }
      if (q.includes('tam giác') || q.includes('pythagore') || q.includes('pitago')) {
        return `✨ **Định lý Pythagore (Toán 7 & 8):**\n\n` +
          `📐 **Trong một tam giác vuông:**\n` +
          `Bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông: c² = a² + b².\n\n` +
          `• Bộ ba số quen thuộc: (3, 4, 5) vì 3² + 4² = 9 + 16 = 25 = 5².\n` +
          `• Bộ ba số khác: (6, 8, 10), (5, 12, 13).\n\n` +
          `💡 *Ứng dụng:* Khi biết độ dài 2 cạnh bất kì của tam giác vuông, ta luôn tính được cạnh còn lại!`;
      }
      if (q.includes('số âm') || q.includes('số nguyên') || q.includes('dấu')) {
        return `✨ **Quy tắc dấu khi nhân, chia số nguyên:**\n\n` +
          `• **Cùng dấu ra DƯƠNG:**\n` +
          `  (+) × (+) = (+)\n` +
          `  (-) × (-) = (+) (Ví dụ: (-3) × (-4) = +12)\n\n` +
          `• **Khác dấu ra ÂM:**\n` +
          `  (+) × (-) = (-)\n` +
          `  (-) × (+) = (-) (Ví dụ: (-3) × 4 = -12)\n\n` +
          `💡 *Cách hiểu dễ nhớ:* "Kẻ thù của kẻ thù là bạn" (âm nhân âm thành dương)!`;
      }
      return `✨ **Chào em! MathBot rất vui được hỗ trợ em môn Toán Lớp ${gradeNum}!**\n\n` +
        `Đối với câu hỏi "${query}":\n` +
        `1. Em hãy chia sẻ chi tiết số liệu hoặc công thức cần giải.\n` +
        `2. Em đã thực hiện được đến bước nào rồi?\n\n` +
        `MathBot sẵn sàng hướng dẫn từng bước để em nắm chắc bản chất bài toán nhé! 🚀`;
    };

    try {
      let botReply = '';
      let fetchSuccess = false;

      // Adaptive API Endpoint selection: try local /api/mathbot first when media is attached or on same origin, plus Vercel endpoint
      const endpointsToTry: string[] = [
        '/api/mathbot',
        'https://vutrutoanhoctest4.vercel.app/api/mathbot',
      ];
      const envUrl = (import.meta as any).env?.VITE_MATHBOT_URL || (import.meta as any).env?.VITE_MATHBOT_API_URL;
      if (envUrl && !endpointsToTry.includes(envUrl)) {
        endpointsToTry.unshift(envUrl);
      }

      let lastErrorMessage = '';

      for (const targetUrl of endpointsToTry) {
        if (fetchSuccess) break;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);
          const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              message: textToSend,
              grade: currentGrade,
              topic: 'Toán THCS',
              image: mediaToSend
                ? {
                    data: mediaToSend.data,
                    mimeType: mediaToSend.mimeType,
                  }
                : undefined,
              history: messages.slice(-5).map((m) => ({
                role: m.role === 'user' ? 'user' : 'model',
                content: m.content,
              })),
            }),
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data && data.reply) {
              botReply = data.reply;
              fetchSuccess = true;
              break;
            }
          } else {
            const errData = await response.json().catch(() => null);
            lastErrorMessage = errData?.message || errData?.detail || errData?.error || `Mã phản hồi ${response.status}`;
          }
        } catch (fetchErr: any) {
          lastErrorMessage = fetchErr?.name === 'AbortError' ? 'Hết thời gian chờ phản hồi từ Gemini API' : 'Không thể kết nối đến máy chủ';
        }
      }

      if (!fetchSuccess) {
        setBotStatus('OFFLINE');
        botReply = `⚠ **MathBot AI hiện không thể kết nối với hệ thống AI. Vui lòng thử lại sau.**\n\n` +
          `*(Chi tiết: ${lastErrorMessage || 'Không nhận được phản hồi thực tế từ dịch vụ Google Gemini'})*.\n\n` +
          `Em hãy bấm nút **"Thử kết nối lại"** ở thanh trạng thái phía trên hoặc thử gửi lại câu hỏi nhé!`;
      } else {
        setBotStatus('ONLINE');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: formatMathNotation(botReply),
        timestamp: Date.now(),
        userQuestion: textToSend,
      };

      incrementAITotalAnswers(1);
      setMessages((prev) => [...prev, botMsg]);
      if (fetchSuccess) {
        soundManager.playCorrectSound();
      } else {
        soundManager.playWrongSound();
      }
    } catch (err) {
      console.error('Lỗi MathBot:', err);
      setBotStatus('OFFLINE');
      const errorReply = `⚠ **MathBot AI hiện không thể kết nối với hệ thống AI. Vui lòng thử lại sau.**\n\n` +
        `*(Hệ thống không thể kết nối đến máy chủ AI hoặc mạng bị gián đoạn)*.\n\n` +
        `Em hãy kiểm tra kết nối mạng và bấm **"Thử kết nối lại"** nhé.`;
      const fallbackMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        content: formatMathNotation(errorReply),
        timestamp: Date.now(),
        userQuestion: textToSend,
      };
      incrementAITotalAnswers(1);
      setMessages((prev) => [...prev, fallbackMsg]);
      soundManager.playWrongSound();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `w-${Date.now()}`,
        role: 'assistant',
        content: `Cuộc trò chuyện đã được làm mới. Em có câu hỏi Toán nào muốn hỏi MathBot không?`,
        timestamp: Date.now(),
        userQuestion: 'Làm mới cuộc hội thoại',
      },
    ]);
  };

  const handleFeedback = (
    messageId: string,
    rating: 'helpful' | 'wrong',
    questionText: string,
    answerText: string
  ) => {
    // Lưu lịch sử phản hồi vào localStorage (Nội dung câu hỏi, Câu trả lời AI, Thời gian)
    recordAIFeedback({
      messageId,
      question: questionText || 'Câu hỏi thảo luận với MathBot',
      answer: answerText,
      rating,
    });

    setFeedbackMap((prev) => ({ ...prev, [messageId]: rating }));

    if (rating === 'helpful') {
      soundManager.playCorrectSound();
      setFeedbackToast({
        message: 'Đã ghi nhận phản hồi "👍 Hữu ích". Cảm ơn em!',
        type: 'success',
      });
    } else {
      soundManager.playWrongSound();
      setFeedbackToast({
        message: 'Đã lưu phản hồi "👎 AI sai rồi" vào kho dữ liệu phản biện để cải thiện MathBot!',
        type: 'warning',
      });
    }

    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  // Helper để lấy câu hỏi người dùng gần nhất với tin nhắn trợ lý
  const getPrecedingUserQuestion = (idx: number, fallback?: string): string => {
    if (fallback) return fallback;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    return 'Câu hỏi Toán THCS';
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] min-h-[500px] flex flex-col gap-2">
      {/* Hộp cảnh báo AI Disclaimer (Nằm HOÀN TOÀN NGOÀI khung chat, không che tin nhắn) */}
      {showDisclaimer && (
        <div className="px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs shrink-0 flex items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-[11px] sm:text-xs text-amber-200/90 leading-tight">
              <span className="font-bold text-amber-300 mr-1.5">⚠ Lưu ý:</span>
              <span>AI chỉ là công cụ hỗ trợ học tập. AI có thể đưa ra lời giải chưa chính xác hoặc bỏ sót bước. Hãy tự kiểm tra kết quả hoặc hỏi giáo viên khi cần.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDisclaimer(false)}
            className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Đóng thông báo lưu ý"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Khung chat MathBot độc lập, 100% không gian cho cuộc hội thoại */}
      <div
        className={`flex-1 flex flex-col rounded-3xl shadow-xl backdrop-blur-xl overflow-hidden relative transition-colors ${
          isLight
            ? 'bg-white border border-slate-200/90 shadow-slate-200/50'
            : 'bg-slate-900/90 border border-slate-700/80 shadow-2xl'
        }`}
      >
        {/* Toast thông báo phản hồi */}
        {feedbackToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="text-xs text-slate-200 font-medium">{feedbackToast.message}</span>
          </div>
        )}

        {/* Chat Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 transition-colors ${
            isLight
              ? 'bg-gradient-to-r from-indigo-50/90 via-sky-50/50 to-purple-50/70 border-slate-200 text-slate-800'
              : 'bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-slate-800 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center shadow-md ${
                isLight
                  ? 'bg-indigo-100 border-indigo-200 text-indigo-700 shadow-indigo-100'
                  : 'bg-indigo-600/40 border-indigo-400/40 text-indigo-300 shadow-indigo-600/20'
              }`}
            >
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-base sm:text-lg font-bold leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  MathBot AI
                </h2>
                {botStatus === 'CHECKING' && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-400 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                    Đang kiểm tra...
                  </span>
                )}
                {botStatus === 'ONLINE' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                )}
                {botStatus === 'OFFLINE' && (
                  <button
                    type="button"
                    onClick={() => checkBotHealth(true)}
                    title={`${statusDetail}. Nhấn để kiểm tra lại kết nối`}
                    className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    Offline • Thử lại
                  </button>
                )}
                <span
                  className={`hidden sm:inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                    isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  }`}
                >
                  Chuẩn phản biện AI 2026
                </span>
                {/* Nút xem lại Lưu ý AI */}
                {!showDisclaimer && (
                  <button
                    onClick={() => setShowDisclaimer(true)}
                    title="Mở lại lưu ý về AI"
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span>Lưu ý AI</span>
                  </button>
                )}
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Gia sư giải thích từng bước • Phù hợp Toán Lớp {currentGrade}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('analytics')}
              title="Xem thống kê phản biện AI"
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60"
            >
              <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Thống kê phản biện</span>
            </button>
            <button
              onClick={handleClearChat}
              title="Xóa lịch sử trò chuyện"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thanh trạng thái kết nối AI thực tế (Online / Offline / Đang kiểm tra) */}
        {botStatus === 'ONLINE' && (
          <div
            className={`px-4 py-2 border-b text-xs flex items-center justify-between gap-2 shrink-0 animate-in fade-in duration-200 ${
              isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-semibold">MathBot AI đang trực tuyến và đã kết nối thành công. Bạn có thể đặt câu hỏi Toán học!</span>
            </div>
          </div>
        )}

        {botStatus === 'OFFLINE' && (
          <div
            className={`px-4 py-2 border-b text-xs flex items-center justify-between gap-2 flex-wrap shrink-0 animate-in fade-in duration-200 ${
              isLight
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span className="font-semibold">MathBot AI hiện không thể kết nối với hệ thống AI. Vui lòng thử lại sau.</span>
              {statusDetail && !statusDetail.includes('hiện không thể kết nối') && (
                <span className={`italic text-[11px] ${isLight ? 'text-rose-600' : 'text-rose-300/80'}`}>({statusDetail})</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => checkBotHealth(true)}
              disabled={isCheckingHealth}
              className={`px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer text-xs shrink-0 flex items-center gap-1.5 disabled:opacity-50 ${
                isLight
                  ? 'bg-white hover:bg-rose-100 text-rose-700 border-rose-300 shadow-xs'
                  : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border-rose-500/40'
              }`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              <span>{isCheckingHealth ? 'Đang kiểm tra...' : 'Thử kết nối lại'}</span>
            </button>
          </div>
        )}

        {botStatus === 'CHECKING' && (
          <div
            className={`px-4 py-2 border-b text-xs flex items-center gap-2 shrink-0 animate-in fade-in duration-200 ${
              isLight
                ? 'bg-sky-50 border-sky-200 text-sky-800'
                : 'bg-slate-900 border-slate-700/80 text-cyan-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping shrink-0" />
            <span className="font-medium">Đang kiểm tra kết nối với hệ thống Gemini AI...</span>
          </div>
        )}

        {/* Preset Pills */}
        <div
          className={`px-4 py-2 border-b flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 ${
            isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
          }`}
        >
          <span className={`text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Câu hỏi nhanh:
          </span>
          {PRESET_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              disabled={isLoading}
              onClick={() => handleSend(q)}
              className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border ${
                isLight
                  ? 'bg-white border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 shadow-2xs hover:bg-indigo-50/30'
                  : 'bg-slate-900 border-slate-700/80 hover:border-cyan-400 hover:bg-indigo-950/40 text-slate-300 hover:text-cyan-300'
              }`}
            >
              <span>{q.length > 32 ? q.slice(0, 32) + '...' : q}</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </button>
          ))}
        </div>

        {/* Messages Scroll Area - Hoàn toàn thông thoáng không bị che khuất */}
        <div className={`flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 ${isLight ? 'bg-slate-50/30' : ''}`}>
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const feedback = feedbackMap[m.id];
            const questionText = getPrecedingUserQuestion(idx, m.userQuestion);

            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 border overflow-hidden ${
                    isUser
                      ? isLight
                        ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                        : 'bg-cyan-600/30 border-cyan-400/40 text-cyan-200'
                      : isLight
                      ? 'bg-white border-slate-200 text-indigo-600 shadow-xs'
                      : 'bg-indigo-600/30 border-indigo-400/40 text-indigo-200'
                  }`}
                >
                  {isUser ? (
                    <UserAvatar avatar={user?.avatar} alt={user?.name} sizeClass="w-full h-full" textClass="text-sm" />
                  ) : (
                    '🤖'
                  )}
                </div>

                {/* Message Bubble + Media Attachment + Feedback Buttons */}
                <div className="max-w-[85%] sm:max-w-[75%] space-y-1.5">
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-3 ${
                      isUser
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-tr-none shadow-md shadow-indigo-600/15'
                        : isLight
                        ? 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-none shadow-xs'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                    }`}
                  >
                    {m.media && (
                      <div className="rounded-xl overflow-hidden border border-white/20 bg-slate-950/40 relative group">
                        {m.media.mediaType === 'video' ? (
                          <video
                            src={m.media.dataUrl}
                            controls
                            playsInline
                            className="max-h-64 w-auto max-w-full rounded-xl mx-auto"
                          />
                        ) : (
                          <img
                            src={m.media.dataUrl}
                            alt={m.media.name || 'Đính kèm'}
                            className="max-h-64 w-auto max-w-full object-contain rounded-xl mx-auto"
                          />
                        )}
                        <div className="p-2 bg-slate-950/75 flex items-center justify-between gap-2 text-[11px] text-slate-200">
                          <span className="truncate font-medium">
                            {m.media.mediaType === 'video'
                              ? '🎬 Video'
                              : m.media.mediaType === 'gif'
                              ? '🎞️ Ảnh động GIF'
                              : '🖼️ Hình ảnh'}{' '}
                            • {m.media.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClickSound();
                              downloadMediaToDevice(m.media!.dataUrl, m.media!.name || 'mathverse-media');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-400/30 font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                            title="Tải tệp này về máy"
                          >
                            <Download className="w-3 h-3" />
                            <span>Tải về máy</span>
                          </button>
                        </div>
                      </div>
                    )}
                    <FormattedMathView content={m.content} isUser={isUser} />
                  </div>

                  {/* 2 Nút phản hồi sau mỗi câu trả lời của AI: 👍 Hữu ích và 👎 AI sai rồi */}
                  {!isUser && (
                    <div className="flex items-center gap-2 pt-0.5 px-1 flex-wrap">
                      <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        Đánh giá câu trả lời:
                      </span>

                      {/* Nút 👍 Hữu ích */}
                      <button
                        type="button"
                        onClick={() => handleFeedback(m.id, 'helpful', questionText, m.content)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                          feedback === 'helpful'
                            ? isLight
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-sm shadow-emerald-500/20'
                            : isLight
                            ? 'bg-white hover:bg-slate-50 text-slate-600 hover:text-emerald-700 border-slate-200 hover:border-emerald-300'
                            : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 border-slate-800 hover:border-emerald-500/40'
                        }`}
                        title="Đánh giá câu trả lời chính xác, dễ hiểu"
                      >
                        <span>👍</span>
                        <span>Hữu ích</span>
                      </button>

                      {/* Nút 👎 AI sai rồi */}
                      <button
                        type="button"
                        onClick={() => handleFeedback(m.id, 'wrong', questionText, m.content)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                          feedback === 'wrong'
                            ? isLight
                              ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                              : 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-sm shadow-rose-500/20'
                            : isLight
                            ? 'bg-white hover:bg-slate-50 text-slate-600 hover:text-rose-700 border-slate-200 hover:border-rose-300'
                            : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-rose-300 border-slate-800 hover:border-rose-500/40'
                        }`}
                        title="Báo cáo câu trả lời chưa đúng hoặc sai bước giải"
                      >
                        <span>👎</span>
                        <span>AI sai rồi</span>
                      </button>

                      {feedback && (
                        <span className={`text-[10px] italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {feedback === 'helpful' ? '(Đã khen 👍)' : '(Đã báo sai 👎)'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-xl border flex items-center justify-center text-sm shrink-0 ${
                  isLight ? 'bg-white border-slate-200 text-indigo-600 shadow-xs' : 'bg-indigo-600/30 border-indigo-400/40'
                }`}
              >
                🤖
              </div>
              <div
                className={`p-4 rounded-2xl rounded-tl-none text-xs flex items-center gap-2 border ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-600 shadow-xs'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>MathBot đang suy nghĩ và chuẩn bị từng bước giải...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Box + Media Attachment Preview */}
        <div className={`p-3 sm:p-4 border-t shrink-0 space-y-2 transition-colors ${isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
          {mediaError && (
            <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between gap-2">
              <span>{mediaError}</span>
              <button
                type="button"
                onClick={() => setMediaError(null)}
                className="text-rose-300 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {attachedMedia && (
            <div
              className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 ${
                isLight ? 'bg-white border-indigo-200 shadow-xs' : 'bg-slate-900 border-indigo-500/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-indigo-500/30 bg-slate-950 shrink-0 flex items-center justify-center">
                  {attachedMedia.mediaType === 'video' ? (
                    <video src={attachedMedia.dataUrl} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={attachedMedia.dataUrl} alt={attachedMedia.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      {attachedMedia.mediaType === 'video'
                        ? 'VIDEO'
                        : attachedMedia.mediaType === 'gif'
                        ? 'GIF ĐỘNG'
                        : 'HÌNH ẢNH'}
                    </span>
                    <span className={`text-xs font-bold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      {attachedMedia.name}
                    </span>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Sẵn sàng gửi cho MathBot AI phân tích hoặc tải về máy
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClickSound();
                    downloadMediaToDevice(attachedMedia.dataUrl, attachedMedia.name);
                  }}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                  title="Tải tệp này về máy"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tải về</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttachedMedia(null)}
                  className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 cursor-pointer"
                  title="Xóa tệp đính kèm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Upload Image / GIF / Video from computer */}
            <label
              title="Tải ảnh, GIF hoặc video bài toán từ máy lên"
              className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                isLight
                  ? 'bg-white hover:bg-indigo-50 border-slate-300 hover:border-indigo-400 text-indigo-600 shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 hover:border-cyan-400 text-cyan-400'
              }`}
            >
              <ImagePlus className="w-5 h-5" />
              <span className="hidden md:inline text-xs font-bold">Ảnh/GIF/Video</span>
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,.gif"
                className="hidden"
                disabled={isLoading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setMediaError(null);
                  try {
                    const media = await readMediaFile(file);
                    setAttachedMedia(media);
                    soundManager.playClickSound();
                  } catch (err: any) {
                    setMediaError(err?.message || 'Không thể tải tệp đa phương tiện.');
                    soundManager.playWrongSound();
                  } finally {
                    e.target.value = '';
                  }
                }}
              />
            </label>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={async (e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (let i = 0; i < items.length; i++) {
                  const item = items[i];
                  if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
                    const file = item.getAsFile();
                    if (file) {
                      e.preventDefault();
                      setMediaError(null);
                      try {
                        const media = await readMediaFile(file);
                        setAttachedMedia(media);
                        soundManager.playClickSound();
                      } catch (err: any) {
                        setMediaError(err?.message || 'Không thể dán tệp.');
                      }
                      break;
                    }
                  }
                }
              }}
              placeholder="Hỏi bài tập, dán ảnh hoặc tải ảnh/GIF/video bài toán từ máy..."
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 sm:py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 transition-all ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs'
                  : 'bg-slate-900 border-slate-700/80 text-white placeholder-slate-500 focus:ring-cyan-500 focus:border-transparent'
              }`}
            />
            <button
              type="submit"
              disabled={(!input.trim() && !attachedMedia) || isLoading}
              className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-40 text-white font-bold transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          {/* Ghi chú nhỏ gọn chân trang */}
          <div className={`text-center text-[10px] flex items-center justify-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <span className="text-amber-500 font-semibold">⚠</span>
            <span>Hỗ trợ tải & lưu Ảnh, GIF động, Video từ máy • Luôn kiểm tra lại lời giải của AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};
