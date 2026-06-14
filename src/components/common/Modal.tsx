import React from 'react';
import { Modal as RNModal, View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button } from './Button';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  footer,
}) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/85 px-4">
        <Pressable className="absolute inset-0" onPress={onClose} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="w-full max-w-md bg-dark-card border border-dark-border rounded-3xl overflow-hidden shadow-2xl"
        >
          {title && (
            <View className="border-b border-dark-border px-6 py-4 flex-row justify-between items-center bg-zinc-900/50">
              <Text className="text-dark-text font-bold text-lg">{title}</Text>
              <Pressable onPress={onClose} className="p-1 rounded-full bg-zinc-800 active:bg-zinc-700">
                <Text className="text-dark-muted font-bold text-sm px-1.5 py-0.5">X</Text>
              </Pressable>
            </View>
          )}

          <ScrollView className="max-h-[70vh] p-6">
            {children}
          </ScrollView>

          {footer ? (
            <View className="border-t border-dark-border p-4 bg-zinc-900/50 flex-row justify-end gap-2">
              {footer}
            </View>
          ) : (
            <View className="border-t border-dark-border p-4 bg-zinc-900/50">
              <Button title="Close" variant="secondary" onPress={onClose} size="sm" />
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
};
