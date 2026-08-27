/**
 * ConfirmDialog — A TV-friendly custom confirmation dialog.
 * Replaces native Alert.alert() with an accessible overlay
 * that works correctly with TV remote focus.
 */
import { TVRow } from '@/components/tv/SpatialWrappers';
import { FontFamily } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    BackHandler,
    Dimensions,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { TVPressable } from './TVPressable';

const isTV = Platform.isTV;
const { width: W } = Dimensions.get('window');
const DIALOG_W = isTV ? Math.min(500, W * 0.5) : Math.min(360, W * 0.88);

interface ConfirmDialogProps {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Icon name from Ionicons */
    icon?: string;
    /** Danger mode (red confirm button) vs. neutral */
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isDark: boolean;
}

export function ConfirmDialog({
    visible,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    icon = 'alert-circle-outline',
    danger = false,
    onConfirm,
    onCancel,
    isDark,
}: ConfirmDialogProps) {
    React.useEffect(() => {
        if (!visible || isTV) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            onCancel();
            return true;
        });
        return () => sub.remove();
    }, [visible, onCancel]);

    if (!visible) return null;

    const bg = isDark ? '#1C1C2E' : '#FFFFFF';
    const textColor = isDark ? '#fff' : '#111';
    const subColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
    const cancelBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const confirmBg = danger ? '#ef4444' : '#3b82f6';
    const iconColor = danger ? '#ef4444' : '#3b82f6';
    const iconBg = danger ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.1)';

    const dialogContent = (
        <View style={[styles.dialog, { backgroundColor: bg }]}>
            {/* Icon */}
            <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                <Ionicons name={icon as any} size={isTV ? 38 : 28} color={iconColor} />
            </View>

            {/* Text */}
            <Text style={[styles.title, { color: textColor }]}>{title}</Text>
            <Text style={[styles.message, { color: subColor }]}>{message}</Text>

            {/* Buttons */}
            <TVRow style={styles.btnRow}>
                <TVPressable
                    style={[styles.btn, { backgroundColor: cancelBg }]}
                    onPress={onCancel}
                    focusVariant="control"
                >
                    <Text style={[styles.btnText, { color: textColor }]}>{cancelLabel}</Text>
                </TVPressable>

                <TVPressable
                    style={[styles.btn, { backgroundColor: confirmBg }]}
                    onPress={onConfirm}
                    focusVariant="card"
                    hasTVPreferredFocus={isTV}
                >
                    <Text style={[styles.btnText, { color: '#fff' }]}>{confirmLabel}</Text>
                </TVPressable>
            </TVRow>
        </View>
    );

    // On TV: use Modal to properly trap focus within the dialog.
    // Without Modal, the D-pad can wander to elements behind the overlay.
    if (isTV) {
        return (
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={onCancel}
                statusBarTranslucent
            >
                <View style={styles.overlay}>
                    {dialogContent}
                </View>
            </Modal>
        );
    }

    // Mobile: absolute overlay (no Modal needed)
    return (
        <View style={styles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
            {dialogContent}
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2000,
        elevation: 2000,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dialog: {
        width: DIALOG_W,
        borderRadius: isTV ? 20 : 16,
        padding: isTV ? 36 : 24,
        alignItems: 'center',
        gap: isTV ? 14 : 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.4,
        shadowRadius: 28,
        elevation: 28,
    },
    iconWrap: {
        width: isTV ? 72 : 56,
        height: isTV ? 72 : 56,
        borderRadius: isTV ? 36 : 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: isTV ? 4 : 2,
    },
    title: {
        fontFamily: FontFamily.bold,
        fontSize: isTV ? 24 : 18,
        textAlign: 'center',
    },
    message: {
        fontFamily: FontFamily.regular,
        fontSize: isTV ? 18 : 14,
        textAlign: 'center',
        lineHeight: isTV ? 28 : 20,
    },
    btnRow: {
        flexDirection: 'row',
        gap: isTV ? 16 : 12,
        marginTop: isTV ? 12 : 8,
        width: '100%',
    },
    btn: {
        flex: 1,
        height: isTV ? 56 : 46,
        borderRadius: isTV ? 14 : 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: {
        fontFamily: FontFamily.bold,
        fontSize: isTV ? 18 : 15,
    },
});
