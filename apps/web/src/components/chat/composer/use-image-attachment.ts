'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export const IMAGE_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const IMAGE_MAX_BYTES = 10 * 1024 * 1024

export function useImageAttachment() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [attachedImage, setAttachedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    if (!attachedImage) {
      setImagePreview(null)
      return
    }
    const url = URL.createObjectURL(attachedImage)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [attachedImage])

  const handlePickImage = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!IMAGE_ALLOWED_MIME.includes(file.type)) {
      toast.error('Image must be JPEG, PNG, WebP or GIF')
      return
    }
    if (file.size > IMAGE_MAX_BYTES) {
      toast.error('Image too large (max 10MB)')
      return
    }
    setAttachedImage(file)
  }

  const clearImage = () => setAttachedImage(null)

  return {
    fileInputRef,
    attachedImage,
    setAttachedImage,
    imagePreview,
    handlePickImage,
    handleFileChange,
    clearImage,
  }
}
