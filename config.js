// ============================================
// Gemini API 키 설정
// ============================================
// 
// 1. Google AI Studio (https://aistudio.google.com/)에 접속
// 2. "Get API key" 버튼 클릭
// 3. API 키 생성 또는 기존 키 확인
// 4. 아래 빈 문자열('') 사이에 API 키를 붙여넣으세요
//
// 예시:
// window.GEMINI_API_KEY = 'AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567';
//
// ⚠️ 주의: 이 파일을 Git에 커밋하지 마세요!
// .gitignore 파일에 config.js가 포함되어 있는지 확인하세요.
//
// 📌 Netlify 배포 시:
// Netlify 환경 변수에서 GEMINI_API_KEY를 설정하면
// build.js가 자동으로 주입하므로 이 파일의 설정은 무시됩니다.
// ============================================

// 로컬 개발용: 빌드 시 주입된 API 키가 없을 때만 설정
if (typeof window.GEMINI_API_KEY === 'undefined') {
  window.GEMINI_API_KEY = '';
}