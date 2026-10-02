import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import Header from '@/components/Header'
import { useAuth } from '@/app/context/AuthContext'
import { useTheme } from '@/theme/ThemeProvider'
import { router } from 'expo-router'

export default function SuperAdminLogout() {
  const { colors } = useTheme()
  const { logout } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [prompted, setPrompted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogout = useCallback(async () => {
    setLoading(true)
    try {
      await logout()
      router.replace('/login')
    } catch (err: any) {
      setError(err?.message || 'Failed to logout')
    } finally {
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    if (prompted) return
    setPrompted(true)
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => router.replace('/superadmin/orders'),
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: handleLogout,
        },
      ],
      { cancelable: false }
    )
  }, [prompted, handleLogout])

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={styles.headerArea}>
        <Header title="Logging out" />
      </View>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.message, { color: colors.text }]}>
          {error ? error : loading ? 'Signing you out...' : 'Ready to sign you out.'}
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
  headerArea: {
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  message: {
    marginTop: 16,
    fontFamily: 'regular',
    fontSize: 16,
    textAlign: 'center',
  },
})
