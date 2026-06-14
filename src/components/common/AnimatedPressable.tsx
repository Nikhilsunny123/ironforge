import React, { useRef } from 'react';
import { Pressable, Animated, ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';

interface AnimatedPressableProps {
  onPress?: (event: GestureResponderEvent) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  disabled?: boolean;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  onPress,
  children,
  style,
  className,
  disabled = false,
  ...props
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1.0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

  return (
    <AnimatedPressableComponent
      onPress={onPress}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        style,
        {
          transform: [{ scale }],
        },
      ] as any}
      className={className}
      {...props}
    >
      {children}
    </AnimatedPressableComponent>
  );
};
