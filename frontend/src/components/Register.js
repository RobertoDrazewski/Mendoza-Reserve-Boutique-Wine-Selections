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
  const API_URL = process.env.REACT_APP_API_URL || '/api';

  // "rol" decide a qué endpoint se manda el alta y qué campos se muestran — NO es un
  // valor que el backend confíe a ciegas: cada rol pega a su propio endpoint
  // (/register, /register-bodega, /register-closer), y cada uno de esos endpoints
  // arma el usuario con el rol que le corresponde, nunca con uno que mande el body.
  const [rol, setRol] = useState('cliente');

  const [formData, setFormData] = useState({
    // comunes
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefono: '',
    // sólo comprador
    empresa: '',
    // sólo bodega
    nombreBodega: '',
    contactoNombre: '',
    zona: '',
    subzona: '',
    direccion: '',
    whatsapp: '',
    sitioWeb: '',
    // sólo closer
    territorio: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = {
    es: {
      title: "Mendoza",
      subtitle: "RESERVE",
      createAccount: "Crea tu Cuenta",
      roleLabel: "Me registro como",
      roleCliente: "Comprador (restaurante / importador / tienda)",
      roleBodega: "Bodega",
      roleCloser: "Closer / Vendedor UK",
      placeholderName: "Nombre",
      placeholderLastName: "Apellido",
      placeholderEmail: "Correo electrónico",
      placeholderPass: "Contraseña",
      placeholderConfirm: "Confirmar contraseña",
      placeholderPhone: "Teléfono (opcional)",
      placeholderEmpresa: "Empresa / Restaurante (opcional)",
      placeholderBodegaNombre: "Nombre de la bodega",
      placeholderContacto: "Persona de contacto",
      placeholderZona: "Zona (ej. Luján de Cuyo)",
      placeholderSubzona: "Sub-zona (opcional)",
      placeholderDireccion: "Dirección",
      placeholderWhatsapp: "WhatsApp (opcional)",
      placeholderWeb: "Sitio web (opcional)",
      placeholderTerritorio: "Territorio de ventas (ej. Bristol y el suroeste)",
      btnRegister: "Registrarse",
      btnLoading: "Procesando...",
      haveAccount: "¿Ya tienes cuenta?",
      loginLink: "Inicia sesión",
      passError: "Las contraseñas no coinciden",
      serverError: "Error de conexión con el servidor",
      bodegaSuccess: "¡Listo! Registramos tu bodega. Un miembro de Mendoza Reserve se va a poner en contacto para activar tu catálogo. Te mandamos un email con tus datos de acceso.",
      welcomeEmailNote: "Te mandamos un email con tu usuario y contraseña para que los tengas a mano."
    },
    en: {
      title: "Mendoza",
      subtitle: "RESERVE",
      createAccount: "Create Account",
      roleLabel: "I'm registering as",
      roleCliente: "Buyer (restaurant / importer / shop)",
      roleBodega: "Winery",
      roleCloser: "Closer / UK Sales",
      placeholderName: "First Name",
      placeholderLastName: "Last Name",
      placeholderEmail: "Email address",
      placeholderPass: "Password",
      placeholderConfirm: "Confirm Password",
      placeholderPhone: "Phone (optional)",
      placeholderEmpresa: "Company / Restaurant (optional)",
      placeholderBodegaNombre: "Winery name",
      placeholderContacto: "Contact person",
      placeholderZona: "Region (e.g. Luján de Cuyo)",
      placeholderSubzona: "Sub-region (optional)",
      placeholderDireccion: "Address",
      placeholderWhatsapp: "WhatsApp (optional)",
      placeholderWeb: "Website (optional)",
      placeholderTerritorio: "Sales territory (e.g. Bristol and the South West)",
      btnRegister: "Sign Up",
      btnLoading: "Processing...",
      haveAccount: "Already have an account?",
      loginLink: "Log in here",
      passError: "Passwords do not match",
      serverError: "Connection error",
      bodegaSuccess: "Done! Your winery is registered. Someone from Mendoza Reserve will reach out to activate your catalog. We sent you an email with your login details.",
      welcomeEmailNote: "We sent you an email with your username and password so you have them on hand."
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
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      return setError(currentT.passError);
    }

    setIsSubmitting(true);

    try {
      let endpoint = '/auth/register';
      let body = {};

      if (rol === 'bodega') {
        endpoint = '/auth/register-bodega';
        body = {
          nombre: formData.nombreBodega,
          email: formData.email,
          password: formData.password,
          zona: formData.zona || undefined,
          subzona: formData.subzona || undefined,
          direccion: formData.direccion || undefined,
          telefono: formData.telefono || undefined,
          whatsapp: formData.whatsapp || undefined,
          sitio_web: formData.sitioWeb || undefined,
          contacto_nombre: formData.contactoNombre || undefined
        };
      } else if (rol === 'closer') {
        endpoint = '/auth/register-closer';
        body = {
          nombre: formData.nombre,
          apellido: formData.apellido || undefined,
          email: formData.email,
          password: formData.password,
          telefono: formData.telefono || undefined,
          territorio: formData.territorio || undefined
        };
      } else {
        body = {
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          password: formData.password,
          empresa: formData.empresa || undefined,
          telefono: formData.telefono || undefined
        };
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        if (data.token && data.user) {
          login(data.user, data.token);
          if (rol === 'bodega') {
            setSuccess(currentT.bodegaSuccess);
            setIsSubmitting(false);
            setTimeout(() => navigate('/bodega/dashboard'), 2500);
            return;
          }
          if (rol === 'closer') {
            navigate('/closer/dashboard');
            return;
          }
          navigate('/vinos');
        } else {
          navigate('/login');
        }
      } else {
        setError(data.msg || data.error || 'Error al registrar');
      }
    } catch (err) {
      console.error("❌ Error en el registro:", err);
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

        {success && (
          <p style={{
            color: '#2f5d3a',
            backgroundColor: '#e6f0e8',
            padding: '12px',
            borderRadius: '15px',
            fontSize: '0.85rem',
            marginBottom: '20px'
          }}>
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="input-group">
            <label htmlFor="rol-select" style={{ display: 'block', textAlign: 'left', fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>
              {currentT.roleLabel}
            </label>
            <select
              id="rol-select"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              style={{
                width: '100%', padding: '12px 20px', border: '1px solid #e0dcd0',
                backgroundColor: '#fdfaf6', borderRadius: '15px', fontFamily: 'Inter, sans-serif',
                fontSize: '0.9rem', boxSizing: 'border-box'
              }}
            >
              <option value="cliente">{currentT.roleCliente}</option>
              <option value="bodega">{currentT.roleBodega}</option>
              <option value="closer">{currentT.roleCloser}</option>
            </select>
          </div>

          {rol === 'bodega' ? (
            <>
              <div className="input-group">
                <input type="text" name="nombreBodega" value={formData.nombreBodega}
                  placeholder={currentT.placeholderBodegaNombre} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="text" name="contactoNombre" value={formData.contactoNombre}
                  placeholder={currentT.placeholderContacto} onChange={handleChange} />
              </div>
              <div className="input-group">
                <input type="email" name="email" value={formData.email}
                  placeholder={currentT.placeholderEmail} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="password" name="password" value={formData.password}
                  placeholder={currentT.placeholderPass} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="password" name="confirmPassword" value={formData.confirmPassword}
                  placeholder={currentT.placeholderConfirm} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="text" name="zona" value={formData.zona}
                  placeholder={currentT.placeholderZona} onChange={handleChange} />
              </div>
              <div className="input-group">
                <input type="text" name="subzona" value={formData.subzona}
                  placeholder={currentT.placeholderSubzona} onChange={handleChange} />
              </div>
              <div className="input-group">
                <input type="text" name="direccion" value={formData.direccion}
                  placeholder={currentT.placeholderDireccion} onChange={handleChange} />
              </div>
              <div className="input-group">
                <input type="text" name="telefono" value={formData.telefono}
                  placeholder={currentT.placeholderPhone} onChange={handleChange} />
              </div>
              <div className="input-group">
                <input type="text" name="whatsapp" value={formData.whatsapp}
                  placeholder={currentT.placeholderWhatsapp} onChange={handleChange} />
              </div>
              <div className="input-group">
                <input type="text" name="sitioWeb" value={formData.sitioWeb}
                  placeholder={currentT.placeholderWeb} onChange={handleChange} />
              </div>
            </>
          ) : rol === 'closer' ? (
            <>
              <div className="input-group">
                <input type="text" name="nombre" value={formData.nombre}
                  placeholder={currentT.placeholderName} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="text" name="apellido" value={formData.apellido}
                  placeholder={currentT.placeholderLastName} onChange={handleChange} />
              </div>
              <div className="input-group">
                <input type="email" name="email" value={formData.email}
                  placeholder={currentT.placeholderEmail} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="password" name="password" value={formData.password}
                  placeholder={currentT.placeholderPass} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="password" name="confirmPassword" value={formData.confirmPassword}
                  placeholder={currentT.placeholderConfirm} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="text" name="telefono" value={formData.telefono}
                  placeholder={currentT.placeholderPhone} onChange={handleChange} />
              </div>
              <div className="input-group">
                <input type="text" name="territorio" value={formData.territorio}
                  placeholder={currentT.placeholderTerritorio} onChange={handleChange} />
              </div>
            </>
          ) : (
            <>
              <div className="input-group">
                <input type="text" name="nombre" value={formData.nombre}
                  placeholder={currentT.placeholderName} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="text" name="apellido" value={formData.apellido}
                  placeholder={currentT.placeholderLastName} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="email" name="email" value={formData.email}
                  placeholder={currentT.placeholderEmail} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="password" name="password" value={formData.password}
                  placeholder={currentT.placeholderPass} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="password" name="confirmPassword" value={formData.confirmPassword}
                  placeholder={currentT.placeholderConfirm} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <input type="text" name="empresa" value={formData.empresa}
                  placeholder={currentT.placeholderEmpresa} onChange={handleChange} />
              </div>
              <div className="input-group">
                <input type="text" name="telefono" value={formData.telefono}
                  placeholder={currentT.placeholderPhone} onChange={handleChange} />
              </div>
            </>
          )}

          <p style={{ fontSize: '0.7rem', color: '#999', textAlign: 'left' }}>
            {currentT.welcomeEmailNote}
          </p>

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
