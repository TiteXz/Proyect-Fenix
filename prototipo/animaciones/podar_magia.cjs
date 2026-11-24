// uso: NODE_PATH=<node_modules con @gltf-transform> node podar_magia.cjs entrada.glb salida.glb
// Resamplea SOLO los clips "magia_*" (tolerancia 1e-4, quita fotogramas redundantes); el resto de clips queda igual. 15,3 -> 9,6 MB.
const { NodeIO } = require('@gltf-transform/core'); const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { resample } = require('@gltf-transform/functions');
(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(process.argv[2]);
  const root = doc.getRoot();
  const all = root.listAnimations();
  const mg = all.filter(a => a.getName().startsWith('magia_'));
  root.listAnimations = () => mg;
  await doc.transform(resample({ tolerance: 1e-4 }));
  delete root.listAnimations;
  await io.write(process.argv[3], doc);
  console.log('animaciones', all.length, 'magia', mg.length);
})();
