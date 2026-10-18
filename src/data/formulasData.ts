export interface FormulaItem {
  id: string;
  grade: 6 | 7 | 8 | 9 | 'all';
  topic: 'Đại số' | 'Hình học' | 'Số học' | 'Thống kê';
  title: string;
  expression: string;
  explanation: string;
  examples: string[];
  tips?: string;
  tags: string[];
}

export const FORMULAS_DATA: FormulaItem[] = [
  // LỚP 6
  {
    id: 'f-6-1',
    grade: 6,
    topic: 'Số học',
    title: 'Phép tính luỹ thừa với số mũ tự nhiên',
    expression: 'a^m \\cdot a^n = a^{m+n} \\quad ; \\quad a^m : a^n = a^{m-n} \\ (a \\neq 0, m \\ge n)',
    explanation: 'Khi nhân hai luỹ thừa cùng cơ số, ta giữ nguyên cơ số và cộng các số mũ. Khi chia hai luỹ thừa cùng cơ số (khác 0), giữ nguyên cơ số và trừ các số mũ.',
    examples: ['2^3 \\cdot 2^4 = 2^{3+4} = 2^7 = 128', '5^6 : 5^2 = 5^{6-2} = 5^4 = 625'],
    tips: 'Quy ước: a^1 = a và a^0 = 1 (với a ≠ 0).',
    tags: ['luỹ thừa', 'cơ số', 'số mũ', 'lớp 6'],
  },
  {
    id: 'f-6-2',
    grade: 6,
    topic: 'Số học',
    title: 'Quy tắc dấu khi cộng trừ nhân số nguyên',
    expression: '(+) \\cdot (+) = (+) \\quad ; \\quad (-) \\cdot (-) = (+) \\quad ; \\quad (+) \\cdot (-) = (-)',
    explanation: 'Nhân hai số cùng dấu luôn cho kết quả dương (+). Nhân hai số khác dấu luôn cho kết quả âm (-).',
    examples: ['(-4) \\cdot (-5) = +20', '(-3) \\cdot 6 = -18', '(-7) + (-3) = -10'],
    tips: 'Quy tắc trừ số nguyên: a - b = a + (-b). Muốn trừ một số nguyên, ta cộng với số đối của nó.',
    tags: ['số nguyên', 'quy tắc dấu', 'cộng trừ', 'nhân chia'],
  },
  {
    id: 'f-6-3',
    grade: 6,
    topic: 'Số học',
    title: 'Dấu hiệu chia hết cho 2, 3, 5, 9',
    expression: '\\bullet \\ 2: tận cùng chẵn \\quad \\bullet \\ 5: tận cùng 0, 5 \\quad \\bullet \\ 3, 9: tổng các chữ số chia hết',
    explanation: 'Một số chia hết cho 2 khi chữ số tận cùng là 0, 2, 4, 6, 8. Chia hết cho 5 khi tận cùng là 0 hoặc 5. Chia hết cho 3 (hoặc 9) khi tổng các chữ số của nó chia hết cho 3 (hoặc 9).',
    examples: ['Số 234: tận cùng 4 => chia hết cho 2. Tổng 2+3+4=9 => chia hết cho 3 và 9.'],
    tips: 'Số chia hết cho cả 2 và 5 thì có chữ số tận cùng luôn là 0.',
    tags: ['dấu hiệu chia hết', 'số học', 'ước và bội'],
  },
  {
    id: 'f-6-4',
    grade: 6,
    topic: 'Hình học',
    title: 'Chu vi & diện tích hình chữ nhật, hình vuông',
    expression: 'HCN: P = (a + b) \\times 2, \\ S = a \\times b \\quad | \\quad HV: P = 4a, \\ S = a^2',
    explanation: 'Chu vi hình chữ nhật bằng tổng chiều dài và chiều rộng nhân 2. Diện tích bằng chiều dài nhân chiều rộng. Với hình vuông, chu vi bằng cạnh nhân 4, diện tích bằng bình phương độ dài cạnh.',
    examples: ['Hình chữ nhật a = 6cm, b = 4cm => P = (6+4)*2 = 20cm, S = 6*4 = 24cm²', 'Hình vuông a = 5cm => P = 20cm, S = 25cm²'],
    tips: 'Chú ý phải đổi tất cả các kích thước về cùng một đơn vị đo trước khi tính.',
    tags: ['hình chữ nhật', 'hình vuông', 'chu vi', 'diện tích'],
  },
  {
    id: 'f-6-5',
    grade: 6,
    topic: 'Hình học',
    title: 'Diện tích hình thang & hình bình hành & hình thoi',
    expression: 'S_{thang} = \\frac{(a + b) \\cdot h}{2} \\quad ; \\quad S_{hbh} = a \\cdot h \\quad ; \\quad S_{thoi} = \\frac{d_1 \\cdot d_2}{2}',
    explanation: 'Diện tích hình thang bằng tổng hai đáy nhân với chiều cao rồi chia đôi. Diện tích hình thoi bằng nửa tích hai đường chéo.',
    examples: ['Hình thang hai đáy 4cm, 8cm, cao 5cm => S = (4+8)*5/2 = 30cm².', 'Hình thoi d1 = 6cm, d2 = 8cm => S = 6*8/2 = 24cm².'],
    tags: ['hình thang', 'hình thoi', 'hình bình hành', 'diện tích'],
  },

  // LỚP 7
  {
    id: 'f-7-1',
    grade: 7,
    topic: 'Đại số',
    title: 'Tính chất của dãy tỉ số bằng nhau',
    expression: '\\frac{a}{b} = \\frac{c}{d} = \\frac{e}{f} = \\frac{a + c + e}{b + d + f} = \\frac{a - c + e}{b - d + f}',
    explanation: 'Từ một dãy tỉ số bằng nhau, ta có thể cộng (hoặc trừ) các tử số với nhau và các mẫu số tương ứng với nhau để được một tỉ số mới bằng các tỉ số đã cho.',
    examples: ['Cho x/2 = y/3 và x + y = 20 => x/2 = y/3 = (x+y)/(2+3) = 20/5 = 4 => x = 8, y = 12.'],
    tips: 'Điều kiện: các mẫu số sau khi cộng trừ phải khác 0.',
    tags: ['tỉ lệ thức', 'dãy tỉ số bằng nhau', 'đại số lớp 7'],
  },
  {
    id: 'f-7-2',
    grade: 7,
    topic: 'Hình học',
    title: 'Tổng ba góc trong một tam giác',
    expression: '\\widehat{A} + \\widehat{B} + \\widehat{C} = 180^{\\circ}',
    explanation: 'Trong bất kỳ tam giác nào, tổng số đo ba góc luôn bằng 180 độ. Góc ngoài của một tam giác bằng tổng hai góc trong không kề với nó.',
    examples: ['Tam giác ABC có góc A = 70°, góc B = 50° => góc C = 180° - 70° - 50° = 60°.'],
    tips: 'Trong tam giác vuông, hai góc nhọn luôn phụ nhau (tổng bằng 90°).',
    tags: ['tam giác', 'tổng ba góc', 'hình học lớp 7'],
  },
  {
    id: 'f-7-3',
    grade: 7,
    topic: 'Hình học',
    title: 'Định lý Pytago trong tam giác vuông',
    expression: 'a^2 + b^2 = c^2 \\quad (c \\text{ là cạnh huyền, } a, b \\text{ là hai cạnh góc vuông})',
    explanation: 'Trong một tam giác vuông, bình phương độ dài cạnh huyền bằng tổng bình phương độ dài hai cạnh góc vuông. Định lý đảo: Nếu tam giác có a² + b² = c² thì đó là tam giác vuông tại đỉnh đối diện cạnh c.',
    examples: ['Cạnh góc vuông 3 và 4 => Cạnh huyền c² = 3² + 4² = 9 + 16 = 25 => c = 5 (Bộ ba Pytago kinh điển: 3, 4, 5).', 'Các bộ ba Pytago nguyên phổ biến: (3, 4, 5), (5, 12, 13), (6, 8, 10), (8, 15, 17).'],
    tips: 'Cạnh huyền luôn là cạnh dài nhất trong tam giác vuông!',
    tags: ['pytago', 'tam giác vuông', 'cạnh huyền', 'hình học'],
  },

  // LỚP 8
  {
    id: 'f-8-1',
    grade: 8,
    topic: 'Đại số',
    title: '7 Hằng đẳng thức đáng nhớ (Trọng tâm)',
    expression: '(A + B)^2 = A^2 + 2AB + B^2 \\quad ; \\quad (A - B)^2 = A^2 - 2AB + B^2 \\quad ; \\quad A^2 - B^2 = (A - B)(A + B)',
    explanation: 'Bộ 7 hằng đẳng thức là chìa khóa vàng xuyên suốt toàn bộ chương trình Đại số cấp THCS & THPT. Giúp phân tích đa thức thành nhân tử và rút gọn biểu thức nhanh chóng.',
    examples: [
      '1. Bình phương một tổng: (x + 3)² = x² + 6x + 9',
      '2. Bình phương một hiệu: (2x - 1)² = 4x² - 4x + 1',
      '3. Hiệu hai bình phương: x² - 16 = (x - 4)(x + 4)',
      '4. Lập phương một tổng: (A + B)³ = A³ + 3A²B + 3AB² + B³',
      '5. Lập phương một hiệu: (A - B)³ = A³ - 3A²B + 3AB² - B³',
      '6. Tổng hai lập phương: A³ + B³ = (A + B)(A² - AB + B²)',
      '7. Hiệu hai lập phương: A³ - B³ = (A - B)(A² + AB + B²)',
    ],
    tips: 'Để ý kỹ dấu: Tổng lập phương có tích thiếu mang dấu trừ -(AB); Hiệu lập phương có tích thiếu mang dấu cộng +(AB).',
    tags: ['hằng đẳng thức', 'đại số lớp 8', 'phân tích đa thức'],
  },
  {
    id: 'f-8-2',
    grade: 8,
    topic: 'Hình học',
    title: 'Định lý Talet & Tam giác đồng dạng',
    expression: '\\frac{AB\'}{AB} = \\frac{AC\'}{AC} = \\frac{B\'C\'}{BC} \\quad (B\'C\' \\parallel BC)',
    explanation: 'Nếu một đường thẳng song song với một cạnh của tam giác và cắt hai cạnh còn lại thì nó định ra trên hai cạnh đó những đoạn thẳng tương ứng tỉ lệ và tạo thành một tam giác mới đồng dạng với tam giác đã cho.',
    examples: ['Cho B\'C\' // BC, AB\' = 2, AB = 6, AC = 9 => AC\'/9 = 2/6 = 1/3 => AC\' = 3.'],
    tags: ['talet', 'tam giác đồng dạng', 'tỉ lệ thức', 'hình học lớp 8'],
  },
  {
    id: 'f-8-3',
    grade: 8,
    topic: 'Hình học',
    title: 'Diện tích & Thể tích hình chóp tam giác / tứ giác đều',
    expression: 'V = \\frac{1}{3} \\cdot S_{đáy} \\cdot h \\quad ; \\quad S_{xq} = p \\cdot d \\ (p: \\text{nửa chu vi đáy, } d: \\text{trung đoạn})',
    explanation: 'Thể tích hình chóp đều bằng 1/3 diện tích đáy nhân với chiều cao. Diện tích xung quanh bằng nửa chu vi đáy nhân với độ dài trung đoạn.',
    examples: ['Hình chóp tứ giác đều có đáy cạnh 6cm (S_đáy = 36cm²), chiều cao h = 10cm => V = 1/3 * 36 * 10 = 120cm³.'],
    tags: ['hình chóp', 'thể tích', 'hình không gian', 'lớp 8'],
  },

  // LỚP 9
  {
    id: 'f-9-1',
    grade: 9,
    topic: 'Đại số',
    title: 'Công thức nghiệm & Hệ thức Vi-ét phương trình bậc 2',
    expression: 'ax^2 + bx + c = 0 \\ (a \\neq 0) \\Rightarrow \\Delta = b^2 - 4ac \\quad ; \\quad x_1 + x_2 = -\\frac{b}{a}, \\ x_1 \\cdot x_2 = \\frac{c}{a}',
    explanation: 'Nếu Δ > 0: Phương trình có 2 nghiệm phân biệt x = (-b ± √Δ)/(2a). Nếu Δ = 0: Nghiệm kép x = -b/(2a). Nếu Δ < 0: Phương trình vô nghiệm.',
    examples: [
      'x² - 5x + 6 = 0 có a=1, b=-5, c=6 => Δ = (-5)² - 4*1*6 = 1 > 0 => x₁ = (5+1)/2 = 3, x₂ = (5-1)/2 = 2.',
      'Theo Vi-ét: S = x₁ + x₂ = 5 = -(-5)/1 ; P = x₁ * x₂ = 6 = 6/1. Khớp hoàn hảo!',
    ],
    tips: 'Trường hợp đặc biệt nhẩm nghiệm nhanh: Nếu a + b + c = 0 thì x₁ = 1, x₂ = c/a. Nếu a - b + c = 0 thì x₁ = -1, x₂ = -c/a.',
    tags: ['phương trình bậc 2', 'vi-ét', 'delta', 'đại số lớp 9'],
  },
  {
    id: 'f-9-2',
    grade: 9,
    topic: 'Hình học',
    title: 'Hệ thức lượng trong tam giác vuông',
    expression: 'b^2 = a \\cdot b\' \\quad ; \\quad h^2 = b\' \\cdot c\' \\quad ; \\quad b \\cdot c = a \\cdot h \\quad ; \\quad \\frac{1}{h^2} = \\frac{1}{b^2} + \\frac{1}{c^2}',
    explanation: 'Với tam giác ABC vuông tại A, đường cao AH: Bình phương mỗi cạnh góc vuông bằng tích của cạnh huyền và hình chiếu của cạnh góc vuông đó trên cạnh huyền. Bình phương đường cao ứng với cạnh huyền bằng tích hai hình chiếu.',
    examples: ['Cho tam giác vuông có hình chiếu b\' = 4, c\' = 9 => Đường cao h² = 4 * 9 = 36 => h = 6.'],
    tags: ['hệ thức lượng', 'tam giác vuông', 'đường cao', 'hình chiếu'],
  },
  {
    id: 'f-9-3',
    grade: 9,
    topic: 'Đại số',
    title: 'Tỉ số lượng giác của góc nhọn (Sin, Cos, Tan, Cot)',
    expression: '\\sin = \\frac{\\text{Đối}}{\\text{Huyền}} \\ ; \\ \\cos = \\frac{\\text{Kề}}{\\text{Huyền}} \\ ; \\ \\tan = \\frac{\\text{Đối}}{\\text{Kề}} \\ ; \\ \\cot = \\frac{\\text{Kề}}{\\text{Đối}}',
    explanation: 'Câu thần chú dễ nhớ: Sin đi học (Đ/H), Cứ khóc hoài (K/H), Thôi đừng khóc (Đ/K), Có kẹo đây (K/Đ). Ngoài ra: sin²α + cos²α = 1 ; tanα · cotα = 1.',
    examples: ['Tam giác vuông có góc α = 30° => sin 30° = 1/2, cos 30° = √3/2, tan 30° = √3/3.'],
    tags: ['lượng giác', 'sin', 'cos', 'tan', 'cot'],
  },
  {
    id: 'f-9-4',
    grade: 9,
    topic: 'Hình học',
    title: 'Độ dài đường tròn & Diện tích hình tròn, hình quạt',
    expression: 'C = 2\\pi R = \\pi d \\quad ; \\quad S = \\pi R^2 \\quad ; \\quad S_q = \\frac{\\pi R^2 n}{360}',
    explanation: 'Chu vi đường tròn bằng đường kính nhân pi (hoặc 2 lần bán kính nhân pi). Diện tích hình tròn bằng pi nhân bình phương bán kính. Diện tích hình quạt tròn cung n độ.',
    examples: ['Đường tròn bán kính R = 7cm => Chu vi C ≈ 2 * 3.14 * 7 = 43.96cm, Diện tích S ≈ 3.14 * 49 ≈ 153.86cm².'],
    tags: ['đường tròn', 'hình tròn', 'chu vi', 'diện tích', 'hình quạt'],
  },
];
