import React from 'react';

interface EyeIconProps {
  open: boolean;
  size?: number;
  color?: string;
}

const EyeIcon: React.FC<EyeIconProps> = ({ open, size = 20, color = '#555' }) =>
  open ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <ellipse cx="12" cy="12" rx="9" ry="5.5" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <ellipse cx="12" cy="12" rx="9" ry="5.5" />
      <circle cx="12" cy="12" r="2.5" />
      <line x1="4" y1="20" x2="20" y2="4" />
    </svg>
  );

export default EyeIcon;
