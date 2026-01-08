// 빌드 시 config.js 파일을 생성하는 스크립트
// Vercel 환경 변수 GEMINI_API_KEY를 사용하여 config.js를 생성합니다.

const fs = require('fs');
const path = require('path');

const apiKey = process.env.GEMINI_API_KEY || '';

const configContent = `// ============================================
// Gemini API 키 설정
// ============================================
// 
// 이 파일은 Vercel 빌드 시 자동으로 생성됩니다.
// Vercel 환경 변수 GEMINI_API_KEY에서 값을 가져옵니다.
//
// 로컬 개발 환경에서는 직접 config.js 파일을 수정하세요.
// ============================================

window.GEMINI_API_KEY = '${apiKey}'; // Vercel 환경 변수에서 주입됨
`;

const configPath = path.join(__dirname, 'config.js');

try {
  fs.writeFileSync(configPath, configContent, 'utf8');
  console.log('✅ config.js 파일이 성공적으로 생성되었습니다.');
  if (apiKey) {
    console.log('✅ API 키가 환경 변수에서 로드되었습니다.');
  } else {
    console.warn('⚠️  GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.');
  }
} catch (error) {
  console.error('❌ config.js 파일 생성 실패:', error);
  process.exit(1);
}

