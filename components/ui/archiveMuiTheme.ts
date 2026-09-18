import { createTheme } from '@mui/material/styles'
import type {} from '@mui/x-date-pickers/themeAugmentation'

// Archive design tokens mapped onto MUI (pickers + fields only — the rest of
// the app stays Tailwind). Mirrors the StepSchedule wizard treatment:
// Sora headers, 13px body, #e8ebf8 borders, #707dff accents.
export const archiveMuiTheme = createTheme({
  palette: {
    primary: {
      main: '#707dff',
      dark: '#5565ff',
      contrastText: '#ffffff',
    },
    text: {
      primary: '#1e2145',
      secondary: '#5a6382',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13,
  },
  components: {
    MuiPickersCalendarHeader: {
      styleOverrides: {
        label: {
          fontFamily: "'Sora', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          color: '#1e3a8a',
        },
      },
    },
    MuiPickersOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: 13,
          fontWeight: 500,
          color: '#10133a',
          backgroundColor: '#ffffff',
          borderRadius: 8,
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          '& .MuiPickersOutlinedInput-notchedOutline': {
            borderColor: '#e8ebf8',
          },
          '&:hover .MuiPickersOutlinedInput-notchedOutline': {
            borderColor: 'rgba(112,125,255,0.6)',
          },
          '&.Mui-focused .MuiPickersOutlinedInput-notchedOutline': {
            borderColor: '#707dff',
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 2px rgba(112,125,255,0.18)',
          },
          '&.Mui-disabled': {
            backgroundColor: '#f8f9fd',
            color: '#a0a8c4',
          },
        },
        input: {
          height: '37.5px',
          padding: '0 13px',
          boxSizing: 'border-box',
          '&::placeholder': {
            color: '#8a93b4',
            opacity: 1,
          },
        },
      },
    },
    MuiDigitalClock: {
      styleOverrides: {
        root: {
          '& .MuiMenuItem-root': {
            justifyContent: 'center',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: 13,
          fontWeight: 600,
          color: '#1e2145',
          backgroundColor: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#e8ebf8',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d4d8f0',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(112,125,255,0.5)',
          },
          '&.Mui-disabled': {
            backgroundColor: '#f8f9fd',
            color: '#a0a8c4',
          },
        },
        input: {
          height: '42px',
          padding: '0 14px',
          boxSizing: 'border-box',
          '&::placeholder': {
            color: '#9ea8c6',
            opacity: 1,
          },
        },
      },
    },
    MuiDayCalendar: {
      styleOverrides: {
        weekDayLabel: {
          width: 35,
          fontWeight: 600,
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#8a93b4',
        },
      },
    },
    MuiPickerDay: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: 11,
          color: '#10133a',
          borderRadius: '50%',
          width: 35,
          height: 35,
          '&:hover': {
            backgroundColor: 'rgba(112,125,255,0.12)',
          },
          '&.Mui-selected': {
            backgroundColor: '#707dff',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#5565ff',
            },
            '&:focus': {
              backgroundColor: '#707dff',
            },
          },
          '&.Mui-disabled': {
            color: '#cbd0e6',
            backgroundColor: 'transparent',
          },
        },
        today: {
          color: '#707dff',
          fontWeight: 700,
          border: '1.5px solid #707dff',
          backgroundColor: 'rgba(112,125,255,0.14)',
          '&.Mui-selected': {
            color: '#ffffff',
            backgroundColor: '#707dff',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: '1px solid #eceef8',
        },
      },
    },
  },
})
