const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    telefono: {
        type: String,
        trim: true
    },
    fechaNacimiento: {
        type: Date
    },
    genero: {
        type: String,
        enum: ['Masculino', 'Femenino', 'Otro', 'Prefiero no decir']
    },
    altura: {
        type: Number,
        min: 100,
        max: 250
    },
    peso: {
        type: Number,
        min: 30,
        max: 300
    },
    objetivo: {
        type: String,
        enum: [
            'Perder peso',
            'Ganar peso', 
            'Mantener peso',
            'Ganar músculo',
            'Mejorar resistencia',
            'Mejorar flexibilidad',
            'Mejorar salud general'
        ]
    },
    nivelActividad: {
        type: String,
        enum: [
            'Sedentario',
            'Poco activo',
            'Moderadamente activo',
            'Muy activo',
            'Extremadamente activo'
        ]
    },
    firebaseUid: {
        type: String,
        unique: true,
        sparse: true
    },
    fotoPerfil: {
        type: String
    },
    fechaRegistro: {
        type: Date,
        default: Date.now
    },
    ultimaActividad: {
        type: Date,
        default: Date.now
    },
    configuracionNotificaciones: {
        medicamentos: { type: Boolean, default: true },
        ejercicios: { type: Boolean, default: true },
        consejos: { type: Boolean, default: true },
        progreso: { type: Boolean, default: true }
    },
    preferencias: {
        idioma: { type: String, default: 'es' },
        tema: { type: String, default: 'claro' },
        unidades: { type: String, default: 'metrico' }
    }
}, {
    timestamps: true
});

usuarioSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

usuarioSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

usuarioSchema.methods.calcularIMC = function() {
    if (!this.altura || !this.peso) return null;
    const alturaMetros = this.altura / 100;
    return (this.peso / (alturaMetros * alturaMetros)).toFixed(1);
};

usuarioSchema.methods.getCategoriaIMC = function() {
    const imc = this.calcularIMC();
    if (!imc) return null;
    
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Peso normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
};

usuarioSchema.methods.toPublicJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.firebaseUid;
    return userObject;
};

usuarioSchema.index({ email: 1 });
usuarioSchema.index({ firebaseUid: 1 });
usuarioSchema.index({ fechaRegistro: -1 });

module.exports = mongoose.model('Usuario', usuarioSchema);