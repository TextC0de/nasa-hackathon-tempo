/**
 * Air Quality Recommendations System
 *
 * Generates personalized recommendations based on current AQI
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
 * Get detailed explanation of AQI level
 */
export function getAQIExplanation(aqi: number): AQIExplanation {
  if (aqi <= 50) {
    return {
      level: 'Good',
      color: 'green',
      emoji: '😊',
      shortDescription: 'Air quality is excellent',
      detailedDescription: 'Air is clean and ideal for any outdoor activity. Enjoy your day!',
    }
  } else if (aqi <= 100) {
    return {
      level: 'Moderate',
      color: 'yellow',
      emoji: '😐',
      shortDescription: 'Air quality is acceptable',
      detailedDescription: 'Most people can perform outdoor activities normally. Sensitive groups should consider reducing prolonged exertion.',
      affectedGroups: ['People with asthma', 'Young children', 'Older adults']
    }
  } else if (aqi <= 150) {
    return {
      level: 'Unhealthy for Sensitive Groups',
      color: 'orange',
      emoji: '😷',
      shortDescription: 'Sensitive groups may experience effects',
      detailedDescription: 'Children, older adults, and people with respiratory or heart problems should limit prolonged outdoor exertion.',
      affectedGroups: ['Children', 'Older adults', 'People with asthma', 'People with heart disease']
    }
  } else if (aqi <= 200) {
    return {
      level: 'Unhealthy',
      color: 'red',
      emoji: '😨',
      shortDescription: 'Everyone may experience health effects',
      detailedDescription: 'Sensitive groups may experience serious effects. General public may experience irritation.',
      affectedGroups: ['Everyone']
    }
  } else if (aqi <= 300) {
    return {
      level: 'Very Unhealthy',
      color: 'purple',
      emoji: '🚨',
      shortDescription: 'Health alert: serious effects for everyone',
      detailedDescription: 'Everyone should avoid outdoor exertion. Sensitive groups should stay indoors.',
      affectedGroups: ['Everyone']
    }
  } else {
    return {
      level: 'Hazardous',
      color: 'maroon',
      emoji: '☠️',
      shortDescription: 'Public health emergency',
      detailedDescription: 'Everyone should remain indoors with windows closed. Avoid any outdoor activity.',
      affectedGroups: ['Everyone - EMERGENCY']
    }
  }
}

/**
 * Generate recommendations based on AQI
 */
export function getRecommendations(aqi: number, dominantPollutant?: string): Recommendation[] {
  const recommendations: Recommendation[] = []

  // ==========================================
  // AQI 0-50: GOOD
  // ==========================================
  if (aqi <= 50) {
    recommendations.push({
      id: 'good-outdoor',
      icon: '🌟',
      title: 'Perfect for outdoor activities',
      description: 'Air quality is excellent. It\'s a great day to exercise, walk, run, or do any outdoor activity.',
      severity: 'success',
      category: 'activity'
    })

    recommendations.push({
      id: 'good-health',
      icon: '💚',
      title: 'No health risks',
      description: 'Everyone, including sensitive groups, can perform activities normally without concerns.',
      severity: 'success',
      category: 'health'
    })

    recommendations.push({
      id: 'good-windows',
      icon: '🪟',
      title: 'Open your windows',
      description: 'Take advantage to ventilate your home or office. Fresh air will improve indoor air quality.',
      severity: 'info',
      category: 'general'
    })
  }

  // ==========================================
  // AQI 51-100: MODERATE
  // ==========================================
  else if (aqi <= 100) {
    recommendations.push({
      id: 'moderate-activity',
      icon: '🚶',
      title: 'Moderate activities are safe',
      description: 'Most people can exercise outdoors without problems. Very sensitive groups should be alert.',
      severity: 'info',
      category: 'activity'
    })

    recommendations.push({
      id: 'moderate-sensitive',
      icon: '⚠️',
      title: 'Caution for sensitive groups',
      description: 'If you have asthma, heart problems, or are an older adult, consider reducing very intense and prolonged efforts.',
      severity: 'warning',
      category: 'health'
    })

    recommendations.push({
      id: 'moderate-children',
      icon: '👶',
      title: 'Children can play outside',
      description: 'Children can play normally, but take frequent breaks if they\'re going to be active for more than 1 hour.',
      severity: 'info',
      category: 'activity'
    })
  }

  // ==========================================
  // AQI 101-150: UNHEALTHY FOR SENSITIVE GROUPS
  // ==========================================
  else if (aqi <= 150) {
    recommendations.push({
      id: 'usg-limit-sensitive',
      icon: '🚫',
      title: 'Sensitive groups: avoid prolonged exertion',
      description: 'If you have asthma, heart or lung disease, are a child or older adult: reduce intense outdoor exercise.',
      severity: 'warning',
      category: 'health'
    })

    recommendations.push({
      id: 'usg-general-ok',
      icon: '👥',
      title: 'General public can be outside',
      description: 'If you\'re not part of sensitive groups, you can perform normal activities, but pay attention to unusual symptoms.',
      severity: 'info',
      category: 'activity'
    })

    recommendations.push({
      id: 'usg-inhaler',
      icon: '💊',
      title: 'Have medications on hand',
      description: 'If you have asthma or breathing problems, carry your inhaler. Air can trigger symptoms.',
      severity: 'warning',
      category: 'health'
    })

    recommendations.push({
      id: 'usg-indoors',
      icon: '🏠',
      title: 'Consider indoor activities',
      description: 'If you plan to exercise, better do it in a gym or indoor space with filtered air.',
      severity: 'info',
      category: 'activity'
    })

    recommendations.push({
      id: 'usg-windows',
      icon: '🪟',
      title: 'Keep windows closed',
      description: 'Prevent polluted air from entering your home. Use air filters if you have them available.',
      severity: 'warning',
      category: 'general'
    })
  }

  // ==========================================
  // AQI 151-200: UNHEALTHY
  // ==========================================
  else if (aqi <= 200) {
    recommendations.push({
      id: 'unhealthy-everyone',
      icon: '🚨',
      title: 'Everyone may feel effects',
      description: 'All people may experience eye, nose, and throat irritation. Sensitive groups will have more serious effects.',
      severity: 'danger',
      category: 'health'
    })

    recommendations.push({
      id: 'unhealthy-reduce',
      icon: '🚫',
      title: 'Reduce outdoor exertion',
      description: 'Avoid intense or prolonged exercise outside. If you must be outside, take frequent indoor breaks.',
      severity: 'danger',
      category: 'activity'
    })

    recommendations.push({
      id: 'unhealthy-sensitive-inside',
      icon: '🏠',
      title: 'Sensitive groups: stay inside',
      description: 'If you\'re a child, older adult, or have respiratory/heart problems: stay indoors.',
      severity: 'danger',
      category: 'safety'
    })

    recommendations.push({
      id: 'unhealthy-mask',
      icon: '😷',
      title: 'Consider wearing a face mask',
      description: 'If you must be outside, an N95 mask can help reduce particle exposure.',
      severity: 'warning',
      category: 'safety'
    })

    recommendations.push({
      id: 'unhealthy-windows-closed',
      icon: '🪟',
      title: 'Keep windows and doors closed',
      description: 'Seal your home as best as possible. Use air purifiers if available.',
      severity: 'danger',
      category: 'general'
    })

    recommendations.push({
      id: 'unhealthy-school',
      icon: '🏫',
      title: 'School sports should be canceled',
      description: 'Outdoor sports activities in schools are not recommended. Physical education should be indoors.',
      severity: 'danger',
      category: 'activity'
    })
  }

  // ==========================================
  // AQI 201-300: VERY UNHEALTHY
  // ==========================================
  else if (aqi <= 300) {
    recommendations.push({
      id: 'very-unhealthy-alert',
      icon: '🚨',
      title: 'HEALTH ALERT',
      description: 'Entire population is at risk of experiencing serious health effects.',
      severity: 'critical',
      category: 'health'
    })

    recommendations.push({
      id: 'very-unhealthy-stay-inside',
      icon: '🏠',
      title: 'Stay indoors',
      description: 'EVERYONE should avoid outdoor activities. Stay home with windows closed.',
      severity: 'critical',
      category: 'safety'
    })

    recommendations.push({
      id: 'very-unhealthy-sensitive-restrict',
      icon: '⛔',
      title: 'Sensitive groups: total restriction',
      description: 'If you\'re vulnerable, DO NOT go outside. Follow your doctor\'s recommendations and have medications ready.',
      severity: 'critical',
      category: 'health'
    })

    recommendations.push({
      id: 'very-unhealthy-mask-required',
      icon: '😷',
      title: 'N95 mask mandatory if going out',
      description: 'If you absolutely must go out, wear an N95 mask and minimize outdoor time.',
      severity: 'critical',
      category: 'safety'
    })

    recommendations.push({
      id: 'very-unhealthy-air-filter',
      icon: '🌀',
      title: 'Use air purifiers',
      description: 'Activate HEPA air filters in your home. Keep indoor air recirculation to a minimum.',
      severity: 'danger',
      category: 'general'
    })

    recommendations.push({
      id: 'very-unhealthy-medical',
      icon: '🏥',
      title: 'Monitor symptoms',
      description: 'If you experience breathing difficulty, chest pain, or dizziness, seek medical attention immediately.',
      severity: 'critical',
      category: 'health'
    })
  }

  // ==========================================
  // AQI 301+: HAZARDOUS
  // ==========================================
  else {
    recommendations.push({
      id: 'hazardous-emergency',
      icon: '☠️',
      title: 'PUBLIC HEALTH EMERGENCY',
      description: 'Extremely dangerous air conditions. Entire population is at serious risk.',
      severity: 'critical',
      category: 'health'
    })

    recommendations.push({
      id: 'hazardous-lockdown',
      icon: '🔒',
      title: 'DO NOT go outside under any circumstances',
      description: 'Stay indoors with all windows and doors sealed. Don\'t go out unless it\'s a life-threatening emergency.',
      severity: 'critical',
      category: 'safety'
    })

    recommendations.push({
      id: 'hazardous-evacuation',
      icon: '🚨',
      title: 'Consider evacuation if possible',
      description: 'If there are options to go to an area with better air quality, consider evacuating with your family.',
      severity: 'critical',
      category: 'safety'
    })

    recommendations.push({
      id: 'hazardous-medical-ready',
      icon: '🏥',
      title: 'Medical preparedness',
      description: 'Have emergency lines on hand. If you have pre-existing conditions, contact your doctor immediately.',
      severity: 'critical',
      category: 'health'
    })

    recommendations.push({
      id: 'hazardous-air-tight',
      icon: '🪟',
      title: 'Seal your home completely',
      description: 'Cover windows and doors. Use damp towels to seal cracks. Activate all available purifiers.',
      severity: 'critical',
      category: 'general'
    })

    recommendations.push({
      id: 'hazardous-authorities',
      icon: '📢',
      title: 'Follow authorities\' instructions',
      description: 'Stay informed through official channels. There may be evacuation or shelter orders.',
      severity: 'critical',
      category: 'safety'
    })
  }

  // ==========================================
  // POLLUTANT-SPECIFIC RECOMMENDATIONS
  // ==========================================
  if (dominantPollutant) {
    if (dominantPollutant.toUpperCase().includes('O3') || dominantPollutant.toUpperCase().includes('OZONE')) {
      if (aqi > 100) {
        recommendations.push({
          id: 'ozone-specific',
          icon: '☀️',
          title: 'Ozone (O3) is the main pollutant',
          description: 'Ozone is worse during sunny afternoons. If you must go out, do it early morning or at dusk.',
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
          title: 'Particulate matter (PM2.5) is the issue',
          description: 'Fine particles can penetrate deep into lungs. An N95 mask is highly recommended if going out.',
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
          title: 'Nitrogen dioxide (NO2) elevated',
          description: 'NO2 comes mainly from vehicles. Avoid areas with heavy traffic.',
          severity: aqi > 150 ? 'danger' : 'warning',
          category: 'general'
        })
      }
    }
  }

  return recommendations
}

/**
 * Get badge color based on severity
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
 * Get categorized recommendations
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
