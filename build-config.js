// 빌드 시 config.js 파일을 생성하는 스크립트
// Vercel 환경 변수 GEMINI_API_KEY를 사용하여 config.js를 생성합니다.

const fs = require('fs');
const path = require('path');

const apiKey = process.env.GEMINI_API_KEY || '';

// API 키가 없어도 빌드는 계속 진행 (경고만 표시)
if (!apiKey || apiKey.trim() === '') {
  console.warn('⚠️  GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.');
  console.warn('⚠️  빌드는 계속 진행되지만, 배포된 사이트에서 API 키가 작동하지 않을 수 있습니다.');
  console.warn('⚠️  Vercel 대시보드에서 환경 변수를 설정해주세요.');
}

// API 키에 작은따옴표가 있으면 이스케이프 처리
const escapedApiKey = apiKey.replace(/'/g, "\\'").replace(/\\/g, '\\\\');

const configContent = `// ============================================
// Gemini API 키 설정
// ============================================
// 
// 이 파일은 Vercel 빌드 시 자동으로 생성됩니다.
// Vercel 환경 변수 GEMINI_API_KEY에서 값을 가져옵니다.
//
// 로컬 개발 환경에서는 직접 config.js 파일을 수정하세요.
// ============================================

window.GEMINI_API_KEY = '${escapedApiKey}'; // Vercel 환경 변수에서 주입됨
`;

const configPath = path.join(__dirname, 'config.js');

try {
  fs.writeFileSync(configPath, configContent, 'utf8');
  console.log('✅ config.js 파일이 성공적으로 생성되었습니다.');
  if (apiKey) {
    console.log('✅ API 키가 환경 변수에서 로드되었습니다.');
  } else {
    console.warn('⚠️  config.js가 빈 API 키로 생성되었습니다.');
  }
} catch (error) {
  console.error('❌ config.js 파일 생성 실패:', error.message);
  // 빈 파일이라도 생성 시도
  try {
    const fallbackContent = "window.GEMINI_API_KEY = '';";
    fs.writeFileSync(configPath, fallbackContent, 'utf8');
    console.log('⚠️  빈 config.js 파일 생성됨');
  } catch (fallbackError) {
    console.error('❌ 빈 파일 생성도 실패:', fallbackError.message);
    console.warn('⚠️  빌드는 계속 진행됩니다. 배포 후 수동으로 config.js를 확인해주세요.');
  }
}

// 항상 성공 종료 (빌드가 실패하지 않도록)
process.exit(0);

