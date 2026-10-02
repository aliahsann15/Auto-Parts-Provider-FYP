import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '@/constants';

type StarRatingProps = {
  rating: number;
  size?: number;
  colorFilled?: string;
  colorEmpty?: string;
  spacing?: number;
  style?: ViewStyle;
};

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 14,
  colorFilled = COLORS.primary,
  colorEmpty = COLORS.grayscale400,
  spacing = 2,
  style,
}) => {
  const safeRating = Math.max(0, Math.min(5, rating || 0));
  const totalWidth = size * 5 + spacing * 4;
  const fillWidth = (safeRating / 5) * totalWidth;

  const StarsRow = ({ color }: { color: string }) => (
    <View style={[styles.row, { columnGap: spacing }]}>
      {[...Array(5)].map((_, idx) => (
        <FontAwesome key={idx} name="star" size={size} color={color} />
      ))}
    </View>
  );

  return (
    <View style={[{ width: totalWidth, height: size }, style]}>
      <StarsRow color={colorEmpty} />
      <View style={[styles.fill, { width: fillWidth }]} pointerEvents="none">
        <StarsRow color={colorFilled} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fill: {
    position: 'absolute',
    overflow: 'hidden',
    top: 0,
    left: 0,
  },
});

export default StarRating;
