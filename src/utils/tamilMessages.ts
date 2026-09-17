/**
 * SP Academy - Tamil WhatsApp Message Templates & URL Generators
 */

export interface StudentMessageParams {
  studentName?: string
  className?: string
  parentName?: string
  dateStr?: string
  month?: string
  amount?: number | string
  subject?: string
  marks?: number | string
  totalMarks?: number | string
  noticeTitle?: string
  noticeDetails?: string
}

/**
 * Format phone number with country code (default 91 for India)
 */
export const formatWhatsAppPhone = (phone: string): string => {
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.length === 10) {
    return `91${cleaned}`
  }
  return cleaned
}

/**
 * Generate a direct https://wa.me link with encoded Tamil text
 */
export const createWhatsAppChatUrl = (phone: string, message: string): string => {
  const formattedPhone = formatWhatsAppPhone(phone)
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${formattedPhone}?text=${encoded}`
}

/**
 * 1. Absence Alert in Tamil
 */
export const getTamilAbsenceMessage = ({ studentName, className, dateStr, parentName }: StudentMessageParams): string => {
  const salutation = parentName ? `வணக்கம் ${parentName} அவர்களே,` : `வணக்கம் பெற்றோர்களே,`
  const date = dateStr || new Date().toLocaleDateString('ta-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const standard = className ? ` (${className} வகுப்பு)` : ''

  return `${salutation}
  
📌 *SP Academy டியூஷன் மையம் அறிவிப்பு:*

உங்கள் பிள்ளை *${studentName}*${standard} இன்று (*${date}*) டியூஷன் வகுப்புக்கு வரவில்லை (*ABSENT*).

ஏதேனும் அவசர காரணம் அல்லது சந்தேகம் இருப்பின் தயவுசெய்து எங்களை தொடர்பு கொள்ளவும்.

நன்றி,
*SP Academy நிர்வாகம்*
📞 தொடர்பு: SP Academy`
}

/**
 * 2. Monthly Fee Reminder in Tamil
 */
export const getTamilFeesReminderMessage = ({ studentName, className, month, amount, parentName }: StudentMessageParams): string => {
  const salutation = parentName ? `வணக்கம் ${parentName} அவர்களே,` : `வணக்கம் பெற்றோர்களே,`
  const feeMonth = month || new Date().toLocaleString('ta-IN', { month: 'long' })
  const feeAmount = amount ? `ரூ. ${amount}` : 'டியூஷன் கட்டணம்'

  return `${salutation}

💰 *SP Academy - டியூஷன் கட்டண நினைவூட்டல்:*

உங்கள் பிள்ளை *${studentName}* (${className || '10th/11th/12th'})-ன் *${feeMonth}* மாதத்திற்கான கட்டணம் (${feeAmount}) நிலுவையில் உள்ளது.

கட்டணத்தை விரைவில் செலுத்தி ஒத்துழைக்குமாறு அன்புடன் கேட்டுக்கொள்கிறோம்.

நன்றி,
*SP Academy நிர்வாகம்*`
}

export const getTamilMultiMonthFeeMessage = ({
  studentName,
  className,
  parentName,
  unpaidMonthsText,
  totalAmountDue
}: {
  studentName: string
  className?: string
  parentName?: string
  unpaidMonthsText: string
  totalAmountDue: number
}): string => {
  const salutation = parentName ? `வணக்கம் ${parentName} அவர்களே,` : `வணக்கம் பெற்றோர்களே,`

  return `${salutation}

💰 *SP Academy - டியூஷன் கட்டண நிலுவை நினைவூட்டல்:*

மாணவர் பெயர்: *${studentName}* (${className || ''})
நிலுவையில் உள்ள மாதங்கள்: *${unpaidMonthsText}*
மொத்த நிலுவைத் தொகை: *ரூ. ${totalAmountDue.toLocaleString('en-IN')}*

தயவுசெய்து நிலுவைக் கட்டணத்தை விரைவில் செலுத்தி ஒத்துழைக்குமாறு அன்புடன் கேட்டுக்கொள்கிறோம்.

நன்றி,
*SP Academy நிர்வாகம்*`
}

/**
 * 3. Test Marks & Performance Report in Tamil
 */
export const getTamilMarksReportMessage = ({ studentName, className, subject, marks, totalMarks, parentName }: StudentMessageParams): string => {
  const salutation = parentName ? `வணக்கம் ${parentName} அவர்களே,` : `வணக்கம் பெற்றோர்களே,`
  const sub = subject || 'அனைத்து பாடங்கள்'
  const score = marks !== undefined ? marks : '--'
  const maxScore = totalMarks || '100'

  return `${salutation}

📊 *SP Academy - தேர்வு மதிப்பெண் விவரம்:*

மாணவர் பெயர்: *${studentName}*
வகுப்பு: *${className || ''}*
பாடம்: *${sub}*
மதிப்பெண்: *${score} / ${maxScore}*

மாணவரின் கற்றல் திறனை தொடர்ந்து கண்காணிக்கவும்.

நன்றி,
*SP Academy ஆசிரியர் குழு*`
}

/**
 * 4. Holiday / General Notice in Tamil
 */
export const getTamilGeneralNoticeMessage = ({ noticeTitle, noticeDetails, parentName }: StudentMessageParams): string => {
  const salutation = parentName ? `வணக்கம் ${parentName} அவர்களே,` : `வணக்கம் பெற்றோர்களே,`
  const title = noticeTitle || 'பொது அறிவிப்பு'
  const details = noticeDetails || 'நாளை டியூஷன் வகுப்புகளுக்கு விடுமுறை.'

  return `${salutation}

📢 *SP Academy - ${title}:*

${details}

நன்றி,
*SP Academy நிர்வாகம்*`
}

/**
 * 5. Class Group: Exam Timetable & Schedule Notice in Tamil
 */
export const getTamilClassExamScheduleMessage = (className: string, examName?: string, dateDetails?: string): string => {
  return `📢 *SP Academy - ${className} வகுப்பு சிறப்புத் தேர்வு அறிவிப்பு*

அன்புடைய பெற்றோர்கள் மற்றும் மாணவர்களுக்கு வணக்கம்,

${className} மாணவர்களுக்கான *${examName || 'வாராந்திர மாதிரித் தேர்வு'}* அட்டவணை:

📅 நாள் / நேரம்: ${dateDetails || 'வரும் ஞாயிற்றுக்கிழமை காலை 10:00 மணி'}
📚 பாடப்பகுதி: முழு பாடத்திட்டம் / திருப்புதல்

மாணவர்கள் அனைவரும் தேர்வுக்கு முறையாகத் தயாராகி குறித்த நேரத்தில் கலந்துகொள்ளுமாறு கேட்டுக்கொள்கிறோம்.

நன்றி,
*SP Academy ஆசிரியர் குழு*`
}

/**
 * 6. Class Group: Holiday Announcement in Tamil
 */
export const getTamilClassHolidayMessage = (className: string, reason?: string, dateStr?: string): string => {
  return `🌴 *SP Academy - ${className} வகுப்பு விடுமுறை அறிவிப்பு*

அன்புடைய பெற்றோர்களே,

${dateStr ? `*${dateStr}* அன்று ` : 'நாளை '}${className} வகுப்பு மாணவர்களுக்கு *${reason || 'டியூஷன் வகுப்புகள் நடைபெறாது / விடுமுறை'}*.

அடுத்த வகுப்பு வழக்கம் போல் நடைபெறும்.

நன்றி,
*SP Academy நிர்வாகம்*`
}

/**
 * 7. Class Group: Special / Extra Revision Class Notice in Tamil
 */
export const getTamilClassSpecialClassMessage = (className: string, subject?: string, timing?: string, dateStr?: string): string => {
  return `⏰ *SP Academy - ${className} சிறப்பு திருப்புதல் வகுப்பு*

பெற்றோர்கள் மற்றும் மாணவர்களின் கவனத்திற்கு:

${className} வகுப்பு மாணவர்களுக்கான *${subject || 'முக்கிய பாட'} சிறப்பு வகுப்பு* நடைபெறும் விவரம்:

📅 நாள்: ${dateStr || 'நாளை'}
⏰ நேரம்: ${timing || 'மாலை 6:00 மணி முதல் 8:30 மணி வரை'}

மாணவர்கள் கட்டாயம் கலந்துகொண்டு பயன்பெறுமாறு கேட்டுக்கொள்கிறோம்.

நன்றி,
*SP Academy*`
}

/**
 * 8. Class Group: Parents-Teachers Meeting (PTM) Notice
 */
export const getTamilClassMeetingMessage = (className: string, timing?: string, dateStr?: string): string => {
  return `🤝 *SP Academy - ${className} பெற்றோர் ஆசிரியர் கலந்தாய்வு கூட்டம்*

அன்பார்ந்த ${className} வகுப்பு பெற்றோர்களுக்கு வணக்கம்,

மாணவர்களின் கல்வி முன்னேற்றம் மற்றும் தேர்வுத் தயாரிப்பு குறித்து கலந்துரையாட பெற்றோர் சந்திப்பு நடைபெற உள்ளது.

📅 நாள்: ${dateStr || 'வரும் ஞாயிற்றுக்கிழமை'}
⏰ நேரம்: ${timing || 'காலை 10:30 மணி'}
📍 இடம்: SP Academy வளாகம்

பெற்றோர்கள் அனைவரும் குறித்த நேரத்தில் வருகை தந்து கலந்துகொள்ளுமாறு அன்புடன் அழைக்கிறோம்.

நன்றி,
*SP Academy நிர்வாகம்*`
}

