import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert, AlertTitle, Box, Button } from '@mui/material'
import i18n from 'i18next'

interface Props {
  children: ReactNode
  /** Changing it (e.g. the route) clears a previous error */
  resetKey?: string
}

interface State {
  error: Error | null
}

/** Keeps a crashing page from blanking the whole app: shows the error in place of the page. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page error:', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <Box sx={{ maxWidth: 720 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => this.setState({ error: null })}>
              {i18n.t('common.retry')}
            </Button>
          }
        >
          <AlertTitle>{i18n.t('common.pageError')}</AlertTitle>
          {this.state.error.message}
        </Alert>
      </Box>
    )
  }
}
