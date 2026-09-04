// El campo "imagen" de una bodega puede ser:
//  - un nombre de archivo local (vive en frontend/public/images) -> las
//    fotos que subimos nosotros a mano, o
//  - una URL completa (http/https) -> foto tomada directo del sitio
//    oficial de la bodega, sin que tengamos que alojarla nosotros.
// Esta función arma el src correcto para cualquiera de los dos casos.
export function resolveBodegaImage(imagen) {
    if (!imagen) return null;
    if (/^https?:\/\//i.test(imagen)) return imagen;
    return `/images/${imagen}`;
}
