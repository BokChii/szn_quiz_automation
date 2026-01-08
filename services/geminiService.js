// Gemini API 서비스
// 주의: DEBUG_MODE, debugLog, errorLog는 app.js에서 이미 선언되어 있습니다.
// 이 파일에서는 전역 함수를 사용하며, 로그 카테고리에는 'GEMINI:' 접두사를 추가합니다.
async function generateWebtoonQuiz(images, questionCount) {
  const startTime = Date.now();
  debugLog('GEMINI:API', '퀴즈 생성 요청 시작', { 
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

    debugLog('GEMINI:API', 'API 키 검증 완료');

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

    debugLog('GEMINI:API', '이미지 검증 완료', { count: images.length });

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

        debugLog('GEMINI:IMAGE', `이미지 ${i + 1} 처리 완료`, { 
          dataLength: data.length 
        });
      } catch (error) {
        errorLog(`이미지 ${i + 1} 처리 실패`, error);
        throw new Error(`이미지 ${i + 1}번을 처리하는 중 오류가 발생했습니다.`);
      }
    }

    debugLog('GEMINI:API', '이미지 변환 완료', { count: imageParts.length });

    const prompt = `
# 역할 (Role)
당신은 웹툰 콘텐츠 분석 전문가이자 교육용 퀴즈 제작 전문가입니다. 웹툰의 스토리, 캐릭터, 시각적 요소를 깊이 있게 분석하고, 학습자가 웹툰 내용을 정확히 이해했는지 확인할 수 있는 고품질 퀴즈를 생성합니다.

# 작업 지시사항 (Task)
제공된 웹툰 스크린샷을 분석하여 정확히 ${questionCount}개의 3지선다형 객관식 퀴즈를 생성하세요.

# 처리 단계 (Process)

## 1단계: 이미지 분석 (Image Analysis)
- **OCR 수행**: 말풍선, 내레이션 박스, 화면 내 모든 텍스트를 정확히 추출하세요.
- **시각적 요소 파악**: 캐릭터의 표정, 제스처, 배경, 색상, 레이아웃 등 시각적 단서를 분석하세요.
- **컨텍스트 이해**: 각 패널 간의 연결성, 시간의 흐름, 인과관계를 파악하세요.

## 2단계: 콘텐츠 분석 (Content Analysis)
- **스토리 분석**: 전체적인 줄거리, 사건의 전개, 갈등 구조를 파악하세요.
- **캐릭터 분석**: 등장인물의 이름, 성격, 관계, 대사 패턴을 분석하세요.
- **세부사항 파악**: 배경 설정, 시간대, 장소, 중요한 사물이나 상징을 기록하세요.

## 3단계: 퀴즈 생성 (Quiz Generation)
- **난이도 조절**: 쉬운 문제(표면적 정보)부터 어려운 문제(추론, 해석, 연결)까지 다양하게 구성하세요.
- **문제 유형 분배**:
  * 사실 확인형 (30%): 명시적으로 드러난 정보
  * 추론형 (40%): 암시된 내용이나 인과관계
  * 해석형 (30%): 캐릭터 심리, 주제, 상징적 의미
- **선택지 구성**: 정답은 명확하고, 오답은 그럴듯하지만 틀린 내용으로 구성하세요.

# 필수 규칙 (Rules)

## 규칙 1: 언어 규칙
- **모든 출력은 반드시 한국어로 작성**해야 합니다.
- 질문, 선택지, 해설 모두 한국어로 작성하세요.
- 외래어는 한글 표기를 우선하되, 필요시 괄호 안에 원문을 병기할 수 있습니다.

## 규칙 2: 형식 규칙
- 정확히 ${questionCount}개의 퀴즈를 생성하세요.
- 각 퀴즈는 반드시 3개의 선택지를 가져야 합니다.
- correctIndex는 0, 1, 2 중 하나의 정수여야 합니다 (0: 첫 번째 선택지, 1: 두 번째 선택지, 2: 세 번째 선택지).
- 결과는 반드시 지정된 JSON 구조로 반환하세요.

## 규칙 3: 질문 품질 규칙
- **명확성**: 질문은 모호하지 않고 명확해야 합니다.
- **정확성**: 정답은 이미지에서 확인 가능한 사실에 기반해야 합니다.
- **균형성**: 모든 이미지의 내용을 고르게 활용하세요.
- **교육적 가치**: 단순 암기가 아닌 이해와 추론을 요구하는 문제를 우선하세요.

## 규칙 4: 선택지 규칙
- **정답**: 명확하고 검증 가능한 정답을 제공하세요.
- **오답**: 
  * 완전히 무관한 내용이 아닌, 그럴듯하지만 틀린 선택지로 구성하세요.
  * 흔한 오해나 혼동할 수 있는 내용을 활용하세요.
  * 선택지 간 난이도가 비슷하게 유지되도록 하세요.

## 규칙 5: 해설 규칙
- **상세성**: 해설은 정답이 왜 맞는지, 오답이 왜 틀렸는지 설명해야 합니다.
- **근거 제시**: 이미지의 어떤 부분에서 답을 찾을 수 있는지 구체적으로 언급하세요.
- **교육적 설명**: 단순히 답을 알려주는 것이 아니라, 이해를 돕는 설명을 제공하세요.

## 규칙 6: 검증 규칙
- 생성된 모든 퀴즈는 제공된 이미지에서 답을 찾을 수 있어야 합니다.
- 추측이나 일반 상식에 의존하지 말고, 이미지 내용에 기반해야 합니다.
- 각 문제는 독립적으로 해결 가능해야 합니다.

# 출력 형식 (Output Format)
반드시 다음 JSON 구조로 응답하세요:
{
  "quiz": [
    {
      "question": "질문 내용",
      "options": ["선택지1", "선택지2", "선택지3"],
      "correctIndex": 0,
      "explanation": "상세한 해설 내용"
    }
  ]
}

# 주의사항 (Important Notes)
- 이미지에 텍스트가 없거나 불명확한 경우, 시각적 요소만으로도 퀴즈를 생성할 수 있습니다.
- 여러 장의 이미지가 제공된 경우, 모든 이미지를 종합적으로 분석하여 퀴즈를 생성하세요.
- 퀴즈의 난이도는 웹툰의 복잡도에 맞춰 조절하세요.
  `;

    debugLog('GEMINI:API', 'API 요청 준비 완료', { 
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

    debugLog('GEMINI:API', 'API 요청 전송', { 
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
    debugLog('GEMINI:API', 'API 응답 수신', { 
      status: response.status, 
      statusText: response.statusText,
      duration: `${responseTime}ms`
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
        debugLog('GEMINI:API', '오류 응답 파싱 실패', e);
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

    debugLog('GEMINI:API', '응답 텍스트 추출 완료', { 
      textLength: responseText.length 
    });

    let parsed;
    try {
      parsed = JSON.parse(responseText);
      debugLog('GEMINI:API', '응답 JSON 파싱 완료');
    } catch (error) {
      errorLog('응답 JSON 파싱 실패', { error, responseText: responseText.substring(0, 200) });
      throw new Error('AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.');
    }

    if (!parsed.quiz || !Array.isArray(parsed.quiz)) {
      errorLog('퀴즈 데이터 형식 오류', { parsed });
      throw new Error('퀴즈 데이터 형식이 올바르지 않습니다.');
    }

    if (parsed.quiz.length !== questionCount) {
      debugLog('GEMINI:API', '요청한 문제 수와 다름', { 
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
    debugLog('GEMINI:API', '퀴즈 생성 완료', { 
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
