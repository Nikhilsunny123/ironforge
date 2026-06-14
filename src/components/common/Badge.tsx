import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'gray';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  style,
  textStyle,
  icon,
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-brand/20 border-brand/40 text-brand';
      case 'secondary':
        return 'bg-indigo-900/30 border-indigo-500/40 text-indigo-400';
      case 'success':
        return 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400';
      case 'warning':
        return 'bg-amber-950/40 border-amber-500/40 text-amber-400';
      case 'danger':
        return 'bg-red-950/40 border-red-500/40 text-red-400';
      case 'gray':
      default:
        return 'bg-zinc-800 border-zinc-700 text-dark-muted';
    }
  };

  return (
    <View
      style={style}
      className={`flex-row items-center border rounded-full px-2.5 py-0.5 self-start ${getVariantClasses()}`}
    >
      {icon && <View className="mr-1">{icon}</View>}
      <Text className="text-xs font-semibold tracking-wide uppercase" style={textStyle}>
        {label}
      </Text>
    </View>
  );
};
