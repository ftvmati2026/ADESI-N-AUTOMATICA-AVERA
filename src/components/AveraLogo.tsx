import React from 'react';
import { AVERA_LOGO_SRC } from '../utils/averaLogoData';

interface AveraLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const AveraLogo: React.FC<AveraLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  // Proportional widths maintaining the exact aspect ratio of Imagen 2 (440 x 250)
  const sizeClasses = {
    xs: 'w-[105px]',
    sm: 'w-[145px]',
    md: 'w-[225px]',
    lg: 'w-[295px]',
    xl: 'w-[365px]',
  };

  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <img
        src={AVERA_LOGO_SRC}
        alt="Avera Medicina Privada"
        className={`${sizeClasses[size]} h-auto object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.03)]`}
        loading="eager"
        draggable={false}
      />
    </div>
  );
};


