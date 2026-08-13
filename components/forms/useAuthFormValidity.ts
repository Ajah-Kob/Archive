'use client'

import { useState, type RefObject } from 'react'

export function useAuthFormValidity(
  formRef: RefObject<HTMLFormElement | null>
) {
  const [isFormValid, setIsFormValid] = useState(false)

  function checkFormValidity() {
    const form = formRef.current
    if (!form) return
    const inputs = form.querySelectorAll('input[required]:not([type="hidden"])')
    setIsFormValid(
      Array.from(inputs).every(
        (input) => (input as HTMLInputElement).value.trim() !== ''
      )
    )
  }

  return { isFormValid, checkFormValidity }
}
