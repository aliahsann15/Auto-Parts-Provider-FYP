declare module 'react-native-swiper' {
  import { ComponentType } from 'react';

  interface SwiperProps {
    showsButtons?: boolean;
    loop?: boolean;
    autoplay?: boolean;
    paginationStyle?: any;
    dotStyle?: any;
    activeDotStyle?: any;
    activeDotColor?: string;
    dotColor?: string;
    containerStyle?: any;
    children?: React.ReactNode;
  }

  const Swiper: ComponentType<SwiperProps>;
  export default Swiper;
}
