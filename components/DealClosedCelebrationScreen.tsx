// What: Full-screen celebration overlay shown when agent marks a deal as closed
// Who: Agent role only
// Where: Pushed as fullScreenModal from AgentDealDetailScreen on deal close

// @demo: mock deal data passed via route params, share uses Alert fallback
// @backend: when DEAL_CREATION_ENABLED=true, deal data comes from rpc_mark_deal_closed response

import React, { useRef } from 'react';
import { View, Text, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import type { HomeStackParamList } from './HomeStack';
import { COLORS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { PrimaryButton, SecondaryButton } from './Button';
import ShareableClosedDealCard from './ShareableClosedDealCard';

const DealClosedCelebrationScreen: React.FC = () => {
  const route = useRoute<RouteProp<HomeStackParamList, 'DealClosedCelebration'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { deal } = route.params;
  const cardRef = useRef<View>(null);

  // Haptic on mount
  React.useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const handleShareWin = async () => {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1.0 });
      await Share.share({ url: uri, message: 'Just closed a deal with Atlasio! 🏆' });
    } catch {
      if (FEATURE_FLAGS.USE_MOCK_DATA) {
        Alert.alert('🏆 Share', 'Your deal card is ready to share!');
      }
    }
  };

  const handleDone = () => {
    navigation.dispatch(
      CommonActions.navigate({ name: 'AgentDealsScreen', params: { initialFilter: 'closed' } }),
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 56, textAlign: 'center' }}>🏆</Text>
        <Text style={{ fontSize: 28, fontWeight: '700', color: COLORS.darkText, textAlign: 'center', marginTop: 16 }}>
          Congratulations!
        </Text>
        <Text style={{ fontSize: 16, color: COLORS.lightText, textAlign: 'center', marginTop: 4 }}>
          You closed the deal.
        </Text>
        <View style={{ marginTop: 32, width: '100%' }}>
          <ShareableClosedDealCard
            address={deal.address}
            buyerName={deal.buyerName}
            salePrice={deal.salePrice}
            closingDate={deal.closingDate}
            cardRef={cardRef}
          />
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 34 }}>
        <PrimaryButton label="Share Your Win" onPress={handleShareWin} />
        <View style={{ height: 12 }} />
        <SecondaryButton label="Done" onPress={handleDone} />
      </View>
    </SafeAreaView>
  );
};

export default DealClosedCelebrationScreen;
