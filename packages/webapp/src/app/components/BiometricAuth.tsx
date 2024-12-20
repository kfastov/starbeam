'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Fingerprint, AlertTriangle, CheckCircle2 } from 'lucide-react'

// Mock functions to simulate Telegram Mini App SDK behavior
const mockMiniApp = {
  isSupported: () => true,
  showPopup: async () => {}
}

const mockBiometry = {
  isSupported: async () => true,
  getType: async () => 'fingerprint' as 'fingerprint' | 'face',
  requestBiometry: async () => ({ success: true })
}

export default function BiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false)
  const [biometryType, setBiometryType] = useState<'face' | 'fingerprint' | 'none'>('none')
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('Initializing...')

  useEffect(() => {
    const checkBiometrySupport = async () => {
      try {
        setStatus('Checking biometry support...')
        
        // Check if running in Telegram Mini App (using mock for demonstration)
        if (!mockMiniApp.isSupported()) {
          setStatus('Not running in Telegram Mini App')
          return
        }

        // Check biometry availability
        const biometrySupport = await mockBiometry.isSupported()
        setIsAvailable(biometrySupport)
        
        if (biometrySupport) {
          // Get biometry type
          const type = await mockBiometry.getType()
          setBiometryType(type)
          setStatus(`Ready to use ${type} authentication`)
        } else {
          setStatus('Biometric authentication not available')
        }
      } catch (err) {
        setStatus('Failed to initialize biometry')
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    checkBiometrySupport()
  }, [])

  const handleBiometricVerification = async () => {
    try {
      setStatus('Requesting biometric verification...')
      
      const result = await mockBiometry.requestBiometry({
        title: 'Verify Your Identity',
        description: 'Please verify your identity using biometrics'
      })

      if (result.success) {
        setIsVerified(true)
        setError(null)
        setStatus('Successfully verified!')
        
        // Show success message using Mini App native UI (mocked)
        await mockMiniApp.showPopup({
          title: 'Success',
          message: 'Identity verified successfully!',
          buttons: [{ type: 'ok' }]
        })
      } else {
        throw new Error('Verification failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setStatus('Verification failed. Please try again.')
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Biometric Authentication</CardTitle>
        <CardDescription>{status}</CardDescription>
      </CardHeader>
      <CardContent>
        {!mockMiniApp.isSupported() && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This app must be opened in Telegram Mini App.
            </AlertDescription>
          </Alert>
        )}

        {mockMiniApp.isSupported() && !isAvailable && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Biometric authentication is not available on your device.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isVerified && (
          <Alert variant="success" className="mt-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Identity verified successfully! Verified using {biometryType}.
            </AlertDescription>
          </Alert>
        )}

        {mockMiniApp.isSupported() && isAvailable && !isVerified && (
          <Button
            onClick={handleBiometricVerification}
            className="w-full mt-4"
          >
            <Fingerprint className="mr-2 h-4 w-4" />
            Verify with {biometryType === 'face' ? 'Face ID' : 'Fingerprint'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

