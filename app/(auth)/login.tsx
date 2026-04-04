import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
  withDelay, FadeIn, FadeInDown, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Colors, Spacing, Radius, SPRING, SPRING_SNAPPY, SHADOWS, Typography } from '../../constants/tokens';

// ─── Animated input field ─────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, secure, keyboardType, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; secure?: boolean; keyboardType?: any; autoComplete?: any;
}) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useSharedValue(0);
  const labelAnim = useSharedValue(value ? 1 : 0);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(196,105,58,${interpolate(borderAnim.value, [0, 1], [0.1, 0.8], Extrapolation.CLAMP)})`,
    borderWidth: interpolate(borderAnim.value, [0, 1], [1, 1.5], Extrapolation.CLAMP),
  }));

  const onFocus = () => {
    setFocused(true);
    borderAnim.value = withTiming(1, { duration: 200 });
    labelAnim.value = withTiming(1, { duration: 200 });
  };
  const onBlur = () => {
    setFocused(false);
    borderAnim.value = withTiming(0, { duration: 200 });
    if (!value) labelAnim.value = withTiming(0, { duration: 200 });
  };

  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <Animated.View style={[f.inputWrap, borderStyle]}>
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.mist}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoComplete={autoComplete}
          onFocus={onFocus}
          onBlur={onBlur}
          accessibilityLabel={label}
        />
      </Animated.View>
    </View>
  );
}
const f = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  label: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 2.5, marginBottom: 8 },
  inputWrap: {
    backgroundColor: Colors.inkSoft, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: 'rgba(196,105,58,0.1)',
  },
  input: {
    fontFamily: 'Syne-Regular', fontSize: 15, color: Colors.cream,
    paddingHorizontal: Spacing.base, paddingVertical: 14,
  },
});

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');

  const { width: winW } = useWindowDimensions();
  const bloomW = Platform.OS === 'web' ? Math.min(winW, 500) : winW;

  const { signInWithEmail, signUpWithEmail, loading } = useAuthStore();
  const { showToast } = useUIStore();

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const handleSubmit = async () => {
    if (!email || !password) {
      showToast({ type: 'error', title: 'Eksik alanlar', subtitle: 'E-posta ve şifre gerekli.' });
      return;
    }
    if (mode === 'signup' && (!username || !fullName)) {
      showToast({ type: 'error', title: 'Eksik alanlar', subtitle: 'Kullanıcı adı ve isim gerekli.' });
      return;
    }

    btnScale.value = withSequence(withSpring(0.96, SPRING_SNAPPY), withSpring(1.0, SPRING));

    if (mode === 'login') {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        showToast({ type: 'error', title: 'Giriş başarısız', subtitle: error });
      } else {
        router.replace('/(tabs)' as any);
      }
    } else {
      const { error } = await signUpWithEmail(email, password, username, fullName);
      if (error) {
        showToast({ type: 'error', title: 'Kayıt başarısız', subtitle: error });
      } else {
        showToast({ type: 'success', title: 'Brewnoya hoş geldin.' });
        router.replace('/(tabs)' as any);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Background blooms — sizes are responsive via useWindowDimensions */}
      <View style={{
        position: 'absolute', width: bloomW * 1.4, height: bloomW * 1.4, borderRadius: bloomW * 0.7,
        backgroundColor: '#3d1f0f', opacity: 0.45,
        top: -bloomW * 0.5, left: -bloomW * 0.3,
      }} />
      <View style={{
        position: 'absolute', width: bloomW, height: bloomW, borderRadius: bloomW * 0.5,
        backgroundColor: '#160e22', opacity: 0.6,
        bottom: -bloomW * 0.3, right: -bloomW * 0.2,
      }} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          Platform.OS === 'web' && { maxWidth: 480, alignSelf: 'center' as const, width: '100%' },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo block */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.logoBlock}>
          <Text style={styles.logo}>brewno.</Text>
          <View style={styles.copperLine} />
          <Text style={styles.tagline}>kahve hafızan</Text>
        </Animated.View>

        {/* Mode toggle */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.toggleWrap}>
          <View style={styles.toggleBg} />
          {(['login', 'signup'] as const).map((m) => {
            const isActive = mode === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[styles.toggleBtn, isActive && styles.toggleBtnActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                {isActive && <View style={styles.toggleGlow} />}
                <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>
                  {m === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Fields */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          {mode === 'signup' && (
            <>
              <Field label="AD SOYAD" value={fullName} onChange={setFullName} placeholder="Adın" autoComplete="name" />
              <Field label="KULLANICI ADI" value={username} onChange={setUsername} placeholder="@kullaniciadin" />
            </>
          )}
          <Field label="E-POSTA" value={email} onChange={setEmail} placeholder="kahve@sever.com" keyboardType="email-address" autoComplete="email" />
          <Field label="ŞİFRE" value={password} onChange={setPassword} placeholder="••••••••" secure autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </Animated.View>

        {/* Submit */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={btnStyle}>
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={mode === 'login' ? 'Giriş yap' : 'Hesap oluştur'}
          >
            {loading
              ? <ActivityIndicator color={Colors.ink} />
              : (
                <Text style={styles.submitText}>
                  {mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'} →
                </Text>
              )
            }
          </TouchableOpacity>
        </Animated.View>

        {/* Divider */}
        <Animated.View entering={FadeInDown.delay(380).duration(400)} style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </Animated.View>

        {/* Guest */}
        <Animated.View entering={FadeInDown.delay(440).duration(400)}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)' as any)}
            style={styles.guestBtn}
            accessibilityRole="button"
          >
            <Text style={styles.guestText}>Misafir olarak devam et</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Back to onboarding */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={{ alignItems: 'center', marginTop: Spacing.xl }}>
          <TouchableOpacity onPress={() => router.replace('/onboarding')} accessibilityRole="button">
            <Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.mist, letterSpacing: 2 }}>
              ← GERİ
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.ink },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 48,
  },
  logoBlock: { marginBottom: Spacing.xxxl },
  logo: {
    fontFamily: 'CormorantGaramond-LightItalic',
    fontSize: 60, lineHeight: 64, color: Colors.cream,
  },
  copperLine: {
    width: 48, height: 2, backgroundColor: Colors.copper, borderRadius: 1,
    marginVertical: Spacing.md,
    shadowColor: Colors.copper, shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  tagline: { fontFamily: 'SyneMono-Regular', fontSize: 10, color: Colors.fog, letterSpacing: 3 },

  // Toggle
  toggleWrap: {
    flexDirection: 'row', position: 'relative',
    backgroundColor: Colors.inkSoft, borderRadius: Radius.lg,
    padding: 4, marginBottom: Spacing.xl,
    borderWidth: 1, borderColor: Colors.hairline,
  },
  toggleBg: { ...StyleSheet.absoluteFillObject, borderRadius: Radius.lg },
  toggleBtn: {
    flex: 1, paddingVertical: 11, alignItems: 'center',
    borderRadius: Radius.md, overflow: 'hidden', position: 'relative',
  },
  toggleBtnActive: { backgroundColor: Colors.roast },
  toggleGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(196,105,58,0.08)',
  },
  toggleText: { fontFamily: 'SyneMono-Regular', fontSize: 10, color: Colors.fog, letterSpacing: 1 },
  toggleTextActive: { color: Colors.cream },

  // Submit
  submitBtn: {
    backgroundColor: Colors.copper, borderRadius: Radius.xl,
    paddingVertical: Spacing.base + 2, alignItems: 'center',
    marginTop: Spacing.sm,
    ...SHADOWS.copper,
  },
  submitText: { fontFamily: 'Syne-Bold', fontSize: 15, color: Colors.ink },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.hairline },
  dividerText: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 2 },

  // Guest
  guestBtn: {
    borderWidth: 1, borderColor: Colors.hairline, borderRadius: Radius.xl,
    paddingVertical: Spacing.base, alignItems: 'center',
  },
  guestText: { fontFamily: 'Syne-Regular', fontSize: 14, color: Colors.fog },
});
