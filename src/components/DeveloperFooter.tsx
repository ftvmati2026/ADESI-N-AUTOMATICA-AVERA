import React from 'react';
import { Mail, Phone } from 'lucide-react';

interface DeveloperFooterProps {
  className?: string;
  theme?: 'light' | 'dark';
}

export const DeveloperFooter: React.FC<DeveloperFooterProps> = ({
  className = '',
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  return (
    <footer
      className={`w-full py-5 px-4 text-center border-t transition-colors select-none ${
        isLight
          ? 'bg-slate-100/80 border-slate-200 text-slate-600'
          : 'bg-[#09101d] border-slate-800/80 text-slate-400'
      } ${className}`}
    >
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center space-y-1.5 text-xs">
        <p className={`font-semibold tracking-wide ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
          Diseñado y Desarrollado en su totalidad por <span className="text-[#4fa430] font-bold">Matías Gómez</span>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <a
            href="https://wa.me/5492612404479"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-[#25D366] transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-[#25D366]" />
            <span>+54 9 2612404479</span>
          </a>

          <span className="hidden sm:inline text-slate-600">•</span>

          <a
            href="mailto:ftvmati2022@gmail.com"
            className="inline-flex items-center gap-1.5 hover:text-blue-400 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-blue-400" />
            <span>ftvmati2022@gmail.com</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
