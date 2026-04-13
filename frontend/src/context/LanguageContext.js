import React, { createContext, useState, useContext } from 'react';

// 1. Creamos el contexto
const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('es'); // 'es' o 'en'

  // 2. Definimos la función con el nombre exacto que usa el Navbar
  const changeLanguage = (newLang) => {
    setLang(newLang);
  };

  // 3. Pasamos AMBAS cosas en el value: el estado y la función
  return (
    <LanguageContext.Provider value={{ lang, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

// 4. Hook personalizado con validación de seguridad
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  
  // Si alguien intenta usar el hook fuera del Provider, esto avisará el error exacto
  if (!context) {
    throw new Error("useLanguage debe usarse dentro de un LanguageProvider");
  }
  
  return context;
};