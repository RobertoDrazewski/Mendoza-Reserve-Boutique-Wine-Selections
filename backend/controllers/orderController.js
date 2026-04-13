const db = require('../config/db');

// 1. Crear una nueva orden
exports.createOrder = async (req, res) => {
    const { items, total } = req.body;
    const user_id = req.user ? req.user.id : null; 

    if (!items || items.length === 0) {
        return res.status(400).json({ error: "El carrito está vacío" });
    }

    let connection;
    try {
        // Obtenemos la conexión del pool
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 2. Insertar la cabecera
        const [orderResult] = await connection.query(
            "INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)",
            [user_id, total, 'pendiente']
        );
        
        const orderId = orderResult.insertId;

        // 3. Insertar los detalles
        const itemValues = items.map(item => [
            orderId,
            item.id,
            item.quantity,
            item.precio
        ]);

        // IMPORTANTE: En mysql2, para inserciones masivas con ?, 
        // los valores deben ir envueltos en un array extra: [itemValues]
        await connection.query(
            "INSERT INTO order_items (order_id, vino_id, cantidad, precio_unitario) VALUES ?",
            [itemValues]
        );

        await connection.commit();
        res.status(201).json({ success: true, orderId, msg: "Orden generada con éxito" });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error al generar orden:", error);
        res.status(500).json({ error: "No se pudo procesar la compra" });
    } finally {
        if (connection) connection.release();
    }
};

// 4. Obtener órdenes del usuario (ESTA FALTABA Y CAUSABA EL CRASH)
exports.getUserOrders = async (req, res) => {
    try {
        const user_id = req.user.id;
        const [rows] = await db.query(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", 
            [user_id]
        );
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener órdenes:", error);
        res.status(500).json({ error: "Error al obtener el historial" });
    }
};

// 5. Obtener detalle de una orden (POR SI TU ROUTER LA PIDE)
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query("SELECT * FROM order_items WHERE order_id = ?", [id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener detalle" });
    }
};