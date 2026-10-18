import { GoogleGenAI } from "@google/genai";

const systemPrompt = (grade) => `Bạn là MathBot, gia sư Toán THCS (Lớp ${grade}, sách Kết nối tri thức).
Quy tắc:
- Chỉ trả lời câu hỏi về Toán lớp 6-9. Câu ngoài phạm vi thì lịch sự từ chối và gợi ý hỏi về Toán.
- Hướng dẫn TỪNG BƯỚC, đặt câu hỏi gợi mở để học sinh tự làm. Chỉ đưa đáp án cuối khi học sinh đã thử hoặc yêu cầu rõ.
- Tự kiểm tra lại mọi phép tính trước khi trả lời. Nếu không chắc thì nói rõ.
- Dùng tiếng Việt thân thiện, xưng "thầy" và gọi "em". Viết ký hiệu bằng chữ thường: x², √, ≤, ≥, π.
- Không hỏi và không thu thập thông tin cá nhân của học sinh.`;

export default async function handler(req, res) {
  // 1. CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");

  // 2. Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // 3. Health Check (GET)
  if (req.method === "GET" || req.query?.health || req.url?.includes('/health')) {
    const hasKey = !!process.env.GEMINI_API_KEY;
    if (!hasKey) {
      return res.status(200).json({
        status: "offline",
        online: false,
        message: "Chưa cấu hình GEMINI_API_KEY trên Vercel. Vui lòng vào Vercel Dashboard -> Settings -> Environment Variables để thêm GEMINI_API_KEY."
      });
    }
    return res.status(200).json({
      status: "online",
      online: true,
      message: "MathBot AI đang trực tuyến và sẵn sàng kết nối Google Gemini!"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Chỉ hỗ trợ phương thức POST và GET" });
  }

  const { message, grade = 6, history = [], image } = req.body || {};
  if ((!message || typeof message !== "string") && !(image && image.data)) {
    return res.status(400).json({ error: "Vui lòng nhập câu hỏi hoặc đính kèm ảnh/GIF/video" });
  }
  const safeMessage =
    typeof message === "string" && message.trim()
      ? message.trim().slice(0, 2000)
      : "Hãy phân tích hình ảnh/video bài toán này và hướng dẫn cách giải từng bước.";

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      reply: `⚠️ **MathBot AI chưa được cấu hình GEMINI_API_KEY trên Vercel.**\n\n` +
        `Để kích hoạt MathBot AI trả lời tự động, bạn hãy làm theo các bước sau:\n` +
        `1. Truy cập **Vercel Dashboard** (vercel.com) -> chọn dự án của bạn.\n` +
        `2. Vào **Settings** -> **Environment Variables**.\n` +
        `3. Thêm biến với tên: \`GEMINI_API_KEY\` và giá trị là khóa API Google Gemini của bạn.\n` +
        `4. Nhấn **Save** và **Redeploy** lại dự án trên Vercel.\n\n` +
        `*(Trong lúc chờ cấu hình, em có thể ôn tập lý thuyết, làm bài tập trắc nghiệm và thử thách tại các mục khác của MathVerse nhé!)*`
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const start = history.findIndex((h) => h.role === "user");
    const past = start === -1 ? [] : history.slice(start);
    const contents = [
      ...past.map((h) => ({ role: h.role, parts: [{ text: h.content }] })),
      {
        role: "user",
        parts: [
          ...(image && image.data && image.mimeType
            ? [{ inlineData: { mimeType: image.mimeType, data: image.data } }]
            : []),
          { text: safeMessage },
        ],
      },
    ];

    const r = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: { systemInstruction: systemPrompt(grade), temperature: 0.3 },
    });
    return res.status(200).json({ reply: r.text || "MathBot đã tiếp nhận câu hỏi của em." });
  } catch (e) {
    console.error("MathBot Gemini Error:", e);
    return res.status(200).json({
      reply: `⚠️ **MathBot AI gặp sự cố khi gọi Google Gemini API.**\n\n` +
        `Chi tiết lỗi: \`${e?.message || 'Lỗi không xác định'}\`.\n\n` +
        `Em hãy kiểm tra lại \`GEMINI_API_KEY\` trên Vercel hoặc thử lại sau ít phút nhé!`
    });
  }
}
