import React from 'react';

interface IconProps {
  name: string;
  className?: string;
  onClick?: () => void;
}

export const Icon: React.FC<IconProps> = ({ name, className = '', onClick }) => {
  return (
    <span 
      className={`material-icons-outlined select-none ${className}`} 
      onClick={onClick}
    >
      {name}
    </span>
  );
};