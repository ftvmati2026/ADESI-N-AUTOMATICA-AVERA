import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Download,
  Calendar,
  Clock,
  Check,
  FileText,
  AlertCircle,
  FileCheck2,
  RefreshCw,
  Sun,
  Moon,
  IdCard,
  User,
} from 'lucide-react';
import { AdhesionForm } from '../types';
import { generateAdhesionPDF } from '../utils/pdfGenerator';
import { AveraLogo } from './AveraLogo';
import { DeveloperFooter } from './DeveloperFooter';

interface AdminDashboardProps {
  forms: AdhesionForm[];
  onCreateForm: (clientName: string, dni?: string) => Promise<AdhesionForm | null>;
  onDeleteForm: (id: string) => Promise<void>;
  onSelectFormForClientView: (form: AdhesionForm) => void;
  onRefresh?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  forms,
  onCreateForm,
  onDeleteForm,
  onRefresh,
  theme,
  onToggleTheme,
}) => {
  // Input for new form
  const [newClientName, setNewClientName] = useState('');
  const [newDni, setNewDni] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pendiente' | 'Firmado'>('all');

  // WhatsApp button "Link Copiado" notification badge tracking
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);

  // Delete animation & confirmation
  const [animatingTrashId, setAnimatingTrashId] = useState<string | null>(null);
  const [deleteIdConfirm, setDeleteIdConfirm] = useState<string | null>(null);

  const isLight = theme === 'light';

  // Helper to format days elapsed
  const getElapsedDaysText = (dateIso: string) => {
    const createdDate = new Date(dateIso);
    const now = new Date();

    const createdZero = new Date(
      createdDate.getFullYear(),
      createdDate.getMonth(),
      createdDate.getDate()
    );
    const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffMs = nowZero.getTime() - createdZero.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Hace 1 día';
    } else {
      return `Hace ${diffDays} días`;
    }
  };

  // Helper to format date DD/MM/YYYY
  const formatDate = (dateIso: string) => {
    const d = new Date(dateIso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper to format time HH:MM
  const formatTime = (dateIso: string) => {
    const d = new Date(dateIso);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  // Generate shareable link
  const getShareableUrl = (formId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('formId', formId);
    return url.toString();
  };

  // 3 a: WhatsApp button ONLY copies link and shows "Link Copiado" tooltip badge
  const handleWhatsAppCopy = (form: AdhesionForm) => {
    const shareUrl = getShareableUrl(form.id);
    navigator.clipboard.writeText(shareUrl);
    setCopiedFormId(form.id);

    // Auto reset after 2.5s
    setTimeout(() => {
      setCopiedFormId(prev => (prev === form.id ? null : prev));
    }, 2500);
  };

  // Handle create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      setCreateError('Por favor ingrese el Nombre y Apellido del Titular');
      return;
    }

    setCreateError('');
    setIsCreating(true);

    try {
      const created = await onCreateForm(newClientName.trim(), newDni.trim() || undefined);
      if (created) {
        setNewClientName('');
        setNewDni('');
        setToastMessage(`Formulario generado con éxito para ${created.clientName}`);
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch {
      setCreateError('No se pudo generar el formulario. Intente nuevamente.');
    } finally {
      setIsCreating(false);
    }
  };

  // 3 d: Super animated trash click
  const handleTrashClick = (id: string) => {
    setAnimatingTrashId(id);
    // Trigger little delay for animation to play before showing modal
    setTimeout(() => {
      setDeleteIdConfirm(id);
      setAnimatingTrashId(null);
    }, 450);
  };

  // Filtered forms
  const filteredForms = useMemo(() => {
    return forms.filter(form => {
      const matchesSearch =
        form.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (form.dni && form.dni.includes(searchQuery));

      const matchesStatus =
        statusFilter === 'all' ? true : form.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [forms, searchQuery, statusFilter]);

  // Statistics
  const pendingCount = forms.filter(f => f.status === 'Pendiente').length;
  const signedCount = forms.filter(f => f.status === 'Firmado').length;

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#0b1322] text-slate-100'
      }`}
    >
      {/* Top Notification Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#15803d] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-bounce border border-emerald-400">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header
        className={`border-b sticky top-0 z-20 shadow-md transition-colors ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-[#101928] border-slate-800'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AveraLogo size="sm" showSubtitle={false} />
            <div className={`border-l pl-3 ${isLight ? 'border-slate-300' : 'border-slate-700'}`}>
              <h1
                className={`text-sm sm:text-base font-bold tracking-tight flex items-center gap-2 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                Sistema de Débito Automático
                <span
                  className={`hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase font-semibold rounded ${
                    isLight
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-blue-950 text-blue-400 border border-blue-800'
                  }`}
                >
                  Admin
                </span>
              </h1>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Avera Medicina Privada • Gestión de Solicitudes y Firmas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Day / Night Switcher (Item 4) */}
            <button
              type="button"
              onClick={onToggleTheme}
              title={isLight ? 'Cambiar a Modo Noche' : 'Cambiar a Modo Día'}
              className={`p-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
              }`}
            >
              {isLight ? (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline text-slate-700">Modo Noche</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-amber-300">Modo Día</span>
                </>
              )}
            </button>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="Actualizar listado"
                className={`p-2 rounded-xl transition cursor-pointer ${
                  isLight
                    ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <div
              className={`hidden sm:flex items-center gap-2 text-xs pl-2 border-l ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}
            >
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                {pendingCount} Pendientes
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                {signedCount} Firmados
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
        {/* GENERATE FORM SECTION (With DNI added - Item 5) */}
        <section
          className={`rounded-2xl p-5 sm:p-6 border shadow-xl transition-colors ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-[#131d2e] border-slate-800/80'
          }`}
        >
          <div className="mb-4">
            <h2
              className={`text-base sm:text-lg font-bold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              <FileText className="w-5 h-5 text-[#4fa430]" />
              Generar Nuevo Formulario de Adhesión
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Complete el nombre del titular y el DNI para crear la solicitud y habilitar el enlace
            </p>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Apellido y Nombre */}
              <div className="relative sm:col-span-7">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={newClientName}
                  onChange={e => {
                    setNewClientName(e.target.value.toUpperCase());
                    if (createError) setCreateError('');
                  }}
                  placeholder="Nombre y Apellido del Titular (Ej: RODA MONTAÑA MARIA ALEJANDRA)"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isLight
                      ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#4fa430]'
                      : 'bg-[#0d1624] border border-slate-700 text-white placeholder-slate-500 focus:border-[#4fa430]'
                  }`}
                />
              </div>

              {/* DNI (Item 5) */}
              <div className="relative sm:col-span-3">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <IdCard className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={newDni}
                  onChange={e => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 8);
                    setNewDni(clean);
                    if (createError) setCreateError('');
                  }}
                  placeholder="DNI del Titular (Ej: 34567890)"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isLight
                      ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#4fa430]'
                      : 'bg-[#0d1624] border border-slate-700 text-white placeholder-slate-500 focus:border-[#4fa430]'
                  }`}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isCreating}
                className="sm:col-span-2 inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#4fa430] hover:bg-[#3d8324] text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{isCreating ? 'Generando...' : 'Generar'}</span>
              </button>
            </div>

            {createError && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {createError}
              </p>
            )}
          </form>
        </section>

        {/* SEARCH AND FILTERS */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar formularios rápidamente por nombre o DNI..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all ${
                isLight
                  ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-500 shadow-xs'
                  : 'bg-[#131d2e] border border-slate-800 text-white placeholder-slate-500 focus:border-slate-600'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          <div
            className={`flex items-center gap-1 p-1 rounded-xl border self-start sm:self-auto ${
              isLight
                ? 'bg-white border-slate-300'
                : 'bg-[#131d2e] border-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'all'
                  ? isLight
                    ? 'bg-slate-200 text-slate-900 shadow-xs'
                    : 'bg-slate-700 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({forms.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Pendiente')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'Pendiente'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                  : 'text-slate-500 hover:text-amber-500'
              }`}
            >
              Pendientes ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Firmado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'Firmado'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-500 hover:text-emerald-500'
              }`}
            >
              Firmados ({signedCount})
            </button>
          </div>
        </div>

        {/* FORMS TABLE (MATCHING IMAGE 2 EXACTLY) */}
        <div
          className={`rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-[#101928] border-slate-800/90'
          }`}
        >
          {/* Table Header: ARCHIVO PDF | ESTADO | ACCIONES */}
          <div
            className={`grid grid-cols-12 px-6 py-4 border-b text-[11px] font-bold uppercase tracking-wider ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-500'
                : 'bg-[#0d1624] border-slate-800 text-slate-400'
            }`}
          >
            <div className="col-span-6 sm:col-span-6">ARCHIVO PDF</div>
            <div className="col-span-4 sm:col-span-4">ESTADO</div>
            <div className="col-span-2 sm:col-span-2 text-right sm:text-center">ACCIONES</div>
          </div>

          {/* Table Body */}
          {filteredForms.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No se encontraron formularios</p>
              {searchQuery && (
                <p className="text-xs text-slate-500 mt-1">
                  Intente con otro término de búsqueda
                </p>
              )}
            </div>
          ) : (
            <div className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
              {filteredForms.map(form => {
                const isSigned = form.status === 'Firmado';
                const fileName = `${form.clientName}.pdf`;
                const elapsedText = getElapsedDaysText(form.createdAt);
                const dateText = formatDate(form.createdAt);
                const timeText = formatTime(form.createdAt);
                const isCopied = copiedFormId === form.id;
                const isAnimatingTrash = animatingTrashId === form.id;

                return (
                  <div
                    key={form.id}
                    className={`grid grid-cols-12 px-6 py-5 items-center transition-colors group ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-[#152238]/60'
                    }`}
                  >
                    {/* ARCHIVO PDF Column */}
                    <div className="col-span-6 sm:col-span-6 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold text-xs sm:text-sm tracking-tight break-words ${
                            isLight ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {fileName}
                        </span>
                      </div>

                      {/* Item 2: ONLY DNI and Banco (NO card number in the panel) */}
                      {form.dni && (
                        <span className={`text-[11px] block mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          DNI: {form.dni} {form.bank ? `• ${form.bank}` : ''}
                        </span>
                      )}
                    </div>

                    {/* ESTADO Column (Matching Image 2: Badge, Calendar Date, Elapsed Days) */}
                    <div className="col-span-4 sm:col-span-4 flex flex-col items-start gap-1">
                      {isSigned ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Firmado</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>Pendiente</span>
                        </div>
                      )}

                      {/* Creation Date */}
                      <div
                        className={`flex items-center gap-1.5 text-xs font-mono mt-0.5 ${
                          isLight ? 'text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dateText}</span>
                        <span className="text-[10px] text-slate-400">({timeText})</span>
                      </div>

                      {/* Days Elapsed */}
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400/90 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{elapsedText}</span>
                      </div>

                      {/* Download PDF button when firmado */}
                      {isSigned && (
                        <button
                          type="button"
                          onClick={() => generateAdhesionPDF(form)}
                          className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#4fa430] hover:bg-[#3d8324] text-white text-[11px] font-bold shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar PDF</span>
                        </button>
                      )}
                    </div>

                    {/* ACCIONES Column: ONLY WhatsApp button (copies link) + Animated Trash button */}
                    <div className="col-span-2 sm:col-span-2 flex items-center justify-end sm:justify-center gap-2 relative">
                      {/* 3 a: WhatsApp Button - Copies link and shows "Link Copiado" */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => handleWhatsAppCopy(form)}
                          title="Copiar enlace para WhatsApp"
                          className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[#25D366] hover:text-[#20ba59] border border-emerald-500/30 transition-all cursor-pointer active:scale-90 flex items-center justify-center shadow-xs"
                        >
                          <svg
                            className="w-4 h-4 fill-current"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.18 8.18 0 0 1-5.82 2.42c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.16 8.16 0 0 1-1.25-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.51 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.49-1.4-1.74-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08s.89 2.41 1.01 2.58c.13.17 1.75 2.68 4.24 3.76.59.26 1.05.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.3z" />
                          </svg>
                        </button>

                        {/* "Link Copiado" Tooltip Badge */}
                        {isCopied && (
                          <div className="absolute -top-8 right-0 sm:left-1/2 sm:-translate-x-1/2 whitespace-nowrap bg-[#25D366] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 z-30 animate-bounce">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Link Copiado</span>
                          </div>
                        )}
                      </div>

                      {/* 3 d: Trash Bin Button with Super Animated effect */}
                      <button
                        type="button"
                        onClick={() => handleTrashClick(form.id)}
                        title="Eliminar formulario"
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isAnimatingTrash
                            ? 'bg-red-500 text-white scale-125 rotate-12 ring-4 ring-red-300'
                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 hover:scale-110 active:scale-95'
                        }`}
                      >
                        <Trash2
                          className={`w-4 h-4 transition-transform duration-300 ${
                            isAnimatingTrash ? 'animate-spin' : 'group-hover:rotate-6'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteIdConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`border rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
              isLight
                ? 'bg-white border-slate-300 text-slate-800'
                : 'bg-[#152238] border-slate-700 text-slate-100'
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto animate-bounce">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                ¿Eliminar formulario?
              </h3>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Esta acción es definitiva. Se eliminará el registro y no se podrá recuperar.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteIdConfirm(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
                  isLight
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteIdConfirm;
                  setDeleteIdConfirm(null);
                  await onDeleteForm(id);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer transition shadow-md active:scale-95"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item 13: Developer Footer with Matías Gómez credits */}
      <DeveloperFooter theme={theme} />
    </div>
  );
};
