# QB Learn

QB Learn là ứng dụng học trắc nghiệm lấy cảm hứng từ Quizlet. Ứng dụng hỗ trợ
import bộ đề từ file PDF, học bằng flashcard, luyện tập thông minh và tạo bài
kiểm tra ngẫu nhiên.

## Tính năng

- Import bộ đề từ PDF xuất theo định dạng Quizlet Print.
- Tự nhận diện câu hỏi, các lựa chọn A–D và đáp án.
- Tự loại câu hỏi trùng lặp và báo số câu có thể sử dụng.
- Quản lý nhiều bộ đề và ghi nhớ bộ đề đang chọn.
- Học bằng flashcard có hiệu ứng lật 3D.
- Chế độ học có phản hồi đúng/sai.
- Tạo bài kiểm tra ngẫu nhiên với số câu và thời gian tùy chỉnh.
- Lưu dữ liệu trực tiếp trong `localStorage`, không cần backend.
- Có thể cài dưới dạng PWA trên iPhone, iPad, Android và máy tính.
- Sao lưu/khôi phục toàn bộ bộ đề bằng một file JSON để chuyển thiết bị.

## Sử dụng bản đã host

Mở địa chỉ:

```text
https://qbao0111.github.io/qb-learn/
```

### Cài trên iPhone/iPad

1. Mở địa chỉ trên bằng **Safari**.
2. Bấm nút **Chia sẻ**.
3. Chọn **Thêm vào Màn hình chính**.
4. Mở **QB Learn** từ biểu tượng vừa được tạo.

Ứng dụng sẽ chạy ở chế độ toàn màn hình và lưu dữ liệu ngay trên thiết bị.

### Chuyển các bộ đề từ máy tính sang iPhone

1. Trên máy tính, vào **Tổng quan → Quản lý bộ đề → Sao lưu**.
2. Chuyển file `qb-learn-backup-YYYY-MM-DD.json` sang iPhone bằng AirDrop,
   iCloud Drive, Google Drive hoặc ứng dụng Tệp.
3. Trên iPhone, mở QB Learn đã cài, vào **Tổng quan → Khôi phục**.
4. Chọn file JSON. Toàn bộ bộ đề, đáp án, giải thích và hình ảnh sẽ xuất hiện
   trên iPhone.

Dữ liệu được lưu riêng trên từng thiết bị. Thao tác sao lưu/khôi phục giúp chuyển
một bản đầy đủ giữa các thiết bị mà không cần tài khoản hoặc máy chủ dữ liệu.

## Công nghệ

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4
- Zustand
- PDF.js
- Framer Motion

## Yêu cầu môi trường

- Node.js `^20.19.0` hoặc `>=22.12.0`
- npm đi kèm Node.js

Kiểm tra phiên bản:

```bash
node --version
npm --version
```

## Cài đặt và chạy ở môi trường phát triển

Clone repository và mở thư mục dự án:

```bash
git clone https://github.com/qbao0111/qb-learn.git
cd qb-learn
```

Cài đúng dependency từ `package-lock.json`:

```bash
npm ci
```

Khởi động development server:

```bash
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal, mặc định là:

```text
http://localhost:5173
```

Nếu cổng `5173` đang được sử dụng, Vite sẽ tự chọn một cổng khác.

## Import bộ đề PDF

1. Mở trang **Tổng quan**.
2. Kéo thả PDF vào khu vực import hoặc bấm để chọn file.
3. Nhập tên bộ đề. Với tên file dạng UUID, ứng dụng tự dùng tên
   **Bộ đề chưa đặt tên**.
4. Bấm **Tạo bộ đề từ PDF**.
5. Chờ thông báo hoàn tất và kiểm tra số câu dùng được.

PDF nên có cấu trúc:

```text
1. Nội dung câu hỏi
A. Lựa chọn thứ nhất
B. Lựa chọn thứ hai
C. Lựa chọn thứ ba
D. Lựa chọn thứ tư: B
```

Ứng dụng cũng hỗ trợ PDF có đáp án nằm ở cột bên phải. Những câu bị trùng được
lọc theo nội dung; câu thiếu lựa chọn hoặc thiếu đáp án không được đưa vào các
chế độ học.

## Các lệnh thường dùng

```bash
# Chạy development server
npm run dev

# Kiểm tra lint
npm run lint

# Chạy unit test
npm test

# Type-check và tạo production build
npm run build

# Tạo production build dành cho GitHub Pages
npm run build:pages

# Xem thử production build
npm run preview
```

Production build được tạo trong thư mục `dist/`.

Mỗi lần push nhánh `main`, workflow `.github/workflows/deploy-pages.yml` sẽ chạy
test, build PWA và cập nhật GitHub Pages tự động.

## Kiểm tra trước khi đóng góp

Trước khi commit, chạy:

```bash
npm run lint
npm test
npm run build
```

## Cấu trúc chính

```text
src/
├── components/       # Overview, flashcard, học và kiểm tra
├── data/             # Bộ câu hỏi mặc định
├── hooks/            # Logic phiên học và selector dùng chung
├── lib/              # Parser PDF và xử lý dữ liệu import
├── App.tsx           # Application shell và điều hướng chế độ
├── store.ts          # Zustand store và local persistence
└── index.css         # Design tokens và style toàn cục

tests/
└── import-bank.test.ts
```

## Lưu ý dữ liệu

Dữ liệu bộ đề được lưu trong trình duyệt bằng khóa `qblearn-storage`. Xóa dữ
liệu trang web hoặc `localStorage` sẽ xóa các bộ đề đã import trên trình duyệt
đó. Repository không chứa file PDF người dùng đã tải lên.
