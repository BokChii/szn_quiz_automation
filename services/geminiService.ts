
import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from "../types";

// API 키는 가이드라인에 따라 process.env.API_KEY에서 직접 사용합니다.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateWebtoonQuiz(images: string[], questionCount: number): Promise<QuizQuestion[]> {
  // 복합적인 추론과 멀티모달 분석을 위해 gemini-3-pro-preview 모델 사용
  const model = 'gemini-3-pro-preview';
  
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
    const result = await ai.models.generateContent({
      model: model,
      contents: { 
        parts: [
          ...imageParts,
          { text: prompt }
        ] 
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    minItems: 3,
                    maxItems: 3
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctIndex", "explanation"]
              }
            }
          },
          required: ["quiz"]
        }
      }
    });

    const responseText = result.text;
    if (!responseText) throw new Error("AI 응답이 없습니다.");
    
    const parsed = JSON.parse(responseText);
    return parsed.quiz;
  } catch (error) {
    console.error("Gemini 에러:", error);
    throw error;
  }
}
