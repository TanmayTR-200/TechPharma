'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SoldProductsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/sales')
  }, [router])

  return <div />
}