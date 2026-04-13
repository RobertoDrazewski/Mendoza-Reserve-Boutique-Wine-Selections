import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext'; 
import '../styles/Register.css';

const Register = () => {
  const { lang } = useLanguage();
  const { login } = useAuth(); 
  const navigate = useNavigate();
  
  // --- CONFIGURACIÓN DE URL DINÁMICA ---
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '', 
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = {
    es: {
      title: "Mendoza",
      subtitle: "RESERVE",
      createAccount: "Crea tu Cuenta",
      placeholderName: "Nombre",
      placeholderLastName: "Apellido",
      placeholderEmail: "Correo electrónico",
      placeholderPass: "Contraseña",
      placeholderConfirm: "Confirmar contraseña",
      btnRegister: "Registrarse",
      btnLoading: "Procesando...",
      haveAccount: "¿Ya tienes cuenta?",
      loginLink: "Inicia sesión",
      passError: "Las contraseñas no coinciden",
      serverError: "Error de conexión con el servidor"
    },
    en: {
      title: "Mendoza",
      subtitle: "RESERVE",
      createAccount: "Create Account",
      placeholderName: "First Name",
      placeholderLastName: "Last Name",
      placeholderEmail: "Email address",
      placeholderPass: "Password",
      placeholderConfirm: "Confirm Password",
      btnRegister: "Sign Up",
      btnLoading: "Processing...",
      haveAccount: "Already have an account?",
      loginLink: "Log in here",
      passError: "Passwords do not match",
      serverError: "Connection error"
    }
  };

  const currentT = t[lang] || t['es'];

  const handleChange = (e) => {
    if (error) setError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError(currentT.passError);
    }

    setIsSubmitting(true);

    try {
      // CAMBIO: Ahora enviamos a la URL de Render
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.token && data.user) {
          // Logueamos automáticamente al usuario recién creado
          login(data.user, data.token);
          navigate('/vinos');
        } else {
          navigate('/login');
        }
      } else {
        setError(data.msg || "Error al registrar");
      }
    } catch (err) {
      console.error("❌ Error en el registro hacia Render:", err);
      setError(currentT.serverError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h1 className="register-title">{currentT.title}</h1>
        <p className="register-subtitle">{currentT.subtitle}</p>
        
        <h2 style={{ fontSize: '1.2rem', color: '#666', marginBottom: '20px', fontWeight: '300' }}>
          {currentT.createAccount}
        </h2>

        {error && (
          <p className="error-message-auth" style={{ 
            color: 'white', 
            backgroundColor: '#a63a43', 
            padding: '12px', 
            borderRadius: '15px',
            fontSize: '0.85rem',
            marginBottom: '20px' 
          }}>
            {error}
          </p>
        )}
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="input-group">
            <input 
              type="text" 
              name="nombre" 
              value={formData.nombre}
              placeholder={currentT.placeholderName} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="input-group">
            <input 
              type="text" 
              name="apellido" 
              value={formData.apellido}
              placeholder={currentT.placeholderLastName} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="input-group">
            <input 
              type="email" 
              name="email" 
              value={formData.email}
              placeholder={currentT.placeholderEmail} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="input-group">
            <input 
              type="password" 
              name="password" 
              value={formData.password}
              placeholder={currentT.placeholderPass} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="input-group">
            <input 
              type="password" 
              name="confirmPassword" 
              value={formData.confirmPassword}
              placeholder={currentT.placeholderConfirm} 
              onChange={handleChange} 
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn-winery-auth" 
            disabled={isSubmitting}
          >
            {isSubmitting ? currentT.btnLoading : currentT.btnRegister}
          </button>
        </form>

        <p className="register-footer">
          {currentT.haveAccount} <Link to="/login">{currentT.loginLink}</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;