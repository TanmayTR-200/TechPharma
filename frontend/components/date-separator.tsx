"use client"

import React from 'react'
import { formatDateShort } from '@/lib/formatDate'

interface Props {
  date: string | Date
}

export default function DateSeparator({ date }: Props) {
  const d = typeof date === 'string' ? new Date(date) : date
  return (
    <div className="w-full flex items-center my-3">
      <div className="mx-auto px-3 py-1.5 rounded-md bg-gray-800 text-sm text-gray-100 border border-gray-700 shadow-sm">
        {formatDateShort(d)}
      </div>
    </div>
  )
}
