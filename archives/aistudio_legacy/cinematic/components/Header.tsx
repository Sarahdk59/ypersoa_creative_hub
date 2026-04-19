
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-8 px-6 md:px-12 flex justify-between items-center bg-[#f7f3f0]">
      <div className="flex flex-col">
        <h1 className="text-4xl font-bold text-[#4a4a4a] tracking-tight serif">YPERSOA</h1>
        <p className="text-xs uppercase tracking-widest text-[#A3AD85] font-medium mt-1">L'âme de la tribu</p>
      </div>
      <nav className="hidden md:flex gap-8 text-sm uppercase tracking-wider text-[#6b6b6b]">
        <span className="cursor-pointer hover:text-[#A3AD85] transition-colors">Vision</span>
        <span className="cursor-pointer hover:text-[#A3AD85] transition-colors">Collection</span>
        <span className="cursor-pointer hover:text-[#A3AD85] transition-colors">Atelier</span>
      </nav>
    </header>
  );
};

export default Header;
