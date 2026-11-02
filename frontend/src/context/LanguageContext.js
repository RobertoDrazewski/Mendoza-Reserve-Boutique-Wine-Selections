import React, { createContext, useState, useContext } from 'react';

// 1. Creamos el contexto
const LanguageContext = createContext();

// Misma clave que usa la landing (frontend/public/landing) para que el idioma
// elegido en una se mantenga en la otra.
const LANG_KEY = 'mr_lang';

const initialLang = () => {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch (e) { /* sin storage: seguimos con el valor por defecto */ }
  return 'es';
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(initialLang); // 'es' o 'en'

  // 2. Definimos la función con el nombre exacto que usa el Navbar
  const changeLanguage = (newLang) => {
    setLang(newLang);
    try { localStorage.setItem(LANG_KEY, newLang); } catch (e) { /* ignorar */ }
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
