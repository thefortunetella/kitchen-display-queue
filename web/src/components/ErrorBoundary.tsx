import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Alert, AlertTitle, Button } from '@mui/material'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

// Keeps a rendering error in one list from blanking the whole page.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Kitchen Display could not render this list', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <Alert
          severity="error"
          sx={{ m: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
          }
        >
          <AlertTitle>This list could not be displayed</AlertTitle>
          {this.state.error.message}
        </Alert>
      )
    }
    return this.props.children
  }
}
