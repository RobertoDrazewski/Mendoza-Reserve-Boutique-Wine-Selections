const db = require('../config/db');

// 1. Obtener todas las bodegas
exports.getAllBodegas = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM bodegas");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener bodegas" });
    }
};

// 2. Obtener por ID
exports.getBodegaById = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM bodegas WHERE id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: "No encontrada" });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener la bodega" });
    }
};

// 3. CREAR BODEGA (Faltaba esta función)
exports.createBodega = async (req, res) => {
    const { nombre, descripcion, ubicacion, imagen } = req.body;
    try {
        const [result] = await db.query(
            "INSERT INTO bodegas (nombre, descripcion, ubicacion, imagen) VALUES (?, ?, ?, ?)",
            [nombre, descripcion, ubicacion, imagen]
        );
        res.status(201).json({ id: result.insertId, message: "Bodega creada con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error al crear la bodega" });
    }
};

// 4. ACTUALIZAR BODEGA (Faltaba esta función)
exports.updateBodega = async (req, res) => {
    const { nombre, descripcion, ubicacion, imagen } = req.body;
    try {
        await db.query(
            "UPDATE bodegas SET nombre=?, descripcion=?, ubicacion=?, imagen=? WHERE id=?",
            [nombre, descripcion, ubicacion, imagen, req.params.id]
        );
        res.json({ message: "Bodega actualizada con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar la bodega" });
    }
};

// 5. ELIMINAR BODEGA (Faltaba esta función)
exports.deleteBodega = async (req, res) => {
    try {
        await db.query("DELETE FROM bodegas WHERE id = ?", [req.params.id]);
        res.json({ message: "Bodega eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar la bodega" });
    }
};