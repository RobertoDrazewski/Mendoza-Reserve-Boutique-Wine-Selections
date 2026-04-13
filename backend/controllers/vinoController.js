const db = require('../config/db');

// 1. OBTENER TODOS LOS VINOS
exports.getAllVinos = async (req, res) => {
    try {
        // Ejecutamos la consulta
        const [rows] = await db.query("SELECT * FROM vinos");
        
        // MAPEADO DE SEGURIDAD: 
        // Si tu base de datos tiene la columna como 'imagen' en lugar de 'imagen_url', 
        // esto lo corrige antes de enviarlo al frontend.
        const vinosProcesados = rows.map(v => ({
            ...v,
            // Si imagen_url es null, intentamos usar 'imagen' o 'foto' si existieran
            imagen_url: v.imagen_url || v.imagen || v.foto || null 
        }));

        console.log(`🍷 Enviando ${vinosProcesados.length} vinos. Ejemplo del primero:`, vinosProcesados[0]);
        
        res.json(vinosProcesados);
    } catch (error) {
        console.error("❌ Error en getAllVinos:", error.message);
        res.status(500).json({ error: "Error al obtener los vinos" });
    }
};

// 2. OBTENER VINO POR ID
exports.getVinoById = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM vinos WHERE id = ?", [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Vino no encontrado" });
        }
        
        // Aplicamos la misma lógica de seguridad para el ID único
        const vino = {
            ...rows[0],
            imagen_url: rows[0].imagen_url || rows[0].imagen || null
        };
        
        res.json(vino);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el vino" });
    }
};

// 3. CREAR VINO (Asegurando nombres de campos correctos)
exports.createVino = async (req, res) => {
    const { nombre, precio, imagen_url, descripcion, stock, bodega_id } = req.body;
    try {
        // IMPORTANTE: Asegúrate de que los nombres de las columnas en tu tabla 
        // coincidan exactamente con estos:
        const [result] = await db.query(
            "INSERT INTO vinos (nombre, precio, imagen_url, descripcion, stock, bodega_id) VALUES (?, ?, ?, ?, ?, ?)",
            [nombre, precio, imagen_url, descripcion, stock, bodega_id]
        );
        res.status(201).json({ id: result.insertId, message: "Vino creado con éxito" });
    } catch (error) {
        console.error("❌ Error al crear vino:", error.message);
        res.status(500).json({ error: "Error al crear el vino" });
    }
};

// 4. ACTUALIZAR VINO
exports.updateVino = async (req, res) => {
    const { nombre, precio, imagen_url, descripcion, stock, bodega_id } = req.body;
    try {
        await db.query(
            "UPDATE vinos SET nombre=?, precio=?, imagen_url=?, descripcion=?, stock=?, bodega_id=? WHERE id=?",
            [nombre, precio, imagen_url, descripcion, stock, bodega_id, req.params.id]
        );
        res.json({ message: "Vino actualizado con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el vino" });
    }
};

// 5. ELIMINAR VINO
exports.deleteVino = async (req, res) => {
    try {
        await db.query("DELETE FROM vinos WHERE id = ?", [req.params.id]);
        res.json({ message: "Vino eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el vino" });
    }
};