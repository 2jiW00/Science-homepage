# 지우의 연구노트 — GitHub Pages 배포 가이드

## 📁 파일 구성
```
jiwoo-blog/
├── index.html   ← 메인 페이지
├── style.css    ← 스타일시트
├── app.js       ← 기능 로직
└── README.md    ← 이 파일
```

---

## 🚀 GitHub Pages에 배포하는 방법

### 1단계 — GitHub 저장소 만들기
1. [github.com](https://github.com) 에 로그인합니다.
2. 오른쪽 위 **＋** 버튼 → **New repository** 클릭.
3. Repository name: `jiwoo-blog` (또는 원하는 이름)
4. **Public** 선택 → **Create repository** 클릭.

---

### 2단계 — 파일 올리기
**방법 A — 웹에서 직접 업로드 (쉬움)**
1. 만든 저장소 페이지에서 **Add file → Upload files** 클릭.
2. `index.html`, `style.css`, `app.js` 세 파일을 드래그 앤 드롭.
3. 아래쪽 **Commit changes** 클릭.

**방법 B — Git 명령어**
```bash
git init
git add .
git commit -m "지우의 연구노트 첫 배포"
git branch -M main
git remote add origin https://github.com/사용자명/jiwoo-blog.git
git push -u origin main
```

---

### 3단계 — GitHub Pages 활성화
1. 저장소 → 상단 **Settings** 탭 클릭.
2. 왼쪽 사이드바 **Pages** 클릭.
3. **Branch**: `main` / 폴더: `/ (root)` 선택 → **Save**.
4. 잠시 후 상단에 🟢 `Your site is live at https://사용자명.github.io/jiwoo-blog/` 표시.

배포까지 보통 **1~3분** 정도 걸립니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 글쓰기 | 제목, 카테고리, 이미지, 내용, 해시태그 입력 |
| 해시태그 | Enter/스페이스로 추가, 클릭으로 필터링 |
| 검색 | 제목·내용·태그 실시간 검색 |
| 카테고리 | 화학, 물리학, 수학, 생물, 기타 |
| 정렬 | 최신순 / 업로드순 |
| 수정·삭제 | 글 클릭 → 상세 보기 → 수정/삭제 |
| 로컬 저장 | 브라우저 localStorage에 자동 저장 |
| 날짜 표시 | 작성일, 수정일 자동 기록 |

> ⚠️ 이미지와 글은 **브라우저 localStorage**에 저장됩니다.
> 다른 기기에서 보려면 별도 백엔드(Firebase 등)가 필요합니다.

---

## 🎨 색상 테마
- **민트** `#4ECDC4` — 포인트 색상
- **회색** `#f0f0f0`, `#888` — 배경/보조 텍스트
- **흰색** `#ffffff` — 카드·모달 배경
