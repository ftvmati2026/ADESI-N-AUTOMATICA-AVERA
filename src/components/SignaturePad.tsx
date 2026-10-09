import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, CheckCircle2, Edit3 } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  hasError?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  hasError = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Initialize canvas with high DPI support
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Deep navy/black ink
    ctx.lineWidth = 2.4;
  }, []);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => {
      // Note: we preserve if needed or just re-setup
      setupCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setIsEmpty(true);
    onSignatureChange(null);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div
        className={`relative w-full max-w-lg h-44 rounded-xl border-2 transition-all duration-200 bg-white overflow-hidden shadow-sm ${
          hasError
            ? 'border-red-500 ring-2 ring-red-200'
            : !isEmpty
            ? 'border-emerald-500 shadow-emerald-50'
            : 'border-dashed border-slate-300 hover:border-slate-400'
        }`}
      >
        {/* Subtle guide line */}
        <div className="absolute inset-x-8 bottom-10 border-b border-dashed border-slate-200 pointer-events-none" />

        {/* Empty state placeholder / hint */}
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 select-none">
            <Edit3 className="w-6 h-6 mb-1.5 opacity-60 text-slate-500" />
            <span className="text-xs font-medium text-slate-500">
              Dibuje su firma aquí con el dedo o mouse
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              (Firma manuscrita digitalizada)
            </span>
          </div>
        )}

        {/* Signed badge indicator */}
        {!isEmpty && (
          <div className="absolute top-2.5 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200 pointer-events-none">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Firma registrada</span>
          </div>
        )}

        {/* Drawing Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Action button: Limpiar firma */}
      <div className="mt-2.5 flex items-center justify-between w-full max-w-lg px-1">
        <span className="text-xs text-slate-500">
          {isEmpty ? 'Campo obligatorio' : 'Para volver a firmar, presione limpiar'}
        </span>
        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            isEmpty
              ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100'
              : 'text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 shadow-xs cursor-pointer'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpiar firma</span>
        </button>
      </div>
    </div>
  );
};
