/**
 * Validation Service for KAZI
 * Provides rule-based "intelligence" for data integrity without external APIs.
 */

// Basic list of inappropriate words (Portuguese/English)
const INAPPROPRIATE_WORDS = [
  'caralho', 'porra', 'merda', 'foda', 'puta', 'cu', 'viado', 'cacete',
  'fuck', 'shit', 'piss', 'dick', 'asshole', 'bitch', 'cunt'
];

export const ValidationService = {
  /**
   * Checks if text contains inappropriate language
   */
  isInappropriate: (text: string): boolean => {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return INAPPROPRIATE_WORDS.some(word => lowerText.includes(word));
  },

  /**
   * Detects if text looks like gibberish or nonsense
   * Rules:
   * 1. Too many repetitive characters (e.g., "aaaaa")
   * 2. Lack of vowels in long strings
   * 3. Random keyboard mashes (e.g., "asdfghjkl")
   */
  isNonsense: (text: string): boolean => {
    if (!text || text.length < 3) return false;
    
    // 1. Repetitive characters (3+ same chars in a row)
    if (/(.)\1\1\1/.test(text)) return true;

    // 2. Long strings without vowels (more than 6 consonants)
    const words = text.split(/\s+/);
    for (const word of words) {
      if (word.length > 6 && !/[aeiouyáéíóúàèìòùâêîôûãõ]/i.test(word)) return true;
    }

    // 3. Common keyboard patterns
    const patterns = ['asdf', 'qwer', 'zxcv', '1234', 'jkl;', 'uiop'];
    if (patterns.some(p => text.toLowerCase().includes(p))) return true;

    // 4. Low vowel density for longer texts
    if (text.length > 20) {
      const vowels = text.match(/[aeiouyáéíóúàèìòùâêîôûãõ]/gi);
      const vowelRatio = (vowels?.length || 0) / text.length;
      if (vowelRatio < 0.1) return true; // Less than 10% vowels is suspicious
    }

    return false;
  },

  /**
   * Validates specific data types
   */
  isValidData: (type: 'phone' | 'email' | 'handle' | 'name', value: string): { valid: boolean; error?: string } => {
    if (!value) return { valid: false, error: 'Campo obrigatório' };

    switch (type) {
      case 'phone':
        // Mozambique format: +258 followed by 8 or 9 digits, or just 9 digits starting with 8
        const phoneRegex = /^(\+258)?(8[2-79])\d{7}$/;
        if (!phoneRegex.test(value.replace(/\s/g, ''))) {
          return { valid: false, error: 'Número de telefone inválido (Ex: 841234567)' };
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { valid: false, error: 'E-mail inválido' };
        }
        break;
      case 'handle':
        if (!value.startsWith('@')) return { valid: false, error: 'O handle deve começar com @' };
        if (value.length < 4) return { valid: false, error: 'Handle muito curto' };
        if (/[^@a-z0-9_]/.test(value)) return { valid: false, error: 'Handle contém caracteres inválidos' };
        break;
      case 'name':
        if (value.length < 3) return { valid: false, error: 'Nome muito curto' };
        if (ValidationService.isNonsense(value)) return { valid: false, error: 'Nome parece inválido ou sem sentido' };
        break;
    }

    return { valid: true };
  },

  /**
   * Comprehensive content validation
   */
  validateContent: (text: string, minLength: number = 10): { valid: boolean; error?: string } => {
    if (!text || text.trim().length < minLength) {
      return { valid: false, error: `O conteúdo deve ter pelo menos ${minLength} caracteres.` };
    }
    if (ValidationService.isInappropriate(text)) {
      return { valid: false, error: 'O conteúdo contém palavras inadequadas.' };
    }
    if (ValidationService.isNonsense(text)) {
      return { valid: false, error: 'O conteúdo parece não fazer sentido ou é incoerente.' };
    }
    return { valid: true };
  }
};
