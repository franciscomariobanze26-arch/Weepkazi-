import { GoogleGenAI } from "@google/genai";

// AI features are disabled as per user request to save credits/resources
const getAI = () => null;

export const generateLogo = async (prompt: string): Promise<string | null> => {
  return null;
};

export const getSmartRecommendations = async (userNeed: string, availableServices: any[]): Promise<string[]> => {
  return [];
};

export interface ProfileValidationResult {
  isValid: boolean;
  reason?: string;
  improvedBio?: string;
  isPhoneValid: boolean;
}

export const validateAndImproveProfile = async (displayName: string, bio: string, phoneNumber: string): Promise<ProfileValidationResult> => {
  return { isValid: true, isPhoneValid: true, improvedBio: bio };
};

export interface ServiceValidationResult {
  isValid: boolean;
  reason?: string;
  improvedTitle?: string;
  improvedDescription?: string;
}

export const validateAndImproveService = async (title: string, description: string, category: string): Promise<ServiceValidationResult> => {
  return { isValid: true, improvedTitle: title, improvedDescription: description };
};

