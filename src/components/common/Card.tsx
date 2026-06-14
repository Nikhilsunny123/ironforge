import React from 'react';
import { View, Text, Pressable, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  style?: ViewStyle;
  headerRight?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  onPress,
  style,
  headerRight,
  className = '',
}) => {
  const Container = onPress ? Pressable : View;
  
  return (
    <Container
      onPress={onPress}
      style={({ pressed }: any) => [
        style,
        onPress && { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
      className={`bg-dark-card border border-dark-border rounded-2xl p-4 mb-4 ${className}`}
    >
      {(title || subtitle || headerRight) && (
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-2">
            {title && (
              <Text className="text-dark-text font-bold text-base tracking-tight">
                {title}
              </Text>
            )}
            {subtitle && (
              <Text className="text-dark-muted text-xs mt-0.5">
                {subtitle}
              </Text>
            )}
          </View>
          {headerRight && <View>{headerRight}</View>}
        </View>
      )}
      <View>{children}</View>
    </Container>
  );
};
