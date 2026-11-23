Regenerar: python3 -I fetch_texturas_cielo.py <cache> .; python3 -I fetch_modelos.py <cache_m> <slugs...>; python3 -I crear_atlas.py <cache_m> <atlas>;
cd herramientas && npm i @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions meshoptimizer sharp;
node procesar_modelos.mjs <cache_m> <out>; node crear_cartas.mjs <atlas> <out>. (modelos.json: rutas de atlas a ajustar.)
