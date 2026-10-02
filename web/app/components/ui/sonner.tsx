"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  // Sonner accepts richColors to enable built-in color variants.
  // We also pass CSS custom properties to align with your Tailwind/theme tokens.
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      richColors
      className="toaster group"
      style={
        {
          // Normal / default toast
          "--normal-bg": "var(--bg-primary, #0f172a)",
          "--normal-text": "var(--text-primary, #ffffff)",
          "--normal-border": "transparent",

          // Success toast
          "--success-bg": "var(--success, #059669)",
          "--success-text": "#ffffff",
          "--success-border": "transparent",

          // Error toast
          "--error-bg": "var(--error, #dc2626)",
          "--error-text": "#ffffff",
          "--error-border": "transparent",

          // Info / warning (optional)
          "--info-bg": "var(--info, #0ea5e9)",
          "--warning-bg": "var(--warning, #f59e0b)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
