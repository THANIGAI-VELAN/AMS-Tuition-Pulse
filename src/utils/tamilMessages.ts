/**
 * SP Academy - Tamil WhatsApp Message Templates & URL Generators
 */

export interface StudentMessageParams {
  studentName: string
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
