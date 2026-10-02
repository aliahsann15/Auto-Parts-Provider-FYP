import React from 'react';
import { View, StyleSheet, Dimensions, ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import Swiper from 'react-native-swiper';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

interface AutoSliderProps {
  images: ImageSourcePropType[];
}

const SCREEN_WIDTH = Dimensions.get('window').width;

const AutoSlider: React.FC<AutoSliderProps> = ({ images }) => {
  const { dark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }]}>
      <Swiper
        showsButtons={false}
        loop={false}
        autoplay={false}
        paginationStyle={styles.pagination}
        dotStyle={styles.dot}
        activeDotStyle={[styles.dot, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
        activeDotColor={COLORS.primary}
        dotColor="transparent"
        containerStyle={styles.swiper}
      >
        {images.map((image, index) => {
          const key =
            typeof image === 'number'
              ? `local-${image}-${index}`
              : typeof image === 'object' && 'uri' in image && image.uri
              ? `${image.uri}-${index}`
              : `slide-${index}`;

          return (
            <View key={key} style={styles.slide}>
              <Image
                source={image}
                style={styles.image}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            </View>
          );
        })}
      </Swiper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    width: SCREEN_WIDTH -31,
    height: SIZES.width * 0.9,
    marginBottom: 16,
  },
  swiper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  slide: {
    width: SCREEN_WIDTH -31,
    height: SIZES.width * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: SCREEN_WIDTH -31,
    height: SIZES.width * 0.9,
  },
  pagination: {
    bottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.black,
    backgroundColor: 'transparent',
  },
});

export default React.memo(AutoSlider);
