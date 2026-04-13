import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = () => {
            const savedUser = localStorage.getItem('user');
            const token = localStorage.getItem('token');
            
            if (savedUser && token) {
                try {
                    const parsedUser = JSON.parse(savedUser);
                    setUser(parsedUser);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                } catch (error) {
                    console.error("Error al inicializar sesión:", error);
                    logout(); 
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = (userData, token) => {
        // Guardamos en almacenamiento persistente
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Actualizamos encabezados de Axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // ACTUALIZACIÓN DE ESTADO: Esto avisa a React que debe re-dibujar el Navbar y Vinos
        setUser(userData);
        setLoading(false); 
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {/* Evitamos que la app parpadee o muestre estados erróneos mientras carga */}
            {!loading ? children : <div className="loading-screen">Verificando credenciales...</div>}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);