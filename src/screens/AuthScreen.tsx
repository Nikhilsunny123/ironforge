import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { AnimatedPressable } from '../components/common/AnimatedPressable';

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, signInWithGoogle, continueAsGuest, isLoading, error } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setValidationError(null);
    if (!email.trim() || !password.trim()) {
      setValidationError('Please fill in all fields.');
      return;
    }
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
    } catch (err: any) {
      // Handled by store
    }
  };

  const handleGoogleSignIn = async () => {
    setValidationError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      // Handled by store
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="px-6 py-8 justify-between"
        >
          {/* Top Branding Section */}
          <View className="items-center mt-8 mb-6">
            <View className="bg-brand/10 p-4 rounded-full border border-brand/20 mb-4">
              <Ionicons name="barbell" size={48} color="#ea580c" />
            </View>
            <Text className="text-dark-text text-3xl font-black tracking-tighter">
              IRON<Text className="text-brand">FORGE</Text>
            </Text>
            <Text className="text-dark-muted text-sm mt-1">
              Forging strength through data
            </Text>
          </View>

          {/* Form Container */}
          <View className="bg-dark-card border border-dark-border rounded-3xl p-6 mb-6">
            {/* Toggle State (Login / Register) */}
            <View className="flex-row bg-dark-bg p-1 rounded-2xl border border-dark-border mb-6">
              <AnimatedPressable
                onPress={() => {
                  setIsLogin(true);
                  setValidationError(null);
                }}
                className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
                  isLogin ? 'bg-brand' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isLogin ? 'text-dark-text' : 'text-dark-muted'
                  }`}
                >
                  Login
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  setIsLogin(false);
                  setValidationError(null);
                }}
                className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
                  !isLogin ? 'bg-brand' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    !isLogin ? 'text-dark-text' : 'text-dark-muted'
                  }`}
                >
                  Create Account
                </Text>
              </AnimatedPressable>
            </View>

            {/* Error Message */}
            {(error || validationError) && (
              <View className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl mb-4 flex-row items-center">
                <Ionicons name="alert-circle" size={18} color="#ef4444" className="mr-2" />
                <Text className="text-red-500 text-xs font-semibold flex-1">
                  {validationError || error}
                </Text>
              </View>
            )}

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-dark-text text-xs font-semibold mb-1.5 ml-1">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#71717a"
                autoCapitalize="none"
                keyboardType="email-address"
                className="bg-dark-bg border border-dark-border text-dark-text rounded-xl px-4 py-3 text-sm font-semibold"
              />
            </View>

            {/* Password Input */}
            <View className="mb-6">
              <Text className="text-dark-text text-xs font-semibold mb-1.5 ml-1">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#71717a"
                secureTextEntry
                autoCapitalize="none"
                className="bg-dark-bg border border-dark-border text-dark-text rounded-xl px-4 py-3 text-sm font-semibold"
              />
            </View>

            {/* Submit Button */}
            <AnimatedPressable
              onPress={handleSubmit}
              disabled={isLoading}
              className="bg-brand py-3.5 rounded-2xl items-center justify-center flex-row"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#f4f4f5" />
              ) : (
                <Text className="text-dark-text font-bold text-sm">
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </Text>
              )}
            </AnimatedPressable>
          </View>

          {/* Social Sign-In & Guest Controls */}
          <View className="items-center gap-4">
            <View className="flex-row items-center w-full my-1">
              <View className="flex-1 h-[1px] bg-dark-border" />
              <Text className="text-dark-muted text-xs mx-4">or</Text>
              <View className="flex-1 h-[1px] bg-dark-border" />
            </View>

            {/* Google Sign In */}
            <AnimatedPressable
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-dark-card border border-dark-border py-3 rounded-2xl flex-row items-center justify-center"
            >
              <Ionicons name="logo-google" size={16} color="#f4f4f5" className="mr-2.5" />
              <Text className="text-dark-text font-semibold text-xs">
                Continue with Google
              </Text>
            </AnimatedPressable>

            {/* Continue as Guest */}
            <View className="w-full items-center mt-2">
              <AnimatedPressable
                onPress={continueAsGuest}
                disabled={isLoading}
                className="py-2.5 rounded-2xl items-center justify-center"
              >
                <Text className="text-brand font-bold text-xs uppercase tracking-wider">
                  Continue as Guest
                </Text>
              </AnimatedPressable>
              <Text className="text-dark-muted text-[10px] mt-1 text-center">
                Track workouts offline, sync later
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
