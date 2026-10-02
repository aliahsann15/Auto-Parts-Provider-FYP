import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SIZES, COLORS, icons } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import { useNavigation } from 'expo-router';

interface HeaderProps {
  title: string;
  onBackPress?: () => void;
  renderRight?: () => React.ReactNode;
  rightIcon?: any;
  onRightPress?: () => void;
  titleIcon?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  title,
  onBackPress,
  renderRight,
  rightIcon,
  onRightPress,
  titleIcon,
}) => {
  const navigation = useNavigation();
  const { colors, dark } = useTheme();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if ((navigation as any)?.canGoBack?.()) {
      (navigation as any).goBack();
    } else {
      (navigation as any)?.navigate?.('(tabs)');
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: dark ? COLORS.dark1 : COLORS.white },
      ]}
    >
      <View style={styles.leftWrap}>
        <TouchableOpacity onPress={handleBack}>
          <Image
            source={icons.back}
            resizeMode="contain"
            style={[
              styles.backIcon,
              { tintColor: colors.text },
            ]}
          />
        </TouchableOpacity>
        {titleIcon ? <View style={styles.iconWrap}>{titleIcon}</View> : null}
        <Text style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      <View style={styles.rightWrap}>
        {renderRight
          ? renderRight()
          : rightIcon ? (
            <TouchableOpacity onPress={onRightPress}>
              <Image source={rightIcon} style={[styles.rightIcon, { tintColor: colors.text }]} />
            </TouchableOpacity>
          ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    width: SIZES.width - 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  leftWrap: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  rightWrap: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 16,
  },
  rightIcon: {
    width: 20,
    height: 20
  },
  title: {
    fontSize: 22,
    fontFamily: 'bold',
    color: COLORS.black,
  },
  iconWrap: {
    marginRight: 8,
  },
});

export default Header;
