import React from 'react';

interface PesoLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Professional PESO (Public Employment Service Office) Logo Component
 * Displays the official PESO Juban logo image with responsive sizing
 */
const PesoLogo: React.FC<PesoLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/peso.png"
        alt="PESO Juban - Public Employment Service Office"
        className={`${sizeMap[size]} object-contain drop-shadow-md hover:drop-shadow-lg transition-shadow duration-300`}
        loading="lazy"
      />
    </div>
  );
};

export default PesoLogo;

