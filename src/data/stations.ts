import { StationData } from '../types/vocational';

export const STATIONS_DATA: StationData[] = [
  {
    id: 'station_dev',
    name: 'Bahía de Ensamblaje',
    subname: 'Bahía de Ensamblaje',
    leaderNpcName: 'Mika',
    leaderTitle: 'La Inventora',
    accentColor: 0x3b82f6,
    dilemmaText: '¡Qué bueno que llegas! Nuestros pequeños robots de asistencia de la nave están dando vueltas en círculos y confundiendo las bandejas de comida. Necesito que averigües qué está pasando con los tripulantes del pasillo para resolverlo.',
    passengers: [
      {
        id: 'p_dev_1',
        name: 'Toby',
        role: 'Cocinero de a bordo',
        dialogue: '¡El robot entra a la cocina, recoge un plato caliente, pero cuando la puerta se abre se queda pasmado esperando otra orden que nunca llega!',
        hint: 'Parece que el robot se queda congelado esperando un paso que nadie le enseñó.',
        visited: false
      },
      {
        id: 'p_dev_2',
        name: 'Sora',
        role: 'Pasajera del camarote 4',
        dialogue: 'Ayer pedí una toalla limpia y me trajo una llave de tuercas. ¡Creo que confunde las etiquetas de los estantes cuando están desordenados!',
        hint: 'Los pedidos se confunden porque no hay una regla clara para revisar qué objeto es cuál.',
        visited: false
      }
    ],
    resolutionOptions: [
      {
        text: 'Escribir una lista de pasos exacta, clara y lógica para que el robot sepa qué hacer siempre, incluso si algo sale mal.',
        weights: { dev: 4, biz: 1 }
      },
      {
        text: 'Instalar sensores en la puerta para avisarle al robot por radio el momento justo en que debe cruzar sin detenerse.',
        weights: { net: 3, dev: 2 }
      },
      {
        text: 'Revisar el historial de entregas de los últimos 3 meses para identificar qué errores son los más frecuentes antes de tocar nada.',
        weights: { data: 3, dev: 1, biz: 1 }
      },
      {
        text: 'Poner una clave de confirmación en cada entrega para que nadie reciba cosas equivocadas por accidente.',
        weights: { sec: 3, dev: 1 }
      }
    ],
    completed: false,
    timeSpentSeconds: 0
  },
  {
    id: 'station_net',
    name: 'Torre de Antenas',
    subname: 'Torre de Antenas',
    leaderNpcName: 'Orion',
    leaderTitle: 'El Comunicador',
    accentColor: 0x10b981,
    dilemmaText: '¡Saludos! Tenemos un gran embotellamiento con las comunicaciones. Las llamadas holográficas entre los camarotes se escuchan con retraso o se cortan a mitad de la frase. Habla con la tripulación para ver qué ruta está fallando.',
    passengers: [
      {
        id: 'p_net_1',
        name: 'Capitán Leo',
        role: 'Oficial de guardia',
        dialogue: 'Cada vez que el observatorio enciende las cámaras exteriores hacia la nebulosa, la radio principal se queda muda por completo.',
        hint: 'Muchos datos pesados intentan pasar por el mismo canal estrecho al mismo tiempo.',
        visited: false
      },
      {
        id: 'p_net_2',
        name: 'Damián',
        role: 'Músico de la nave',
        dialogue: 'Estaba transmitiendo un concierto para los viajeros del ala norte y de repente el sonido empezó a llegar con 10 segundos de retraso.',
        hint: 'La señal tiene que dar demasiadas vueltas antes de llegar a su destino.',
        visited: false
      }
    ],
    resolutionOptions: [
      {
        text: 'Crear dos caminos separados: una autopista rápida exclusiva para emergencias y otra vía para videos y música pesada.',
        weights: { net: 4, biz: 1 }
      },
      {
        text: 'Crear una pequeña aplicación que comprima los videos automáticamente antes de enviarlos para que pesen la mitad.',
        weights: { dev: 3, net: 2 }
      },
      {
        text: 'Graficar a qué horas del día hay más tráfico de mensajes para sugerir horarios de uso recomendados a los pasajeros.',
        weights: { data: 3, biz: 2 }
      },
      {
        text: 'Bloquear accesos no autorizados a la antena principal para que solo la tripulación verificada pueda transmitir en alta calidad.',
        weights: { sec: 3, net: 1 }
      }
    ],
    completed: false,
    timeSpentSeconds: 0
  },
  {
    id: 'station_sec',
    name: 'Puesto de Vigilancia',
    subname: 'Puesto de Vigilancia',
    leaderNpcName: 'Kael',
    leaderTitle: 'El Guardián',
    accentColor: 0xef4444,
    dilemmaText: '¡Atento, cadete! Alguien ha estado entrando a los compartimentos privados de la despensa usando códigos de acceso prestados o inventados. Tenemos que proteger los recursos de la nave sin volver locos a los tripulantes.',
    passengers: [
      {
        id: 'p_sec_1',
        name: 'Elena',
        role: 'Encargada de provisiones',
        dialogue: '¡Esta mañana faltaban los postres espaciales! La puerta se abrió a las 3:00 AM con la tarjeta de identificación de alguien que estaba durmiendo en su camarote.',
        hint: 'Alguien clonó o copió una tarjeta sin que su dueño se diera cuenta.',
        visited: false
      },
      {
        id: 'p_sec_2',
        name: 'Marcos',
        role: 'Pasajero despistado',
        dialogue: 'Es que la clave de la puerta es 1-2-3-4 y está escrita en un papel pegado al marco porque a todos se les olvida...',
        hint: 'Las personas eligen lo más fácil aunque sea lo más inseguro.',
        visited: false
      }
    ],
    resolutionOptions: [
      {
        text: 'Implementar verificación de dos pasos: tarjeta personal más reconocimiento de huella o pregunta secreta.',
        weights: { sec: 4, net: 1 }
      },
      {
        text: 'Diseñar un sistema interactivo sencillo en pantalla que ayude a la gente a recordar claves seguras sin tener que anotarlas.',
        weights: { dev: 3, sec: 2 }
      },
      {
        text: 'Revisar las cámaras y registrar las horas exactas de cada intento fallido para descubrir al bromista mediante los registros.',
        weights: { data: 3, sec: 2 }
      },
      {
        text: 'Organizar una reunión con todos los pasajeros para acordar reglas justas de convivencia y distribución de snacks.',
        weights: { biz: 4, sec: 1 }
      }
    ],
    completed: false,
    timeSpentSeconds: 0
  },
  {
    id: 'station_data',
    name: 'Laboratorio de Cultivos',
    subname: 'Laboratorio de Cultivos',
    leaderNpcName: 'Nova',
    leaderTitle: 'La Investigadora',
    accentColor: 0x8b5cf6,
    dilemmaText: '¡Bienvenido al pulmón verde de la nave! Nuestras plantas hidropónicas dan frutos a destiempo: a veces crecen demasiado rápido y otras se marchitan. Hay cientos de sensores midiendo luz, humedad y temperatura, pero no sabemos qué combinación es la ideal.',
    passengers: [
      {
        id: 'p_data_1',
        name: 'Flora',
        role: 'Botánica',
        dialogue: 'Los tomates del sector solar crecieron enormes hace dos semanas, pero nadie anotó qué temperatura exacta hizo durante las noches de ese ciclo.',
        hint: 'Toda la información valiosa se guardó en los sensores, pero nadie la ha comparado.',
        visited: false
      },
      {
        id: 'p_data_2',
        name: 'Renato',
        role: 'Técnico de riego',
        dialogue: 'A veces riego cuando veo la tierra seca, pero cada tipo de planta reacciona de manera muy distinta.',
        hint: 'Hace falta descubrir la regla escondida en el comportamiento de cada tipo de planta.',
        visited: false
      }
    ],
    resolutionOptions: [
      {
        text: 'Cruzar los registros del mes pasado para encontrar el patrón exacto de luz y humedad donde las plantas crecieron mejor.',
        weights: { data: 4, dev: 1 }
      },
      {
        text: 'Construir un tablero visual con alertas automáticas para que los encargados sepan de un vistazo cuándo regar.',
        weights: { dev: 3, data: 2 }
      },
      {
        text: 'Conectar todos los sensores mediante una red inalámbrica directa para recibir los datos en tiempo real sin cables sueltos.',
        weights: { net: 3, data: 1 }
      },
      {
        text: 'Entrevistar a los botánicos y redactar un manual con prioridades claras de cuidado semanal para el equipo.',
        weights: { biz: 3, data: 1 }
      }
    ],
    completed: false,
    timeSpentSeconds: 0
  },
  {
    id: 'station_biz',
    name: 'Sala Común',
    subname: 'Sala Común',
    leaderNpcName: 'Dra. Valeria',
    leaderTitle: 'La Coordinadora',
    accentColor: 0xf59e0b,
    dilemmaText: '¡Qué alivio verte! Tenemos una gran tensión en la sala común. Hay un solo salón multipropósito y los pasajeros están divididos: unos quieren noche de cine, otros torneo de ajedrez y otros quieren silencio total para descansar. Necesito que escuches a las partes y encontremos una solución armónica.',
    passengers: [
      {
        id: 'p_biz_1',
        name: 'Lucía',
        role: 'Representante de familias',
        dialogue: 'Los niños necesitan un espacio para jugar y reír por las tardes, ¡no pueden estar encerrados todo el viaje en sus cabinas!',
        hint: 'Tienen una necesidad muy clara de recreación en un horario específico.',
        visited: false
      },
      {
        id: 'p_biz_2',
        name: 'Braulio',
        role: 'Investigador nocturno',
        dialogue: 'Muchos trabajamos de noche con cálculos astronómicos y necesitamos silencio absoluto sin luces parpadeantes.',
        hint: 'Sus horas de mayor necesidad son contrarias a las de los demás.',
        visited: false
      }
    ],
    resolutionOptions: [
      {
        text: 'Analizar las necesidades de cada grupo y diseñar un cronograma por turnos que maximice la satisfacción de todos.',
        weights: { biz: 4, data: 1 }
      },
      {
        text: 'Desarrollar una aplicación móvil rápida para que los pasajeros voten democráticamente las actividades de la semana.',
        weights: { dev: 3, biz: 2 }
      },
      {
        text: 'Instalar paneles acústicos y zonas con audífonos inalámbricos para que convivan la música y el silencio en el mismo espacio.',
        weights: { net: 2, biz: 2 }
      },
      {
        text: 'Establecer normas claras de convivencia y sanciones justas para quienes no respeten los acuerdos del salón.',
        weights: { sec: 2, biz: 3 }
      }
    ],
    completed: false,
    timeSpentSeconds: 0
  }
];
