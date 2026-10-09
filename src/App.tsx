import { useState, useEffect, useCallback } from 'react';
import { AdhesionForm } from './types';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientForm } from './components/ClientForm';
import { ArrowLeft, Loader2 } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'avera_adhesion_forms_v1';

export default function App() {
  const [forms, setForms] = useState<AdhesionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

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

  // Sync activeFormId with URL query params
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const queryFormId = params.get('formId') || params.get('id');
      setActiveFormId(queryFormId);
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Fetch all forms from server or localStorage
  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch('/api/forms');
      if (res.ok) {
        const data = await res.json();
        if (data.forms && Array.isArray(data.forms)) {
          setForms(data.forms);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.forms));
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend fetch failed, checking localStorage fallback:', err);
    }

    // Fallback to localStorage if server isn't answering
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (local) {
        setForms(JSON.parse(local));
      } else {
        // Initial fallback seed
        const defaultSeed: AdhesionForm[] = [
          {
            id: 'f-1',
            clientName: 'RODA MONTAÑA MARIA ALEJANDRA',
            status: 'Pendiente',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'f-2',
            clientName: 'FERNANDEZ JULIO JAVIER',
            status: 'Pendiente',
            createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
          },
          {
            id: 'f-3',
            clientName: 'VEGA ERNESTO DAMIAN (2)',
            status: 'Pendiente',
            createdAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
          },
          {
            id: 'f-4',
            clientName: 'PELLIZA MAXIMILIANO JOSE RAMON',
            status: 'Pendiente',
            createdAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
          },
        ];
        setForms(defaultSeed);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultSeed));
      }
    } catch (e) {
      console.error('LocalStorage error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();

    // Auto refresh periodically so status changes appear automatically
    const interval = setInterval(() => {
      fetchForms();
    }, 8000);

    return () => clearInterval(interval);
  }, [fetchForms]);

  // Create new form
  const handleCreateForm = async (clientName: string, dni?: string): Promise<AdhesionForm | null> => {
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, dni }),
      });

      if (res.ok) {
        const data = await res.json();
        const createdForm: AdhesionForm = data.form;
        setForms(prev => [createdForm, ...prev]);
        return createdForm;
      }
    } catch (e) {
      console.warn('API create error, fallback to local creation:', e);
    }

    // Local fallback creation
    const newForm: AdhesionForm = {
      id: 'avera-' + Math.random().toString(36).substring(2, 9),
      clientName: clientName.trim().toUpperCase(),
      dni: dni ? dni.replace(/\D/g, '').slice(0, 8) : undefined,
      status: 'Pendiente',
      createdAt: new Date().toISOString(),
    };
    const updated = [newForm, ...forms];
    setForms(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return newForm;
  };

  // Delete form
  const handleDeleteForm = async (id: string): Promise<void> => {
    try {
      await fetch(`/api/forms/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Delete error:', e);
    }

    const updated = forms.filter(f => f.id !== id);
    setForms(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  // When client signs form
  const handleClientSubmitSuccess = (updatedForm: AdhesionForm) => {
    setForms(prev =>
      prev.map(f => (f.id === updatedForm.id ? updatedForm : f))
    );
    try {
      const local = forms.map(f => (f.id === updatedForm.id ? updatedForm : f));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
    } catch {
      // ignore
    }
  };

  // Navigate to Client View
  const handleSelectFormForClientView = (form: AdhesionForm) => {
    const url = new URL(window.location.href);
    url.searchParams.set('formId', form.id);
    window.history.pushState({}, '', url.toString());
    setActiveFormId(form.id);
  };

  // Navigate back to Admin Dashboard
  const handleBackToAdmin = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('formId');
    url.searchParams.delete('id');
    window.history.pushState({}, '', url.toString());
    setActiveFormId(null);
    fetchForms();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1626] flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#22c55e]" />
          <span className="text-sm font-medium">Cargando sistema de adhesión...</span>
        </div>
      </div>
    );
  }

  // Active form for client view
  const activeForm = activeFormId
    ? forms.find(f => f.id === activeFormId) || null
    : null;

  // If URL has formId, show client view
  if (activeFormId) {
    if (!activeForm) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-800 p-8 rounded-2xl max-w-md w-full border border-slate-700 space-y-4">
            <h2 className="text-lg font-bold text-red-400">Formulario no encontrado</h2>
            <p className="text-xs text-slate-300">
              El enlace que intenta abrir no corresponde a ningún formulario activo o ha sido eliminado.
            </p>
            <button
              type="button"
              onClick={handleBackToAdmin}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#22c55e] text-slate-950 font-bold text-xs cursor-pointer"
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
        {/* Top Floating Simulator Bar for Admin Convenience */}
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
              Vista del Cliente: <strong className="text-white">{activeForm.clientName}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              Estado actual:
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

  // Otherwise, show Admin Dashboard
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
