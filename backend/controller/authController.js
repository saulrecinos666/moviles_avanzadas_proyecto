const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');

const login = async (req, res) => {
    try {
        const { nombreUsuario, contraseña } = req.body;
        const usuario = await Usuario.findOne({nombreUsuario});

        if (!usuario) {
            return res.status(404).json({mensaje: 'Usuario No Encontrado'});
        }

        const esCoincidente = await bcrypt.compare(contraseña, usuario.contraseña);
        if (!esCoincidente) {
            return res.status(400).json({mensaje: 'Credenciales Invalidas'});
        }

        const token = jwt.sign({id: usuario.id, rol: usuario.rol}, 'claveSecreta', {expiresIn: '1h'});
        res.json({token});
    } catch (error) {
        console.log(error);
        res.status(500).json({ 
            mensaje: 'Error en el Servidor (backend)',
            error: error.message
        });
    }
};

const register = async (req, res) => {
    try {
        const { nombreUsuario, contraseña, rol } = req.body;
        const usuarioExistente = await Usuario.findOne({ nombreUsuario });

        if (usuarioExistente) {
            return res.status(400).json({ mensaje: 'El Usuario ya Existe' });
        }

        const nuevoUsuario = new Usuario({ nombreUsuario, contraseña, rol });
        await nuevoUsuario.save();

        res.status(201).json({ mensaje: 'Usuario Registrado Existosamente' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ 
            mensaje: 'Error en el Servidor (backend)',
            error: error.message
        });        
    }
};

module.exports = { login, register };