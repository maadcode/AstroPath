import { CareerBranch, VocationalScores } from '../types/vocational';

export interface CareerProfile {
  branch: CareerBranch;
  branchName: string;
  profileName: string;
  badgeIcon: string;
  dayToDay: string;
  careers: string[];
  strengths: string;
  accentColor: string;
  accentColorHex: number;
}

export const CAREER_PROFILES: Record<CareerBranch, CareerProfile> = {
  dev: {
    branch: 'dev',
    branchName: 'Desarrollo de Software',
    profileName: 'Perfil Creador y Arquitecto Digital',
    badgeIcon: '💻',
    dayToDay: 'Diseñarás y programarás aplicaciones, plataformas interactivas o videojuegos que impactan a millones de personas. Transformarás ideas y necesidades humanas en código funcional, intuitivo y de alto rendimiento.',
    careers: [
      'Ingeniería de Software',
      'Desarrollo de Aplicaciones Web y Móviles (Full Stack)',
      'Diseño y Programación de Videojuegos',
      'Arquitectura de Software y Sistemas Cloud'
    ],
    strengths: 'Creatividad lógica, pasión por construir herramientas útiles y gran capacidad para resolver desafíos inventivos.',
    accentColor: '#38bdf8',
    accentColorHex: 0x38bdf8
  },
  net: {
    branch: 'net',
    branchName: 'Redes e Infraestructura',
    profileName: 'Perfil Conector y Guardián de la Nube',
    badgeIcon: '🌐',
    dayToDay: 'Diseñarás y coordinarás las autopistas de comunicación que enlazan sistemas en todo el planeta. Configurarás servidores en la nube y asegurarás que la información viaje a máxima velocidad sin cortes.',
    careers: [
      'Ingeniería en Telecomunicaciones y Conectividad',
      'Administración de Infraestructura Cloud y DevOps',
      'Ingeniería de Redes e Internet de las Cosas (IoT)',
      'Arquitectura de Centros de Datos y Servidores'
    ],
    strengths: 'Visión sistémica integral, agilidad para solucionar cuellos de botella y destreza en comunicación de sistemas.',
    accentColor: '#34d399',
    accentColorHex: 0x34d399
  },
  sec: {
    branch: 'sec',
    branchName: 'Seguridad Informática',
    profileName: 'Perfil Defensor y Centinela Digital',
    badgeIcon: '🛡️',
    dayToDay: 'Blindarás sistemas críticos, salvaguardarás la privacidad ciudadana y protegerás información confidencial ante ataques cibernéticos. Diseñarás estrategias de prevención y responderás con rapidez ante riesgos digitales.',
    careers: [
      'Ciberseguridad y Seguridad de la Información',
      'Hacking Ético y Análisis de Vulnerabilidades (Pentesting)',
      'Análisis Forense Digital y Respuesta a Incidentes',
      'Auditoría y Gestión de Riesgos Tecnológicos'
    ],
    strengths: 'Mentalidad analítica preventiva, atención profunda al detalle y alto compromiso ético con la protección.',
    accentColor: '#f87171',
    accentColorHex: 0xf87171
  },
  data: {
    branch: 'data',
    branchName: 'Ciencia de Datos e Inteligencia Artificial',
    profileName: 'Perfil Descubridor y Científico de Datos',
    badgeIcon: '🧠',
    dayToDay: 'Descubrirás patrones ocultos y respuestas clave en grandes volúmenes de datos. Entrenarás modelos de inteligencia artificial y crearás visualizaciones que ayudan a científicos, médicos y líderes a tomar decisiones informadas.',
    careers: [
      'Ciencia de Datos e Inteligencia Artificial',
      'Ingeniería de Aprendizaje Automático (Machine Learning)',
      'Análisis de Datos y Business Intelligence (BI)',
      'Modelado Estadístico y Analítica Predictiva'
    ],
    strengths: 'Curiosidad investigativa, pensamiento probabilístico y habilidad para transformar números en valor real.',
    accentColor: '#c084fc',
    accentColorHex: 0xc084fc
  },
  biz: {
    branch: 'biz',
    branchName: 'Gestión y Análisis de Negocios en TI',
    profileName: 'Perfil Estratega y Mediador Tecnológico',
    badgeIcon: '🤝',
    dayToDay: 'Serás el puente entre las necesidades de las personas y la creación técnica. Coordinarás equipos multidisciplinarios, priorizarás proyectos de innovación y asegurarás que la tecnología resuelva problemas del mundo real.',
    careers: [
      'Gestión de Proyectos Tecnológicos (Project Manager / Agile Coach)',
      'Análisis de Negocios de TI (Business Analyst)',
      'Dirección y Estrategia de Productos Digitales (Product Owner)',
      'Consultoría en Transformación Digital'
    ],
    strengths: 'Liderazgo empático, visión estratégica orientada a personas y habilidad para armonizar objetivos.',
    accentColor: '#fbbf24',
    accentColorHex: 0xfbbf24
  }
};

export interface TopCareerProfileResult {
  profile: CareerProfile;
  percent: number;
  rank: number; // 1 para la primera, 2 para la segunda
}

/**
 * Obtiene los N perfiles vocacionales con mayor afinidad porcentual.
 */
export function getTopCareerProfiles(scores: VocationalScores, count: number = 2): TopCareerProfileResult[] {
  const branches: CareerBranch[] = ['dev', 'net', 'sec', 'data', 'biz'];
  
  const sorted = branches
    .map(branch => ({
      profile: CAREER_PROFILES[branch],
      percent: scores[branch] || 0
    }))
    .sort((a, b) => b.percent - a.percent);

  return sorted.slice(0, count).map((item, index) => ({
    profile: item.profile,
    percent: item.percent,
    rank: index + 1
  }));
}
