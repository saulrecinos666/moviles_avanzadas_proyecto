//Inicializar base de datos de servicios médicos a distancia
export async function initializeDatabase(db) {
    console.log('🔄 Inicializando base de datos SQLite...');
    
    if (!db) {
        console.error('❌ Error: Base de datos no proporcionada');
        return;
    }
    // Tabla de usuarios (pacientes, médicos, admin)
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            telefono TEXT,
            fechaNacimiento TEXT,
            genero TEXT,
            direccion TEXT,
            ciudad TEXT,
            codigoPostal TEXT,
            fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,
            firebaseUid TEXT UNIQUE,
            fotoPerfil TEXT,
            tipoSangre TEXT,
            alergias TEXT,
            condicionesMedicas TEXT,
            contactoEmergencia TEXT,
            telefonoEmergencia TEXT,
            altura REAL,
            peso REAL,
            latitud REAL,
            longitud REAL,
            rol TEXT DEFAULT 'paciente',
            activo INTEGER DEFAULT 1
        );
    `);

    // Agregar columnas altura y peso si no existen (para bases de datos existentes)
    try {
        await db.execAsync(`ALTER TABLE usuarios ADD COLUMN altura REAL;`);
    } catch (error) {
        // La columna ya existe, ignorar error
    }
    
    try {
        await db.execAsync(`ALTER TABLE usuarios ADD COLUMN peso REAL;`);
    } catch (error) {
        // La columna ya existe, ignorar error
    }

    // Agregar columnas latitud y longitud si no existen (para bases de datos existentes)
    try {
        await db.execAsync(`ALTER TABLE usuarios ADD COLUMN latitud REAL;`);
    } catch (error) {
        // La columna ya existe, ignorar error
    }
    
    try {
        await db.execAsync(`ALTER TABLE usuarios ADD COLUMN longitud REAL;`);
    } catch (error) {
        // La columna ya existe, ignorar error
    }

    // Tabla de médicos
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS medicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            telefono TEXT,
            especialidad TEXT NOT NULL,
            subespecialidad TEXT,
            numeroLicencia TEXT UNIQUE NOT NULL,
            experiencia TEXT,
            idiomas TEXT,
            latitud REAL,
            longitud REAL,
            direccion TEXT,
            ciudad TEXT,
            disponible INTEGER DEFAULT 1,
            calificacion REAL DEFAULT 0,
            totalCalificaciones INTEGER DEFAULT 0,
            fotoPerfil TEXT,
            biografia TEXT,
            precioConsulta REAL,
            fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,
            firebaseUid TEXT UNIQUE,
            activo INTEGER DEFAULT 1
        );
    `);

    // Tabla de consultas médicas
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS consultas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pacienteId INTEGER NOT NULL,
            medicoId INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            especialidad TEXT NOT NULL,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL,
            estado TEXT DEFAULT 'programada',
            motivo TEXT,
            sintomas TEXT,
            diagnostico TEXT,
            notas TEXT,
            calificacion INTEGER,
            comentarioCalificacion TEXT,
            fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,
            fechaConsulta TEXT,
            duracion INTEGER DEFAULT 30,
            FOREIGN KEY (pacienteId) REFERENCES usuarios (id),
            FOREIGN KEY (medicoId) REFERENCES medicos (id)
        );
    `);

    // Tabla de recetas electrónicas
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS recetas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            consultaId INTEGER NOT NULL,
            pacienteId INTEGER NOT NULL,
            medicoId INTEGER NOT NULL,
            numeroReceta TEXT UNIQUE NOT NULL,
            fechaEmision TEXT NOT NULL,
            fechaVencimiento TEXT,
            medicamentos TEXT NOT NULL,
            instrucciones TEXT,
            diagnostico TEXT,
            notas TEXT,
            estado TEXT DEFAULT 'activa',
            compartidaCon TEXT,
            fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,
            archivoPdf TEXT,
            FOREIGN KEY (consultaId) REFERENCES consultas (id),
            FOREIGN KEY (pacienteId) REFERENCES usuarios (id),
            FOREIGN KEY (medicoId) REFERENCES medicos (id)
        );
    `);

    // Tabla de historial médico
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS historialMedico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pacienteId INTEGER NOT NULL,
            tipoRegistro TEXT NOT NULL,
            titulo TEXT NOT NULL,
            descripcion TEXT,
            fecha TEXT NOT NULL,
            medicoId INTEGER,
            consultaId INTEGER,
            archivosAdjuntos TEXT,
            resultados TEXT,
            notas TEXT,
            fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pacienteId) REFERENCES usuarios (id),
            FOREIGN KEY (medicoId) REFERENCES medicos (id),
            FOREIGN KEY (consultaId) REFERENCES consultas (id)
        );
    `);

    // Tabla de resultados de pruebas
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS resultadosPruebas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pacienteId INTEGER NOT NULL,
            consultaId INTEGER,
            medicoId INTEGER,
            tipoPrueba TEXT NOT NULL,
            nombrePrueba TEXT NOT NULL,
            fechaRealizacion TEXT NOT NULL,
            resultados TEXT NOT NULL,
            valores TEXT,
            interpretacion TEXT,
            archivos TEXT,
            fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pacienteId) REFERENCES usuarios (id),
            FOREIGN KEY (consultaId) REFERENCES consultas (id),
            FOREIGN KEY (medicoId) REFERENCES medicos (id)
        );
    `);

    // Tabla de mensajes de chat
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS mensajesChat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversacionId TEXT NOT NULL,
            remitenteId TEXT NOT NULL,
            remitenteTipo TEXT NOT NULL,
            destinatarioId TEXT NOT NULL,
            destinatarioTipo TEXT NOT NULL,
            mensaje TEXT NOT NULL,
            tipo TEXT DEFAULT 'texto',
            archivoUrl TEXT,
            leido INTEGER DEFAULT 0,
            fechaEnvio TEXT DEFAULT CURRENT_TIMESTAMP,
            firebaseMessageId TEXT
        );
    `);

    // Tabla de conversaciones
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS conversaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversacionId TEXT UNIQUE NOT NULL,
            pacienteId INTEGER NOT NULL,
            medicoId INTEGER NOT NULL,
            ultimoMensaje TEXT,
            ultimoMensajeFecha TEXT,
            noLeidosPaciente INTEGER DEFAULT 0,
            noLeidosMedico INTEGER DEFAULT 0,
            activa INTEGER DEFAULT 1,
            fechaCreacion TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pacienteId) REFERENCES usuarios (id),
            FOREIGN KEY (medicoId) REFERENCES medicos (id)
        );
    `);

    // Tabla de horarios de médicos
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS horariosMedicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medicoId INTEGER NOT NULL,
            diaSemana INTEGER NOT NULL,
            horaInicio TEXT NOT NULL,
            horaFin TEXT NOT NULL,
            disponible INTEGER DEFAULT 1,
            fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (medicoId) REFERENCES medicos (id)
        );
    `);

    // Tabla de foro de salud
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS foroPosts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuarioId INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            contenido TEXT NOT NULL,
            categoria TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            respuestas INTEGER DEFAULT 0,
            fecha TEXT NOT NULL,
            fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,
            activo INTEGER DEFAULT 1,
            FOREIGN KEY (usuarioId) REFERENCES usuarios (id)
        );
    `);

    // Tabla de respuestas del foro
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS foroRespuestas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            postId INTEGER NOT NULL,
            usuarioId INTEGER NOT NULL,
            contenido TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            fecha TEXT NOT NULL,
            fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (postId) REFERENCES foroPosts (id),
            FOREIGN KEY (usuarioId) REFERENCES usuarios (id)
        );
    `);

    // Tabla de notificaciones
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS notificaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuarioId INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            mensaje TEXT NOT NULL,
            tipo TEXT NOT NULL,
            referenciaId INTEGER,
            leida INTEGER DEFAULT 0,
            fecha TEXT NOT NULL,
            fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuarioId) REFERENCES usuarios (id)
        );
    `);

    // Tabla de favoritos (médicos favoritos del paciente)
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS medicosFavoritos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pacienteId INTEGER NOT NULL,
            medicoId INTEGER NOT NULL,
            fechaAgregado TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pacienteId) REFERENCES usuarios (id),
            FOREIGN KEY (medicoId) REFERENCES medicos (id),
            UNIQUE(pacienteId, medicoId)
        );
    `);
    
    console.log('✅ Base de datos SQLite inicializada correctamente');
}