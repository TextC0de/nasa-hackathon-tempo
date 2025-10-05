/**
 * Alert Templates - Plantillas pre-escritas para alertas comunes
 *
 * Templates optimizados para California con multi-idioma (EN/ES/ZH/VI)
 * basados en protocolos reales de CARB y EPA.
 */

export interface AlertTemplate {
  id: string
  name: string
  emoji: string
  alertType: 'wildfire' | 'ozone' | 'pm25' | 'custom'
  urgency: 'low' | 'medium' | 'high' | 'critical'
  content: {
    en: {
      title: string
      description: string
      recommendations: string[]
    }
    es: {
      title: string
      description: string
      recommendations: string[]
    }
    zh: {
      title: string
      description: string
      recommendations: string[]
    }
    vi: {
      title: string
      description: string
      recommendations: string[]
    }
  }
}

export const ALERT_TEMPLATES: AlertTemplate[] = [
  {
    id: 'wildfire-smoke',
    name: 'Wildfire Smoke Alert',
    emoji: '🔥',
    alertType: 'wildfire',
    urgency: 'high',
    content: {
      en: {
        title: 'Wildfire Smoke Advisory',
        description: 'Smoke from wildfires is affecting air quality in your area. Air quality has reached unhealthy levels for sensitive groups.',
        recommendations: [
          'Stay indoors with windows and doors closed',
          'Use air purifiers with HEPA filters if available',
          'Avoid outdoor physical activities',
          'People with heart or lung disease, older adults, and children should take extra precautions',
          'Monitor local air quality at airnow.gov'
        ]
      },
      es: {
        title: 'Aviso de Humo de Incendios Forestales',
        description: 'El humo de incendios forestales está afectando la calidad del aire en su área. La calidad del aire ha alcanzado niveles no saludables para grupos sensibles.',
        recommendations: [
          'Permanezca en interiores con ventanas y puertas cerradas',
          'Use purificadores de aire con filtros HEPA si están disponibles',
          'Evite actividades físicas al aire libre',
          'Las personas con enfermedades cardíacas o pulmonares, adultos mayores y niños deben tomar precauciones adicionales',
          'Monitoree la calidad del aire local en airnow.gov'
        ]
      },
      zh: {
        title: '野火烟雾警报',
        description: '野火产生的烟雾正在影响您所在地区的空气质量。空气质量已达到对敏感人群不健康的水平。',
        recommendations: [
          '留在室内，关闭门窗',
          '如有条件，使用带HEPA过滤器的空气净化器',
          '避免户外体育活动',
          '患有心脏或肺部疾病的人、老年人和儿童应采取额外预防措施',
          '在airnow.gov监测当地空气质量'
        ]
      },
      vi: {
        title: 'Cảnh Báo Khói Cháy Rừng',
        description: 'Khói từ cháy rừng đang ảnh hưởng đến chất lượng không khí trong khu vực của bạn. Chất lượng không khí đã đạt mức độ không lành mạnh cho các nhóm nhạy cảm.',
        recommendations: [
          'Ở trong nhà với cửa sổ và cửa ra vào đóng kín',
          'Sử dụng máy lọc không khí có bộ lọc HEPA nếu có',
          'Tránh các hoạt động thể chất ngoài trời',
          'Người mắc bệnh tim hoặc phổi, người cao tuổi và trẻ em nên thận trọng hơn',
          'Theo dõi chất lượng không khí địa phương tại airnow.gov'
        ]
      }
    }
  },
  {
    id: 'high-ozone',
    name: 'High Ozone Alert',
    emoji: '☀️',
    alertType: 'ozone',
    urgency: 'medium',
    content: {
      en: {
        title: 'Ozone Action Day',
        description: 'Ground-level ozone is expected to reach unhealthy levels today due to high temperatures and sunlight. Ozone can cause respiratory problems.',
        recommendations: [
          'Limit outdoor activities during afternoon hours (12pm-6pm)',
          'Exercise in the early morning when ozone levels are lower',
          'People with asthma should keep quick-relief medicine handy',
          'Carpool, use public transit, or work from home if possible',
          'Avoid using gas-powered lawn equipment'
        ]
      },
      es: {
        title: 'Día de Acción por Ozono',
        description: 'Se espera que el ozono a nivel del suelo alcance niveles no saludables hoy debido a las altas temperaturas y la luz solar. El ozono puede causar problemas respiratorios.',
        recommendations: [
          'Limite las actividades al aire libre durante las horas de la tarde (12pm-6pm)',
          'Haga ejercicio temprano en la mañana cuando los niveles de ozono son más bajos',
          'Las personas con asma deben tener medicamentos de alivio rápido a mano',
          'Comparta el automóvil, use transporte público o trabaje desde casa si es posible',
          'Evite usar equipos de jardinería a gasolina'
        ]
      },
      zh: {
        title: '臭氧行动日',
        description: '由于高温和阳光，预计今天地面臭氧将达到不健康水平。臭氧可能导致呼吸问题。',
        recommendations: [
          '在下午时段（中午12点至下午6点）限制户外活动',
          '在臭氧水平较低的清晨锻炼',
          '哮喘患者应随身携带速效药物',
          '如可能，拼车、使用公共交通或在家工作',
          '避免使用汽油动力园艺设备'
        ]
      },
      vi: {
        title: 'Ngày Hành Động Ozone',
        description: 'Ozone ở mặt đất dự kiến sẽ đạt mức độ không lành mạnh hôm nay do nhiệt độ cao và ánh nắng mặt trời. Ozone có thể gây ra các vấn đề về hô hấp.',
        recommendations: [
          'Hạn chế các hoạt động ngoài trời vào giờ chiều (12pm-6pm)',
          'Tập thể dục vào sáng sớm khi mức ozone thấp hơn',
          'Người bị hen suyễn nên mang theo thuốc giảm đau nhanh',
          'Đi chung xe, sử dụng phương tiện công cộng hoặc làm việc tại nhà nếu có thể',
          'Tránh sử dụng thiết bị cắt cỏ chạy bằng xăng'
        ]
      }
    }
  },
  {
    id: 'pm25-alert',
    name: 'PM2.5 Alert',
    emoji: '🌫️',
    alertType: 'pm25',
    urgency: 'high',
    content: {
      en: {
        title: 'Particulate Matter Advisory',
        description: 'Fine particulate matter (PM2.5) levels are unhealthy. These tiny particles can penetrate deep into lungs and bloodstream.',
        recommendations: [
          'Reduce prolonged or heavy outdoor exertion',
          'Keep windows and doors closed',
          'Run air conditioning on recirculate mode',
          'Wear N95 or KN95 masks if you must go outside',
          'Consider using portable air cleaners indoors',
          'Check on vulnerable neighbors and family members'
        ]
      },
      es: {
        title: 'Aviso de Material Particulado',
        description: 'Los niveles de material particulado fino (PM2.5) no son saludables. Estas partículas diminutas pueden penetrar profundamente en los pulmones y el torrente sanguíneo.',
        recommendations: [
          'Reduzca el esfuerzo prolongado o intenso al aire libre',
          'Mantenga ventanas y puertas cerradas',
          'Use el aire acondicionado en modo de recirculación',
          'Use máscaras N95 o KN95 si debe salir',
          'Considere usar limpiadores de aire portátiles en interiores',
          'Revise a vecinos y familiares vulnerables'
        ]
      },
      zh: {
        title: '颗粒物警报',
        description: '细颗粒物（PM2.5）水平不健康。这些微小颗粒可以深入肺部和血液循环。',
        recommendations: [
          '减少长时间或剧烈的户外运动',
          '保持门窗关闭',
          '将空调设置为内循环模式',
          '如必须外出，请佩戴N95或KN95口罩',
          '考虑在室内使用便携式空气净化器',
          '关注易感邻居和家人'
        ]
      },
      vi: {
        title: 'Cảnh Báo Bụi Mịn',
        description: 'Mức độ bụi mịn (PM2.5) không lành mạnh. Những hạt nhỏ này có thể xâm nhập sâu vào phổi và máu.',
        recommendations: [
          'Giảm hoạt động ngoài trời kéo dài hoặc nặng',
          'Đóng cửa sổ và cửa ra vào',
          'Chạy điều hòa ở chế độ tuần hoàn nội bộ',
          'Đeo khẩu trang N95 hoặc KN95 nếu phải ra ngoài',
          'Cân nhắc sử dụng máy lọc không khí di động trong nhà',
          'Kiểm tra hàng xóm và thành viên gia đình dễ bị tổn thương'
        ]
      }
    }
  }
]

/**
 * Get template by ID
 */
export function getTemplateById(id: string): AlertTemplate | undefined {
  return ALERT_TEMPLATES.find(t => t.id === id)
}

/**
 * Get templates by type
 */
export function getTemplatesByType(type: AlertTemplate['alertType']): AlertTemplate[] {
  return ALERT_TEMPLATES.filter(t => t.alertType === type)
}
