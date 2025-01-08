// es6wrapper.js
const loadModules = async (modules) =>
{
    await Promise.all(modules.map(module => import(module)));

    return {
        THREE: window.THREE,
        STLLoader: window.STLLoader,
        OribitControls: window.OrbitControls
    };
};

export { loadModules };
