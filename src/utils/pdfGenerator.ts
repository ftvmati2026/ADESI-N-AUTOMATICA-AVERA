import { jsPDF } from 'jspdf';
import { AdhesionForm } from '../types';
import { AVERA_LOGO_PNG_DATA_URL, AVERA_LOGO_RATIO } from './averaLogoData';

export function generateAdhesionPDF(form: AdhesionForm, downloadImmediately = true): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 18;

  // --- BRAND LOGO ---
  // Official Avera Medicina Privada high-resolution vector rendered logo
  const logoWidth = 62;
  const logoHeight = logoWidth / AVERA_LOGO_RATIO;
  const logoX = (pageWidth - logoWidth) / 2;
  const logoY = 12;

  try {
    doc.addImage(
      AVERA_LOGO_PNG_DATA_URL,
      'PNG',
      logoX,
      logoY,
      logoWidth,
      logoHeight,
      undefined,
      'FAST'
    );
    currentY = logoY + logoHeight + 8;
  } catch (err) {
    console.warn('Fallback adding logo to PDF:', err);
    currentY = 52;
  }

  // --- DATOS DEL TITULAR ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Datos del Titular:', margin, currentY);

  currentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Apellido y Nombre:', margin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(` ${form.clientName || '---'}`, margin + 38, currentY);

  currentY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('DNI:', margin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(` ${form.dni || '---'}`, margin + 12, currentY);

  currentY += 15;

  // --- SOLICITUD DE ADHESION TITULO ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(0, 0, 0);
  const titleText = 'SOLICITUD DE ADHESION DEBITO TARJETA DE CREDITO';
  doc.text(titleText, margin, currentY);

  const titleWidth = doc.getTextWidth(titleText);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY + 1.2, margin + titleWidth, currentY + 1.2);

  currentY += 10;

  // --- TABLA TARJETA DE CREDITO ---
  const tableX = margin;
  const tableY = currentY;
  const col1Width = contentWidth * 0.38;
  const col2Width = contentWidth * 0.38;
  const col3Width = contentWidth * 0.24;
  const rowHeight1 = 12;
  const rowHeight2 = 10;
  const tableHeight = rowHeight1 + rowHeight2;

  // Outer border & fill
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.35);
  doc.rect(tableX, tableY, contentWidth, tableHeight);

  // Row 1 separator
  doc.line(tableX, tableY + rowHeight1, tableX + contentWidth, tableY + rowHeight1);

  // Column vertical lines for row 1
  doc.line(tableX + col1Width, tableY, tableX + col1Width, tableY + rowHeight1);
  doc.line(tableX + col1Width + col2Width, tableY, tableX + col1Width + col2Width, tableY + rowHeight1);

  // Headers (Row 1)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TARJETA DE CREDITO', tableX + 3, tableY + 4.5);
  doc.text('N.º DE TARJETA', tableX + col1Width + 3, tableY + 4.5);
  doc.text('FECHA VENC.:', tableX + col1Width + col2Width + 3, tableY + 4.5);

  // Values (Row 1)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  // Full 16-digit card number formatted in 4-digit groups (e.g. 4561 1234 5678 7351)
  let formattedCard = form.cardNumber || '---';
  if (formattedCard && formattedCard !== '---') {
    const cleanDigits = formattedCard.replace(/\D/g, '');
    if (cleanDigits.length > 0) {
      formattedCard = cleanDigits.replace(/(\d{4})(?=\d)/g, '$1 ');
    }
  }

  doc.text(form.cardType || 'TARJETA DE CRÉDITO', tableX + 3, tableY + 9.5);
  doc.text(formattedCard, tableX + col1Width + 3, tableY + 9.5);
  doc.text(form.cardExpiry || '---', tableX + col1Width + col2Width + 3, tableY + 9.5);

  // Row 2: BANCO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('BANCO:', tableX + 3, tableY + rowHeight1 + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(form.bank || '---', tableX + 22, tableY + rowHeight1 + 6.5);

  currentY += tableHeight + 14;

  // --- TEXTO LEGAL ---
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 41, 59);
  doc.setLineHeightFactor(1.35);

  const legalP1 =
    'POR MEDIO DE LA PRESENTE Y CON MI FIRMA ESTAMPADA, AUTORIZO A REALIZAR LA OPERATORIA DE PAGO DIRECTO CORRESPONDIENTE AL SISTEMA NACIONAL DE PAGOS REGLAMENTADO POR EL BANCO CENTRAL DE LA REPÚBLICA ARGENTINA.';

  const legalP2 =
    'ASIMISMO, ACEPTO QUE EL VALOR DE LA CUOTA ESTÁ SUJETO A MODIFICACIONES PERIÓDICAS SEGÚN LA LEY N° 26.682, EL DNU N° 70/2023 Y NORMAS DE LA SUPERINTENDENCIA DE SERVICIOS DE SALUD, LAS CUALES SERÁN INFORMADAS CON AL MENOS 30 DÍAS DE ANTICIPACIÓN.';

  const splitP1 = doc.splitTextToSize(legalP1, contentWidth);
  doc.text(splitP1, margin, currentY);
  currentY += splitP1.length * 4.2 + 4;

  const splitP2 = doc.splitTextToSize(legalP2, contentWidth);
  doc.text(splitP2, margin, currentY);
  currentY += splitP2.length * 4.2 + 18;

  // --- FIRMA Y ACLARACION ---
  const signAreaY = currentY;

  // If signature image exists, embed it
  if (form.signatureDataUrl) {
    try {
      const signImgWidth = 55;
      const signImgHeight = 22;
      const signImgX = (pageWidth - signImgWidth) / 2;
      doc.addImage(form.signatureDataUrl, 'PNG', signImgX, signAreaY - 14, signImgWidth, signImgHeight);
    } catch (e) {
      console.warn('Error adding signature image to PDF:', e);
    }
  }

  // Signature line
  const lineW = 65;
  const lineX = (pageWidth - lineW) / 2;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(lineX, signAreaY + 12, lineX + lineW, signAreaY + 12);

  // Label: FIRMA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('FIRMA', pageWidth / 2, signAreaY + 17, { align: 'center' });

  // ACLARACION
  currentY = signAreaY + 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ACLARACION', pageWidth / 2, currentY, { align: 'center' });

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const aclaraText = form.clarification || form.clientName || '---';
  doc.text(aclaraText, pageWidth / 2, currentY, { align: 'center' });

  // --- SECURITY FOOTER ---
  const footerY = 275;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  const signedDateStr = form.signedAt
    ? new Date(form.signedAt).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date(form.createdAt).toLocaleDateString('es-AR');

  doc.text(
    `Documento digitalizado y registrado • Avera Medicina Privada • ID Formulario: ${form.id}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.text(
    `Estado: ${form.status.toUpperCase()} • Fecha: ${signedDateStr} • Conforme a normativa BCRA y SS Salud`,
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );

  if (downloadImmediately) {
    const filename = `${(form.clientName || 'formulario').trim()}.pdf`;
    doc.save(filename);
  }

  return doc;
}
