# 웹툰 퀴즈 마스터

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

웹툰 스크린샷을 업로드하면 AI가 분석하여 재미있는 3지선다형 퀴즈를 자동으로 만들어주는 웹 애플리케이션입니다.

## 기술 스택

- **HTML5**: 마크업 구조
- **CSS3**: 스타일링 (Tailwind CSS CDN 사용)
- **JavaScript (Vanilla)**: 순수 JavaScript로 구현
- **Google Gemini API**: AI 퀴즈 생성

## 기능

1. **이미지 업로드**: 웹툰 스크린샷 다중 업로드 (드래그 앤 드롭 지원)
2. **AI 퀴즈 생성**: Gemini AI가 스크린샷을 분석하여 퀴즈 자동 생성
3. **퀴즈 플레이**: 3지선다형 객관식 퀴즈 풀기
4. **결과 확인**: 점수 및 해설 확인

## 실행 방법

### 1. API 키 설정

`config.js` 파일을 열고 Gemini API 키를 설정하세요:

```javascript
window.GEMINI_API_KEY = '여기에_API_키_입력';
```

### 2. 로컬 서버 실행

순수 HTML/CSS/JavaScript로 작성되어 있어 간단한 HTTP 서버만 있으면 됩니다.

#### Python 사용 (권장)
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Node.js 사용
```bash
npx http-server -p 8000
```

#### VS Code Live Server 확장 사용
1. VS Code에서 "Live Server" 확장 설치
2. `index.html` 파일에서 우클릭 → "Open with Live Server"

### 3. 브라우저에서 열기

브라우저에서 `http://localhost:8000` (또는 사용한 포트)로 접속하세요.

## 파일 구조

```
webtoon_quiz_master/
├── index.html          # 메인 HTML 파일
├── styles.css          # CSS 스타일
├── app.js              # 메인 애플리케이션 로직
├── config.js           # API 키 설정 (Git에 커밋하지 마세요!)
├── services/
│   └── geminiService.js # Gemini API 서비스
└── README.md
```

## 주의사항

- `config.js` 파일에는 API 키가 포함되므로 Git에 커밋하지 마세요.
- `.gitignore` 파일에 `config.js`가 포함되어 있습니다.
- Gemini API 사용 시 API 키가 필요합니다.

## 사용 방법

1. 웹툰 스크린샷을 업로드합니다 (여러 장 가능)
2. 생성할 문제 수를 선택합니다 (3개, 5개, 7개, 10개)
3. "퀴즈 생성하기" 버튼을 클릭합니다
4. AI가 분석하여 퀴즈를 생성합니다
5. 퀴즈를 풀고 결과를 확인합니다

## 라이선스

© 2024 웹툰 퀴즈 마스터 • Powered by Gemini AI
