export interface AdhesionForm {
  id: string;
  clientName: string;
  status: 'Pendiente' | 'Firmado';
  createdAt: string; // ISO string
  signedAt?: string;
  dni?: string;
  cardType?: string; // VISA, MASTERCARD, etc.
  cardNumber?: string;
  cardExpiry?: string;
  bank?: string;
  acceptedTerms?: boolean;
  signatureDataUrl?: string | null;
  clarification?: string;
}

export interface FormValidationErrors {
  clientName?: string;
  dni?: string;
  cardType?: string;
  cardNumber?: string;
  cardExpiry?: string;
  bank?: string;
  acceptedTerms?: string;
  signature?: string;
  clarification?: string;
}
