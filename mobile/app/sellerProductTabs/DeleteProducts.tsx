import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { SIZES, COLORS } from '../../constants';
import { useTheme } from '../../theme/ThemeProvider';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation, useFocusEffect } from 'expo-router';
import RBSheet from 'react-native-raw-bottom-sheet';
import Button from '@/components/Button';
import ButtonFilled from '@/components/ButtonFilled';
import { useAuth } from '../context/AuthContext';
import { deleteProductAuth, fetchMyProducts, Product, restoreProductAuth } from '@/utils/api/products';

type SortKey = 'recent' | 'mostSold' | 'topRated' | 'priceHigh' | 'priceLow';

type ProductListProps = {
  refreshKey?: number;
  onChange?: () => void;
  sortKey?: SortKey;
  searchTerm?: string;
};

const getEffectivePrice = (p: Product) => {
  const sale = typeof p.salePrice === 'number' ? p.salePrice : undefined;
  if (sale !== undefined && sale < (p.price || 0)) return sale;
  return p.price || 0;
};

const applySort = (list: Product[], sortKey: SortKey = 'recent') => {
  const items = [...list];
  switch (sortKey) {
    case 'mostSold':
      return items.sort((a, b) => ((b as any)?.itemsSold ?? 0) - ((a as any)?.itemsSold ?? 0));
    case 'topRated':
      return items.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    case 'priceHigh':
      return items.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    case 'priceLow':
      return items.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    case 'recent':
    default:
      return items.sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }
};

const DeletedProducts = ({ refreshKey = 0, onChange, sortKey = 'recent', searchTerm = '' }: ProductListProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { dark } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
 const refRBSheet = useRef<any>(null);
 const restoreSheet = useRef<any>(null);
 const { token } = useAuth();
 const [selectedId, setSelectedId] = useState<string | null>(null);

 const loadProducts = useCallback(async () => {
   if (!token) {
     setLoading(false);
     return;
   }
   setLoading(true);
   try {
     const res = await fetchMyProducts(token, { limit: 200, status: 'deleted' });
     setProducts(applySort(res.products || [], sortKey));
   } catch (err: any) {
     Alert.alert('Load failed', err?.message || 'Could not load products');
   } finally {
     setLoading(false);
   }
 }, [token, sortKey]);

 useEffect(() => {
   loadProducts();
 }, [loadProducts, refreshKey]);

 useFocusEffect(
   useCallback(() => {
     loadProducts();
     return () => {};
   }, [loadProducts])
 );

 const confirmPermanent = (id: string) => {
   setSelectedId(id);
   refRBSheet.current?.open();
 };

 const confirmRestore = (id: string) => {
   setSelectedId(id);
   restoreSheet.current?.open();
 };

 const handlePermanent = async () => {
   if (!token || !selectedId) return;
   try {
     await deleteProductAuth(selectedId, token, true);
     setProducts(prev => prev.filter(p => p._id !== selectedId));
     refRBSheet.current?.close();
     onChange?.();
   } catch (err: any) {
     Alert.alert('Delete failed', err?.message || 'Could not delete product');
   }
 };

 const handleRestore = async () => {
   if (!token || !selectedId) return;
   try {
     await restoreProductAuth(selectedId, token, 'draft');
     setProducts(prev => prev.filter(p => p._id !== selectedId));
     restoreSheet.current?.close();
     onChange?.();
   } catch (err: any) {
     Alert.alert('Restore failed', err?.message || 'Could not restore product');
   }
 };
 return (
    <View style={[styles.container, {
      backgroundColor: dark ? COLORS.dark1 : COLORS.white
    }]}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={dark ? COLORS.white : COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={products.filter(p => {
            const term = searchTerm.trim().toLowerCase();
            if (!term) return true;
            const name = (p.name || '').toLowerCase();
            return name.includes(term);
          })}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 24, color: dark ? COLORS.gray3 : COLORS.gray }}>
              No products found.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.cardContainer, {
              backgroundColor: dark ? COLORS.dark2 : COLORS.white,
            }]}>

            <View style={styles.detailsContainer}>
              <View style={styles.productImageContainer}>
                <Image
                  source={{ uri: item.images?.[0] || '' }}
                  resizeMode='cover'
                  style={styles.productImage}
                />
              </View>
              <View style={styles.detailsRightContainer}>
                <Text style={[styles.name, {
                  color: dark ? COLORS.secondaryWhite : COLORS.greyscale900
                }]}>{item.name}</Text>

            <View style={[styles.rightSecondContainer, {
                  
                }]}>
                 <View style={[styles.InventoryContainer, {
                  
                }]}>
              <Text style={styles.InventoryText}>In Stock ({item.stock})</Text>
                </View>
             </View>
                <View style={styles.priceContainer}>
                  <View style={styles.priceItemContainer}>
                    {typeof item.salePrice === 'number' && item.salePrice < item.price ? (
                      <>
                        <Text style={[styles.salePrice, { color: dark ? COLORS.white : COLORS.primary }]}>
                          PKR {item.salePrice}
                        </Text>
                        <Text style={styles.strikePrice}>PKR {item.price}</Text>
                      </>
                    ) : (
                      <Text style={[styles.totalPrice, {
                        color: dark ? COLORS.white : COLORS.primary,
                      }]}>PKR {item.price}</Text>
                    )}
                  </View>
                 
                </View>
              </View>
            </View>
            <View style={[styles.separateLine, {
              marginVertical: 10,
              backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
            }]} />
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                   onPress={() => confirmRestore(item._id)}
                style={[styles.receiptBtn, { backgroundColor: COLORS.primary }]}>
                <Text style={[styles.receiptBtnText,{color:COLORS.white}]}>Restore</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmPermanent(item._id)}
                style={[styles.receiptBtn, { backgroundColor: COLORS.white }]}>
                <Text style={[styles.receiptBtnText, {color: COLORS.primary}]}>Delete Permanently</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          )}
        />
      )}
       <RBSheet
       ref={refRBSheet}
       closeOnPressMask={true}
       height={230}
       customStyles={{
         wrapper: {
           backgroundColor: "rgba(0,0,0,0.5)",
         },
         draggableIcon: {
           backgroundColor: dark ? COLORS.greyscale300 : COLORS.greyscale300,
         },
         container: {
           borderTopRightRadius: 32,
           borderTopLeftRadius: 32,
           height: 230,
           backgroundColor: dark ? COLORS.dark2 : COLORS.white,
           alignItems: "center",
           width: "100%"
         }
       }}>
       <Text style={[styles.bottomSubtitle, {
         color: dark ? COLORS.red : COLORS.red
       }]}>Delete Product</Text>
       <View style={[styles.separateLine, {
         backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
       }]} />

       <View style={styles.selectedCancelContainer}>
         <Text style={[styles.cancelTitle, {
           color: dark ? COLORS.secondaryWhite : COLORS.greyscale900
         }]}>Are you sure you want to delete this product permenantly?</Text>
       
       </View>

       <View style={styles.bottomContainer}>
         <Button
           title="Cancel"
           style={{
             width: (SIZES.width - 32) / 2 - 8,
             backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
             borderRadius: 32,
             borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary
           }}
           textColor={dark ? COLORS.white : COLORS.primary}
           onPress={() => refRBSheet.current.close()}
         />
        <ButtonFilled
          title="Yes, Delete"
          style={[styles.removeButton, { backgroundColor: COLORS.black, borderColor: COLORS.black }]}
          textColor={COLORS.white}
          fontFamily="semiBold"
          fontSize={18}
          onPress={handlePermanent}
        />
       </View>
     </RBSheet>
     <RBSheet
       ref={restoreSheet}
       closeOnPressMask={true}
       height={230}
       customStyles={{
         wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
         draggableIcon: { backgroundColor: dark ? COLORS.greyscale300 : COLORS.greyscale300 },
         container: {
           borderTopRightRadius: 32,
           borderTopLeftRadius: 32,
           height: 230,
           backgroundColor: dark ? COLORS.dark2 : COLORS.white,
           alignItems: "center",
           width: "100%"
         }
       }}>
       <Text style={[styles.bottomSubtitle, { color: dark ? COLORS.black : COLORS.black }]}>Restore Product</Text>
       <View style={[styles.separateLine, { backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }]} />
       <View style={styles.selectedCancelContainer}>
         <Text style={[styles.cancelTitle, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>Restore this product to Draft?</Text>
       </View>
       <View style={styles.bottomContainer}>
         <Button
           title="Cancel"
           style={{
             width: (SIZES.width - 32) / 2 - 8,
             backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
             borderRadius: 32,
             borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary
           }}
           textColor={dark ? COLORS.white : COLORS.primary}
           onPress={() => restoreSheet.current.close()}
         />
        <ButtonFilled
          title="Yes, Restore"
          style={[styles.removeButton, { backgroundColor: COLORS.black, borderColor: COLORS.black }]}
          textColor={COLORS.white}
          fontFamily="semiBold"
          fontSize={18}
          onPress={handleRestore}
        />
       </View>
     </RBSheet>
    </View>
  )
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    marginVertical: 22
  },
  cardContainer: {
  
    width: SIZES.width - 32,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.greyscale300,
    marginBottom: 20
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.greyscale900
  },
  InventoryContainer: {
  padding: 5,

    alignItems: "center",
    justifyContent: "center",
  
    flexDirection: 'row',
   
        height: 24,
       
        borderRadius: 4,
        backgroundColor: COLORS.silver
   
  },
  InventoryText: {
  fontSize: 12,

 
    color: COLORS.primary,
    fontFamily: "medium",
  },
  separateLine: {
    width: "100%",
    height: .7,
    backgroundColor: COLORS.greyScale800,
    marginVertical: 12
  },
  detailsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start"
  },
  productImageContainer: {
    width: 90,
    height: 90,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: COLORS.grayscale200,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  detailsRightContainer: {
    flex: 1,
    marginLeft: 0
  },
  name: {
    fontSize: 17,
    fontFamily: "bold",
    color: COLORS.greyscale900
  },
  address: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    marginVertical: 6
  },
  serviceTitle: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
  },
  serviceText: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: "medium",
    marginTop: 6
  },
  cancelBtn: {
    width: (SIZES.width - 32) / 2 - 16,
    height: 36,
    borderRadius: 24,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    borderColor: COLORS.primary,
    borderWidth: 1.4,
    marginBottom: 12
  },
  cancelBtnText: {
    fontSize: 16,
    fontFamily: "semiBold",
    color: COLORS.primary,
  },
  receiptBtn: {
    width: '49%',
    height: 36,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    borderColor: COLORS.primary,
    borderWidth: 1.4,
    marginBottom: 12
  },
  receiptBtnText: {
    fontSize: 16,
    fontFamily: "semiBold",
    color: COLORS.white,
  },
  loader: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  remindMeText: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    marginVertical: 4
  },
  switch: {
    marginLeft: 8,
    transform: [{ scaleX: .8 }, { scaleY: .8 }], // Adjust the size of the switch
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
    paddingHorizontal: 16,
    width: "100%"
  },
  cancelButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.tansparentPrimary,
    borderRadius: 32
  },
  removeButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.primary,
    borderRadius: 32
  },
  bottomTitle: {
    fontSize: 24,
    fontFamily: "semiBold",
    color: "red",
    textAlign: "center",
  },
  bottomSubtitle: {
    fontSize: 22,
    fontFamily: "bold",
    color: COLORS.greyscale900,
    textAlign: "center",
    marginTop: 12
  },
  selectedCancelContainer: {
    marginVertical: 12,
    paddingHorizontal: 36,
    width: "100%"
  },
  cancelTitle: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    textAlign: "center",
  },
  cancelSubtitle: {
    fontSize: 14,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    textAlign: "center",
    marginVertical: 8,
    marginTop: 16
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    
  },
  totalPrice: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.primary,
    textAlign: "center",
  },
  duration: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    textAlign: "center",
  },
  priceItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,

  },
  salePrice: {
    fontSize: 18,
    fontFamily: 'bold',
    marginRight: 8,
  },
  strikePrice: {
    fontSize: 14,
    fontFamily: 'regular',
    color: COLORS.gray,
    textDecorationLine: 'line-through',
  },
  rightSecondContainer: {
   flexDirection: 'row',
   alignItems: 'center',
   justifyContent: 'flex-start',
   gap: 10,
   marginVertical: 5
  },
  rating2: {
    fontSize: 12,
    fontFamily: "semiBold",
    color: COLORS.white,
    marginLeft: 4
  },


})

export default DeletedProducts
