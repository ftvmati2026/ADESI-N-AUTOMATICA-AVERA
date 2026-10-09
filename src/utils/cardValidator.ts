/**
 * Módulo de Detección de Redes de Tarjetas, Formateo y Algoritmo de Luhn
 */

export interface CardNetwork {
  name: string;
  lengths: number[];
  format: number[]; // e.g. [4, 4, 4, 4] or [4, 6, 5]
  cvvLength: number;
  color: string;
  match: (digits: string) => boolean;
}

export const CARD_NETWORKS: CardNetwork[] = [
  // 1. Cabal (Specific Argentine prefix checks first)
  {
    name: 'Cabal',
    lengths: [16],
    format: [4, 4, 4, 4],
    cvvLength: 3,
    color: '#dc2626',
    match: (d: string) =>
      d.startsWith('589657') || d.startsWith('604200') || d.startsWith('62'),
  },
  // 2. Tarjeta Naranja (Argentine network)
  {
    name: 'Naranja',
    lengths: [16],
    format: [4, 4, 4, 4],
    cvvLength: 3,
    color: '#ea580c',
    match: (d: string) =>
      d.startsWith('589562') || d.startsWith('58956'),
  },
  // 3. American Express
  {
    name: 'American Express',
    lengths: [15],
    format: [4, 6, 5],
    cvvLength: 4,
    color: '#0284c7',
    match: (d: string) =>
      d.startsWith('34') || d.startsWith('37'),
  },
  // 4. Diners Club
  {
    name: 'Diners Club',
    lengths: [14, 15, 16, 17, 18, 19],
    format: [4, 6, 4],
    cvvLength: 3,
    color: '#475569',
    match: (d: string) => {
      const p3 = parseInt(d.slice(0, 3), 10);
      return (
        d.startsWith('36') ||
        d.startsWith('38') ||
        (d.length >= 3 && p3 >= 300 && p3 <= 305)
      );
    },
  },
  // 5. Mastercard (51-55 or 2221-2720)
  {
    name: 'Mastercard',
    lengths: [16],
    format: [4, 4, 4, 4],
    cvvLength: 3,
    color: '#f97316',
    match: (d: string) => {
      const p2 = parseInt(d.slice(0, 2), 10);
      const p4 = parseInt(d.slice(0, 4), 10);
      return (
        (d.length >= 2 && p2 >= 51 && p2 <= 55) ||
        (d.length >= 4 && p4 >= 2221 && p4 <= 2720)
      );
    },
  },
  // 6. Visa (Prefix 4)
  {
    name: 'Visa',
    lengths: [13, 16, 19],
    format: [4, 4, 4, 4],
    cvvLength: 3,
    color: '#2563eb',
    match: (d: string) => d.startsWith('4'),
  },
  // 7. Maestro
  {
    name: 'Maestro',
    lengths: [12, 13, 14, 15, 16, 17, 18, 19],
    format: [4, 4, 4, 4],
    cvvLength: 3,
    color: '#0891b2',
    match: (d: string) => {
      const p4 = parseInt(d.slice(0, 4), 10);
      return (
        d.startsWith('5018') ||
        d.startsWith('5020') ||
        d.startsWith('5038') ||
        d.startsWith('5893') ||
        d.startsWith('6304') ||
        d.startsWith('6759') ||
        (d.length >= 4 && p4 >= 6761 && p4 <= 6763)
      );
    },
  },
  // 8. Discover
  {
    name: 'Discover',
    lengths: [16, 17, 18, 19],
    format: [4, 4, 4, 4],
    cvvLength: 3,
    color: '#e11d48',
    match: (d: string) => {
      const p3 = parseInt(d.slice(0, 3), 10);
      const p6 = parseInt(d.slice(0, 6), 10);
      return (
        d.startsWith('6011') ||
        d.startsWith('65') ||
        (d.length >= 3 && p3 >= 644 && p3 <= 649) ||
        (d.length >= 6 && p6 >= 622126 && p6 <= 622925)
      );
    },
  },
];

/**
 * Detecta la marca de la tarjeta según los dígitos limpios
 */
export function detectCardNetwork(cleanDigits: string): CardNetwork | null {
  if (!cleanDigits) return null;
  for (const network of CARD_NETWORKS) {
    if (network.match(cleanDigits)) {
      return network;
    }
  }
  return null;
}

/**
 * Formatea el número de tarjeta insertando espacios según la red detectada
 */
export function formatCardNumber(raw: string): {
  formatted: string;
  cleanDigits: string;
  network: CardNetwork | null;
} {
  const cleanDigits = raw.replace(/\D/g, '');
  const network = detectCardNetwork(cleanDigits);

  const formatPattern = network ? network.format : [4, 4, 4, 4];
  const maxLen = network ? Math.max(...network.lengths) : 19;
  const truncated = cleanDigits.slice(0, maxLen);

  const parts: string[] = [];
  let currentIndex = 0;

  for (const size of formatPattern) {
    if (currentIndex >= truncated.length) break;
    parts.push(truncated.slice(currentIndex, currentIndex + size));
    currentIndex += size;
  }

  // Any remaining digits
  if (currentIndex < truncated.length) {
    parts.push(truncated.slice(currentIndex));
  }

  return {
    formatted: parts.join(' '),
    cleanDigits: truncated,
    network,
  };
}

/**
 * Algoritmo de Luhn (Módulo 10)
 * Valida matemáticamente el número de tarjeta
 */
export function isValidLuhn(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  if (!cleanNumber || cleanNumber.length < 13) return false;

  let sum = 0;
  let shouldDouble = false;

  // Recorrer los dígitos de derecha a izquierda
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}
