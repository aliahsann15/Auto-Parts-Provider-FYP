import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Share } from 'react-native';
import React, { useMemo, useCallback, useState } from 'react';
import { COLORS, SIZES, icons, images } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-virtualized-view';
import Barcode from '@kichiyaki/react-native-barcode-generator';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme/ThemeProvider';
import { NavigationProp } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { API_BASE_URL } from '@/utils/api/client';
import { useAuth } from './context/AuthContext';
import { useSellerContact } from '@/hooks/useSellerContact';
import { SellerContactInfo, getPrimarySellerIdFromItems } from '@/utils/seller';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';

const getOrderItemDisplayName = (item: any) => {
  const snapshot = item.productSnapshot || {};
  const product = item.product || {};
  const make = snapshot.make || product.make;
  const model = snapshot.carModel || product.carModel || snapshot.carName || product.carName;
  const variant = snapshot.variant || product.variant;
  const year = snapshot.year || product.year;
  const partName =
    snapshot.partName ||
    snapshot.productName ||
    product.partName ||
    product.productName ||
    snapshot.name ||
    product.name;
  const detailSegments = [make, model, variant, year, partName].filter(Boolean);
  return detailSegments.join(' ').trim() || 'Product';
};

const formatBarcodeValue = (value?: string) => {
  const digits = (value ?? '').replace(/\D/g, '');
  const normalized = digits.slice(-12).padStart(12, '0');
  const sum = normalized.split('').reduce((acc, char, idx) => {
    const num = Number(char) || 0;
    // even index (0-based) uses multiplier 1, odd uses 3 (per EAN-13 specification)
    return acc + num * (idx % 2 === 0 ? 1 : 3);
  }, 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${normalized}${checkDigit}`;
};

const DEFAULT_SELLER_CONTACT: SellerContactInfo = {
  storeName: '—',
  email: '—',
  phone: '—',
  address: '—',
};

// Transaction ereceipt
const ProductEReceipt = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const params = useLocalSearchParams<{ id?: string; data?: string; orderNumber?: string }>();
    const { colors, dark } = useTheme();
    const { user, token } = useAuth();
    const isSuperAdmin = (user?.role || '').toLowerCase() === 'superadmin';
    const [downloading, setDownloading] = useState(false);
    const orderData = useMemo(() => {
        if (params.data) {
            try {
                return JSON.parse(params.data as string);
            } catch { }
        }
        return null;
    }, [params.data]);

    const raw = orderData?.raw || orderData || {};
    const orderId = raw.id || raw._id || '---';
    const storedOrderNumber = raw.orderNumber ? `${raw.orderNumber}` : undefined;
    const orderNumber = params.orderNumber || storedOrderNumber || (orderId ? `${String(orderId).slice(-6).toUpperCase()}` : '---');
    const isSellerView = (user?.role || '').toLowerCase() === 'seller';
    const sellerId = (user as any)?._id || (user as any)?.userId || user?.id;
    const itemsAll = Array.isArray(raw.items) ? raw.items : [];
    const orderSellerId = getPrimarySellerIdFromItems(itemsAll);
    const sellerContact = useSellerContact(orderSellerId, token || undefined);
    const sellerDetails = orderSellerId ? sellerContact || DEFAULT_SELLER_CONTACT : null;
    const showStoreInfo = isSuperAdmin && Boolean(sellerDetails);
    let items = isSellerView
        ? itemsAll.filter((it: any) => {
            const sellerFromItem = it?.seller?.toString?.();
            const sellerFromProduct = it?.product?.seller?.toString?.();
            return (sellerFromItem && sellerId && sellerFromItem === sellerId) ||
                (sellerFromProduct && sellerId && sellerFromProduct === sellerId);
        })
        : itemsAll;
    if (!items.length) {
        items = itemsAll;
    }
    const apiBase = API_BASE_URL.replace(/\/api$/, '');

    const subtotal = items.reduce((sum: number, it: any) => {
        const p = it?.product || {};
        const unit = typeof it?.salePrice === 'number' ? it.salePrice : (typeof it?.price === 'number' ? it.price : p.price || 0);
        const qty = Math.max(1, Number(it?.quantity || 1));
        return sum + unit * qty;
    }, 0);
    const shippingFee = (() => {
        if (isSellerView && sellerId && raw.sellerShipping) {
            return raw.sellerShipping?.[sellerId] || 0;
        }
        if (typeof raw.shippingFee === 'number') return raw.shippingFee;
        if (raw.sellerShipping) {
            return Object.values(raw.sellerShipping).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
        }
        return 0;
    })();
    const inspectionFee = raw.autoPartsInspection && isSellerView ? 0 : Number(raw.inspectionFee || 0);
    const total = subtotal + shippingFee + inspectionFee;
    const address =
        raw.shippingAddress?.street ||
        raw.address ||
        '';
    const firstItem = items[0];
    const product = firstItem?.product || {};
    const logoUri = Image.resolveAssetSource(images.logo).uri;

    const handleCopyToClipboard = useCallback(async () => {
        await Clipboard.setStringAsync(orderNumber);
        Alert.alert('Copied!', 'Order number copied to clipboard.');
    }, [orderNumber]);

    const autoPartsProviderCustomer = {
        name: "Auto Parts Providers",
        email: "info@autopartsprovider.com",
        phoneNumber: "03039245137",
        address: "Office 9,10 Commercial Market, Eden Executive, 204 Chak Road, Canal Road Faisalabad"
    };
    const isInspectionOrderForSeller = isSellerView && Boolean(raw.autoPartsInspection);
    const actualCustomerInfo = {
        name: `${raw.customer?.name || `${raw.customer?.firstName || ''} ${raw.customer?.lastName || ''}`.trim() || 'N/A'}`,
        email: raw.customer?.email || 'N/A',
        phoneNumber: raw.customer?.phoneNumber || 'N/A',
        address: address || 'N/A'
    };
    const leftCustomerInfo = isInspectionOrderForSeller ? autoPartsProviderCustomer : actualCustomerInfo;
    const rightCustomerInfo = isInspectionOrderForSeller ? null : actualCustomerInfo;
    const displayCustomerForUI = leftCustomerInfo;

    const itemsHtml = items.map((it: any) => {
        const name = getOrderItemDisplayName(it);
        const qty = Math.max(1, Number(it?.quantity || 1));
        const unit = typeof it?.salePrice === 'number' ? it.salePrice : (typeof it?.price === 'number' ? it.price : (it?.product?.price || 0));
        return `
            <tr>
                <td>${name}</td>
                <td style="text-align:center;">${qty}</td>
                <td style="text-align:right;">PKR ${unit.toFixed(2)}</td>
                <td style="text-align:right;">PKR ${(unit * qty).toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>E-Receipt</title>
                <style>
                    body { font-family: 'Helvetica', Arial, sans-serif; padding: 0; background-color: #ffffff; }
                    .page { max-width: 720px;  background: #fff; padding-inline: 32px; padding-top: 20px; padding-bottom: 20px; border-radius: 24px; display:flex; flex-direction:column; min-height:930px; }
                    .logo-section { text-align: center; margin-bottom: 24px; }
                    .logo-section img { max-height: 70px; margin-bottom: 8px; }
                    .logo-section h1 { font-size: 22px; margin: 0; letter-spacing: 1px; }
                    .tagline { letter-spacing: 2px; text-transform: uppercase; font-size: 12px; color: #000; margin-top: 4px; }
                    .summary-card, .details-card, .section-card, .terms-card { border: 1px solid #dcdcdc; border-radius: 18px; padding: 18px; margin-bottom: 20px; background: #fafafa; }
                    .heading-center { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; text-align: center; margin-bottom: 12px; color: #000; }
                    .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #000; }
                    .summary-row span:first-child { font-weight: bold; color: #000; }
                    .customer-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
                    .customer-row span:first-child { font-weight: bold; color: #000; }
                    .customer-row .label { width: 150px; color: #000; }
                    .customer-row .value { flex: 1; text-align: right; }
                    .customer-row .value.faded { font-weight: 400; opacity: 0.7; }
                    .customer-row .value.strong { font-weight: 600; }
                    .barcode { text-align: center; margin: 20px 0; }
                    .barcode svg { width: 320px; height: 80px; }
                    .barcode-code { font-size: 18px; letter-spacing: 2px; color: #000; }
                    table { width: 100%; border-collapse: collapse; border: 1px solid #dcdcdc; border-radius: 14px; overflow: hidden; }
                    th, td { padding: 10px 8px; border-bottom: 1px solid #dcdcdc; }
                    th { background: #fafafa; color: #000; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
                    td { font-size: 12px; color: #000; }
                    tbody tr:last-child td { border-bottom: none; }
                    .total-row td { border-top: 1px solid #dcdcdc; font-weight: 700; }
                    .footer { margin-top: auto; font-size: 12px; color: #000; text-align: center; }
                </style>
        </head>
        <body>
            <div class="page">
                <div class="logo-section">
                    <img src="${logoUri}" alt="logo" />
                    <h1>Auto Parts Providers</h1>
                    <div class="tagline">E-Receipt</div>
                </div>
                <div class="summary-card">
                    <div class="heading-center">Order Details</div>
                    <div class="summary-row black-text">
                        <span>Order Number</span>
                        <span>#${orderNumber}</span>
                    </div>
                    <div class="summary-row black-text">
                        <span>Date</span>
                        <span>${raw.createdAt ? new Date(raw.createdAt).toLocaleDateString() : '--'}</span>
                    </div>
                    <div class="summary-row black-text">
                        <span>Status</span>
                        <span>${raw.status || 'Completed'}</span>
                    </div>
                </div>
                <div class="details-card">
                    <div class="heading-center">Customer Details</div>
                    <div class="customer-row">
                        <span class="label">Customer Name</span>
                        <span class="value ">${leftCustomerInfo.name}</span>
                    </div>
                    <div class="customer-row">
                        <span class="label">Email</span>
                        <span class="value ">${leftCustomerInfo.email}</span>
                    </div>
                    <div class="customer-row">
                        <span class="label">Phone</span>
                        <span class="value ">${leftCustomerInfo.phoneNumber}</span>
                    </div>
                    <div class="customer-row">
                        <span class="label">Address</span>
                        <span class="value ">${leftCustomerInfo.address}</span>
                    </div>
                </div>
                ${showStoreInfo ? `
                <div class="details-card">
                    <div class="heading-center">Seller Info</div>
                    <div class="customer-row">
                        <span class="label">Store Name</span>
                        <span class="value ">${sellerDetails?.storeName ?? '—'}</span>
                    </div>
                    <div class="customer-row">
                        <span class="label">Store Gmail</span>
                        <span class="value ">${sellerDetails?.email ?? '—'}</span>
                    </div>
                    <div class="customer-row">
                        <span class="label">Store Phone</span>
                        <span class="value ">${sellerDetails?.phone ?? '—'}</span>
                    </div>
                    <div class="customer-row">
                        <span class="label">Store Address</span>
                        <span class="value ">${sellerDetails?.address ?? '—'}</span>
                    </div>
                </div>
                ` : ''}
         
                <div class="section section-card">
                    <div class="heading-center">Items Details</div>
        <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th style="text-align:center;">Qty</th>
                                <th style="text-align:right;">Price</th>
                                <th style="text-align:right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                            <tr class="total-row">
                                <td></td>
                                <td></td>
                                <td style="text-align:right;">Subtotal</td>
                                <td style="text-align:right;">PKR ${subtotal.toFixed(2)}</td>
                            </tr>
                            <tr class="total-row">
                                <td></td>
                                <td></td>
                                <td style="text-align:right;">Shipping</td>
                                <td style="text-align:right;">PKR ${shippingFee.toFixed(2)}</td>
                            </tr>
                            ${inspectionFee > 0 ? `<tr class="total-row">
                                <td></td>
                                <td></td>
                                <td style="text-align:right;">Inspection</td>
                                <td style="text-align:right;">PKR ${inspectionFee.toFixed(2)}</td>
                            </tr>` : ''}
                            <tr class="total-row">
                                <td></td>
                                <td></td>
                                <td style="text-align:right;">Total</td>
                                <td style="text-align:right;">PKR ${total.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="footer black-text">
                    Thank you for choosing Auto Parts Providers. Contact support if you need help with this order.
                </div>
            </div>
        </body>
        </html>
    `;

    const handleDownloadPress = useCallback(async () => {
        if (downloading) return;
        setDownloading(true);
        try {
            const safeOrder = (orderNumber || '000000').replace(/[^a-zA-Z0-9_-]/g, '');
            const fileName = `Auto Parts Providers E-Receipt - ${safeOrder}.pdf`;
            const { uri } = await Print.printToFileAsync({ html });
            const cacheDest = `${FileSystem.cacheDirectory}${fileName}`;
            await FileSystem.copyAsync({ from: uri, to: cacheDest });
            await Share.share({
                url: cacheDest,
                title: 'E-Receipt',
            });
            await FileSystem.deleteAsync(cacheDest, { idempotent: true });
        } catch (err: any) {
            Alert.alert('Share failed', err?.message || 'Unable to share the E-Receipt.');
        } finally {
            setDownloading(false);
        }
    }, [html, orderNumber, downloading]);

    /**
    * Render header
    */
    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Image
                        source={icons.back}
                        resizeMode='contain'
                        style={[styles.backIcon, {
                            tintColor: COLORS.black
                        }]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>E-Receipt</Text>
            </View>
            <View style={styles.downloadRow}>
                <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadPress} disabled={downloading}>
                    <Image source={icons.download2} style={styles.downloadIcon} />
                    <Text style={styles.downloadBtnText}>Download E-Receipt</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {renderHeader()}
                <ScrollView
                    style={[styles.scrollView, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}
                    showsVerticalScrollIndicator={false}>
                    <View style={{ marginVertical: 22 }}>
                        <Barcode
                            format="EAN13"
                            value={formatBarcodeValue(orderNumber)}
                            text={orderNumber}
                            width={SIZES.width - 64}
                            height={72}
                            style={{
                                marginBottom: 40,
                                backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                            }}
                            lineColor={dark ? COLORS.white : COLORS.black}
                            textStyle={{
                                color: dark ? COLORS.white : COLORS.black
                            }}
                            maxWidth={SIZES.width - 64}
                        />
                        <View style={[styles.summaryContainer, {
                            borderRadius: 12,
                        }]}>
                        <View style={[styles.viewContainer, {}]}>
                            <Text style={styles.viewLeft}>Name</Text>
                            <Text style={[styles.viewRight, {
                                color: dark ? COLORS.white : COLORS.black
                            }]}>{leftCustomerInfo.name}</Text>
                        </View>
                         <View style={[styles.viewContainer, {width: "100%"}]}>
                            <Text style={styles.viewLeft}>Address</Text>
                            <Text style={[styles.viewRight, {
                                color: dark ? COLORS.white : COLORS.black, textAlign: 'right'
                            }]}>
                                {leftCustomerInfo.address}
                            </Text>
                        </View>
                        <View style={styles.viewContainer}>
                            <Text style={styles.viewLeft}>Phone</Text>
                            <Text style={[styles.viewRight, {
                                color: dark ? COLORS.white : COLORS.black
                            }]}>{leftCustomerInfo.phoneNumber}</Text>
                        </View>
                        <View style={styles.viewContainer}>
                            <Text style={styles.viewLeft}>Email</Text>
                            <Text style={[styles.viewRight, {
                                color: dark ? COLORS.white : COLORS.black
                            }]}>{leftCustomerInfo.email}</Text>
                        </View>
                    </View>
                        {showStoreInfo && (
                            <View style={[styles.summaryContainer, { borderRadius: 12 }]}>
                                <View style={styles.viewContainer}>
                                    <Text style={styles.viewLeft}>Store Name</Text>
                                    <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.black }]}>{sellerDetails?.storeName ?? '—'}</Text>
                                </View>
                                <View style={styles.viewContainer}>
                                    <Text style={styles.viewLeft}>Store Gmail</Text>
                                    <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.black }]}>{sellerDetails?.email ?? '—'}</Text>
                                </View>
                                <View style={styles.viewContainer}>
                                    <Text style={styles.viewLeft}>Store Phone</Text>
                                    <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.black }]}>{sellerDetails?.phone ?? '—'}</Text>
                                </View>
                                <View style={styles.viewContainer}>
                                    <Text style={styles.viewLeft}>Store Address</Text>
                                    <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.black }]}>{sellerDetails?.address ?? '—'}</Text>
                                </View>
                            </View>
                        )}
                        <View style={[styles.summaryContainer, { borderRadius: 12 }]}>
                            <View style={[styles.tableHeader]}>
                                <Text style={[styles.tableHeadText, { flex: 2, color: dark ? COLORS.white : COLORS.black }]}>Product</Text>
                                <Text style={[styles.tableHeadText, { flex: 1, color: dark ? COLORS.white : COLORS.black, textAlign: 'center' }]}>Qty</Text>
                                <Text style={[styles.tableHeadText, { flex: 1, color: dark ? COLORS.white : COLORS.black, textAlign: 'right' }]}>Price</Text>
                                <Text style={[styles.tableHeadText, { flex: 1, color: dark ? COLORS.white : COLORS.black, textAlign: 'right' }]}>Total</Text>
                            </View>
                            {items.map((it: any, idx: number) => {
                                const p = it?.product || {};
                                const displayName = getOrderItemDisplayName(it);
                                const qty = Math.max(1, Number(it?.quantity || 1));
                                const unit = typeof it?.salePrice === 'number' ? it.salePrice : (typeof it?.price === 'number' ? it.price : p.price || 0);
                                const lineTotal = unit * qty;
                                return (
                                    <View key={`${p._id || idx}`} style={styles.tableRow}>
                                        <Text style={[styles.tableCell, { flex: 2, color: dark ? COLORS.white : COLORS.black }]} numberOfLines={1}>
                                            {displayName}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: dark ? COLORS.white : COLORS.black }]}>{qty}</Text>
                                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: dark ? COLORS.white : COLORS.black }]}>
                                            PKR {unit.toFixed(0)}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: dark ? COLORS.white : COLORS.black }]}>
                                            PKR {lineTotal.toFixed(0)}
                                        </Text>
                                    </View>
                                );
                            })}
                            <View style={[styles.viewContainer, { marginTop: 12 }]}>
                                <Text style={[styles.viewLeft, { color: dark ? COLORS.white : COLORS.black }]}>Subtotal</Text>
                                <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.black }]}>PKR {subtotal.toFixed(0)}</Text>
                            </View>
                            <View style={[styles.viewContainer]}>
                                <Text style={[styles.viewLeft, { color: dark ? COLORS.white : COLORS.black }]}>Shipping</Text>
                                <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.black }]}>PKR {shippingFee.toFixed(0)}</Text>
                            </View>
                            {inspectionFee > 0 && (
                                <View style={[styles.viewContainer]}>
                                    <Text style={[styles.viewLeft, { color: dark ? COLORS.white : COLORS.black }]}>Inspection</Text>
                                    <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.black }]}>PKR {inspectionFee.toFixed(0)}</Text>
                                </View>
                            )}
                            <View style={[styles.viewContainer]}>
                                <Text style={[styles.viewLeft, { color: dark ? COLORS.white : COLORS.black }]}>Total</Text>
                                <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.black }]}>PKR {total.toFixed(0)}</Text>
                            </View>
                        </View>
                        <View style={[styles.summaryContainer, {
                            borderRadius: 12,
                        }]}>
                            <View style={styles.viewContainer}>
                                <Text style={styles.viewLeft}>Order Number</Text>
                                <View style={styles.copyContentContainer}>
                                    <Text style={[styles.viewRight, {
                                        color: dark ? COLORS.white : COLORS.primary
                                    }]}>#{orderNumber}</Text>
                                    <TouchableOpacity style={{ marginLeft: 8 }} onPress={handleCopyToClipboard}>
                                        <MaterialCommunityIcons name="content-copy" size={24} color={dark ? COLORS.white : COLORS.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.viewContainer}>
                                <Text style={styles.viewLeft}>Payment Method</Text>
                                <Text style={[styles.viewRight, {
                                    color: dark ? COLORS.white : COLORS.black
                                }]}>{raw.paymentMethod || 'N/A'}</Text>
                            </View>
                        </View>
                        <View style={[styles.summaryContainer, {
                            borderRadius: 12,
                        }]}>
                            <View style={styles.viewContainer}>
                                <Text style={styles.viewLeft}>Date</Text>
                                <Text style={[styles.viewRight, {
                                    color: dark ? COLORS.white : COLORS.black
                                }]}>{raw.createdAt ? new Date(raw.createdAt).toISOString().slice(0, 10) : ''}</Text>
                            </View>
                            <View style={styles.viewContainer}>
                                <Text style={styles.viewLeft}>Status</Text>
                                <TouchableOpacity style={[styles.statusBtn, {
                                    backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                                }]}>
                                    <Text style={[styles.statusBtnText, {
                                        color: dark ? COLORS.white : COLORS.primary
                                    }]}>Completed</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={[styles.summaryContainer, {
                            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                            borderRadius: 12,
                        }]}>
                            <View style={styles.viewContainer}>
                                <Text style={styles.viewLeft}>Amount</Text>
                                <Text style={[styles.viewRight, {
                                    color: dark ? COLORS.white : COLORS.black
                                }]}>PKR {total.toFixed(0)}</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    area: {
        flex: 1,
        backgroundColor: COLORS.white
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: 16
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 16
    },
    scrollView: {
        backgroundColor: COLORS.white
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center"
    },
    backIcon: {
        height: 24,
        width: 24,
        tintColor: COLORS.black,
        marginRight: 16
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: "bold",
        color: COLORS.black
    },
    downloadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    downloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.black,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8
    },
    downloadIcon: {
        width: 16,
        height: 16,
        tintColor: COLORS.white,
        marginRight: 6
    },
    downloadBtnText: {
        fontSize: 14,
        fontFamily: 'semiBold',
        color: COLORS.white
    },
    summaryContainer: {
        width: SIZES.width - 32,
        backgroundColor: COLORS.white,
        alignItems: "center",
        padding: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: COLORS.greyscale300
    },
    viewContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        marginVertical: 12
    },
    viewLeft: {
        fontSize: 12,
        fontFamily: "regular",
        color: "gray"
    },
    viewRight: {
        fontSize: 14,
        fontFamily: "medium",
        color: COLORS.black,
        textAlign: "right"
        
    },
    copyContentContainer: {
        flexDirection: "row",
        alignItems: "center"
    },
    statusBtn: {
        width: 72,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.tansparentPrimary,
        borderRadius: 6
    },
    statusBtnText: {
        fontSize: 12,
        fontFamily: "medium",
        color: COLORS.primary
    },
    tableHeader: {
        flexDirection: 'row',
        width: '100%',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayscale200,
    },
    tableRow: {
        flexDirection: 'row',
        width: '100%',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayscale200,
    },
    tableHeadText: {
        fontSize: 14,
        fontFamily: 'semiBold',
    },
    tableCell: {
        fontSize: 12,
        fontFamily: 'regular',
    }
})

export default ProductEReceipt
