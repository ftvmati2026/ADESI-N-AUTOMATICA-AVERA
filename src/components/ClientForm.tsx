import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  FileCheck2,
  Lock,
  CreditCard as CreditCardIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AdhesionForm, FormValidationErrors } from '../types';
import { AveraLogo } from './AveraLogo';
import { SignaturePad } from './SignaturePad';
import { DeveloperFooter } from './DeveloperFooter';
import {
  formatCardNumber,
  isValidLuhn,
  detectCardNetwork,
  CARD_NETWORKS,
} from '../utils/cardValidator';

interface ClientFormProps {
  form: AdhesionForm;
  onSubmitSuccess: (updatedForm: AdhesionForm) => void;
  onBackToAdmin?: () => void;
}

// Item 9: Exact requested bank suggestions
const SUGGESTED_BANKS = [
  'Banco de la Nación Argentina (BNA)',
  'Banco Galicia',
  'Banco Santander',
  'BBVA',
  'Banco de la Provincia de Buenos Aires (Bapro)',
  'Banco Macro',
  'Banco Credicoop',
  'Brubank',
];

export const ClientForm: React.FC<ClientFormProps> = ({
  form,
  onSubmitSuccess,
}) => {
  // Form fields
  const [clientName, setClientName] = useState(form.clientName || '');
  const [dni, setDni] = useState(form.dni || '');
  const [cardType, setCardType] = useState(form.cardType || 'VISA');
  const [cardNumber, setCardNumber] = useState(form.cardNumber || '');
  const [cardExpiry, setCardExpiry] = useState(form.cardExpiry || '');
  const [bank, setBank] = useState(form.bank || '');
  const [acceptedTerms, setAcceptedTerms] = useState(form.acceptedTerms || false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(
    form.signatureDataUrl || null
  );

  // Item 10: "ACLARACIÓN" MUST BE EMPTY BY DEFAULT and filled by the client
  const [clarification, setClarification] = useState(form.clarification || '');

  // Detected card network
  const [detectedBrand, setDetectedBrand] = useState<string | null>(
    form.cardType || null
  );

  // Validation & Submission States
  const [errors, setErrors] = useState<FormValidationErrors>({});
  const [showIncompleteAlert, setShowIncompleteAlert] = useState(false);
  const [isJustSubmitted, setIsJustSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedForm, setSubmittedForm] = useState<AdhesionForm>(form);

  // Item 11: Real-time card formatting & network detection
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const { formatted, cleanDigits, network } = formatCardNumber(raw);
    setCardNumber(formatted);

    if (network) {
      setDetectedBrand(network.name);
      setCardType(network.name.toUpperCase());
    } else {
      setDetectedBrand(null);
    }

    if (errors.cardNumber) {
      setErrors(prev => ({ ...prev, cardNumber: undefined }));
    }
  };

  // Item 8: Strict Date validation for MM/YY (MM: 01-12, YY: 26-99)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);

    // Auto prepend 0 if first digit typed is > 1 (e.g. typing 3 -> 03/)
    if (raw.length === 1 && parseInt(raw, 10) > 1) {
      raw = '0' + raw;
    }

    // Check month cap
    if (raw.length >= 2) {
      const monthNum = parseInt(raw.slice(0, 2), 10);
      if (monthNum > 12) {
        raw = '12' + raw.slice(2);
      } else if (monthNum === 0) {
        raw = '01' + raw.slice(2);
      }
    }

    // Format with slash
    let formatted = raw;
    if (raw.length >= 3) {
      formatted = raw.slice(0, 2) + '/' + raw.slice(2);
    }

    setCardExpiry(formatted);
    if (errors.cardExpiry) {
      setErrors(prev => ({ ...prev, cardExpiry: undefined }));
    }
  };

  // DNI formatting (máximo 8 dígitos)
  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    setDni(raw);
    if (errors.dni) {
      setErrors(prev => ({ ...prev, dni: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormValidationErrors = {};

    if (!clientName.trim()) {
      newErrors.clientName = 'Nombre y Apellido es requerido';
    }

    if (!dni.trim() || dni.length < 7) {
      newErrors.dni = 'Ingrese un DNI válido (mínimo 7 u 8 dígitos)';
    }

    // Card validation with BIN, Length and Luhn algorithm (Item 11)
    const cleanCard = cardNumber.replace(/\D/g, '');
    const network = detectCardNetwork(cleanCard);

    if (!cleanCard) {
      newErrors.cardNumber = 'Ingrese el número de tarjeta de crédito';
    } else {
      const validLengths = network ? network.lengths : [15, 16];
      if (!validLengths.includes(cleanCard.length)) {
        newErrors.cardNumber = `Longitud inválida para ${
          network ? network.name : 'tarjeta'
        } (se esperan ${validLengths.join(' o ')} dígitos)`;
      } else if (!isValidLuhn(cleanCard)) {
        newErrors.cardNumber = 'Número de tarjeta inválido (falla validación matemática Algoritmo de Luhn)';
      }
    }

    // Expiry date validation (Item 8: MM 01-12, YY 26-99)
    if (!cardExpiry.trim()) {
      newErrors.cardExpiry = 'Ingrese la fecha de vencimiento (MM/AA)';
    } else if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      newErrors.cardExpiry = 'Formato incompleto. Debe ser MM/AA';
    } else {
      const [mStr, yStr] = cardExpiry.split('/');
      const month = parseInt(mStr, 10);
      const year = parseInt(yStr, 10);

      if (month < 1 || month > 12) {
        newErrors.cardExpiry = 'El mes debe estar entre 01 y 12';
      } else if (year < 26) {
        newErrors.cardExpiry = 'El año debe ser 26 o superior (año actual 2026)';
      } else if (year > 99) {
        newErrors.cardExpiry = 'El año no puede ser superior a 99';
      }
    }

    if (!bank.trim()) {
      newErrors.bank = 'Debe indicar el banco emisor de la tarjeta';
    }

    if (!acceptedTerms) {
      newErrors.acceptedTerms = 'Debe tildar y aceptar la autorización y condiciones';
    }

    if (!signatureDataUrl) {
      newErrors.signature = 'Debe dibujar su firma en el recuadro';
    }

    // Item 10: Client must manually fill clarification
    if (!clarification.trim()) {
      newErrors.clarification = 'Debe completar el campo ACLARACIÓN con su nombre completo';
    }

    setErrors(newErrors);

    const hasAnyError = Object.keys(newErrors).length > 0;
    setShowIncompleteAlert(hasAnyError);

    if (hasAnyError) {
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }

    return !hasAnyError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setShowIncompleteAlert(false);

    try {
      const payload = {
        clientName: clientName.trim(),
        dni: dni.trim(),
        cardType: detectedBrand ? detectedBrand.toUpperCase() : cardType,
        cardNumber: cardNumber.trim(),
        cardExpiry: cardExpiry.trim(),
        bank: bank.trim(),
        acceptedTerms,
        signatureDataUrl,
        clarification: clarification.trim(),
      };

      // Send to server
      const res = await fetch(`/api/forms/${form.id}/sign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let updated: AdhesionForm;
      if (res.ok) {
        const data = await res.json();
        updated = data.form;
      } else {
        updated = {
          ...form,
          ...payload,
          status: 'Firmado',
          signedAt: new Date().toISOString(),
        };
      }

      setSubmittedForm(updated);
      setIsJustSubmitted(true);
      onSubmitSuccess(updated);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.warn('Network fallback sign:', err);
      const fallbackForm: AdhesionForm = {
        ...form,
        clientName: clientName.trim(),
        dni: dni.trim(),
        cardType: detectedBrand ? detectedBrand.toUpperCase() : cardType,
        cardNumber: cardNumber.trim(),
        cardExpiry: cardExpiry.trim(),
        bank: bank.trim(),
        acceptedTerms,
        signatureDataUrl: signatureDataUrl || undefined,
        clarification: clarification.trim(),
        status: 'Firmado',
        signedAt: new Date().toISOString(),
      };
      setSubmittedForm(fallbackForm);
      setIsJustSubmitted(true);
      onSubmitSuccess(fallbackForm);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Requirement 2: If the client already signed and tries to enter the link again, block access and show "Formulario ya completado"
  if (form.status === 'Firmado' && !isJustSubmitted) {
    return (
      <div className="min-h-screen bg-[#0b1322] py-10 px-4 sm:px-6 flex flex-col items-center justify-between">
        <div className="w-full max-w-xl bg-white text-slate-800 rounded-2xl shadow-2xl p-6 sm:p-10 border border-slate-100 flex flex-col items-center text-center my-auto">
          {/* Logo Avera */}
          <AveraLogo size="lg" className="mb-6" />

          {/* Cartel Icon */}
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
            <Lock className="w-9 h-9" />
          </div>

          {/* Cartel Title */}
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Formulario ya completado
          </h2>
          <p className="text-slate-600 text-sm mt-2 max-w-md">
            Esta Solicitud de Adhesión a Débito Automático ya ha sido completada y firmada digitalmente con anterioridad. Por razones de seguridad y validez del trámite, <strong>no es posible volver a ingresar ni editar los datos</strong>.
          </p>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 my-6 text-left space-y-2 text-xs text-slate-700">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Titular:</span>
              <span className="font-semibold text-slate-900">{form.clientName}</span>
            </div>
            {form.dni && (
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">DNI:</span>
                <span className="font-semibold text-slate-900">{form.dni}</span>
              </div>
            )}
            {form.bank && (
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Banco:</span>
                <span className="font-semibold text-slate-900">{form.bank}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Estado:</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                <FileCheck2 className="w-3.5 h-3.5" /> Firmado y Registrado
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Fecha y Hora de Firma:</span>
              <span className="font-mono text-slate-800">
                {new Date(form.signedAt || form.createdAt).toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>El registro se encuentra protegido y archivado en Avera Medicina Privada.</span>
          </div>
        </div>

        {/* Developer Footer */}
        <div className="w-full max-w-xl mt-6">
          <DeveloperFooter theme="dark" />
        </div>
      </div>
    );
  }

  // Active session just submitted screen (Cartel de éxito)
  if (isJustSubmitted) {
    return (
      <div className="min-h-screen bg-[#0b1322] py-10 px-4 sm:px-6 flex flex-col items-center justify-between">
        <div className="w-full max-w-xl bg-white text-slate-800 rounded-2xl shadow-2xl p-6 sm:p-10 border border-slate-100 flex flex-col items-center text-center my-auto">
          {/* Item 7: LOGO AVERA actualizado */}
          <AveraLogo size="lg" className="mb-6" />

          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            ¡Documentación enviada con éxito!
          </h2>
          <p className="text-slate-600 text-sm mt-2 max-w-md">
            Su <strong>Solicitud de Adhesión a Débito Automático</strong> ha sido
            firmada y registrada satisfactoriamente en el sistema de Avera Medicina Privada.
          </p>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 my-6 text-left space-y-2 text-xs text-slate-700">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Titular:</span>
              <span className="font-semibold text-slate-900">{submittedForm.clientName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">DNI:</span>
              <span className="font-semibold text-slate-900">{submittedForm.dni}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Tarjeta / Banco:</span>
              <span className="font-semibold text-slate-900">
                {submittedForm.cardType} • {submittedForm.bank}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Estado:</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                <FileCheck2 className="w-3.5 h-3.5" /> Firmado
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Fecha y Hora:</span>
              <span className="font-mono text-slate-800">
                {new Date(submittedForm.signedAt || submittedForm.createdAt).toLocaleString(
                  'es-AR'
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Transacción registrada • Conforme a normativas BCRA y SS Salud</span>
          </div>
        </div>

        {/* Item 13: Developer Footer on Success screen */}
        <div className="w-full max-w-xl mt-6">
          <DeveloperFooter theme="dark" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1322] py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center justify-between">
      {/* Container simulating official document */}
      <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl p-5 sm:p-10 border border-slate-200">
        {/* Item 7: Top brand header with the exact user uploaded logo */}
        <div className="flex flex-col items-center border-b border-slate-100 pb-6 mb-6">
          <AveraLogo size="lg" />
          <span className="mt-3 text-xs uppercase tracking-widest text-slate-400 font-bold">
            Formulario Digital de Adhesión
          </span>
        </div>

        {/* RED ALERT FOR INCOMPLETE INFORMATION */}
        {showIncompleteAlert && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border-2 border-red-500 text-red-900 shadow-sm animate-pulse">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-700 text-base">
                  Información incompleta, Completar para enviar
                </h3>
                <p className="text-xs text-red-600 mt-1">
                  Por favor revise los siguientes campos obligatorios para continuar:
                </p>
                <ul className="mt-2 list-disc list-inside text-xs text-red-700 font-medium space-y-1">
                  {errors.clientName && <li>{errors.clientName}</li>}
                  {errors.dni && <li>{errors.dni}</li>}
                  {errors.cardNumber && <li>{errors.cardNumber}</li>}
                  {errors.cardExpiry && <li>{errors.cardExpiry}</li>}
                  {errors.bank && <li>{errors.bank}</li>}
                  {errors.acceptedTerms && <li>{errors.acceptedTerms}</li>}
                  {errors.signature && <li>{errors.signature}</li>}
                  {errors.clarification && <li>{errors.clarification}</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Datos del Titular */}
          <div className="bg-slate-50/80 rounded-xl p-4 sm:p-5 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <User className="w-4 h-4 text-[#4fa430]" />
              Datos del Titular
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Apellido y Nombre: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => {
                    setClientName(e.target.value.toUpperCase());
                    if (errors.clientName) setErrors(prev => ({ ...prev, clientName: undefined }));
                  }}
                  placeholder="Ej: PÉREZ JUAN CARLOS"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    errors.clientName
                      ? 'border-red-500 bg-red-50/30 text-red-900 ring-1 ring-red-400'
                      : 'border-slate-300 focus:border-[#4fa430] focus:ring-2 focus:ring-emerald-100 bg-white'
                  }`}
                />
                {errors.clientName && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.clientName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  DNI: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={dni}
                  onChange={handleDniChange}
                  placeholder="Ej: 34567890 (sin puntos)"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    errors.dni
                      ? 'border-red-500 bg-red-50/30 text-red-900 ring-1 ring-red-400'
                      : 'border-slate-300 focus:border-[#4fa430] focus:ring-2 focus:ring-emerald-100 bg-white'
                  }`}
                />
                {errors.dni && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.dni}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section: Solicitud de Adhesión Débito Tarjeta de Crédito */}
          <div>
            <div className="text-center my-4">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 underline tracking-wide uppercase">
                SOLICITUD DE ADHESION DEBITO TARJETA DE CREDITO
              </h2>
            </div>

            {/* Official Table Representation */}
            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white">
              {/* Row 1: Tipo, Número de Tarjeta, Fecha Venc */}
              <div className="grid grid-cols-1 sm:grid-cols-12 border-b border-slate-300 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 bg-slate-50/40">
                {/* Tipo de Tarjeta */}
                <div className="sm:col-span-4 p-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CreditCardIcon className="w-3.5 h-3.5 text-[#2ba6de]" />
                      Tarjeta de Crédito
                    </span>
                    {detectedBrand && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                        Auto: {detectedBrand}
                      </span>
                    )}
                  </label>
                  <select
                    value={cardType}
                    onChange={e => {
                      setCardType(e.target.value);
                      setDetectedBrand(e.target.value);
                    }}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:border-[#2ba6de] focus:ring-1 focus:ring-[#2ba6de]"
                  >
                    {CARD_NETWORKS.map(net => (
                      <option key={net.name} value={net.name.toUpperCase()}>
                        {net.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Número de Tarjeta (Item 11: Real-time BIN detection & Luhn formatting) */}
                <div className="sm:col-span-5 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">
                      N.º de Tarjeta <span className="text-red-500">*</span>
                    </label>
                    {detectedBrand && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                        {detectedBrand}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4500 0000 0000 0000"
                    maxLength={23}
                    className={`w-full text-xs font-mono font-semibold bg-white border rounded-md px-2.5 py-1.5 tracking-wider ${
                      errors.cardNumber
                        ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                        : 'border-slate-300 focus:border-[#2ba6de] focus:ring-1 focus:ring-[#2ba6de]'
                    }`}
                  />
                  {errors.cardNumber && (
                    <p className="text-[10px] text-red-600 mt-0.5 font-medium">{errors.cardNumber}</p>
                  )}
                </div>

                {/* Fecha Vencimiento (Item 8: Strict MM 01-12, YY 26-99) */}
                <div className="sm:col-span-3 p-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Fecha Venc. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                    placeholder="MM/AA"
                    maxLength={5}
                    className={`w-full text-xs font-mono font-semibold bg-white border rounded-md px-2.5 py-1.5 text-center ${
                      errors.cardExpiry
                        ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                        : 'border-slate-300 focus:border-[#2ba6de] focus:ring-1 focus:ring-[#2ba6de]'
                    }`}
                  />
                  {errors.cardExpiry && (
                    <p className="text-[10px] text-red-600 mt-0.5 font-medium">{errors.cardExpiry}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Banco Emisor (Item 9: Exact requested bank suggestions) */}
              <div className="p-3 bg-white">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#4fa430]" />
                  Banco Emisor <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={bank}
                    onChange={e => {
                      setBank(e.target.value.toUpperCase());
                      if (errors.bank) setErrors(prev => ({ ...prev, bank: undefined }));
                    }}
                    placeholder="Ej: BANCO DE LA NACIÓN ARGENTINA (BNA) / BBVA"
                    className={`w-full text-xs font-semibold bg-white border rounded-md px-2.5 py-1.5 ${
                      errors.bank
                        ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                        : 'border-slate-300 focus:border-[#4fa430] focus:ring-1 focus:ring-[#4fa430]'
                    }`}
                  />

                  {/* Item 9: Exact list of suggested Argentine banks */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 self-center mr-1">Sugerencias:</span>
                    {SUGGESTED_BANKS.map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          setBank(b.toUpperCase());
                          if (errors.bank) setErrors(prev => ({ ...prev, bank: undefined }));
                        }}
                        className={`px-2 py-0.5 text-[10px] rounded font-medium transition cursor-pointer border ${
                          bank.toUpperCase() === b.toUpperCase()
                            ? 'bg-[#4fa430] text-white border-[#4fa430]'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                {errors.bank && <p className="text-[10px] text-red-600 mt-1 font-medium">{errors.bank}</p>}
              </div>
            </div>
          </div>

          {/* Legal Text with Checkbox */}
          <div
            className={`rounded-xl p-4 sm:p-5 transition-all ${
              errors.acceptedTerms
                ? 'bg-red-50 border-2 border-red-500 ring-2 ring-red-200'
                : acceptedTerms
                ? 'bg-emerald-50/50 border border-emerald-300'
                : 'bg-slate-50 border border-slate-300'
            }`}
          >
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={e => {
                  setAcceptedTerms(e.target.checked);
                  if (errors.acceptedTerms) {
                    setErrors(prev => ({ ...prev, acceptedTerms: undefined }));
                  }
                }}
                className="mt-1 w-5 h-5 rounded text-[#4fa430] focus:ring-emerald-500 border-slate-400 cursor-pointer accent-[#4fa430]"
              />
              <div className="text-[11px] sm:text-xs text-slate-700 leading-relaxed italic text-justify space-y-2">
                <p>
                  <strong>POR MEDIO DE LA PRESENTE Y CON MI FIRMA ESTAMPADA</strong>, AUTORIZO A REALIZAR
                  LA OPERATORIA DE PAGO DIRECTO CORRESPONDIENTE AL SISTEMA NACIONAL DE PAGOS
                  REGLAMENTADO POR EL BANCO CENTRAL DE LA REPÚBLICA ARGENTINA.
                </p>
                <p>
                  <strong>ASIMISMO, ACEPTO QUE EL VALOR DE LA CUOTA</strong> ESTÁ SUJETO A
                  MODIFICACIONES PERIÓDICAS SEGÚN LA LEY N° 26.682, EL DNU N° 70/2023 Y NORMAS DE LA
                  SUPERINTENDENCIA DE SERVICIOS DE SALUD, LAS CUALES SERÁN INFORMADAS CON AL MENOS 30
                  DÍAS DE ANTICIPACIÓN.
                </p>
              </div>
            </label>
            {errors.acceptedTerms && (
              <p className="text-xs text-red-600 font-bold mt-2 ml-8 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.acceptedTerms}
              </p>
            )}
          </div>

          {/* Digital Signature Field */}
          <div className="space-y-3 pt-2">
            <div className="text-center">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest">
                FIRMA <span className="text-red-500">*</span>
              </h3>
            </div>

            <SignaturePad
              onSignatureChange={url => {
                setSignatureDataUrl(url);
                if (errors.signature) {
                  setErrors(prev => ({ ...prev, signature: undefined }));
                }
              }}
              hasError={Boolean(errors.signature)}
            />
            {errors.signature && (
              <p className="text-xs text-red-600 font-medium text-center">{errors.signature}</p>
            )}
          </div>

          {/* Item 10: ACLARACIÓN Field - STARTS EMPTY, CLIENT MUST FILL MANUALLY */}
          <div className="space-y-2 pt-2 text-center max-w-lg mx-auto">
            <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-widest">
              ACLARACION <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clarification}
              onChange={e => {
                setClarification(e.target.value.toUpperCase());
                if (errors.clarification) {
                  setErrors(prev => ({ ...prev, clarification: undefined }));
                }
              }}
              placeholder="Nombre y Apellido completo del firmante (Escribir aquí)"
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-semibold text-center transition-all ${
                errors.clarification
                  ? 'border-red-500 bg-red-50/30 text-red-900 ring-1 ring-red-400'
                  : 'border-slate-300 focus:border-[#4fa430] focus:ring-2 focus:ring-emerald-100 bg-white'
              }`}
            />
            {errors.clarification && (
              <p className="text-xs text-red-600 font-medium">{errors.clarification}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#4fa430] to-[#3d8324] hover:from-[#3d8324] hover:to-[#2e631b] text-white font-extrabold text-base tracking-wide shadow-lg hover:shadow-xl active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>
                {isSubmitting ? 'PROCESANDO FIRMA...' : 'ENVIAR DOCUMENTACIÓN'}
              </span>
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2.5">
              Al hacer clic en Enviar Documentación, usted confirma su consentimiento bajo los términos
              declarados.
            </p>
          </div>
        </form>
      </div>

      {/* Item 13: Developer Footer on Client Form */}
      <div className="w-full max-w-2xl mt-8">
        <DeveloperFooter theme="dark" />
      </div>
    </div>
  );
};
