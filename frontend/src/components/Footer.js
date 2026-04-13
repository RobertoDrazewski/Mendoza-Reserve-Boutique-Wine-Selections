import React from 'react';
import '../styles/Footer.css';
import { FaInstagram, FaFacebook, FaWhatsapp } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        
        {/* Redes Sociales con URLs válidas (aunque sean las bases) */}
        <div className="footer-socials">
          <a 
            href="https://www.instagram.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="icon-ig"
          >
            <FaInstagram />
          </a>
          <a 
            href="https://www.facebook.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="icon-fb"
          >
            <FaFacebook />
          </a>
          <a 
            href="https://wa.me/tunumerodetel" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="icon-wa"
          >
            <FaWhatsapp />
          </a>
        </div>

        {/* Texto centrado en color vino */}
        <div className="footer-content">
          <p>© 2026 MENDOZA RESERVE - BOUTIQUE WINE SELECTIONS</p>
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;