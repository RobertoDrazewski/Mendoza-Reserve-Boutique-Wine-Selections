import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Contacto.css';

const Contacto = () => {
  const { lang } = useLanguage();
  
  // Mantenemos tu estado original de 3 campos (nombre, email, mensaje)
  const [formData, setFormData] = useState({ nombre: '', email: '', mensaje: '' });
  const [status, setStatus] = useState({ type: '', msg: '' });

  const t = {
    es: {
      title: "Contacto",
      subtitle: "¿Tienes alguna duda sobre nuestras bodegas o catas? Escríbenos.",
      labelName: "Nombre",
      labelEmail: "Email",
      labelMessage: "Mensaje",
      btnSend: "Enviar Mensaje",
      sending: "Enviando...",
      success: "¡Mensaje enviado con éxito!",
      error: "Hubo un error al enviar el mensaje. Intenta de nuevo."
    },
    en: {
      title: "Contact Us",
      subtitle: "Do you have any questions about our wineries or tastings? Write to us.",
      labelName: "Name",
      labelEmail: "Email",
      labelMessage: "Message",
      btnSend: "Send Message",
      sending: "Sending...",
      success: "Message sent successfully!",
      error: "There was an error sending your message. Please try again."
    }
  };

  const currentT = t[lang] || t['es'];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', msg: currentT.sending });

    // ✅ USAMOS LA URL DINÁMICA QUE FUNCIONA EN TUS OTROS COMPONENTES
    const API_URL = process.env.REACT_APP_API_URL || '/api';

    try {
      const response = await fetch(`${API_URL}/contacto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // Enviamos los datos. Como tu tabla acepta NULL en 'asunto', esto funcionará.
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', msg: currentT.success });
        setFormData({ nombre: '', email: '', mensaje: '' }); // Limpiar formulario
      } else {
        // Mostramos el mensaje de error que viene de tu controlador/Aiven
        setStatus({ type: 'error', msg: data.error || data.msg || currentT.error });
      }
    } catch (err) {
      console.error("Error de conexión:", err);
      setStatus({ type: 'error', msg: currentT.error });
    }
  };

  return (
    <div className="contacto-page">
      <div className="contacto-container">
        <h1 className="contacto-title">{currentT.title}</h1>
        <p className="contacto-subtitle">{currentT.subtitle}</p>

        {/* Mensajes de feedback visual */}
        {status.msg && (
          <div className={`status-alert ${status.type}`}>
            {status.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="contacto-form">
          <div className="form-group">
            <label>{currentT.labelName}</label>
            <input 
              type="text" 
              name="nombre" 
              value={formData.nombre}
              placeholder={currentT.labelName} 
              required 
              onChange={handleChange} 
            />
          </div>

          <div className="form-group">
            <label>{currentT.labelEmail}</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email}
              placeholder="tu@email.com" 
              required 
              onChange={handleChange} 
            />
          </div>

          <div className="form-group">
            <label>{currentT.labelMessage}</label>
            <textarea 
              name="mensaje" 
              value={formData.mensaje}
              rows="5" 
              placeholder="..." 
              required 
              onChange={handleChange}
            ></textarea>
          </div>

          <button 
            type="submit" 
            className="btn-winery-contact"
            disabled={status.type === 'loading'}
          >
            {status.type === 'loading' ? currentT.sending : currentT.btnSend}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Contacto;