import React from 'react';

interface AvatarProps {
  name: string;
  photoUrl: string | null;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, photoUrl, className = '' }) => {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={`${className} object-cover`} />;
  }

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  const intToRGB = (i: number) => {
    const c = (i & 0x00FFFFFF).toString(16).toUpperCase();
    return '00000'.substring(0, 6 - c.length) + c;
  };
  
  const bgColor = `#${intToRGB(hashCode(name))}`;

  return (
    <div
      className={`flex items-center justify-center font-bold text-white ${className}`}
      style={{ backgroundColor: bgColor, background: `linear-gradient(135deg, ${bgColor} 0%, #${intToRGB(hashCode(name) >> 2)} 100%)` }}
      title={name}
    >
      <span>{getInitials(name)}</span>
    </div>
  );
};

export default Avatar;
