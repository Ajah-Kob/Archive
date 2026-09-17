"use client"

import { SessionProvider } from "next-auth/react"
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter"
import { ThemeProvider } from "@mui/material/styles"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { enUS } from "date-fns/locale"
import { archiveMuiTheme } from "@/components/ui/archiveMuiTheme"

type Props = {
  children?: React.ReactNode
}

export const Providers = ({ children }: Props) => {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={archiveMuiTheme}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
          <SessionProvider refetchInterval={60}>{children}</SessionProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
}