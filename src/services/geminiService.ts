import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (aiInstance) return aiInstance;
  
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    console.warn('Gemini API key is missing. AI features will be disabled.');
    return null;
  }
  
  try {
    aiInstance = new GoogleGenAI({ apiKey });
    return aiInstance;
  } catch (error) {
    console.error('Failed to initialize Gemini AI:', error);
    return null;
  }
};

export const generateLogo = async (prompt: string): Promise<string | null> => {
  try {
    const ai = getAI();
    if (!ai) return null;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Create a professional, modern, and clean logo for a freelancer profile. The freelancer's specialty is: ${prompt}. The logo should be minimalist, high-quality, and suitable for a professional profile picture. No text, just a symbolic icon or abstract shape.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error('Logo generation error:', error);
    return null;
  }
};

export const getSmartRecommendations = async (userNeed: string, availableServices: any[]): Promise<string[]> => {
  try {
    const ai = getAI();
    if (!ai) return [];

    const servicesContext = availableServices.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      category: s.category
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User needs: "${userNeed}". 
      Available services: ${JSON.stringify(servicesContext)}.
      
      Analyze the user's needs and return a list of service IDs that are most relevant. 
      Return ONLY a JSON array of strings (the IDs). If no services are relevant, return an empty array [].`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return [];
  } catch (error) {
    console.error('Recommendation error:', error);
    return [];
  }
};

export interface ProfileValidationResult {
  isValid: boolean;
  reason?: string;
  improvedBio?: string;
  isPhoneValid: boolean;
}

export const validateAndImproveProfile = async (displayName: string, bio: string, phoneNumber: string): Promise<ProfileValidationResult> => {
  try {
    const ai = getAI();
    if (!ai) return { isValid: true, isPhoneValid: true };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analisa este perfil de freelancer para uma plataforma em Moçambique:
      Nome: "${displayName}"
      Biografia: "${bio}"
      Telemóvel: "${phoneNumber}"
      
      Tarefas:
      1. Verifica se a biografia faz sentido para um perfil profissional. Se for apenas letras aleatórias (A, B, etc.) ou sem sentido, marca como inválido.
      2. Verifica se o número de telemóvel é um número moçambicano válido (+258 seguido de 9 dígitos começando com 82, 83, 84, 85, 86, 87).
      3. Se a biografia for pobre ou curta, sugere uma versão MUITO superior, profissional, persuasiva e detalhada em português (contexto de Moçambique). A biografia deve destacar competências e transmitir confiança.
      
      Retorna APENAS um objeto JSON com:
      {
        "isValid": boolean,
        "reason": string (se inválido),
        "improvedBio": string (fornece sempre uma versão melhorada se a atual for curta ou pobre),
        "isPhoneValid": boolean
      }`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return { isValid: true, isPhoneValid: true };
  } catch (error) {
    console.error('Profile validation error:', error);
    return { isValid: true, isPhoneValid: true };
  }
};

export interface ServiceValidationResult {
  isValid: boolean;
  reason?: string;
  improvedTitle?: string;
  improvedDescription?: string;
}

export const validateAndImproveService = async (title: string, description: string, category: string): Promise<ServiceValidationResult> => {
  try {
    const ai = getAI();
    if (!ai) return { isValid: true };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analisa este serviço para uma plataforma de freelancers em Moçambique:
      Título: "${title}"
      Descrição: "${description}"
      Categoria: "${category}"
      
      Tarefas:
      1. Verifica se o título e a descrição fazem sentido para o serviço oferecido. Se for apenas letras aleatórias, sem sentido ou ofensivo, marca como inválido.
      2. Se o título for pobre, sugere uma versão mais profissional e impactante.
      3. Se a descrição for curta ou pobre, sugere uma versão MUITO superior, profissional, apelativa e detalhada em português (contexto de Moçambique). A descrição deve explicar o valor do serviço e atrair clientes.
      
      Retorna APENAS um objeto JSON com:
      {
        "isValid": boolean,
        "reason": string (se inválido),
        "improvedTitle": string (fornece sempre uma versão melhorada se a atual for pobre),
        "improvedDescription": string (fornece sempre uma versão melhorada se a atual for curta ou pobre)
      }`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return { isValid: true };
  } catch (error) {
    console.error('Service validation error:', error);
    return { isValid: true };
  }
};
