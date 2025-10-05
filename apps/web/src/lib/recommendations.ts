/**
 * Sistema de Recomendaciones de Calidad del Aire
 *
 * Genera recomendaciones personalizadas basadas en el AQI actual
 */

export interface Recommendation {
  id: string
  icon: string
  title: string
  description: string
  severity: 'success' | 'info' | 'warning' | 'danger' | 'critical'
  category: 'health' | 'activity' | 'general' | 'safety'
}

export interface AQIExplanation {
  level: string
  color: string
  emoji: string
  shortDescription: string
  detailedDescription: string
  affectedGroups?: string[]
}

/**
 * Obtiene explicación detallada del nivel de AQI
 */
export function getAQIExplanation(aqi: number): AQIExplanation {
  if (aqi <= 50) {
    return {
      level: 'Bueno',
      color: 'green',
      emoji: '😊',
      shortDescription: 'La calidad del aire es excelente',
      detailedDescription: 'El aire está limpio y es ideal para cualquier actividad al aire libre. Disfruta el día!',
    }
  } else if (aqi <= 100) {
    return {
      level: 'Moderado',
      color: 'yellow',
      emoji: '😐',
      shortDescription: 'La calidad del aire es aceptable',
      detailedDescription: 'La mayoría de las personas puede realizar actividades al aire libre normalmente. Grupos sensibles deben considerar reducir esfuerzos prolongados.',
      affectedGroups: ['Personas con asma', 'Niños pequeños', 'Adultos mayores']
    }
  } else if (aqi <= 150) {
    return {
      level: 'No saludable para grupos sensibles',
      color: 'orange',
      emoji: '😷',
      shortDescription: 'Grupos sensibles pueden experimentar efectos',
      detailedDescription: 'Niños, adultos mayores y personas con problemas respiratorios o cardíacos deben limitar esfuerzos prolongados al aire libre.',
      affectedGroups: ['Niños', 'Adultos mayores', 'Personas con asma', 'Personas con enfermedades cardíacas']
    }
  } else if (aqi <= 200) {
    return {
      level: 'No saludable',
      color: 'red',
      emoji: '😨',
      shortDescription: 'Todos pueden experimentar efectos en la salud',
      detailedDescription: 'Grupos sensibles pueden experimentar efectos serios. El público en general puede experimentar irritación.',
      affectedGroups: ['Toda la población']
    }
  } else if (aqi <= 300) {
    return {
      level: 'Muy no saludable',
      color: 'purple',
      emoji: '🚨',
      shortDescription: 'Alerta de salud: efectos serios para todos',
      detailedDescription: 'Todos deben evitar esfuerzos al aire libre. Grupos sensibles deben permanecer en interiores.',
      affectedGroups: ['Toda la población']
    }
  } else {
    return {
      level: 'Peligroso',
      color: 'maroon',
      emoji: '☠️',
      shortDescription: 'Emergencia de salud pública',
      detailedDescription: 'Todos deben permanecer en interiores con ventanas cerradas. Evite cualquier actividad al aire libre.',
      affectedGroups: ['Toda la población - EMERGENCIA']
    }
  }
}

/**
 * Genera recomendaciones basadas en el AQI
 */
export function getRecommendations(aqi: number, dominantPollutant?: string): Recommendation[] {
  const recommendations: Recommendation[] = []

  // ==========================================
  // AQI 0-50: BUENO
  // ==========================================
  if (aqi <= 50) {
    recommendations.push({
      id: 'good-outdoor',
      icon: '🌟',
      title: 'Perfecto para actividades al aire libre',
      description: 'La calidad del aire es excelente. Es un gran día para hacer ejercicio, caminar, correr o cualquier actividad outdoor.',
      severity: 'success',
      category: 'activity'
    })

    recommendations.push({
      id: 'good-health',
      icon: '💚',
      title: 'No hay riesgos para la salud',
      description: 'Todas las personas, incluyendo grupos sensibles, pueden realizar actividades normalmente sin preocupaciones.',
      severity: 'success',
      category: 'health'
    })

    recommendations.push({
      id: 'good-windows',
      icon: '🪟',
      title: 'Abre las ventanas',
      description: 'Aprovecha para ventilar tu casa u oficina. El aire fresco mejorará la calidad del aire interior.',
      severity: 'info',
      category: 'general'
    })
  }

  // ==========================================
  // AQI 51-100: MODERADO
  // ==========================================
  else if (aqi <= 100) {
    recommendations.push({
      id: 'moderate-activity',
      icon: '🚶',
      title: 'Actividades moderadas son seguras',
      description: 'La mayoría de las personas puede hacer ejercicio al aire libre sin problemas. Grupos muy sensibles deben estar atentos.',
      severity: 'info',
      category: 'activity'
    })

    recommendations.push({
      id: 'moderate-sensitive',
      icon: '⚠️',
      title: 'Precaución para grupos sensibles',
      description: 'Si tienes asma, problemas cardíacos o eres adulto mayor, considera reducir esfuerzos muy intensos y prolongados.',
      severity: 'warning',
      category: 'health'
    })

    recommendations.push({
      id: 'moderate-children',
      icon: '👶',
      title: 'Los niños pueden jugar afuera',
      description: 'Los niños pueden jugar normalmente, pero toma descansos frecuentes si van a estar activos por más de 1 hora.',
      severity: 'info',
      category: 'activity'
    })
  }

  // ==========================================
  // AQI 101-150: NO SALUDABLE PARA SENSIBLES
  // ==========================================
  else if (aqi <= 150) {
    recommendations.push({
      id: 'usg-limit-sensitive',
      icon: '🚫',
      title: 'Grupos sensibles: evita esfuerzos prolongados',
      description: 'Si tienes asma, enfermedad cardíaca o pulmonar, eres niño o adulto mayor: reduce ejercicio intenso al aire libre.',
      severity: 'warning',
      category: 'health'
    })

    recommendations.push({
      id: 'usg-general-ok',
      icon: '👥',
      title: 'Público general puede estar afuera',
      description: 'Si no eres parte de grupos sensibles, puedes realizar actividades normales, pero presta atención a síntomas inusuales.',
      severity: 'info',
      category: 'activity'
    })

    recommendations.push({
      id: 'usg-inhaler',
      icon: '💊',
      title: 'Ten medicamentos a mano',
      description: 'Si tienes asma o problemas respiratorios, lleva tu inhalador. El aire puede desencadenar síntomas.',
      severity: 'warning',
      category: 'health'
    })

    recommendations.push({
      id: 'usg-indoors',
      icon: '🏠',
      title: 'Considera actividades en interiores',
      description: 'Si planeas hacer ejercicio, mejor hazlo en un gimnasio o espacio interior con aire filtrado.',
      severity: 'info',
      category: 'activity'
    })

    recommendations.push({
      id: 'usg-windows',
      icon: '🪟',
      title: 'Mantén ventanas cerradas',
      description: 'Evita que el aire contaminado entre a tu casa. Usa filtros de aire si los tienes disponibles.',
      severity: 'warning',
      category: 'general'
    })
  }

  // ==========================================
  // AQI 151-200: NO SALUDABLE
  // ==========================================
  else if (aqi <= 200) {
    recommendations.push({
      id: 'unhealthy-everyone',
      icon: '🚨',
      title: 'Todos pueden sentir efectos',
      description: 'Todas las personas pueden experimentar irritación en ojos, nariz y garganta. Grupos sensibles tendrán efectos más serios.',
      severity: 'danger',
      category: 'health'
    })

    recommendations.push({
      id: 'unhealthy-reduce',
      icon: '🚫',
      title: 'Reduce esfuerzos al aire libre',
      description: 'Evita ejercicio intenso o prolongado afuera. Si debes estar fuera, toma descansos frecuentes en interiores.',
      severity: 'danger',
      category: 'activity'
    })

    recommendations.push({
      id: 'unhealthy-sensitive-inside',
      icon: '🏠',
      title: 'Grupos sensibles: permanece adentro',
      description: 'Si eres niño, adulto mayor, o tienes problemas respiratorios/cardíacos: quédate en interiores.',
      severity: 'danger',
      category: 'safety'
    })

    recommendations.push({
      id: 'unhealthy-mask',
      icon: '😷',
      title: 'Considera usar cubrebocas',
      description: 'Si debes estar afuera, un cubrebocas N95 puede ayudar a reducir la exposición a partículas.',
      severity: 'warning',
      category: 'safety'
    })

    recommendations.push({
      id: 'unhealthy-windows-closed',
      icon: '🪟',
      title: 'Mantén ventanas y puertas cerradas',
      description: 'Sella tu casa lo mejor posible. Usa purificadores de aire si están disponibles.',
      severity: 'danger',
      category: 'general'
    })

    recommendations.push({
      id: 'unhealthy-school',
      icon: '🏫',
      title: 'Deportes escolares deben cancelarse',
      description: 'No se recomiendan actividades deportivas al aire libre en escuelas. Educación física debe ser en interior.',
      severity: 'danger',
      category: 'activity'
    })
  }

  // ==========================================
  // AQI 201-300: MUY NO SALUDABLE
  // ==========================================
  else if (aqi <= 300) {
    recommendations.push({
      id: 'very-unhealthy-alert',
      icon: '🚨',
      title: 'ALERTA DE SALUD',
      description: 'Toda la población está en riesgo de experimentar efectos serios en la salud.',
      severity: 'critical',
      category: 'health'
    })

    recommendations.push({
      id: 'very-unhealthy-stay-inside',
      icon: '🏠',
      title: 'Permanece en interiores',
      description: 'TODOS deben evitar actividades al aire libre. Mantente en casa con ventanas cerradas.',
      severity: 'critical',
      category: 'safety'
    })

    recommendations.push({
      id: 'very-unhealthy-sensitive-restrict',
      icon: '⛔',
      title: 'Grupos sensibles: restricción total',
      description: 'Si eres vulnerable, NO salgas. Sigue las recomendaciones de tu médico y ten medicamentos listos.',
      severity: 'critical',
      category: 'health'
    })

    recommendations.push({
      id: 'very-unhealthy-mask-required',
      icon: '😷',
      title: 'Cubrebocas N95 obligatorio si sales',
      description: 'Si absolutamente debes salir, usa cubrebocas N95 y minimiza el tiempo al aire libre.',
      severity: 'critical',
      category: 'safety'
    })

    recommendations.push({
      id: 'very-unhealthy-air-filter',
      icon: '🌀',
      title: 'Usa purificadores de aire',
      description: 'Activa filtros de aire HEPA en tu hogar. Mantén recirculación de aire interior al mínimo.',
      severity: 'danger',
      category: 'general'
    })

    recommendations.push({
      id: 'very-unhealthy-medical',
      icon: '🏥',
      title: 'Monitorea síntomas',
      description: 'Si experimentas dificultad para respirar, dolor de pecho o mareos, busca atención médica inmediatamente.',
      severity: 'critical',
      category: 'health'
    })
  }

  // ==========================================
  // AQI 301+: PELIGROSO
  // ==========================================
  else {
    recommendations.push({
      id: 'hazardous-emergency',
      icon: '☠️',
      title: 'EMERGENCIA DE SALUD PÚBLICA',
      description: 'Condiciones de aire extremadamente peligrosas. Toda la población está en riesgo grave.',
      severity: 'critical',
      category: 'health'
    })

    recommendations.push({
      id: 'hazardous-lockdown',
      icon: '🔒',
      title: 'NO SALGAS bajo ninguna circunstancia',
      description: 'Permanece en interiores con todas las ventanas y puertas selladas. No salgas a menos que sea una emergencia vital.',
      severity: 'critical',
      category: 'safety'
    })

    recommendations.push({
      id: 'hazardous-evacuation',
      icon: '🚨',
      title: 'Considera evacuación si es posible',
      description: 'Si hay opciones de ir a un área con mejor calidad del aire, considera evacuarte con tu familia.',
      severity: 'critical',
      category: 'safety'
    })

    recommendations.push({
      id: 'hazardous-medical-ready',
      icon: '🏥',
      title: 'Preparación médica',
      description: 'Ten líneas de emergencia a mano. Si tienes condiciones pre-existentes, contacta a tu médico inmediatamente.',
      severity: 'critical',
      category: 'health'
    })

    recommendations.push({
      id: 'hazardous-air-tight',
      icon: '🪟',
      title: 'Sella tu hogar completamente',
      description: 'Tapa ventanas y puertas. Usa toallas húmedas para sellar grietas. Activa todos los purificadores disponibles.',
      severity: 'critical',
      category: 'general'
    })

    recommendations.push({
      id: 'hazardous-authorities',
      icon: '📢',
      title: 'Sigue instrucciones de autoridades',
      description: 'Mantente informado por canales oficiales. Pueden haber órdenes de evacuación o refugio.',
      severity: 'critical',
      category: 'safety'
    })
  }

  // ==========================================
  // RECOMENDACIONES ESPECÍFICAS POR CONTAMINANTE
  // ==========================================
  if (dominantPollutant) {
    if (dominantPollutant.toUpperCase().includes('O3') || dominantPollutant.toUpperCase().includes('OZONE')) {
      if (aqi > 100) {
        recommendations.push({
          id: 'ozone-specific',
          icon: '☀️',
          title: 'Ozono (O3) es el contaminante principal',
          description: 'El ozono es peor durante tardes soleadas. Si debes salir, hazlo temprano en la mañana o al anochecer.',
          severity: aqi > 150 ? 'danger' : 'warning',
          category: 'general'
        })
      }
    }

    if (dominantPollutant.toUpperCase().includes('PM')) {
      if (aqi > 100) {
        recommendations.push({
          id: 'pm25-specific',
          icon: '💨',
          title: 'Material particulado (PM2.5) es el problema',
          description: 'Las partículas finas pueden penetrar profundo en los pulmones. Un cubrebocas N95 es altamente recomendado si sales.',
          severity: aqi > 150 ? 'danger' : 'warning',
          category: 'safety'
        })
      }
    }

    if (dominantPollutant.toUpperCase().includes('NO2')) {
      if (aqi > 100) {
        recommendations.push({
          id: 'no2-specific',
          icon: '🚗',
          title: 'Dióxido de nitrógeno (NO2) elevado',
          description: 'El NO2 proviene principalmente de vehículos. Evita áreas con tráfico pesado.',
          severity: aqi > 150 ? 'danger' : 'warning',
          category: 'general'
        })
      }
    }
  }

  return recommendations
}

/**
 * Obtiene el color del badge según severidad
 */
export function getSeverityColor(severity: Recommendation['severity']): string {
  const colors = {
    success: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100',
    info: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100',
    warning: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-100',
    danger: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100',
    critical: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-100'
  }
  return colors[severity]
}

/**
 * Obtiene recomendaciones categorizadas
 */
export function getCategorizedRecommendations(aqi: number, dominantPollutant?: string) {
  const all = getRecommendations(aqi, dominantPollutant)

  return {
    health: all.filter(r => r.category === 'health'),
    activity: all.filter(r => r.category === 'activity'),
    safety: all.filter(r => r.category === 'safety'),
    general: all.filter(r => r.category === 'general'),
    all
  }
}
