/**
 * Client-Side Form Validation Helper Engine
 */

export function validateForm(values, rules) {
  const errors = {}

  for (const [field, fieldRules] of Object.entries(rules)) {
    const val = values[field]

    for (const rule of fieldRules) {
      if (rule.required && (!val || (typeof val === 'string' && !val.trim()))) {
        errors[field] = rule.message || `${fieldRules.label || field} is required`
        break
      }
      if (rule.minLength && typeof val === 'string' && val.trim().length < rule.minLength) {
        errors[field] = rule.message || `Must be at least ${rule.minLength} characters`
        break
      }
      if (rule.maxLength && typeof val === 'string' && val.trim().length > rule.maxLength) {
        errors[field] = rule.message || `Cannot exceed ${rule.maxLength} characters`
        break
      }
      if (rule.min !== undefined && typeof val === 'number' && val < rule.min) {
        errors[field] = rule.message || `Must be at least ${rule.min}`
        break
      }
      if (rule.max !== undefined && typeof val === 'number' && val > rule.max) {
        errors[field] = rule.message || `Cannot exceed ${rule.max}`
        break
      }
      if (rule.isFutureDate && val) {
        const dateVal = new Date(val)
        if (isNaN(dateVal.getTime()) || dateVal <= new Date()) {
          errors[field] = rule.message || 'Due date must be in the future'
          break
        }
      }
      if (rule.pattern && typeof val === 'string' && !rule.pattern.test(val)) {
        errors[field] = rule.message || 'Invalid format'
        break
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
