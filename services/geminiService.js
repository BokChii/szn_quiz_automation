// Gemini API 서비스
async function generateWebtoonQuiz(images, questionCount) {
  const apiKey = window.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. config.js 파일에서 API 키를 설정해주세요.');
  }

  const model = 'gemini-3-pro-preview';
  
  // 이미지를 base64에서 데이터 부분만 추출
  const imageParts = images.map(base64Data => {
    const data = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    return {
      inlineData: {
        mimeType: 'image/png',
        data: data,
      },
    };
  });

  const prompt = `
    제공된 웹툰 스크린샷을 분석해주세요.
    1. 말풍선과 내레이션 박스에서 모든 텍스트를 추출하세요(OCR).
    2. 전체적인 스토리 맥락, 캐릭터 간의 상호작용, 배경 설정을 파악하세요.
    3. 파악한 내용을 바탕으로 정확히 ${questionCount}개의 3지선다형 객관식 퀴즈를 생성하세요.
    4. **중요: 모든 질문, 선택지, 해설은 반드시 한국어로 작성해야 합니다.**
    5. 질문은 세부적인 줄거리, 캐릭터 이름, 시각적 단서 등 난이도를 다양하게 구성하세요.
    6. 결과는 반드시 지정된 JSON 구조로 반환하세요.
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API 요청 실패: ${response.status}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error("AI 응답이 없습니다.");
    }
    
    const parsed = JSON.parse(responseText);
    return parsed.quiz;
  } catch (error) {
    console.error("Gemini 에러:", error);
    throw error;
  }
}

