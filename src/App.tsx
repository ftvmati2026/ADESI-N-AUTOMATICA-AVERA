import { useState, useEffect, useCallback } from 'react';
import { AdhesionForm } from './types';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientForm } from './components/ClientForm';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import {
  getRemoteForms,
  getRemoteFormById,
  saveRemoteForm,
  deleteRemoteForm
} from './lib/formsService';

// Función para extraer el ID de la URL ya sea por path (/formulario/:id o /form/:id) o query (?formId=XYZ o ?id=XYZ)
function extractFormIdFromLocation(): string | null {
  const pathname = window.location.pathname;
  // Soporta /formulario/:id, /formulario/avera-xxx, /form/:id
  const matchPath = pathname.match(/^\/(?:formulario|form)\/([^/?#]+)/i);
  if (matchPath && matchPath[1]) {
    return decodeURIComponent(matchPath[1]);
  }

  // Soporta query params ?formId=XYZ o ?id=XYZ
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get('formId') || params.get('id');
  if (queryId) {
    return queryId.trim();
  }

  return null;
}

export default function App() {
  const [forms, setForms] = useState<AdhesionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<AdhesionForm | null>(null);
  const [isFetchingActiveForm, setIsFetchingActiveForm] = useState(false);

  // Day / Night Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('avera_theme');
      return saved === 'light' || saved === 'dark' ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('avera_theme', next);
      } catch {}
      return next;
    });
  };

  // Sync activeFormId with URL (tanto path como query param)
  useEffect(() => {
    const handleUrlChange = () => {
      const formId = extractFormIdFromLocation();
      setActiveFormId(formId);
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Cargar lista de formularios desde la base de datos remota Firestore
  // Si la base de datos está vacía, la lista PERMANECE EN CERO de forma indefinida
  // NUNCA se auto-cargan formularios de prueba o demo
  const fetchForms = useCallback(async () => {
    try {
      // 1. Consulta remota prioritaria a Firestore
      const remote = await getRemoteForms();
      if (Array.isArray(remote)) {
        // Asignar el resultado exacto de la base de datos (incluso si está vacío [])
        setForms(remote);
        setLoading(false);
        return;
      }

      // 2. Fallback de contingencia sólo si Firestore no pudo responder
      try {
        const res = await fetch('/api/forms');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.forms)) {
            setForms(data.forms);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback
      }

      setForms([]);
    } catch (err) {
      console.error('Error fetching forms from remote database:', err);
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar lista de formularios periódicamente en el Admin Dashboard
  useEffect(() => {
    fetchForms();
    const interval = setInterval(() => {
      // Solo refrescar periódicamente si estamos en la vista de administración
      if (!activeFormId) {
        fetchForms();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchForms, activeFormId]);

  // Cuando cambia activeFormId, consultar directamente la base de datos remota para ese ID
  useEffect(() => {
    if (!activeFormId) {
      setActiveForm(null);
      setIsFetchingActiveForm(false);
      return;
    }

    let isMounted = true;
    setIsFetchingActiveForm(true);

    const loadSingleForm = async () => {
      try {
        // 1. Consultar base de datos remota en la nube Firestore
        const remoteDoc = await getRemoteFormById(activeFormId);
        if (isMounted && remoteDoc) {
          setActiveForm(remoteDoc);
          setIsFetchingActiveForm(false);
          return;
        }

        // 2. Si no se encontró en Firestore aún, verificar backend /api/forms/:id
        try {
          const res = await fetch(`/api/forms/${activeFormId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.form && isMounted) {
              setActiveForm(data.form);
              // Sincronizar en Firestore
              saveRemoteForm(data.form).catch(() => {});
              setIsFetchingActiveForm(false);
              return;
            }
          }
        } catch {
          // ignore
        }

        // 3. Verificar estado en memoria local
        const local = forms.find(f => f.id === activeFormId);
        if (isMounted) {
          setActiveForm(local || null);
        }
      } catch (e) {
        console.error('Error fetching active form by ID:', e);
        if (isMounted) {
          const local = forms.find(f => f.id === activeFormId);
          setActiveForm(local || null);
        }
      } finally {
        if (isMounted) {
          setIsFetchingActiveForm(false);
        }
      }
    };

    loadSingleForm();

    return () => {
      isMounted = false;
    };
  }, [activeFormId, forms]);

  // Create new form: Guarda inmediatamente en base de datos remota Firestore y servidor
  const handleCreateForm = async (clientName: string, dni?: string): Promise<AdhesionForm | null> => {
    const uniqueId = 'avera-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
    const sanitizedDni = dni ? dni.replace(/\D/g, '').slice(0, 8) : undefined;

    const newForm: AdhesionForm = {
      id: uniqueId,
      clientName: clientName.trim().toUpperCase(),
      dni: sanitizedDni,
      status: 'Pendiente',
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Guardar en base de datos remota Firestore
      await saveRemoteForm(newForm);

      // 2. Notificar al backend Express (opcional si está activo)
      fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      }).catch(() => {});

      // Actualizar estado local
      setForms(prev => [newForm, ...prev.filter(f => f.id !== uniqueId)]);
      return newForm;
    } catch (e) {
      console.error('Error saving form to Firestore:', e);
      // Fallback a servidor Express
      try {
        const res = await fetch('/api/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientName, dni }),
        });
        if (res.ok) {
          const data = await res.json();
          const created: AdhesionForm = data.form;
          setForms(prev => [created, ...prev]);
          return created;
        }
      } catch {}

      // Fallback local en caso extremo
      setForms(prev => [newForm, ...prev]);
      return newForm;
    }
  };

  // Delete form: Elimina de la base de datos remota Firestore
  const handleDeleteForm = async (id: string): Promise<void> => {
    try {
      await deleteRemoteForm(id);
    } catch (e) {
      console.warn('Error deleting remote form:', e);
    }

    try {
      fetch(`/api/forms/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch {}

    setForms(prev => prev.filter(f => f.id !== id));
  };

  // When client signs form
  const handleClientSubmitSuccess = (updatedForm: AdhesionForm) => {
    setActiveForm(updatedForm);
    setForms(prev =>
      prev.map(f => (f.id === updatedForm.id ? updatedForm : f))
    );
  };

  // Navigate to Client View
  const handleSelectFormForClientView = (form: AdhesionForm) => {
    const url = new URL(window.location.href);
    url.searchParams.set('formId', form.id);
    window.history.pushState({}, '', url.toString());
    setActiveFormId(form.id);
    setActiveForm(form);
  };

  // Navigate back to Admin Dashboard
  const handleBackToAdmin = () => {
    // Si la ruta era /formulario/:id, volver a /
    if (window.location.pathname.startsWith('/formulario') || window.location.pathname.startsWith('/form')) {
      window.history.pushState({}, '', '/');
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('formId');
      url.searchParams.delete('id');
      window.history.pushState({}, '', url.toString());
    }
    setActiveFormId(null);
    setActiveForm(null);
    fetchForms();
  };

  if (loading && !activeFormId) {
    return (
      <div className="min-h-screen bg-[#0e1626] flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#22c55e]" />
          <span className="text-sm font-medium">Conectando con base de datos remota...</span>
        </div>
      </div>
    );
  }

  // Si la URL contiene un formId, mostrar la vista del formulario del cliente
  if (activeFormId) {
    if (isFetchingActiveForm) {
      return (
        <div className="min-h-screen bg-[#0e1626] flex items-center justify-center text-slate-300">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#22c55e]" />
            <span className="text-sm font-medium">Cargando formulario desde la nube...</span>
          </div>
        </div>
      );
    }

    if (!activeForm) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-800 p-8 rounded-2xl max-w-md w-full border border-slate-700 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6 text-red-400 rotate-180" />
            </div>
            <h2 className="text-lg font-bold text-red-400">Formulario no encontrado</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              El enlace que intenta abrir no corresponde a ningún formulario registrado en la base de datos o ha sido eliminado por el administrador.
            </p>
            <div className="text-[11px] text-slate-400 bg-slate-900/50 p-2.5 rounded-lg border border-slate-700 font-mono">
              ID consultado: {activeFormId}
            </div>
            <button
              type="button"
              onClick={handleBackToAdmin}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#22c55e] text-slate-950 font-bold text-xs cursor-pointer hover:bg-[#1ea751] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al panel administrativo</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        {/* Barra superior indicadora para administradores o simulación */}
        <aside aria-label="Modo de Vista" className="bg-[#101b2c] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300 sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackToAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al Panel</span>
            </button>
            <span className="hidden sm:inline-block text-slate-400">|</span>
            <span className="hidden sm:inline-block text-slate-400">
              Formulario en Línea: <strong className="text-white">{activeForm.clientName}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              Estado:
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                activeForm.status === 'Firmado'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {activeForm.status}
            </span>
          </div>
        </aside>

        <ClientForm
          form={activeForm}
          onSubmitSuccess={handleClientSubmitSuccess}
          onBackToAdmin={handleBackToAdmin}
        />
      </div>
    );
  }

  // Pantalla principal: Admin Dashboard
  return (
    <AdminDashboard
      forms={forms}
      onCreateForm={handleCreateForm}
      onDeleteForm={handleDeleteForm}
      onSelectFormForClientView={handleSelectFormForClientView}
      onRefresh={fetchForms}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
