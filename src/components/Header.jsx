// src/components/Header.jsx

import React from 'react';
import { Menu, X } from 'lucide-react';

const Header = ({ isSidebarOpen, setSidebarOpen, viewTitle }) => {
  return (
    // Esta cabecera solo será visible en pantallas pequeñas (usando md:hidden)
    <header className="md:hidden bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-20">
      <h1 className="text-xl font-bold text-blue-700 capitalize">{viewTitle}</h1>
      <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-700">
        {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
      </button>
    </header>
  );
};

export default Header;