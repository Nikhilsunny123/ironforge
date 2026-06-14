import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getVariantClasses = () => {
    if (disabled) return 'bg-zinc-800 border-zinc-700 opacity-50';
    switch (variant) {
      case 'primary':
        return 'bg-brand border-brand';
      case 'secondary':
        return 'bg-dark-card border-dark-border border';
      case 'danger':
        return 'bg-red-600 border-red-600';
      case 'outline':
        return 'bg-transparent border-brand border';
      case 'ghost':
        return 'bg-transparent border-transparent';
      default:
        return 'bg-brand border-brand';
    }
  };

  const getVariantTextClasses = () => {
    if (disabled) return 'text-zinc-500';
    switch (variant) {
      case 'primary':
      case 'danger':
        return 'text-dark-text font-bold';
      case 'secondary':
        return 'text-dark-text font-semibold';
      case 'outline':
        return 'text-brand font-semibold';
      case 'ghost':
        return 'text-dark-muted font-medium';
      default:
        return 'text-dark-text font-bold';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 rounded-lg text-xs';
      case 'md':
        return 'px-4 py-2.5 rounded-xl text-sm';
      case 'lg':
        return 'px-6 py-3.5 rounded-2xl text-base';
      default:
        return 'px-4 py-2.5 rounded-xl text-sm';
    }
  };

  const isBtnDisabled = disabled || loading;

  return (
    <Pressable
      onPress={isBtnDisabled ? undefined : onPress}
      disabled={isBtnDisabled}
      style={({ pressed }) => [
        style,
        {
          transform: [{ scale: pressed && !isBtnDisabled ? 0.97 : 1 }],
        },
      ]}
      className={`flex-row items-center justify-center border ${getVariantClasses()} ${getSizeClasses()}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#f4f4f5" className="mr-2" />
      ) : icon ? (
        <React.Fragment>
          {icon}
          <Text className={`ml-2 text-center ${getVariantTextClasses()}`} style={textStyle}>
            {title}
          </Text>
        </React.Fragment>
      ) : (
        <Text className={`text-center ${getVariantTextClasses()}`} style={textStyle}>
          {title}
        </Text>
      )}
    </Pressable>
  );
};
