// 디버깅 모드 (개발 시 true, 프로덕션에서는 false)
const DEBUG_MODE = true;

// 디버깅 로그 함수
function debugLog(category, message, data = null) {
  if (DEBUG_MODE) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [GEMINI:${category}] ${message}`;
    console.log(logMessage, data || '');
  }
}

// 오류 로그 함수
function errorLog(message, error) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [GEMINI:ERROR] ${message}`, error);
}

// Gemini API 서비스
async function generateWebtoonQuiz(images, questionCount) {
  const startTime = Date.now();
  debugLog('API', '퀴즈 생성 요청 시작', { 
    imageCount: images.length, 
    questionCount 
  });

  try {
    // API 키 검증
    const apiKey = window.GEMINI_API_KEY;
    
    if (!apiKey) {
      const error = new Error('GEMINI_API_KEY가 설정되지 않았습니다. config.js 파일에서 API 키를 설정해주세요.');
      errorLog('API 키 누락', error);
      throw error;
    }

    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      const error = new Error('API 키가 올바르지 않습니다.');
      errorLog('API 키 형식 오류', error);
      throw error;
    }

    debugLog('API', 'API 키 검증 완료');

    // 이미지 검증
    if (!Array.isArray(images) || images.length === 0) {
      const error = new Error('이미지가 없습니다.');
      errorLog('이미지 검증 실패', error);
      throw error;
    }

    if (images.length > 10) {
      const error = new Error('이미지는 최대 10장까지 업로드할 수 있습니다.');
      errorLog('이미지 개수 초과', error);
      throw error;
    }

    debugLog('API', '이미지 검증 완료', { count: images.length });

    // 문제 수 검증
    if (typeof questionCount !== 'number' || questionCount < 3 || questionCount > 10) {
      const error = new Error('문제 수는 3개에서 10개 사이여야 합니다.');
      errorLog('문제 수 검증 실패', error);
      throw error;
    }

    const model = 'gemini-3-pro-preview';
    
    // 이미지를 base64에서 데이터 부분만 추출
    const imageParts = [];
    for (let i = 0; i < images.length; i++) {
      try {
        const base64Data = images[i];
        if (!base64Data || typeof base64Data !== 'string') {
          throw new Error(`이미지 ${i + 1}번 데이터가 올바르지 않습니다.`);
        }

        const data = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        
        // base64 데이터 검증
        if (!data || data.length === 0) {
          throw new Error(`이미지 ${i + 1}번 데이터가 비어있습니다.`);
        }

        imageParts.push({
          inlineData: {
            mimeType: 'image/png',
            data: data,
          },
        });

        debugLog('IMAGE', `이미지 ${i + 1} 처리 완료`, { 
          dataLength: data.length 
        });
      } catch (error) {
        errorLog(`이미지 ${i + 1} 처리 실패`, error);
        throw new Error(`이미지 ${i + 1}번을 처리하는 중 오류가 발생했습니다.`);
      }
    }

    debugLog('API', '이미지 변환 완료', { count: imageParts.length });

    const prompt = `
    제공된 웹툰 스크린샷을 분석해주세요.
    1. 말풍선과 내레이션 박스에서 모든 텍스트를 추출하세요(OCR).
    2. 전체적인 스토리 맥락, 캐릭터 간의 상호작용, 배경 설정을 파악하세요.
    3. 파악한 내용을 바탕으로 정확히 ${questionCount}개의 3지선다형 객관식 퀴즈를 생성하세요.
    4. **중요: 모든 질문, 선택지, 해설은 반드시 한국어로 작성해야 합니다.**
    5. 질문은 세부적인 줄거리, 캐릭터 이름, 시각적 단서 등 난이도를 다양하게 구성하세요.
    6. 결과는 반드시 지정된 JSON 구조로 반환하세요.
    7. correctIndex는 0, 1, 2 중 하나의 정수여야 합니다.
  `;

    debugLog('API', 'API 요청 준비 완료', { 
      model, 
      imageCount: imageParts.length,
      promptLength: prompt.length 
    });

    const requestBody = {
      contents: {
        parts: [
          ...imageParts,
          { text: prompt }
        ]
      },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            quiz: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 3
                  },
                  correctIndex: { type: "integer" },
                  explanation: { type: "string" }
                },
                required: ["question", "options", "correctIndex", "explanation"]
              }
            }
          },
          required: ["quiz"]
        }
      }
    };

    debugLog('API', 'API 요청 전송', { 
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      bodySize: JSON.stringify(requestBody).length 
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    const responseTime = Date.now() - startTime;
    debugLog('API', 'API 응답 수신', { 
      status: response.status, 
      statusText: response.statusText,
      duration: `${responseTime}ms`
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
        debugLog('API', '오류 응답 파싱 실패', e);
      }

      const errorMessage = errorData.error?.message || `API 요청 실패: ${response.status} ${response.statusText}`;
      errorLog('API 요청 실패', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });

      // 사용자 친화적인 오류 메시지
      let userMessage = errorMessage;
      if (response.status === 400) {
        userMessage = '잘못된 요청입니다. 이미지 형식을 확인해주세요.';
      } else if (response.status === 401) {
        userMessage = 'API 키가 올바르지 않습니다. config.js 파일을 확인해주세요.';
      } else if (response.status === 403) {
        userMessage = 'API 접근이 거부되었습니다. API 키 권한을 확인해주세요.';
      } else if (response.status === 429) {
        userMessage = '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (response.status >= 500) {
        userMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }

      throw new Error(userMessage);
    }

    let result;
    try {
      result = await response.json();
      debugLog('API', '응답 JSON 파싱 완료');
    } catch (error) {
      errorLog('응답 JSON 파싱 실패', error);
      throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다.');
    }

    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      errorLog('응답 텍스트 없음', { result });
      throw new Error("AI 응답이 없습니다. 다시 시도해주세요.");
    }

    debugLog('API', '응답 텍스트 추출 완료', { 
      textLength: responseText.length 
    });

    let parsed;
    try {
      parsed = JSON.parse(responseText);
      debugLog('API', '응답 JSON 파싱 완료');
    } catch (error) {
      errorLog('응답 JSON 파싱 실패', { error, responseText: responseText.substring(0, 200) });
      throw new Error('AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.');
    }

    if (!parsed.quiz || !Array.isArray(parsed.quiz)) {
      errorLog('퀴즈 데이터 형식 오류', { parsed });
      throw new Error('퀴즈 데이터 형식이 올바르지 않습니다.');
    }

    if (parsed.quiz.length !== questionCount) {
      debugLog('API', '요청한 문제 수와 다름', { 
        requested: questionCount, 
        received: parsed.quiz.length 
      });
    }

    // 각 퀴즈 항목 검증
    for (let i = 0; i < parsed.quiz.length; i++) {
      const quiz = parsed.quiz[i];
      
      if (!quiz.question || typeof quiz.question !== 'string' || quiz.question.trim().length === 0) {
        errorLog('퀴즈 항목 검증 실패', { index: i, field: 'question', quiz });
        throw new Error(`퀴즈 ${i + 1}번의 질문이 올바르지 않습니다.`);
      }

      if (!Array.isArray(quiz.options) || quiz.options.length !== 3) {
        errorLog('퀴즈 항목 검증 실패', { index: i, field: 'options', quiz });
        throw new Error(`퀴즈 ${i + 1}번의 선택지가 올바르지 않습니다.`);
      }

      for (let j = 0; j < quiz.options.length; j++) {
        if (typeof quiz.options[j] !== 'string' || quiz.options[j].trim().length === 0) {
          errorLog('퀴즈 선택지 검증 실패', { index: i, optionIndex: j, quiz });
          throw new Error(`퀴즈 ${i + 1}번의 선택지 ${j + 1}번이 올바르지 않습니다.`);
        }
      }

      if (typeof quiz.correctIndex !== 'number' || 
          !Number.isInteger(quiz.correctIndex) || 
          quiz.correctIndex < 0 || 
          quiz.correctIndex > 2) {
        errorLog('퀴즈 정답 인덱스 검증 실패', { index: i, correctIndex: quiz.correctIndex, quiz });
        throw new Error(`퀴즈 ${i + 1}번의 정답 인덱스가 올바르지 않습니다.`);
      }

      if (!quiz.explanation || typeof quiz.explanation !== 'string' || quiz.explanation.trim().length === 0) {
        errorLog('퀴즈 해설 검증 실패', { index: i, field: 'explanation', quiz });
        throw new Error(`퀴즈 ${i + 1}번의 해설이 올바르지 않습니다.`);
      }
    }

    const totalTime = Date.now() - startTime;
    debugLog('API', '퀴즈 생성 완료', { 
      questionCount: parsed.quiz.length,
      totalDuration: `${totalTime}ms`
    });

    return parsed.quiz;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    errorLog('퀴즈 생성 실패', {
      error: error.message,
      duration: `${totalTime}ms`,
      stack: error.stack
    });
    
    // 원본 오류를 다시 던지기 (이미 사용자 친화적인 메시지로 변환된 경우)
    throw error;
  }
}
