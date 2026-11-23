Regenerar: python3 -I fetch_texturas_cielo.py <cache> .; python3 -I fetch_modelos.py <cache_m> <slugs...>; python3 -I crear_atlas.py <cache_m> <atlas>;
cd herramientas && npm i @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions meshoptimizer sharp;
node procesar_modelos.mjs <cache_m> <out>; node crear_cartas.mjs <atlas> <out>. (modelos.json: rutas de atlas a ajustar.)
Ronda 2: python3 -I fetch_ronda2.py <cache2>; python3 -I crear_atlas_ronda2.py <cache2> <atlas2>; cd herramientas && npm i;
node crear_cartas_ronda2.mjs <atlas2> ..; node procesar_acantilados.mjs <cache2> ..; python3 -I ../crear_cielo.py <cache2>/cielo/kloofendal_4k.hdr ../cielo_4k.webp; node sheet_ronda2.js .. <hoja.png>
