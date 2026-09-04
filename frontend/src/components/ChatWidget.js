import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import '../styles/ChatWidget.css';

// Chat acotado: sólo responde sobre el pedido ya identificado en la página de
// seguimiento (cartGroupId + email). No requiere login propio del chat.
const ChatWidget = ({ cartGroupId, email }) => {
    const { lang } = useLanguage();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    const API_URL = process.env.REACT_APP_API_URL || '/api';

    const t = {
        es: {
            title: 'Asistente de pedido', placeholder: 'Preguntá por el estado de tu pedido...',
            greeting: '¡Hola! Puedo ayudarte a saber el estado de tu pedido. ¿Qué querés saber?',
            send: 'Enviar', toggle: 'Chat', unavailable: 'El chat no está disponible en este momento.'
        },
        en: {
            title: 'Order assistant', placeholder: 'Ask about your order status...',
            greeting: "Hi! I can help you check your order status. What would you like to know?",
            send: 'Send', toggle: 'Chat', unavailable: 'Chat is not available right now.'
        }
    };
    const currentT = t[lang] || t['es'];

    useEffect(() => {
        if (open && messages.length === 0) {
            setMessages([{ role: 'assistant', content: currentT.greeting }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, open]);

    const handleSend = async (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || loading) return;

        const nextMessages = [...messages, { role: 'user', content: text }];
        setMessages(nextMessages);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/chat/order-status`, {
                cartGroupId, email, message: text,
                history: nextMessages.map((m) => ({ role: m.role, content: m.content }))
            });
            setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }]);
        } catch (err) {
            const errMsg = err.response?.data?.error || currentT.unavailable;
            setMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`chat-widget ${open ? 'open' : ''}`}>
            {open && (
                <div className="chat-panel">
                    <div className="chat-header">
                        <span>{currentT.title}</span>
                        <button onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
                    </div>
                    <div className="chat-messages">
                        {messages.map((m, idx) => (
                            <div key={idx} className={`chat-bubble ${m.role}`}>{m.content}</div>
                        ))}
                        {loading && <div className="chat-bubble assistant chat-loading">…</div>}
                        <div ref={bottomRef} />
                    </div>
                    <form className="chat-input-row" onSubmit={handleSend}>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={currentT.placeholder}
                            disabled={loading}
                        />
                        <button type="submit" disabled={loading}>{currentT.send}</button>
                    </form>
                </div>
            )}
            <button className="chat-toggle-btn" onClick={() => setOpen(!open)}>
                {open ? '×' : '💬'}
            </button>
        </div>
    );
};

export default ChatWidget;
