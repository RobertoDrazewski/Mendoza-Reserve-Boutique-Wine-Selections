import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext'; 
import '../styles/Login.css';

const Login = () => {
  const { lang } = useLanguage();
  const { login } = useAuth(); 
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  // --- CONFIGURACIÓN DE URL DINÁMICA ---
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  const t = {
    es: {
      title: "Bienvenido",
      subtitle: "Inicia sesión para gestionar tus pedidos",
      placeholderEmail: "Correo electrónico",
      placeholderPass: "Contraseña",
      btnLogin: "Ingresar",
      noAccount: "¿No tienes cuenta?",
      registerLink: "Regístrate aquí",
      error: "Correo o contraseña incorrectos",
      serverError: "Error al conectar con el servidor."
    },
    en: {
      title: "Welcome",
      subtitle: "Log in to manage your orders",
      placeholderEmail: "Email address",
      placeholderPass: "Password",
      btnLogin: "Login",
      noAccount: "Don't have an account?",
      registerLink: "Register here",
      error: "Invalid email or password",
      serverError: "Server connection error."
    }
  };

  const currentT = t[lang] || t['es'];

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // CAMBIO: Ahora enviamos la petición a la URL de Render (Auth suele estar en /auth/login o /usuarios/login)
      // Verifica si tu ruta es /api/auth/login o /api/usuarios/login
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        // Guardamos usuario y token mediante el contexto
        login(data.user, data.token);

        // Redirección inteligente
        if (data.user.rol === 'admin') {
          navigate('/admin');
        } else {
          navigate('/vinos');
        }
      } else {
        setError(data.msg || currentT.error);
      }
    } catch (err) {
      console.error("❌ Error de conexión con Render:", err);
      setError(currentT.serverError);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">{currentT.title}</h1>
        <p className="login-subtitle">{currentT.subtitle}</p>

        {error && <p className="error-message" style={{ color: '#ff4d4d', textAlign: 'center', marginBottom: '10px' }}>{error}</p>}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <input 
              type="email" 
              name="email" 
              value={credentials.email}
              placeholder={currentT.placeholderEmail} 
              required 
              onChange={handleChange} 
            />
          </div>
          <div className="input-group">
            <input 
              type="password" 
              name="password" 
              value={credentials.password}
              placeholder={currentT.placeholderPass} 
              required 
              onChange={handleChange} 
            />
          </div>
          <button type="submit" className="btn-winery-auth">{currentT.btnLogin}</button>
        </form>

        <p className="login-footer">
          {currentT.noAccount} <Link to="/register">{currentT.registerLink}</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;