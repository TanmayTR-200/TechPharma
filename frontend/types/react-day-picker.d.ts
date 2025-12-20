declare module 'react-day-picker' {
  import * as React from 'react'

  // Minimal ambient declarations to satisfy TypeScript in this project.
  // We keep them intentionally loose (any) so we don't need the full
  // library types for the current UI usage.

  export const DayPicker: React.ComponentType<any>
  export const DayButton: React.ComponentType<any>
  export function getDefaultClassNames(): any

  export type Day = { date: Date }

  export interface DayPickerProps extends React.HTMLAttributes<any> {}

  export default DayPicker
}
